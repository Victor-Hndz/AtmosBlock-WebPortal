// filepath: c:\Users\Victor\Desktop\repos\tfm\backend\nestjs\src\shared\messaging\amqp.service.ts
import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import * as amqp from "amqplib";
import { ConfigService } from "@nestjs/config";
import { RabbitMQExchanges, RabbitMQRoutingKeys } from "../enums/rabbitmqQueues.enum";
import { MessageContent } from "../interfaces/messageContentInterface.interface";
import { ExtendedConnection, ExtendedChannel, asConnection, asChannel } from "./amqp-types";

@Injectable()
export class AmqpService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AmqpService.name);
  private readonly url: string;
  private connection: ExtendedConnection | null = null;
  private channel: ExtendedChannel | null = null;

  constructor(private readonly configService: ConfigService) {
    this.url = this.configService.get<string>("RABBITMQ_URL") ?? "amqp://admin:pass@localhost:5672";
  }

  async onModuleInit() {
    await this.connect();
  }

  async onModuleDestroy() {
    await this.disconnect();
  }

  async connect(): Promise<void> {
    try {
      // Add a retry mechanism for connection
      let retries = 0;
      const maxRetries = 5;

      while (retries < maxRetries) {
        try {
          this.logger.log(`Connecting to RabbitMQ at ${this.url}...`);
          const conn = await amqp.connect(this.url);
          this.connection = asConnection(conn);

          if (this.connection) {
            this.connection.on("error", err => {
              this.logger.error(`RabbitMQ connection error: ${err.message}`);
              this.tryReconnect();
            });

            this.connection.on("close", () => {
              this.logger.warn("RabbitMQ connection closed, attempting to reconnect...");
              this.tryReconnect();
            });

            // Create a channel
            const ch = await this.connection.createChannel();
            this.channel = asChannel(ch);
            this.logger.log("Successfully connected to RabbitMQ");

            // Set up exchanges
            await this.setupExchanges();
          }

          // Break the retry loop on successful connection
          break;
        } catch (connectError: any) {
          retries++;
          this.logger.warn(`RabbitMQ connection attempt ${retries}/${maxRetries} failed: ${connectError.message}`);

          if (retries >= maxRetries) {
            throw connectError;
          }

          // Wait before retrying (exponential backoff)
          const delay = Math.min(1000 * Math.pow(2, retries - 1), 10000);
          this.logger.log(`Retrying connection in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    } catch (error: any) {
      this.logger.error(`Failed to connect to RabbitMQ after several attempts: ${error.message}`);
      throw error;
    }
  }

  private async tryReconnect(): Promise<void> {
    if (this.channel) {
      try {
        // Close existing channel if it's still there
        await this.channel.close();
      } catch (err: any) {
        this.logger.error(`Error closing existing channel: ${err.message}`);
      }
    }

    if (this.connection) {
      try {
        // Close existing connection if it's still there
        await this.connection.close();
      } catch (err: any) {
        this.logger.error(`Error closing existing connection: ${err.message}`);
      }
    }

    this.connection = null;
    this.channel = null;

    try {
      await this.connect();
    } catch (error: any) {
      this.logger.error(`Failed to reconnect: ${error.message}`);
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.channel) {
        await this.channel.close();
        this.channel = null;
      }
      if (this.connection) {
        await this.connection.close();
        this.connection = null;
      }
      this.logger.log("Disconnected from RabbitMQ");
    } catch (error: any) {
      this.logger.error(`Error disconnecting from RabbitMQ: ${error.message}`);
    }
  }

  private async setupExchanges(): Promise<void> {
    if (!this.channel) {
      throw new Error("Channel not initialized");
    }

    // Declare all exchanges
    await this.channel.assertExchange(RabbitMQExchanges.CONFIG_EXCHANGE, "topic", { durable: true });
    await this.channel.assertExchange(RabbitMQExchanges.RESULT_EXCHANGE, "topic", { durable: true });
    await this.channel.assertExchange(RabbitMQExchanges.PROGRESS_EXCHANGE, "topic", { durable: true });

    this.logger.log("Exchanges set up successfully");
  }

  async emit(routingKey: RabbitMQRoutingKeys, data: MessageContent): Promise<boolean> {
    try {
      if (!this.channel) {
        await this.connect();
        if (!this.channel) {
          throw new Error("Failed to create channel");
        }
      }

      // Determine which exchange to use based on the routing key
      let exchange: string;
      if (routingKey === RabbitMQRoutingKeys.CONFIG_CREATE) {
        exchange = RabbitMQExchanges.CONFIG_EXCHANGE;
      } else if (routingKey === RabbitMQRoutingKeys.RESULT_DONE) {
        exchange = RabbitMQExchanges.RESULT_EXCHANGE;
      } else if (routingKey === RabbitMQRoutingKeys.PROGRESS_UPDATE) {
        exchange = RabbitMQExchanges.PROGRESS_EXCHANGE;
      } else {
        throw new Error(`Unsupported routing key: ${routingKey}`);
      }

      // Convert message to buffer
      const message = Buffer.from(JSON.stringify(data));

      // Publish the message
      const result = this.channel.publish(exchange, routingKey, message, {
        persistent: true, // Make message persistent
        contentType: "application/json",
        contentEncoding: "utf-8",
      });

      if (result) {
        this.logger.log(`Message sent to exchange ${exchange} with routing key ${routingKey}`);
      } else {
        this.logger.warn(
          `Failed to emit message to ${exchange} with routing key ${routingKey} - channel write buffer full`
        );
        // Wait for drain event
        await new Promise(resolve => this.channel?.once("drain", resolve));
      }

      return result;
    } catch (error: any) {
      this.logger.error(`Error emitting message to ${routingKey}: ${error.message}`);
      // Try to reconnect on failure
      await this.tryReconnect();
      return false;
    }
  }
}
