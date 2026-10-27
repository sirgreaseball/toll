import { notFound } from "next/navigation";
import { connection } from "next/server";
import Nav from "@/components/nav";
import { asMessage, asProfile, messages, profiles } from "@/lib/db";
import { usd } from "@/lib/usd";
import KeyGate from "./gate";
import Lanes from "./lanes";

export const instant = false; // every request reads the database

// ponytail: demo inbox behind one shared key (?key=INBOX_KEY); Firebase Auth replaces it in M2.
export default async function Inbox({ searchParams }: PageProps<"/inbox">) {
  await connection(); // Firestore reads happen per request, never at prerender
  const { key } = await searchParams;
  if (key === undefined) return <KeyGate />;
  if (typeof key !== "string" || !process.env.INBOX_KEY || key !== process.env.INBOX_KEY) notFound();

  const snap = await profiles().doc(process.env.DEMO_HANDLE ?? "dhruv").get();
  if (!snap.exists) notFound();
  const p = asProfile(snap);
  // ponytail: filters and sorts in memory to avoid a composite index; fine for one inbox.
  const all = await messages().where("profile_handle", "==", p.handle).get();
  const msgs = all.docs
    .map(asMessage)
    .filter((m) => m.status === "held" || m.status === "released" || m.status === "charged")
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map((m) => ({ ...m, embedding: undefined, payer: m.payer && { ...m.payer, email: undefined } }));

  const stats = [
    [String(msgs.length), msgs.length === 1 ? "message" : "messages"],
    [String(msgs.filter((m) => m.status === "released").length), "released, $0"],
    [usd(msgs.filter((m) => m.status === "charged").reduce((s, m) => s + m.amount_cents, 0)), "to charity"],
  ];

  return (
    <>
      <Nav cta={false} title={`toll / ${p.handle}`} />
      <main className="app-main page-in gutter mx-auto w-full max-w-[1400px] pt-3 md:pb-24 md:pt-40">
        <p className="label max-md:hidden">Inbox · toll/{p.handle}</p>
        <h1 className="display text-[clamp(40px,5.6vw,88px)] md:mt-5">{p.name}</h1>
        <div className="mt-6 grid grid-cols-3 gap-3 md:mt-12 md:max-w-3xl md:gap-6">
          {stats.map(([n, l]) => (
            <div key={l} className="card p-4 md:rounded-none md:bg-transparent md:p-0 md:shadow-none">
              <p className="num text-[clamp(26px,4.4vw,64px)] leading-none tracking-tight">{n}</p>
              <p className="label mt-2 md:mt-3">{l}</p>
            </div>
          ))}
        </div>
        <Lanes msgs={msgs} inboxKey={key} />
      </main>
    </>
  );
}
