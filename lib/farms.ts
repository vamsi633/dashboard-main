// lib/farms.ts
import clientPromise from "@/lib/mongodb";
import { ObjectId, type Collection } from "mongodb";

const DB_NAME = process.env.MONGODB_DB ?? "epiciot";

export interface FarmDoc {
  _id: ObjectId;
  ownerId: string; // session.user.id (stringified Mongo _id)
  name: string;
  description?: string | null;
  location?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

async function farmsCollection(): Promise<Collection<FarmDoc>> {
  const client = await clientPromise;
  return client.db(DB_NAME).collection<FarmDoc>("farms");
}

/**
 * Create a farm for a specific user.
 */
export async function createFarm(params: {
  ownerId: string;
  name: string;
  description?: string;
  location?: string;
}): Promise<FarmDoc> {
  const col = await farmsCollection();
  const now = new Date();

  const doc: Omit<FarmDoc, "_id"> = {
    ownerId: params.ownerId,
    name: params.name.trim(),
    description: params.description?.trim() || null,
    location: params.location?.trim() || null,
    createdAt: now,
    updatedAt: now,
  };

  const { insertedId } = await col.insertOne(doc as FarmDoc);
  return {
    _id: insertedId,
    ...doc,
  };
}

/**
 * List all farms owned by a given user.
 */
export async function listFarmsForUser(ownerId: string): Promise<FarmDoc[]> {
  const col = await farmsCollection();
  return col.find({ ownerId }).sort({ createdAt: 1 }).toArray();
}

/**
 * Optionally, later: get a single farm by id and ensure it belongs to user.
 */
export async function getFarmForUser(params: {
  farmId: string;
  ownerId: string;
}): Promise<FarmDoc | null> {
  const col = await farmsCollection();
  let _id: ObjectId;
  try {
    _id = new ObjectId(params.farmId);
  } catch {
    return null;
  }

  return col.findOne({ _id, ownerId: params.ownerId });
}
