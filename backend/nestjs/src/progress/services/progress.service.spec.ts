import { firstValueFrom, toArray } from "rxjs";
import { ProgressService } from "./progress.service";
import { ProgressEvent } from "../domain/progress.interface";
import { MAX_PROGRESS } from "@/shared/consts/consts";

// WEB-210: el progreso es por petición; antes era un único canal global para todos los clientes.
describe("ProgressService (canal por petición)", () => {
  let service: ProgressService;

  beforeEach(() => {
    service = new ProgressService();
  });

  it("el stream de una petición no recibe el progreso de otra y termina al llegar al máximo", async () => {
    const recibidos = firstValueFrom(service.progressOf("hash-a").pipe(toArray()));

    service.updateProgress({ requestHash: "hash-b", increment: 1, message: "ajeno" });
    service.updateProgress({ requestHash: "hash-a", increment: 1, message: "propio" });
    service.updateProgress({ requestHash: "hash-a", increment: MAX_PROGRESS, message: "fin" });

    const eventos: ProgressEvent[] = await recibidos;
    expect(eventos.map(e => e.message)).toEqual(["propio", "fin"]);
    expect(eventos.every(e => e.requestHash === "hash-a")).toBe(true);
  });

  it("el progreso acumulado es independiente por petición", async () => {
    const a = firstValueFrom(service.progressOf("hash-a").pipe(toArray()));

    service.updateProgress({ requestHash: "hash-a", increment: 1, message: "a1" });
    service.updateProgress({ requestHash: "hash-b", increment: 10, message: "b1" });
    service.updateProgress({ requestHash: "hash-a", increment: 1, message: "a2" });
    service.updateProgress({ requestHash: "hash-a", increment: MAX_PROGRESS, message: "fin" });

    expect((await a).map(e => e.increment)).toEqual([4, 8, MAX_PROGRESS]);
  });

  it("quien se conecta tarde recibe el último estado (petición ya en caché: termina enseguida)", async () => {
    service.updateProgress({ requestHash: "hash-a", increment: MAX_PROGRESS, message: "fin" });

    const eventos = await firstValueFrom(service.progressOf("hash-a").pipe(toArray()));
    expect(eventos).toEqual([{ requestHash: "hash-a", increment: MAX_PROGRESS, message: "fin" }]);
  });

  it("reset olvida el estado de una petición que se vuelve a procesar", async () => {
    service.updateProgress({ requestHash: "hash-a", increment: MAX_PROGRESS, message: "fin" });
    service.reset("hash-a");

    const recibidos = firstValueFrom(service.progressOf("hash-a").pipe(toArray()));
    service.updateProgress({ requestHash: "hash-a", increment: 1, message: "de nuevo" });
    service.updateProgress({ requestHash: "hash-a", increment: MAX_PROGRESS, message: "fin" });

    expect((await recibidos).map(e => e.increment)).toEqual([4, MAX_PROGRESS]);
  });

  it("ignora eventos sin requestHash", () => {
    const next = jest.fn();
    service.progressOf("undefined").subscribe(next);

    service.updateProgress({ increment: 1, message: "sin hash" } as ProgressEvent);

    expect(next).not.toHaveBeenCalled();
  });
});
