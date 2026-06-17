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

export interface DeleteUserResult {
  found: boolean;
  deletedUser: number;
  deletedFarms: number;
  deletedDevices: number;
}

/**
 * Delete a user, their farms, devices, and NextAuth adapter records.
 * Delete flow: farms/devices → accounts/sessions → user
 */
export async function deleteUserAndDevices(userId: string): Promise<DeleteUserResult> {
  const client = await clientPromise;
  const db = client.db(DB_NAME);

  const usersCol   = db.collection<UserDoc>("users");
  const farmsCol   = db.collection("farms");
  const devicesCol = db.collection("iot_devices");
  const accountsCol = db.collection("accounts");
  const sessionsCol = db.collection("sessions");

  let _id: ObjectId;
  try {
    _id = new ObjectId(userId);
  } catch {
    throw new Error("Invalid user id");
  }

  // Step 1: check user exists
  const user = await usersCol.findOne({ _id }, { projection: { _id: 1 } });
  if (!user) {
    return { found: false, deletedUser: 0, deletedFarms: 0, deletedDevices: 0 };
  }

  // Step 2 & 3: delete farms and devices (checked implicitly by deleteMany count)
  const [farmsRes, devicesRes] = await Promise.all([
    farmsCol.deleteMany({ ownerId: userId }),
    devicesCol.deleteMany({ userId }),
  ]);

  // Delete NextAuth OAuth links and sessions
  await Promise.all([
    accountsCol.deleteMany({ userId }),
    sessionsCol.deleteMany({ userId }),
  ]);

  // Delete the user last
  const userRes = await usersCol.deleteOne({ _id });

  return {
    found: true,
    deletedUser: userRes.deletedCount ?? 0,
    deletedFarms: farmsRes.deletedCount ?? 0,
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
