"use client";

import gsap from "gsap";
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

// Bottom sheet for phones. It tracks the finger 1:1, resists when dragged upward, and on release projects the
// flick (velocity) to decide whether to close; otherwise it springs back from where the finger left it.
export default function Sheet({ open, onClose, children, label }: { open: boolean; onClose: () => void; children: React.ReactNode; label: string }) {
  const panel = useRef<HTMLDivElement>(null);
  const scrim = useRef<HTMLDivElement>(null);
  const drag = useRef<{ y0: number; t0: number; pid: number } | null>(null);

  useEffect(() => {
    if (!open) return;
    const p = panel.current!;
    gsap.fromTo(p, { yPercent: 100 }, { yPercent: 0, y: 0, duration: 0.55, ease: "expo.out" });
    gsap.fromTo(scrim.current, { opacity: 0 }, { opacity: 1, duration: 0.35, ease: "power2.out" });
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = "";
    };
  }, [open]);

  const close = () => {
    gsap.to(scrim.current, { opacity: 0, duration: 0.25 });
    gsap.to(panel.current, { yPercent: 100, y: 0, duration: 0.35, ease: "power3.in", onComplete: onClose });
  };

  const down = (e: React.PointerEvent) => {
    if (drag.current) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { y0: e.clientY, t0: performance.now(), pid: e.pointerId };
  };
  const move = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || e.pointerId !== d.pid) return;
    const dy = e.clientY - d.y0;
    // Upward drags rubber-band; downward drags follow the finger exactly.
    gsap.set(panel.current, { y: dy < 0 ? -Math.sqrt(-dy) * 3 : dy, yPercent: 0 });
  };
  const up = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || e.pointerId !== d.pid) return;
    drag.current = null;
    const dy = e.clientY - d.y0;
    const v = dy / Math.max(1, performance.now() - d.t0);
    if (dy > 120 || v > 0.5) close();
    else gsap.to(panel.current, { y: 0, duration: 0.5, ease: "expo.out" });
  };

  if (!open) return null;
  // Portalled to <body>: an ancestor with a transform animation would otherwise become the containing block of `fixed`.
  return createPortal(
    <>
      <div ref={scrim} className="scrim" onClick={close} />
      <div ref={panel} className="sheet" role="dialog" aria-modal="true" aria-label={label}>
        <div className="sheet-grab" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
          <i />
        </div>
        <div className="sheet-body">{children}</div>
      </div>
    </>,
    document.body,
  );
}
