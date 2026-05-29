// lib/users.ts
import clientPromise from "@/lib/mongodb";
import { ObjectId, type Collection } from "mongodb";

export type Role = "admin" | "user";

export interface UserDoc {
  _id: ObjectId;
  email: string;
  name?: string | null;
  image?: string | null;
  role?: Role;
}

const DB_NAME = process.env.MONGODB_DB ?? "epiciot";

async function usersCollection(): Promise<Collection<UserDoc>> {
  const client = await clientPromise;
  return client.db(DB_NAME).collection<UserDoc>("users");
}

/** List all users (you can add pagination later) */
export async function listUsers(): Promise<UserDoc[]> {
  const col = await usersCollection();
  const users = await col
    .find({}, { projection: { email: 1, name: 1, image: 1, role: 1 } })
    .sort({ createdAt: -1 })
    .toArray();
  return users;
}

/** Update a user's role */
export async function setUserRole(userId: string, role: Role): Promise<void> {
  const col = await usersCollection();

  let _id: ObjectId;
  try {
    _id = new ObjectId(userId);
  } catch {
    throw new Error("Invalid user id");
  }

  await col.updateOne(
    { _id },
    {
      $set: {
        role,
      },
    }
  );
}

/**
 * Delete a user, their claimed devices, and their NextAuth adapter records
 * (accounts and sessions collections).
 */
export async function deleteUserAndDevices(userId: string): Promise<{
  deletedUser: number;
  deletedDevices: number;
}> {
  const client = await clientPromise;
  const db = client.db(DB_NAME);

  const usersCol = db.collection<UserDoc>("users");
  const devicesCol = db.collection("devices");
  const accountsCol = db.collection("accounts");
  const sessionsCol = db.collection("sessions");

  let _id: ObjectId;
  try {
    _id = new ObjectId(userId);
  } catch {
    throw new Error("Invalid user id");
  }

  const userRes = await usersCol.deleteOne({ _id });
  const devicesRes = await devicesCol.deleteMany({ userId });
  // NextAuth adapter stores userId as the stringified ObjectId
  await accountsCol.deleteMany({ userId });
  await sessionsCol.deleteMany({ userId });

  return {
    deletedUser: userRes.deletedCount ?? 0,
    deletedDevices: devicesRes.deletedCount ?? 0,
  };
}

/**
 * Returns true if the given user is the only admin in the system.
 * Used to prevent the last admin from deleting their own account.
 */
export async function isLastAdmin(userId: string): Promise<boolean> {
  const col = await usersCollection();
  const adminCount = await col.countDocuments({ role: "admin" });
  if (adminCount !== 1) return false;

  let _id: ObjectId;
  try {
    _id = new ObjectId(userId);
  } catch {
    return false;
  }

  const doc = await col.findOne({ _id }, { projection: { role: 1 } });
  return doc?.role === "admin";
}
