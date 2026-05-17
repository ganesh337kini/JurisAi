import { getApiBaseUrl } from "../config.js";

/**
 * Turns Axios errors into human-readable UI text.
 * Most "Signup failed" / "Login failed" cases are actually: backend not running or wrong dev proxy target.
 */
export function formatApiError(err, fallback) {
  const apiMessage = err?.response?.data?.message;
  if (apiMessage) return apiMessage;

  const code = err?.code;
  const msg = err?.message || "";

  if (code === "ERR_NETWORK" || msg === "Network Error") {
    const base = getApiBaseUrl();
    const hint =
      base === "/api"
        ? "Dev mode uses the Vite proxy at /api → VITE_BACKEND_ORIGIN (see frontend/.env). Start the backend on that port."
        : "Check VITE_API_URL matches the running backend (scheme, host, port, and /api path).";
    return [
      `Cannot reach the backend (requests go to ${base}).`,
      "Start the API: cd backend && npm start",
      hint,
      "After changing frontend/.env, restart npm run dev.",
    ].join(" ");
  }

  if (code === "ECONNABORTED" || msg.toLowerCase().includes("timeout")) {
    return "The request timed out. If MongoDB or Atlas is slow to respond, try again in a moment.";
  }

  return fallback;
}
