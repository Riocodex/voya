import { Suspense, lazy, useEffect, useRef, useState } from "react";
import { fetchMapboxToken, warmUpApi } from "./api";
import { ChatPanel } from "./components/ChatPanel";
import { ModeSelector } from "./components/ModeSelector";
import { NavigationPanel } from "./components/NavigationPanel";
import { getRoute } from "./directions";
import { useGeolocation } from "./hooks/useGeolocation";
import type { Place, Route, TravelProfile } from "./types";

const MapView = lazy(() =>
  import("./components/MapView").then((m) => ({ default: m.MapView }))
);

function App() {
  const { location, status, error: geoError, requestLocation } = useGeolocation();
  const [mapboxToken, setMapboxToken] = useState<string | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const [places, setPlaces] = useState<Place[]>([]);

  // Navigation state
  const [destination, setDestination] = useState<Place | null>(null);
  const [profile, setProfile] = useState<TravelProfile | null>(null);
  const [route, setRoute] = useState<Route | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);

  const locationRef = useRef(location);
  locationRef.current = location;

  useEffect(() => {
    warmUpApi();
    fetchMapboxToken()
      .then(setMapboxToken)
      .catch((err) =>
        setMapError(err instanceof Error ? err.message : "Map config error")
      );
  }, []);

  // Fetch a route whenever a destination + travel mode are chosen.
  useEffect(() => {
    if (!destination || !profile || !mapboxToken) return;
    let cancelled = false;
    setRouteLoading(true);
    setRouteError(null);
    getRoute(profile, locationRef.current, destination, mapboxToken)
      .then((r) => !cancelled && setRoute(r))
      .catch((err) => {
        if (!cancelled)
          setRouteError(err instanceof Error ? err.message : "Route error");
      })
      .finally(() => !cancelled && setRouteLoading(false));
    return () => {
      cancelled = true;
    };
  }, [destination, profile, mapboxToken]);

  const startJourney = (place: Place) => {
    setRoute(null);
    setProfile(null);
    setRouteError(null);
    setDestination(place);
  };

  const endJourney = () => {
    setDestination(null);
    setProfile(null);
    setRoute(null);
    setRouteError(null);
  };

  const navigating = Boolean(destination && profile);
  const locationReady =
    status === "ready" || status === "denied" || status === "error";

  return (
    <div className="flex h-screen flex-col bg-gray-50">
      <header className="flex shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4 py-3">
        <div>
          <h1 className="text-lg font-extrabold tracking-tight text-voya-900">
            Voya
          </h1>
          <p className="text-xs text-gray-500">
            AI map assistant · closest or best, your call
          </p>
        </div>
        <div className="flex items-center gap-2">
          {status === "loading" && (
            <span className="text-xs text-gray-500">Locating…</span>
          )}
          {status === "ready" && (
            <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">
              GPS active
            </span>
          )}
          {(status === "denied" || status === "error") && (
            <button
              type="button"
              onClick={requestLocation}
              className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800 hover:bg-amber-200"
            >
              Enable location
            </button>
          )}
        </div>
      </header>

      {geoError && (
        <div className="shrink-0 bg-amber-50 px-4 py-2 text-sm text-amber-800">
          {geoError}
        </div>
      )}

      <main className="flex min-h-0 flex-1 flex-col md:flex-row">
        <section className="flex h-[45vh] min-h-[280px] flex-col border-b border-gray-200 md:h-auto md:w-[40%] md:border-b-0 md:border-r">
          <ChatPanel
            lat={location.lat}
            lng={location.lng}
            locationReady={locationReady}
            places={places}
            onPlacesFound={setPlaces}
            onStartJourney={startJourney}
          />
        </section>

        <section className="relative min-h-0 flex-1">
          {mapboxToken ? (
            <Suspense
              fallback={
                <div className="flex h-full items-center justify-center bg-gray-100 text-gray-500">
                  Loading map…
                </div>
              }
            >
              <MapView
                mapboxToken={mapboxToken}
                userLocation={location}
                places={places}
                route={route}
                destination={destination}
                navigating={navigating}
                onStartJourney={startJourney}
                onRecenter={requestLocation}
              />
            </Suspense>
          ) : mapError ? (
            <div className="flex h-full items-center justify-center bg-gray-50 p-6">
              <div className="max-w-md rounded-xl bg-white p-6 shadow-lg">
                <p className="font-semibold text-gray-900">Map unavailable</p>
                <p className="mt-2 text-sm text-red-600">{mapError}</p>
                <p className="mt-2 text-sm text-gray-600">
                  Add <code className="text-xs">VITE_MAPBOX_TOKEN</code> in Vercel
                  → Settings → Environment Variables and redeploy for instant map
                  loading.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center bg-gray-100 text-gray-500">
              Loading map…
            </div>
          )}

          {/* Mode picker (car / walk / cycle) */}
          {destination && !profile && (
            <ModeSelector
              destination={destination}
              onSelect={setProfile}
              onCancel={endJourney}
            />
          )}

          {/* Turn-by-turn navigation */}
          {navigating && destination && profile && (
            <NavigationPanel
              route={route ?? emptyRoute(profile)}
              destination={destination}
              profile={profile}
              loading={routeLoading || !route}
              onChangeProfile={(p) => {
                setRoute(null);
                setProfile(p);
              }}
              onEnd={endJourney}
            />
          )}

          {routeError && navigating && (
            <div className="absolute inset-x-0 top-3 z-30 mx-auto w-fit rounded-lg bg-red-600 px-3 py-1.5 text-sm text-white shadow-lg">
              {routeError}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function emptyRoute(profile: TravelProfile): Route {
  return {
    profile,
    geometry: { type: "LineString", coordinates: [] },
    distanceMeters: 0,
    durationSeconds: 0,
    steps: [],
  };
}

export default App;
