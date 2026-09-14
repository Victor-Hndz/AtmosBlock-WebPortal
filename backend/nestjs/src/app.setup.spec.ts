import { Controller, Get, INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import * as request from "supertest";
import { configureApp } from "./app.setup";

@Controller("ping")
class PingController {
  @Get()
  ping() {
    return { ok: true };
  }
}

async function crearApp(config: Record<string, string>): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({ controllers: [PingController] }).compile();
  const app = moduleRef.createNestApplication();
  configureApp(app, { get: (clave: string) => config[clave] } as unknown as ConfigService);
  await app.init();
  return app;
}

describe("configureApp (endurecimiento de la API)", () => {
  describe("en desarrollo", () => {
    let app: INestApplication;

    beforeAll(async () => {
      app = await crearApp({
        NODE_ENV: "development",
        CORS_ORIGINS: "http://localhost:5173, https://atmosblock.example",
      });
    });

    afterAll(async () => {
      await app.close();
    });

    // WEB-202 (V6)
    it("CORS: refleja un origen de la lista blanca", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/ping")
        .set("Origin", "https://atmosblock.example")
        .expect(200);

      expect(res.headers["access-control-allow-origin"]).toBe("https://atmosblock.example");
    });

    it("CORS: no autoriza un origen fuera de la lista", async () => {
      const res = await request(app.getHttpServer()).get("/api/ping").set("Origin", "https://evil.example").expect(200);

      expect(res.headers["access-control-allow-origin"]).toBeUndefined();
    });

    // WEB-203 (V13)
    it("cabeceras de seguridad de helmet (nosniff, CSP, sin x-powered-by)", async () => {
      const res = await request(app.getHttpServer()).get("/api/ping").expect(200);

      expect(res.headers["x-content-type-options"]).toBe("nosniff");
      expect(res.headers["content-security-policy"]).toContain("default-src 'self'");
      expect(res.headers["x-powered-by"]).toBeUndefined();
    });

    it("el frontend (otro origen) puede incrustar imágenes y enmarcar PDFs de la API", async () => {
      const res = await request(app.getHttpServer()).get("/api/ping").expect(200);

      expect(res.headers["cross-origin-resource-policy"]).toBe("cross-origin");
      expect(res.headers["content-security-policy"]).toContain(
        "frame-ancestors 'self' http://localhost:5173 https://atmosblock.example"
      );
    });

    // WEB-204 (V12)
    it("Swagger disponible fuera de producción", async () => {
      const res = await request(app.getHttpServer()).get("/api/docs-json").expect(200);

      expect(res.body.openapi).toBeDefined();
    });
  });

  describe("en producción", () => {
    let app: INestApplication;

    beforeAll(async () => {
      app = await crearApp({ NODE_ENV: "production", CORS_ORIGINS: "https://atmosblock.example" });
    });

    afterAll(async () => {
      await app.close();
    });

    // WEB-204 (V12)
    it("Swagger no se publica", async () => {
      const res = await request(app.getHttpServer()).get("/api/docs-json").expect(404);

      expect(res.body.openapi).toBeUndefined();
    });
  });
});
