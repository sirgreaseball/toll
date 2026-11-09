import { randomBytes } from "node:crypto";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { z } from "zod";
import { asMessage, asProfile, blastHash, messages, profiles, staleClaim, type Message, type Profile } from "./db";
import { BLAST_SIMILARITY, EMBED_MODEL, cosine, embed, judge, markBlast, type Verdict } from "./judge";
import { PayPalError, authorizeOrder, createHoldOrder, releaseHold } from "./paypal";

// The money flow, shared by the web composer and the agent API: open a hold order, then (after the payer
// approves in PayPal) place the hold, judge the message, and release the hold if it earned it.

export const MessageInput = z.object({
  sender_name: z.string().trim().min(1).max(80),
  sender_email: z.email(),
  subject: z.string().trim().min(3).max(120),
  body: z.string().trim().min(40).max(4000),
  agent: z.object({ name: z.string().trim().min(1).max(80), operator: z.string().trim().max(120).optional() }).optional(),
});

export async function startMessage(profile: Profile, input: z.infer<typeof MessageInput>, origin: string, redirect: boolean) {
  const ref = messages().doc();
  const status_token = randomBytes(18).toString("hex");
  await ref.set({
    ...input,
    profile_handle: profile.handle,
    amount_cents: profile.price_cents,
    body_hash: blastHash(input.body),
    status: "pending",
    status_token,
    created_at: new Date().toISOString(),
  });
  try {
    const order = await createHoldOrder(
      profile.price_cents,
      `Refundable Toll hold to message ${profile.name}`,
      ref.id,
      redirect ? { returnUrl: `${origin}/r`, cancelUrl: `${origin}/r?cancel=1&to=${profile.handle}` } : undefined,
    );
    await ref.update({ paypal_order_id: order.id });
    return { orderId: order.id, approveUrl: order.approveUrl, statusToken: status_token, messageId: ref.id };
  } catch (e) {
    await ref.update({ status: "failed" });
    throw e;
  }
}

export class FlowError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

const SENT = new Set<Message["status"]>(["held", "released", "charged"]); // only messages that really cost a hold

// Called once the sender approved in PayPal (popup, /r, or a poll that finds the order approved).
// Exactly one request does the work: it claims the pending message in a transaction first. Any other caller
// (a refresh of /r, a retry) just gets the status token back.
export async function completeHold(orderId: string) {
  const found = await messages().where("paypal_order_id", "==", orderId).limit(1).get();
  if (found.empty) throw new FlowError("Unknown order.", 404);
  const ref = found.docs[0].ref;

  const claimed = await getFirestore().runTransaction(async (t) => {
    const m = asMessage(await t.get(ref));
    if (m.status !== "pending" && !staleClaim(m)) return { token: m.status_token, msg: null };
    t.update(ref, { status: "authorizing", claimed_at: new Date().toISOString() });
    return { token: m.status_token, msg: m };
  });
  if (!claimed.msg) return claimed.token;
  const msg = claimed.msg;

  let hold: Awaited<ReturnType<typeof authorizeOrder>>;
  try {
    hold = await authorizeOrder(orderId); // idempotent per order (PayPal-Request-Id), so a stale retry is safe
  } catch (e) {
    console.error(e);
    // Not approved yet, or PayPal didn't answer: put the message back so a later approval or retry still works.
    // Only a definite refusal (declined, expired, ...) ends it.
    const notApproved = e instanceof PayPalError && e.issue === "ORDER_NOT_APPROVED";
    const retryable = !(e instanceof PayPalError) || e.status >= 500 || e.status === 429;
    if (notApproved || retryable) {
      await ref.update({ status: "pending", claimed_at: FieldValue.delete() });
      throw notApproved
        ? new FlowError("Approve the hold in PayPal first.", 409)
        : new FlowError("PayPal didn't answer. Nothing was sent yet; try again in a moment.", 503);
    }
    await ref.update({ status: "failed" });
    throw new FlowError("PayPal didn't place the hold, so nothing was sent.", 402);
  }
  const { authorizationId, payer } = hold;
  const now = new Date().toISOString();
  await ref.update({ status: "held", authorization_id: authorizationId, payer, held_at: now, judging: true, judging_since: now });

  const profile = asProfile(await profiles().doc(msg.profile_handle).get());
  const since = new Date(Date.now() - 7 * 864e5).toISOString();

  // The judge is the slow part, so the track record and the 7-day scan run alongside it.
  const [verdict, history, recent] = await Promise.all([
    judge(profile, msg).catch((e) => {
      console.error(e); // the hold stays and the recipient decides; Toll never charges because the AI failed
      return null;
    }),
    payer.id ? messages().where("payer.id", "==", payer.id).get() : null,
    // ponytail: scans the last 7 days in memory; move to a Firestore vector index if traffic grows.
    messages().where("created_at", ">", since).get(),
  ]);

  // Track record by PayPal-verified identity: good messages to at least two different people, no spam.
  // Trust only lifts a "your call" verdict; it never overrides spam, so farming trust on your own pages buys nothing.
  const past = (history?.docs ?? []).map(asMessage).filter((m) => m.id !== msg.id && SENT.has(m.status));
  const goodTo = new Set(past.filter((m) => m.verdict === "worth_it" || m.reply).map((m) => m.profile_handle));
  const trusted = goodTo.size >= 2 && !past.some((m) => m.verdict === "spam" || m.status === "charged");

  const update: Record<string, unknown> = { trusted, judging: false };
  let v: Verdict | null = verdict;
  if (v) {
    // Blasts: exact copies of the text (from anyone: it's a template), and AI-reworded copies of the same pitch,
    // but only from the same sender. Different people asking for similar things (internships, feedback) is not a blast.
    // Only messages someone actually paid a hold for count, so unpaid drafts can't frame an honest sender.
    const embedding = await embed(v.pitch);
    // Same sender = same PayPal account. Never the typed email: anyone could type someone else's to frame them.
    const sameSender = (m: Message) => !!payer.id && m.payer?.id === payer.id;
    const others = recent.docs.map(asMessage).filter((m) => m.profile_handle !== msg.profile_handle && SENT.has(m.status));
    const exact = others.filter((m) => m.body_hash === msg.body_hash);
    const reworded = others.filter(
      (m) =>
        m.body_hash !== msg.body_hash &&
        sameSender(m) &&
        !!embedding &&
        !!m.embedding &&
        m.embedding_model === EMBED_MODEL &&
        cosine(embedding, m.embedding) >= BLAST_SIMILARITY,
    );
    const blastCopies = exact.length + reworded.length;
    if (blastCopies > 0) v = markBlast(v);
    Object.assign(update, {
      blast_copies: blastCopies,
      blast_self_copy: exact.some(sameSender),
      pitch: v.pitch,
      embedding,
      embedding_model: embedding ? EMBED_MODEL : undefined,
      verdict: v.verdict,
      score: v.score,
      summary: v.summary,
      reasons: v.reasons,
      flags: v.flags,
      coaching: v.coaching,
      judge_model: v.model,
    });
  }

  if (v && (v.verdict === "worth_it" || (trusted && v.verdict === "borderline"))) {
    try {
      await releaseHold(authorizationId);
      Object.assign(update, { status: "released", resolved_at: new Date().toISOString() });
    } catch (e) {
      console.error(e); // still held; the recipient can release it from the inbox
    }
  }
  await ref.update(update);
  return msg.status_token;
}
