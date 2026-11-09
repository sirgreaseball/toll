"use client";

import Link from "next/link";
import { useState } from "react";

const PRICES = [100, 300, 500, 1000];

export default function Create({ charities }: { charities: string[] }) {
  const [f, setF] = useState({ handle: "", name: "", headline: "", wants: "", avoids: "", price_cents: 300, charity: charities[0] });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [made, setMade] = useState<{ handle: string; key: string } | null>(null);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    // Handles are typed the way they will be stored: lowercase, letters, numbers and underscores only.
    const v = k === "handle" ? e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 24) : e.target.value;
    setF({ ...f, [k]: k === "price_cents" ? Number(v) : v });
    setError("");
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const res = await fetch("/api/profiles", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f) });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) return setError(data.error);
    try {
      localStorage.setItem("toll-inbox", JSON.stringify(data));
    } catch {}
    setMade(data);
  }

  if (made) {
    const origin = location.origin;
    const page = `${origin}/${made.handle}`;
    const inbox = `${origin}/inbox?handle=${made.handle}&key=${made.key}`;
    return (
      <section className="bezel self-start" aria-live="polite">
        <div className="core p-5 sm:p-8">
          <p className="label text-go!">Your Toll is live</p>
          <h2 className="mt-3 text-[clamp(26px,3vw,36px)] font-extrabold tracking-[-0.035em]">Share the first link. Keep the second.</h2>
          <Copy label="Your Toll link: put it in your bio" value={page} />
          <Copy label="Your private inbox link: shown once" value={inbox} warn />
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href={`/${made.handle}`} className="btn btn-blue">
              See your page
            </Link>
            <Link href={`/inbox?handle=${made.handle}&key=${made.key}`} className="btn btn-ghost">
              Open inbox
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <form onSubmit={submit} className="bezel self-start">
      <div className="core grid gap-4 p-5 sm:p-8">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-2">
            <span className="label">Handle</span>
            <input className="field" required autoCapitalize="none" autoCorrect="off" placeholder="yourname" maxLength={24} value={f.handle} onChange={set("handle")} />
          </label>
          <label className="grid gap-2">
            <span className="label">Your name</span>
            <input className="field" required autoComplete="name" minLength={2} maxLength={60} value={f.name} onChange={set("name")} />
          </label>
        </div>
        <label className="grid gap-2">
          <span className="label">One line about you</span>
          <input className="field" placeholder="Founder, designer, student…" maxLength={120} value={f.headline} onChange={set("headline")} />
        </label>
        <label className="grid gap-2">
          <span className="label">Happy to hear about</span>
          <textarea className="field min-h-24 leading-relaxed" required minLength={20} maxLength={600} placeholder="Job offers in…, feedback on…, collaborations with…" value={f.wants} onChange={set("wants")} />
        </label>
        <label className="grid gap-2">
          <span className="label">Please skip</span>
          <textarea className="field min-h-20 leading-relaxed" required minLength={10} maxLength={600} placeholder="Agency pitches, crypto, SEO…" value={f.avoids} onChange={set("avoids")} />
        </label>

        <fieldset className="grid gap-2">
          <legend className="label mb-2">Hold per message</legend>
          <div role="radiogroup" className="grid grid-cols-4 gap-2">
            {PRICES.map((c) => (
              <button
                key={c}
                type="button"
                role="radio"
                aria-checked={f.price_cents === c}
                onClick={() => setF({ ...f, price_cents: c })}
                className={`num h-12 rounded-2xl text-[15px] font-bold transition-[background-color,color,box-shadow] duration-150 active:scale-[0.97] ${f.price_cents === c ? "bg-blue text-white shadow-[0_10px_20px_-12px_rgb(0_112_224/0.9)]" : "bg-ink/5 text-ink"}`}
              >
                ${c / 100}
              </button>
            ))}
          </div>
        </fieldset>

        <label className="grid gap-2">
          <span className="label">Spam pays</span>
          <select className="field" value={f.charity} onChange={set("charity")}>
            {charities.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>

        <button className="btn btn-blue mt-2" disabled={busy}>
          {busy ? "Making your Toll…" : "Make my Toll"}
        </button>
        {error && (
          <p className="text-center text-sm text-stop" role="alert">
            {error}
          </p>
        )}
        <p className="label text-center">Sandbox · no real money moves</p>
      </div>
    </form>
  );
}

function Copy({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  const [done, setDone] = useState(false);
  return (
    <div className="mt-6">
      <p className={`label ${warn ? "text-stop!" : ""}`}>{label}</p>
      <div className="mt-2 flex items-center gap-2 rounded-2xl bg-ink/5 p-1.5 pl-4">
        <code className="num min-w-0 flex-1 truncate text-[13px]">{value}</code>
        <button
          type="button"
          onClick={() => navigator.clipboard.writeText(value).then(() => setDone(true))}
          className="btn btn-ghost h-10 shrink-0 bg-white px-4 text-sm"
        >
          {done ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}
