import { NextResponse } from "next/server";
import { asMessage, messages } from "@/lib/db";
import { completeHold } from "@/lib/flow";
import { chargeHold, orderStatus, releaseHold } from "@/lib/paypal";

export const maxDuration = 60;

// Daily (vercel.json cron). Two jobs:
// 1. PayPal honors a hold for 3 days, so anything still held after 2 days is settled. Toll only takes money
//    without the recipient's say-so when the abuse is mechanical, not a judgement call: a detected mass blast or
//    an attempt to manipulate the AI. Everything else, including ordinary spam verdicts, is released.
// 2. Redirect orders the payer approved but never returned from (closed tab) are finished, so they aren't lost.
export async function GET(req: Request) {
  if (!process.env.CRON_SECRET || req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Not allowed." }, { status: 401 });
  }
  const started = Date.now();
  const cutoff = new Date(Date.now() - 2 * 864e5).toISOString();
  const held = (await messages().where("status", "==", "held").get()).docs
    .map(asMessage)
    .filter((m) => m.created_at < cutoff && m.authorization_id);

  const done = { released: 0, charged: 0, completed: 0, failed: 0 };
  for (const m of held) {
    const charge = m.verdict === "spam" && !!m.flags?.some((f) => f === "mass_blast" || f === "prompt_injection");
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

  // ponytail: at most a few per run, since each one runs the judge; the agent poll endpoint also finishes them.
  const stuckBefore = new Date(Date.now() - 15 * 60_000).toISOString();
  const stuckAfter = new Date(Date.now() - 3 * 864e5).toISOString();
  const pending = (await messages().where("status", "==", "pending").get()).docs
    .map(asMessage)
    .filter((m) => m.paypal_order_id && m.created_at < stuckBefore && m.created_at > stuckAfter);
  for (const m of pending) {
    if (Date.now() - started > 25_000) break;
    try {
      if ((await orderStatus(m.paypal_order_id!)) === "APPROVED") {
        await completeHold(m.paypal_order_id!);
        done.completed++;
      }
    } catch (e) {
      console.error(m.id, e);
    }
  }
  return NextResponse.json(done);
}
