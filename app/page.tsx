import { AggregateField } from "firebase-admin/firestore";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { Arrow, Logo } from "@/components/mark";
import MobileHome from "@/components/mobile-home";
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
    body: "The AI boils every message down to one neutral line and compares it with what the same sender sent other people this week. The same pitch reworded scored 0.887. Genuinely different messages scored 0.684.",
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
    sub: "people who found them worth it",
    title: "Good senders get the benefit of the doubt.",
    body: "Once two different people found a sender worth it, keyed to their PayPal account, any message the AI is unsure about is released at once. It never overrides spam.",
  },
  {
    stat: "$0",
    sub: "charged when the AI fails",
    title: "If the AI fails, nobody is charged.",
    body: "The hold waits for you to decide. Toll never takes money because a model was down.",
  },
];
// Bento placement on desktop: one tall dark feature, four lighter neighbours.
const SPAN = ["md:col-span-7 md:row-span-2", "md:col-span-5", "md:col-span-5", "md:col-span-6", "md:col-span-6"];

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
      [usd(charged.data().cents ?? 0), "charged from spam, for charity"],
    ];
    return (
      <div className="grid gap-8 sm:grid-cols-3 sm:gap-10">
        {stats.map(([n, l]) => (
          <div key={l} data-reveal>
            <p className="num text-[clamp(52px,7vw,112px)] leading-none tracking-tight">{n}</p>
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
    <div className="grid gap-8 sm:grid-cols-3 sm:gap-10" aria-busy="true">
      {[0, 1, 2].map((i) => (
        <div key={i}>
          <p className="num text-[clamp(52px,7vw,112px)] leading-none text-white/20">—</p>
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
        <MobileHome />

        <Reveal id="proof" className="gutter mx-auto w-full max-w-[1400px] pb-10 pt-16 md:pt-40">
          <p className="label" data-reveal>
            Why it holds up
          </p>
          <h2 data-lines className="display mt-4 max-w-[14ch] text-[clamp(32px,5.4vw,88px)]">
            Hard to game. Easy to trust.
          </h2>

          <ol className="mt-8 grid gap-4 md:mt-16 md:grid-cols-12 md:gap-5">
            {PROOF.map((p, i) => (
              <li key={p.title} data-reveal className={SPAN[i]}>
                <div className={`bezel h-full ${i === 0 ? "bezel-dark stage md:min-h-[30rem]" : ""} ${i === 0 ? "on-dark" : ""}`}>
                  <div className="core flex h-full flex-col justify-between gap-10 p-6 md:p-9">
                    <div>
                      <p className={`num leading-none tracking-tight ${i === 0 ? "text-[clamp(64px,9vw,150px)]" : "text-[clamp(44px,4.4vw,72px)]"}`}>{p.stat}</p>
                      <p className="label mt-3">{p.sub}</p>
                    </div>
                    <div className="max-w-[48ch]">
                      <h3 className="text-[clamp(20px,2vw,28px)] font-extrabold tracking-[-0.03em]">{p.title}</h3>
                      <p className="mt-3 text-[15px] leading-relaxed text-muted md:text-base">{p.body}</p>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </Reveal>

        <Reveal className="gutter mx-auto w-full max-w-[1400px] py-16 md:py-28">
          <div className="stage on-dark rounded-[34px] px-6 py-12 md:rounded-[44px] md:px-16 md:py-20">
            <p className="label" data-reveal>
              Live from the sandbox
            </p>
            <h2 data-lines className="display mt-4 max-w-[16ch] text-[clamp(30px,4.4vw,72px)]">
              Every number is real.
            </h2>
            <div className="mt-10 md:mt-14">
              <Suspense fallback={<LedgerFallback />}>
                <Ledger />
              </Suspense>
            </div>
          </div>
        </Reveal>

        <Reveal className="gutter mx-auto w-full max-w-[1400px] py-8 md:py-16">
          <div className="grid items-center gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:gap-16">
            <div>
              <p className="label" data-reveal>
                Agentic commerce
              </p>
              <h2 data-lines className="display mt-4 max-w-[13ch] text-[clamp(32px,5vw,80px)]">
                AI agents can knock too.
              </h2>
              <p className="mt-5 max-w-[44ch] leading-relaxed text-muted" data-reveal>
                Recruiting and sales agents read your Toll through an API, send one message, and a human approves the PayPal hold.
                Every agent message is labelled with the agent and who it works for. No human approval, no message.
              </p>
              <Link href="/agents" className="btn btn-ghost mt-8" data-reveal>
                Read the agent API
                <Arrow />
              </Link>
            </div>
            <pre className="num whitespace-pre-wrap rounded-[28px] bg-stage p-6 text-[12.5px] leading-relaxed text-[#cfe0ff] md:p-8" data-reveal>
              <code>{`POST /api/v1/tolls/dhruv/messages
{ "subject": "Design-engineering internship",
  "agent": { "name": "Scout",
             "operator": "Studio Recruiting" } }

201 { "approve_url": "https://www.sandbox.paypal.com/…",
      "status_url": "/api/v1/messages/…" }`}</code>
            </pre>
          </div>
        </Reveal>

        <Reveal className="gutter mx-auto w-full max-w-[1400px] pb-16 pt-8 md:pb-40 md:pt-24">
          <h2 data-lines className="display max-w-[12ch] text-[clamp(40px,8vw,140px)]">
            Make strangers worth hearing from.
          </h2>
          <div className="mt-8 flex flex-wrap items-center gap-4 md:mt-12" data-reveal>
            <span data-magnetic>
              <Link href="/dhruv" className="btn btn-blue h-14 text-base">
                Write to Dhruv
                <Arrow />
              </Link>
            </span>
            <Link href="/new" className="btn btn-ghost h-14 text-base">
              Make your Toll
            </Link>
          </div>
          <p className="label mt-6" data-reveal>
            Sandbox · no real money moves
          </p>
        </Reveal>
      </main>
      <footer className="gutter flex flex-wrap items-center justify-between gap-4 border-t border-hair py-8 max-md:pb-32">
        <Logo size={24} />
        <p className="label">Built for the PayPal AI Hackathon · 2026</p>
      </footer>
    </>
  );
}
