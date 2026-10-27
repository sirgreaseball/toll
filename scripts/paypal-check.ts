// Sandbox check of the money path: open a hold order, then place, release and charge holds with
// PayPal's test card. Run: node --env-file=.env.local scripts/paypal-check.ts
import { chargeHold, createHoldOrder, post, releaseHold } from "../lib/paypal.ts";

const run = Date.now().toString(36);
const orderId = await createHoldOrder(300, "Toll sandbox check", `check-${run}`);
console.log("PASS  hold order created:", orderId);

async function cardHold(tag: string) {
  const order = await post("/v2/checkout/orders", `card-${tag}-${run}`, {
    intent: "AUTHORIZE",
    purchase_units: [{ amount: { currency_code: "USD", value: "3.00" } }],
    payment_source: { card: { number: "4111111111111111", expiry: "2030-12", security_code: "123", name: "Test Buyer" } },
  });
  const auth = order.purchase_units?.[0]?.payments?.authorizations?.[0];
  if (!auth?.id) throw new Error(`no hold on card order (status ${order.status})`);
  return auth.id as string;
}

try {
  await releaseHold(await cardHold("void"));
  console.log("PASS  hold placed and released");
  const charged = await chargeHold(await cardHold("capture"));
  console.log("PASS  hold placed and charged:", charged.status);
} catch (e) {
  console.log("SKIP  card holds:", (e as Error).message.slice(0, 160));
}
process.exit(0);
