import { NextRequest, NextResponse } from "next/server";
import { validateToken, JwtClaims } from "./jwt";

export type AuthContext = JwtClaims;

export function jsonError(error: string, status: number): NextResponse {
  return NextResponse.json({ error }, { status });
}

export function requireAuth(request: NextRequest): AuthContext | NextResponse {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader) {
    return jsonError("Authorization header required", 401);
  }

  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer") {
    return jsonError("Invalid authorization header format", 401);
  }

  try {
    return validateToken(parts[1]);
  } catch {
    return jsonError("Invalid or expired token", 401);
  }
}

export function requireAdmin(auth: AuthContext | NextResponse): AuthContext | NextResponse {
  if (auth instanceof NextResponse) return auth;
  if (auth.role !== "admin") {
    return jsonError("Admin access required", 403);
  }
  return auth;
}

export function isNextResponse(value: unknown): value is NextResponse {
  return value instanceof NextResponse;
}
