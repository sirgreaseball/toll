"use client";

import { PayPalButtons, PayPalScriptProvider } from "@paypal/react-paypal-js";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
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

  if (judging) {
    return (
      <section className="glass flex min-h-[36rem] flex-col items-center justify-center p-8 text-center" aria-live="polite">
        <Vault state="reading" size="sm" price={price} charity={charity} letters={[{ from: form.sender_name, subject: form.subject }]} />
        <p className="display mt-8 text-[clamp(28px,3vw,40px)]">Reading your message</p>
        <p className="mt-3 max-w-[34ch] leading-relaxed text-muted">
          The {price} hold is placed. The AI is checking whether this is worth {firstName}&apos;s time.
        </p>
      </section>
    );
  }

  return (
    <section className="glass self-start p-6 sm:p-8">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="text-[clamp(26px,2.6vw,34px)] font-semibold tracking-[-0.035em]">Write to {firstName}</h2>
        <span className="label num">Hold · {price}.00</span>
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
          <span className={`label num ${left <= 0 ? "text-mint" : ""}`}>{left > 0 ? `${left} to go` : "Ready"}</span>
        </span>
        <textarea
          className="field min-h-52 resize-y leading-relaxed"
          placeholder={`Who you are, why ${firstName}, and what you're asking for.`}
          value={form.body}
          onChange={set("body")}
        />
      </label>

      {/* PayPal's own disabled state paints a grey box, so the button is gated by a clear cover instead. */}
      <div className={`relative mt-6 transition-opacity duration-300 ${ready ? "" : "opacity-45"}`}>
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
            style={{ layout: "vertical", shape: "pill", color: "gold", height: 48 }}
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
              const res = await fetch(`/api/orders/${orderID}/authorize`, { method: "POST" });
              const data = await res.json();
              if (!res.ok) {
                setJudging(false);
                setError(data.error);
                return;
              }
              router.push(`/s/${data.token}`);
            }}
            onError={() => setError((e) => e || "PayPal couldn't place the hold. Try again.")}
          />
        </PayPalScriptProvider>
      </div>
      <p className="label mt-4 text-center">{ready ? `Hold ${price} · released if it's worth it` : "Fill in every field to continue"}</p>
      {error && (
        <p className="mt-3 text-center text-sm text-postmark" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
