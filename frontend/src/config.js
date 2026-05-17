/**
 * Resolved API base for Axios.
 *
 * Dev (recommended): leave `VITE_API_URL` unset and use `"/api"` so the Vite dev server
 * proxies to `VITE_BACKEND_ORIGIN` (see `vite.config.js`). That avoids CORS and fixes
 * cases where env vars are not picked up until you restart Vite.
 *
 * Production / explicit: set `VITE_API_URL` to the full API root, e.g. `https://api.example.com/api`.
 */
export function getApiBaseUrl() {
  const explicit = (import.meta.env.VITE_API_URL || "").trim();
  if (explicit) return explicit;
  return "/api";
}
