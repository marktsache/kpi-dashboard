# CORE.kpi – KPI-Dashboard für HANSEATEN

## Was ist das?
KPI-Dashboard für den Personaldienstleister HANSEATEN. Der operative Leiter (einziger Admin) erfasst und vergleicht Leistungskennzahlen seiner Personaldisponenten.

## Tech Stack
- **Next.js 14** (App Router) + TypeScript + Tailwind CSS
- **Prisma 5** + SQLite (`prisma/dev.db`)
- **Recharts** für Charts (Line, Bar, Pie, Funnel)
- **NextAuth.js v4** (Credentials, JWT) – Login: `admin@hanseaten.de` / `admin123`
- **Zod** für API-Validierung (`src/lib/validation.ts`)

## Architektur-Entscheidungen

### Nur wöchentliche Eingabe
Alle KPI-Daten werden wöchentlich erfasst. Monatliche Ansichten aggregieren aus Wochendaten.
`viewMode` (week/month) steuert nur die Chart-Darstellung, nicht die Datenhaltung.

### Unified Analyse-Seite
Dashboard und Analyse sind in einer Seite vereint (`src/app/page.tsx`).
`/analyse` leitet auf `/` weiter. Keine doppelten Seiten.

### Shared Filter State
Filter (Zeitraum, ViewMode, Kostenstelle) werden über `FilterProvider` (`src/lib/filter-context.tsx`)
seitenübergreifend geteilt (Analyse, Vergleich).

## Datenmodell
- **User** – Admin-Login
- **Employee** – Disponenten mit Kostenstelle (330/350/370)
- **KpiEntry** – KPI-Einträge pro Mitarbeiter & Woche (unique: `employeeId` + `date`)
  - Optionales `comment` Feld pro Eintrag
- **AuditLog** – Wer hat wann was geändert

### KPI-Bereiche (Reihenfolge auf der Seite)
1. **Profile**: Profile, VG's, Deals, Deal-Quote
2. **Einstellungen**: Eintritte, Austritte, MA-Wachstum
3. **Vertrieb**: Telefonate, Aufträge akquiriert, Aufträge abgeschlossen, Hit Rate, Conversion

**WICHTIG:** Kundenbesuche gehören NICHT mehr zum Vertrieb (entfernt).
Die Kategorien heißen "Profile" (nicht "Recruiting") und "Einstellungen" (nicht "Personal").

### Kostenstellen
- 330, 350, 370

### Mitarbeiter
- Eike (330), Rainer (350), Norman (350), Calvin (370)

## Seitenstruktur
```
/              – Analyse (Hauptseite): StatCards + Charts + Tabellen pro Sektion
/eingabe       – KPI-Eingabe (Einzel + Stapel), fehlende KW-Anzeige
/vergleich     – Mitarbeiter-Vergleich + Ranking
/mitarbeiter   – Mitarbeiterverwaltung (CRUD)
/mitarbeiter/[id] – Detail mit Einträgen + Kommentaren
/audit         – Audit-Log (wer hat wann was geändert)
/analyse       – Redirect auf /
/login         – Login-Seite
```

## Analyse-Seite Aufbau (src/app/page.tsx)
Die Hauptseite ist in Sektionen gegliedert:
1. **Filter**: Zeitraum (mit Datums-Badge), ViewMode, Kostenstelle, Mitarbeiter, CSV-Export
2. **Profile-Sektion**: StatCards, Trend-Chart, Funnel, Monatsübersicht-Tabelle, Jahresübersicht-Tabelle
3. **Einstellungen-Sektion**: StatCards, Trend-Chart
4. **Vertrieb-Sektion**: StatCards, Trend-Chart, Funnel
5. **Kostenstellen**: Bar-Chart + Pie-Charts
6. **Jahresvergleich**: Line-Charts (Eintritte, Austritte, Profile, Deals)

### Tabellen in Profile-Sektion
- **Monatsübersicht**: Monat | Profile | VG's | Deals | VG-Quote | Deal-Quote | MA-Wachstum (grün/rot) | Gesamt-Zeile
- **Jahresübersicht**: Jahr | gleiche Spalten | Gesamt-Zeile

## Charts
- **Alle Charts sind full-width** (eine Spalte, untereinander)
- **Line-Charts**: Linien enden beim letzten Datenpunkt (kein Drop auf 0 bei leeren Wochen)
  - Implementiert via `trimTrailingZeros()` + `connectNulls={false}`
- **Kommentar-Indikatoren**: Amber-Punkt unter der X-Achse bei Wochen/Monaten mit Kommentaren
  - Tooltip zeigt Kommentare (Mitarbeitername: Text) beim Mouseover

## Features
- Toast-Benachrichtigungen statt Inline-Banner (`useToast()`)
- Server-seitige Auth-Middleware (`src/middleware.ts`)
- Vorperioden-Vergleich auf StatCards (+/- %)
- Fehlende-KW-Warnung auf Eingabeseite (klickbare rote Badges)
- Audit-Log mit Pagination und Filtern
- CSV-Export

## API-Endpunkte
```
GET/POST    /api/kpi           – KPI-Einträge (Zod-validiert)
DELETE      /api/kpi/[id]      – Eintrag löschen (mit Audit-Log)
GET         /api/kpi/stats     – Aggregierte Stats (Trends, Totals, Vorperiode, Jahresvergleich)
GET/POST    /api/employees     – Mitarbeiter (Zod-validiert)
GET/PUT/DEL /api/employees/[id]
GET         /api/audit         – Audit-Log (paginiert)
```

## Befehle
```bash
npm run dev          # Dev-Server (localhost:3000)
npm run seed         # DB mit Testdaten füllen
npm run db:migrate   # Prisma Migration
npx next build       # Production Build
```

## Design
- Dark navy Sidebar, heller Content-Bereich
- Kompakt (11px Labels, kleine Abstände), Linear/Notion-Stil
- StatCards mit farbigen Akzentlinien und Gradient
- MA-Wachstum: grün bei "+", rot bei "-"
