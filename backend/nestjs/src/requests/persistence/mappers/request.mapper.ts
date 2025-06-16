import { Request } from "@/requests/domain/entities/request.entity";
import { RequestEntity } from "@/requests/persistence/entities/request.entity";
import { UserMapper } from "@/users/persistence/mappers/user.mapper";
import { GeneratedFilesMapper } from "@/generatedFiles/persistence/mappers/generatedFiles.mapper";

/**
 * Request mapper - translates between domain and persistence entities
 */
export class RequestMapper {
  /**
   * Maps a persistence entity to a domain entity
   * @param requestEntity The entity to map
   * @param includeUsers Whether to include full user objects (default: true)
   */
  static toDomain(requestEntity: RequestEntity, includeUsers: boolean = true): Request {
    return new Request({
      id: requestEntity.id,
      requestHash: requestEntity.requestHash,
      requestStatus: requestEntity.requestStatus,
      variableName: requestEntity.variableName,
      pressureLevels: requestEntity.pressureLevels,
      years: requestEntity.years,
      months: requestEntity.months,
      days: requestEntity.days,
      hours: requestEntity.hours,
      areaCovered: requestEntity.areaCovered,
      mapTypes: requestEntity.mapTypes,
      mapLevels: requestEntity.mapLevels,
      fileFormat: requestEntity.fileFormat,
      noData: requestEntity.noData,
      noMaps: requestEntity.noMaps,
      omp: requestEntity.omp,
      mpi: requestEntity.mpi,
      nThreads: requestEntity.nThreads,
      nProces: requestEntity.nProces,
      timesRequested: requestEntity.timesRequested,
      createdAt: requestEntity.createdAt,
      updatedAt: requestEntity.updatedAt,
      // Only map users if specifically requested
      users: includeUsers && requestEntity.users 
        ? requestEntity.users.map(user => {
            return UserMapper.toDomain(user, false);
          }) 
        : [],
      generatedFiles: requestEntity.generatedFiles
        ? GeneratedFilesMapper.toDomain(requestEntity.generatedFiles)
        : undefined,
    });
  }

  /**
   * Maps a domain entity to a persistence entity
   */
  static toPersistence(request: Request): RequestEntity {
    const persistenceRequest = new RequestEntity();

    persistenceRequest.id = request.id;
    persistenceRequest.requestHash = request.requestHash;
    persistenceRequest.requestStatus = request.requestStatus;
    persistenceRequest.variableName = request.variableName;
    persistenceRequest.pressureLevels = request.pressureLevels;
    persistenceRequest.years = request.years;
    persistenceRequest.months = request.months;
    persistenceRequest.days = request.days;
    persistenceRequest.hours = request.hours;
    persistenceRequest.areaCovered = request.areaCovered;
    persistenceRequest.mapTypes = request.mapTypes;
    persistenceRequest.mapLevels = request.mapLevels;
    persistenceRequest.fileFormat = request.fileFormat;
    persistenceRequest.noData = request.noData;
    persistenceRequest.noMaps = request.noMaps;
    persistenceRequest.omp = request.omp;
    persistenceRequest.mpi = request.mpi;
    persistenceRequest.nThreads = request.nThreads;
    persistenceRequest.nProces = request.nProces;
    persistenceRequest.timesRequested = request.timesRequested;
    
    if (request.users && request.users.length > 0) {
      persistenceRequest.users = request.users.map(user => {
        return UserMapper.toPersistence(user, false);
      });
    }
    
    persistenceRequest.generatedFiles = request.generatedFiles
      ? GeneratedFilesMapper.toPersistence(request.generatedFiles)
      : undefined;

    return persistenceRequest;
  }
}
