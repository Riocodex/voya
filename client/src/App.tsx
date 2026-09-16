import { Suspense, lazy, useEffect, useRef, useState } from "react";
import { fetchMapboxToken, warmUpApi } from "./api";
import { ChatPanel } from "./components/ChatPanel";
import { ModeSelector } from "./components/ModeSelector";
import { NavigationPanel } from "./components/NavigationPanel";
import { getRoute, distanceToRouteMeters, offRouteThreshold, remainingSteps } from "./directions";
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
  const [rerouting, setRerouting] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);

  const locationRef = useRef(location);
  locationRef.current = location;
  const lastRerouteAt = useRef(0);
  const offRouteHits = useRef(0);

  const inJourney = Boolean(destination);
  const navigating = Boolean(destination && profile);
  const locationReady =
    status === "ready" || status === "denied" || status === "error";

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
      .then((r) => {
        if (cancelled) return;
        setRoute(r);
        lastRerouteAt.current = Date.now();
        offRouteHits.current = 0;
      })
      .catch((err) => {
        if (!cancelled)
          setRouteError(err instanceof Error ? err.message : "Route error");
      })
      .finally(() => !cancelled && setRouteLoading(false));
    return () => {
      cancelled = true;
    };
  }, [destination, profile, mapboxToken]);

  // Recalculate if the user wanders off the drawn route.
  useEffect(() => {
    if (!navigating || !destination || !profile || !mapboxToken || !route) return;

    const threshold = offRouteThreshold(profile, location.accuracy);
    const dist = distanceToRouteMeters(location, route.geometry.coordinates);

    if (dist <= threshold) {
      offRouteHits.current = 0;
      return;
    }

    offRouteHits.current += 1;
    const now = Date.now();
    if (offRouteHits.current < 2) return;
    if (now - lastRerouteAt.current < 8000) return;
    if (rerouting || routeLoading) return;

    lastRerouteAt.current = now;
    setRerouting(true);
    getRoute(profile, location, destination, mapboxToken)
      .then((r) => {
        setRoute(r);
        offRouteHits.current = 0;
      })
      .catch(() => {
        /* keep the old route; try again on the next GPS tick */
      })
      .finally(() => setRerouting(false));
  }, [
    location,
    navigating,
    destination,
    profile,
    mapboxToken,
    route,
    rerouting,
    routeLoading,
  ]);

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
    setRerouting(false);
  };

  return (
    <div className="flex h-screen flex-col bg-[#070b14] text-white">
      {!inJourney && (
        <header className="flex shrink-0 items-center justify-between border-b border-white/10 bg-[#0b1220]/80 px-4 py-3 backdrop-blur-xl">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400 to-indigo-500 text-[#0b1220] shadow-[0_0_18px_rgba(56,189,248,0.5)]">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M12 21s7-6.3 7-11a7 7 0 1 0-14 0c0 4.7 7 11 7 11z" strokeLinejoin="round" />
                <circle cx="12" cy="10" r="2.4" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-extrabold tracking-tight">Voya</h1>
              <p className="text-[11px] text-white/45">
                AI map · closest or best, your call
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {status === "loading" && (
              <span className="rounded-full bg-white/8 px-2.5 py-1 text-[11px] text-white/55 ring-1 ring-white/10">
                Locating…
              </span>
            )}
            {status === "ready" && (
              <span className="flex items-center gap-1.5 rounded-full bg-emerald-400/15 px-2.5 py-1 text-[11px] font-medium text-emerald-300 ring-1 ring-emerald-400/20">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                GPS active
              </span>
            )}
            {(status === "denied" || status === "error") && (
              <button
                type="button"
                onClick={requestLocation}
                className="rounded-full bg-amber-400/15 px-2.5 py-1 text-[11px] text-amber-300 ring-1 ring-amber-400/20 hover:bg-amber-400/25"
              >
                Enable location
              </button>
            )}
          </div>
        </header>
      )}

      {!inJourney && geoError && (
        <div className="shrink-0 bg-amber-400/10 px-4 py-2 text-sm text-amber-200">
          {geoError}
        </div>
      )}

      <main className="flex min-h-0 flex-1 flex-col md:flex-row">
        {!inJourney && (
          <section className="flex h-[45vh] min-h-[280px] flex-col border-b border-white/10 bg-[#0b1220] md:h-auto md:w-[38%] md:max-w-md md:border-b-0 md:border-r">
            <ChatPanel
              lat={location.lat}
              lng={location.lng}
              locationReady={locationReady}
              places={places}
              onPlacesFound={setPlaces}
              onStartJourney={startJourney}
            />
          </section>
        )}

        <section className="relative min-h-0 flex-1">
          {mapboxToken ? (
            <Suspense
              fallback={
                <div className="flex h-full items-center justify-center bg-[#0b1220] text-white/50">
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
            <div className="flex h-full items-center justify-center bg-[#0b1220] p-6">
              <div className="max-w-md rounded-2xl bg-white/5 p-6 ring-1 ring-white/10">
                <p className="font-semibold text-white">Map unavailable</p>
                <p className="mt-2 text-sm text-rose-300">{mapError}</p>
                <p className="mt-2 text-sm text-white/50">
                  Add <code className="text-xs">VITE_MAPBOX_TOKEN</code> in Vercel
                  → Settings → Environment Variables and redeploy for instant map
                  loading.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center bg-[#0b1220] text-white/50">
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
              route={
                route
                  ? { ...route, steps: remainingSteps(route, location) }
                  : emptyRoute(profile)
              }
              destination={destination}
              profile={profile}
              loading={routeLoading || !route}
              rerouting={rerouting}
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
