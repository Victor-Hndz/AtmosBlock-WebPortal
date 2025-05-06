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
   */
  static toDomain(requestEntity: RequestEntity): Request {
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
      mapRanges: requestEntity.mapRanges,
      mapTypes: requestEntity.mapTypes,
      mapLevels: requestEntity.mapLevels,
      fileFormat: requestEntity.fileFormat,
      tracking: requestEntity.tracking,
      noCompile: requestEntity.noCompile,
      noExecute: requestEntity.noExecute,
      noMaps: requestEntity.noMaps,
      animation: requestEntity.animation,
      omp: requestEntity.omp,
      mpi: requestEntity.mpi,
      nThreads: requestEntity.nThreads,
      nProces: requestEntity.nProces,
      timesRequested: requestEntity.timesRequested,
      createdAt: requestEntity.createdAt,
      updatedAt: requestEntity.updatedAt,
      user: requestEntity.user ? UserMapper.toDomain(requestEntity.user) : undefined,
      generatedFiles: GeneratedFilesMapper.toDomain(requestEntity.generatedFiles),
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
    persistenceRequest.mapRanges = request.mapRanges;
    persistenceRequest.mapTypes = request.mapTypes;
    persistenceRequest.mapLevels = request.mapLevels;
    persistenceRequest.fileFormat = request.fileFormat;
    persistenceRequest.tracking = request.tracking;
    persistenceRequest.noCompile = request.noCompile;
    persistenceRequest.noExecute = request.noExecute;
    persistenceRequest.noMaps = request.noMaps;
    persistenceRequest.animation = request.animation;
    persistenceRequest.omp = request.omp;
    persistenceRequest.mpi = request.mpi;
    persistenceRequest.nThreads = request.nThreads;
    persistenceRequest.nProces = request.nProces;
    persistenceRequest.timesRequested = request.timesRequested;

    return persistenceRequest;
  }
}
