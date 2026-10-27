"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const I = { fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round", strokeLinejoin: "round" } as const;
const TABS = [
  {
    href: "/",
    label: "Home",
    match: (p: string) => p === "/",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" {...I}>
        <path d="M4 11 12 4l8 7v8a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z" />
      </svg>
    ),
  },
  {
    href: "/dhruv",
    label: "Write",
    match: (p: string) => p === "/dhruv" || p.startsWith("/s/"),
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" {...I}>
        <path d="M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4" />
      </svg>
    ),
  },
  {
    href: "/inbox",
    label: "Inbox",
    match: (p: string) => p.startsWith("/inbox"),
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" {...I}>
        <path d="M4 13l2.5-7h11L20 13v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1zM4 13h4.5l1 2h5l1-2H20" />
      </svg>
    ),
  },
];

// Phones only. A native-style tab bar: glass, safe-area aware, with a pill that slides to the active tab.
export default function TabBar() {
  const path = usePathname();
  const active = Math.max(0, TABS.findIndex((t) => t.match(path)));
  return (
    <nav className="tabbar md:hidden" aria-label="Main">
      <span className="tab-pill" aria-hidden="true" style={{ transform: `translateX(${active * 100}%)` }} />
      {TABS.map((t, i) => (
        <Link key={t.href} href={t.href} className="tab" aria-current={i === active ? "page" : undefined} prefetch>
          {t.icon}
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
