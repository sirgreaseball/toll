# Toll: build plan

Toll gives anyone a "reach me" link with a cover charge. To send a message, a stranger places a small refundable PayPal hold (default $3). An AI judge reads the message against what the recipient said they want to hear about.

## Rules for senders (shown on every Toll page)

- If the message is worth the recipient's time, the hold is released and you pay nothing.
- If the recipient replies, the hold is released and you pay nothing.
- If the message is spam, the hold is charged and the money goes to the recipient's chosen charity.

## Money flow

1. The sender writes the message, then approves a PayPal order with `intent: AUTHORIZE`. Nothing is charged.
2. The server authorizes the order, which places the hold, then runs the AI judge.
3. Score 70-100 ("worth it"): the hold is voided at once and the message lands at the top of the inbox.
4. Score 40-69 ("your call"): the hold stays; the recipient releases it, charges it, or replies (which releases it).
5. Score 0-39 ("spam"): the hold stays; the recipient confirms the charge or releases it.
6. Planned (M2): a daily job settles anything still held before the 3-day honor period ends. "Your call" is released, "spam" is charged.

PayPal facts this depends on: a hold has a 3-day honor period and stays valid for 29 days; holds can be voided or captured.

## AI judge (lib/judge.ts)

- Gemini free tier with JSON-schema output. Each model has its own ~20 requests/day quota, so the judge tries five Flash models in order (10s each, 45s total). Output: score, one-line summary, reasons that point at the message, flags, and coaching for the sender.
- The recipient's "wants" and "avoids" are the rubric.
- The message is treated as untrusted data. Attempts to steer the judge get the `prompt_injection` flag and are forced to spam.
- Copy-paste blasts: the server hashes each message body (greeting and digits removed). The same body sent to another Toll page in the last 7 days is forced to spam with the `mass_blast` flag.
- If the judge fails, the hold stays and the recipient decides. Toll never charges because of an AI failure.
- `scripts/judge-check.ts` runs seven fixed cases and fails if a verdict is wrong.

## Stack

Next.js 16 (App Router, TypeScript, Tailwind 4) on Vercel, Firebase Firestore (server-side through firebase-admin; client rules deny everything), Gemini API (`@google/genai`, free tier), PayPal REST (Orders v2 + Payments v2) called with `fetch`, PayPal JS SDK buttons (`@paypal/react-paypal-js`).

## Milestones

- **M1, Oct 27-29: core loop.** Toll page, PayPal hold, judge, status page, demo inbox. (In progress)
- **M2, Oct 30-Nov 3: real product.** Firebase Auth sign-in, settings page (handle, price, wants/avoids, charity), the daily settle job, sender emails.
- **M3, Nov 4-8: design and demo.** Landing page and motion pass, seeded demo data, deploy to Vercel.
- **M4, Nov 9-12: submission.** Demo video, Devpost write-up, buffer.

## Setup checklist

- [ ] PayPal sandbox app: client ID and secret in `.env.local` (see `.env.example`).
- [ ] Gemini API key (`GEMINI_API_KEY`) in `.env.local`.
- [ ] Firebase project with Firestore (production mode), service account JSON in `FIREBASE_SERVICE_ACCOUNT`, then `node --env-file=.env.local scripts/seed.ts`.

## Status (Oct 27)

- M1 core loop verified end to end in the PayPal sandbox: checkout approved, $3 hold placed, judge scored 95 ("worth it"), hold released automatically, status page and inbox correct.
- `scripts/paypal-check.ts` passes: hold order created, hold placed and released, hold placed and charged (`COMPLETED`).
- `scripts/judge-check.ts`: every verdict Gemini returned was correct; failures were only free-tier quota or overload errors.
- PayPal merchant must be the US sandbox app "Toll". The India default accounts reject USD (`UNSUPPORTED_PAYEE_CURRENCY`) and can't process cards.
- The PayPal popup can't open inside the Claude desktop app's browser pane; it works in Chrome. Record the demo in Chrome.
- Added Oct 27, verified end to end in the sandbox:
  - **Verified by PayPal:** the payer's PayPal name, country and verification status (from the authorize response) are shown to the recipient and the sender.
  - **Reworded blasts:** the judge writes a neutral pitch line ("<who> offers <what>; wants <what>"). Toll embeds it (`gemini-embedding-2`, 256 dims) and compares it with the last 7 days of messages to other pages; cosine ≥ 0.85 counts as the same pitch and forces spam. A reworded outsourcing pitch sent to Priya, then Dhruv, was caught. `judge-check.ts --pitch` and `--meaning` test this.
  - **Trusted senders:** two or more "worth it" or replied messages and no spam, by PayPal payer ID, means the hold is released at once. The logic is in the authorize route; not yet tested end to end, because the sandbox test buyer now has spam history from these tests.
- Design pass (pulled forward from M3, Oct 27): vault-glass design system ([DESIGN.md](DESIGN.md)), logo and favicon, once-per-session splash, scroll-scrubbed landing story (Lenis + GSAP), restyled Toll page, status page and inbox. Verified at 1366px and 390px in Playwright. Not yet verified: reduced-motion view, frame times, Lighthouse.
- Code lives in the private repo github.com/sirgreaseball/toll (branch `master`). Make it public at submission.
- Next (M2): a redirect fallback for in-app browsers (Instagram and LinkedIn open bio links in webviews where popups fail), the settle job, Firebase Auth sign-in and the settings page.

## Known simplifications (M1)

- The inbox is one demo profile behind a shared key (`INBOX_KEY`). Firebase Auth replaces this in M2.
- Charged holds are captured to the Toll sandbox merchant account and shown as donated. A real launch would route them through PayPal Giving Fund or Payouts.

- Deployed Oct 27: https://toll-rho.vercel.app (Vercel project `toll`, sandbox PayPal keys in production env). Deploy with `npx vercel deploy --prod`. Repo stays private until submission.

## Status (Nov 9)

- Added: make-your-own Toll (`/new`, per-page hashed inbox keys), agent API (`/api/v1`, `/agents`, `llms.txt`) with PayPal redirect checkout and return page `/r`, in-app browser fallback, daily auto-settle cron (`/api/settle`, `CRON_SECRET`), Toll share cards.
- Verified on a local production build: signup, duplicate and reserved handles rejected, inbox opens only with the right key, agent GET/POST/poll, redirect order returns an approval link, settle rejects without the secret. Deployed and the live routes return 200.
- Not verified: a full redirect checkout approved in PayPal and the cron's first real run.
- Submission kit: [SUBMISSION.md](SUBMISSION.md).

## Status (Nov 10)

- Two code reviews (high, then max) found 25 issues; all fixed and deployed. Recorded real sandbox flows for the demo video (worth it 95 released, blast 5 charged, agent 95 released).
- Demo video: https://youtu.be/uhGFZcTyey8 (public, 2:33, built with Remotion in ../toll-video from screen captures of the live site; original generated audio).
- Devpost draft filled: story, links, tech tags, video, 6 gallery images, testing steps. Left for Dhruv: personal/eligibility answers, terms checkbox, Submit, and making this repo public.
- Nov 10, post-submission QA pass: hostile-input probe on every route, page crawl on desktop/phone/reduced motion, interaction suite (25 checks), real sandbox runs of reply, release, abandoned-approval recovery and the settle job. Fixed: 500s on bad handles/ids, Next default 404, long-text overflow, PayPal button cover under the iframe, popup-close message, sheet Escape/focus, judge self-labelling blasts, control-character spoofing, frame headers, private fields in the inbox payload, `_` handles. QA scripts live in ../toll-video (qa.mjs, qa2.mjs, qa4.mjs).
