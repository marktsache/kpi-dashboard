import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const userCount = await prisma.user.count();
    const users = await prisma.user.findMany({
      select: { email: true, name: true, role: true },
    });

    return NextResponse.json({
      status: "ok",
      dbConnected: true,
      userCount,
      users,
      env: {
        hasDbUrl: !!process.env.DATABASE_URL,
        dbUrlStart: process.env.DATABASE_URL?.substring(0, 30) + "...",
        hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
        nextAuthUrl: process.env.NEXTAUTH_URL,
      },
    });
  } catch (error) {
    return NextResponse.json({
      status: "error",
      dbConnected: false,
      error: error instanceof Error ? error.message : "Unknown error",
      env: {
        hasDbUrl: !!process.env.DATABASE_URL,
        hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
        nextAuthUrl: process.env.NEXTAUTH_URL,
      },
    });
  }
}
