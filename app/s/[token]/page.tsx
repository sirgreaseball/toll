import { notFound } from "next/navigation";
import { connection } from "next/server";
import Nav from "@/components/nav";
import Vault, { type VaultState } from "@/components/vault";
import { asMessage, asProfile, messages, profiles } from "@/lib/db";
import { usd } from "@/lib/usd";

export const instant = false; // every request reads the database

// The sender's private status page: what the AI decided, what happened to the hold, and any reply.
export default async function StatusPage({ params }: PageProps<"/s/[token]">) {
  await connection(); // Firestore reads happen per request, never at prerender
  const { token } = await params;
  const found = await messages().where("status_token", "==", token).limit(1).get();
  if (found.empty) notFound();
  const m = asMessage(found.docs[0]);
  const to = asProfile(await profiles().doc(m.profile_handle).get());
  const first = to.name.split(" ")[0];
  const price = usd(m.amount_cents);

  const state = {
    released: {
      tone: "text-mint",
      title: "Delivered. You paid nothing.",
      text: m.trusted
        ? `You're a trusted sender: your earlier messages were worth it, so the ${price} hold was released at once.`
        : `The ${price} hold was released.`,
    },
    charged: { tone: "text-postmark", title: `Your ${price} went to ${to.charity}.`, text: `${first} confirmed this as spam.` },
    failed: { tone: "text-postmark", title: "Not sent.", text: "PayPal didn't place the hold, so nothing was charged." },
    pending: { tone: "text-muted", title: "Waiting for PayPal.", text: "Approve the hold in PayPal to send the message." },
    held:
      m.verdict === "spam"
        ? {
            tone: "text-postmark",
            title: "Flagged as spam.",
            text: `Your ${price} is on hold. It goes to ${to.charity} unless ${first} releases it.`,
          }
        : {
            tone: "text-ink",
            title: `Delivered. ${first} decides.`,
            text: `Your ${price} is on hold, not charged. If ${first} replies or releases it, you pay nothing.`,
          },
  }[m.status];
  const vault: VaultState =
    m.status === "released" ? "released" : m.status === "charged" ? "charged" : m.status === "held" ? (m.verdict === "spam" ? "spam" : "held") : "idle";

  return (
    <>
      <Nav cta={false} />
      <main className="gutter mx-auto grid w-full max-w-[1400px] items-start gap-14 pb-24 pt-28 md:grid-cols-[minmax(0,1fr)_auto] md:pt-36">
        <section className="max-w-[44rem]">
          <p className="label">Your message to {to.name}</p>
          <h1 className={`display mt-5 text-[clamp(40px,5.6vw,88px)] ${state.tone}`}>{state.title}</h1>
          <p className="mt-5 max-w-[48ch] text-lg leading-relaxed text-muted">{state.text}</p>
          {m.payer?.name && (
            <p className="label mt-6">
              {first} sees you as{" "}
              <span className={m.payer.verified ? "text-mint" : "text-ink"}>
                {m.payer.verified ? "✓ verified by PayPal" : "a PayPal account"} · {m.payer.name}
                {m.payer.country && ` · ${m.payer.country}`}
              </span>
            </p>
          )}

          {m.verdict && (
            <section className="mt-14 border-t border-hair pt-8">
              <div className="flex items-baseline justify-between gap-4">
                <p className="label">What the AI saw</p>
                <p className="num text-[40px] leading-none">
                  {String(m.score ?? 0).padStart(3, "0")}
                  <span className="text-[15px] text-muted"> / 100</span>
                </p>
              </div>
              <p className="mt-5 text-lg leading-relaxed">{m.summary}</p>
              <ul className="mt-5 space-y-2 text-muted">
                {m.reasons?.map((r) => (
                  <li key={r} className="grid grid-cols-[1.5rem_1fr] leading-relaxed">
                    <span aria-hidden="true">·</span>
                    {r}
                  </li>
                ))}
              </ul>
              {m.verdict !== "worth_it" && m.coaching && (
                <p className="mt-6 border-t border-hair pt-5 leading-relaxed">
                  <span className="label mr-2 text-brass">Next time</span>
                  {m.coaching}
                </p>
              )}
            </section>
          )}

          {m.reply && (
            <section className="glass mt-8 p-6">
              <p className="label">{first} replied</p>
              <p className="mt-3 whitespace-pre-wrap leading-relaxed">{m.reply}</p>
            </section>
          )}

          <details className="mt-8 border-t border-hair pt-5 text-muted">
            <summary className="label cursor-pointer">Your message</summary>
            <p className="mt-4 font-semibold text-ink">{m.subject}</p>
            <p className="mt-2 whitespace-pre-wrap leading-relaxed">{m.body}</p>
          </details>
          <p className="label mt-10">Keep this link to check back later.</p>
        </section>

        <div className="hidden md:block">
          <Vault state={vault} size="sm" price={price} charity={to.charity} />
        </div>
      </main>
    </>
  );
}
