# CORE.kpi - KPI-Dashboard für HANSEATEN

KPI-Dashboard zur Nachverfolgung der Leistungskennzahlen von Personaldisponenten.

## Tech Stack

- **Next.js 14** (App Router) + TypeScript
- **Tailwind CSS** (hell & modern)
- **Prisma 5** + SQLite
- **Recharts** (Charts & Visualisierungen)
- **NextAuth.js** (Admin-Login)

## Setup

```bash
# Abhängigkeiten installieren
npm install

# Datenbank erstellen & migrieren
npx prisma migrate dev

# Testdaten laden (Admin + 6 Mitarbeiter + 30 Tage KPI-Daten)
npm run seed

# Entwicklungsserver starten
npm run dev
```

App läuft auf **http://localhost:3000**

## Login

| Feld     | Wert                  |
|----------|-----------------------|
| E-Mail   | admin@hanseaten.de    |
| Passwort | admin123              |

## Features

- **Dashboard**: Übersichtskarten, Zeitraum-/Kostenstellenfilter, Trendcharts, Conversion-Funnels
- **Mitarbeiter**: Anlegen, Bearbeiten, Deaktivieren, Einzelansicht mit KPI-Verlauf
- **KPI-Eingabe**: Einzel- und Batch-Eingabe pro Mitarbeiter & Datum
- **Vergleich**: Mitarbeiter nebeneinander vergleichen, Rankings nach KPIs
- **Analyse**: Detaillierte Charts, Drill-Down, CSV-Export

## KPI-Bereiche

### Vertrieb
- Kundenbesuche, Telefonate, Aufträge akquiriert/abgeschlossen
- Conversion Rate, Hit Rate

### Profile & Recruiting
- Profile verschickt, Vorstellungsgespräche, Externe Einstellungen
- Besetzungsquote, Conversion Funnel

### Personal / Fluktuation
- Eintritte, Austritte, Netto-Veränderung, Fluktuationsrate

## Kostenstellen

- **330** / **350** / **370**

## Befehle

```bash
npm run dev          # Entwicklungsserver
npm run build        # Produktions-Build
npm run seed         # Datenbank mit Testdaten füllen
npm run db:migrate   # Prisma Migration
npm run db:studio    # Prisma Studio (DB-Browser)
```
