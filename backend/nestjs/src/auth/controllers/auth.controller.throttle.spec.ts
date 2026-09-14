import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import * as request from "supertest";
import { AuthController } from "./auth.controller";
import { AuthService } from "@/auth/services/auth.service";
import { LIMITE_AUTH, ThrottlingModule } from "@/shared/throttling";

// WEB-205 (V9): límite de peticiones global (ThrottlingModule, el que importa AppModule) y uno estricto en auth.
describe("Límite de peticiones", () => {
  let app: INestApplication;
  const login = jest.fn().mockResolvedValue({ accessToken: "t" });

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [ThrottlingModule],
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: { login } }],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it(`POST /auth/login responde 429 al superar ${LIMITE_AUTH.default.limit} intentos por minuto`, async () => {
    const intento = () => request(app.getHttpServer()).post("/auth/login").send({ email: "a@b.c", password: "x" });

    for (let i = 0; i < LIMITE_AUTH.default.limit; i++) {
      await intento().expect(200);
    }
    await intento().expect(429);

    expect(login).toHaveBeenCalledTimes(LIMITE_AUTH.default.limit);
  });
});
