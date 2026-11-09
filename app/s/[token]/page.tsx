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

  // Matches the settle job: only mechanical abuse is charged without the recipient's say-so.
  const mechanical = !!m.flags?.some((f) => f === "mass_blast" || f === "prompt_injection");
  const state = {
    released: {
      tone: "text-go",
      title: "Delivered. You paid nothing.",
      text: m.trusted && m.verdict === "borderline"
        ? `You're a trusted sender: your earlier messages were worth it, so the ${price} hold was released at once.`
        : `The ${price} hold was released.`,
    },
    charged: {
      tone: "text-stop",
      title: `Your ${price} went to ${to.charity}.`,
      text: m.settled_by ? "It was sent as a mass blast or tried to trick the AI, so it was charged automatically." : `${first} confirmed this as spam.`,
    },
    failed: { tone: "text-stop", title: "Not sent.", text: "PayPal didn't place the hold, so nothing was charged." },
    pending: { tone: "text-muted", title: "Waiting for PayPal.", text: "Approve the hold in PayPal to send the message." },
    authorizing: { tone: "text-ink", title: "Placing the hold.", text: "PayPal is placing the hold. This page updates on its own." },
    held: m.judging
      ? { tone: "text-ink", title: "Reading your message.", text: `The ${price} hold is placed. The AI is checking whether it's worth ${first}'s time. This page updates on its own.` }
      : m.verdict === "spam"
        ? {
            tone: "text-stop",
            title: "Flagged as spam.",
            text: mechanical
              ? `Your ${price} is on hold. It looks like a mass blast or an attempt to trick the AI, so it goes to ${to.charity} unless ${first} releases it.`
              : `Your ${price} is on hold. It goes to ${to.charity} only if ${first} confirms it's spam; otherwise it's released within 3 days.`,
          }
        : {
            tone: "text-ink",
            title: `Delivered. ${first} decides.`,
            text: `Your ${price} is on hold, not charged. If ${first} replies or releases it, you pay nothing.`,
          },
  }[m.status];
  const working = m.status === "authorizing" || (m.status === "held" && !!m.judging);
  const vault: VaultState =
    m.status === "released"
      ? "released"
      : m.status === "charged"
        ? "charged"
        : working
          ? "reading"
          : m.status === "held"
            ? m.verdict === "spam"
              ? "spam"
              : "held"
            : "idle";

  return (
    <>
      {working && <meta httpEquiv="refresh" content="4" />}
      <Nav cta={false} title="Status" />
      <main className="app-main page-in gutter mx-auto grid w-full max-w-[1400px] items-start gap-8 pt-3 md:grid-cols-[minmax(0,1fr)_auto] md:gap-14 md:pb-24 md:pt-40">
        <div className="stage on-dark grid place-items-center overflow-hidden rounded-[34px] py-6 md:order-2 md:px-10 md:py-12">
          <Vault state={vault} size="sm" price={price} charity={to.charity} />
        </div>

        <section className="max-w-[44rem] md:order-1">
          <p className="label">Your message to {to.name}</p>
          <h1 className={`display mt-4 text-[clamp(34px,5.6vw,88px)] ${state.tone}`}>{state.title}</h1>
          <p className="mt-4 max-w-[48ch] text-base leading-relaxed text-muted md:text-lg">{state.text}</p>
          {m.payer?.name && (
            <p className="label mt-5">
              {first} sees you as{" "}
              <span className={m.payer.verified ? "text-go" : "text-ink"}>
                {m.payer.verified ? "✓ verified by PayPal" : "a PayPal account"} · {m.payer.name}
                {m.payer.country && ` · ${m.payer.country}`}
              </span>
            </p>
          )}

          {m.verdict && (
            <section className="bezel mt-10">
              <div className="core p-5 md:p-7">
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
                    <span className="label mr-2 text-blue!">Next time</span>
                    {m.coaching}
                  </p>
                )}
              </div>
            </section>
          )}

          {m.reply && (
            <section className="card mt-5 p-5">
              <p className="label">{first} replied</p>
              <p className="mt-3 whitespace-pre-wrap leading-relaxed">{m.reply}</p>
            </section>
          )}

          <details className="card mt-5 px-5 py-4 text-muted">
            <summary className="label cursor-pointer">Your message</summary>
            <p className="mt-4 font-bold text-ink">{m.subject}</p>
            <p className="mt-2 whitespace-pre-wrap leading-relaxed">{m.body}</p>
          </details>
          <p className="label mt-8">Keep this link to check back later.</p>
        </section>
      </main>
    </>
  );
}
