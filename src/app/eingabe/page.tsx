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
import { useToast } from "@/components/ui/toast";

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
  profile: number;
  vorstellungsgespraeche: number;
  deals: number;
  eintritte: number;
  austritte: number;
}

interface BatchRow extends KpiValues {
  employeeId: string;
  employeeName: string;
  costCenter: string;
  comment: string;
}

interface MissingWeeksInfo {
  employeeName: string;
  missingWeeks: number[];
}

const EMPTY_KPI: KpiValues = {
  kundenbesuche: 0,
  telefonate: 0,
  auftraegeAkquiriert: 0,
  auftraegeAbgeschlossen: 0,
  profile: 0,
  vorstellungsgespraeche: 0,
  deals: 0,
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
      { key: "telefonate", label: "Telefonate" },
      { key: "auftraegeAkquiriert", label: "Aufträge akquiriert" },
      { key: "auftraegeAbgeschlossen", label: "Aufträge abgeschlossen" },
    ],
  },
  {
    section: "Profile",
    fields: [
      { key: "profile", label: "Profile" },
      { key: "vorstellungsgespraeche", label: "VG's" },
      { key: "deals", label: "Deals" },
    ],
  },
  {
    section: "Einstellungen",
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

function localISO(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function toMonday(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return localISO(d);
}

function toSunday(mondayStr: string): string {
  const d = new Date(mondayStr + "T12:00:00");
  d.setDate(d.getDate() + 6);
  return localISO(d);
}

function getISOWeek(dateStr: string): number {
  const d = new Date(dateStr + "T12:00:00");
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  return 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
}

function formatDE(dateStr: string): string {
  const parts = dateStr.split("-");
  return `${parts[2]}.${parts[1]}.${parts[0]}`;
}

function todayString(): string {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

/** Get the Monday of ISO week N in a given year */
function getMondayOfWeek(year: number, week: number): Date {
  const jan4 = new Date(year, 0, 4);
  const dayOfWeek = jan4.getDay() || 7;
  const monday = new Date(jan4);
  monday.setDate(jan4.getDate() - dayOfWeek + 1 + (week - 1) * 7);
  return monday;
}

/** Get current ISO week number */
function currentISOWeek(): number {
  return getISOWeek(todayString());
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function EingabePage() {
  const { status } = useSession();
  const router = useRouter();
  const toast = useToast();

  // Global state
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(true);
  const [date, setDate] = useState(() => toMonday(todayString()));
  const [batchMode, setBatchMode] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Single-entry state
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [singleValues, setSingleValues] = useState<KpiValues>({ ...EMPTY_KPI });
  const [singleComment, setSingleComment] = useState("");
  const [loadingExisting, setLoadingExisting] = useState(false);

  // Batch state
  const [batchRows, setBatchRows] = useState<BatchRow[]>([]);

  // Missing weeks
  const [missingWeeks, setMissingWeeks] = useState<MissingWeeksInfo[]>([]);

  // -----------------------------------------------------------------------
  // Date change handler - always snap to Monday
  // -----------------------------------------------------------------------

  const handleDateChange = (raw: string) => {
    setDate(toMonday(raw));
  };

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
        setBatchRows(
          data.map((emp) => ({
            employeeId: emp.id,
            employeeName: emp.name,
            costCenter: emp.costCenter,
            comment: "",
            ...EMPTY_KPI,
          }))
        );
      })
      .catch(() => toast.error("Mitarbeiter konnten nicht geladen werden."))
      .finally(() => setLoadingEmployees(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  // -----------------------------------------------------------------------
  // Check missing weeks
  // -----------------------------------------------------------------------

  useEffect(() => {
    if (status !== "authenticated" || employees.length === 0) return;

    const year = new Date().getFullYear();
    const jan1 = new Date(year, 0, 1).toISOString();
    const dec31 = new Date(year, 11, 31, 23, 59, 59).toISOString();
    const params = new URLSearchParams({ from: jan1, to: dec31 });

    fetch(`/api/kpi?${params}`)
      .then((r) => r.json())
      .then((entries: Array<{ employeeId: string; date: string }>) => {
        const maxWeek = currentISOWeek() - 1;
        if (maxWeek < 1) {
          setMissingWeeks([]);
          return;
        }

        const entryWeeksByEmployee = new Map<string, Set<number>>();
        for (const entry of entries) {
          const d = new Date(entry.date);
          const mondayStr = localISO(d);
          const kw = getISOWeek(mondayStr);
          if (!entryWeeksByEmployee.has(entry.employeeId)) {
            entryWeeksByEmployee.set(entry.employeeId, new Set());
          }
          entryWeeksByEmployee.get(entry.employeeId)!.add(kw);
        }

        const missing: MissingWeeksInfo[] = [];
        for (const emp of employees) {
          const existingWeeks = entryWeeksByEmployee.get(emp.id) || new Set();
          const empMissing: number[] = [];
          for (let kw = 1; kw <= maxWeek; kw++) {
            if (!existingWeeks.has(kw)) empMissing.push(kw);
          }
          if (empMissing.length > 0) {
            missing.push({ employeeName: emp.name, missingWeeks: empMissing });
          }
        }
        setMissingWeeks(missing);
      })
      .catch(() => {});
  }, [status, employees]);

  // -----------------------------------------------------------------------
  // Load existing KPI entry (single mode)
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
          setSingleComment(entry.comment || "");
        } else {
          setSingleValues({ ...EMPTY_KPI });
          setSingleComment("");
        }
      } catch {
        setSingleValues({ ...EMPTY_KPI });
        setSingleComment("");
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
              comment: (existing?.comment as string) || "",
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

  const handleSingleSubmit = async () => {
    if (!selectedEmployeeId) {
      toast.error("Bitte wählen Sie einen Mitarbeiter aus.");
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
          comment: singleComment || null,
          ...singleValues,
        }),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Fehler beim Speichern");
      }
      toast.success(
        `KPI-Daten für ${employee.name} (KW ${getISOWeek(date)}) gespeichert.`
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Fehler beim Speichern der KPI-Daten.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleBatchSubmit = async () => {
    const payload = batchRows
      .filter((row) => ALL_KPI_KEYS.some((k) => row[k] > 0))
      .map((row) => ({
        employeeId: row.employeeId,
        date,
        costCenter: row.costCenter,
        comment: row.comment || null,
        ...ALL_KPI_KEYS.reduce(
          (acc, k) => ({ ...acc, [k]: row[k] }),
          {} as KpiValues
        ),
      }));

    if (payload.length === 0) {
      toast.error("Keine Daten zum Speichern. Bitte mindestens einen Wert eingeben.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/kpi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Fehler beim Speichern");
      }
      toast.success(
        `KPI-Daten für ${payload.length} Mitarbeiter (KW ${getISOWeek(date)}) gespeichert.`
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Fehler beim Speichern der KPI-Daten.");
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

  const handleBatchCommentChange = (rowIdx: number, value: string) => {
    setBatchRows((prev) => {
      const next = [...prev];
      next[rowIdx] = { ...next[rowIdx], comment: value };
      return next;
    });
  };

  // -----------------------------------------------------------------------
  // Render guards
  // -----------------------------------------------------------------------

  if (status === "loading" || status === "unauthenticated") {
    return <Loading text="Laden..." className="min-h-screen" />;
  }

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
        {/* ---- Top controls: date + mode toggle ---- */}
        <Card>
          <div className="flex flex-wrap items-end gap-4">
            {/* Date picker - week only */}
            <div className="w-56">
              <Input
                label={`KW ${getISOWeek(date)}: ${formatDE(date)} – ${formatDE(toSunday(date))}`}
                type="date"
                value={date}
                onChange={(e) => handleDateChange(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-3 ml-auto">
              <span className="text-sm text-gray-600">Einzeleingabe</span>
              <button
                type="button"
                role="switch"
                aria-checked={batchMode}
                onClick={() => setBatchMode((b) => !b)}
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

        {/* ---- Missing weeks warning ---- */}
        {missingWeeks.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <svg className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <div>
                <h4 className="text-sm font-semibold text-amber-800 mb-2">Fehlende Kalenderwochen</h4>
                <div className="space-y-1.5">
                  {missingWeeks.map((info) => (
                    <div key={info.employeeName} className="flex flex-wrap items-center gap-1.5">
                      <span className="text-xs font-medium text-amber-900">{info.employeeName}:</span>
                      {info.missingWeeks.slice(0, 15).map((kw) => (
                        <button
                          key={kw}
                          onClick={() => {
                            const monday = getMondayOfWeek(new Date().getFullYear(), kw);
                            setDate(localISO(monday));
                          }}
                          className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-100 text-red-700 hover:bg-red-200 transition-colors cursor-pointer"
                        >
                          KW {kw}
                        </button>
                      ))}
                      {info.missingWeeks.length > 15 && (
                        <span className="text-[10px] text-amber-600">+{info.missingWeeks.length - 15} weitere</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {loadingEmployees ? (
          <Loading text="Mitarbeiter werden geladen..." />
        ) : !batchMode ? (
          /* ================================================================
             SINGLE ENTRY MODE
             ================================================================ */
          <div className="space-y-6">
            <Card>
              <div className="max-w-md">
                <Select
                  label="Mitarbeiter"
                  placeholder="Mitarbeiter auswählen..."
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

                {/* Comment field */}
                <Card title="Kommentar">
                  <textarea
                    value={singleComment}
                    onChange={(e) => setSingleComment(e.target.value)}
                    placeholder="Optionaler Kommentar zur Kalenderwoche..."
                    maxLength={500}
                    rows={3}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 resize-none"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">{singleComment.length}/500</p>
                </Card>

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
                      {KPI_FIELDS.map((section) => (
                        <th
                          key={section.section}
                          colSpan={section.fields.length}
                          className="text-center py-1 px-2 font-semibold text-gray-900 border-b border-gray-100"
                        >
                          {section.section}
                        </th>
                      ))}
                      <th className="text-center py-1 px-2 font-semibold text-gray-900 border-b border-gray-100 min-w-[120px]">
                        Kommentar
                      </th>
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
                      <th />
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
                        <td className="py-1 px-1">
                          <input
                            type="text"
                            value={row.comment}
                            onChange={(e) => handleBatchCommentChange(idx, e.target.value)}
                            placeholder="..."
                            maxLength={500}
                            className="w-28 border border-gray-200 rounded px-1 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

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
