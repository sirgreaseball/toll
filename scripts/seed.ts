// Creates or updates the demo profiles. Run: node --env-file=.env.local scripts/seed.ts
import { profiles } from "../lib/db.ts";

const demo = {
  dhruv: {
    name: "Dhruv Sonar",
    headline: "CS student building fintech and AI products",
    wants:
      "Internship or project offers in fintech, AI products or design engineering. Specific feedback on my projects. Hackathon collaborations with a clear plan.",
    avoids:
      "Generic recruiting blasts, crypto or token pitches, SEO and marketing services, anything that clearly did not look at my work.",
    price_cents: 300,
    charity: "GiveDirectly",
  },
  // A second page, so a pitch blasted to both shows up as a blast.
  priya: {
    name: "Priya Raman",
    headline: "Founder of Kitebird, a seed-stage payments startup",
    wants:
      "Pitches from founders building payments or fintech infrastructure. Founding-engineer candidates who have shipped real products. Specific product feedback on Kitebird.",
    avoids: "Agency and outsourcing offers, generic partnership requests, token launches, SEO services.",
    price_cents: 500,
    charity: "Khan Academy",
  },
};

for (const [handle, profile] of Object.entries(demo)) {
  await profiles().doc(handle).set(profile, { merge: true });
  console.log(`seeded profiles/${handle}`);
}
process.exit(0);
