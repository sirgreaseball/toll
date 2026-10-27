"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Nav from "@/components/nav";

// The inbox is private. The key is remembered on this device so the Inbox tab opens straight in.
export default function KeyGate() {
  const router = useRouter();
  const [key, setKey] = useState("");
  const open = (k: string) => {
    try {
      localStorage.setItem("toll-key", k);
    } catch {}
    router.push(`/inbox?key=${encodeURIComponent(k)}`);
  };
  useEffect(() => {
    try {
      const k = localStorage.getItem("toll-key");
      if (k) router.replace(`/inbox?key=${encodeURIComponent(k)}`);
    } catch {}
  }, [router]);

  return (
    <>
      <Nav cta={false} title="Inbox" />
      <main className="app-main page-in gutter mx-auto w-full max-w-[560px] pt-8 md:pt-48">
        <p className="label">Private</p>
        <h1 className="display mt-4 text-[clamp(40px,6vw,72px)]">Your inbox is locked.</h1>
        <p className="mt-4 text-muted">Enter the inbox key to read what strangers sent you.</p>
        <form
          className="mt-8 grid gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (key.trim()) open(key.trim());
          }}
        >
          <input className="field" type="password" autoComplete="off" autoCapitalize="none" enterKeyHint="go" placeholder="Inbox key" value={key} onChange={(e) => setKey(e.target.value)} />
          <button className="btn btn-blue" disabled={!key.trim()}>
            Open inbox
          </button>
        </form>
      </main>
    </>
  );
}
