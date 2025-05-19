import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import * as amqp from "amqplib";
import { ConfigService } from "@nestjs/config";
import { ExtendedConnection, ExtendedChannel, asConnection, asChannel } from "./amqp-types";

interface ConsumerHandler {
  routingKey: string;
  queue: string;
  exchange: string;
  handler: (message: any) => Promise<void>;
}

/**
 * Service to consume messages from RabbitMQ using direct amqp access
 * instead of NestJS microservices
 */
@Injectable()
export class AmqpConsumerService implements OnModuleInit {
  private readonly logger = new Logger(AmqpConsumerService.name);
  private readonly url: string;
  private readonly handlers: Map<string, ConsumerHandler> = new Map();
  private connection: ExtendedConnection | null = null;
  private channel: ExtendedChannel | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;

  constructor(private readonly configService: ConfigService) {
    this.url = this.configService.get<string>("RABBITMQ_URL") ?? "amqp://admin:pass@localhost:5672";
  }

  async onModuleInit() {
    await this.connect();
  }

  /**
   * Register a handler for a specific routing key and queue
   * @param routingKey The routing key to listen for
   * @param queue The queue name
   * @param exchange The exchange name
   * @param handler The handler function to process messages
   */
  registerHandler(routingKey: string, queue: string, exchange: string, handler: (message: any) => Promise<void>) {
    const key = `${exchange}:${routingKey}:${queue}`;
    this.handlers.set(key, { routingKey, queue, exchange, handler });
    this.logger.log(`Handler registered for ${exchange}:${routingKey} on queue ${queue}`);

    // If we're already connected, set up the consumer
    if (this.channel) {
      this.setupConsumer({ routingKey, queue, exchange, handler }).catch(err => {
        this.logger.error(`Failed to set up consumer for ${key}: ${err.message}`);
      });
    }
  }

  /**
   * Connect to RabbitMQ and set up channels and consumers
   */
  async connect(): Promise<void> {
    try {
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
              this.scheduleReconnect();
            });

            this.connection.on("close", () => {
              this.logger.warn("RabbitMQ connection closed, attempting to reconnect...");
              this.scheduleReconnect();
            });

            // Create a channel
            const ch = await this.connection.createChannel();
            this.channel = asChannel(ch);

            if (this.channel) {
              await this.channel.prefetch(1); // Process one message at a time
            }

            this.logger.log("Successfully connected to RabbitMQ consumer service");

            // Set up handlers
            for (const handler of this.handlers.values()) {
              await this.setupConsumer(handler);
            }
          }

          // Break the retry loop on successful connection
          break;
        } catch (connectError: any) {
          retries++;
          this.logger.warn(
            `RabbitMQ consumer connection attempt ${retries}/${maxRetries} failed: ${connectError.message}`
          );

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
      this.logger.error(`Failed to connect RabbitMQ consumer after several attempts: ${error.message}`);
      this.scheduleReconnect();
    }
  }

  /**
   * Schedule a reconnection attempt
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    this.channel = null;
    this.connection = null;

    this.reconnectTimer = setTimeout(async () => {
      try {
        await this.connect();
      } catch (error: any) {
        this.logger.error(`Reconnect failed: ${error.message}`);
        this.scheduleReconnect();
      }
    }, 5000); // Try to reconnect after 5 seconds
  }

  /**
   * Set up a consumer for a specific handler
   * @param handler The handler configuration
   */
  private async setupConsumer(handler: ConsumerHandler): Promise<void> {
    try {
      if (!this.channel) {
        throw new Error("Channel is not initialized");
      }

      // Ensure exchange exists
      await this.channel.assertExchange(handler.exchange, "topic", { durable: true });

      // Ensure queue exists
      await this.channel.assertQueue(handler.queue, { durable: true });

      // Bind queue to exchange with routing key
      await this.channel.bindQueue(handler.queue, handler.exchange, handler.routingKey);

      // Set up consumer
      await this.channel.consume(
        handler.queue,
        async msg => {
          if (!msg) {
            return;
          }

          try {
            const content = JSON.parse(msg.content.toString());
            this.logger.log(`Received message on ${handler.queue} with routing key ${msg.fields.routingKey}`);

            try {
              await handler.handler(content);
              if (this.channel) {
                this.channel.ack(msg); // Acknowledge the message after successful processing
              }
            } catch (processingError: any) {
              this.logger.error(`Error processing message: ${processingError.message}`);
              // Acknowledge anyway to prevent redelivery loops, as the error is likely in our code
              if (this.channel) {
                this.channel.ack(msg);
              }
            }
          } catch (parseError: any) {
            this.logger.error(`Error parsing message: ${parseError.message}`);
            // Acknowledge malformed messages to avoid redelivery loops
            if (this.channel) {
              this.channel.ack(msg);
            }
          }
        },
        { noAck: false } // We will manually acknowledge messages
      );

      this.logger.log(`Consumer set up for ${handler.exchange}:${handler.routingKey} on queue ${handler.queue}`);
    } catch (error: any) {
      this.logger.error(
        `Failed to set up consumer for ${handler.exchange}:${handler.routingKey} on queue ${handler.queue}: ${error.message}`
      );
    }
  }

  /**
   * Close connection
   */
  async close(): Promise<void> {
    try {
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }

      if (this.channel) {
        await this.channel.close();
        this.channel = null;
      }

      if (this.connection) {
        await this.connection.close();
        this.connection = null;
      }

      this.logger.log("AmqpConsumerService disconnected");
    } catch (error: any) {
      this.logger.error(`Error closing AMQP consumer connections: ${error.message}`);
    }
  }
}
