export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

export const API_URL_AUTH = `${API_URL}/auth`;
export const API_URL_REQUESTS = `${API_URL}/requests`;
export const API_URL_USERS = `${API_URL}/users`;

export const API_URL_AUTH_LOGIN = `${API_URL_AUTH}/login`;
export const API_URL_AUTH_REGISTER = `${API_URL_AUTH}/register`;

export const API_URL_REQUESTS_MY_REQUESTS = `${API_URL_REQUESTS}/my-requests`;

export const API_URL_USERS_PROFILE = `${API_URL_USERS}/profile`;
