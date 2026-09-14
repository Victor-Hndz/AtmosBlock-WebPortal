// Prueba de integración contra PostgreSQL real: ¿create() deja vinculada la petición al usuario?
// NO la ejecuta el CI (el patrón de jest es `\.spec\.ts$`). Uso local:
//   docker run -d --name atmos-pg-test -e POSTGRES_USER=test -e POSTGRES_PASSWORD=test \
//     -e POSTGRES_DB=atmos_test -p 55432:5432 postgres:16
//   npx jest --testRegex 'int-spec\.ts$'
import { DataSource } from "typeorm";
import { RequestEntity } from "@/requests/persistence/entities/request.entity";
import { UserEntity } from "@/users/persistence/entities/user.entity";
import { GeneratedFilesEntity } from "@/generatedFiles/persistence/entities/generatedFiles.entity";
import { TypeOrmRequestRepository } from "@/requests/persistence/repositories/typeorm-request.repository";
import { TypeOrmUserRepository } from "@/users/persistence/repositories/typeorm-user.repository";
import { UsersService } from "@/users/services/users.service";
import { RequestsService } from "./requests.service";
import { CreateRequestDto } from "@/requests/dtos/create-request.dto";
import { RequestsPublisher } from "@/requests/messaging/requests.publisher";
import { GeneratedFilesService } from "@/generatedFiles/services/generatedFiles.service";
import { ProgressService } from "@/progress/services/progress.service";
import { MinioService } from "@/minio/services/minio.service";

describe("RequestsService.create contra PostgreSQL (vínculo usuario-petición)", () => {
  let dataSource: DataSource;
  let service: RequestsService;
  let usuario: UserEntity;
  const publicar = jest.fn();

  const peticion = (dias: string[]) =>
    Object.assign(new CreateRequestDto(), {
      variableName: "geopotential",
      pressureLevels: ["500"],
      years: ["2003"],
      months: ["08"],
      days: dias,
      hours: ["18:00"],
      areaCovered: ["90", "-180", "0", "180"],
      mapTypes: ["cont"],
    });

  const vinculos = async (userId: string) =>
    Number((await dataSource.query("SELECT COUNT(*) AS n FROM user_requests WHERE user_id = $1", [userId]))[0].n);

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

    const usersService = new UsersService(new TypeOrmUserRepository(dataSource.getRepository(UserEntity)));
    service = new RequestsService(
      new TypeOrmRequestRepository(dataSource.getRepository(RequestEntity)),
      { sendRequestCreatedEvent: publicar } as unknown as RequestsPublisher,
      {} as GeneratedFilesService,
      { updateProgress: jest.fn(), reset: jest.fn() } as unknown as ProgressService,
      usersService,
      {} as MinioService
    );

    usuario = await dataSource
      .getRepository(UserEntity)
      .save(Object.assign(new UserEntity(), { name: "U", email: "u@test", password: "x" }));
  });

  afterAll(async () => {
    await dataSource?.destroy();
  });

  it("una petición nueva queda vinculada al usuario en user_requests", async () => {
    await service.create(Object.assign(peticion(["14"]), { userId: usuario.id }));

    expect(await vinculos(usuario.id)).toBe(1);
  });

  it("findAllByUser (my-requests) devuelve las peticiones creadas por el usuario", async () => {
    await service.create(Object.assign(peticion(["15"]), { userId: usuario.id }));

    const propias = await service.findAllByUser(usuario.id);
    expect(propias.map(r => r.days[0]).sort()).toEqual(["14", "15"]);
  });

  it("un segundo usuario que pide una petición aún en proceso queda vinculado y no se republica", async () => {
    const otro = await dataSource
      .getRepository(UserEntity)
      .save(Object.assign(new UserEntity(), { name: "O", email: "o@test", password: "x" }));
    publicar.mockClear();

    // La petición del día 14 sigue en GENERATING (la creó el primer test y nadie la ha terminado).
    await service.create(Object.assign(peticion(["14"]), { userId: otro.id }));

    expect(await vinculos(otro.id)).toBe(1);
    expect(publicar).not.toHaveBeenCalled();
  });
});
