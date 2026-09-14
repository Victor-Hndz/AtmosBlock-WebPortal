import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import * as request from "supertest";
import { ProgressController } from "./progress.controller";
import { ProgressService } from "../services/progress.service";
import { UsersService } from "@/users/services/users.service";
import { JwtStrategy } from "@/auth/strategies/jwt.strategy";
import { firmaRuta } from "@/minio/signed-url";
import { MAX_PROGRESS } from "@/shared/consts/consts";

const SECRETO = "secreto-solo-para-tests";

// WEB-210: el stream de progreso solo con URL firmada, emitida al dueño de la petición.
describe("Progreso por SSE (autenticación y propiedad)", () => {
  let app: INestApplication;
  let token: string;
  let progressService: ProgressService;
  const getRequestHashesByUserId = jest.fn();

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [PassportModule],
      controllers: [ProgressController],
      providers: [
        JwtStrategy,
        ProgressService,
        {
          provide: UsersService,
          useValue: { findOne: jest.fn().mockResolvedValue({ id: "usuario-1" }), getRequestHashesByUserId },
        },
        { provide: ConfigService, useValue: { get: () => SECRETO } },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
    progressService = moduleRef.get(ProgressService);
    token = new JwtService({ secret: SECRETO }).sign({ sub: "usuario-1", email: "a@b.c", role: "user" });
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    getRequestHashesByUserId.mockReset();
    getRequestHashesByUserId.mockResolvedValue(["hash-propio"]);
  });

  const enUnaHora = () => Math.floor(Date.now() / 1000) + 3600;

  it("pedir la URL del stream sin token devuelve 401", async () => {
    await request(app.getHttpServer()).get("/progress/stream-url/hash-propio").expect(401);

    expect(getRequestHashesByUserId).not.toHaveBeenCalled();
  });

  it("pedir la URL del stream de una petición ajena devuelve 404", async () => {
    await request(app.getHttpServer())
      .get("/progress/stream-url/hash-ajeno")
      .set("Authorization", `Bearer ${token}`)
      .expect(404);

    expect(getRequestHashesByUserId).toHaveBeenCalledWith("usuario-1");
  });

  it("el stream sin firma devuelve 403", async () => {
    const res = await request(app.getHttpServer()).get("/progress/stream/hash-propio").expect(403);

    expect(res.headers["content-type"]).not.toContain("text/event-stream");
  });

  it("la firma de una petición no sirve para otra (403)", async () => {
    const expira = enUnaHora();
    const firma = firmaRuta("progress:hash-propio", expira, SECRETO);

    const res = await request(app.getHttpServer())
      .get(`/progress/stream/hash-ajeno?expires=${expira}&sig=${firma}`)
      .expect(403);

    expect(res.headers["content-type"]).not.toContain("text/event-stream");
  });

  it("la firma de un fichero no abre el stream (403)", async () => {
    const expira = enUnaHora();
    const firma = firmaRuta("hash-propio/mapa.png", expira, SECRETO);

    const res = await request(app.getHttpServer())
      .get(`/progress/stream/hash-propio?expires=${expira}&sig=${firma}`)
      .expect(403);

    expect(res.headers["content-type"]).not.toContain("text/event-stream");
  });

  it("con la URL emitida para el dueño recibe el progreso de su petición", async () => {
    const { body } = await request(app.getHttpServer())
      .get("/progress/stream-url/hash-propio")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(body.url).toMatch(/^\/progress\/stream\/hash-propio\?expires=\d+&sig=[0-9a-f]{64}$/);

    // Petición ya terminada: el stream reenvía el último estado y se cierra.
    progressService.updateProgress({ requestHash: "hash-propio", increment: MAX_PROGRESS, message: "listo" });
    const res = await request(app.getHttpServer()).get(body.url).expect(200);

    expect(res.headers["content-type"]).toContain("text/event-stream");
    expect(res.text).toContain('"message":"listo"');
    expect(res.text).toContain('"completed":true');
  });
});
