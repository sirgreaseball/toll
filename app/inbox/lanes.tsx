"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Sheet from "@/components/sheet";
import type { Message } from "@/lib/db";
import { usd } from "@/lib/usd";

const LANES = [
  { title: "Your call", hint: "Still on hold. Reply or release to refund them, or charge it.", has: (m: Message) => m.verdict === "borderline" || !m.verdict },
  { title: "Worth it", hint: "The hold was released. They paid nothing.", has: (m: Message) => m.verdict === "worth_it" },
  { title: "Spam", hint: "Flagged by the AI. Confirm the charge or let it go. Unconfirmed spam is released after 2 days, unless it was a mass blast or tried to trick the AI.", has: (m: Message) => m.verdict === "spam" },
];

// Desktop: a master-detail workspace (list left, the open message right). Phones: a list, with the message in a sheet.
export default function Lanes({ msgs, inboxKey, handle }: { msgs: Message[]; inboxKey: string; handle: string }) {
  const counts = LANES.map((l) => msgs.filter(l.has).length);
  const [lane, setLane] = useState(() => Math.max(0, counts.findIndex((c) => c > 0)));
  const [sel, setSel] = useState<string | null>(null);
  const [phone, setPhone] = useState(false);
  const items = msgs.filter(LANES[lane].has);
  const open = msgs.find((m) => m.id === sel) ?? (phone ? undefined : items[0]);

  useEffect(() => {
    try {
      localStorage.setItem("toll-inbox", JSON.stringify({ handle, key: inboxKey }));
    } catch {}
    const mq = matchMedia("(max-width: 767px)");
    const on = () => setPhone(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, [inboxKey, handle]);

  return (
    <section className="mt-8 md:mt-14">
      <div role="tablist" aria-label="Inbox lanes" className="relative grid max-w-xl grid-cols-3 rounded-full bg-ink/[0.06] p-1">
        <span
          aria-hidden="true"
          className="absolute bottom-1 left-1 top-1 w-[calc((100%-0.5rem)/3)] rounded-full bg-white shadow-[0_6px_16px_-8px_rgb(0_48_135/0.5)] transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
          style={{ transform: `translateX(${lane * 100}%)` }}
        />
        {LANES.map((l, i) => (
          <button
            key={l.title}
            role="tab"
            aria-selected={lane === i}
            onClick={() => {
              setLane(i);
              setSel(null);
            }}
            className={`relative z-10 h-11 rounded-full px-3 text-sm font-bold transition-colors duration-150 ${lane === i ? "text-ink" : "text-muted"}`}
          >
            {l.title} <span className="num text-xs text-muted">{counts[i]}</span>
          </button>
        ))}
      </div>
      <p className="label mt-4">{LANES[lane].hint}</p>

      <div className="mt-5 grid items-start gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] md:gap-8">
        <ul role="tabpanel" className="group">
          {items.map((m) => (
            <li key={m.id}>
              <button
                onClick={() => setSel(m.id)}
                aria-current={open?.id === m.id && !phone}
                className="row grid w-full grid-cols-[1fr_auto] items-center gap-4 px-5 py-4 text-left transition-colors duration-150 aria-[current=true]:bg-blue/[0.07]"
              >
                <span className="min-w-0">
                  <span className="flex flex-wrap items-baseline gap-x-2">
                    <span className="font-bold">{m.sender_name}</span>
                    {m.payer?.verified && <span className="label text-go!">✓ PayPal</span>}
                    {m.trusted && <span className="label text-go!">Trusted</span>}
                    {m.agent && <span className="label text-blue!">Agent</span>}
                  </span>
                  <span className="mt-0.5 block truncate text-muted">{m.subject}</span>
                </span>
                <span className="text-right">
                  <span className="num block text-[26px] leading-none">{m.score !== undefined ? String(m.score).padStart(3, "0") : "—"}</span>
                  <span className="label mt-1.5 block">{usd(m.amount_cents)}</span>
                </span>
              </button>
            </li>
          ))}
          {items.length === 0 && <li className="px-5 py-10 text-muted">Nothing here. Quiet is good.</li>}
        </ul>

        {!phone && open && (
          <div className="bezel sticky top-24 max-md:hidden">
            <div className="core p-7">
              <Detail key={open.id} m={open} inboxKey={inboxKey} />
            </div>
          </div>
        )}
      </div>

      <Sheet open={phone && !!sel && !!open} onClose={() => setSel(null)} label="Message">
        {open && <Detail key={open.id} m={open} inboxKey={inboxKey} />}
      </Sheet>
    </section>
  );
}

function Dial({ score, verdict }: { score: number; verdict?: string }) {
  const c = 2 * Math.PI * 44;
  const color = verdict === "worth_it" ? "var(--go)" : verdict === "spam" ? "var(--stop)" : "var(--blue)";
  return (
    <div className="relative grid size-28 shrink-0 place-items-center">
      <svg viewBox="0 0 100 100" className="absolute inset-0 -rotate-90" aria-hidden="true">
        <circle cx="50" cy="50" r="44" fill="none" stroke="rgb(10 27 61 / 0.08)" strokeWidth="7" />
        <circle cx="50" cy="50" r="44" fill="none" stroke={color} strokeWidth="7" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - score / 100)} style={{ transition: "stroke-dashoffset 0.9s cubic-bezier(0.22,1,0.36,1)" }} />
      </svg>
      <span className="num text-[30px] leading-none">{String(score).padStart(3, "0")}</span>
    </div>
  );
}

function Detail({ m, inboxKey }: { m: Message; inboxKey: string }) {
  const router = useRouter();
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

  const status = { held: "on hold", released: "released", charged: "charged", pending: "pending", authorizing: "placing", failed: "failed" }[m.status];
  return (
    <div>
      <div className="flex items-center gap-5">
        {m.score !== undefined && <Dial score={m.score} verdict={m.verdict} />}
        <div className="min-w-0">
          <p className="label">
            {usd(m.amount_cents)} {status}
          </p>
          <h2 className="mt-1 text-[22px] font-extrabold leading-tight tracking-[-0.03em]">{m.sender_name}</h2>
          {m.payer?.name && (
            <p className={`label mt-1 ${m.payer.verified ? "text-go!" : ""}`}>
              {m.payer.verified ? "✓ PayPal" : "PayPal"} · {m.payer.name}
              {m.payer.country && ` · ${m.payer.country}`}
            </p>
          )}
        </div>
      </div>

      {(m.agent || m.settled_by) && (
        <p className="label mt-4 text-blue!">
          {m.agent && `Sent by AI agent ${m.agent.name}${m.agent.operator ? ` for ${m.agent.operator}` : ""}`}
          {m.agent && m.settled_by && " · "}
          {m.settled_by && "Settled automatically before the hold expired"}
        </p>
      )}
      {m.summary && <p className="mt-6 text-lg leading-relaxed">{m.summary}</p>}
      {!!m.blast_copies && (
        <p className="mt-3 text-stop">
          Also sent to {m.blast_copies} other {m.blast_copies === 1 ? "person" : "people"} this week, same pitch or reworded.
        </p>
      )}
      {m.flags && m.flags.length > 0 && <p className="label mt-4">{m.flags.map((f) => f.replaceAll("_", " ")).join(" · ")}</p>}
      {m.reasons && m.reasons.length > 0 && (
        <ul className="mt-5 space-y-2 text-muted">
          {m.reasons.map((r) => (
            <li key={r} className="leading-relaxed">
              {r}
            </li>
          ))}
        </ul>
      )}
      <p className="mt-6 border-t border-hair pt-5 font-bold">{m.subject}</p>
      <p className="mt-2 whitespace-pre-wrap leading-relaxed text-muted">{m.body}</p>

      {m.reply ? (
        <p className="card mt-6 p-4 leading-relaxed">You replied: {m.reply}</p>
      ) : (
        <div className="mt-6">
          <textarea className="field min-h-24 leading-relaxed" placeholder={m.status === "held" ? "Reply (this releases their hold)" : "Reply"} value={reply} onChange={(e) => setReply(e.target.value)} />
          <div className="mt-3 flex flex-wrap gap-2">
            <button disabled={busy || !reply.trim()} onClick={() => act("reply")} className="btn btn-blue h-11 px-5">
              Reply
            </button>
            {m.status === "held" && (
              <>
                <button disabled={busy} onClick={() => act("release")} className="btn btn-ghost h-11 px-5">
                  Release
                </button>
                <button disabled={busy} onClick={() => act("charge")} className="btn btn-danger h-11 px-5">
                  Charge {usd(m.amount_cents)}
                </button>
              </>
            )}
          </div>
        </div>
      )}
      {error && (
        <p className="mt-3 text-sm text-stop" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
