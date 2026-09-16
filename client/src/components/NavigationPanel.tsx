import { useState } from "react";
import { formatDistance, formatDuration } from "../directions";
import type { Place, Route, TravelProfile } from "../types";

interface NavigationPanelProps {
  route: Route;
  destination: Place;
  profile: TravelProfile;
  loading: boolean;
  onChangeProfile: (profile: TravelProfile) => void;
  onEnd: () => void;
}

const MODES: { profile: TravelProfile; icon: string; label: string }[] = [
  { profile: "driving", icon: "🚗", label: "Drive" },
  { profile: "walking", icon: "🚶", label: "Walk" },
  { profile: "cycling", icon: "🚴", label: "Cycle" },
];

function maneuverIcon(maneuver: string): string {
  if (maneuver.includes("left")) return "↰";
  if (maneuver.includes("right")) return "↱";
  if (maneuver.includes("uturn")) return "⟲";
  if (maneuver.includes("arrive")) return "◉";
  if (maneuver.includes("depart")) return "▲";
  if (maneuver.includes("roundabout") || maneuver.includes("rotary")) return "⟳";
  return "↑";
}

export function NavigationPanel({
  route,
  destination,
  profile,
  loading,
  onChangeProfile,
  onEnd,
}: NavigationPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const nextStep = route.steps[0];
  const upcoming = route.steps.slice(1);

  return (
    <div className="voya-slide-up pointer-events-auto absolute inset-x-0 bottom-0 z-20 mx-auto max-w-xl px-3 pb-3">
      <div className="overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/5">
        {/* Header: ETA + destination + mode switch */}
        <div className="flex items-center justify-between bg-voya-600 px-4 py-3 text-white">
          <div>
            <div className="text-2xl font-extrabold leading-none">
              {formatDuration(route.durationSeconds)}
            </div>
            <div className="text-xs text-voya-50/90">
              {formatDistance(route.distanceMeters)} · to {destination.name}
            </div>
          </div>
          <div className="flex gap-1">
            {MODES.map((mode) => (
              <button
                key={mode.profile}
                type="button"
                title={mode.label}
                onClick={() => onChangeProfile(mode.profile)}
                className={`flex h-9 w-9 items-center justify-center rounded-full text-lg transition ${
                  profile === mode.profile
                    ? "bg-white/25 ring-2 ring-white"
                    : "bg-white/10 hover:bg-white/20"
                }`}
              >
                {mode.icon}
              </button>
            ))}
          </div>
        </div>

        {/* Next instruction */}
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex w-full items-center gap-3 px-4 py-3 text-left"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-voya-50 text-xl text-voya-700">
            {loading ? "…" : maneuverIcon(nextStep?.maneuver ?? "")}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-gray-900">
              {loading ? "Finding the best route…" : nextStep?.instruction ?? "Head to destination"}
            </span>
            {!loading && nextStep && (
              <span className="text-xs text-gray-500">
                {formatDistance(nextStep.distanceMeters)}
                {upcoming.length ? ` · ${upcoming.length} more steps` : ""}
              </span>
            )}
          </span>
          <span className="text-gray-400">{expanded ? "▾" : "▸"}</span>
        </button>

        {/* Expandable step list */}
        {expanded && !loading && (
          <ol className="max-h-56 overflow-y-auto border-t border-gray-100">
            {route.steps.map((step, i) => (
              <li
                key={i}
                className="flex items-center gap-3 px-4 py-2.5 text-sm even:bg-gray-50"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-600">
                  {maneuverIcon(step.maneuver)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-gray-800">
                    {step.instruction}
                  </span>
                  <span className="text-xs text-gray-400">
                    {formatDistance(step.distanceMeters)}
                  </span>
                </span>
              </li>
            ))}
          </ol>
        )}

        <div className="border-t border-gray-100 p-2">
          <button
            type="button"
            onClick={onEnd}
            className="w-full rounded-xl bg-red-50 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-100"
          >
            End journey
          </button>
        </div>
      </div>
    </div>
  );
}
