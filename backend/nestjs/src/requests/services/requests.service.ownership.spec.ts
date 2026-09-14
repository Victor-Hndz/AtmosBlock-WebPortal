import { NotFoundException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { RequestsService } from "./requests.service";
import { RequestsPublisher } from "@/requests/messaging/requests.publisher";
import { GeneratedFilesService } from "@/generatedFiles/services/generatedFiles.service";
import { ProgressService } from "@/progress/services/progress.service";
import { UsersService } from "@/users/services/users.service";
import { MinioService } from "@/minio/services/minio.service";

// WEB-103 (V3): la propiedad se comprueba en la consulta al repositorio, no después de cargar.
describe("RequestsService: propiedad de las peticiones", () => {
  let service: RequestsService;
  const repositorio = {
    findOneByIdAndUser: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    repositorio.findOneByIdAndUser.mockReset();
    repositorio.remove.mockReset();

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

  it("removeForUser no borra una petición ajena", async () => {
    repositorio.findOneByIdAndUser.mockResolvedValue(null);

    await expect(service.removeForUser("ajena", "usuario-1")).rejects.toBeInstanceOf(NotFoundException);
    expect(repositorio.remove).not.toHaveBeenCalled();
  });

  it("removeForUser borra una petición propia", async () => {
    repositorio.findOneByIdAndUser.mockResolvedValue({ id: "peticion-1" });

    await service.removeForUser("peticion-1", "usuario-1");
    expect(repositorio.remove).toHaveBeenCalledWith("peticion-1");
  });
});
