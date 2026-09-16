import { useCallback, useEffect, useRef, useState } from "react";
import type { LocationStatus, UserLocation } from "../types";

const DEFAULT_LOCATION: UserLocation = { lat: 35.8989, lng: 14.5146 };

export function useGeolocation() {
  const [location, setLocation] = useState<UserLocation>(DEFAULT_LOCATION);
  const [status, setStatus] = useState<LocationStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const watchId = useRef<number | null>(null);

  const applyPosition = useCallback((pos: GeolocationPosition) => {
    setLocation({
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
      accuracy: pos.coords.accuracy,
      heading: Number.isFinite(pos.coords.heading) ? pos.coords.heading : null,
    });
    setStatus("ready");
  }, []);

  const handleError = useCallback((err: GeolocationPositionError) => {
    if (err.code === err.PERMISSION_DENIED) {
      setStatus("denied");
      setError(
        "Location access denied. Showing a default area — enable location for accurate results."
      );
    } else {
      setStatus("error");
      setError("Couldn't get your location. Using a default area.");
    }
  }, []);

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setStatus("error");
      setError("Geolocation is not supported by your browser.");
      return;
    }

    setStatus("loading");
    setError(null);

    // Fast first fix, then keep tracking live for navigation.
    navigator.geolocation.getCurrentPosition(applyPosition, handleError, {
      enableHighAccuracy: true,
      timeout: 8000,
      maximumAge: 30000,
    });

    if (watchId.current == null) {
      watchId.current = navigator.geolocation.watchPosition(
        applyPosition,
        handleError,
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 }
      );
    }
  }, [applyPosition, handleError]);

  useEffect(() => {
    requestLocation();
    return () => {
      if (watchId.current != null) {
        navigator.geolocation.clearWatch(watchId.current);
        watchId.current = null;
      }
    };
  }, [requestLocation]);

  return { location, status, error, requestLocation };
}
