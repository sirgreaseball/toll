"use client";

import Link from "next/link";

// Something broke on our side (the database or PayPal didn't answer). Say so plainly, offer a retry, never trap.
export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="app-main page-in gutter mx-auto w-full max-w-[1100px] pt-10 md:pt-48">
      <p className="label">Something went wrong</p>
      <h1 className="display mt-4 max-w-[14ch] text-[clamp(40px,6vw,96px)]">That didn&apos;t load.</h1>
      <p className="mt-5 max-w-[44ch] text-base leading-relaxed text-muted md:text-lg">
        A service Toll depends on didn&apos;t answer in time. Nothing was charged. Try again in a moment.
      </p>
      <div className="mt-9 flex flex-wrap gap-3">
        <button onClick={reset} className="btn btn-blue">
          Try again
        </button>
        <Link href="/" className="btn btn-ghost">
          Back home
        </Link>
      </div>
    </main>
  );
}
