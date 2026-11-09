import { NextResponse } from "next/server";
import { asMessage, messages } from "@/lib/db";
import { chargeHold, releaseHold } from "@/lib/paypal";

export const maxDuration = 60;

// Daily (vercel.json cron). PayPal honors a hold for 3 days, so anything still held after 2 days is settled
// by the rules on every Toll page: spam is charged to charity, everything else (including unjudged) is released.
export async function GET(req: Request) {
  if (!process.env.CRON_SECRET || req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Not allowed." }, { status: 401 });
  }
  const cutoff = new Date(Date.now() - 2 * 864e5).toISOString();
  const held = (await messages().where("status", "==", "held").get()).docs.map(asMessage).filter((m) => m.created_at < cutoff && m.authorization_id);

  const done = { released: 0, charged: 0, failed: 0 };
  for (const m of held) {
    const charge = m.verdict === "spam";
    try {
      await (charge ? chargeHold : releaseHold)(m.authorization_id!);
      await messages()
        .doc(m.id)
        .update({ status: charge ? "charged" : "released", settled_by: "auto", resolved_at: new Date().toISOString() });
      done[charge ? "charged" : "released"]++;
    } catch (e) {
      console.error(m.id, e);
      done.failed++;
    }
  }
  return NextResponse.json(done);
}
