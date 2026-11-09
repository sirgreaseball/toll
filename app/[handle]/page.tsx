import { notFound } from "next/navigation";
import { connection } from "next/server";
import Nav from "@/components/nav";
import Rules from "@/components/rules";
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
    `If it's spam and ${first} confirms it, the ${price} goes to ${p.charity}. Unconfirmed holds are released within 3 days, except mass blasts and attempts to trick the AI.`,
    `${first} sees your PayPal-verified name and country, so nobody can pose as someone else.`,
    "Send good messages to two different people and you become a trusted sender: when the AI is on the fence, your hold is released at once.",
  ];

  return (
    <>
      <Nav cta={false} title={`toll / ${p.handle}`} />
      <main className="app-main page-in gutter mx-auto grid w-full max-w-[1400px] gap-8 pt-3 md:grid-cols-[minmax(0,1fr)_minmax(0,560px)] md:gap-16 md:pb-24 md:pt-40">
        <section>
          <p className="label max-md:hidden">toll / {p.handle}</p>
          <h1 className="display text-[clamp(44px,6.4vw,104px)] md:mt-5">{p.name}</h1>
          {p.headline && <p className="mt-4 max-w-[34ch] text-base leading-relaxed text-muted md:mt-5 md:text-lg">{p.headline}</p>}

          <dl className="group mt-7 md:mt-14 md:rounded-none md:bg-transparent md:shadow-none">
            {[
              ["Wants to hear about", p.wants],
              ["Please skip", p.avoids],
            ].map(([k, v]) => (
              <div key={k} className="grid gap-2 px-5 py-4 md:grid-cols-[11rem_1fr] md:gap-8 md:border-t md:border-hair md:px-0 md:py-6">
                <dt className="label pt-1">{k}</dt>
                <dd className="max-w-[52ch] leading-relaxed">{v}</dd>
              </div>
            ))}
          </dl>

          <Rules price={price} rules={rules} />
        </section>

        <Compose handle={p.handle} firstName={first} price={price} charity={p.charity} />
      </main>
    </>
  );
}
