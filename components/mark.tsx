// The mark: a "T" whose crossbar is the toll barrier and whose stem ends in the coin that pays it.
import { useId } from "react";

export function Mark({ size = 28, className = "" }: { size?: number; className?: string }) {
  const id = useId(); // one gradient id per mark: a gradient inside a display:none svg would not resolve for the others
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} className={className} aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2f9bff" />
          <stop offset=".55" stopColor="#0070e0" />
          <stop offset="1" stopColor="#003087" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="44" height="44" rx="13" fill={`url(#${id})`} />
      <rect x="11" y="12" width="26" height="7.5" rx="3.75" fill="#fff" />
      <rect x="20.25" y="12" width="7.5" height="15" rx="3.75" fill="#fff" />
      <circle cx="24" cy="34.5" r="5.5" fill="#a5dcff" />
    </svg>
  );
}

export function Logo({ size = 28 }: { size?: number }) {
  return (
    <span className="inline-flex items-center gap-2.5 text-ink">
      <Mark size={size} />
      <span className="font-extrabold tracking-[-0.05em]" style={{ fontSize: size * 0.82 }}>
        toll
      </span>
    </span>
  );
}

export function Arrow() {
  return (
    <span className="disc" aria-hidden="true">
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 11 11 3M4.5 3H11v6.5" />
      </svg>
    </span>
  );
}
