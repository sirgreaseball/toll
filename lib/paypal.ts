// Server-only PayPal REST client: place a hold (authorize), release it (void) or charge it (capture).
const BASE = process.env.PAYPAL_ENV === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";

// ponytail: fetches a token per call; cache it until expiry if PayPal starts rate limiting.
async function token() {
  const id = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_CLIENT_SECRET;
  if (!id || !secret) throw new Error("PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET missing");
  const res = await fetch(`${BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: "Basic " + Buffer.from(`${id}:${secret}`).toString("base64"),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`PayPal auth failed: ${res.status}`);
  return (await res.json()).access_token as string;
}

// PayPal-Request-Id makes retries safe: the same id never places or moves money twice.
export async function post(path: string, requestId: string, body?: unknown) {
  const res = await fetch(BASE + path, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${await token()}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      "PayPal-Request-Id": requestId,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) throw new Error(`PayPal ${path} ${res.status}: ${data.details?.[0]?.issue ?? data.name ?? ""} ${data.message ?? text}`);
  return data;
}

export async function createHoldOrder(amountCents: number, description: string, messageId: string) {
  const order = await post("/v2/checkout/orders", `order-${messageId}`, {
    intent: "AUTHORIZE",
    purchase_units: [
      {
        reference_id: messageId,
        description: description.slice(0, 127),
        amount: { currency_code: "USD", value: (amountCents / 100).toFixed(2) },
      },
    ],
  });
  return order.id as string;
}

// Who paid, as PayPal knows them. `verified` means PayPal has verified the account.
export type Payer = { id?: string; name?: string; email?: string; country?: string; verified: boolean };

export async function authorizeOrder(orderId: string) {
  const order = await post(`/v2/checkout/orders/${orderId}/authorize`, `auth-${orderId}`, {});
  const auth = order.purchase_units?.[0]?.payments?.authorizations?.[0];
  if (!auth?.id) throw new Error(`PayPal placed no hold on order ${orderId}`);
  const pp = order.payment_source?.paypal;
  const payer: Payer = {
    id: pp?.account_id ?? order.payer?.payer_id,
    name: [order.payer?.name?.given_name, order.payer?.name?.surname].filter(Boolean).join(" ") || undefined,
    email: (pp?.email_address ?? order.payer?.email_address)?.toLowerCase(),
    country: pp?.address?.country_code ?? order.payer?.address?.country_code,
    verified: pp?.account_status === "VERIFIED",
  };
  return { authorizationId: auth.id as string, payer };
}

export const releaseHold = (authorizationId: string) =>
  post(`/v2/payments/authorizations/${authorizationId}/void`, `void-${authorizationId}`);

export const chargeHold = (authorizationId: string) =>
  post(`/v2/payments/authorizations/${authorizationId}/capture`, `capture-${authorizationId}`, { final_capture: true });
