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
  accuracy?: number;
  heading?: number | null;
}

export type LocationStatus = "loading" | "ready" | "denied" | "error";

export type TravelProfile = "driving" | "walking" | "cycling";

export interface RouteStep {
  instruction: string;
  distanceMeters: number;
  name: string;
  maneuver: string;
  location: [number, number];
}

export interface Route {
  profile: TravelProfile;
  geometry: GeoJSON.LineString;
  distanceMeters: number;
  durationSeconds: number;
  steps: RouteStep[];
}
