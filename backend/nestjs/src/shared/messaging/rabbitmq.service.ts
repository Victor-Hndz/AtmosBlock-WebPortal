import { Injectable } from "@nestjs/common";
import { AmqpService } from "./amqp.service";
import { MessageContent } from "../interfaces/messageContentInterface.interface";
import { Observable } from "rxjs";

/**
 * Legacy wrapper around AmqpService to maintain backward compatibility
 * with existing code that uses RabbitMQService.
 * Delegates all operations to the AmqpService.
 */
@Injectable()
export class RabbitMQService {
  constructor(private readonly amqpService: AmqpService) {}

  async connect(): Promise<void> {
    await this.amqpService.connect();
  }

  async disconnect(): Promise<void> {
    await this.amqpService.disconnect();
  }

  emit(pattern: string, data: MessageContent): Observable<any> {
    // Call async emit but return Observable for compatibility
    this.amqpService.emit(pattern as any, data);
    return new Observable();
  }
}
