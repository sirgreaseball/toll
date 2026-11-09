import { NextResponse } from "next/server";
import { asMessage, chargesAutomatically, messages, staleClaim } from "@/lib/db";
import { completeHold } from "@/lib/flow";
import { chargeHold, orderStatus, releaseHold } from "@/lib/paypal";

export const maxDuration = 60;

// Daily (vercel.json cron). Two jobs:
// 1. PayPal honors a hold for 3 days, so anything held for 2 days is settled. Toll only takes money without the
//    recipient's say-so when the abuse is mechanical (chargesAutomatically); everything else is released.
// 2. Messages left half-done are finished: redirect orders the payer approved but never returned from (closed
//    tab), and requests that died mid-flow (timeout) after claiming a message.
export async function GET(req: Request) {
  if (!process.env.CRON_SECRET || req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Not allowed." }, { status: 401 });
  }
  const started = Date.now();
  const cutoff = new Date(Date.now() - 2 * 864e5).toISOString();
  const held = (await messages().where("status", "==", "held").get()).docs
    .map(asMessage)
    .filter((m) => (m.held_at ?? m.created_at) < cutoff && m.authorization_id);

  const done = { released: 0, charged: 0, completed: 0, failed: 0 };
  for (const m of held) {
    if (Date.now() - started > 40_000) break; // the rest go tomorrow, still inside PayPal's honor period
    const charge = chargesAutomatically(m);
    try {
      await (charge ? chargeHold : releaseHold)(m.authorization_id!);
      await messages()
        .doc(m.id)
        .update({ status: charge ? "charged" : "released", judging: false, settled_by: "auto", resolved_at: new Date().toISOString() });
      done[charge ? "charged" : "released"]++;
    } catch (e) {
      console.error(m.id, e);
      done.failed++;
    }
  }

  // ponytail: one or two per run, since each can run the judge; the status page and agent polls also finish them.
  const stuckAfter = new Date(Date.now() - 3 * 864e5).toISOString();
  const unfinished = (await messages().where("status", "in", ["pending", "authorizing"]).get()).docs
    .map(asMessage)
    .filter((m) => m.paypal_order_id && m.created_at > stuckAfter && (m.status === "pending" ? Date.now() - Date.parse(m.created_at) > 15 * 60_000 : staleClaim(m)));
  for (const m of unfinished) {
    if (Date.now() - started > 25_000) break;
    try {
      if (m.status === "authorizing" || (await orderStatus(m.paypal_order_id!)) === "APPROVED") {
        await completeHold(m.paypal_order_id!);
        done.completed++;
      }
    } catch (e) {
      console.error(m.id, e);
    }
  }
  return NextResponse.json(done);
}
