import { getUsersCollection } from "@/lib/server/db";
import { UserDocument } from "@/lib/server/models";
import { isStaffRole } from "@/lib/roles";

export type AssignableUser = {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
};

export async function getPrimaryAdminId(): Promise<string | null> {
  const collection = await getUsersCollection<UserDocument>();
  const doc = await collection.findOne(
    {},
    { sort: { created_at: 1, _id: 1 }, projection: { _id: 1 } }
  );
  return doc?._id ?? null;
}

export async function isPrimaryAdmin(userId: string): Promise<boolean> {
  const primaryAdminId = await getPrimaryAdminId();
  return primaryAdminId !== null && primaryAdminId === userId;
}

export async function getAssignableStaffUsers(): Promise<AssignableUser[]> {
  const collection = await getUsersCollection<UserDocument>();
  const docs = await collection
    .find({ role: { $in: ["admin", "vendedor"] } })
    .sort({ first_name: 1, last_name: 1, _id: 1 })
    .project({
      _id: 1,
      email: 1,
      first_name: 1,
      last_name: 1,
      role: 1,
    })
    .toArray();

  return docs.map((doc) => ({
    id: doc._id,
    email: doc.email,
    first_name: doc.first_name,
    last_name: doc.last_name,
    role: doc.role,
  }));
}

export async function getUsersByIds(ids: string[]): Promise<AssignableUser[]> {
  const uniqueIds = [...new Set(ids.map((id) => id.trim()).filter(Boolean))];
  if (uniqueIds.length === 0) return [];

  const collection = await getUsersCollection<UserDocument>();
  const docs = await collection
    .find({ _id: { $in: uniqueIds } })
    .project({
      _id: 1,
      email: 1,
      first_name: 1,
      last_name: 1,
      role: 1,
    })
    .toArray();

  return docs.map((doc) => ({
    id: doc._id,
    email: doc.email,
    first_name: doc.first_name,
    last_name: doc.last_name,
    role: doc.role,
  }));
}

export async function isAssignableStaffUser(userId: string): Promise<boolean> {
  const collection = await getUsersCollection<UserDocument>();
  const doc = await collection.findOne({ _id: userId });
  return Boolean(doc && isStaffRole(doc.role));
}
