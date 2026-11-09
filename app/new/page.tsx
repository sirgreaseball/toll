import Nav from "@/components/nav";
import { CHARITIES } from "@/lib/db";
import Create from "./create";

export const metadata = { title: "Make your Toll" };

export default function NewToll() {
  return (
    <>
      <Nav cta={false} title="New Toll" />
      <main className="app-main page-in gutter mx-auto grid w-full max-w-[1400px] gap-8 pt-3 md:grid-cols-[minmax(0,1fr)_minmax(0,600px)] md:gap-16 md:pb-24 md:pt-40">
        <section>
          <p className="label max-md:hidden">New Toll</p>
          <h1 className="display text-[clamp(40px,6vw,96px)] md:mt-5">Put a price on your attention.</h1>
          <p className="mt-5 max-w-[40ch] text-base leading-relaxed text-muted md:text-lg">
            Say what you want to hear about and what to skip. Strangers who write to you place a small PayPal hold. Good messages
            cost them nothing; spam pays your charity.
          </p>
          <ol className="mt-10 hidden max-w-[44ch] space-y-3 text-muted md:block">
            {["Pick a handle: your link is toll-rho.vercel.app/handle.", "Your wants and avoids are what the AI judges against.", "You get a private inbox link. Save it: it is shown once."].map(
              (t, i) => (
                <li key={t} className="grid grid-cols-[2.5rem_1fr]">
                  <span className="num text-[13px] text-blue">0{i + 1}</span>
                  {t}
                </li>
              ),
            )}
          </ol>
        </section>
        <Create charities={[...CHARITIES]} />
      </main>
    </>
  );
}
