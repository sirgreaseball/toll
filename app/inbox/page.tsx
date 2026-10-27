import { notFound } from "next/navigation";
import { connection } from "next/server";
import Nav from "@/components/nav";
import { asMessage, asProfile, messages, profiles } from "@/lib/db";
import { usd } from "@/lib/usd";
import Lanes from "./lanes";

export const instant = false; // every request reads the database

// ponytail: demo inbox behind one shared key (?key=INBOX_KEY); Firebase Auth replaces it in M2.
export default async function Inbox({ searchParams }: PageProps<"/inbox">) {
  await connection(); // Firestore reads happen per request, never at prerender
  const { key } = await searchParams;
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
    [String(msgs.filter((m) => m.status === "released").length), "released, paid $0"],
    [usd(msgs.filter((m) => m.status === "charged").reduce((s, m) => s + m.amount_cents, 0)), `to ${p.charity}`],
  ];

  return (
    <>
      <Nav cta={false} />
      <main className="gutter mx-auto w-full max-w-[1400px] pb-24 pt-28 md:pt-36">
        <p className="label">Inbox · toll/{p.handle}</p>
        <h1 className="display mt-5 text-[clamp(44px,5.6vw,88px)]">{p.name}</h1>
        <div className="mt-12 grid max-w-3xl grid-cols-3 gap-6">
          {stats.map(([n, l]) => (
            <div key={l}>
              <p className="num text-[clamp(36px,4.4vw,64px)] leading-none tracking-tight">{n}</p>
              <p className="label mt-3">{l}</p>
            </div>
          ))}
        </div>
        <Lanes msgs={msgs} inboxKey={key} />
      </main>
    </>
  );
}
