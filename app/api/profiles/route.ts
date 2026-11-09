import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { CHARITIES, hashKey, profiles } from "@/lib/db";
import { allow } from "@/lib/limit";

// Handles live at the site root, so app routes and obvious impostors are off limits.
const RESERVED = new Set(["api", "inbox", "new", "r", "s", "agents", "about", "admin", "paypal", "toll", "settings", "login", "signup", "help"]);

const Body = z.object({
  handle: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9_]{3,24}$/, "Handles are 3 to 24 letters, numbers or underscores."),
  name: z.string().trim().min(2).max(60),
  headline: z.string().trim().max(120).optional(),
  wants: z.string().trim().min(20, "Say a little more about what you want to hear.").max(600),
  avoids: z.string().trim().min(10, "Say a little more about what to skip.").max(600),
  price_cents: z.number().int().min(100).max(2000),
  charity: z.enum(CHARITIES),
});

// Creates a Toll page. The private inbox key is returned once and only its hash is stored.
export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Check the form." }, { status: 400 });
  const { handle, headline, ...rest } = parsed.data;
  if (RESERVED.has(handle)) return NextResponse.json({ error: "That handle is taken." }, { status: 409 });

  if (!(await allow(req, "page", 5))) return NextResponse.json({ error: "Too many new pages from this network. Try again in an hour." }, { status: 429 });

  const key = randomBytes(18).toString("base64url");
  try {
    // create() fails if the document exists, so two people can never claim the same handle.
    await profiles().doc(handle).create({ ...rest, headline: headline || null, key_hash: hashKey(key), created_at: new Date().toISOString() });
  } catch {
    return NextResponse.json({ error: "That handle is taken." }, { status: 409 });
  }
  return NextResponse.json({ handle, key });
}
