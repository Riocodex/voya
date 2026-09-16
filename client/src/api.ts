import type { ChatMessage, ChatResponse } from "./types";

const API_BASE = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");
const DIRECT_MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as
  | string
  | undefined;

export function hasApiBackend(): boolean {
  return true;
}

async function parseJsonResponse<T>(res: Response): Promise<T> {
  const text = await res.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    if (text.trim().startsWith("<!")) {
      throw new Error(
        "API not reachable. Deploy the backend and set VITE_API_URL on Vercel to your API URL (e.g. https://voya-api.onrender.com)."
      );
    }
    throw new Error("Invalid response from server");
  }
}

/**
 * Ping the backend early so the (possibly sleeping) Render free-tier
 * instance cold-starts in the background while the user reads the UI.
 */
function apiUrl(path: string): string {
  return `${API_BASE}${path}`;
}

export function warmUpApi(): void {
  fetch(apiUrl("/api/health")).catch(() => {
    /* ignore — this is just a warm-up */
  });
}

export async function fetchMapboxToken(): Promise<string> {
  if (DIRECT_MAPBOX_TOKEN) return DIRECT_MAPBOX_TOKEN;

  const res = await fetch(apiUrl("/api/config"));
  const data = await parseJsonResponse<{ mapboxToken: string }>(res);
  if (!res.ok) throw new Error("Failed to load map config");
  if (!data.mapboxToken) throw new Error("Mapbox token is missing on the server");
  return data.mapboxToken;
}

export async function sendChatMessage(
  message: string,
  lat: number,
  lng: number,
  history: ChatMessage[]
): Promise<ChatResponse> {
  const res = await fetch(apiUrl("/api/chat"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, lat, lng, history }),
  });

  const data = await parseJsonResponse<ChatResponse & { error?: string }>(res);
  if (!res.ok) {
    throw new Error(data.error ?? "Chat request failed");
  }
  return data;
}
