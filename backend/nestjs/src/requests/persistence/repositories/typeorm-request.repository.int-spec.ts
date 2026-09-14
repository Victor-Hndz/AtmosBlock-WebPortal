// Prueba de integración contra PostgreSQL real (WEB-103). NO la ejecuta el CI: el patrón de jest es
// `\.spec\.ts$` y este fichero acaba en `-spec.ts`. Uso local:
//   docker run -d --name atmos-pg-test -e POSTGRES_USER=test -e POSTGRES_PASSWORD=test \
//     -e POSTGRES_DB=atmos_test -p 55432:5432 postgres:16
//   npx jest --testRegex 'int-spec\.ts$'
import { DataSource } from "typeorm";
import { RequestEntity } from "@/requests/persistence/entities/request.entity";
import { UserEntity } from "@/users/persistence/entities/user.entity";
import { GeneratedFilesEntity } from "@/generatedFiles/persistence/entities/generatedFiles.entity";
import { TypeOrmRequestRepository } from "./typeorm-request.repository";

describe("TypeOrmRequestRepository contra PostgreSQL (propiedad y peticiones compartidas)", () => {
  let dataSource: DataSource;
  let repositorio: TypeOrmRequestRepository;
  let usuarioA: UserEntity;
  let usuarioB: UserEntity;
  let compartida: RequestEntity;
  let soloDeA: RequestEntity;

  const nuevaPeticion = (hash: string) =>
    Object.assign(new RequestEntity(), {
      requestHash: hash,
      variableName: "geopotential",
      pressureLevels: ["500"],
      years: ["2003"],
      months: ["08"],
      days: ["14"],
      hours: ["18:00"],
      areaCovered: ["90", "-180", "0", "180"],
      mapTypes: ["cont"],
    });

  beforeAll(async () => {
    dataSource = new DataSource({
      type: "postgres",
      host: "localhost",
      port: 55432,
      username: "test",
      password: "test",
      database: "atmos_test",
      entities: [RequestEntity, UserEntity, GeneratedFilesEntity],
      synchronize: true,
      dropSchema: true,
    });
    await dataSource.initialize();
    repositorio = new TypeOrmRequestRepository(dataSource.getRepository(RequestEntity));

    compartida = await dataSource.getRepository(RequestEntity).save(nuevaPeticion("hash-compartida"));
    soloDeA = await dataSource.getRepository(RequestEntity).save(nuevaPeticion("hash-solo-a"));

    const usuarios = dataSource.getRepository(UserEntity);
    usuarioA = await usuarios.save(
      Object.assign(new UserEntity(), { name: "A", email: "a@test", password: "x", requests: [compartida, soloDeA] })
    );
    usuarioB = await usuarios.save(
      Object.assign(new UserEntity(), { name: "B", email: "b@test", password: "x", requests: [compartida] })
    );
  });

  afterAll(async () => {
    await dataSource?.destroy();
  });

  it("findOneByIdAndUser solo devuelve peticiones del usuario", async () => {
    expect(await repositorio.findOneByIdAndUser(soloDeA.id, usuarioA.id)).not.toBeNull();
    expect(await repositorio.findOneByIdAndUser(soloDeA.id, usuarioB.id)).toBeNull();
    expect(await repositorio.findOneByIdAndUser(compartida.id, usuarioB.id)).not.toBeNull();
  });

  it("countUsers cuenta los usuarios de la petición", async () => {
    expect(await repositorio.countUsers(compartida.id)).toBe(2);
    expect(await repositorio.countUsers(soloDeA.id)).toBe(1);
  });

  it("removeUser quita solo el vínculo de ese usuario y no borra la petición", async () => {
    await repositorio.removeUser(compartida.id, usuarioA.id);

    expect(await repositorio.countUsers(compartida.id)).toBe(1);
    expect(await repositorio.findOneByIdAndUser(compartida.id, usuarioA.id)).toBeNull();
    expect(await repositorio.findOneByIdAndUser(compartida.id, usuarioB.id)).not.toBeNull();
    expect(await dataSource.getRepository(RequestEntity).findOneBy({ id: compartida.id })).not.toBeNull();
  });
});
