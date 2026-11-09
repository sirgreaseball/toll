"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Arrow } from "./mark";
import { BEATS, CHARITY, LETTERS, PRICE } from "./story";
import Vault, { type VaultState } from "./vault";

// The phone landing is an app home screen, not a scrolling page: one stage card whose vault loops the story,
// a step switcher that follows it (and can be tapped), and a snap carousel of the four beats.
const LOOP: { state: VaultState; step: number; letter: number }[] = [
  { state: "held", step: 0, letter: 0 },
  { state: "reading", step: 1, letter: 0 },
  { state: "released", step: 2, letter: 0 },
  { state: "held", step: 0, letter: 1 },
  { state: "reading", step: 1, letter: 1 },
  { state: "spam", step: 3, letter: 1 },
];
const CHIPS = ["Hold", "Read", "Worth it", "Spam"];

export default function MobileHome() {
  const [i, setI] = useState(0);
  const [auto, setAuto] = useState(true);
  useEffect(() => {
    if (!auto || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => setI((n) => (n + 1) % LOOP.length), 2800);
    return () => clearInterval(t);
  }, [auto]);
  const f = LOOP[i];
  const go = (step: number) => {
    setAuto(false);
    setI([0, 1, 2, 5][step]);
  };

  return (
    <div className="md:hidden page-in">
      <section className="gutter pt-2">
        <div className="stage on-dark relative overflow-hidden rounded-[34px] px-5 pb-6 pt-6">
          <p className="label">Postage for your attention</p>
          <h1 className="display mt-3 text-[34px]">Strangers pay to reach you. The good ones pay nothing.</h1>
          <div className="mt-5 grid place-items-center">
            <Vault
              state={f.state}
              price={PRICE}
              charity={CHARITY}
              letters={[LETTERS[f.letter]]}
            />
          </div>
          <div role="tablist" aria-label="Story step" className="mt-1 grid grid-cols-4 gap-1 rounded-full bg-white/10 p-1">
            {CHIPS.map((c, s) => (
              <button
                key={c}
                role="tab"
                aria-selected={f.step === s}
                onClick={() => go(s)}
                className={`h-9 rounded-full text-[12px] font-bold transition-[background-color,color] duration-200 ${f.step === s ? "bg-white text-[#003087]" : "text-white/70"}`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-4">
          <Link href="/dhruv" className="btn btn-blue w-full justify-between pl-6 pr-5">
            Write to Dhruv
            <Arrow />
          </Link>
        </div>
        <Link href="/new" className="btn btn-ghost mt-3 w-full">
          Make your own Toll
        </Link>
        <p className="label mt-3 text-center">Sandbox · no real money moves</p>
      </section>

      <section className="pt-10">
        <h2 className="gutter text-[22px] font-extrabold tracking-[-0.03em]">How it works</h2>
        <div className="snap-x mt-4 pb-2">
          {BEATS.map((b) => (
            <article key={b.label} className="card p-5">
              <p className="label">{b.label}</p>
              <h3 className="mt-3 text-[21px] font-extrabold leading-tight tracking-[-0.03em]">{b.title}</h3>
              <p className="mt-3 text-[15px] leading-relaxed text-muted">{b.body}</p>
              <p className="label mt-4 text-blue!">{b.note}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
