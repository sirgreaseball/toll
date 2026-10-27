// The vault reduced to a stamp: a perforated stamp frame, a brass coin, and the glass pane line across it.
export const STAMP_PATH =
  "M4 4 L6.3 4 A1.7 1.7 0 0 0 9.7 4 L14.3 4 A1.7 1.7 0 0 0 17.7 4 L22.3 4 A1.7 1.7 0 0 0 25.7 4 L30.3 4 A1.7 1.7 0 0 0 33.7 4 L38.3 4 A1.7 1.7 0 0 0 41.7 4 L44 4 L44 6.3 A1.7 1.7 0 0 0 44 9.7 L44 14.3 A1.7 1.7 0 0 0 44 17.7 L44 22.3 A1.7 1.7 0 0 0 44 25.7 L44 30.3 A1.7 1.7 0 0 0 44 33.7 L44 38.3 A1.7 1.7 0 0 0 44 41.7 L44 44 L41.7 44 A1.7 1.7 0 0 0 38.3 44 L33.7 44 A1.7 1.7 0 0 0 30.3 44 L25.7 44 A1.7 1.7 0 0 0 22.3 44 L17.7 44 A1.7 1.7 0 0 0 14.3 44 L9.7 44 A1.7 1.7 0 0 0 6.3 44 L4 44 L4 41.7 A1.7 1.7 0 0 0 4 38.3 L4 33.7 A1.7 1.7 0 0 0 4 30.3 L4 25.7 A1.7 1.7 0 0 0 4 22.3 L4 17.7 A1.7 1.7 0 0 0 4 14.3 L4 9.7 A1.7 1.7 0 0 0 4 6.3 L4 4 Z M11 9 H37 A2 2 0 0 1 39 11 V37 A2 2 0 0 1 37 39 H11 A2 2 0 0 1 9 37 V11 A2 2 0 0 1 11 9 Z";

export function Mark({ size = 28, className = "" }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} className={className} aria-hidden="true">
      <path d={STAMP_PATH} fill="currentColor" fillRule="evenodd" data-mark="stamp" />
      <circle cx="24" cy="21" r="7.5" fill="var(--brass)" data-mark="coin" />
      <rect x="9" y="24" width="30" height="15" rx="0" fill="currentColor" opacity="0.22" data-mark="pane" />
      <path d="M9 24 H39" stroke="currentColor" strokeWidth="1.2" data-mark="line" />
    </svg>
  );
}

export function Logo({ size = 26 }: { size?: number }) {
  return (
    <span className="inline-flex items-center gap-2.5 text-ink">
      <Mark size={size} />
      <span className="wordmark" style={{ fontSize: size * 0.82 }}>
        toll
      </span>
    </span>
  );
}
