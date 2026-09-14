import { createHmac, timingSafeEqual } from "crypto";

/**
 * WEB-102 (V2): URLs del proxy de ficheros con caducidad y firma HMAC-SHA256.
 * El navegador las usa en <img>/<embed>, donde no puede enviar la cabecera Authorization.
 */
export const DURACION_URL_FIRMADA_S = 3600;

export function firmaRuta(ruta: string, expira: number, secreto: string): string {
  return createHmac("sha256", secreto).update(`files:${ruta}:${expira}`).digest("hex");
}

export function firmaValida(
  ruta: string,
  expira: string | number | undefined,
  firma: string | undefined,
  secreto: string,
  ahora: number = Math.floor(Date.now() / 1000)
): boolean {
  const caducidad = Number(expira);
  if (!firma || !Number.isInteger(caducidad) || caducidad < ahora) {
    return false;
  }
  const esperada = Buffer.from(firmaRuta(ruta, caducidad, secreto), "hex");
  const recibida = Buffer.from(firma, "hex");
  return recibida.length === esperada.length && timingSafeEqual(recibida, esperada);
}
