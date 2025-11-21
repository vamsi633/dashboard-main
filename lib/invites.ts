// lib/invites.ts
import crypto from "crypto";
import clientPromise from "@/lib/mongodb";
import { ObjectId, type Collection } from "mongodb";

export type InviteStatus = "pending" | "used" | "revoked";
export type Role = "admin" | "user";

export interface InviteDoc {
  _id?: ObjectId; // optional on insert
  email: string; // lowercased
  tokenHash: string; // sha256(rawToken), never store raw token
  createdBy: ObjectId | string;
  createdAt: Date;
  expiresAt: Date;
  usedAt: Date | null;
  status: InviteStatus;
  role?: Role; // default "user"
}

/* ----------------- internals ----------------- */

function dbName() {
  return process.env.MONGODB_DB ?? "epiciot";
}

export async function invitesCollection(): Promise<Collection<InviteDoc>> {
  const client = await clientPromise;
  return client.db(dbName()).collection<InviteDoc>("invites");
}

function normalizeId(id: string): ObjectId | string {
  try {
    return new ObjectId(id);
  } catch {
    return id;
  }
}

export function generateInviteToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString("hex");
}

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/* ----------------- indexes (idempotent) ----------------- */

export async function ensureInviteIndexes(): Promise<{
  ok: true;
  created?: Record<string, string>;
}> {
  const col = await invitesCollection();

  const created: Record<string, string> = {};
  created.tokenHash = await col.createIndex(
    { tokenHash: 1 },
    { unique: true, name: "uniq_tokenHash" }
  );
  created.email = await col.createIndex({ email: 1 }, { name: "idx_email" });
  created.expiresAt = await col.createIndex(
    { expiresAt: 1 },
    { name: "idx_expiresAt" }
  );

  return { ok: true, created };
}

/* ----------------- main ops ----------------- */

/**
 * Create an invite and return the raw token (for email),
 * along with some metadata. We never store raw token.
 */
export async function createInvite(params: {
  email: string;
  createdBy: string; // admin userId
  expiresInDays?: number;
  role?: Role; // default "user"
}): Promise<{
  token: string; // raw token to put in the URL
  expiresAt: Date;
  role: Role;
  inviteId: string;
}> {
  const { email, createdBy, expiresInDays = 7, role = "user" } = params;

  const col = await invitesCollection();
  const token = generateInviteToken();
  const tokenHash = hashToken(token);
  const now = new Date();
  const expiresAt = new Date(
    now.getTime() + expiresInDays * 24 * 60 * 60 * 1000
  );

  const doc: InviteDoc = {
    email: email.toLowerCase().trim(),
    tokenHash,
    createdBy: normalizeId(createdBy),
    createdAt: now,
    expiresAt,
    usedAt: null,
    status: "pending",
    role,
  };

  const insert = await col.insertOne(doc);
  return { token, expiresAt, role, inviteId: insert.insertedId.toString() };
}

/** Validate an invite from token+email (pending & not expired). */
export async function verifyInvite(token: string, email: string) {
  const col = await invitesCollection();
  const doc = await col.findOne({
    tokenHash: hashToken(token),
    email: email.toLowerCase().trim(),
    status: "pending",
    expiresAt: { $gt: new Date() },
  });
  return doc; // may be null
}

/** Mark an invite as used. */
export async function markInviteUsed(inviteId: ObjectId) {
  const col = await invitesCollection();
  await col.updateOne(
    { _id: inviteId },
    { $set: { status: "used", usedAt: new Date() } }
  );
}

/** Revoke an invite (admin action). */
export async function revokeInvite(inviteId: ObjectId) {
  const col = await invitesCollection();
  await col.updateOne(
    { _id: inviteId },
    { $set: { status: "revoked", usedAt: new Date() } }
  );
}
