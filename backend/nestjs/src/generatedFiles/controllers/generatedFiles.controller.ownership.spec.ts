import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import * as request from "supertest";
import { GeneratedFilesController } from "./generatedFiles.controller";
import { GeneratedFilesService } from "../services/generatedFiles.service";
import { UsersService } from "@/users/services/users.service";
import { JwtStrategy } from "@/auth/strategies/jwt.strategy";

const SECRETO = "secreto-solo-para-tests";
// SHA-256 en hex, como los genera la API (RequestHashPipe rechaza el resto, V14/WEB-302).
const PROPIO = "a".repeat(64);
const AJENO = "b".repeat(64);

// WEB-102 (V2): los resultados (y las URLs firmadas que contienen) solo para el dueño de la petición.
describe("GET /results/:requestHash (autenticación y propiedad)", () => {
  let app: INestApplication;
  let token: string;
  const findAllUrls = jest.fn();
  const getRequestHashesByUserId = jest.fn();

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [PassportModule],
      controllers: [GeneratedFilesController],
      providers: [
        JwtStrategy,
        { provide: GeneratedFilesService, useValue: { findAllUrls } },
        {
          provide: UsersService,
          useValue: { findOne: jest.fn().mockResolvedValue({ id: "usuario-1" }), getRequestHashesByUserId },
        },
        { provide: ConfigService, useValue: { get: () => SECRETO } },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
    token = new JwtService({ secret: SECRETO }).sign({ sub: "usuario-1", email: "a@b.c", role: "user" });
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    findAllUrls.mockReset();
    findAllUrls.mockResolvedValue({ requestHash: PROPIO, files: [], status: "complete" });
    getRequestHashesByUserId.mockReset();
    getRequestHashesByUserId.mockResolvedValue([PROPIO]);
  });

  it("sin token devuelve 401", async () => {
    await request(app.getHttpServer()).get(`/results/${PROPIO}`).expect(401);

    expect(findAllUrls).not.toHaveBeenCalled();
  });

  it("con un hash que no es del usuario devuelve 404 y no genera URLs", async () => {
    await request(app.getHttpServer()).get(`/results/${AJENO}`).set("Authorization", `Bearer ${token}`).expect(404);

    expect(getRequestHashesByUserId).toHaveBeenCalledWith("usuario-1");
    expect(findAllUrls).not.toHaveBeenCalled();
  });

  it("un hash que no es SHA-256 en hex devuelve 400 (V14/WEB-302)", async () => {
    await request(app.getHttpServer()).get("/results/hash-propio").set("Authorization", `Bearer ${token}`).expect(400);

    expect(getRequestHashesByUserId).not.toHaveBeenCalled();
    expect(findAllUrls).not.toHaveBeenCalled();
  });

  it("con un hash propio devuelve los resultados", async () => {
    await request(app.getHttpServer()).get(`/results/${PROPIO}`).set("Authorization", `Bearer ${token}`).expect(200);

    expect(findAllUrls).toHaveBeenCalledWith(PROPIO);
  });
});
