import { Controller, Logger, OnModuleInit } from "@nestjs/common";
import { ResultsConsumer } from "../messaging/results.consumer";

@Controller("results-consumer")
export class ResultsConsumerController implements OnModuleInit {
  private readonly logger = new Logger(ResultsConsumerController.name);

  constructor(private readonly resultsConsumer: ResultsConsumer) {}

  /**
   * Register message handlers when module initializes
   */
  async onModuleInit() {
    this.logger.log("Initializing results consumer");
    this.resultsConsumer.setupResultsDoneConsumer();
  }
}
