import clientPromise from "@/lib/mongodb";
import { ObjectId, type Filter } from "mongodb";

type DeleteUserResult = {
  deletedUser: boolean;
  devicesUnassigned: number;
  readingsDeleted: number;
  farmsDeleted: number;
  accountsDeleted: number;
  sessionsDeleted: number;
};

type UserDoc = {
  _id: ObjectId;
  email?: string;
  role?: Role;
  updatedAt?: Date;
};

type DeviceDoc = {
  deviceId?: string;
};

export type Role = "admin" | "user";

export async function setUserRole(userId: string, role: Role) {
  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB ?? "epiciot");

  const users = db.collection<UserDoc>("users");

  if (!ObjectId.isValid(userId)) {
    return { matched: 0, modified: 0 };
  }

  const result = await users.updateOne(
    { _id: new ObjectId(userId) },
    {
      $set: {
        role,
        updatedAt: new Date(),
      },
    },
  );

  return {
    matched: result.matchedCount,
    modified: result.modifiedCount,
  };
}

export async function deleteUserAndDevices(
  userId: string,
): Promise<DeleteUserResult> {
  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB ?? "epiciot");

  const users = db.collection<UserDoc>("users");
  const devices = db.collection("iot_devices");
  const readings = db.collection("sensor_readings");
  const farms = db.collection("farms");
  const accounts = db.collection<Record<string, unknown>>("accounts");
  const sessions = db.collection<Record<string, unknown>>("sessions");

  if (!ObjectId.isValid(userId)) {
    return {
      deletedUser: false,
      devicesUnassigned: 0,
      readingsDeleted: 0,
      farmsDeleted: 0,
      accountsDeleted: 0,
      sessionsDeleted: 0,
    };
  }

  const userObjectId = new ObjectId(userId);

  const user = await users.findOne({ _id: userObjectId });

  if (!user) {
    return {
      deletedUser: false,
      devicesUnassigned: 0,
      readingsDeleted: 0,
      farmsDeleted: 0,
      accountsDeleted: 0,
      sessionsDeleted: 0,
    };
  }

  const userEmail =
    typeof user.email === "string" ? user.email.toLowerCase() : "";

  const ownedDevices = await devices
    .find({
      $or: [{ userId }, ...(userEmail ? [{ claimedBy: userEmail }] : [])],
    })
    .project<DeviceDoc>({ _id: 0, deviceId: 1 })
    .toArray();

  const deviceIds = ownedDevices
    .map((d) => d.deviceId)
    .filter((id): id is string => typeof id === "string" && id.length > 0);

  const readingsDeleted =
    deviceIds.length > 0
      ? await readings.deleteMany({ deviceId: { $in: deviceIds } })
      : { deletedCount: 0 };

  const farmsDeleted = await farms.deleteMany({ ownerId: userId });

  const devicesUnassigned =
    deviceIds.length > 0
      ? await devices.updateMany(
          { deviceId: { $in: deviceIds } },
          {
            $set: {
              userId: "UNASSIGNED",
              status: "auto-registered",
              updatedAt: new Date(),
            },
            $unset: {
              farmId: "",
              claimedBy: "",
              claimedAt: "",
              installLocation: "",
            },
          },
        )
      : { modifiedCount: 0 };

  const authUserIdFilters: Filter<Record<string, unknown>>[] = [
    { userId },
    { userId: userObjectId },
  ];

  const accountsDeleted = await accounts.deleteMany({
    $or: authUserIdFilters,
  });

  const sessionsDeleted = await sessions.deleteMany({
    $or: authUserIdFilters,
  });

  const deletedUser = await users.deleteOne({ _id: userObjectId });

  return {
    deletedUser: deletedUser.deletedCount > 0,
    devicesUnassigned: devicesUnassigned.modifiedCount ?? 0,
    readingsDeleted: readingsDeleted.deletedCount ?? 0,
    farmsDeleted: farmsDeleted.deletedCount ?? 0,
    accountsDeleted: accountsDeleted.deletedCount ?? 0,
    sessionsDeleted: sessionsDeleted.deletedCount ?? 0,
  };
}
