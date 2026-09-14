import { RequestsConsumer } from "./requests.consumer";
import { RequestsService } from "../services/requests.service";
import { ProgressService } from "@/progress/services/progress.service";
import { AmqpConsumerService } from "@/shared/messaging/amqp-consumer.service";
import { MAX_PROGRESS } from "@/shared/consts/consts";
import { MessageContent } from "@/shared/interfaces/messageContentInterface.interface";

// WEB-211: el resultado de una petición fallida llega al stream de progreso como error.
describe("RequestsConsumer (result.done)", () => {
  const processResultMessage = jest.fn().mockResolvedValue(undefined);
  const updateProgress = jest.fn();
  const registerHandler = jest.fn();
  let handler: (data: MessageContent) => Promise<void>;

  beforeEach(async () => {
    processResultMessage.mockClear();
    updateProgress.mockClear();
    registerHandler.mockClear();
    const consumer = new RequestsConsumer(
      { processResultMessage } as unknown as RequestsService,
      { registerHandler } as unknown as AmqpConsumerService,
      { updateProgress } as unknown as ProgressService
    );
    await consumer.onModuleInit();
    handler = registerHandler.mock.calls[0][3];
  });

  it("un resultado correcto cierra el progreso sin error", async () => {
    await handler({ status: "OK", message: "", content: { requestHash: "h1", content: "Processing completed" } });

    expect(processResultMessage).toHaveBeenCalled();
    const evento = updateProgress.mock.calls[0][0];
    expect(evento).toMatchObject({ requestHash: "h1", increment: MAX_PROGRESS });
    expect(evento.error).toBeUndefined();
  });

  it("un resultado con error cierra el progreso con un error genérico (sin detalles internos)", async () => {
    await handler({
      status: "ERROR",
      message: "",
      content: { requestHash: "h1", content: "Error al ejecutar el algoritmo: segfault en /app/code" },
    });

    expect(processResultMessage).toHaveBeenCalled();
    const evento = updateProgress.mock.calls[0][0];
    expect(evento).toMatchObject({ requestHash: "h1", increment: MAX_PROGRESS });
    expect(evento.error).toBeDefined();
    expect(evento.error).not.toContain("/app/code");
  });
});
