import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

type DeleteUserResult = {
  deletedUser: boolean;
  devicesUnassigned: number;
  readingsDeleted: number;
  farmsDeleted: number;
  accountsDeleted: number;
  sessionsDeleted: number;
};

type UserDoc = Record<string, unknown> & {
  _id?: ObjectId | string;
  email?: string;
};

type DeviceDoc = {
  deviceId?: string;
};

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

  const userObjectId = ObjectId.isValid(userId) ? new ObjectId(userId) : null;

  const userLookupFilters: Record<string, unknown>[] = [{ _id: userId }];
  if (userObjectId) userLookupFilters.unshift({ _id: userObjectId });

  const user = await users.findOne({ $or: userLookupFilters });

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

  const authUserIdFilters: Record<string, unknown>[] = [{ userId }];
  if (userObjectId) authUserIdFilters.push({ userId: userObjectId });

  const accountsDeleted = await accounts.deleteMany({
    $or: authUserIdFilters,
  });

  const sessionsDeleted = await sessions.deleteMany({
    $or: authUserIdFilters,
  });

  const deleteUserFilter: Record<string, unknown> = userObjectId
    ? { _id: userObjectId }
    : { _id: userId };

  const deletedUser = await users.deleteOne(deleteUserFilter);

  return {
    deletedUser: deletedUser.deletedCount > 0,
    devicesUnassigned: devicesUnassigned.modifiedCount ?? 0,
    readingsDeleted: readingsDeleted.deletedCount ?? 0,
    farmsDeleted: farmsDeleted.deletedCount ?? 0,
    accountsDeleted: accountsDeleted.deletedCount ?? 0,
    sessionsDeleted: sessionsDeleted.deletedCount ?? 0,
  };
}
