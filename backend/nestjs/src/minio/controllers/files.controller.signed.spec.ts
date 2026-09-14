import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { Readable } from "stream";
import * as request from "supertest";
import { FilesController } from "./files.controller";
import { MinioService } from "../services/minio.service";
import { firmaRuta } from "../signed-url";

const SECRETO = "secreto-solo-para-tests";

// WEB-102 (V2): el proxy solo sirve ficheros con una URL firmada y vigente emitida por la API.
describe("GET /files/proxy/:requestHash/:filename (URL firmada)", () => {
  let app: INestApplication;
  const getFile = jest.fn();

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [FilesController],
      providers: [
        { provide: MinioService, useValue: { getFile } },
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
    getFile.mockReset();
    getFile.mockResolvedValue({ stream: Readable.from(["contenido"]), metadata: {} });
  });

  const enUnaHora = () => Math.floor(Date.now() / 1000) + 3600;

  it("sin firma devuelve 403 y no lee MinIO", async () => {
    await request(app.getHttpServer()).get("/files/proxy/hash-1/mapa.png").expect(403);

    expect(getFile).not.toHaveBeenCalled();
  });

  it("con firma válida sirve el fichero", async () => {
    const expira = enUnaHora();
    const firma = firmaRuta("hash-1/mapa.png", expira, SECRETO);

    await request(app.getHttpServer()).get(`/files/proxy/hash-1/mapa.png?expires=${expira}&sig=${firma}`).expect(200);

    expect(getFile).toHaveBeenCalledWith("hash-1/mapa.png");
  });

  it("la firma de un fichero no sirve para otro (403)", async () => {
    const expira = enUnaHora();
    const firma = firmaRuta("hash-1/mapa.png", expira, SECRETO);

    await request(app.getHttpServer()).get(`/files/proxy/hash-2/datos.nc?expires=${expira}&sig=${firma}`).expect(403);

    expect(getFile).not.toHaveBeenCalled();
  });

  it("una URL caducada devuelve 403", async () => {
    const expira = Math.floor(Date.now() / 1000) - 60;
    const firma = firmaRuta("hash-1/mapa.png", expira, SECRETO);

    await request(app.getHttpServer()).get(`/files/proxy/hash-1/mapa.png?expires=${expira}&sig=${firma}`).expect(403);

    expect(getFile).not.toHaveBeenCalled();
  });
});
