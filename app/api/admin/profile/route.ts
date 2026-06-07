import { NextRequest, NextResponse } from "next/server";
import { ensureIndexes, getUsersCollection } from "@/lib/server/db";
import { UserDocument, userFromDoc } from "@/lib/server/models";
import {
  isNextResponse,
  jsonError,
  requireAdmin,
  requireAuth,
} from "@/lib/server/auth-middleware";

export async function GET(request: NextRequest) {
  const auth = requireAdmin(requireAuth(request));
  if (isNextResponse(auth)) return auth;

  try {
    await ensureIndexes();

    const collection = await getUsersCollection<UserDocument>();
    const doc = await collection.findOne({ _id: auth.user_id });

    if (!doc) {
      return jsonError("User not found", 404);
    }

    const user = userFromDoc(doc);
    const { password: _, ...safeUser } = user;
    return NextResponse.json(safeUser);
  } catch {
    return jsonError("Failed to fetch profile", 500);
  }
}

export async function PUT(request: NextRequest) {
  const auth = requireAdmin(requireAuth(request));
  if (isNextResponse(auth)) return auth;

  try {
    await ensureIndexes();

    const updates = await request.json();
    const collection = await getUsersCollection<UserDocument>();

    const result = await collection.updateOne(
      { _id: auth.user_id },
      {
        $set: {
          first_name: updates.first_name ?? "",
          last_name: updates.last_name ?? "",
          phone: updates.phone ?? "",
          updated_at: new Date(),
        },
      }
    );

    if (result.matchedCount === 0) {
      return jsonError("User not found", 404);
    }

    const doc = await collection.findOne({ _id: auth.user_id });
    if (!doc) {
      return jsonError("Failed to fetch updated user", 500);
    }

    const user = userFromDoc(doc);
    const { password: _, ...safeUser } = user;
    return NextResponse.json(safeUser);
  } catch {
    return jsonError("Failed to update profile", 500);
  }
}
