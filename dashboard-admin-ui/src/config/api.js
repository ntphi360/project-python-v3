const API_URL =
  import.meta.env.VITE_API_URL ||
  "http://localhost:5000";

export const API_BASE_URL = `${API_URL}/api/v1`;

export const AUTH_API_BASE_URL = `${API_URL}/api/auth`;
