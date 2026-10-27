"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Message } from "@/lib/db";
import { usd } from "@/lib/usd";

const LANES = [
  { title: "Your call", hint: "Still on hold. Reply or release to refund them, or charge it.", has: (m: Message) => m.verdict === "borderline" || !m.verdict },
  { title: "Worth your time", hint: "The hold was released. They paid nothing.", has: (m: Message) => m.verdict === "worth_it" },
  { title: "Spam", hint: "Flagged by the AI. Confirm the charge or let it go.", has: (m: Message) => m.verdict === "spam" },
];

// Switching lanes is a frequent action, so the list swaps instantly; only the indicator glides.
export default function Lanes({ msgs, inboxKey }: { msgs: Message[]; inboxKey: string }) {
  const counts = LANES.map((l) => msgs.filter(l.has).length);
  const [lane, setLane] = useState(() => Math.max(0, counts.findIndex((c) => c > 0)));
  const items = msgs.filter(LANES[lane].has);

  return (
    <section className="mt-14">
      <div role="tablist" aria-label="Inbox lanes" className="relative grid max-w-xl grid-cols-3 rounded-full bg-white/[0.04] p-1 shadow-[inset_0_0_0_1px_var(--hair)]">
        <span
          aria-hidden="true"
          className="absolute bottom-1 left-1 top-1 w-[calc((100%-0.5rem)/3)] rounded-full bg-white/[0.09] transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
          style={{ transform: `translateX(${lane * 100}%)` }}
        />
        {LANES.map((l, i) => (
          <button
            key={l.title}
            role="tab"
            aria-selected={lane === i}
            onClick={() => setLane(i)}
            className={`relative z-10 h-10 rounded-full px-3 text-sm font-semibold transition-colors duration-150 ${lane === i ? "text-ink" : "text-muted"}`}
          >
            {l.title} <span className="num text-xs text-muted">{counts[i]}</span>
          </button>
        ))}
      </div>
      <p className="label mt-5">{LANES[lane].hint}</p>

      <ul className="mt-6" role="tabpanel">
        {items.map((m) => (
          <Row key={m.id} m={m} inboxKey={inboxKey} />
        ))}
        {items.length === 0 && <li className="border-t border-hair py-10 text-muted">Nothing here. Quiet is good.</li>}
      </ul>
    </section>
  );
}

function Row({ m, inboxKey }: { m: Message; inboxKey: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function act(action: "release" | "charge" | "reply") {
    setBusy(true);
    setError("");
    const res = await fetch(`/api/messages/${m.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: inboxKey, action, reply: action === "reply" ? reply : undefined }),
    });
    setBusy(false);
    if (!res.ok) return setError((await res.json()).error);
    setReply("");
    router.refresh();
  }

  const status = { held: "on hold", released: "released", charged: "charged", pending: "pending", failed: "failed" }[m.status];
  return (
    <li className="border-t border-hair">
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="grid w-full grid-cols-[1fr_auto] items-center gap-6 py-6 text-left transition-colors duration-150 hover:bg-white/[0.015]"
      >
        <span className="min-w-0">
          <span className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="font-semibold">{m.sender_name}</span>
            {m.payer?.name && (
              <span className={`label ${m.payer.verified ? "text-mint" : ""}`}>
                {m.payer.verified ? "✓ PayPal" : "PayPal"} · {m.payer.name}
                {m.payer.country && ` · ${m.payer.country}`}
              </span>
            )}
            {m.trusted && <span className="label text-mint">Trusted sender</span>}
          </span>
          <span className="mt-1 block truncate text-muted">{m.subject}</span>
        </span>
        <span className="text-right">
          <span className="num block text-[28px] leading-none">{m.score !== undefined ? String(m.score).padStart(3, "0") : "—"}</span>
          <span className="label mt-2 block">
            {usd(m.amount_cents)} {status}
          </span>
        </span>
      </button>

      <div className={`grid transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
        <div className="overflow-hidden">
          <div className="grid gap-8 pb-8 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
            <div>
              {m.summary && <p className="text-lg leading-relaxed">{m.summary}</p>}
              {!!m.blast_copies && (
                <p className="mt-3 text-postmark">
                  Also sent to {m.blast_copies} other {m.blast_copies === 1 ? "person" : "people"} this week, same pitch or reworded.
                </p>
              )}
              {m.flags && m.flags.length > 0 && <p className="label mt-4">{m.flags.map((f) => f.replaceAll("_", " ")).join(" · ")}</p>}
              <p className="mt-6 whitespace-pre-wrap leading-relaxed text-muted">{m.body}</p>
            </div>
            <div>
              {m.reasons && m.reasons.length > 0 && (
                <>
                  <p className="label">Why</p>
                  <ul className="mt-3 space-y-2 text-muted">
                    {m.reasons.map((r) => (
                      <li key={r} className="leading-relaxed">
                        {r}
                      </li>
                    ))}
                  </ul>
                </>
              )}
              {m.reply ? (
                <p className="glass mt-6 p-4 leading-relaxed">You replied: {m.reply}</p>
              ) : (
                <div className="mt-6">
                  <textarea
                    className="field min-h-24 leading-relaxed"
                    placeholder="Reply (this releases their hold)"
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                  />
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button disabled={busy || !reply.trim()} onClick={() => act("reply")} className="btn btn-brass h-10 px-5">
                      Reply
                    </button>
                    {m.status === "held" && (
                      <>
                        <button disabled={busy} onClick={() => act("release")} className="btn btn-ghost h-10 px-5">
                          Release
                        </button>
                        <button disabled={busy} onClick={() => act("charge")} className="btn btn-danger h-10 px-5">
                          Charge {usd(m.amount_cents)}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}
              {error && (
                <p className="mt-3 text-sm text-postmark" role="alert">
                  {error}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </li>
  );
}
