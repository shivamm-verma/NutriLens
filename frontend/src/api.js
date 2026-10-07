import axios from "axios";

// Empty baseURL => same origin. Vite (dev) and Nginx (Docker) both proxy /api to FastAPI.
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "",
  timeout: 120000,
});

function toMessage(err) {
  if (err.response) {
    const detail = err.response.data?.detail;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail) && detail[0]?.msg) return detail[0].msg;
    return `Server error (${err.response.status}).`;
  }
  if (err.code === "ECONNABORTED") return "The request timed out. Please try again.";
  return "Can't reach the NutriLens server. Make sure the backend is running on port 8000.";
}

export async function analyzeFood(file, hint = "") {
  const form = new FormData();
  form.append("file", file);
  form.append("hint", hint);
  try {
    const { data } = await api.post("/api/analyze", form);
    return data;
  } catch (err) {
    throw new Error(toMessage(err));
  }
}

export async function checkHealth() {
  try {
    const { data } = await api.get("/api/health", { timeout: 5000 });
    return data;
  } catch {
    return null;
  }
}
