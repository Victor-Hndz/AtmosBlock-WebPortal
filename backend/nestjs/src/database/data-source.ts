import { DataSource } from "typeorm";

// WEB-305: opciones comunes de la API, la CLI de TypeORM y los int-specs. El esquema solo lo crean las migraciones.
export const opcionesBase = {
  type: "postgres" as const,
  entities: [__dirname + "/../**/*.entity{.ts,.js}"],
  migrations: [__dirname + "/migrations/*{.ts,.js}"],
  synchronize: false,
};

// Para la CLI de TypeORM sobre dist/ (`pnpm migration:generate`). Sin dotenv: exporta antes las variables DB_*.
export default new DataSource({
  ...opcionesBase,
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});
