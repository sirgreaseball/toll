import { ImageResponse } from "next/og";
import { asProfile, profiles } from "@/lib/db";
import { usd } from "@/lib/usd";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Write to me on Toll";

// The card people see when a Toll link is pasted into a DM, a bio or a post.
export default async function Image({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const snap = await profiles().doc(handle.toLowerCase()).get();
  const p = snap.exists ? asProfile(snap) : null;
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          color: "#fff",
          background: "radial-gradient(120% 90% at 75% 0%, #0b2a7a 0%, #06143a 60%, #040d28 100%)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18, fontSize: 40, fontWeight: 800, letterSpacing: -2 }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: "linear-gradient(135deg,#2f9bff,#0070e0 55%,#003087)" }} />
          toll
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 96, fontWeight: 800, letterSpacing: -5, lineHeight: 1 }}>{p ? `Write to ${p.name}` : "Postage for your attention"}</div>
          <div style={{ marginTop: 28, fontSize: 34, color: "#bed0f5" }}>
            {p
              ? `A ${usd(p.price_cents)} refundable PayPal hold. Worth their time? You pay nothing.`
              : "Strangers pay to reach you. The good ones pay nothing."}
          </div>
        </div>
        <div style={{ display: "flex", fontSize: 26, color: "#6cc4ff", letterSpacing: 4 }}>{p ? `TOLL / ${p.handle.toUpperCase()}` : "PAYPAL HOLDS · AI JUDGE"}</div>
      </div>
    ),
    size,
  );
}
