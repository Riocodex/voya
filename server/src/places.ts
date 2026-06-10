import { haversine, walkMinutes } from "./utils/haversine.js";
import type { Place } from "./types.js";

const PLACES_URL = "https://places.googleapis.com/v1/places:searchText";
const FIELD_MASK =
  "places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount";
const RADIUS_STEPS = [500, 1000, 2000, 5000];

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
}

const cache = new Map<string, { expires: number; data: SearchResult }>();
const CACHE_TTL_MS = 5 * 60 * 1000;

function cacheKey(query: string, lat: number, lng: number): string {
  return `${query.toLowerCase()}|${lat.toFixed(4)}|${lng.toFixed(4)}`;
}

async function textSearch(
  apiKey: string,
  query: string,
  lat: number,
  lng: number,
  radiusMeters: number
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
      rankPreference: "DISTANCE",
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
    })
    .sort((a, b) => a.distanceMeters - b.distanceMeters);
}

export async function searchNearbyPlaces(
  query: string,
  lat: number,
  lng: number
): Promise<SearchResult> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_PLACES_API_KEY is not configured");
  }

  const key = cacheKey(query, lat, lng);
  const cached = cache.get(key);
  if (cached && cached.expires > Date.now()) {
    return cached.data;
  }

  let searchNote: string | undefined;
  let allPlaces: Place[] = [];

  for (const radius of RADIUS_STEPS) {
    const raw = await textSearch(apiKey, query, lat, lng, radius);
    allPlaces = normalizePlaces(raw, lat, lng);

    if (allPlaces.length > 0) {
      if (radius > RADIUS_STEPS[0]) {
        searchNote = `Nothing within ${RADIUS_STEPS[0]}m — widened search to ${radius / 1000}km.`;
      }
      break;
    }
  }

  const result: SearchResult = {
    places: allPlaces.slice(0, 5),
    searchNote,
  };

  cache.set(key, { expires: Date.now() + CACHE_TTL_MS, data: result });
  return result;
}
