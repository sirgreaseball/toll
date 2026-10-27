"use client";

import gsap from "gsap";
import { useEffect } from "react";

// Cursor behaviour for the whole site, fine pointers only: glass catches a highlight that follows the pointer,
// magnetic buttons lean toward it (3px at most), and tapping glass sends a soft ripple through it.
export default function Pointer() {
  useEffect(() => {
    if (!matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const movers = new WeakMap<Element, { x: gsap.QuickToFunc; y: gsap.QuickToFunc }>();
    const mover = (el: Element, duration: number) => {
      let m = movers.get(el);
      if (!m) {
        m = { x: gsap.quickTo(el, "x", { duration, ease: "power3.out" }), y: gsap.quickTo(el, "y", { duration, ease: "power3.out" }) };
        movers.set(el, m);
      }
      return m;
    };
    let magnet: HTMLElement | null = null;

    const onMove = (e: PointerEvent) => {
      const target = e.target as Element;
      const glass = target.closest?.(".glass");
      if (glass) {
        let spec = glass.querySelector(":scope > .spec");
        if (!spec) {
          spec = document.createElement("span");
          spec.className = "spec";
          glass.prepend(spec);
        }
        const r = glass.getBoundingClientRect();
        const m = mover(spec, 0.5);
        m.x(e.clientX - r.left);
        m.y(e.clientY - r.top);
      }
      if (still) return;
      const next = target.closest?.("[data-magnetic]") as HTMLElement | null;
      if (magnet && magnet !== next) {
        const m = mover(magnet, 0.45);
        m.x(0);
        m.y(0);
      }
      magnet = next;
      if (next) {
        const r = next.getBoundingClientRect();
        const dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
        const dy = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
        const m = mover(next, 0.45);
        m.x(gsap.utils.clamp(-3, 3, dx * 3));
        m.y(gsap.utils.clamp(-3, 3, dy * 3));
      }
    };

    const onDown = (e: PointerEvent) => {
      if (still) return;
      const glass = (e.target as Element).closest?.(".glass");
      if (!glass) return;
      const r = glass.getBoundingClientRect();
      const ripple = document.createElement("span");
      ripple.className = "ripple";
      ripple.style.left = `${e.clientX - r.left}px`;
      ripple.style.top = `${e.clientY - r.top}px`;
      ripple.addEventListener("animationend", () => ripple.remove());
      glass.prepend(ripple);
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
    };
  }, []);
  return null;
}
