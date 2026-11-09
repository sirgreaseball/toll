import Link from "next/link";
import Nav from "@/components/nav";
import { Arrow } from "@/components/mark";

// No default survives: a missing page or handle gets the same calm treatment as the rest of Toll, with a way on.
export default function NotFound() {
  return (
    <>
      <Nav cta={false} title="Not found" />
      <main className="app-main page-in gutter mx-auto w-full max-w-[1100px] pt-10 md:pt-48">
        <p className="label">404</p>
        <h1 className="display mt-4 max-w-[13ch] text-[clamp(44px,7vw,112px)]">No Toll lives here.</h1>
        <p className="mt-5 max-w-[44ch] text-base leading-relaxed text-muted md:text-lg">
          The link may have a typo, or the page was never made. Handles are lowercase letters, numbers and underscores.
        </p>
        <div className="mt-9 flex flex-wrap gap-3">
          <Link href="/new" className="btn btn-blue">
            Make this Toll
            <Arrow />
          </Link>
          <Link href="/" className="btn btn-ghost">
            Back home
          </Link>
        </div>
      </main>
    </>
  );
}
