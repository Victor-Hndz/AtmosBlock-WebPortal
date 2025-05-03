import { Request } from "@/requests/domain/entities/request.entity";

/**
 * Request repository interface - defines the contract for request repository implementations
 */
export interface IRequestRepository {
  findAll(): Promise<Request[]>;
  findOne(id: string): Promise<Request>;
  findByRequestHash(requestHash: string): Promise<Request | null>;
  findByUserId(userId: string): Promise<Request[]>;
  create(request: Request): Promise<Request>;
  update(request: Request): Promise<Request>;
  remove(id: string): Promise<void>;
}
