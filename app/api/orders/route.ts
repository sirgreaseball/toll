import { NextResponse } from "next/server";
import { z } from "zod";
import { asProfile, profiles } from "@/lib/db";
import { MessageInput, startMessage } from "@/lib/flow";
import { allow } from "@/lib/limit";

const Body = MessageInput.omit({ agent: true }).extend({ handle: z.string().toLowerCase(), redirect: z.boolean().optional() });

// Saves the message, then opens a PayPal order with intent AUTHORIZE. Nothing is charged here.
// `redirect` returns PayPal's approval page instead, for in-app browsers where the popup can't open.
export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Fill in every field. The message needs at least 40 characters." }, { status: 400 });
  }
  const { handle, redirect, ...fields } = parsed.data;
  if (!(await allow(req, "msg", 60))) return NextResponse.json({ error: "Too many messages from this network. Try again in an hour." }, { status: 429 });

  const snap = await profiles().doc(handle).get();
  if (!snap.exists) return NextResponse.json({ error: "This Toll page doesn't exist." }, { status: 404 });

  try {
    const { orderId, approveUrl } = await startMessage(asProfile(snap), fields, new URL(req.url).origin, !!redirect);
    return NextResponse.json({ orderId, approveUrl });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "PayPal is unavailable right now. Try again in a minute." }, { status: 502 });
  }
}
