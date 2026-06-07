import { NextRequest, NextResponse } from "next/server";
import { ensureIndexes, getUsersCollection } from "@/lib/server/db";
import { generateToken } from "@/lib/server/jwt";
import { checkPassword } from "@/lib/server/password";
import { UserDocument, userFromDoc } from "@/lib/server/models";
import { jsonError } from "@/lib/server/auth-middleware";

export async function POST(request: NextRequest) {
  try {
    await ensureIndexes();

    const body = await request.json();
    const email = body?.email?.trim();
    const password = body?.password;

    if (!email || !password) {
      return jsonError("email and password are required", 400);
    }

    const collection = await getUsersCollection<UserDocument>();
    const doc = await collection.findOne({ email });

    if (!doc) {
      return jsonError("Invalid email or password", 401);
    }

    if (!doc.password) {
      return jsonError("Invalid email or password", 401);
    }

    const valid = await checkPassword(password, doc.password);
    if (!valid) {
      return jsonError("Invalid email or password", 401);
    }

    const user = userFromDoc(doc);
    const token = generateToken(user.id, user.email, user.role);

    const { password: _, ...safeUser } = user;
    return NextResponse.json({ token, user: safeUser });
  } catch {
    return jsonError("Failed to generate token", 500);
  }
}
