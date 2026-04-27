const rawApiBase = (import.meta.env.VITE_API_URL || "").trim();

export const API_BASE = rawApiBase.replace(/\/+$/, "");

export function withApiBase(input: string): string {
  if (!input) return input;
  if (!API_BASE) return input;
  if (/^https?:\/\//i.test(input) || /^wss?:\/\//i.test(input)) return input;
  if (!input.startsWith("/")) return input;
  return `${API_BASE}${input}`;
}

export function wsBaseFromApi(): string {
  if (!API_BASE) return "";
  if (API_BASE.startsWith("https://")) return API_BASE.replace("https://", "wss://");
  if (API_BASE.startsWith("http://")) return API_BASE.replace("http://", "ws://");
  return "";
}
