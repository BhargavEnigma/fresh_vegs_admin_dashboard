import axios from "axios";
import { ENDPOINTS } from "./endpoints";
import { getAuth, setAuth, clearAuth } from "../lib/storage";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  // timeout: 30000,
});

api.interceptors.request.use((config) => {
  const auth = getAuth();
  const token = auth?.tokens?.access_token;
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }

  config.headers = config.headers || {};

  // ✅ IMPORTANT FIX:
  // If sending FormData, do NOT force JSON content-type.
  // Browser/Axios will automatically set multipart/form-data with boundary.
  const isFormData =
    typeof FormData !== "undefined" && config.data instanceof FormData;

  if (isFormData) {
    delete config.headers["Content-Type"];
    delete config.headers["content-type"];
  } else {
    config.headers["Content-Type"] = "application/json";
  }

  return config;
});

let isRefreshing = false;
let queue = [];

function resolveQueue(error, token = null) {
  queue.forEach((prom) => {
    if (error) prom.reject(error);
    else prom.resolve(token);
  });
  queue = [];
}

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;

    const status = error?.response?.status;
    const code = error?.response?.data?.error?.code;

    // Only try refresh for 401s on non-auth endpoints
    const isAuthEndpoint = original?.url?.includes("/v1/auth/");
    if (status === 401 && !isAuthEndpoint && !original._retry) {
      const auth = getAuth();
      const refresh_token = auth?.tokens?.refresh_token;

      if (!refresh_token) {
        clearAuth();
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          queue.push({ resolve, reject });
        }).then((token) => {
          original.headers.Authorization = `Bearer ${token}`;
          return api(original);
        });
      }

      original._retry = true;
      isRefreshing = true;

      try {
        const resp = await axios.post(
          `${import.meta.env.VITE_API_BASE_URL}${ENDPOINTS.auth.refresh}`,
          { refresh_token, device_id: "web" },
          { headers: { "Content-Type": "application/json" } }
        );

        const newAccess = resp?.data?.data?.access_token;
        const expires = resp?.data?.data?.access_expires_in_seconds;

        if (!newAccess) throw new Error("No access token in refresh response");

        const nextAuth = { ...auth, tokens: { ...auth.tokens, access_token: newAccess, access_expires_in_seconds: expires } };
        setAuth(nextAuth);

        resolveQueue(null, newAccess);

        original.headers.Authorization = `Bearer ${newAccess}`;
        return api(original);
      } catch (e) {
        resolveQueue(e, null);
        clearAuth();
        return Promise.reject(e);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
