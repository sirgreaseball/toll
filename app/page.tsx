import { AggregateField } from "firebase-admin/firestore";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { Logo } from "@/components/mark";
import Nav from "@/components/nav";
import Reveal from "@/components/reveal";
import Story from "@/components/story";
import { messages } from "@/lib/db";
import { usd } from "@/lib/usd";

// Every number here was measured: the similarity scores come from scripts/judge-check.ts --pitch,
// the injection score from the judge test, the rest from the code's own rules.
const PROOF = [
  {
    stat: "0.887",
    sub: "vs 0.684 · cut-off 0.85",
    title: "Blasts get caught, even reworded.",
    body: "The AI boils every message down to one neutral line and compares it with what other people received this week. The same pitch reworded scored 0.887. Genuinely different messages scored 0.684.",
  },
  {
    stat: "PayPal",
    sub: "verified name and country",
    title: "Every sender has a real name.",
    body: "Recipients see the sender's PayPal name and country, straight from PayPal. Nobody can pose as someone else.",
  },
  {
    stat: "000",
    sub: "score for “SYSTEM OVERRIDE”",
    title: "Orders hidden in a message are ignored.",
    body: "A message that tells the AI to score it 100 is flagged as an injection attempt and treated as spam.",
  },
  {
    stat: "2",
    sub: "good messages to earn trust",
    title: "Good senders stop paying.",
    body: "After two messages worth reading and no spam, a sender's holds are released the moment they send.",
  },
  {
    stat: "$0",
    sub: "charged when the AI fails",
    title: "If the AI fails, nobody is charged.",
    body: "The hold waits for you to decide. Toll never takes money because a model was down.",
  },
];

async function Ledger() {
  await connection();
  try {
    const [judged, released, charged] = await Promise.all([
      messages().where("status", "in", ["held", "released", "charged"]).count().get(),
      messages().where("status", "==", "released").count().get(),
      messages().where("status", "==", "charged").aggregate({ cents: AggregateField.sum("amount_cents") }).get(),
    ]);
    const stats = [
      [String(judged.data().count), "messages held and judged"],
      [String(released.data().count), "holds released, sender paid $0"],
      [usd(charged.data().cents ?? 0), "sent to charity from spam"],
    ];
    return (
      <div className="grid gap-10 sm:grid-cols-3">
        {stats.map(([n, l]) => (
          <div key={l} data-reveal>
            <p className="num text-[clamp(56px,7vw,112px)] leading-none tracking-tight">{n}</p>
            <p className="label mt-4">{l}</p>
          </div>
        ))}
      </div>
    );
  } catch {
    return <p className="text-muted">The live ledger is unavailable right now. Try again in a minute.</p>;
  }
}

function LedgerFallback() {
  return (
    <div className="grid gap-10 sm:grid-cols-3" aria-busy="true">
      {[0, 1, 2].map((i) => (
        <div key={i}>
          <p className="num text-[clamp(56px,7vw,112px)] leading-none text-ink/15">—</p>
          <p className="label mt-4">Reading the ledger</p>
        </div>
      ))}
    </div>
  );
}

export default function Home() {
  return (
    <>
      <Nav />
      <main>
        <Story />

        <Reveal className="gutter mx-auto w-full max-w-[1400px] pb-10 pt-32">
          <p className="label" data-reveal>
            Why it holds up
          </p>
          <h2 data-lines className="display mt-5 max-w-[14ch] text-[clamp(40px,5.4vw,88px)]">
            Hard to game. Easy to trust.
          </h2>
          <ol className="mt-16">
            {PROOF.map((p) => (
              <li
                key={p.title}
                data-reveal
                className="grid gap-4 border-t border-hair py-10 md:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] md:gap-12"
              >
                <div>
                  <p className="num text-[clamp(44px,5vw,80px)] leading-none tracking-tight">{p.stat}</p>
                  <p className="label mt-3">{p.sub}</p>
                </div>
                <div className="max-w-[52ch]">
                  <h3 className="text-[clamp(22px,2.2vw,30px)] font-semibold tracking-[-0.03em]">{p.title}</h3>
                  <p className="mt-3 leading-relaxed text-muted">{p.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </Reveal>

        <Reveal className="gutter mx-auto w-full max-w-[1400px] py-24">
          <p className="label" data-reveal>
            Live from the sandbox
          </p>
          <h2 data-lines className="display mt-5 max-w-[16ch] text-[clamp(36px,4.4vw,72px)]">
            Every number is real.
          </h2>
          <div className="mt-14">
            <Suspense fallback={<LedgerFallback />}>
              <Ledger />
            </Suspense>
          </div>
        </Reveal>

        <Reveal className="gutter mx-auto w-full max-w-[1400px] pb-32 pt-24">
          <h2 data-lines className="display max-w-[12ch] text-[clamp(48px,8vw,140px)]">
            Make strangers worth hearing from.
          </h2>
          <div className="mt-12 flex flex-wrap items-center gap-4" data-reveal>
            <span data-magnetic>
              <Link href="/dhruv" className="btn btn-brass h-14 px-7 text-base">
                Write to Dhruv
              </Link>
            </span>
            <span className="label">Sandbox · no real money moves</span>
          </div>
        </Reveal>
      </main>
      <footer className="gutter flex flex-wrap items-center justify-between gap-4 border-t border-hair py-8">
        <Logo size={22} />
        <p className="label">Built for the PayPal AI Hackathon · 2026</p>
      </footer>
    </>
  );
}
