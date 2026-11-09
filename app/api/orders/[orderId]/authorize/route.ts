import { NextResponse } from "next/server";
import { FlowError, completeHold } from "@/lib/flow";

export const maxDuration = 60;

// Called after the sender approves in PayPal (popup or redirect): place the hold, judge, release if earned.
export async function POST(_req: Request, { params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  try {
    return NextResponse.json({ token: await completeHold(orderId) });
  } catch (e) {
    if (e instanceof FlowError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error(e);
    return NextResponse.json({ error: "Something went wrong. Nothing was charged." }, { status: 500 });
  }
}
