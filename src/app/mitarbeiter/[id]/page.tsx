"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { Loading } from "@/components/ui/loading";
import { StatCard } from "@/components/ui/stat-card";
import Link from "next/link";

interface KpiEntry {
  id: string;
  date: string;
  costCenter: string;
  kundenbesuche: number;
  telefonate: number;
  auftraegeAkquiriert: number;
  auftraegeAbgeschlossen: number;
  profileVerschickt: number;
  vorstellungsgespraeche: number;
  externeEinstellungen: number;
  eintritte: number;
  austritte: number;
  createdAt: string;
  updatedAt: string;
}

interface Employee {
  id: string;
  name: string;
  email: string | null;
  costCenter: string;
  active: boolean;
  createdAt: string;
  kpiEntries: KpiEntry[];
}

interface KpiSummary {
  totalEntries: number;
  kundenbesuche: number;
  telefonate: number;
  auftraegeAkquiriert: number;
  auftraegeAbgeschlossen: number;
  profileVerschickt: number;
  vorstellungsgespraeche: number;
  externeEinstellungen: number;
  eintritte: number;
  austritte: number;
}

const COST_CENTER_OPTIONS = [
  { value: "330", label: "KST 330" },
  { value: "350", label: "KST 350" },
  { value: "370", label: "KST 370" },
];

function computeSummary(entries: KpiEntry[]): KpiSummary {
  return entries.reduce<KpiSummary>(
    (acc, entry) => ({
      totalEntries: acc.totalEntries + 1,
      kundenbesuche: acc.kundenbesuche + entry.kundenbesuche,
      telefonate: acc.telefonate + entry.telefonate,
      auftraegeAkquiriert: acc.auftraegeAkquiriert + entry.auftraegeAkquiriert,
      auftraegeAbgeschlossen: acc.auftraegeAbgeschlossen + entry.auftraegeAbgeschlossen,
      profileVerschickt: acc.profileVerschickt + entry.profileVerschickt,
      vorstellungsgespraeche: acc.vorstellungsgespraeche + entry.vorstellungsgespraeche,
      externeEinstellungen: acc.externeEinstellungen + entry.externeEinstellungen,
      eintritte: acc.eintritte + entry.eintritte,
      austritte: acc.austritte + entry.austritte,
    }),
    {
      totalEntries: 0,
      kundenbesuche: 0,
      telefonate: 0,
      auftraegeAkquiriert: 0,
      auftraegeAbgeschlossen: 0,
      profileVerschickt: 0,
      vorstellungsgespraeche: 0,
      externeEinstellungen: 0,
      eintritte: 0,
      austritte: 0,
    }
  );
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default function MitarbeiterDetailPage() {
  const { status } = useSession();
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [formData, setFormData] = useState({ name: "", email: "", costCenter: "330" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  const fetchEmployee = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/employees/${id}`);
      if (!res.ok) {
        if (res.status === 404) throw new Error("Mitarbeiter nicht gefunden.");
        throw new Error("Fehler beim Laden des Mitarbeiters");
      }
      const data = await res.json();
      setEmployee(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unbekannter Fehler");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (status === "authenticated" && id) fetchEmployee();
  }, [status, id, fetchEmployee]);

  const openEditModal = () => {
    if (!employee) return;
    setFormData({
      name: employee.name,
      email: employee.email || "",
      costCenter: employee.costCenter,
    });
    setError(null);
    setEditModalOpen(true);
  };

  const handleEdit = async () => {
    if (!formData.name.trim() || !formData.costCenter) {
      setError("Name und Kostenstelle sind erforderlich.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/employees/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name.trim(),
          email: formData.email.trim() || null,
          costCenter: formData.costCenter,
        }),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Fehler beim Aktualisieren");
      }
      setEditModalOpen(false);
      await fetchEmployee();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unbekannter Fehler");
    } finally {
      setSaving(false);
    }
  };

  if (status === "loading" || status === "unauthenticated") {
    return <Loading text="Laden..." className="min-h-screen" />;
  }

  if (loading) {
    return (
      <AppShell pageTitle="Mitarbeiter">
        <Loading text="Mitarbeiter wird geladen..." className="py-20" />
      </AppShell>
    );
  }

  if (error && !employee) {
    return (
      <AppShell pageTitle="Mitarbeiter">
        <div className="text-center py-20">
          <p className="text-red-600 mb-4">{error}</p>
          <Link
            href="/mitarbeiter"
            className="text-blue-600 hover:text-blue-800 font-medium text-sm underline"
          >
            Zur&uuml;ck zur &Uuml;bersicht
          </Link>
        </div>
      </AppShell>
    );
  }

  if (!employee) return null;

  const summary = computeSummary(employee.kpiEntries);
  const kontakte = summary.kundenbesuche + summary.telefonate;
  const hitRate =
    kontakte > 0 ? ((summary.auftraegeAkquiriert / kontakte) * 100).toFixed(1) : "0.0";
  const conversionRate =
    summary.auftraegeAkquiriert > 0
      ? ((summary.auftraegeAbgeschlossen / summary.auftraegeAkquiriert) * 100).toFixed(1)
      : "0.0";

  return (
    <AppShell pageTitle={employee.name}>
      {/* Back link */}
      <div className="mb-6">
        <Link
          href="/mitarbeiter"
          className="inline-flex items-center text-sm text-gray-500 hover:text-blue-600 transition-colors"
        >
          <svg
            className="h-4 w-4 mr-1"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="2"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          Zur&uuml;ck zur &Uuml;bersicht
        </Link>
      </div>

      {/* Error message */}
      {error && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-3 font-medium underline hover:text-red-900"
          >
            Schliessen
          </button>
        </div>
      )}

      {/* Employee Info Card */}
      <Card className="mb-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                <span className="text-blue-700 font-bold text-lg">
                  {employee.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 2)}
                </span>
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">{employee.name}</h2>
                <p className="text-sm text-gray-500">{employee.email || "Keine E-Mail"}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <Badge color="blue">KST {employee.costCenter}</Badge>
              <Badge color={employee.active ? "green" : "red"}>
                {employee.active ? "Aktiv" : "Inaktiv"}
              </Badge>
              <span className="text-gray-400">
                Erstellt am {formatDate(employee.createdAt)}
              </span>
            </div>
          </div>
          <Button onClick={openEditModal} variant="secondary">
            <svg
              className="h-4 w-4 mr-2"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="2"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z"
              />
            </svg>
            Bearbeiten
          </Button>
        </div>
      </Card>

      {/* KPI Summary Stats */}
      <h3 className="text-lg font-semibold text-gray-900 mb-4">KPI-Zusammenfassung</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="Kundenkontakte"
          value={kontakte}
          subtitle={`${summary.kundenbesuche} Besuche + ${summary.telefonate} Telefonate`}
        />
        <StatCard
          title="Auftr&auml;ge akquiriert"
          value={summary.auftraegeAkquiriert}
          subtitle={`Hit Rate: ${hitRate}%`}
        />
        <StatCard
          title="Abschl&uuml;sse"
          value={summary.auftraegeAbgeschlossen}
          subtitle={`Conversion: ${conversionRate}%`}
        />
        <StatCard
          title="Externe Einstellungen"
          value={summary.externeEinstellungen}
          subtitle={`Profile: ${summary.profileVerschickt} | VG: ${summary.vorstellungsgespraeche}`}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="Profile verschickt"
          value={summary.profileVerschickt}
        />
        <StatCard
          title="Vorstellungsgespr&auml;che"
          value={summary.vorstellungsgespraeche}
        />
        <StatCard
          title="Eintritte"
          value={summary.eintritte}
        />
        <StatCard
          title="Austritte"
          value={summary.austritte}
        />
      </div>

      {/* KPI Entries Table */}
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        KPI-Eintr&auml;ge ({summary.totalEntries})
      </h3>
      {employee.kpiEntries.length === 0 ? (
        <Card className="text-center py-12">
          <p className="text-gray-500 text-sm">Keine KPI-Eintr&auml;ge vorhanden.</p>
        </Card>
      ) : (
        <Card className="overflow-hidden !p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-4 py-3 font-medium text-gray-600 whitespace-nowrap">Datum</th>
                  <th className="px-4 py-3 font-medium text-gray-600 whitespace-nowrap">KST</th>
                  <th className="px-4 py-3 font-medium text-gray-600 text-right whitespace-nowrap">Besuche</th>
                  <th className="px-4 py-3 font-medium text-gray-600 text-right whitespace-nowrap">Telefonate</th>
                  <th className="px-4 py-3 font-medium text-gray-600 text-right whitespace-nowrap">Akquiriert</th>
                  <th className="px-4 py-3 font-medium text-gray-600 text-right whitespace-nowrap">Abgeschl.</th>
                  <th className="px-4 py-3 font-medium text-gray-600 text-right whitespace-nowrap">Profile</th>
                  <th className="px-4 py-3 font-medium text-gray-600 text-right whitespace-nowrap">VG</th>
                  <th className="px-4 py-3 font-medium text-gray-600 text-right whitespace-nowrap">Ext. Einst.</th>
                  <th className="px-4 py-3 font-medium text-gray-600 text-right whitespace-nowrap">Eintritte</th>
                  <th className="px-4 py-3 font-medium text-gray-600 text-right whitespace-nowrap">Austritte</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {employee.kpiEntries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">
                      {formatDate(entry.date)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge color="blue">KST {entry.costCenter}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700">{entry.kundenbesuche}</td>
                    <td className="px-4 py-3 text-right text-gray-700">{entry.telefonate}</td>
                    <td className="px-4 py-3 text-right text-gray-700">{entry.auftraegeAkquiriert}</td>
                    <td className="px-4 py-3 text-right text-gray-700">{entry.auftraegeAbgeschlossen}</td>
                    <td className="px-4 py-3 text-right text-gray-700">{entry.profileVerschickt}</td>
                    <td className="px-4 py-3 text-right text-gray-700">{entry.vorstellungsgespraeche}</td>
                    <td className="px-4 py-3 text-right text-gray-700">{entry.externeEinstellungen}</td>
                    <td className="px-4 py-3 text-right text-gray-700">{entry.eintritte}</td>
                    <td className="px-4 py-3 text-right text-gray-700">{entry.austritte}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Edit Modal */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title="Mitarbeiter bearbeiten"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleEdit();
          }}
          className="space-y-4"
        >
          <Input
            label="Name"
            value={formData.name}
            onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
            placeholder="Vor- und Nachname"
            required
          />
          <Input
            label="E-Mail"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
            placeholder="email@beispiel.de"
          />
          <Select
            label="Kostenstelle"
            options={COST_CENTER_OPTIONS}
            value={formData.costCenter}
            onChange={(e) => setFormData((prev) => ({ ...prev, costCenter: e.target.value }))}
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setEditModalOpen(false)}>
              Abbrechen
            </Button>
            <Button type="submit" loading={saving}>
              Speichern
            </Button>
          </div>
        </form>
      </Modal>
    </AppShell>
  );
}
