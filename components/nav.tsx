import Link from "next/link";
import { Arrow, Logo } from "./mark";

// Desktop: a floating glass pill. Phones get the app bar (top) and the tab bar (bottom) instead.
export default function Nav({ cta = true, title }: { cta?: boolean; title?: string }) {
  return (
    <>
      <header className="nav max-md:hidden">
        <Link href="/" aria-label="Toll home">
          <Logo size={28} />
        </Link>
        <nav className="flex items-center gap-7 text-[15px] font-semibold">
          <Link href="/#how" className="link">
            How it works
          </Link>
          <Link href="/#proof" className="link">
            Why it holds
          </Link>
          {cta && (
            <span data-magnetic>
              <Link href="/dhruv" className="btn btn-blue h-11 pl-5 pr-5 text-sm">
                Write to Dhruv
                <Arrow />
              </Link>
            </span>
          )}
        </nav>
      </header>
      <header className="app-top md:hidden">
        <Link href="/" aria-label="Toll home">
          <Logo size={26} />
        </Link>
        {title && <span className="label">{title}</span>}
      </header>
    </>
  );
}
