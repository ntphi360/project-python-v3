import { authApi, refreshAccessToken } from "./api";

let initializationPromise = null;

export async function login(credentials) {
  const response = await authApi.post("/login", credentials);
  return response.data.data;
}

export async function getCurrentUser() {
  const response = await authApi.get("/me");
  return response.data.data;
}

export function initializeSession() {
  if (!initializationPromise) {
    initializationPromise = refreshAccessToken().then(async (accessToken) => ({
      accessToken,
      user: await getCurrentUser(),
    }));
  }

  return initializationPromise;
}

export async function logout() {
  await authApi.post("/logout");
}
