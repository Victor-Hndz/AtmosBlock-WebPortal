export enum RabbitMQQueues {
  CONFIG_QUEUE = "config_queue",
  RESULT_QUEUE = "results_queue",
  PROGRESS_QUEUE = "progress_queue",
}

export enum RabbitMQExchanges {
  CONFIG_EXCHANGE = "requests_exchange",
  RESULT_EXCHANGE = "results_exchange",
  PROGRESS_EXCHANGE = "progress_exchange",
}

export enum RabbitMQRoutingKeys {
  CONFIG_CREATE = "config.create",
  RESULT_DONE = "results.done",
  PROGRESS_UPDATE = "progress.update",
}
