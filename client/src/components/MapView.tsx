import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Map, {
  Layer,
  Marker,
  Popup,
  Source,
} from "react-map-gl/mapbox";
import type { MapRef } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import { formatDistance } from "../directions";
import type { Place, Route, UserLocation } from "../types";

interface MapViewProps {
  mapboxToken: string;
  userLocation: UserLocation;
  places: Place[];
  route: Route | null;
  destination: Place | null;
  navigating: boolean;
  onStartJourney: (place: Place) => void;
  onRecenter?: () => void;
}

export function MapView({
  mapboxToken,
  userLocation,
  places,
  route,
  destination,
  navigating,
  onStartJourney,
  onRecenter,
}: MapViewProps) {
  const mapRef = useRef<MapRef>(null);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [drawn, setDrawn] = useState<GeoJSON.LineString | null>(null);

  const flyToUser = useCallback(() => {
    mapRef.current?.flyTo({
      center: [userLocation.lng, userLocation.lat],
      zoom: 16,
      duration: 1000,
    });
    onRecenter?.();
  }, [userLocation, onRecenter]);

  // Fly to the closest place when a fresh search comes in (not while navigating).
  useEffect(() => {
    if (navigating || places.length === 0) return;
    const closest = places[0];
    mapRef.current?.flyTo({
      center: [closest.lng, closest.lat],
      zoom: 15,
      duration: 1200,
    });
  }, [places, navigating]);

  // Animate the route drawing in, then fit the whole route in view.
  useEffect(() => {
    if (!route) {
      setDrawn(null);
      return;
    }
    const coords = route.geometry.coordinates;
    const total = coords.length;
    const perFrame = Math.max(1, Math.floor(total / 40));
    let i = 0;
    let raf = 0;

    const grow = () => {
      i = Math.min(total, i + perFrame);
      setDrawn({ type: "LineString", coordinates: coords.slice(0, i) });
      if (i < total) raf = requestAnimationFrame(grow);
    };
    grow();

    const lons = coords.map((c) => c[0]);
    const lats = coords.map((c) => c[1]);
    mapRef.current?.fitBounds(
      [
        [Math.min(...lons), Math.min(...lats)],
        [Math.max(...lons), Math.max(...lats)],
      ],
      { padding: { top: 48, bottom: 260, left: 48, right: 48 }, duration: 900 }
    );

    return () => cancelAnimationFrame(raf);
  }, [route]);

  const routeData = useMemo(
    () =>
      drawn
        ? { type: "Feature" as const, properties: {}, geometry: drawn }
        : null,
    [drawn]
  );

  return (
    <div className="relative h-full w-full">
      <Map
        ref={mapRef}
        mapboxAccessToken={mapboxToken}
        initialViewState={{
          longitude: userLocation.lng,
          latitude: userLocation.lat,
          zoom: 14,
        }}
        style={{ width: "100%", height: "100%" }}
        mapStyle={
          navigating
            ? "mapbox://styles/mapbox/navigation-day-v1"
            : "mapbox://styles/mapbox/streets-v12"
        }
      >
        {routeData && (
          <Source id="route" type="geojson" data={routeData}>
            <Layer
              id="route-casing"
              type="line"
              layout={{ "line-cap": "round", "line-join": "round" }}
              paint={{ "line-color": "#ffffff", "line-width": 10 }}
            />
            <Layer
              id="route-line"
              type="line"
              layout={{ "line-cap": "round", "line-join": "round" }}
              paint={{ "line-color": "#0d9488", "line-width": 6 }}
            />
          </Source>
        )}

        {/* Live user location */}
        <Marker
          longitude={userLocation.lng}
          latitude={userLocation.lat}
          anchor="center"
        >
          <div className="voya-location-dot">
            <div className="voya-location-dot__pulse" />
            <div className="voya-location-dot__core" />
          </div>
        </Marker>

        {/* Place markers (hidden while navigating) */}
        {!navigating &&
          places.map((place, index) => (
            <Marker
              key={place.id}
              longitude={place.lng}
              latitude={place.lat}
              anchor="bottom"
              onClick={(e) => {
                e.originalEvent.stopPropagation();
                setSelectedPlace(place);
              }}
            >
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full border-2 border-white text-xs font-bold text-white shadow-lg ${
                  index === 0 ? "bg-voya-600" : "bg-gray-700"
                }`}
              >
                {index + 1}
              </div>
            </Marker>
          ))}

        {/* Destination pin while navigating */}
        {navigating && destination && (
          <Marker
            longitude={destination.lng}
            latitude={destination.lat}
            anchor="bottom"
          >
            <div className="voya-drop text-3xl drop-shadow-lg">📍</div>
          </Marker>
        )}

        {selectedPlace && !navigating && (
          <Popup
            longitude={selectedPlace.lng}
            latitude={selectedPlace.lat}
            anchor="top"
            onClose={() => setSelectedPlace(null)}
            closeOnClick={false}
          >
            <div className="min-w-[180px] p-1">
              <p className="font-semibold text-gray-900">{selectedPlace.name}</p>
              <p className="text-sm text-gray-600">
                {selectedPlace.walkMinutes} min walk ·{" "}
                {formatDistance(selectedPlace.distanceMeters)}
              </p>
              {selectedPlace.rating != null && (
                <p className="text-sm text-amber-600">
                  ★ {selectedPlace.rating.toFixed(1)}
                  {selectedPlace.userRatingCount
                    ? ` (${selectedPlace.userRatingCount})`
                    : ""}
                </p>
              )}
              <button
                type="button"
                onClick={() => {
                  onStartJourney(selectedPlace);
                  setSelectedPlace(null);
                }}
                className="mt-2 w-full rounded-lg bg-voya-600 py-2 text-sm font-semibold text-white hover:bg-voya-700"
              >
                Start journey
              </button>
            </div>
          </Popup>
        )}
      </Map>

      <button
        type="button"
        onClick={flyToUser}
        title="Recenter on me"
        className="absolute bottom-4 right-4 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white text-lg shadow-lg ring-1 ring-black/5 hover:bg-gray-50"
      >
        🧭
      </button>
    </div>
  );
}
