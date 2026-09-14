import { firmaRuta, firmaValida } from "./signed-url";

// WEB-102 (V2): las URLs del proxy de ficheros llevan caducidad y firma HMAC, porque las usa el
// navegador en <img>/<embed>, donde no puede enviar la cabecera Authorization.
describe("URLs firmadas del proxy de ficheros", () => {
  const SECRETO = "secreto-solo-para-tests";
  const ahora = 1_800_000_000;
  const expira = ahora + 3600;

  it("acepta una firma válida y vigente", () => {
    const firma = firmaRuta("hash-1/mapa.png", expira, SECRETO);
    expect(firmaValida("hash-1/mapa.png", String(expira), firma, SECRETO, ahora)).toBe(true);
  });

  it("rechaza una firma caducada", () => {
    const firma = firmaRuta("hash-1/mapa.png", ahora - 1, SECRETO);
    expect(firmaValida("hash-1/mapa.png", String(ahora - 1), firma, SECRETO, ahora)).toBe(false);
  });

  it("rechaza la firma de otra ruta (otro hash u otro fichero)", () => {
    const firma = firmaRuta("hash-1/mapa.png", expira, SECRETO);
    expect(firmaValida("hash-2/mapa.png", String(expira), firma, SECRETO, ahora)).toBe(false);
    expect(firmaValida("hash-1/otro.png", String(expira), firma, SECRETO, ahora)).toBe(false);
  });

  it("rechaza una caducidad manipulada", () => {
    const firma = firmaRuta("hash-1/mapa.png", expira, SECRETO);
    expect(firmaValida("hash-1/mapa.png", String(expira + 10), firma, SECRETO, ahora)).toBe(false);
  });

  it("rechaza firmas vacías, basura o con otro secreto, y caducidades no numéricas", () => {
    const firma = firmaRuta("hash-1/mapa.png", expira, SECRETO);
    expect(firmaValida("hash-1/mapa.png", String(expira), "", SECRETO, ahora)).toBe(false);
    expect(firmaValida("hash-1/mapa.png", String(expira), "zz", SECRETO, ahora)).toBe(false);
    expect(firmaValida("hash-1/mapa.png", String(expira), firma, "otro-secreto", ahora)).toBe(false);
    expect(firmaValida("hash-1/mapa.png", "mañana", firma, SECRETO, ahora)).toBe(false);
    expect(firmaValida("hash-1/mapa.png", undefined, undefined, SECRETO, ahora)).toBe(false);
  });
});
