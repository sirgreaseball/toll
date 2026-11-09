"use client";

import { PayPalButtons, PayPalScriptProvider } from "@paypal/react-paypal-js";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Vault from "@/components/vault";

const empty = { sender_name: "", sender_email: "", subject: "", body: "" };

export default function Compose({
  handle,
  firstName,
  price,
  charity,
}: {
  handle: string;
  firstName: string;
  price: string;
  charity: string;
}) {
  const router = useRouter();
  const [form, setForm] = useState(empty);
  const [judging, setJudging] = useState(false);
  const [error, setError] = useState("");
  // PayPal keeps the first createOrder callback, so it reads the form through a ref.
  const latest = useRef(form);
  latest.current = form;

  const left = 40 - form.body.trim().length;
  const ready =
    form.sender_name.trim() !== "" &&
    /^\S+@\S+\.\S+$/.test(form.sender_email) &&
    form.subject.trim().length >= 3 &&
    left <= 0;
  const set = (k: keyof typeof empty) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [k]: e.target.value });
    setError("");
  };

  // Instagram, LinkedIn, TikTok and friends open links in webviews where PayPal's popup can't open,
  // so there the sender goes to PayPal's own page and comes back to /r.
  const [inApp, setInApp] = useState(false);
  useEffect(() => setInApp(/Instagram|FBAN|FBAV|LinkedInApp|Twitter|TikTok|musical_ly|Snapchat|Line\/|wv\)/i.test(navigator.userAgent)), []);
  const [leaving, setLeaving] = useState(false);
  async function onPayPalSite() {
    if (!ready) return setError("Fill in every field. The message needs at least 40 characters.");
    setLeaving(true);
    setError("");
    const data = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ handle, ...form, redirect: true }),
    })
      .then((r) => r.json())
      .catch(() => ({}));
    if (!data.approveUrl) {
      setLeaving(false);
      return setError(data.error ?? "PayPal is unavailable right now. Try again in a minute.");
    }
    window.location.href = data.approveUrl;
  }

  if (judging) {
    return (
      <section className="stage on-dark flex min-h-[34rem] flex-col items-center justify-center rounded-[34px] p-8 text-center" aria-live="polite">
        <Vault state="reading" size="sm" price={price} charity={charity} letters={[{ from: form.sender_name, subject: form.subject }]} />
        <p className="display mt-8 text-[clamp(28px,3vw,40px)]">Reading your message</p>
        <p className="mt-3 max-w-[34ch] leading-relaxed text-muted">
          The {price} hold is placed. The AI is checking whether this is worth {firstName}&apos;s time.
        </p>
      </section>
    );
  }

  return (
    <section className="bezel self-start"><div className="core p-5 sm:p-8">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="text-[clamp(24px,2.6vw,34px)] font-extrabold tracking-[-0.035em]">Write to {firstName}</h2>
        <span className="label num">Hold · {price}</span>
      </div>

      <div className="mt-7 grid gap-3 sm:grid-cols-2">
        <label className="grid gap-2">
          <span className="label">Your name</span>
          <input className="field" autoComplete="name" value={form.sender_name} onChange={set("sender_name")} />
        </label>
        <label className="grid gap-2">
          <span className="label">Your email</span>
          <input className="field" type="email" autoComplete="email" value={form.sender_email} onChange={set("sender_email")} />
        </label>
      </div>
      <label className="mt-3 grid gap-2">
        <span className="label">Subject</span>
        <input className="field" value={form.subject} onChange={set("subject")} />
      </label>
      <label className="mt-3 grid gap-2">
        <span className="flex justify-between">
          <span className="label">Message</span>
          <span className={`label num ${left <= 0 ? "text-go" : ""}`}>{left > 0 ? `${left} to go` : "Ready"}</span>
        </span>
        <textarea
          className="field min-h-52 resize-y leading-relaxed"
          placeholder={`Who you are, why ${firstName}, and what you're asking for.`}
          value={form.body}
          onChange={set("body")}
        />
      </label>

      {inApp && (
        <button onClick={onPayPalSite} disabled={leaving} className={`btn mt-6 w-full bg-[#ffc439] text-[#003087] ${ready ? "" : "opacity-45"}`}>
          {leaving ? "Opening PayPal…" : "Continue to PayPal"}
        </button>
      )}
      {/* PayPal's own disabled state paints a grey box, so the button is gated by a clear cover instead. */}
      <div className={`relative mt-6 transition-opacity duration-300 ${ready ? "" : "opacity-45"} ${inApp ? "hidden" : ""}`}>
        {!ready && (
          <button
            type="button"
            aria-label="Fill in every field to continue"
            className="absolute inset-0 z-10 cursor-not-allowed rounded-full"
            onClick={() => setError("Fill in every field. The message needs at least 40 characters.")}
          />
        )}
        <PayPalScriptProvider
          options={{ clientId: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID ?? "test", intent: "authorize", currency: "USD" }}
        >
          <PayPalButtons
            fundingSource="paypal"
            style={{ layout: "vertical", shape: "pill", color: "gold", height: 52 }}
            createOrder={async () => {
              setError("");
              const res = await fetch("/api/orders", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ handle, ...latest.current }),
              });
              const data = await res.json();
              if (!res.ok) {
                setError(data.error);
                throw new Error(data.error);
              }
              return data.orderId;
            }}
            onApprove={async ({ orderID }) => {
              setJudging(true);
              // The authorize call is safe to repeat: once a request has the message, a retry just returns its status
              // token. So a timeout or dropped connection is retried, and the status page shows the real outcome.
              for (let attempt = 0; attempt < 3; attempt++) {
                try {
                  const res = await fetch(`/api/orders/${orderID}/authorize`, { method: "POST" });
                  const data = await res.json();
                  if (res.ok) return router.push(`/s/${data.token}`);
                  if (res.status < 500 && res.status !== 409) {
                    setJudging(false);
                    return setError(data.error);
                  }
                } catch {} // non-JSON 504 or offline
                await new Promise((r) => setTimeout(r, 2500));
              }
              setJudging(false);
              setError("We couldn't confirm your message. Nothing was charged; try again in a minute.");
            }}
            onError={() => setError((e) => e || "PayPal couldn't place the hold. Try again.")}
          />
        </PayPalScriptProvider>
      </div>
      <p className="label mt-4 text-center">{ready ? `Hold ${price} · released if it's worth it` : "Fill in every field to continue"}</p>
      {ready && !inApp && (
        <button onClick={onPayPalSite} disabled={leaving} className="link mt-2 block w-full text-center text-sm underline underline-offset-4">
          {leaving ? "Opening PayPal…" : "PayPal window not opening? Continue on PayPal's site"}
        </button>
      )}
      {error && (
        <p className="mt-3 text-center text-sm text-stop" role="alert">
          {error}
        </p>
      )}
    </div></section>
  );
}
