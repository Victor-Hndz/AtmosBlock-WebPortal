import { NotFoundException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { RequestsService } from "./requests.service";
import { RequestsPublisher } from "@/requests/messaging/requests.publisher";
import { GeneratedFilesService } from "@/generatedFiles/services/generatedFiles.service";
import { ProgressService } from "@/progress/services/progress.service";
import { UsersService } from "@/users/services/users.service";
import { MinioService } from "@/minio/services/minio.service";

// WEB-103 (V3): la propiedad se comprueba en la consulta al repositorio, no después de cargar.
// Una petición puede pertenecer a varios usuarios (se reutiliza por hash): borrarla solo desvincula
// al usuario, y la petición desaparece cuando ya no le queda ninguno.
describe("RequestsService: propiedad de las peticiones", () => {
  let service: RequestsService;
  const repositorio = {
    findOneByIdAndUser: jest.fn(),
    removeUser: jest.fn(),
    countUsers: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    Object.values(repositorio).forEach(fn => fn.mockReset());

    const moduleRef = await Test.createTestingModule({
      providers: [
        RequestsService,
        { provide: "IRequestRepository", useValue: repositorio },
        { provide: RequestsPublisher, useValue: {} },
        { provide: GeneratedFilesService, useValue: {} },
        { provide: ProgressService, useValue: {} },
        { provide: UsersService, useValue: {} },
        { provide: MinioService, useValue: {} },
      ],
    }).compile();

    service = moduleRef.get(RequestsService);
  });

  it("findOneForUser consulta por id y usuario a la vez", async () => {
    repositorio.findOneByIdAndUser.mockResolvedValue({ id: "peticion-1" });

    await expect(service.findOneForUser("peticion-1", "usuario-1")).resolves.toEqual({ id: "peticion-1" });
    expect(repositorio.findOneByIdAndUser).toHaveBeenCalledWith("peticion-1", "usuario-1");
  });

  it("findOneForUser lanza NotFoundException si la petición no es del usuario", async () => {
    repositorio.findOneByIdAndUser.mockResolvedValue(null);

    await expect(service.findOneForUser("ajena", "usuario-1")).rejects.toBeInstanceOf(NotFoundException);
  });

  it("removeForUser no toca una petición ajena", async () => {
    repositorio.findOneByIdAndUser.mockResolvedValue(null);

    await expect(service.removeForUser("ajena", "usuario-1")).rejects.toBeInstanceOf(NotFoundException);
    expect(repositorio.removeUser).not.toHaveBeenCalled();
    expect(repositorio.remove).not.toHaveBeenCalled();
  });

  it("removeForUser en una petición compartida solo desvincula al usuario", async () => {
    repositorio.findOneByIdAndUser.mockResolvedValue({ id: "peticion-1" });
    repositorio.countUsers.mockResolvedValue(1);

    await service.removeForUser("peticion-1", "usuario-1");

    expect(repositorio.removeUser).toHaveBeenCalledWith("peticion-1", "usuario-1");
    expect(repositorio.countUsers).toHaveBeenCalledWith("peticion-1");
    expect(repositorio.remove).not.toHaveBeenCalled();
  });

  it("removeForUser borra la petición cuando el usuario era el último", async () => {
    repositorio.findOneByIdAndUser.mockResolvedValue({ id: "peticion-1" });
    repositorio.countUsers.mockResolvedValue(0);

    await service.removeForUser("peticion-1", "usuario-1");

    expect(repositorio.removeUser).toHaveBeenCalledWith("peticion-1", "usuario-1");
    expect(repositorio.remove).toHaveBeenCalledWith("peticion-1");
  });
});
