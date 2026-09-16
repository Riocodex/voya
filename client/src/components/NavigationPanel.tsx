import { useMemo, useState } from "react";
import { formatDistance, formatDuration } from "../directions";
import type { Place, Route, TravelProfile } from "../types";
import { ManeuverIcon } from "./ManeuverIcon";

interface NavigationPanelProps {
  route: Route;
  destination: Place;
  profile: TravelProfile;
  loading: boolean;
  rerouting?: boolean;
  onChangeProfile: (profile: TravelProfile) => void;
  onEnd: () => void;
}

const MODES: { profile: TravelProfile; label: string }[] = [
  { profile: "driving", label: "Drive" },
  { profile: "walking", label: "Walk" },
  { profile: "cycling", label: "Cycle" },
];

function ModeGlyph({ profile }: { profile: TravelProfile }) {
  if (profile === "walking") {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="12" cy="4.5" r="1.6" fill="currentColor" stroke="none" />
        <path d="M10 8.5l1.5 3 2.5 1.5M11.5 11.5 8 21M13.2 13 16 21M9 15h4.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (profile === "cycling") {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="6.5" cy="16.5" r="2.8" />
        <circle cx="17.5" cy="16.5" r="2.8" />
        <path d="M6.5 16.5 11 10h4l2.5 6.5M11 10l-2-4M13 6h3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 16V10l3-5h10l3 5v6" strokeLinejoin="round" />
      <circle cx="7.5" cy="16.5" r="1.8" fill="currentColor" stroke="none" />
      <circle cx="16.5" cy="16.5" r="1.8" fill="currentColor" stroke="none" />
      <path d="M4 11h16" />
    </svg>
  );
}

function arrivalClock(durationSeconds: number): string {
  const eta = new Date(Date.now() + durationSeconds * 1000);
  return eta.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export function NavigationPanel({
  route,
  destination,
  profile,
  loading,
  rerouting = false,
  onChangeProfile,
  onEnd,
}: NavigationPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const nextStep = route.steps[0];
  const arrival = useMemo(
    () => arrivalClock(route.durationSeconds),
    [route.durationSeconds]
  );

  return (
    <>
      {/* Next-turn HUD — like a real GPS windshield banner */}
      <div className="voya-hud-in pointer-events-none absolute inset-x-0 top-0 z-20 px-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="mx-auto flex max-w-2xl items-stretch overflow-hidden rounded-3xl bg-[#0b1220]/82 text-white shadow-[0_20px_60px_rgba(0,0,0,0.45)] ring-1 ring-white/10 backdrop-blur-xl">
          <div className="flex w-[5.5rem] shrink-0 flex-col items-center justify-center bg-gradient-to-b from-sky-400 to-indigo-500 py-4">
            {loading ? (
              <div className="h-8 w-8 animate-pulse rounded-full bg-white/40" />
            ) : (
              <ManeuverIcon
                maneuver={nextStep?.maneuver ?? "depart"}
                className="h-10 w-10 text-white drop-shadow"
              />
            )}
            <div className="mt-1 text-[11px] font-bold tracking-wide">
              {loading ? "…" : formatDistance(nextStep?.distanceMeters ?? 0)}
            </div>
          </div>
          <div className="min-w-0 flex-1 px-4 py-3.5">
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-sky-300/90">
              Next
            </div>
            <div className="mt-0.5 line-clamp-2 text-lg font-semibold leading-snug tracking-tight">
              {rerouting
                ? "Rerouting from here…"
                : loading
                ? "Plotting your route…"
                : nextStep?.instruction ?? "Head to destination"}
            </div>
            {nextStep?.name && !loading && (
              <div className="mt-1 truncate text-xs text-white/50">
                via {nextStep.name}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom glass dock */}
      <div className="voya-slide-up pointer-events-auto absolute inset-x-0 bottom-0 z-20 mx-auto max-w-2xl px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="overflow-hidden rounded-3xl bg-[#0b1220]/88 text-white shadow-[0_-16px_50px_rgba(0,0,0,0.4)] ring-1 ring-white/10 backdrop-blur-xl">
          <div className="grid grid-cols-3 divide-x divide-white/10 px-2 py-4">
            <Stat label="ETA" value={loading ? "—" : formatDuration(route.durationSeconds)} />
            <Stat label="Arrive" value={loading ? "—" : arrival} />
            <Stat label="Left" value={loading ? "—" : formatDistance(route.distanceMeters)} />
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-white/10 px-4 py-3">
            <div className="min-w-0">
              <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40">
                Destination
              </div>
              <div className="truncate text-sm font-semibold">{destination.name}</div>
            </div>
            <div className="flex shrink-0 gap-1 rounded-full bg-white/8 p-1 ring-1 ring-white/10">
              {MODES.map((mode) => (
                <button
                  key={mode.profile}
                  type="button"
                  title={mode.label}
                  onClick={() => onChangeProfile(mode.profile)}
                  className={`flex h-9 w-9 items-center justify-center rounded-full transition ${
                    profile === mode.profile
                      ? "bg-sky-400 text-[#0b1220] shadow-[0_0_16px_rgba(56,189,248,0.55)]"
                      : "text-white/55 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <ModeGlyph profile={mode.profile} />
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="flex w-full items-center justify-between border-t border-white/10 px-4 py-2.5 text-left text-xs text-white/50 hover:bg-white/5"
          >
            <span>{expanded ? "Hide steps" : "Show all turns"}</span>
            <span className="text-white/30">{expanded ? "▾" : "▸"}</span>
          </button>

          {expanded && !loading && (
            <ol className="max-h-48 overflow-y-auto border-t border-white/10">
              {route.steps.map((step, i) => (
                <li
                  key={i}
                  className={`flex items-center gap-3 px-4 py-2.5 text-sm ${
                    i === 0 ? "bg-sky-400/10" : ""
                  }`}
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/8 text-sky-300">
                    <ManeuverIcon maneuver={step.maneuver} className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-white/90">{step.instruction}</span>
                    <span className="text-[11px] text-white/35">
                      {formatDistance(step.distanceMeters)}
                    </span>
                  </span>
                </li>
              ))}
            </ol>
          )}

          <div className="p-3 pt-1">
            <button
              type="button"
              onClick={onEnd}
              className="w-full rounded-2xl bg-white/8 py-3 text-sm font-semibold tracking-wide text-white/80 ring-1 ring-white/10 hover:bg-rose-500/90 hover:text-white hover:ring-rose-400/40"
            >
              End journey
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-2 text-center">
      <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">
        {label}
      </div>
      <div className="mt-1 text-xl font-extrabold tracking-tight">{value}</div>
    </div>
  );
}
