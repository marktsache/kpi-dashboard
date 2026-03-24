import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash("admin123", 12);

  const admin = await prisma.user.upsert({
    where: { email: "admin@hanseaten.de" },
    update: {},
    create: {
      email: "admin@hanseaten.de",
      password: hashedPassword,
      name: "Administrator",
      role: "admin",
    },
  });

  console.log("Admin user created:", admin.email);

  const employees = [
    { name: "Max Müller", email: "m.mueller@hanseaten.de", costCenter: "330" },
    { name: "Lisa Schmidt", email: "l.schmidt@hanseaten.de", costCenter: "330" },
    { name: "Thomas Weber", email: "t.weber@hanseaten.de", costCenter: "350" },
    { name: "Anna Fischer", email: "a.fischer@hanseaten.de", costCenter: "350" },
    { name: "Jan Petersen", email: "j.petersen@hanseaten.de", costCenter: "370" },
    { name: "Sarah Hansen", email: "s.hansen@hanseaten.de", costCenter: "370" },
  ];

  for (const emp of employees) {
    await prisma.employee.create({ data: emp });
    console.log("Employee created:", emp.name, "- KST", emp.costCenter);
  }

  const allEmployees = await prisma.employee.findMany();
  const today = new Date();

  for (const emp of allEmployees) {
    for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      date.setHours(12, 0, 0, 0);
      if (date.getDay() === 0 || date.getDay() === 6) continue;

      await prisma.kpiEntry.create({
        data: {
          employeeId: emp.id,
          date,
          costCenter: emp.costCenter,
          kundenbesuche: Math.floor(Math.random() * 5) + 1,
          telefonate: Math.floor(Math.random() * 15) + 5,
          auftraegeAkquiriert: Math.floor(Math.random() * 3),
          auftraegeAbgeschlossen: Math.floor(Math.random() * 2),
          profileVerschickt: Math.floor(Math.random() * 8) + 2,
          vorstellungsgespraeche: Math.floor(Math.random() * 4),
          externeEinstellungen: Math.floor(Math.random() * 2),
          eintritte: Math.floor(Math.random() * 2),
          austritte: Math.random() > 0.7 ? 1 : 0,
        },
      });
    }
    console.log("KPI data generated for:", emp.name);
  }

  console.log("\nSeed completed! Login with: admin@hanseaten.de / admin123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
