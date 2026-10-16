import { NextResponse, type NextRequest } from "next/server";
import { getProfile } from "@/lib/auth";
import { recordViolation } from "@/lib/exam/engine";

const TYPES = new Set(["tab_hidden", "window_blur", "copy", "cut", "paste", "contextmenu"]);

export async function POST(request: NextRequest) {
  const me = await getProfile();
  if (!me || me.status !== "active") return new NextResponse(null, { status: 401 });
  let body: { attemptId?: unknown; type?: unknown; meta?: unknown };
  try {
    body = await request.json();
  } catch {
    return new NextResponse(null, { status: 400 });
  }
  if (typeof body.attemptId !== "string" || typeof body.type !== "string" || !TYPES.has(body.type)) {
    return new NextResponse(null, { status: 400 });
  }
  await recordViolation(me.id, body.attemptId, body.type, null);
  return new NextResponse(null, { status: 204 });
}
