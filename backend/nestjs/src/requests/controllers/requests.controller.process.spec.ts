import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import * as request from "supertest";
import { RequestsController } from "./requests.controller";
import { RequestsService } from "@/requests/services/requests.service";
import { UsersService } from "@/users/services/users.service";
import { JwtStrategy } from "@/auth/strategies/jwt.strategy";

const SECRETO = "secreto-solo-para-tests";

describe("POST /requests/process", () => {
  let app: INestApplication;
  const create = jest.fn().mockResolvedValue({ requestHash: "abc" });

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [PassportModule],
      controllers: [RequestsController],
      providers: [
        JwtStrategy,
        { provide: RequestsService, useValue: { create } },
        { provide: UsersService, useValue: { findOne: jest.fn().mockResolvedValue({ id: "usuario-1" }) } },
        { provide: ConfigService, useValue: { get: () => SECRETO } },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => create.mockClear());

  it("rechaza la petición sin token (401) y no lanza el pipeline", async () => {
    await request(app.getHttpServer()).post("/requests/process").send({ variableName: "geopotential" }).expect(401);

    expect(create).not.toHaveBeenCalled();
  });

  it("con token válido crea la petición a nombre del usuario del token, no del cuerpo", async () => {
    const token = new JwtService({ secret: SECRETO }).sign({ sub: "usuario-1", email: "a@b.c", role: "user" });

    await request(app.getHttpServer())
      .post("/requests/process")
      .set("Authorization", `Bearer ${token}`)
      .send({ variableName: "geopotential", userId: "otro-usuario" })
      .expect(201);

    expect(create).toHaveBeenCalledWith(expect.objectContaining({ userId: "usuario-1" }));
  });
});
