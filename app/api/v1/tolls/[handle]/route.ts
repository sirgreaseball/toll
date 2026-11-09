import { NextResponse } from "next/server";
import { asProfile, profiles, publicProfile } from "@/lib/db";

// Agent API: read a person's Toll before writing to them. Their wants and avoids are the rubric the AI judges by.
export async function GET(req: Request, { params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const snap = await profiles().doc(handle.toLowerCase()).get();
  if (!snap.exists) return NextResponse.json({ error: "No Toll page with that handle." }, { status: 404 });
  const p = publicProfile(asProfile(snap));
  const origin = new URL(req.url).origin;
  return NextResponse.json({
    ...p,
    price: { value: (p.price_cents / 100).toFixed(2), currency: "USD", kind: "refundable PayPal hold" },
    rules: [
      "Sending places a PayPal hold for the price. Nothing is charged when you send.",
      "An AI scores the message against `wants` and `avoids`. Score 70+ releases the hold at once.",
      "If the recipient replies or releases it, the hold is released.",
      "If it is spam and the recipient confirms, the hold is charged for `charity`. The only automatic charge: the same PayPal account sent this exact message to other people. Other unconfirmed holds are released after 2 days.",
      "Messages sent by an agent are labelled as such, with the agent's name and operator.",
    ],
    send: { method: "POST", url: `${origin}/api/v1/tolls/${p.handle}/messages`, docs: `${origin}/agents` },
  });
}
