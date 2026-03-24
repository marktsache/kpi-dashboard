"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Loading } from "@/components/ui/loading";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Employee {
  id: string;
  name: string;
  costCenter: string;
  email: string | null;
  active: boolean;
}

interface KpiValues {
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

interface BatchRow extends KpiValues {
  employeeId: string;
  employeeName: string;
  costCenter: string;
}

const EMPTY_KPI: KpiValues = {
  kundenbesuche: 0,
  telefonate: 0,
  auftraegeAkquiriert: 0,
  auftraegeAbgeschlossen: 0,
  profileVerschickt: 0,
  vorstellungsgespraeche: 0,
  externeEinstellungen: 0,
  eintritte: 0,
  austritte: 0,
};

const KPI_FIELDS: {
  section: string;
  fields: { key: keyof KpiValues; label: string }[];
}[] = [
  {
    section: "Vertrieb",
    fields: [
      { key: "kundenbesuche", label: "Kundenbesuche" },
      { key: "telefonate", label: "Telefonate" },
      { key: "auftraegeAkquiriert", label: "Auftr\u00e4ge akquiriert" },
      { key: "auftraegeAbgeschlossen", label: "Auftr\u00e4ge abgeschlossen" },
    ],
  },
  {
    section: "Recruiting",
    fields: [
      { key: "profileVerschickt", label: "Profile verschickt" },
      { key: "vorstellungsgespraeche", label: "Vorstellungsgespr\u00e4che" },
      { key: "externeEinstellungen", label: "Externe Einstellungen" },
    ],
  },
  {
    section: "Personal",
    fields: [
      { key: "eintritte", label: "Eintritte" },
      { key: "austritte", label: "Austritte" },
    ],
  },
];

const ALL_KPI_KEYS: (keyof KpiValues)[] = KPI_FIELDS.flatMap((s) =>
  s.fields.map((f) => f.key)
);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function todayString(): string {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function EingabePage() {
  const { status } = useSession();
  const router = useRouter();

  // Global state
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(true);
  const [date, setDate] = useState(todayString);
  const [batchMode, setBatchMode] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  // Single-entry state
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [singleValues, setSingleValues] = useState<KpiValues>({ ...EMPTY_KPI });
  const [loadingExisting, setLoadingExisting] = useState(false);

  // Batch state
  const [batchRows, setBatchRows] = useState<BatchRow[]>([]);

  // -----------------------------------------------------------------------
  // Auth guard
  // -----------------------------------------------------------------------

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  // -----------------------------------------------------------------------
  // Fetch employees
  // -----------------------------------------------------------------------

  useEffect(() => {
    if (status !== "authenticated") return;
    setLoadingEmployees(true);
    fetch("/api/employees?active=true")
      .then((r) => r.json())
      .then((data: Employee[]) => {
        setEmployees(data);
        // Initialise batch rows
        setBatchRows(
          data.map((emp) => ({
            employeeId: emp.id,
            employeeName: emp.name,
            costCenter: emp.costCenter,
            ...EMPTY_KPI,
          }))
        );
      })
      .catch(() => setErrorMessage("Mitarbeiter konnten nicht geladen werden."))
      .finally(() => setLoadingEmployees(false));
  }, [status]);

  // -----------------------------------------------------------------------
  // Load existing KPI entry when employee + date change (single mode)
  // -----------------------------------------------------------------------

  const loadExistingEntry = useCallback(
    async (empId: string, d: string) => {
      if (!empId || !d) return;
      setLoadingExisting(true);
      try {
        const params = new URLSearchParams({
          employeeId: empId,
          from: d,
          to: d,
        });
        const res = await fetch(`/api/kpi?${params}`);
        const entries = await res.json();
        if (Array.isArray(entries) && entries.length > 0) {
          const entry = entries[0];
          const loaded: KpiValues = { ...EMPTY_KPI };
          for (const key of ALL_KPI_KEYS) {
            if (typeof entry[key] === "number") {
              loaded[key] = entry[key];
            }
          }
          setSingleValues(loaded);
        } else {
          setSingleValues({ ...EMPTY_KPI });
        }
      } catch {
        // Silently reset on error
        setSingleValues({ ...EMPTY_KPI });
      } finally {
        setLoadingExisting(false);
      }
    },
    []
  );

  useEffect(() => {
    if (!batchMode && selectedEmployeeId && date) {
      loadExistingEntry(selectedEmployeeId, date);
    }
  }, [batchMode, selectedEmployeeId, date, loadExistingEntry]);

  // -----------------------------------------------------------------------
  // Load existing entries for all employees (batch mode)
  // -----------------------------------------------------------------------

  const loadBatchEntries = useCallback(
    async (emps: Employee[], d: string) => {
      if (!d || emps.length === 0) return;
      try {
        const params = new URLSearchParams({ from: d, to: d });
        const res = await fetch(`/api/kpi?${params}`);
        const entries: Record<string, unknown>[] = await res.json();

        const entryMap = new Map<string, Record<string, unknown>>();
        for (const entry of entries) {
          entryMap.set(entry.employeeId as string, entry);
        }

        setBatchRows(
          emps.map((emp) => {
            const existing = entryMap.get(emp.id);
            const values: KpiValues = { ...EMPTY_KPI };
            if (existing) {
              for (const key of ALL_KPI_KEYS) {
                if (typeof existing[key] === "number") {
                  values[key] = existing[key] as number;
                }
              }
            }
            return {
              employeeId: emp.id,
              employeeName: emp.name,
              costCenter: emp.costCenter,
              ...values,
            };
          })
        );
      } catch {
        // Keep defaults on error
      }
    },
    []
  );

  useEffect(() => {
    if (batchMode && employees.length > 0 && date) {
      loadBatchEntries(employees, date);
    }
  }, [batchMode, employees, date, loadBatchEntries]);

  // -----------------------------------------------------------------------
  // Submit handlers
  // -----------------------------------------------------------------------

  const clearMessages = () => {
    setSuccessMessage("");
    setErrorMessage("");
  };

  const handleSingleSubmit = async () => {
    clearMessages();
    if (!selectedEmployeeId) {
      setErrorMessage("Bitte w\u00e4hlen Sie einen Mitarbeiter aus.");
      return;
    }
    const employee = employees.find((e) => e.id === selectedEmployeeId);
    if (!employee) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/kpi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: selectedEmployeeId,
          date,
          costCenter: employee.costCenter,
          ...singleValues,
        }),
      });
      if (!res.ok) throw new Error("Fehler beim Speichern");
      setSuccessMessage(
        `KPI-Daten f\u00fcr ${employee.name} am ${new Date(date).toLocaleDateString("de-DE")} gespeichert.`
      );
    } catch {
      setErrorMessage("Fehler beim Speichern der KPI-Daten.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleBatchSubmit = async () => {
    clearMessages();
    // Only send rows where at least one KPI value > 0
    const payload = batchRows
      .filter((row) => ALL_KPI_KEYS.some((k) => row[k] > 0))
      .map((row) => ({
        employeeId: row.employeeId,
        date,
        costCenter: row.costCenter,
        ...ALL_KPI_KEYS.reduce(
          (acc, k) => ({ ...acc, [k]: row[k] }),
          {} as KpiValues
        ),
      }));

    if (payload.length === 0) {
      setErrorMessage(
        "Keine Daten zum Speichern. Bitte mindestens einen Wert eingeben."
      );
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/kpi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Fehler beim Speichern");
      setSuccessMessage(
        `KPI-Daten f\u00fcr ${payload.length} Mitarbeiter am ${new Date(date).toLocaleDateString("de-DE")} gespeichert.`
      );
    } catch {
      setErrorMessage("Fehler beim Speichern der KPI-Daten.");
    } finally {
      setSubmitting(false);
    }
  };

  // -----------------------------------------------------------------------
  // Value change helpers
  // -----------------------------------------------------------------------

  const handleSingleChange = (key: keyof KpiValues, raw: string) => {
    const val = raw === "" ? 0 : parseInt(raw, 10);
    if (isNaN(val)) return;
    setSingleValues((prev) => ({ ...prev, [key]: val }));
  };

  const handleBatchChange = (
    rowIdx: number,
    key: keyof KpiValues,
    raw: string
  ) => {
    const val = raw === "" ? 0 : parseInt(raw, 10);
    if (isNaN(val)) return;
    setBatchRows((prev) => {
      const next = [...prev];
      next[rowIdx] = { ...next[rowIdx], [key]: val };
      return next;
    });
  };

  // -----------------------------------------------------------------------
  // Render guards
  // -----------------------------------------------------------------------

  if (status === "loading" || status === "unauthenticated") {
    return <Loading text="Laden..." className="min-h-screen" />;
  }

  // -----------------------------------------------------------------------
  // Employee options for Select
  // -----------------------------------------------------------------------

  const employeeOptions = employees.map((e) => ({
    value: e.id,
    label: `${e.name} (KST ${e.costCenter})`,
  }));

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <AppShell pageTitle="KPI-Eingabe">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* ---- Success / Error banners ---- */}
        {successMessage && (
          <div className="bg-green-50 border border-green-300 text-green-800 px-4 py-3 rounded-lg text-sm flex items-center justify-between">
            <span>{successMessage}</span>
            <button
              onClick={() => setSuccessMessage("")}
              className="text-green-600 hover:text-green-800 font-bold ml-4"
            >
              &times;
            </button>
          </div>
        )}
        {errorMessage && (
          <div className="bg-red-50 border border-red-300 text-red-800 px-4 py-3 rounded-lg text-sm flex items-center justify-between">
            <span>{errorMessage}</span>
            <button
              onClick={() => setErrorMessage("")}
              className="text-red-600 hover:text-red-800 font-bold ml-4"
            >
              &times;
            </button>
          </div>
        )}

        {/* ---- Top controls: date + mode toggle ---- */}
        <Card>
          <div className="flex flex-wrap items-end gap-4">
            <div className="w-56">
              <Input
                label="Datum"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-3 ml-auto">
              <span className="text-sm text-gray-600">Einzeleingabe</span>
              <button
                type="button"
                role="switch"
                aria-checked={batchMode}
                onClick={() => {
                  clearMessages();
                  setBatchMode((b) => !b);
                }}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                  batchMode ? "bg-blue-600" : "bg-gray-200"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    batchMode ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
              <span className="text-sm text-gray-600">Stapeleingabe</span>
            </div>
          </div>
        </Card>

        {loadingEmployees ? (
          <Loading text="Mitarbeiter werden geladen..." />
        ) : !batchMode ? (
          /* ================================================================
             SINGLE ENTRY MODE
             ================================================================ */
          <div className="space-y-6">
            {/* Employee selector */}
            <Card>
              <div className="max-w-md">
                <Select
                  label="Mitarbeiter"
                  placeholder="Mitarbeiter ausw\u00e4hlen..."
                  options={employeeOptions}
                  value={selectedEmployeeId}
                  onChange={(e) => setSelectedEmployeeId(e.target.value)}
                />
              </div>
              {loadingExisting && (
                <div className="mt-3">
                  <Loading size="sm" text="Vorhandene Daten werden geladen..." />
                </div>
              )}
            </Card>

            {selectedEmployeeId && !loadingExisting && (
              <>
                {/* KPI sections */}
                {KPI_FIELDS.map((section) => (
                  <Card key={section.section} title={section.section}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      {section.fields.map((field) => (
                        <Input
                          key={field.key}
                          label={field.label}
                          type="number"
                          min={0}
                          value={
                            singleValues[field.key] === 0
                              ? ""
                              : singleValues[field.key]
                          }
                          placeholder="0"
                          onChange={(e) =>
                            handleSingleChange(field.key, e.target.value)
                          }
                        />
                      ))}
                    </div>
                  </Card>
                ))}

                {/* Submit button */}
                <div className="flex justify-end">
                  <Button
                    onClick={handleSingleSubmit}
                    loading={submitting}
                    size="lg"
                  >
                    Speichern
                  </Button>
                </div>
              </>
            )}
          </div>
        ) : (
          /* ================================================================
             BATCH ENTRY MODE
             ================================================================ */
          <div className="space-y-6">
            <Card>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-2 font-semibold text-gray-700 sticky left-0 bg-white min-w-[180px]">
                        Mitarbeiter
                      </th>
                      <th className="text-left py-3 px-2 font-semibold text-gray-500 min-w-[60px]">
                        KST
                      </th>
                      {/* Section headers */}
                      {KPI_FIELDS.map((section) => (
                        <th
                          key={section.section}
                          colSpan={section.fields.length}
                          className="text-center py-1 px-2 font-semibold text-gray-900 border-b border-gray-100"
                        >
                          {section.section}
                        </th>
                      ))}
                    </tr>
                    <tr className="border-b border-gray-100">
                      <th className="sticky left-0 bg-white" />
                      <th />
                      {KPI_FIELDS.flatMap((section) =>
                        section.fields.map((field) => (
                          <th
                            key={field.key}
                            className="text-center py-2 px-1 font-medium text-gray-500 text-xs whitespace-nowrap"
                          >
                            {field.label}
                          </th>
                        ))
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {batchRows.map((row, idx) => (
                      <tr
                        key={row.employeeId}
                        className="border-b border-gray-50 hover:bg-gray-50/50"
                      >
                        <td className="py-2 px-2 font-medium text-gray-900 sticky left-0 bg-white">
                          {row.employeeName}
                        </td>
                        <td className="py-2 px-2 text-gray-500">
                          {row.costCenter}
                        </td>
                        {ALL_KPI_KEYS.map((key) => (
                          <td key={key} className="py-1 px-1">
                            <input
                              type="number"
                              min={0}
                              value={row[key] === 0 ? "" : row[key]}
                              placeholder="0"
                              onChange={(e) =>
                                handleBatchChange(idx, key, e.target.value)
                              }
                              className="w-16 text-center border border-gray-200 rounded px-1 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400"
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Submit button */}
            <div className="flex justify-end">
              <Button
                onClick={handleBatchSubmit}
                loading={submitting}
                size="lg"
              >
                Alle speichern
              </Button>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
