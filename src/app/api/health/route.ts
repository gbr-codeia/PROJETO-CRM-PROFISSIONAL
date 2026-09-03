import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ success: true, data: { status: "ok", db: "up" } });
  } catch {
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL", message: "database unreachable" } },
      { status: 503 },
    );
  }
}
