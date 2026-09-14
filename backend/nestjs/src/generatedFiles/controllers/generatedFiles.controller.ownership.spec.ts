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
    findAllUrls.mockResolvedValue({ requestHash: "hash-propio", files: [], status: "complete" });
    getRequestHashesByUserId.mockReset();
    getRequestHashesByUserId.mockResolvedValue(["hash-propio"]);
  });

  it("sin token devuelve 401", async () => {
    await request(app.getHttpServer()).get("/results/hash-propio").expect(401);

    expect(findAllUrls).not.toHaveBeenCalled();
  });

  it("con un hash que no es del usuario devuelve 404 y no genera URLs", async () => {
    await request(app.getHttpServer()).get("/results/hash-ajeno").set("Authorization", `Bearer ${token}`).expect(404);

    expect(getRequestHashesByUserId).toHaveBeenCalledWith("usuario-1");
    expect(findAllUrls).not.toHaveBeenCalled();
  });

  it("con un hash propio devuelve los resultados", async () => {
    await request(app.getHttpServer()).get("/results/hash-propio").set("Authorization", `Bearer ${token}`).expect(200);

    expect(findAllUrls).toHaveBeenCalledWith("hash-propio");
  });
});
