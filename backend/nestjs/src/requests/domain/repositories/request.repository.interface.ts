import { Request } from "@/requests/domain/entities/request.entity";

/**
 * Request repository interface - defines the contract for request repository implementations
 */
export interface IRequestRepository {
  findAll(): Promise<Request[]>;
  findOne(id: string): Promise<Request>;
  findByRequestHash(requestHash: string): Promise<Request | null>;
  findAllByRequestHashes(requestHashes: string[]): Promise<Request[]>;
  findByUserId(userId: string): Promise<Request[]>;
  /** Petición con ese id solo si pertenece al usuario; null en otro caso (WEB-103). */
  findOneByIdAndUser(id: string, userId: string): Promise<Request | null>;
  /** Número de usuarios asociados a la petición. */
  countUsers(id: string): Promise<number>;
  /** Quita el vínculo entre la petición y el usuario (tabla user_requests), sin borrar la petición. */
  removeUser(id: string, userId: string): Promise<void>;
  create(request: Request): Promise<Request>;
  update(request: Request): Promise<Request>;
  remove(id: string): Promise<void>;
}
