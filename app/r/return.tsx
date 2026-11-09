"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Vault from "@/components/vault";

export default function Return({ orderId, cancelled, to }: { orderId: string; cancelled: boolean; to: string }) {
  const router = useRouter();
  const [error, setError] = useState(!orderId && !cancelled ? "This link is missing its PayPal order." : "");

  useEffect(() => {
    if (cancelled || !orderId) return;
    fetch(`/api/orders/${encodeURIComponent(orderId)}/authorize`, { method: "POST" })
      .then(async (res) => {
        const data = await res.json();
        if (res.ok) router.replace(`/s/${data.token}`);
        else setError(data.error);
      })
      .catch(() => setError("We couldn't reach Toll. Your hold was not charged; refresh to try again."));
  }, [orderId, cancelled, router]);

  if (cancelled || error) {
    return (
      <section>
        <p className="label">No hold placed</p>
        <h1 className="display mt-4 text-[clamp(36px,5vw,64px)]">{cancelled ? "You cancelled in PayPal." : "Not sent."}</h1>
        <p className="mt-4 max-w-[44ch] leading-relaxed text-muted">{cancelled ? "Nothing was held and nothing was sent." : error}</p>
        {to && (
          <Link href={`/${to}`} className="btn btn-blue mt-8">
            Back to the message
          </Link>
        )}
      </section>
    );
  }
  return (
    <section className="stage on-dark flex min-h-[34rem] flex-col items-center justify-center rounded-[34px] p-8 text-center" aria-live="polite">
      <Vault state="reading" size="sm" />
      <p className="display mt-8 text-[clamp(28px,3vw,40px)]">Reading your message</p>
      <p className="mt-3 max-w-[34ch] leading-relaxed text-muted">The hold is placed. The AI is checking whether it&apos;s worth their time.</p>
    </section>
  );
}
