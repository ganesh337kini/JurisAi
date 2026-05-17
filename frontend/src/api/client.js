import axios from "axios";
import { getApiBaseUrl } from "../config.js";

/**
 * Axios instance with a stable base URL + JWT header injection.
 *
 * Beginner tip: in dev, base URL is usually `"/api"` and Vite proxies to the backend.
 */
const api = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: 15 * 60 * 1000, // uploads + AI can take a while
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("jurisai_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
