interface ManeuverIconProps {
  maneuver: string;
  className?: string;
}

export function ManeuverIcon({ maneuver, className = "h-8 w-8" }: ManeuverIconProps) {
  const m = maneuver.toLowerCase();
  const stroke = "currentColor";

  if (m.includes("uturn")) {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
        <path
          d="M8 19V9a4 4 0 0 1 8 0v6"
          stroke={stroke}
          strokeWidth="2.4"
          strokeLinecap="round"
        />
        <path d="M14 13l2 2 2-2" stroke={stroke} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (m.includes("roundabout") || m.includes("rotary")) {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
        <circle cx="12" cy="12" r="4.5" stroke={stroke} strokeWidth="2.2" />
        <path d="M12 4v3M16.5 7.2l-2 2.2M12 17v3" stroke={stroke} strokeWidth="2.2" strokeLinecap="round" />
      </svg>
    );
  }
  if (m.includes("arrive")) {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
        <circle cx="12" cy="10" r="3" fill={stroke} />
        <path d="M12 13v7" stroke={stroke} strokeWidth="2.4" strokeLinecap="round" />
      </svg>
    );
  }
  if (m.includes("left")) {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
        <path
          d="M18 20V11a3 3 0 0 0-3-3H7"
          stroke={stroke}
          strokeWidth="2.4"
          strokeLinecap="round"
        />
        <path d="M10 6L6 8l4 2" stroke={stroke} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (m.includes("right")) {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
        <path
          d="M6 20V11a3 3 0 0 1 3-3h8"
          stroke={stroke}
          strokeWidth="2.4"
          strokeLinecap="round"
        />
        <path d="M14 6l4 2-4 2" stroke={stroke} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path d="M12 20V6" stroke={stroke} strokeWidth="2.4" strokeLinecap="round" />
      <path d="M8 10l4-4 4 4" stroke={stroke} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
