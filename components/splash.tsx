"use client";

import gsap from "gsap";
import { useEffect, useRef, useState } from "react";

// Shown once per session. The tile outline is drawn by real work finishing (fonts, the page, the first frames),
// then the tile fills, the T lands and the coin drops in, and the splash lifts away.
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
    const pops = el.querySelectorAll("[data-pop]");
    gsap.set(pops, { opacity: 0, scale: 0.92, transformOrigin: "50% 50%" });
    gsap.set(el.querySelector("[data-coin]"), { y: -14 });

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
        .to(el.querySelector("[data-tile]"), { opacity: 1, scale: 1, duration: 0.6, ease: "expo.out" }, "-=0.05")
        .to(el.querySelectorAll("[data-t]"), { opacity: 1, scale: 1, duration: 0.6, ease: "expo.out", stagger: 0.1 }, "-=0.35")
        .to(el.querySelector("[data-coin]"), { opacity: 1, scale: 1, y: 0, duration: 0.7, ease: "expo.out" }, "-=0.3")
        .add(done, "+=0.2")
        .to(el, { clipPath: "inset(0 0 100% 0)", duration: 1.0, ease: "expo.inOut" }, "<");
    });
  }, []);

  if (!show) return null;
  return (
    <div ref={root} className="splash" style={{ clipPath: "inset(0 0 0% 0)" }} aria-label="Loading Toll" role="status">
      <div className="flex flex-col items-center gap-7">
        <svg viewBox="0 0 48 48" width="132" height="132" aria-hidden="true">
          <defs>
            <linearGradient id="splash-g" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#2f9bff" />
              <stop offset=".55" stopColor="#0070e0" />
              <stop offset="1" stopColor="#003087" />
            </linearGradient>
          </defs>
          <rect data-tile x="2" y="2" width="44" height="44" rx="13" fill="url(#splash-g)" opacity="0" />
          <rect data-outline x="2" y="2" width="44" height="44" rx="13" pathLength={1} fill="none" stroke="#fff" strokeWidth="0.6" strokeDasharray="1" strokeDashoffset="1" />
          <rect data-t data-pop x="11" y="12" width="26" height="7.5" rx="3.75" fill="#fff" />
          <rect data-t data-pop x="20.25" y="12" width="7.5" height="15" rx="3.75" fill="#fff" />
          <circle data-coin data-pop cx="24" cy="34.5" r="5.5" fill="#a5dcff" />
        </svg>
        <p className="label num" style={{ color: "rgb(190 208 245 / 0.8)" }}>
          Preparing · {pct}%
        </p>
      </div>
    </div>
  );
}
