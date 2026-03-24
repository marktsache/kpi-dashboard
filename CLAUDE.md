# CORE.kpi – KPI-Dashboard für HANSEATEN

## Was ist das?
KPI-Dashboard für den Personaldienstleister HANSEATEN. Der operative Leiter (einziger Admin) erfasst und vergleicht Leistungskennzahlen seiner Personaldisponenten.

## Tech Stack
- **Next.js 14** (App Router) + TypeScript + Tailwind CSS
- **Prisma 5** + SQLite (`prisma/dev.db`)
- **Recharts** für Charts
- **NextAuth.js v4** (Credentials, JWT) – Login: `admin@hanseaten.de` / `admin123`

## Datenmodell
- **User** – Admin-Login
- **Employee** – Disponenten mit Kostenstelle (330/350/370)
- **KpiEntry** – KPI-Einträge pro Mitarbeiter & Periode (Woche/Monat)

### KPI-Bereiche
1. **Vertrieb**: Kundenbesuche, Telefonate, Aufträge akquiriert/abgeschlossen
2. **Profile/Recruiting**: Profile, VG's, Deals, Eintritte, Austritte + Deal-Quote + MA-Wachstum
3. Jahresvergleich-Charts (Jan–Dez) für Eintritte, Austritte, Profile, Deals

### Kostenstellen
- 330, 350, 370

### Mitarbeiter
- Eike (330), Rainer (350), Norman (350), Calvin (370)

## Projektstruktur
```
src/app/              – Pages (Dashboard, Mitarbeiter, Eingabe, Vergleich, Analyse)
src/app/api/          – REST API (employees, kpi, kpi/stats)
src/components/ui/    – Button, Card, Input, Select, Badge, Modal, StatCard, Loading
src/components/charts/– KpiLineChart, KpiBarChart, FunnelChart, KpiPieChart
src/components/layout/– Sidebar (dark navy), Header, AppShell
src/lib/              – db.ts (Prisma), auth.ts (NextAuth), utils.ts
prisma/               – Schema, Migrations, Seed
```

## Design
- Dark navy Sidebar, heller Content-Bereich mit subtilen Mesh-Gradients
- Kompakt (13px base, kleine Abstände), Linear/Notion-Stil
- Farbige Akzentlinien auf StatCards, Gradient-Buttons

## Befehle
```bash
npm run dev          # Dev-Server (localhost:3000)
npm run seed         # DB mit Testdaten füllen
npm run db:migrate   # Prisma Migration
```
