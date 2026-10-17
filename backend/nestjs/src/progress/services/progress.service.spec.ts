import { firstValueFrom, toArray } from "rxjs";
import { ProgressService } from "./progress.service";
import { ProgressEvent } from "../domain/progress.interface";
import { MAX_PROGRESS } from "@/shared/consts/consts";

const HASH_A = "a".repeat(64);
const HASH_B = "b".repeat(64);

// WEB-210: el progreso es por petición; antes era un único canal global para todos los clientes.
describe("ProgressService (canal por petición)", () => {
  let service: ProgressService;

  beforeEach(() => {
    service = new ProgressService();
  });

  it("el stream de una petición no recibe el progreso de otra y termina al llegar al máximo", async () => {
    const recibidos = firstValueFrom(service.progressOf(HASH_A).pipe(toArray()));

    service.updateProgress({ requestHash: HASH_B, increment: 1, message: "ajeno" });
    service.updateProgress({ requestHash: HASH_A, increment: 1, message: "propio" });
    service.updateProgress({ requestHash: HASH_A, increment: MAX_PROGRESS, message: "fin" });

    const eventos: ProgressEvent[] = await recibidos;
    expect(eventos.map(e => e.message)).toEqual(["propio", "fin"]);
    expect(eventos.every(e => e.requestHash === HASH_A)).toBe(true);
  });

  it("el progreso acumulado es independiente por petición", async () => {
    const a = firstValueFrom(service.progressOf(HASH_A).pipe(toArray()));

    service.updateProgress({ requestHash: HASH_A, increment: 1, message: "a1" });
    service.updateProgress({ requestHash: HASH_B, increment: 10, message: "b1" });
    service.updateProgress({ requestHash: HASH_A, increment: 1, message: "a2" });
    service.updateProgress({ requestHash: HASH_A, increment: MAX_PROGRESS, message: "fin" });

    expect((await a).map(e => e.increment)).toEqual([4, 8, MAX_PROGRESS]);
  });

  it("quien se conecta tarde recibe el último estado (petición ya en caché: termina enseguida)", async () => {
    service.updateProgress({ requestHash: HASH_A, increment: MAX_PROGRESS, message: "fin" });

    const eventos = await firstValueFrom(service.progressOf(HASH_A).pipe(toArray()));
    expect(eventos).toEqual([{ requestHash: HASH_A, increment: MAX_PROGRESS, message: "fin" }]);
  });

  it("reset olvida el estado de una petición que se vuelve a procesar", async () => {
    service.updateProgress({ requestHash: HASH_A, increment: MAX_PROGRESS, message: "fin" });
    service.reset(HASH_A);

    const recibidos = firstValueFrom(service.progressOf(HASH_A).pipe(toArray()));
    service.updateProgress({ requestHash: HASH_A, increment: 1, message: "de nuevo" });
    service.updateProgress({ requestHash: HASH_A, increment: MAX_PROGRESS, message: "fin" });

    expect((await recibidos).map(e => e.increment)).toEqual([4, MAX_PROGRESS]);
  });

  it("un error se reenvía al stream y lo cierra (WEB-211)", async () => {
    const recibidos = firstValueFrom(service.progressOf(HASH_A).pipe(toArray()));

    service.updateProgress({ requestHash: HASH_A, increment: MAX_PROGRESS, message: "falló", error: "falló" });

    expect(await recibidos).toEqual([
      { requestHash: HASH_A, increment: MAX_PROGRESS, message: "falló", error: "falló" },
    ]);
  });

  // V14/WEB-302: todos los productores (consumidores AMQP y RequestsService) pasan por aquí.
  it.each([undefined, null, "", "../x", "h1", "A".repeat(64)])("ignora el hash %p", requestHash => {
    const next = jest.fn();
    service.progressOf(String(requestHash)).subscribe(next);

    service.updateProgress({ requestHash, increment: 1, message: "hash no válido" } as unknown as ProgressEvent);

    expect(next).not.toHaveBeenCalled();
    expect(service["lastByRequest"].size).toBe(0);
  });
});
