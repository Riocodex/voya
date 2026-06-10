import { useEffect, useState } from "react";
import { fetchMapboxToken } from "./api";
import { ChatPanel } from "./components/ChatPanel";
import { MapView } from "./components/MapView";
import { useGeolocation } from "./hooks/useGeolocation";
import type { Place } from "./types";

function App() {
  const { location, status, error: geoError, requestLocation } = useGeolocation();
  const [mapboxToken, setMapboxToken] = useState<string | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);
  const [places, setPlaces] = useState<Place[]>([]);

  useEffect(() => {
    fetchMapboxToken()
      .then((token) => {
        if (!token) throw new Error("Mapbox token is missing in .env");
        setMapboxToken(token);
      })
      .catch((err) =>
        setConfigError(err instanceof Error ? err.message : "Config error")
      );
  }, []);

  if (configError) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 p-6">
        <div className="max-w-md rounded-xl bg-white p-6 shadow-lg">
          <h1 className="text-xl font-bold text-gray-900">Voya</h1>
          <p className="mt-2 text-red-600">{configError}</p>
          <p className="mt-2 text-sm text-gray-600">
            Make sure the server is running and MAPBOX_TOKEN is set in .env
          </p>
        </div>
      </div>
    );
  }

  if (!mapboxToken) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <p className="text-gray-600">Loading Voya…</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-gray-50">
      <header className="flex shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4 py-3">
        <div>
          <h1 className="text-lg font-bold text-voya-900">Voya</h1>
          <p className="text-xs text-gray-500">AI map assistant · closest first</p>
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
            locationReady={status === "ready" || status === "denied" || status === "error"}
            onPlacesFound={setPlaces}
          />
        </section>

        <section className="min-h-0 flex-1">
          <MapView
            mapboxToken={mapboxToken}
            userLocation={location}
            places={places}
            onRecenter={requestLocation}
          />
        </section>
      </main>
    </div>
  );
}

export default App;
