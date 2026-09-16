import type { Place, TravelProfile } from "../types";

interface ModeSelectorProps {
  destination: Place;
  onSelect: (profile: TravelProfile) => void;
  onCancel: () => void;
}

const MODES: {
  profile: TravelProfile;
  label: string;
  hint: string;
}[] = [
  { profile: "driving", label: "Drive", hint: "Fastest by car" },
  { profile: "walking", label: "Walk", hint: "On foot" },
  { profile: "cycling", label: "Cycle", hint: "By bike" },
];

function Glyph({ profile }: { profile: TravelProfile }) {
  if (profile === "walking") {
    return (
      <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.7">
        <circle cx="12" cy="4.5" r="1.7" fill="currentColor" stroke="none" />
        <path d="M10 8.5l1.5 3 2.5 1.5M11.5 11.5 8 21M13.2 13 16 21M9 15h4.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (profile === "cycling") {
    return (
      <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.7">
        <circle cx="6.5" cy="16.5" r="2.8" />
        <circle cx="17.5" cy="16.5" r="2.8" />
        <path d="M6.5 16.5 11 10h4l2.5 6.5M11 10l-2-4M13 6h3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M4 16V10l3-5h10l3 5v6" strokeLinejoin="round" />
      <circle cx="7.5" cy="16.5" r="1.8" fill="currentColor" stroke="none" />
      <circle cx="16.5" cy="16.5" r="1.8" fill="currentColor" stroke="none" />
      <path d="M4 11h16" />
    </svg>
  );
}

export function ModeSelector({
  destination,
  onSelect,
  onCancel,
}: ModeSelectorProps) {
  return (
    <div className="absolute inset-0 z-30 flex items-end justify-center bg-[#05070c]/55 p-4 backdrop-blur-[2px] md:items-center">
      <div className="voya-pop-in w-full max-w-md overflow-hidden rounded-3xl bg-[#0b1220]/92 text-white shadow-[0_30px_80px_rgba(0,0,0,0.55)] ring-1 ring-white/12 backdrop-blur-xl">
        <div className="bg-gradient-to-r from-sky-500/20 via-indigo-500/10 to-transparent px-5 pb-4 pt-5">
          <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-sky-300">
            Choose how you go
          </div>
          <h2 className="mt-1 text-xl font-bold tracking-tight">{destination.name}</h2>
          {destination.address && (
            <p className="mt-1 truncate text-xs text-white/45">{destination.address}</p>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2 px-4 py-4">
          {MODES.map((mode) => (
            <button
              key={mode.profile}
              type="button"
              onClick={() => onSelect(mode.profile)}
              className="group flex flex-col items-center gap-2 rounded-2xl bg-white/6 py-5 ring-1 ring-white/10 transition hover:bg-sky-400 hover:text-[#0b1220] hover:ring-sky-300 active:scale-95"
            >
              <Glyph profile={mode.profile} />
              <span className="text-sm font-semibold">{mode.label}</span>
              <span className="text-[10px] text-white/40 group-hover:text-[#0b1220]/70">
                {mode.hint}
              </span>
            </button>
          ))}
        </div>

        <div className="px-4 pb-4">
          <button
            type="button"
            onClick={onCancel}
            className="w-full rounded-2xl py-3 text-sm font-medium text-white/50 hover:bg-white/8 hover:text-white"
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}
