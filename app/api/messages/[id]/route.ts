import { NextResponse } from "next/server";
import { z } from "zod";
import { asMessage, isMessageId, messages, openInbox } from "@/lib/db";
import { chargeHold, releaseHold } from "@/lib/paypal";

const Body = z.object({
  key: z.string(),
  action: z.enum(["release", "charge", "reply"]),
  reply: z.string().trim().min(1).max(4000).optional(),
});

// Inbox actions. Replying releases the hold: if the recipient answers, the sender pays nothing.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Not allowed." }, { status: 401 });
  const { action, reply, key } = parsed.data;
  if (action === "reply" && !reply) return NextResponse.json({ error: "Write a reply first." }, { status: 400 });

  if (!isMessageId(id)) return NextResponse.json({ error: "Message not found." }, { status: 404 });
  const ref = messages().doc(id);
  const snap = await ref.get();
  if (!snap.exists) return NextResponse.json({ error: "Message not found." }, { status: 404 });
  const msg = asMessage(snap);
  // Only the owner of the page the message was sent to may act on it.
  if (!(await openInbox(msg.profile_handle, key))) return NextResponse.json({ error: "Not allowed." }, { status: 401 });

  const update: Record<string, unknown> = action === "reply" ? { reply } : {};
  if (msg.status === "held" && msg.authorization_id) {
    try {
      if (action === "charge") await chargeHold(msg.authorization_id);
      else await releaseHold(msg.authorization_id);
    } catch (e) {
      console.error(e);
      return NextResponse.json({ error: "PayPal couldn't settle this hold." }, { status: 502 });
    }
    Object.assign(update, { status: action === "charge" ? "charged" : "released", resolved_at: new Date().toISOString() });
  } else if (action !== "reply") {
    return NextResponse.json({ error: "This hold is already settled." }, { status: 409 });
  }

  await ref.update(update);
  return NextResponse.json({ ok: true });
}
