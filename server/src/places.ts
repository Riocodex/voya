import { haversine, walkMinutes } from "./utils/haversine.js";
import type { Place } from "./types.js";

export type RankBy = "distance" | "best";

export interface SearchOptions {
  rankBy?: RankBy;
  area?: string;
}

const PLACES_URL = "https://places.googleapis.com/v1/places:searchText";
const FIELD_MASK =
  "places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount";
const RADIUS_STEPS_DISTANCE = [500, 1000, 2000, 5000];
const RADIUS_STEPS_BEST = [3000, 10000, 25000];

interface GooglePlace {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  location?: { latitude?: number; longitude?: number };
  rating?: number;
  userRatingCount?: number;
}

interface SearchResult {
  places: Place[];
  searchNote?: string;
  rankBy: RankBy;
}

const cache = new Map<string, { expires: number; data: SearchResult }>();
const CACHE_TTL_MS = 5 * 60 * 1000;

const CLOSEST_PATTERN =
  /\b(closest|nearest|near me|nearby|around me|close to me|close by|walking distance|shortest walk|next to me)\b/i;
const BEST_PATTERN =
  /\b(best|top|highest rated|most popular|famous|recommended|greatest|finest|must.?try|go.?to spot)\b/i;

function cacheKey(
  query: string,
  lat: number,
  lng: number,
  rankBy: RankBy,
  area?: string
): string {
  return `${query.toLowerCase()}|${lat.toFixed(4)}|${lng.toFixed(4)}|${rankBy}|${area ?? ""}`;
}

export function inferRankBy(query: string, explicit?: RankBy): RankBy {
  if (explicit) return explicit;
  if (CLOSEST_PATTERN.test(query)) return "distance";
  if (BEST_PATTERN.test(query)) return "best";
  return "distance";
}

function buildTextQuery(query: string, area?: string): string {
  if (!area) return query;
  const areaLower = area.toLowerCase();
  if (query.toLowerCase().includes(areaLower)) return query;
  return `${query} in ${area}`;
}

function qualityScore(place: Place): number {
  const rating = place.rating ?? 0;
  const reviews = place.userRatingCount ?? 0;
  return rating * Math.log10(reviews + 10);
}

function sortPlaces(places: Place[], rankBy: RankBy): Place[] {
  const sorted = [...places];
  if (rankBy === "distance") {
    sorted.sort((a, b) => a.distanceMeters - b.distanceMeters);
  } else {
    sorted.sort((a, b) => {
      const scoreDiff = qualityScore(b) - qualityScore(a);
      if (Math.abs(scoreDiff) > 0.01) return scoreDiff;
      return (b.userRatingCount ?? 0) - (a.userRatingCount ?? 0);
    });
  }
  return sorted;
}

async function textSearch(
  apiKey: string,
  query: string,
  lat: number,
  lng: number,
  radiusMeters: number,
  rankBy: RankBy
): Promise<GooglePlace[]> {
  const response = await fetch(PLACES_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": FIELD_MASK,
    },
    body: JSON.stringify({
      textQuery: query,
      locationBias: {
        circle: {
          center: { latitude: lat, longitude: lng },
          radius: radiusMeters,
        },
      },
      rankPreference: rankBy === "distance" ? "DISTANCE" : "RELEVANCE",
      maxResultCount: 20,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Places API error (${response.status}): ${errorText}`);
  }

  const data = (await response.json()) as { places?: GooglePlace[] };
  return data.places ?? [];
}

function normalizePlaces(
  rawPlaces: GooglePlace[],
  userLat: number,
  userLng: number
): Place[] {
  return rawPlaces
    .filter((p) => p.location?.latitude != null && p.location?.longitude != null)
    .map((p) => {
      const placeLat = p.location!.latitude!;
      const placeLng = p.location!.longitude!;
      const distanceMeters = haversine(userLat, userLng, placeLat, placeLng);
      return {
        id: p.id ?? `${placeLat},${placeLng}`,
        name: p.displayName?.text ?? "Unknown place",
        address: p.formattedAddress ?? "",
        lat: placeLat,
        lng: placeLng,
        rating: p.rating,
        userRatingCount: p.userRatingCount,
        distanceMeters,
        walkMinutes: walkMinutes(distanceMeters),
      };
    });
}

export async function searchNearbyPlaces(
  query: string,
  lat: number,
  lng: number,
  options: SearchOptions = {}
): Promise<SearchResult> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_PLACES_API_KEY is not configured");
  }

  const rankBy = inferRankBy(query, options.rankBy);
  const textQuery = buildTextQuery(query, options.area);
  const radiusSteps =
    rankBy === "distance" ? RADIUS_STEPS_DISTANCE : RADIUS_STEPS_BEST;

  const key = cacheKey(textQuery, lat, lng, rankBy, options.area);
  const cached = cache.get(key);
  if (cached && cached.expires > Date.now()) {
    return cached.data;
  }

  let searchNote: string | undefined;
  let allPlaces: Place[] = [];

  for (const radius of radiusSteps) {
    const raw = await textSearch(apiKey, textQuery, lat, lng, radius, rankBy);
    allPlaces = sortPlaces(normalizePlaces(raw, lat, lng), rankBy);

    if (allPlaces.length > 0) {
      if (rankBy === "distance" && radius > radiusSteps[0]) {
        searchNote = `Nothing within ${radiusSteps[0]}m — widened search to ${radius / 1000}km.`;
      }
      if (rankBy === "best" && radius > radiusSteps[0]) {
        searchNote = `Searched wider across the area (${radius / 1000}km) for top-rated picks.`;
      }
      break;
    }
  }

  if (rankBy === "best" && allPlaces.length > 0) {
    searchNote =
      searchNote ??
      "Ranked by rating and reviews — not by distance.";
  }

  const result: SearchResult = {
    places: allPlaces.slice(0, 5),
    searchNote,
    rankBy,
  };

  cache.set(key, { expires: Date.now() + CACHE_TTL_MS, data: result });
  return result;
}
