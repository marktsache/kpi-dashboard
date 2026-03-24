-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'admin'
);

-- CreateTable
CREATE TABLE "Employee" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "costCenter" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "KpiEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "employeeId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "periodType" TEXT NOT NULL DEFAULT 'week',
    "costCenter" TEXT NOT NULL,
    "kundenbesuche" INTEGER NOT NULL DEFAULT 0,
    "telefonate" INTEGER NOT NULL DEFAULT 0,
    "auftraegeAkquiriert" INTEGER NOT NULL DEFAULT 0,
    "auftraegeAbgeschlossen" INTEGER NOT NULL DEFAULT 0,
    "profile" INTEGER NOT NULL DEFAULT 0,
    "vorstellungsgespraeche" INTEGER NOT NULL DEFAULT 0,
    "deals" INTEGER NOT NULL DEFAULT 0,
    "eintritte" INTEGER NOT NULL DEFAULT 0,
    "austritte" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "KpiEntry_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "KpiEntry_employeeId_date_periodType_key" ON "KpiEntry"("employeeId", "date", "periodType");
