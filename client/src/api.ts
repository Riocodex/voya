import type { ChatMessage, ChatResponse } from "./types";

const API_BASE = import.meta.env.VITE_API_URL ?? "";

export async function fetchMapboxToken(): Promise<string> {
  const res = await fetch(`${API_BASE}/api/config`);
  if (!res.ok) throw new Error("Failed to load map config");
  const data = (await res.json()) as { mapboxToken: string };
  return data.mapboxToken;
}

export async function sendChatMessage(
  message: string,
  lat: number,
  lng: number,
  history: ChatMessage[]
): Promise<ChatResponse> {
  const res = await fetch(`${API_BASE}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, lat, lng, history }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error ?? "Chat request failed");
  }
  return data as ChatResponse;
}
