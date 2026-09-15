import * as amqp from "amqplib";

// Extended interfaces to fix TypeScript errors
export interface ExtendedConnection extends amqp.Connection {
  createChannel(): Promise<amqp.Channel>;
  close(): Promise<void>;
}

export interface ExtendedChannel extends amqp.Channel {
  close(): Promise<void>;
}

// Type assertion functions
export function asConnection(conn: unknown): ExtendedConnection {
  return conn as ExtendedConnection;
}

export function asChannel(channel: unknown): ExtendedChannel {
  return channel as ExtendedChannel;
}
