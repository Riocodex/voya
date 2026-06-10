import { useEffect, useState } from "react";
import type { LocationStatus, UserLocation } from "../types";

const DEFAULT_LOCATION: UserLocation = { lat: 51.5074, lng: -0.1278 };

export function useGeolocation() {
  const [location, setLocation] = useState<UserLocation>(DEFAULT_LOCATION);
  const [status, setStatus] = useState<LocationStatus>("loading");
  const [error, setError] = useState<string | null>(null);

  const requestLocation = () => {
    if (!navigator.geolocation) {
      setStatus("error");
      setError("Geolocation is not supported by your browser.");
      return;
    }

    setStatus("loading");
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
        setStatus("ready");
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setStatus("denied");
          setError("Location access denied. Using London as default — enable location for accurate results.");
        } else {
          setStatus("error");
          setError("Could not get your location. Using default area.");
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  useEffect(() => {
    requestLocation();
  }, []);

  return { location, status, error, requestLocation };
}
