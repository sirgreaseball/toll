import { randomBytes } from "node:crypto";
import { z } from "zod";
import { asMessage, asProfile, blastHash, messages, profiles, type Profile } from "./db";
import { BLAST_SIMILARITY, EMBED_MODEL, cosine, embed, judge, markBlast } from "./judge";
import { authorizeOrder, createHoldOrder, releaseHold } from "./paypal";

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

// Called once the sender approved in PayPal. Safe to call twice: a settled message just returns its token.
export async function completeHold(orderId: string) {
  const found = await messages().where("paypal_order_id", "==", orderId).limit(1).get();
  if (found.empty) throw new FlowError("Unknown order.", 404);
  const ref = found.docs[0].ref;
  const msg = asMessage(found.docs[0]);
  if (msg.status !== "pending") return msg.status_token;

  let hold: Awaited<ReturnType<typeof authorizeOrder>>;
  try {
    hold = await authorizeOrder(orderId);
  } catch (e) {
    console.error(e);
    await ref.update({ status: "failed" });
    throw new FlowError("PayPal didn't place the hold, so nothing was sent.", 402);
  }
  const { authorizationId, payer } = hold;
  await ref.update({ status: "held", authorization_id: authorizationId, payer });

  const profile = asProfile(await profiles().doc(msg.profile_handle).get());

  // Track record by PayPal-verified identity, so nobody can borrow someone else's history.
  const history = payer.id
    ? (await messages().where("payer.id", "==", payer.id).get()).docs.map(asMessage).filter((m) => m.id !== msg.id)
    : [];
  const good = history.filter((m) => m.verdict === "worth_it" || m.reply).length;
  const bad = history.filter((m) => m.verdict === "spam" || m.status === "charged").length;
  const trusted = good >= 2 && bad === 0;

  const update: Record<string, unknown> = { trusted };
  let release = trusted;
  try {
    let v = await judge(profile, msg);

    // Blasts: exact copies by hash, AI-reworded copies by the meaning of the judge's neutral pitch line.
    // ponytail: scans the last 7 days in memory; move to a Firestore vector index if traffic grows.
    const embedding = await embed(v.pitch);
    const since = new Date(Date.now() - 7 * 864e5).toISOString();
    const recent = (await messages().where("created_at", ">", since).get()).docs
      .map(asMessage)
      .filter((m) => m.profile_handle !== msg.profile_handle);
    const blastCopies = recent.filter(
      (m) =>
        m.body_hash === msg.body_hash ||
        (!!embedding && !!m.embedding && m.embedding_model === EMBED_MODEL && cosine(embedding, m.embedding) >= BLAST_SIMILARITY),
    ).length;
    if (blastCopies > 0) v = markBlast(v);

    Object.assign(update, {
      blast_copies: blastCopies,
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
    release ||= v.verdict === "worth_it";
  } catch (e) {
    // The hold stays and the recipient decides. Toll never charges because the AI failed.
    console.error(e);
  }

  if (release) {
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
