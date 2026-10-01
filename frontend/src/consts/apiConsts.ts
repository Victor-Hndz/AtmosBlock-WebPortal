export const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000/api";

export const API_URL_AUTH = `${API_URL}/auth`;
export const API_URL_REQUESTS = `${API_URL}/requests`;
export const API_URL_USERS = `${API_URL}/users`;

export const API_URL_AUTH_LOGIN = `${API_URL_AUTH}/login`;
export const API_URL_AUTH_REGISTER = `${API_URL_AUTH}/register`;

export const API_URL_REQUESTS_MY_REQUESTS = `${API_URL_REQUESTS}/my-requests`;

export const API_URL_USERS_PROFILE = `${API_URL_USERS}/profile`;

/** Datos de la previsión de bloqueos en GitHub Pages (PRD-401) */
export const PREDICCION_URL =
  import.meta.env.VITE_PREDICCION_URL ?? "https://victor-hndz.github.io/AtmosBlock-WebPortal/prediccion";
/** Visor público de la previsión en GitHub Pages (PRD-508), que la página incrusta con ?embed=1 */
export const VISOR_URL = import.meta.env.VITE_VISOR_URL ?? "https://victor-hndz.github.io/AtmosBlock-WebPortal/";
