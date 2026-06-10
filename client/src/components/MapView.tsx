import { useCallback, useEffect, useRef, useState } from "react";
import Map, { Marker, NavigationControl, Popup } from "react-map-gl/mapbox";
import type { MapRef } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import type { Place, UserLocation } from "../types";

interface MapViewProps {
  mapboxToken: string;
  userLocation: UserLocation;
  places: Place[];
  onRecenter?: () => void;
}

export function MapView({
  mapboxToken,
  userLocation,
  places,
  onRecenter,
}: MapViewProps) {
  const mapRef = useRef<MapRef>(null);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);

  const flyToUser = useCallback(() => {
    mapRef.current?.flyTo({
      center: [userLocation.lng, userLocation.lat],
      zoom: 15,
      duration: 1200,
    });
    onRecenter?.();
  }, [userLocation, onRecenter]);

  useEffect(() => {
    if (places.length > 0) {
      const closest = places[0];
      mapRef.current?.flyTo({
        center: [closest.lng, closest.lat],
        zoom: 15,
        duration: 1200,
      });
    }
  }, [places]);

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
        mapStyle="mapbox://styles/mapbox/streets-v12"
      >
        <NavigationControl position="top-right" />

        <Marker longitude={userLocation.lng} latitude={userLocation.lat} anchor="center">
          <div className="h-4 w-4 rounded-full border-2 border-white bg-blue-500 shadow-lg" />
        </Marker>

        {places.map((place, index) => (
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

        {selectedPlace && (
          <Popup
            longitude={selectedPlace.lng}
            latitude={selectedPlace.lat}
            anchor="top"
            onClose={() => setSelectedPlace(null)}
            closeOnClick={false}
          >
            <div className="p-1">
              <p className="font-semibold text-gray-900">{selectedPlace.name}</p>
              <p className="text-sm text-gray-600">
                {selectedPlace.walkMinutes} min walk · {Math.round(selectedPlace.distanceMeters)}m
              </p>
              {selectedPlace.rating != null && (
                <p className="text-sm text-amber-600">★ {selectedPlace.rating.toFixed(1)}</p>
              )}
            </div>
          </Popup>
        )}
      </Map>

      <button
        type="button"
        onClick={flyToUser}
        className="absolute bottom-4 right-4 rounded-full bg-white px-4 py-2 text-sm font-medium text-gray-800 shadow-lg hover:bg-gray-50"
      >
        📍 Recenter
      </button>
    </div>
  );
}
