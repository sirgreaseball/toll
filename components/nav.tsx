"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Logo } from "./mark";

export default function Nav({ cta = true }: { cta?: boolean }) {
  const [solid, setSolid] = useState(false);
  useEffect(() => {
    const update = () => setSolid(window.scrollY > 24);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  return (
    <header className="nav" data-solid={solid}>
      <Link href="/" aria-label="Toll home">
        <Logo size={26} />
      </Link>
      <nav className="flex items-center gap-6 text-[15px]">
        <Link href="/#how" className="link hidden sm:inline">
          How it works
        </Link>
        {cta && (
          <span data-magnetic>
            <Link href="/dhruv" className="btn btn-brass h-10 px-4 text-sm">
              Write to Dhruv
            </Link>
          </span>
        )}
      </nav>
    </header>
  );
}
