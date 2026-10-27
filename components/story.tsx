"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import Lenis from "lenis";
import Link from "next/link";
import { useRef } from "react";
import Splash from "./splash";
import Vault from "./vault";

gsap.registerPlugin(ScrollTrigger, SplitText, useGSAP);

// Real values from Dhruv's page and two sandbox runs on Oct 27: a $3 hold, an internship offer scored 95,
// an outsourcing blast scored 15, and GiveDirectly as the charity.
const PRICE = "$3";
const CHARITY = "GiveDirectly";
const LETTERS = [
  { from: "Maya Chen", subject: "Design-engineering internship" },
  { from: "Rahul Mehta", subject: "Build your fintech products faster" },
];

const BEATS = [
  {
    label: "01 · Hold",
    title: "Writing to you costs a stamp.",
    body: "A stranger writes, and PayPal places a $3 hold on their account. Nothing is charged yet.",
    note: "PayPal Orders v2 · intent AUTHORIZE",
  },
  {
    label: "02 · Read",
    title: "An AI reads it the way you would.",
    body: "It scores the message against what you said you want to hear about, not a generic spam list.",
    note: "Gemini · structured verdict",
  },
  {
    label: "03 · Worth it",
    title: "Worth your time? The stamp comes back.",
    body: "Score 70 or more and the hold is released on the spot. Maya's offer scored 95. She paid nothing.",
    note: "Payments v2 · void",
  },
  {
    label: "04 · Spam",
    title: "Spam pays for itself.",
    body: "Rahul sent the same pitch to two people. It scored 15. Confirm it, and the $3 goes to GiveDirectly.",
    note: "Payments v2 · capture",
  },
];

// The readout always tells the truth about the frame on screen, in both scroll directions.
const STATES: [number, string, string][] = [
  [0, "Ready", PRICE + ".00"],
  [1.0, "Held", PRICE + ".00"],
  [3.4, "Reading", PRICE + ".00"],
  [4.3, "Scored", PRICE + ".00"],
  [5.9, "Released", "Void"],
  [7.7, "Held", PRICE + ".00"],
  [8.6, "Reading", PRICE + ".00"],
  [9.1, "Spam", PRICE + ".00"],
  [9.9, "Captured", "To charity"],
];

export default function Story() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const q = gsap.utils.selector(root);
      const lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 0.9 });
      lenis.on("scroll", ScrollTrigger.update);
      const raf = (t: number) => lenis.raf(t * 1000);
      gsap.ticker.add(raf);
      gsap.ticker.lagSmoothing(0);

      const [coin] = q("[data-part=coin]");
      const [face] = q("[data-part=coin-face]");
      const [letterA, letterB] = q("[data-part=letter]");
      const [scanA, scanB] = q("[data-part=scan]");
      const marks = q("[data-part=postmark] path, [data-part=postmark] circle");
      const beats = q("[data-beat]");
      const statusEl = q("[data-k=Status]")[0];
      const holdEl = q("[data-k=Hold]")[0];
      const scoreEl = q("[data-k=Score]")[0];
      const score = { a: 0, b: 0 };

      gsap.set([letterA, letterB], { x: 0, xPercent: -70, opacity: 0 });
      gsap.set(beats, { autoAlpha: 0, y: 28 });
      gsap.set(marks, { strokeDashoffset: 1 });

      // Hero entry after the splash: the one moment allowed to play on its own clock.
      const split = SplitText.create(q("[data-hero-title]"), { type: "lines", mask: "lines" });
      const intro = gsap
        .timeline({ paused: true })
        .from(split.lines, { yPercent: 105, duration: 1.15, ease: "expo.out", stagger: 0.09 })
        .from(q("[data-hero-fade]"), { opacity: 0, y: 14, duration: 1, ease: "expo.out", stagger: 0.08 }, 0.25)
        .from(q("[data-vault-wrap]"), { opacity: 0, scale: 0.96, duration: 1.4, ease: "expo.out" }, 0.1);
      const play = () => intro.play();
      if ((window as unknown as { __tollReady?: boolean }).__tollReady) play();
      else window.addEventListener("toll:ready", play, { once: true });

      const scanDist = () => (letterA as HTMLElement).offsetHeight - 3;
      const tl = gsap.timeline({
        defaults: { ease: "power2.inOut" },
        scrollTrigger: { trigger: q("[data-track]")[0], start: "top top", end: "bottom bottom", scrub: 0.6, invalidateOnRefresh: true },
        onUpdate() {
          const t = tl.time();
          const [, status, hold] = STATES.findLast(([at]) => t >= at)!;
          statusEl.textContent = status;
          holdEl.textContent = hold;
          scoreEl.textContent = t < 3.4 || (t >= 7.7 && t < 8.6) ? "—" : String(Math.round(t < 7.7 ? score.a : score.b)).padStart(3, "0");
        },
      });

      const g = () => parseFloat(getComputedStyle(q(".gutter")[0]).paddingLeft);
      tl.fromTo(
        q("[data-frame]"),
        { clipPath: () => `inset(76px ${g()}px ${g()}px ${g()}px round 28px)` },
        { clipPath: "inset(0px 0px 0px 0px round 0px)", duration: 0.8, ease: "power2.out" },
        0,
      )
        .to(q("[data-hero]"), { y: -60, opacity: 0, duration: 0.8 }, 0.3)
        .to(coin, { yPercent: 62, duration: 0.8 }, 0.8)
        .to(beats[0], { autoAlpha: 1, y: 0, duration: 0.6, ease: "power3.out" }, 0.9)
        // 02 · Read
        .to(beats[0], { autoAlpha: 0, y: -28, duration: 0.4 }, 2.6)
        .to(letterA, { xPercent: 0, opacity: 1, duration: 0.7, ease: "power3.out" }, 2.7)
        .to(beats[1], { autoAlpha: 1, y: 0, duration: 0.6, ease: "power3.out" }, 3.1)
        .fromTo(scanA, { y: 0, opacity: 1 }, { y: scanDist, duration: 0.8, ease: "none" }, 3.4)
        .to(scanA, { opacity: 0, duration: 0.1 }, 4.2)
        .to(score, { a: 95, duration: 0.7, ease: "power2.out" }, 3.6)
        // 03 · Worth it
        .to(beats[1], { autoAlpha: 0, y: -28, duration: 0.4 }, 5.3)
        .to(letterA, { xPercent: 70, opacity: 0, duration: 0.7, ease: "power2.in" }, 5.3)
        .to(coin, { yPercent: -14, duration: 0.9, ease: "power3.out" }, 5.6)
        .to(q("[data-part=glow-brass]"), { opacity: 0, duration: 0.6 }, 5.6)
        .to(q("[data-part=glow-mint]"), { opacity: 1, duration: 0.6 }, 5.7)
        .to(beats[2], { autoAlpha: 1, y: 0, duration: 0.6, ease: "power3.out" }, 5.8)
        // 04 · Spam
        .to(beats[2], { autoAlpha: 0, y: -28, duration: 0.4 }, 7.5)
        .to(coin, { yPercent: 62, duration: 0.8 }, 7.5)
        .to(q("[data-part=glow-mint]"), { opacity: 0, duration: 0.5 }, 7.5)
        .to(q("[data-part=glow-brass]"), { opacity: 1, duration: 0.5 }, 7.6)
        .to(letterB, { xPercent: 0, opacity: 1, duration: 0.7, ease: "power3.out" }, 7.8)
        .to(beats[3], { autoAlpha: 1, y: 0, duration: 0.6, ease: "power3.out" }, 8.0)
        .fromTo(scanB, { y: 0, opacity: 1 }, { y: scanDist, duration: 0.6, ease: "none" }, 8.6)
        .to(scanB, { opacity: 0, duration: 0.1 }, 9.1)
        .to(score, { b: 15, duration: 0.5, ease: "power2.out" }, 8.7)
        .to(letterB, { xPercent: 70, opacity: 0, duration: 0.6, ease: "power2.in" }, 9.1)
        .set(q("[data-part=postmark]"), { opacity: 1 }, 9.2)
        .to(marks, { strokeDashoffset: 0, duration: 0.6, stagger: 0.05, ease: "power2.out" }, 9.2)
        .to(q("[data-part=glow-brass]"), { opacity: 0, duration: 0.5 }, 9.2)
        .to(q("[data-part=glow-red]"), { opacity: 1, duration: 0.5 }, 9.2)
        .to(coin, { yPercent: 190, opacity: 0, duration: 0.7, ease: "power2.in" }, 9.8)
        .to(q("[data-part=slot-label]"), { color: "#e46a50", duration: 0.4 }, 10.1)
        .to({}, { duration: 1 }, 10.5);

      // The coin leans toward the pointer, on a spring, only where there is a fine pointer.
      if (matchMedia("(hover: hover) and (pointer: fine)").matches) {
        const rx = gsap.quickTo(face, "rotationX", { duration: 0.9, ease: "power3.out" });
        const ry = gsap.quickTo(face, "rotationY", { duration: 0.9, ease: "power3.out" });
        const tilt = (e: PointerEvent) => {
          const r = (face as HTMLElement).getBoundingClientRect();
          rx(gsap.utils.clamp(-14, 14, -((e.clientY - (r.top + r.height / 2)) / innerHeight) * 28));
          ry(gsap.utils.clamp(-14, 14, ((e.clientX - (r.left + r.width / 2)) / innerWidth) * 28));
        };
        window.addEventListener("pointermove", tilt, { passive: true });
        return () => {
          window.removeEventListener("pointermove", tilt);
          window.removeEventListener("toll:ready", play);
          gsap.ticker.remove(raf);
          lenis.destroy();
          split.revert();
        };
      }
      return () => {
        window.removeEventListener("toll:ready", play);
        gsap.ticker.remove(raf);
        lenis.destroy();
        split.revert();
      };
    },
    { scope: root },
  );

  const readout: [string, string][] = [
    ["Hold", PRICE + ".00"],
    ["Status", "Ready"],
    ["Score", "—"],
  ];

  return (
    <>
    <section ref={root} id="how" className="motion-only" aria-label="How Toll works">
      <Splash />
      <div data-track style={{ height: "640vh" }}>
        <div className="sticky top-0 h-svh overflow-hidden">
          <div
            data-frame
            className="absolute inset-0 bg-raised"
            style={{ clipPath: "inset(76px var(--gutter) var(--gutter) var(--gutter) round 28px)" }}
          />
          <div className="gutter relative grid h-full grid-rows-[auto_1fr] items-start gap-6 pb-6 pt-20 md:items-center md:grid-cols-[1fr_minmax(0,32em)] md:grid-rows-1 md:pt-16">
            <div className="relative order-2 min-h-[22rem] md:order-1 md:min-h-[24rem] md:pl-[3vw]">
              <div data-hero className="absolute inset-0 flex flex-col justify-start md:justify-center">
                <p className="label" data-hero-fade>
                  Postage for your attention
                </p>
                <h1 data-hero-title className="display mt-5 max-w-[15ch] text-[clamp(40px,5.4vw,90px)]">
                  Strangers pay to reach you. The good ones pay nothing.
                </h1>
                <p data-hero-fade className="mt-6 max-w-[40ch] text-[17px] leading-relaxed text-muted md:text-lg">
                  A small PayPal hold on every message from a stranger. An AI reads it against what you want to hear about.
                  Worth your time? The hold is released.
                </p>
                <div data-hero-fade className="mt-8 flex flex-wrap items-center gap-3">
                  <span data-magnetic>
                    <Link href="/dhruv" className="btn btn-brass">
                      Write to Dhruv
                    </Link>
                  </span>
                  <span className="label">Sandbox · no real money moves</span>
                </div>
              </div>
              {BEATS.map((b, i) => (
                <div key={b.label} data-beat={i} className="invisible absolute inset-0 flex flex-col justify-start md:justify-center">
                  <p className="label">{b.label}</p>
                  <h2 className="display mt-5 max-w-[13ch] text-[clamp(36px,4.8vw,76px)]">{b.title}</h2>
                  <p className="mt-6 max-w-[38ch] text-[17px] leading-relaxed text-muted md:text-lg">{b.body}</p>
                  <p className="label mt-8 text-brass/80">{b.note}</p>
                </div>
              ))}
            </div>
            <div data-vault-wrap className="order-1 grid place-items-center md:order-2">
              <Vault state="idle" price={PRICE} charity={CHARITY} letters={LETTERS} readout={readout} story />
            </div>
          </div>
        </div>
      </div>
    </section>
    <StillStory />
    </>
  );
}

// Reduced motion: the same story as still frames, nothing moves.
function StillStory() {
  const frames: { state: "idle" | "held" | "reading" | "released" | "spam"; i: number }[] = [
    { state: "held", i: 0 },
    { state: "reading", i: 1 },
    { state: "released", i: 2 },
    { state: "spam", i: 3 },
  ];
  return (
    <section className="still-only gutter pt-28" aria-label="How Toll works">
      <p className="label">Postage for your attention</p>
      <h1 className="display mt-5 max-w-[12ch] text-[clamp(42px,6.4vw,104px)]">Strangers pay to reach you. The good ones pay nothing.</h1>
      <div className="mt-8">
        <Link href="/dhruv" className="btn btn-brass">
          Write to Dhruv
        </Link>
      </div>
      {frames.map(({ state, i }) => (
        <div key={i} className="mt-24 grid items-center gap-10 md:grid-cols-2">
          <div>
            <p className="label">{BEATS[i].label}</p>
            <h2 className="display mt-5 text-[clamp(32px,4vw,64px)]">{BEATS[i].title}</h2>
            <p className="mt-5 max-w-[40ch] text-muted">{BEATS[i].body}</p>
          </div>
          <div className="grid place-items-center">
            <Vault state={state} size="sm" letters={state === "reading" ? [LETTERS[0]] : []} />
          </div>
        </div>
      ))}
    </section>
  );
}
