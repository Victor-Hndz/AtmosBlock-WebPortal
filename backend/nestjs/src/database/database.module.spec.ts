import { ConfigService } from "@nestjs/config";
import { opcionesTypeOrm } from "./database.module";

// WEB-305: el esquema solo lo crean las migraciones, nunca synchronize, sea cual sea NODE_ENV.
describe("opcionesTypeOrm", () => {
  it.each(["development", "production", "test"])("con NODE_ENV=%s: synchronize false y migrationsRun true", entorno => {
    const config = { get: (clave: string) => (clave === "NODE_ENV" ? entorno : undefined) } as ConfigService;

    expect(opcionesTypeOrm(config)).toMatchObject({ synchronize: false, migrationsRun: true });
  });
});
