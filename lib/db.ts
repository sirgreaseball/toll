import { createHash } from "node:crypto";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import type { Payer } from "./paypal";

// Server-only: the service account bypasses Firestore rules, so never import this from a client component.
function db() {
  if (!getApps().length) {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!raw) throw new Error("FIREBASE_SERVICE_ACCOUNT missing");
    initializeApp({ credential: cert(JSON.parse(raw)) });
    getFirestore().settings({ ignoreUndefinedProperties: true });
  }
  return getFirestore();
}

export const profiles = () => db().collection("profiles"); // doc id = handle
export const messages = () => db().collection("messages");

// Copy-paste blasts hash the same: the greeting, digits and spacing are dropped first.
export function blastHash(body: string) {
  const core = body
    .toLowerCase()
    .replace(/^\s*(hi|hello|hey|dear|greetings)\b[^,\n]*[,\n]/, "")
    .replace(/\d+/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return createHash("sha256").update(core).digest("hex");
}

export type Profile = {
  handle: string;
  name: string;
  headline: string | null;
  wants: string;
  avoids: string;
  price_cents: number;
  charity: string;
};

export type Message = {
  id: string;
  profile_handle: string;
  sender_name: string;
  sender_email: string;
  subject: string;
  body: string;
  body_hash: string;
  amount_cents: number;
  status: "pending" | "held" | "released" | "charged" | "failed";
  paypal_order_id?: string;
  authorization_id?: string;
  verdict?: "worth_it" | "borderline" | "spam";
  score?: number;
  summary?: string;
  reasons?: string[];
  flags?: string[];
  coaching?: string;
  reply?: string;
  payer?: Payer;
  trusted?: boolean; // the payer's earlier messages earned it, so the hold was released at once
  blast_copies?: number; // same or reworded message sent to other Toll pages in the last 7 days
  pitch?: string; // the judge's neutral one-line offer, compared across pages to catch reworded blasts
  embedding?: number[];
  embedding_model?: string;
  judge_model?: string;
  status_token: string;
  created_at: string;
  resolved_at?: string;
};

type Snap = { id: string; data(): unknown };
export const asProfile = (s: Snap) => ({ ...(s.data() as object), handle: s.id }) as Profile;
export const asMessage = (s: Snap) => ({ ...(s.data() as object), id: s.id }) as Message;
