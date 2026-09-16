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

export function haversineMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toLocalMeters(
  originLat: number,
  originLng: number,
  lat: number,
  lng: number
): { x: number; y: number } {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const x =
    toRad(lng - originLng) * Math.cos(toRad(originLat)) * 6371000;
  const y = toRad(lat - originLat) * 6371000;
  return { x, y };
}

function distPointToSegmentMeters(
  pLat: number,
  pLng: number,
  aLng: number,
  aLat: number,
  bLng: number,
  bLat: number
): number {
  const p = toLocalMeters(pLat, pLng, pLat, pLng);
  const a = toLocalMeters(pLat, pLng, aLat, aLng);
  const b = toLocalMeters(pLat, pLng, bLat, bLng);
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const apx = p.x - a.x;
  const apy = p.y - a.y;
  const ab2 = abx * abx + aby * aby;
  const t = ab2 === 0 ? 0 : Math.max(0, Math.min(1, (apx * abx + apy * aby) / ab2));
  const dx = apx - abx * t;
  const dy = apy - aby * t;
  return Math.hypot(dx, dy);
}

/** Shortest distance from a GPS point to a route polyline, in meters. */
export function distanceToRouteMeters(
  loc: UserLocation,
  coordinates: GeoJSON.Position[]
): number {
  if (coordinates.length === 0) return Infinity;
  if (coordinates.length === 1) {
    return haversineMeters(loc.lat, loc.lng, coordinates[0][1], coordinates[0][0]);
  }

  let min = Infinity;
  for (let i = 0; i < coordinates.length - 1; i++) {
    const a = coordinates[i];
    const b = coordinates[i + 1];
    const d = distPointToSegmentMeters(loc.lat, loc.lng, a[0], a[1], b[0], b[1]);
    if (d < min) min = d;
  }
  return min;
}

export function offRouteThreshold(
  profile: TravelProfile,
  accuracy?: number
): number {
  const base =
    profile === "driving" ? 80 : profile === "cycling" ? 50 : 35;
  return Math.max(base, (accuracy ?? 0) + 15);
}

/** Drop steps you've already passed so the HUD shows the next real turn. */
export function remainingSteps(route: Route, loc: UserLocation): RouteStep[] {
  const steps = route.steps;
  if (steps.length <= 1) return steps;

  let next = 0;
  for (let i = 0; i < steps.length - 1; i++) {
    const [lng, lat] = steps[i].location;
    if (haversineMeters(loc.lat, loc.lng, lat, lng) < 28) {
      next = i + 1;
    }
  }
  return steps.slice(next);
}
