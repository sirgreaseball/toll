import Link from "next/link";
import Nav from "@/components/nav";

export const metadata = {
  title: "Toll for AI agents",
  description: "AI agents can reach a person through Toll by drafting a message and having their human approve a refundable PayPal hold.",
};

const STEPS = [
  {
    n: "01",
    title: "Read the Toll",
    body: "Fetch what the person wants to hear about and what to skip. That is exactly what the AI will judge your message against.",
    code: `GET /api/v1/tolls/dhruv

{ "name": "Dhruv Sonar", "wants": "...", "avoids": "...",
  "price": { "value": "3.00", "currency": "USD", "kind": "refundable PayPal hold" },
  "send": { "method": "POST", "url": ".../api/v1/tolls/dhruv/messages" } }`,
  },
  {
    n: "02",
    title: "Draft and send",
    body: "Post the message with your agent's name and who it works for. Toll opens a PayPal hold order and returns an approval link.",
    code: `POST /api/v1/tolls/dhruv/messages
{ "sender_name": "Maya Chen", "sender_email": "maya@studio.dev",
  "subject": "Design-engineering internship",
  "body": "Hi Dhruv, I run design engineering at ...",
  "agent": { "name": "Scout", "operator": "Studio Recruiting" } }

201 { "approve_url": "https://www.sandbox.paypal.com/checkoutnow?token=...",
      "status_url": ".../api/v1/messages/<token>" }`,
  },
  {
    n: "03",
    title: "A human approves the hold",
    body: "Hand approve_url to the person or company paying. Nothing is sent until they approve in PayPal. An agent can never spend money on its own.",
    code: null,
  },
  {
    n: "04",
    title: "Poll for the verdict",
    body: "Worth it: the hold is voided and nobody pays. Spam the recipient confirms, or a detected mass blast, goes to the recipient's charity. Coaching tells the agent how to do better next time.",
    code: `GET /api/v1/messages/<token>

{ "status": "released", "verdict": "worth_it", "score": 95,
  "summary": "...", "reply": null, "trusted_sender": false }`,
  },
];

// Agentic commerce, with a human in the loop: agents draft and pay a refundable bond; people approve the money.
export default function Agents() {
  return (
    <>
      <Nav cta={false} title="Agents" />
      <main className="app-main page-in gutter mx-auto w-full max-w-[1100px] pt-3 md:pb-32 md:pt-40">
        <p className="label max-md:hidden">Toll for AI agents</p>
        <h1 className="display max-w-[14ch] text-[clamp(40px,6vw,96px)] md:mt-5">Agents can knock. They pay too.</h1>
        <p className="mt-5 max-w-[52ch] text-base leading-relaxed text-muted md:text-lg">
          AI sales and recruiting agents are about to send people a lot of messages. Toll gives them a door: read what the person
          wants, send one message, and put a refundable PayPal hold behind it. Every message an agent sends is labelled with
          the agent and who it works for.
        </p>
        <ol className="mt-12 grid gap-4 md:mt-16">
          {STEPS.map((s) => (
            <li key={s.n} className="bezel">
              <div className="core grid gap-5 p-5 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.3fr)] md:gap-10 md:p-8">
                <div>
                  <p className="num text-[13px] text-blue">{s.n}</p>
                  <h2 className="mt-2 text-[clamp(22px,2.2vw,30px)] font-extrabold tracking-[-0.03em]">{s.title}</h2>
                  <p className="mt-3 leading-relaxed text-muted">{s.body}</p>
                </div>
                {s.code && (
                  <pre className="num whitespace-pre-wrap break-words rounded-2xl bg-stage p-5 text-[12.5px] leading-relaxed text-[#cfe0ff]">
                    <code>{s.code}</code>
                  </pre>
                )}
              </div>
            </li>
          ))}
        </ol>
        <p className="mt-10 text-muted">
          Machine-readable summary at{" "}
          <Link href="/llms.txt" className="font-bold text-blue">
            /llms.txt
          </Link>
          . Sandbox only: no real money moves.
        </p>
      </main>
    </>
  );
}
