import type { Place, TravelProfile } from "../types";

interface ModeSelectorProps {
  destination: Place;
  onSelect: (profile: TravelProfile) => void;
  onCancel: () => void;
}

const MODES: { profile: TravelProfile; label: string; icon: string }[] = [
  { profile: "driving", label: "Drive", icon: "🚗" },
  { profile: "walking", label: "Walk", icon: "🚶" },
  { profile: "cycling", label: "Cycle", icon: "🚴" },
];

export function ModeSelector({
  destination,
  onSelect,
  onCancel,
}: ModeSelectorProps) {
  return (
    <div className="absolute inset-0 z-30 flex items-end justify-center bg-black/30 p-4 md:items-center">
      <div className="voya-pop-in w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl">
        <div className="mb-1 text-xs font-medium uppercase tracking-wide text-voya-600">
          Start journey to
        </div>
        <h2 className="mb-4 text-lg font-bold text-gray-900">
          {destination.name}
        </h2>

        <div className="grid grid-cols-3 gap-3">
          {MODES.map((mode) => (
            <button
              key={mode.profile}
              type="button"
              onClick={() => onSelect(mode.profile)}
              className="flex flex-col items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 py-4 transition hover:border-voya-500 hover:bg-voya-50 active:scale-95"
            >
              <span className="text-2xl">{mode.icon}</span>
              <span className="text-sm font-semibold text-gray-800">
                {mode.label}
              </span>
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={onCancel}
          className="mt-4 w-full rounded-xl py-2.5 text-sm font-medium text-gray-500 hover:bg-gray-100"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
