"use client";

import { useState } from "react";
import Sheet from "./sheet";

// The hold rules: a numbered list on desktop, a bottom sheet on phones (a tap away, never in the way).
export default function Rules({ price, rules }: { price: string; rules: string[] }) {
  const [open, setOpen] = useState(false);
  const list = (
    <ol className="space-y-3">
      {rules.map((r, i) => (
        <li key={r} className="grid grid-cols-[2.5rem_1fr] text-muted">
          <span className="num text-[13px] text-blue">0{i + 1}</span>
          <span className="max-w-[52ch] leading-relaxed">{r}</span>
        </li>
      ))}
    </ol>
  );
  return (
    <>
      <div className="mt-10 hidden border-t border-hair pt-6 md:block">
        <p className="label mb-5">How the {price} hold works</p>
        {list}
      </div>
      <button onClick={() => setOpen(true)} className="card mt-4 flex w-full items-center justify-between px-5 py-4 text-left font-bold md:hidden">
        How the {price} hold works
        <span className="text-blue" aria-hidden="true">
          ›
        </span>
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} label="How the hold works">
        <h2 className="text-[22px] font-extrabold tracking-[-0.03em]">How the {price} hold works</h2>
        <div className="mt-5">{list}</div>
      </Sheet>
    </>
  );
}
