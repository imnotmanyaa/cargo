const rawApiBase = (import.meta.env.VITE_API_URL || "").trim();

export const API_BASE = rawApiBase.replace(/\/+$/, "");

export function withApiBase(input: string): string {
  // Use relative URLs so that vite preview proxy intercepts the requests
  if (!input) return input;
  if (input.startsWith("http://") || input.startsWith("https://")) return input;
  if (!input.startsWith("/")) return `/${input}`;
  return input;
}

export function wsBaseFromApi(): string {
  if (!API_BASE) return "";
  if (API_BASE.startsWith("https://")) return API_BASE.replace("https://", "wss://");
  if (API_BASE.startsWith("http://")) return API_BASE.replace("http://", "ws://");
  return "";
}
