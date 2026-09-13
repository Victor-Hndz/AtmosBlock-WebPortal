import { Test, TestingModule } from "@nestjs/testing";
import { RequestsService } from "./requests.service";
import { RequestsPublisher } from "@/requests/messaging/requests.publisher";
import { GeneratedFilesService } from "@/generatedFiles/services/generatedFiles.service";
import { ProgressService } from "@/progress/services/progress.service";
import { UsersService } from "@/users/services/users.service";
import { MinioService } from "@/minio/services/minio.service";

describe("RequestsService", () => {
  let service: RequestsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RequestsService,
        { provide: "IRequestRepository", useValue: {} },
        { provide: RequestsPublisher, useValue: {} },
        { provide: GeneratedFilesService, useValue: {} },
        { provide: ProgressService, useValue: {} },
        { provide: UsersService, useValue: {} },
        { provide: MinioService, useValue: {} },
      ],
    }).compile();

    service = module.get<RequestsService>(RequestsService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});
