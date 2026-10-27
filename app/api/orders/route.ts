import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { asProfile, blastHash, messages, profiles } from "@/lib/db";
import { createHoldOrder } from "@/lib/paypal";

const Body = z.object({
  handle: z.string().toLowerCase(),
  sender_name: z.string().trim().min(1).max(80),
  sender_email: z.email(),
  subject: z.string().trim().min(3).max(120),
  body: z.string().trim().min(40).max(4000),
});

// Saves the message, then opens a PayPal order with intent AUTHORIZE. Nothing is charged here.
export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Fill in every field. The message needs at least 40 characters." }, { status: 400 });
  }
  const { handle, ...fields } = parsed.data;

  const snap = await profiles().doc(handle).get();
  if (!snap.exists) return NextResponse.json({ error: "This Toll page doesn't exist." }, { status: 404 });
  const profile = asProfile(snap);

  const ref = messages().doc();
  await ref.set({
    ...fields,
    profile_handle: handle,
    amount_cents: profile.price_cents,
    body_hash: blastHash(fields.body),
    status: "pending",
    status_token: randomBytes(18).toString("hex"),
    created_at: new Date().toISOString(),
  });

  try {
    const orderId = await createHoldOrder(profile.price_cents, `Refundable Toll hold to message ${profile.name}`, ref.id);
    await ref.update({ paypal_order_id: orderId });
    return NextResponse.json({ orderId });
  } catch (e) {
    console.error(e);
    await ref.update({ status: "failed" });
    return NextResponse.json({ error: "PayPal is unavailable right now. Try again in a minute." }, { status: 502 });
  }
}
