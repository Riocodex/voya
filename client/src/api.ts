import type { ChatMessage, ChatResponse } from "./types";

const API_BASE = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");

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

export async function fetchMapboxToken(): Promise<string> {
  const directToken = import.meta.env.VITE_MAPBOX_TOKEN;
  if (directToken) return directToken;

  if (!API_BASE) {
    throw new Error(
      "Backend not configured. Set VITE_API_URL on Vercel (your Render API URL), or set VITE_MAPBOX_TOKEN for the map only."
    );
  }

  const res = await fetch(`${API_BASE}/api/config`);
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
  if (!API_BASE) {
    throw new Error(
      "Chat requires the backend. Deploy server/ on Render and set VITE_API_URL on Vercel."
    );
  }

  const res = await fetch(`${API_BASE}/api/chat`, {
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
