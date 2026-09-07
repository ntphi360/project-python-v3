import axios from "axios";

import { API_BASE_URL, AUTH_API_BASE_URL } from "../config/api";

let getAccessToken = () => null;
let handleAccessToken = () => {};
let handleAuthenticationFailure = () => {};
let refreshPromise = null;

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

export const authApi = axios.create({
  baseURL: AUTH_API_BASE_URL,
  withCredentials: true,
});

function getCsrfCookie(name) {
  const prefix = `${encodeURIComponent(name)}=`;
  const cookie = document.cookie
    .split(";")
    .map((value) => value.trim())
    .find((value) => value.startsWith(prefix));

  return cookie ? decodeURIComponent(cookie.slice(prefix.length)) : null;
}

function getRefreshHeaders() {
  // The refresh token remains HttpOnly; only its anti-CSRF cookie is read here.
  const csrfToken = getCsrfCookie("csrf_refresh_token");
  return csrfToken ? { "X-CSRF-TOKEN": csrfToken } : {};
}

export function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = authApi
      .post("/refresh", null, { headers: getRefreshHeaders() })
      .then((response) => {
        const accessToken = response.data?.data?.accessToken;
        if (!accessToken) {
          throw new Error("Refresh response không có access token");
        }
        handleAccessToken(accessToken);
        return accessToken;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

export function configureApiAuth({
  accessTokenSelector,
  onAccessToken,
  onAuthenticationFailure,
}) {
  getAccessToken = accessTokenSelector;
  handleAccessToken = onAccessToken;
  handleAuthenticationFailure = onAuthenticationFailure;
}

function attachAccessToken(config) {
  const accessToken = getAccessToken();
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
}

api.interceptors.request.use(attachAccessToken);
authApi.interceptors.request.use(attachAccessToken);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const isRefreshRequest = originalRequest?.url?.includes("/auth/refresh");

    if (
      error.response?.status !== 401 ||
      !originalRequest ||
      originalRequest._authRetry ||
      isRefreshRequest
    ) {
      return Promise.reject(error);
    }

    originalRequest._authRetry = true;

    const currentAccessToken = getAccessToken();
    const requestAuthorization = originalRequest.headers?.Authorization;
    if (
      currentAccessToken &&
      requestAuthorization !== `Bearer ${currentAccessToken}`
    ) {
      originalRequest.headers.Authorization = `Bearer ${currentAccessToken}`;
      return api(originalRequest);
    }

    try {
      const accessToken = await refreshAccessToken();
      originalRequest.headers.Authorization = `Bearer ${accessToken}`;
      return api(originalRequest);
    } catch (refreshError) {
      handleAuthenticationFailure();
      return Promise.reject(refreshError);
    }
  },
);

export default api;
