import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Map, { Layer, Marker, Popup, Source } from "react-map-gl/mapbox";
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
  const [following, setFollowing] = useState(true);
  const headingRef = useRef(0);

  const recenter = useCallback(() => {
    setFollowing(true);
    if (navigating) {
      mapRef.current?.easeTo({
        center: [userLocation.lng, userLocation.lat],
        zoom: 16.8,
        pitch: 55,
        bearing: userLocation.heading ?? headingRef.current,
        duration: 900,
      });
    } else {
      mapRef.current?.flyTo({
        center: [userLocation.lng, userLocation.lat],
        zoom: 16,
        pitch: 0,
        bearing: 0,
        duration: 1000,
      });
      onRecenter?.();
    }
  }, [navigating, userLocation, onRecenter]);

  // Fly to the closest result on a fresh search (when not navigating).
  useEffect(() => {
    if (navigating || places.length === 0) return;
    const closest = places[0];
    mapRef.current?.flyTo({
      center: [closest.lng, closest.lat],
      zoom: 15,
      duration: 1200,
    });
  }, [places, navigating]);

  // Draw the route in, preview the whole trip, then drop into follow-cam.
  useEffect(() => {
    if (!route) {
      setDrawn(null);
      return;
    }
    const coords = route.geometry.coordinates;
    if (coords.length === 0) return;

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

    setFollowing(false);
    const lons = coords.map((c) => c[0]);
    const lats = coords.map((c) => c[1]);
    mapRef.current?.fitBounds(
      [
        [Math.min(...lons), Math.min(...lats)],
        [Math.max(...lons), Math.max(...lats)],
      ],
      { padding: { top: 150, bottom: 300, left: 56, right: 56 }, duration: 900 }
    );

    const t = setTimeout(() => setFollowing(true), 2200);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(t);
    };
  }, [route]);

  // Follow-cam: keep the user centered in a 3D driver view while navigating.
  useEffect(() => {
    if (typeof userLocation.heading === "number") {
      headingRef.current = userLocation.heading;
    }
    if (!navigating || !following) return;
    mapRef.current?.easeTo({
      center: [userLocation.lng, userLocation.lat],
      zoom: 16.8,
      pitch: 55,
      bearing: userLocation.heading ?? headingRef.current,
      duration: 900,
    });
  }, [userLocation, navigating, following]);

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
            ? "mapbox://styles/mapbox/navigation-night-v1"
            : "mapbox://styles/mapbox/dark-v11"
        }
        onDragStart={() => navigating && setFollowing(false)}
      >
        {routeData && (
          <Source id="route" type="geojson" data={routeData}>
            <Layer
              id="route-glow"
              type="line"
              layout={{ "line-cap": "round", "line-join": "round" }}
              paint={{
                "line-color": "#38bdf8",
                "line-width": 16,
                "line-opacity": 0.22,
                "line-blur": 8,
              }}
            />
            <Layer
              id="route-casing"
              type="line"
              layout={{ "line-cap": "round", "line-join": "round" }}
              paint={{ "line-color": "#0b1220", "line-width": 11 }}
            />
            <Layer
              id="route-line"
              type="line"
              layout={{ "line-cap": "round", "line-join": "round" }}
              paint={{ "line-color": "#7dd3fc", "line-width": 6 }}
            />
          </Source>
        )}

        {/* Live user location */}
        <Marker
          longitude={userLocation.lng}
          latitude={userLocation.lat}
          anchor="center"
          rotation={navigating ? userLocation.heading ?? headingRef.current : 0}
          rotationAlignment="map"
          pitchAlignment="map"
        >
          {navigating ? (
            <div className="voya-chevron" />
          ) : (
            <div className="voya-location-dot">
              <div className="voya-location-dot__pulse" />
              <div className="voya-location-dot__core" />
            </div>
          )}
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
                className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold shadow-lg ring-2 ring-white/80 transition ${
                  index === 0
                    ? "bg-gradient-to-br from-sky-400 to-indigo-500 text-[#0b1220] shadow-[0_0_16px_rgba(56,189,248,0.6)]"
                    : "bg-[#0b1220] text-white"
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
            <div className="voya-dest-pin">
              <span className="voya-dest-pin__dot" />
            </div>
          </Marker>
        )}

        {selectedPlace && !navigating && (
          <Popup
            longitude={selectedPlace.lng}
            latitude={selectedPlace.lat}
            anchor="top"
            onClose={() => setSelectedPlace(null)}
            closeOnClick={false}
            className="voya-popup"
          >
            <div className="min-w-[190px] p-1">
              <p className="font-semibold text-white">{selectedPlace.name}</p>
              <p className="mt-0.5 text-sm text-white/55">
                {selectedPlace.walkMinutes} min walk ·{" "}
                {formatDistance(selectedPlace.distanceMeters)}
              </p>
              {selectedPlace.rating != null && (
                <p className="mt-0.5 text-sm text-amber-300">
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
                className="mt-2.5 w-full rounded-xl bg-gradient-to-br from-sky-400 to-indigo-500 py-2 text-sm font-semibold text-[#0b1220] transition hover:brightness-110"
              >
                Start journey
              </button>
            </div>
          </Popup>
        )}
      </Map>

      <button
        type="button"
        onClick={recenter}
        title="Recenter on me"
        className={`absolute z-10 flex h-11 w-11 items-center justify-center rounded-full shadow-lg backdrop-blur-md transition ${
          navigating
            ? `bottom-[15rem] right-4 ring-1 ${
                following
                  ? "bg-sky-400 text-[#0b1220] ring-sky-300"
                  : "bg-[#0b1220]/75 text-sky-300 ring-white/15 hover:bg-[#0b1220]"
              }`
            : "bottom-4 right-4 bg-[#0b1220]/80 text-sky-300 ring-1 ring-white/15 hover:bg-[#0b1220]"
        }`}
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="3" />
          <path d="M12 3v2M12 19v2M3 12h2M19 12h2" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}
