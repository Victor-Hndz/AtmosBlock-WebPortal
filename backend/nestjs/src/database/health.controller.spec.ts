import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { DataSource } from "typeorm";
import * as request from "supertest";
import { HealthController } from "./health.controller";

// WEB-206: salud de la API para el healthcheck de Docker, comprobando la base de datos.
describe("GET /health", () => {
  let app: INestApplication;
  const query = jest.fn();

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [{ provide: DataSource, useValue: { query } }],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    query.mockReset();
  });

  it("con la base de datos disponible responde 200", async () => {
    query.mockResolvedValue([{ "?column?": 1 }]);

    const res = await request(app.getHttpServer()).get("/health").expect(200);

    expect(res.body).toEqual({ status: "ok", database: "up" });
    expect(query).toHaveBeenCalledWith("SELECT 1");
  });

  it("sin base de datos responde 503", async () => {
    query.mockRejectedValue(new Error("connection refused"));

    const res = await request(app.getHttpServer()).get("/health").expect(503);

    expect(res.body.database).toBe("down");
  });
});
