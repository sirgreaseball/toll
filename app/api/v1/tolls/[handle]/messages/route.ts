import { NextResponse } from "next/server";
import { getProfile } from "@/lib/db";
import { MessageInput, startMessage } from "@/lib/flow";
import { allow } from "@/lib/limit";

// Agent API: an AI agent drafts the message; a human (the person or company it works for) approves the hold
// in PayPal at `approve_url`. The agent then polls `status_url` for the verdict and any reply.
export async function POST(req: Request, { params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const parsed = MessageInput.required({ agent: true }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid message.", issues: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`) },
      { status: 400 },
    );
  }
  if (!(await allow(req, "msg", 60))) return NextResponse.json({ error: "Too many messages from this network. Try again in an hour." }, { status: 429 });
  const profile = await getProfile(handle);
  if (!profile) return NextResponse.json({ error: "No Toll page with that handle." }, { status: 404 });

  const origin = new URL(req.url).origin;
  try {
    const m = await startMessage(profile, parsed.data, origin, true);
    return NextResponse.json(
      {
        message_id: m.messageId,
        status: "awaiting_approval",
        approve_url: m.approveUrl,
        status_url: `${origin}/api/v1/messages/${m.statusToken}`,
        status_page: `${origin}/s/${m.statusToken}`,
        next: "Send approve_url to the human paying for this message. Nothing is sent until they approve the hold in PayPal.",
      },
      { status: 201 },
    );
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "PayPal is unavailable right now. Try again in a minute." }, { status: 502 });
  }
}
