import { NextResponse } from "next/server";
import { asMessage, messages } from "@/lib/db";

// Agent API: poll a message. The token is the private status token returned when the message was created.
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const found = await messages().where("status_token", "==", token).limit(1).get();
  if (found.empty) return NextResponse.json({ error: "Unknown message." }, { status: 404 });
  const m = asMessage(found.docs[0]);
  const status = m.status === "pending" ? "awaiting_approval" : m.status;
  return NextResponse.json({
    status, // awaiting_approval | held | released | charged | failed
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
