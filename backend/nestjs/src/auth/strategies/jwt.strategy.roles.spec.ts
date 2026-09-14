import { INestApplication, NotFoundException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import * as request from "supertest";
import { RequestsController } from "@/requests/controllers/requests.controller";
import { RequestsService } from "@/requests/services/requests.service";
import { UsersService } from "@/users/services/users.service";
import { JwtStrategy } from "./jwt.strategy";
import { UserRole } from "@/shared/enums/userRoleEnum.enum";

const SECRETO = "secreto-solo-para-tests";

// WEB-201 (V7): el rol sale de la base de datos, no del token; revocar un rol surte efecto sin esperar a que caduque.
describe("JwtStrategy: rol desde la base de datos", () => {
  let app: INestApplication;
  const findAll = jest.fn().mockResolvedValue([]);
  const findOne = jest.fn();
  const firmar = (role: UserRole) =>
    new JwtService({ secret: SECRETO }).sign({ sub: "usuario-1", email: "a@b.c", role });

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [PassportModule],
      controllers: [RequestsController],
      providers: [
        JwtStrategy,
        { provide: RequestsService, useValue: { findAll } },
        { provide: UsersService, useValue: { findOne } },
        { provide: ConfigService, useValue: { get: () => SECRETO } },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    findAll.mockClear();
    findOne.mockReset();
  });

  it("un token de admin de un usuario al que se le retiró el rol devuelve 403", async () => {
    findOne.mockResolvedValue({ id: "usuario-1", email: "a@b.c", role: UserRole.USER });

    await request(app.getHttpServer())
      .get("/requests")
      .set("Authorization", `Bearer ${firmar(UserRole.ADMIN)}`)
      .expect(403);

    expect(findAll).not.toHaveBeenCalled();
  });

  it("un usuario ascendido a admin accede aunque su token diga user", async () => {
    findOne.mockResolvedValue({ id: "usuario-1", email: "a@b.c", role: UserRole.ADMIN });

    await request(app.getHttpServer())
      .get("/requests")
      .set("Authorization", `Bearer ${firmar(UserRole.USER)}`)
      .expect(200);

    expect(findAll).toHaveBeenCalled();
  });

  it("el token de un usuario borrado devuelve 401 (el repositorio lanza NotFoundException)", async () => {
    findOne.mockRejectedValue(new NotFoundException("User with ID usuario-1 not found"));

    await request(app.getHttpServer())
      .get("/requests")
      .set("Authorization", `Bearer ${firmar(UserRole.ADMIN)}`)
      .expect(401);

    expect(findAll).not.toHaveBeenCalled();
  });

  it("el token de un usuario inexistente devuelve 401", async () => {
    findOne.mockResolvedValue(null);

    await request(app.getHttpServer())
      .get("/requests")
      .set("Authorization", `Bearer ${firmar(UserRole.ADMIN)}`)
      .expect(401);

    expect(findAll).not.toHaveBeenCalled();
  });
});
