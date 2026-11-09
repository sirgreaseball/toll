import { createHash } from "node:crypto";
import { getFirestore } from "firebase-admin/firestore";
import { profiles } from "./db";

// Per-IP, per-hour caps on the unauthenticated endpoints that write to Firestore and call PayPal, so a script
// can't burn the free quotas during judging. The IP is hashed; nothing identifying is stored.
// ponytail: fixed one-hour windows in Firestore; move to an edge rate limiter if traffic is real.
export async function allow(req: Request, bucket: string, max: number) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
  profiles(); // makes sure the Admin SDK is initialised
  const hour = Math.floor(Date.now() / 3_600_000);
  const id = `${createHash("sha256").update(ip).digest("hex").slice(0, 20)}_${bucket}_${hour}`;
  const db = getFirestore();
  const ref = db.collection("limits").doc(id);
  return db.runTransaction(async (t) => {
    const count = ((await t.get(ref)).data()?.count as number | undefined) ?? 0;
    if (count >= max) return false;
    t.set(ref, { count: count + 1, expires_at: new Date((hour + 2) * 3_600_000) });
    return true;
  });
}
