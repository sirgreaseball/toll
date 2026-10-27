import { notFound } from "next/navigation";
import { connection } from "next/server";
import Nav from "@/components/nav";
import { asProfile, profiles } from "@/lib/db";
import { usd } from "@/lib/usd";
import Compose from "./compose";

export const instant = false; // every request reads the database

export default async function TollPage({ params }: PageProps<"/[handle]">) {
  await connection(); // Firestore reads happen per request, never at prerender
  const { handle } = await params;
  const snap = await profiles().doc(handle.toLowerCase()).get();
  if (!snap.exists) notFound();
  const p = asProfile(snap);
  const price = usd(p.price_cents);
  const first = p.name.split(" ")[0];
  const rules = [
    `PayPal holds ${price}. Nothing is charged when you send.`,
    `If the AI finds your message worth ${first}'s time, or ${first} replies, the hold is released.`,
    `If it's spam, the ${price} goes to ${p.charity}.`,
    `${first} sees your PayPal-verified name and country, so nobody can pose as someone else.`,
    "Send good messages and you become a trusted sender: future holds are released at once.",
  ];

  return (
    <>
      <Nav cta={false} />
      <main className="gutter mx-auto grid w-full max-w-[1400px] gap-14 pb-24 pt-28 md:grid-cols-[minmax(0,1fr)_minmax(0,560px)] md:gap-16 md:pt-36">
        <section>
          <p className="label">toll / {p.handle}</p>
          <h1 className="display mt-5 text-[clamp(48px,6.4vw,104px)]">{p.name}</h1>
          {p.headline && <p className="mt-5 max-w-[34ch] text-lg leading-relaxed text-muted">{p.headline}</p>}

          <dl className="mt-14">
            {[
              ["Wants to hear about", p.wants],
              ["Please skip", p.avoids],
            ].map(([k, v]) => (
              <div key={k} className="grid gap-2 border-t border-hair py-6 sm:grid-cols-[11rem_1fr] sm:gap-8">
                <dt className="label pt-1">{k}</dt>
                <dd className="max-w-[52ch] leading-relaxed">{v}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-10 border-t border-hair pt-6">
            <p className="label">How the {price} hold works</p>
            <ol className="mt-5 space-y-3">
              {rules.map((r, i) => (
                <li key={r} className="grid grid-cols-[2.5rem_1fr] text-muted">
                  <span className="num text-[13px] text-ink/40">0{i + 1}</span>
                  <span className="max-w-[52ch] leading-relaxed">{r}</span>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <Compose handle={p.handle} firstName={first} price={price} charity={p.charity} />
      </main>
    </>
  );
}
