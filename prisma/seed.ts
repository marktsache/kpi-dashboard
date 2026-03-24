import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const COMMENTS = [
  "Gute Woche, mehrere Neukunden gewonnen",
  "Urlaub Mi-Fr",
  "Messe-Woche, viele Kontakte",
  "Krankheitsvertretung übernommen",
  "Fokus auf Bestandskunden",
  "Schulung am Donnerstag",
  "Quartalsgespräche geführt",
  "Teammeeting + Strategie-Workshop",
  "Starker Endspurt vor Monatsende",
  "Einarbeitung neuer Kollege",
];

async function main() {
  await prisma.auditLog.deleteMany();
  await prisma.kpiEntry.deleteMany();
  await prisma.employee.deleteMany();
  await prisma.user.deleteMany();

  const hashedPassword = await bcrypt.hash("admin123", 12);

  const admin = await prisma.user.create({
    data: {
      email: "admin@hanseaten.de",
      password: hashedPassword,
      name: "Administrator",
      role: "admin",
    },
  });
  console.log("Admin:", admin.email);

  const employees = [
    { name: "Eike", costCenter: "330" },
    { name: "Rainer", costCenter: "350" },
    { name: "Norman", costCenter: "350" },
    { name: "Calvin", costCenter: "370" },
  ];

  for (const emp of employees) {
    await prisma.employee.create({ data: emp });
    console.log("Employee:", emp.name, "KST", emp.costCenter);
  }

  const allEmployees = await prisma.employee.findMany();
  const now = new Date();

  // Generate weekly KPI data from Jan 2023 until Mar 2026
  const endDate = new Date(2026, 2, 23); // March 23, 2026
  const startWeek = new Date(2023, 0, 2, 12, 0, 0, 0); // Monday 2023-01-02

  for (const emp of allEmployees) {
    let weekDate = new Date(startWeek);
    let weekCount = 0;
    while (weekDate <= endDate) {
      const hasComment = Math.random() < 0.2;
      await prisma.kpiEntry.create({
        data: {
          employeeId: emp.id,
          date: new Date(weekDate),
          periodType: "week",
          costCenter: emp.costCenter,
          comment: hasComment ? COMMENTS[Math.floor(Math.random() * COMMENTS.length)] : null,
          kundenbesuche: Math.floor(Math.random() * 10) + 2,
          telefonate: Math.floor(Math.random() * 30) + 10,
          auftraegeAkquiriert: Math.floor(Math.random() * 5),
          auftraegeAbgeschlossen: Math.floor(Math.random() * 3),
          profile: Math.floor(Math.random() * 12) + 3,
          vorstellungsgespraeche: Math.floor(Math.random() * 6) + 1,
          deals: Math.floor(Math.random() * 3),
          eintritte: Math.floor(Math.random() * 3),
          austritte: Math.random() > 0.6 ? Math.floor(Math.random() * 2) + 1 : 0,
        },
      });
      weekDate.setDate(weekDate.getDate() + 7);
      weekCount++;
    }
    console.log(`${weekCount} weeks KPI for:`, emp.name);
  }

  // Create sample audit log entries
  const auditActions = [
    { action: "create", entityType: "Employee", entityId: allEmployees[0].id, changes: JSON.stringify({ name: "Eike", costCenter: "330" }) },
    { action: "create", entityType: "Employee", entityId: allEmployees[1].id, changes: JSON.stringify({ name: "Rainer", costCenter: "350" }) },
    { action: "update", entityType: "Employee", entityId: allEmployees[0].id, changes: JSON.stringify({ costCenter: "330" }) },
    { action: "create", entityType: "KpiEntry", entityId: "sample-1", changes: JSON.stringify({ date: "2026-03-17", employeeId: allEmployees[0].id }) },
    { action: "create", entityType: "KpiEntry", entityId: "sample-2", changes: JSON.stringify({ date: "2026-03-17", employeeId: allEmployees[1].id }) },
  ];

  for (const audit of auditActions) {
    await prisma.auditLog.create({
      data: {
        userId: admin.id,
        ...audit,
      },
    });
  }
  console.log(`${auditActions.length} audit log entries created`);

  console.log("\nSeed completed! Login: admin@hanseaten.de / admin123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
