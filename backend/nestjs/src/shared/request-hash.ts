import { BadRequestException, PipeTransform } from "@nestjs/common";

/**
 * V14/WEB-302: the API always generates the request hash as a hex SHA-256. It ends up in disk paths
 * (./out/<hash>) and MinIO keys, so anything else is rejected before it reaches a query, a key or a queue.
 */
export const REQUEST_HASH = /^[a-f0-9]{64}$/;

export class RequestHashPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    if (!REQUEST_HASH.test(value)) {
      throw new BadRequestException("Invalid request hash");
    }
    return value;
  }
}
