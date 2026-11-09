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

// Carries PayPal's HTTP status and issue code, so callers can tell "not approved yet" from "declined".
export class PayPalError extends Error {
  constructor(
    message: string,
    public status: number,
    public issue?: string,
  ) {
    super(message);
  }
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
  let data: Record<string, any> = {}; // eslint-disable-line @typescript-eslint/no-explicit-any
  try {
    data = text ? JSON.parse(text) : {};
  } catch {}
  const issue = data.details?.[0]?.issue ?? data.name;
  if (!res.ok) throw new PayPalError(`PayPal ${path} ${res.status}: ${issue ?? ""} ${data.message ?? text}`, res.status, issue);
  return data;
}

// With `redirect`, the payer approves on PayPal's own page and comes back to returnUrl (?token=<order id>).
// That path works where popups don't: in-app browsers, and links handed to a human by an AI agent.
export async function createHoldOrder(
  amountCents: number,
  description: string,
  messageId: string,
  redirect?: { returnUrl: string; cancelUrl: string },
) {
  const order = await post("/v2/checkout/orders", `order-${messageId}`, {
    intent: "AUTHORIZE",
    purchase_units: [
      {
        reference_id: messageId,
        description: description.slice(0, 127),
        amount: { currency_code: "USD", value: (amountCents / 100).toFixed(2) },
      },
    ],
    ...(redirect && {
      payment_source: {
        paypal: {
          experience_context: {
            brand_name: "Toll",
            shipping_preference: "NO_SHIPPING",
            user_action: "CONTINUE",
            return_url: redirect.returnUrl,
            cancel_url: redirect.cancelUrl,
          },
        },
      },
    }),
  });
  const approveUrl = (order.links as { rel: string; href: string }[] | undefined)?.find((l) => l.rel === "payer-action" || l.rel === "approve")?.href;
  return { id: order.id as string, approveUrl };
}

async function getOrder(orderId: string) {
  const res = await fetch(`${BASE}/v2/checkout/orders/${encodeURIComponent(orderId)}`, {
    headers: { Authorization: `Bearer ${await token()}` },
    cache: "no-store",
  });
  if (!res.ok) throw new PayPalError(`PayPal order ${orderId} ${res.status}`, res.status);
  return res.json();
}

// Order status (CREATED, APPROVED, COMPLETED...). Used to finish redirect orders whose payer never came back to /r.
export const orderStatus = async (orderId: string) => (await getOrder(orderId)).status as string;

// Who paid, as PayPal knows them. `verified` means PayPal has verified the account.
export type Payer = { id?: string; name?: string; email?: string; country?: string; verified: boolean };

export async function authorizeOrder(orderId: string) {
  let order;
  try {
    order = await post(`/v2/checkout/orders/${orderId}/authorize`, `auth-${orderId}`, {});
  } catch (e) {
    // An earlier attempt placed the hold but its answer was lost: read the hold back instead of failing.
    if (!(e instanceof PayPalError && e.issue === "ORDER_ALREADY_AUTHORIZED")) throw e;
    order = await getOrder(orderId);
  }
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
