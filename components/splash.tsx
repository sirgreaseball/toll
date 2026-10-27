"use client";

import gsap from "gsap";
import { useEffect, useRef, useState } from "react";
import { STAMP_PATH } from "./mark";

// Shown once per session. The stamp outline is drawn by real work finishing (fonts, the page, the first frames),
// then the coin drops in, the pane slides over it, and the splash lifts away like a pane of glass.
export default function Splash() {
  const [show, setShow] = useState(true);
  const root = useRef<HTMLDivElement>(null);
  const [pct, setPct] = useState(0);

  useEffect(() => {
    const done = () => {
      (window as unknown as { __tollReady?: boolean }).__tollReady = true;
      window.dispatchEvent(new Event("toll:ready"));
    };
    let seen = false;
    try {
      seen = sessionStorage.getItem("toll-splash") === "1";
    } catch {}
    if (seen || matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShow(false);
      done();
      return;
    }

    const el = root.current!;
    const outline = el.querySelector("[data-outline]")!;
    gsap.set(el.querySelectorAll("[data-pop]"), { opacity: 0, scale: 0.9, transformOrigin: "50% 50%" });

    const tasks = [
      document.fonts.ready,
      new Promise<void>((r) => (document.readyState === "complete" ? r() : window.addEventListener("load", () => r(), { once: true }))),
      new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r()))),
    ];
    let finished = 0;
    const draw = gsap.quickTo(outline, "strokeDashoffset", { duration: 0.6, ease: "power3.out" });
    tasks.forEach((t) =>
      t.then(() => {
        finished++;
        setPct(Math.round((finished / tasks.length) * 100));
        draw(1 - finished / tasks.length);
      }),
    );
    // Never trap anyone behind the splash: if a task hangs, leave after 4s anyway.
    const cap = new Promise((r) => setTimeout(r, 4000));

    Promise.race([Promise.all(tasks), cap]).then(() => {
      gsap
        .timeline({
          onComplete: () => {
            try {
              sessionStorage.setItem("toll-splash", "1");
            } catch {}
            setShow(false);
          },
        })
        .to(outline, { strokeDashoffset: 0, duration: 0.4, ease: "power3.out" })
        .to(el.querySelectorAll("[data-pop]"), { opacity: 1, scale: 1, duration: 0.7, ease: "expo.out", stagger: 0.12 }, "-=0.1")
        .add(done, "+=0.15")
        .to(el, { clipPath: "inset(0 0 100% 0)", duration: 1.0, ease: "expo.inOut" }, "<");
    });
  }, []);

  if (!show) return null;
  return (
    <div ref={root} className="splash" style={{ clipPath: "inset(0 0 0% 0)" }} aria-label="Loading Toll" role="status">
      <div className="flex flex-col items-center gap-7">
        <svg viewBox="0 0 48 48" width="132" height="132" aria-hidden="true">
          <path
            d={STAMP_PATH}
            data-outline
            pathLength={1}
            fill="none"
            stroke="var(--ink)"
            strokeWidth="0.5"
            strokeDasharray="1"
            strokeDashoffset="1"
          />
          <circle data-pop cx="24" cy="21" r="7.5" fill="var(--brass)" />
          <g data-pop>
            <rect x="9" y="24" width="30" height="15" fill="var(--ink)" opacity="0.22" />
            <path d="M9 24 H39" stroke="var(--ink)" strokeWidth="0.8" />
          </g>
        </svg>
        <p className="label num">Preparing · {pct}%</p>
      </div>
    </div>
  );
}
