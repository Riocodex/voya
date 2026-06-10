export interface Place {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  rating?: number;
  userRatingCount?: number;
  distanceMeters: number;
  walkMinutes: number;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatResponse {
  reply: string;
  places: Place[];
  mapCenter: { lat: number; lng: number };
  searchNote?: string;
}

export interface UserLocation {
  lat: number;
  lng: number;
}

export type LocationStatus = "loading" | "ready" | "denied" | "error";
