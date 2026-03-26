import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("=== Production Seed ===\n");

  // ── Clear all existing data ──
  await prisma.closedMonth.deleteMany();
  await prisma.kpiEntry.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.employee.deleteMany();
  await prisma.user.deleteMany();
  console.log("Alle bestehenden Daten gelöscht.\n");

  // ── User ──
  const hashedPassword = await bcrypt.hash("admin123", 10);
  const user = await prisma.user.create({
    data: {
      email: "elmers@hanseaten-zeitarbeit.de",
      password: hashedPassword,
      name: "Elmers",
      role: "admin",
      photoUrl: null, // Photo must be re-uploaded
    },
  });
  console.log(`User: ${user.email} (${user.name})`);

  // ── Employees ──
  const eike = await prisma.employee.create({
    data: { name: "Eike", costCenter: "330", jobTitle: "Vertriebsdisponent", startDate: new Date("2023-01-01"), active: true },
  });
  const rainer = await prisma.employee.create({
    data: { name: "Rainer", costCenter: "350", jobTitle: "Vertriebsdisponent", startDate: new Date("2026-01-01"), active: true },
  });
  const norman = await prisma.employee.create({
    data: { name: "Norman", costCenter: "350", jobTitle: "Personaldisponent", startDate: new Date("2026-01-01"), active: true },
  });
  const calvin = await prisma.employee.create({
    data: { name: "Calvin", costCenter: "370", jobTitle: "Consultant für Spedition & Logistik", startDate: new Date("2025-08-01"), active: true },
  });
  console.log(`Mitarbeiter: Eike(330), Rainer(350), Norman(350), Calvin(370)\n`);

  // ── Helper to create KPI entry ──
  const kpi = (empId: string, year: number, month: number, kst: string, data: { p?: number | null; d?: number | null; e?: number | null; a?: number | null }) =>
    prisma.kpiEntry.create({
      data: {
        employeeId: empId,
        date: new Date(Date.UTC(year, month - 1, 2)),
        periodType: "month",
        costCenter: kst,
        profile: data.p ?? null,
        vorstellungsgespraeche: null,
        deals: data.d ?? null,
        eintritte: data.e ?? null,
        austritte: data.a ?? null,
      },
    });

  // ── Eike 2023 ──
  const eike2023 = [
    { m: 1, p: 5, d: 0, e: 3, a: 5 },
    { m: 2, p: 45, d: 5, e: 0, a: 2 },
    { m: 3, p: 22, d: 1, e: 2, a: 2 },
    { m: 4, p: 20, d: 2, e: 5, a: 3 },
    { m: 5, p: 30, d: 1, e: 1, a: 4 },
    { m: 6, p: 27, d: 2, e: 3, a: 2 },
    { m: 7, p: 22, d: 2, e: 7, a: 3 },
    { m: 8, p: 22, d: 0, e: 4, a: 1 },
    { m: 9, p: 22, d: 2, e: 1, a: 5 },
    { m: 10, p: 23, d: 1, e: 1, a: 1 },
    { m: 11, p: 29, d: 0, e: 7, a: 2 },
    { m: 12, p: 20, d: 0, e: 2, a: 12 },
  ];
  for (const r of eike2023) await kpi(eike.id, 2023, r.m, "330", { p: r.p, d: r.d, e: r.e, a: r.a });
  console.log("Eike 2023: 12 Monate ✓");

  // ── Eike 2024 ──
  const eike2024 = [
    { m: 1, p: 43, d: 5, e: 1, a: 3 },
    { m: 2, p: 16, d: 1, e: 2, a: 4 },
    { m: 3, p: 16, d: 6, e: 3, a: 2 },
    { m: 4, p: 23, d: 4, e: 5, a: 2 },
    { m: 5, p: 23, d: 3, e: 1, a: 1 },
    { m: 6, p: 29, d: 3, e: 7, a: 0 },
    { m: 7, p: 24, d: 2, e: 2, a: 5 },
    { m: 8, p: 30, d: 2, e: 3, a: 7 },
    { m: 9, p: 33, d: 4, e: 4, a: 3 },
    { m: 10, p: 32, d: 4, e: 4, a: 4 },
    { m: 11, p: 24, d: 3, e: 5, a: 5 },
    { m: 12, p: 18, d: 4, e: 1, a: 3 },
  ];
  for (const r of eike2024) await kpi(eike.id, 2024, r.m, "330", { p: r.p, d: r.d, e: r.e, a: r.a });
  console.log("Eike 2024: 12 Monate ✓");

  // ── Eike 2025 ──
  const eike2025 = [
    { m: 1, p: 14, d: 2, e: 7, a: 0 },
    { m: 2, p: 29, d: 3, e: 2, a: 5 },
    { m: 3, p: 17, d: 3, e: 7, a: 1 },
    { m: 4, p: 20, d: 2, e: 6, a: 7 },
    { m: 5, p: 21, d: 1, e: 6, a: 3 },
    { m: 6, p: 8, d: 1, e: 1, a: 4 },
    { m: 7, p: 32, d: 2, e: 3, a: 1 },
    { m: 8, p: 9, d: 0, e: 3, a: 2 },
    { m: 9, p: 17, d: 2, e: 2, a: 8 },
    { m: 10, p: 14, d: 1, e: 1, a: 4 },
    { m: 11, p: 9, d: 1, e: 2, a: 6 },
    { m: 12, p: 12, d: 0, e: 0, a: 3 },
  ];
  for (const r of eike2025) await kpi(eike.id, 2025, r.m, "330", { p: r.p, d: r.d, e: r.e, a: r.a });
  console.log("Eike 2025: 12 Monate ✓");

  // ── Eike 2026 ──
  const eike2026 = [
    { m: 1, p: 12, d: 0, e: 2, a: 1 },
    { m: 2, p: 19, d: 1, e: 4, a: 1 },
    { m: 3, p: 8, d: 1, e: 2, a: 7 },
  ];
  for (const r of eike2026) await kpi(eike.id, 2026, r.m, "330", { p: r.p, d: r.d, e: r.e, a: r.a });
  console.log("Eike 2026: 3 Monate ✓");

  // ── Rainer 2026 ──
  const rainer2026 = [
    { m: 1, p: 13, d: 6, e: 5, a: 2 },
    { m: 2, p: 10, d: 3, e: 8, a: 8 },
    { m: 3, p: 9, d: 3, e: 6, a: 5 },
  ];
  for (const r of rainer2026) await kpi(rainer.id, 2026, r.m, "350", { p: r.p, d: r.d, e: r.e, a: r.a });
  console.log("Rainer 2026: 3 Monate ✓");

  // ── Norman 2026 ──
  const norman2026 = [
    { m: 1, p: 1, d: 0, e: 5, a: 2 },
    { m: 2, p: 3, d: 1, e: 8, a: 8 },
    { m: 3, p: 4, d: 0, e: 6, a: 5 },
  ];
  for (const r of norman2026) await kpi(norman.id, 2026, r.m, "350", { p: r.p, d: r.d, e: r.e, a: r.a });
  console.log("Norman 2026: 3 Monate ✓");

  // ── Calvin 2025 ──
  const calvin2025 = [
    { m: 8, p: 13, d: 0, e: 0, a: 0 },
    { m: 9, p: 32, d: 0, e: 0, a: 0 },
    { m: 10, p: 23, d: 1, e: 0, a: 0 },
    { m: 11, p: 20, d: 0, e: 1, a: 1 },
    { m: 12, p: 14, d: 0, e: 0, a: 0 },
  ];
  for (const r of calvin2025) await kpi(calvin.id, 2025, r.m, "370", { p: r.p, d: r.d, e: r.e, a: r.a });
  console.log("Calvin 2025: 5 Monate ✓");

  // ── Calvin 2026 ──
  const calvin2026 = [
    { m: 1, p: 8, d: 0, e: 0, a: 0 },
    { m: 2, p: 20, d: 2, e: 0, a: 0 },
    { m: 3, p: 24, d: 1, e: 1, a: 0 },
  ];
  for (const r of calvin2026) await kpi(calvin.id, 2026, r.m, "370", { p: r.p, d: r.d, e: r.e, a: r.a });
  console.log("Calvin 2026: 3 Monate ✓");

  // Calvin April + Juli 2026 (nur Eintritte)
  await kpi(calvin.id, 2026, 4, "370", { p: null, d: null, e: 1, a: null });
  await kpi(calvin.id, 2026, 7, "370", { p: null, d: null, e: 1, a: null });
  console.log("Calvin 2026: Apr+Jul (nur Eintritte) ✓");

  // ── Closed Months ──
  // Eike: all of 2023, 2024, 2025 + Jan 2026
  for (let m = 0; m < 12; m++) {
    await prisma.closedMonth.create({ data: { employeeId: eike.id, year: 2023, month: m } });
    await prisma.closedMonth.create({ data: { employeeId: eike.id, year: 2024, month: m } });
    await prisma.closedMonth.create({ data: { employeeId: eike.id, year: 2025, month: m } });
  }
  await prisma.closedMonth.create({ data: { employeeId: eike.id, year: 2026, month: 0 } });
  console.log("\nEike: 2023-2025 + Jan 2026 abgeschlossen ✓");

  // Calvin: Aug-Dec 2025
  for (let m = 7; m < 12; m++) {
    await prisma.closedMonth.create({ data: { employeeId: calvin.id, year: 2025, month: m } });
  }
  console.log("Calvin: Aug-Dez 2025 abgeschlossen ✓");

  console.log("\n=== Seed abgeschlossen! ===");
  console.log(`Login: elmers@hanseaten-zeitarbeit.de / admin123`);
  console.log("Fotos müssen manuell neu hochgeladen werden.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
