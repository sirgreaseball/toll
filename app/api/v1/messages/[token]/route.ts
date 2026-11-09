import { NextResponse } from "next/server";
import { asMessage, messages } from "@/lib/db";
import { completeHold } from "@/lib/flow";
import { orderStatus } from "@/lib/paypal";

export const maxDuration = 60;

// Agent API: poll a message. The token is the private status token returned when the message was created.
// If the human approved in PayPal but never came back to /r (closed the tab), polling finishes the job.
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const found = await messages().where("status_token", "==", token).limit(1).get();
  if (found.empty) return NextResponse.json({ error: "Unknown message." }, { status: 404 });
  let m = asMessage(found.docs[0]);

  if (m.status === "pending" && m.paypal_order_id) {
    try {
      if ((await orderStatus(m.paypal_order_id)) === "APPROVED") {
        await completeHold(m.paypal_order_id);
        m = asMessage(await found.docs[0].ref.get());
      }
    } catch (e) {
      console.error(e); // report what we have; the next poll tries again
    }
  }

  const status = m.status === "pending" ? "awaiting_approval" : m.status === "authorizing" || m.judging ? "processing" : m.status;
  return NextResponse.json({
    status, // awaiting_approval | processing | held | released | charged | failed
    to: m.profile_handle,
    hold: { value: (m.amount_cents / 100).toFixed(2), currency: "USD" },
    verdict: m.verdict ?? null, // worth_it | borderline | spam
    score: m.score ?? null,
    summary: m.summary ?? null,
    coaching: m.verdict && m.verdict !== "worth_it" ? (m.coaching ?? null) : null,
    reply: m.reply ?? null,
    trusted_sender: !!m.trusted,
  });
}
