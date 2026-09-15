// WEB-212: con .env.example (MINIO_USE_SSL=false) la API no arrancaba. Las variables de entorno son
// cadenas y el cliente de MinIO exige un booleano: "Invalid useSSL flag type : false".
// ConfigModule.forRoot valida el entorno al importarse: los módulos se importan dentro de cada test,
// después de preparar process.env.
describe("MinioService con la configuración validada", () => {
  const entornoOriginal = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = {
      ...entornoOriginal,
      DB_HOST: "postgres",
      DB_PORT: "5432",
      DB_USERNAME: "u",
      DB_PASSWORD: "p",
      DB_NAME: "db",
      JWT_SECRET: "secreto",
      JWT_EXPIRATION: "1d",
      RABBITMQ_URL: "amqp://u:p@rabbitmq:5672",
      RABBITMQ_CONFIG_QUEUE: "config_queue",
      RABBITMQ_RESULT_QUEUE: "results_queue",
      MINIO_ENDPOINT: "minio:9000",
      MINIO_HOST: "minio",
      MINIO_PORT: "9000",
      MINIO_USER: "u",
      MINIO_PASSWORD: "p",
      MINIO_BUCKET: "b",
    };
  });

  afterEach(() => {
    process.env = entornoOriginal;
  });

  it.each(["false", "true"])("arranca con MINIO_USE_SSL=%s como en .env.example", async valor => {
    process.env.MINIO_USE_SSL = valor;
    const { Test } = await import("@nestjs/testing");
    const { ConfigModule } = await import("@/config/config.module");
    const { MinioService } = await import("./minio.service");

    const modulo = await Test.createTestingModule({ imports: [ConfigModule], providers: [MinioService] }).compile();

    expect(modulo.get(MinioService)).toBeInstanceOf(MinioService);
  });
});
