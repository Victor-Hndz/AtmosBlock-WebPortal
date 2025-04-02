import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ClientRMQ } from "@nestjs/microservices";
import { Observable, firstValueFrom } from "rxjs";

@Injectable()
export class RabbitMQService {
  private readonly logger = new Logger(RabbitMQService.name);
  private readonly client: ClientRMQ;

  constructor(private readonly configService: ConfigService) {
    this.client = new ClientRMQ({
      urls: [this.configService.get<string>("RABBITMQ_URL")!],
      queue: this.configService.get<string>("RABBITMQ_QUEUE")!,
      queueOptions: {
        durable: true,
      },
    });
  }

  async connect() {
    try {
      await this.client.connect();
      this.logger.log("Successfully connected to RabbitMQ");
    } catch (error) {
      this.logger.error(`Failed to connect to RabbitMQ: ${error.message}`);
      throw error;
    }
  }

  async disconnect() {
    this.client.close();
    this.logger.log("Disconnected from RabbitMQ");
  }

  send<T>(pattern: string, data: any): Observable<T> {
    this.logger.debug(`Sending message to ${pattern}: ${JSON.stringify(data)}`);
    return this.client.send<T>(pattern, data);
  }

  emit(pattern: string, data: any): Observable<any> {
    this.logger.debug(`Emitting event to ${pattern}: ${JSON.stringify(data)}`);
    return this.client.emit(pattern, data);
  }

  async sendAndReceive<T>(pattern: string, data: any): Promise<T> {
    return firstValueFrom(this.send<T>(pattern, data));
  }
}
