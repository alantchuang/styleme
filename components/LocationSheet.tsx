"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

interface GeoResult {
  name: string;
  admin1?: string;
  country: string;
  latitude: number;
  longitude: number;
}

interface LocationSheetProps {
  onClose: () => void;
  onSaved: () => void;
}

export default function LocationSheet({ onClose, onSaved }: LocationSheetProps) {
  const saveLocation = useMutation(api.users.saveLocation);
  const [geoState, setGeoState] = useState<"idle" | "success" | "denied">("idle");
  const [city, setCity] = useState("");
  const [results, setResults] = useState<GeoResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (city.trim().length < 2) {
      setResults([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(
          `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city.trim())}&count=5`
        );
        const data = await res.json();
        setResults(data.results ?? []);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [city]);

  async function handleUseMyLocation() {
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setSaving(true);
        try {
          await saveLocation({
            locationLat: pos.coords.latitude,
            locationLng: pos.coords.longitude,
          });
          setGeoState("success");
          onSaved();
        } catch (err) {
          console.error("LocationSheet: saveLocation failed", err);
        } finally {
          setSaving(false);
        }
      },
      () => {
        setGeoState("denied");
      }
    );
  }

  async function handleSelectCity(result: GeoResult) {
    setSaving(true);
    try {
      await saveLocation({
        locationLat: result.latitude,
        locationLng: result.longitude,
      });
      onSaved();
    } catch (err) {
      console.error("LocationSheet: saveLocation city failed", err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-40"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl px-6 pt-5 pb-8 max-h-[70vh] overflow-y-auto">
        {/* Handle */}
        <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-5" />

        <p className="text-base font-medium text-slate-900">Your location</p>
        <p className="text-sm text-slate-400 mt-1 mb-5">
          Used to show accurate weather for outfit suggestions
        </p>

        {geoState !== "denied" && (
          <button
            onClick={handleUseMyLocation}
            disabled={saving || geoState === "success"}
            className="flex items-center justify-center gap-2 w-full bg-violet-700 text-white rounded-xl px-6 py-3 text-sm font-medium active:scale-[0.98] disabled:opacity-60"
          >
            {geoState === "success" ? "✓ Location saved" : "Use my location"}
          </button>
        )}

        {geoState === "idle" && (
          <button
            onClick={() => setGeoState("denied")}
            className="block text-[11px] text-violet-600 mt-2 mx-auto"
          >
            Enter city instead
          </button>
        )}

        {geoState === "denied" && (
          <>
            <div className="flex items-center gap-3 my-4">
              <div className="flex-1 h-px bg-slate-100" />
              <span className="text-xs text-slate-400">or</span>
              <div className="flex-1 h-px bg-slate-100" />
            </div>

            <div className="relative">
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                maxLength={100}
                placeholder="Search for your city..."
                autoFocus
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:border-violet-400 focus:outline-none"
              />
              {searching && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                  Searching...
                </span>
              )}
            </div>

            {results.length > 0 && (
              <ul className="mt-2 border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                {results.map((r, i) => (
                  <li key={i}>
                    <button
                      onClick={() => handleSelectCity(r)}
                      disabled={saving}
                      className="w-full text-left px-4 py-3 text-sm hover:bg-slate-50 active:bg-slate-100 disabled:opacity-60"
                    >
                      <span className="font-medium text-slate-900">{r.name}</span>
                      <span className="text-slate-400 ml-1">
                        {[r.admin1, r.country].filter(Boolean).join(", ")}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {city.trim().length >= 2 && !searching && results.length === 0 && (
              <p className="text-xs text-slate-400 mt-2 px-1">No cities found. Try a different spelling.</p>
            )}
          </>
        )}

        <button
          onClick={onClose}
          className="block text-xs text-slate-400 mt-4 mx-auto"
        >
          Skip for now
        </button>
      </div>
    </>
  );
}
