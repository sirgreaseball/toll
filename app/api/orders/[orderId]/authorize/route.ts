import { NextResponse } from "next/server";
import { asMessage, asProfile, messages, profiles } from "@/lib/db";
import { BLAST_SIMILARITY, EMBED_MODEL, cosine, embed, judge, markBlast } from "@/lib/judge";
import { authorizeOrder, releaseHold } from "@/lib/paypal";

export const maxDuration = 60;

// Called after the sender approves in PayPal: place the hold, check the sender's track record and blasts,
// run the judge, and release the hold if the sender is trusted or the message is worth it.
export async function POST(_req: Request, { params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;

  const found = await messages().where("paypal_order_id", "==", orderId).limit(1).get();
  if (found.empty) return NextResponse.json({ error: "Unknown order." }, { status: 404 });
  const ref = found.docs[0].ref;
  const msg = asMessage(found.docs[0]);
  if (msg.status !== "pending") return NextResponse.json({ token: msg.status_token });

  let hold: Awaited<ReturnType<typeof authorizeOrder>>;
  try {
    hold = await authorizeOrder(orderId);
  } catch (e) {
    console.error(e);
    await ref.update({ status: "failed" });
    return NextResponse.json({ error: "PayPal didn't place the hold, so nothing was sent." }, { status: 402 });
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
  return NextResponse.json({ token: msg.status_token });
}
