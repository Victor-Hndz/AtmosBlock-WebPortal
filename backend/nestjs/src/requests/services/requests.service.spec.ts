import { Test, TestingModule } from "@nestjs/testing";
import { RequestsService } from "./requests.service";
import { RequestsPublisher } from "@/requests/messaging/requests.publisher";
import { GeneratedFilesService } from "@/generatedFiles/services/generatedFiles.service";
import { ProgressService } from "@/progress/services/progress.service";
import { UsersService } from "@/users/services/users.service";
import { MinioService } from "@/minio/services/minio.service";
import { CreateRequestDto } from "@/requests/dtos/create-request.dto";

describe("RequestsService", () => {
  let service: RequestsService;
  const llamadas: string[] = [];
  const progressService = { reset: jest.fn(() => llamadas.push("reset")) };
  const requestsPublisher = { sendRequestCreatedEvent: jest.fn(() => llamadas.push("publicar")) };

  beforeEach(async () => {
    llamadas.length = 0;
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RequestsService,
        {
          provide: "IRequestRepository",
          useValue: { findByRequestHash: jest.fn().mockResolvedValue(null), create: jest.fn() },
        },
        { provide: RequestsPublisher, useValue: requestsPublisher },
        { provide: GeneratedFilesService, useValue: {} },
        { provide: ProgressService, useValue: progressService },
        { provide: UsersService, useValue: {} },
        { provide: MinioService, useValue: {} },
      ],
    }).compile();

    service = module.get<RequestsService>(RequestsService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  it("una petición nueva olvida el progreso anterior de su hash antes de publicarse (WEB-210)", async () => {
    const dto = Object.assign(new CreateRequestDto(), { variableName: "geopotential", mapLevels: ["20"] });

    await service.create(dto);

    expect(progressService.reset).toHaveBeenCalledWith(dto.requestHash);
    expect(llamadas).toEqual(["reset", "publicar"]);
  });
});
