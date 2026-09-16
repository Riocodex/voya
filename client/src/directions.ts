import type { Route, RouteStep, TravelProfile, UserLocation } from "./types";

const DIRECTIONS_URL = "https://api.mapbox.com/directions/v5/mapbox";

interface MapboxManeuver {
  instruction?: string;
  type?: string;
  modifier?: string;
  location?: [number, number];
}

interface MapboxStep {
  maneuver?: MapboxManeuver;
  distance?: number;
  name?: string;
}

interface MapboxRoute {
  geometry: GeoJSON.LineString;
  distance: number;
  duration: number;
  legs: { steps?: MapboxStep[] }[];
}

export async function getRoute(
  profile: TravelProfile,
  from: UserLocation,
  to: { lat: number; lng: number },
  token: string
): Promise<Route> {
  const coords = `${from.lng},${from.lat};${to.lng},${to.lat}`;
  const url =
    `${DIRECTIONS_URL}/${profile}/${coords}` +
    `?alternatives=false&geometries=geojson&overview=full&steps=true&banner_instructions=false&access_token=${token}`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error("Could not load directions. Please try again.");
  }

  const data = (await res.json()) as { routes?: MapboxRoute[]; code?: string };
  const route = data.routes?.[0];
  if (!route) {
    throw new Error("No route found to that destination.");
  }

  const steps: RouteStep[] = (route.legs[0]?.steps ?? []).map((s) => ({
    instruction: s.maneuver?.instruction ?? "Continue",
    distanceMeters: s.distance ?? 0,
    name: s.name ?? "",
    maneuver: [s.maneuver?.type, s.maneuver?.modifier].filter(Boolean).join(" "),
    location: s.maneuver?.location ?? [from.lng, from.lat],
  }));

  return {
    profile,
    geometry: route.geometry,
    distanceMeters: route.distance,
    durationSeconds: route.duration,
    steps,
  };
}

export function formatDuration(seconds: number): string {
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins} min`;
  const hours = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem ? `${hours} hr ${rem} min` : `${hours} hr`;
}

export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}
