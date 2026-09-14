import { INestApplication, NotFoundException } from "@nestjs/common";
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

// WEB-103 (V3): GET y DELETE /requests/:id solo sobre peticiones del usuario del token.
describe("GET y DELETE /requests/:id (propiedad)", () => {
  let app: INestApplication;
  let token: string;
  const findOneForUser = jest.fn();
  const removeForUser = jest.fn();

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [PassportModule],
      controllers: [RequestsController],
      providers: [
        JwtStrategy,
        { provide: RequestsService, useValue: { findOneForUser, removeForUser } },
        { provide: UsersService, useValue: { findOne: jest.fn().mockResolvedValue({ id: "usuario-1" }) } },
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
    findOneForUser.mockReset();
    removeForUser.mockReset();
  });

  it("GET busca la petición a nombre del usuario del token", async () => {
    findOneForUser.mockResolvedValue({ id: "peticion-1" });

    await request(app.getHttpServer()).get("/requests/peticion-1").set("Authorization", `Bearer ${token}`).expect(200);

    expect(findOneForUser).toHaveBeenCalledWith("peticion-1", "usuario-1");
  });

  it("GET de una petición ajena devuelve 404 (no revela que existe)", async () => {
    findOneForUser.mockRejectedValue(new NotFoundException());

    await request(app.getHttpServer()).get("/requests/ajena").set("Authorization", `Bearer ${token}`).expect(404);

    expect(findOneForUser).toHaveBeenCalledWith("ajena", "usuario-1");
  });

  it("DELETE borra solo a nombre del usuario del token", async () => {
    removeForUser.mockResolvedValue(undefined);

    await request(app.getHttpServer())
      .delete("/requests/peticion-1")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(removeForUser).toHaveBeenCalledWith("peticion-1", "usuario-1");
  });

  it("DELETE de una petición ajena devuelve 404 y no borra", async () => {
    removeForUser.mockRejectedValue(new NotFoundException());

    await request(app.getHttpServer()).delete("/requests/ajena").set("Authorization", `Bearer ${token}`).expect(404);

    expect(removeForUser).toHaveBeenCalledWith("ajena", "usuario-1");
  });
});
