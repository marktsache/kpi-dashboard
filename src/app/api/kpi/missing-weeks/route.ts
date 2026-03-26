import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

const MONTH_NAMES = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const employees = await prisma.employee.findMany({
      where: { active: true },
      select: { id: true, name: true, startDate: true },
    });

    if (employees.length === 0) {
      return NextResponse.json({ count: 0, details: [] });
    }

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-11

    // Get all entries for the current year
    const entries = await prisma.kpiEntry.findMany({
      where: {
        date: {
          gte: new Date(currentYear, 0, 1),
          lte: now,
        },
        employee: { active: true },
      },
      select: {
        employeeId: true,
        date: true,
        profile: true,
        deals: true,
        eintritte: true,
        austritte: true,
      },
    });

    // Track which months have data per employee
    const monthsByEmployee = new Map<string, Set<number>>();
    for (const entry of entries) {
      const month = new Date(entry.date).getMonth();
      // A month counts as "filled" if at least one field has data
      const hasData = entry.profile !== null || entry.deals !== null || entry.eintritte !== null || entry.austritte !== null;
      if (!hasData) continue;

      if (!monthsByEmployee.has(entry.employeeId)) {
        monthsByEmployee.set(entry.employeeId, new Set());
      }
      monthsByEmployee.get(entry.employeeId)!.add(month);
    }

    let missingCount = 0;
    const details: Array<{
      employeeId: string;
      employeeName: string;
      missingMonths: Array<{ month: number; label: string }>;
    }> = [];

    for (const emp of employees) {
      const existingMonths = monthsByEmployee.get(emp.id) ?? new Set<number>();

      // Determine start month for this employee
      let startMonth = 0; // default: January
      if (emp.startDate) {
        const sd = new Date(emp.startDate);
        if (sd.getFullYear() === currentYear) {
          startMonth = sd.getMonth();
        } else if (sd.getFullYear() > currentYear) {
          continue; // Employee hasn't started yet
        }
      }

      const empMissingMonths: Array<{ month: number; label: string }> = [];

      // Check months from startMonth to the month BEFORE current month
      // (current month is still in progress, so don't flag it)
      for (let m = startMonth; m < currentMonth; m++) {
        if (!existingMonths.has(m)) {
          empMissingMonths.push({ month: m, label: MONTH_NAMES[m] });
        }
      }

      missingCount += empMissingMonths.length;
      if (empMissingMonths.length > 0) {
        details.push({
          employeeId: emp.id,
          employeeName: emp.name,
          missingMonths: empMissingMonths,
        });
      }
    }

    return NextResponse.json({ count: Math.max(0, missingCount), details });
  } catch (error) {
    console.error("Missing months error:", error);
    return NextResponse.json({ count: 0, details: [] });
  }
}
