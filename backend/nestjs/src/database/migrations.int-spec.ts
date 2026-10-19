// WEB-305: las migraciones crean el esquema que describen las entidades. `pnpm test` no la ejecuta; en el CI va en
// backend-integration. Uso local:
//   docker run -d --name atmos-pg-test -e POSTGRES_USER=test -e POSTGRES_PASSWORD=test \
//     -e POSTGRES_DB=atmos_test -p 55432:5432 postgres:16
//   pnpm run test:int
import { DataSource } from "typeorm";
import { opcionesBase } from "./data-source";

const conexion = { host: "localhost", port: 55432, username: "test", password: "test", database: "atmos_test" };

describe("Migraciones contra PostgreSQL", () => {
  let dataSource: DataSource;

  afterEach(async () => {
    await dataSource?.destroy();
  });

  it("sobre una base vacía dejan el mismo esquema que las entidades", async () => {
    dataSource = new DataSource({ ...opcionesBase, ...conexion, dropSchema: true });
    await dataSource.initialize();
    await dataSource.runMigrations();

    const pendientes = await dataSource.driver.createSchemaBuilder().log();
    expect(pendientes.upQueries.map(q => q.query)).toEqual([]);
  });

  it("sobre una base creada por synchronize registran la línea base sin tocar los datos", async () => {
    const previa = new DataSource({
      ...opcionesBase,
      ...conexion,
      migrations: [],
      synchronize: true,
      dropSchema: true,
    });
    await previa.initialize();
    await previa.query("INSERT INTO users (name, email, password) VALUES ('U', 'u@test', 'x')");
    await previa.destroy();

    dataSource = new DataSource({ ...opcionesBase, ...conexion });
    await dataSource.initialize();
    await dataSource.runMigrations();

    expect(await dataSource.query("SELECT email FROM users")).toEqual([{ email: "u@test" }]);
    const aplicadas = await dataSource.query("SELECT name FROM migrations");
    expect(aplicadas).toEqual([{ name: expect.stringMatching(/^Inicial\d+$/) }]);
  });
});
