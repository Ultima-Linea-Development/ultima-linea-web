import { getAdminHistoryCollection } from "@/lib/server/db";
import type { AuthContext } from "@/lib/server/auth-middleware";
import {
  adminHistoryEntryFromDoc,
  adminHistoryEntryToDoc,
  generateULID,
  type AdminHistoryAction,
  type AdminHistoryEntry,
  type AdminHistoryEntryDocument,
  type AdminHistoryResource,
} from "@/lib/server/models";

type TrackAdminActionInput = {
  auth: AuthContext;
  action: AdminHistoryAction;
  resource: AdminHistoryResource;
  resourceId: string;
  resourceLabel: string;
};

export async function trackAdminAction({
  auth,
  action,
  resource,
  resourceId,
  resourceLabel,
}: TrackAdminActionInput): Promise<void> {
  const collection = await getAdminHistoryCollection<AdminHistoryEntryDocument>();
  const entry: AdminHistoryEntry = {
    id: generateULID(),
    action,
    resource,
    resource_id: resourceId,
    resource_label: resourceLabel,
    actor_id: auth.user_id,
    actor_email: auth.email,
    actor_role: auth.role,
    created_at: new Date(),
  };

  await collection.insertOne(adminHistoryEntryToDoc(entry));
}

export function mapAdminHistoryEntry(doc: AdminHistoryEntryDocument) {
  const entry = adminHistoryEntryFromDoc(doc);
  return {
    ...entry,
    created_at: entry.created_at.toISOString(),
  };
}
