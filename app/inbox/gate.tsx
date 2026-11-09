"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Nav from "@/components/nav";

const open = (handle: string, key: string) => `/inbox?handle=${encodeURIComponent(handle)}&key=${encodeURIComponent(key)}`;

// The inbox is private. The handle and key are remembered on this device so the Inbox tab opens straight in.
export default function KeyGate() {
  const router = useRouter();
  const [handle, setHandle] = useState("");
  const [key, setKey] = useState("");
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("toll-inbox") ?? "null");
      if (saved?.handle && saved?.key) router.replace(open(saved.handle, saved.key));
    } catch {}
  }, [router]);

  return (
    <>
      <Nav cta={false} title="Inbox" />
      <main className="app-main page-in gutter mx-auto w-full max-w-[560px] pt-8 md:pt-48">
        <p className="label">Private</p>
        <h1 className="display mt-4 text-[clamp(40px,6vw,72px)]">Your inbox is locked.</h1>
        <p className="mt-4 text-muted">Open it with the private inbox link you saved when you made your Toll, or enter your handle and key.</p>
        <form
          className="mt-8 grid gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            router.push(open(handle.trim().toLowerCase(), key.trim()));
          }}
        >
          <input className="field" autoComplete="username" autoCapitalize="none" placeholder="Handle" value={handle} onChange={(e) => setHandle(e.target.value)} />
          <input className="field" type="password" autoComplete="current-password" autoCapitalize="none" enterKeyHint="go" placeholder="Inbox key" value={key} onChange={(e) => setKey(e.target.value)} />
          <button className="btn btn-blue" disabled={!handle.trim() || !key.trim()}>
            Open inbox
          </button>
        </form>
        <p className="mt-8 text-muted">
          No Toll yet?{" "}
          <Link href="/new" className="font-bold text-blue">
            Make one in a minute
          </Link>
        </p>
      </main>
    </>
  );
}
