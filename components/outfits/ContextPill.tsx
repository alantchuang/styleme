"use client";

import type { WeatherState } from "./types";

interface ContextPillProps {
  occasion: string;
  weather: WeatherState;
  onTap: () => void;
}

export default function ContextPill({ occasion, weather, onTap }: ContextPillProps) {
  const weatherStr =
    weather.tempC != null ? ` · ${weather.tempC}°C` : "";
  const label = `${occasion}${weatherStr} ▾`;

  return (
    <button
      onClick={onTap}
      aria-label={`Change occasion: ${occasion}`}
      className="bg-surface-container-lowest border border-outline-variant rounded-full px-3 py-1 text-[12px] text-on-surface-variant active:bg-surface-container"
    >
      {label}
    </button>
  );
}
