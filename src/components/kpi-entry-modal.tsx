"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Modal } from "@/components/ui/modal";
import { Tabs } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Loading } from "@/components/ui/loading";
import { useToast } from "@/components/ui/toast";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useKpiEntry } from "@/lib/kpi-entry-context";
import { useKeyboardShortcut } from "@/lib/hooks/use-keyboard-shortcut";
import { useUnsavedChanges } from "@/lib/hooks/use-unsaved-changes";

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

const EMPTY_KPI: KpiValues = {
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
  return (
    1 +
    Math.round(
      ((d.getTime() - week1.getTime()) / 86400000 -
        3 +
        ((week1.getDay() + 6) % 7)) /
        7
    )
  );
}

function formatDE(dateStr: string): string {
  const parts = dateStr.split("-");
  return `${parts[2]}.${parts[1]}.${parts[0]}`;
}

function todayString(): string {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

function getMondayOfWeek(year: number, week: number): Date {
  const jan4 = new Date(year, 0, 4);
  const dayOfWeek = jan4.getDay() || 7;
  const monday = new Date(jan4);
  monday.setDate(jan4.getDate() - dayOfWeek + 1 + (week - 1) * 7);
  return monday;
}

function currentISOWeek(): number {
  return getISOWeek(todayString());
}

// ---------------------------------------------------------------------------
// Tabs config
// ---------------------------------------------------------------------------

const MODAL_TABS = [
  { key: "single", label: "Einzeleingabe" },
  { key: "batch", label: "Alle Mitarbeiter" },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function KpiEntryModal() {
  const { isOpen, preselectedWeek, preselectedEmployeeId, closeKpiEntry } =
    useKpiEntry();
  const toast = useToast();

  // Tab state
  const [activeTab, setActiveTab] = useState("single");

  // Global state
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [date, setDate] = useState(() => toMonday(todayString()));
  const [submitting, setSubmitting] = useState(false);

  // Single-entry state
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [singleValues, setSingleValues] = useState<KpiValues>({ ...EMPTY_KPI });
  const [singleComment, setSingleComment] = useState("");
  const [loadingExisting, setLoadingExisting] = useState(false);

  // Batch state
  const [batchRows, setBatchRows] = useState<BatchRow[]>([]);

  // Batch confirm dialog
  const [showBatchConfirm, setShowBatchConfirm] = useState(false);

  // Track which batch rows have been modified by the user
  const [modifiedRows, setModifiedRows] = useState<Set<string>>(new Set());

  // Dirty state
  const [isDirty, setIsDirty] = useState(false);

  // Missing weeks
  const [missingWeeks, setMissingWeeks] = useState<
    { employeeName: string; missingWeeks: number[] }[]
  >([]);

  // Unsaved changes warning (beforeunload)
  useUnsavedChanges(isDirty);

  // -----------------------------------------------------------------------
  // Reset state when modal opens
  // -----------------------------------------------------------------------

  useEffect(() => {
    if (!isOpen) return;

    // Apply preselected values
    if (preselectedWeek) {
      setDate(toMonday(preselectedWeek));
    } else {
      setDate(toMonday(todayString()));
    }

    if (preselectedEmployeeId) {
      setSelectedEmployeeId(preselectedEmployeeId);
      setActiveTab("single");
    } else {
      setSelectedEmployeeId("");
      setActiveTab("single");
    }

    setSingleValues({ ...EMPTY_KPI });
    setSingleComment("");
    setSingleInputs({});
    setBatchInputs({});
    setModifiedRows(new Set());
    setIsDirty(false);
    setSubmitting(false);
  }, [isOpen, preselectedWeek, preselectedEmployeeId]);

  // -----------------------------------------------------------------------
  // Date change handler - always snap to Monday
  // -----------------------------------------------------------------------

  const handleDateChange = (raw: string) => {
    setDate(toMonday(raw));
  };

  // -----------------------------------------------------------------------
  // Fetch employees on mount / when modal opens
  // -----------------------------------------------------------------------

  useEffect(() => {
    if (!isOpen) return;

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
  }, [isOpen]);

  // -----------------------------------------------------------------------
  // Check missing weeks
  // -----------------------------------------------------------------------

  useEffect(() => {
    if (!isOpen || employees.length === 0) return;

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

        const missing: { employeeName: string; missingWeeks: number[] }[] = [];
        for (const emp of employees) {
          const existingWeeks =
            entryWeeksByEmployee.get(emp.id) || new Set<number>();
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
  }, [isOpen, employees]);

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
          setSingleInputs({});
          setIsDirty(false);
        } else {
          setSingleValues({ ...EMPTY_KPI });
          setSingleComment("");
          setSingleInputs({});
          setIsDirty(false);
        }
      } catch {
        setSingleValues({ ...EMPTY_KPI });
        setSingleComment("");
        setSingleInputs({});
        setIsDirty(false);
      } finally {
        setLoadingExisting(false);
      }
    },
    []
  );

  useEffect(() => {
    if (isOpen && activeTab === "single" && selectedEmployeeId && date) {
      loadExistingEntry(selectedEmployeeId, date);
    }
  }, [isOpen, activeTab, selectedEmployeeId, date, loadExistingEntry]);

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
        setBatchInputs({});
        setModifiedRows(new Set());
        setIsDirty(false);
      } catch {
        // Keep defaults on error
      }
    },
    []
  );

  useEffect(() => {
    if (isOpen && activeTab === "batch" && employees.length > 0 && date) {
      loadBatchEntries(employees, date);
    }
  }, [isOpen, activeTab, employees, date, loadBatchEntries]);

  // -----------------------------------------------------------------------
  // Submit handlers
  // -----------------------------------------------------------------------

  const handleSingleSubmit = useCallback(async () => {
    if (!selectedEmployeeId) {
      toast.error("Bitte einen Mitarbeiter auswaehlen.");
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
      setIsDirty(false);
      window.dispatchEvent(new CustomEvent("kpi-entry-saved"));
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Fehler beim Speichern der KPI-Daten."
      );
    } finally {
      setSubmitting(false);
    }
  }, [selectedEmployeeId, employees, date, singleComment, singleValues, toast]);

  const handleBatchSubmit = useCallback(async () => {
    // Only save rows that were actually modified by the user
    const payload = batchRows
      .filter((row) => modifiedRows.has(row.employeeId))
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
      toast.error(
        "Keine Änderungen vorhanden. Bearbeiten Sie mindestens einen Mitarbeiter."
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
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Fehler beim Speichern");
      }
      toast.success(
        `KPI-Daten für ${payload.length} Mitarbeiter (KW ${getISOWeek(date)}) gespeichert.`
      );
      setIsDirty(false);
      setModifiedRows(new Set());
      window.dispatchEvent(new CustomEvent("kpi-entry-saved"));
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Fehler beim Speichern der KPI-Daten."
      );
    } finally {
      setSubmitting(false);
    }
  }, [batchRows, modifiedRows, date, toast]);

  // -----------------------------------------------------------------------
  // Keyboard shortcut: Ctrl+S to save
  // -----------------------------------------------------------------------

  useKeyboardShortcut(
    "s",
    { ctrl: true },
    () => {
      if (!isOpen) return;
      if (activeTab === "batch") {
        setShowBatchConfirm(true);
      } else {
        handleSingleSubmit();
      }
    },
    isOpen && !submitting
  );

  // -----------------------------------------------------------------------
  // Value change helpers
  // -----------------------------------------------------------------------

  // Use string-based state for inputs so "0" displays correctly
  const [singleInputs, setSingleInputs] = useState<Record<string, string>>({});
  const [batchInputs, setBatchInputs] = useState<Record<string, Record<string, string>>>({});

  const handleSingleChange = (key: keyof KpiValues, raw: string) => {
    setSingleInputs((prev) => ({ ...prev, [key]: raw }));
    const val = raw === "" ? 0 : parseInt(raw, 10);
    if (isNaN(val)) return;
    setSingleValues((prev) => ({ ...prev, [key]: val }));
    setIsDirty(true);
  };

  const getSingleInputValue = (key: keyof KpiValues): string => {
    if (key in singleInputs) return singleInputs[key];
    return String(singleValues[key]);
  };

  const handleBatchChange = (
    rowIdx: number,
    key: keyof KpiValues,
    raw: string
  ) => {
    const rowId = batchRows[rowIdx]?.employeeId || String(rowIdx);
    setBatchInputs((prev) => ({
      ...prev,
      [rowId]: { ...(prev[rowId] || {}), [key]: raw },
    }));
    setModifiedRows((prev) => new Set(prev).add(rowId));
    const val = raw === "" ? 0 : parseInt(raw, 10);
    if (isNaN(val)) return;
    setBatchRows((prev) => {
      const next = [...prev];
      next[rowIdx] = { ...next[rowIdx], [key]: val };
      return next;
    });
    setIsDirty(true);
  };

  const getBatchInputValue = (rowIdx: number, key: keyof KpiValues): string => {
    const rowId = batchRows[rowIdx]?.employeeId || String(rowIdx);
    if (batchInputs[rowId]?.[key] !== undefined) return batchInputs[rowId][key];
    return String(batchRows[rowIdx]?.[key] ?? 0);
  };

  const handleBatchCommentChange = (rowIdx: number, value: string) => {
    const rowId = batchRows[rowIdx]?.employeeId || String(rowIdx);
    setModifiedRows((prev) => new Set(prev).add(rowId));
    setBatchRows((prev) => {
      const next = [...prev];
      next[rowIdx] = { ...next[rowIdx], comment: value };
      return next;
    });
    setIsDirty(true);
  };

  // -----------------------------------------------------------------------
  // Close handler with dirty check
  // -----------------------------------------------------------------------

  const handleClose = () => {
    if (isDirty) {
      const confirmed = window.confirm(
        "Ungespeicherte Änderungen vorhanden. Modal wirklich schliessen?"
      );
      if (!confirmed) return;
    }
    setIsDirty(false);
    closeKpiEntry();
  };

  // -----------------------------------------------------------------------
  // Employee options
  // -----------------------------------------------------------------------

  const employeeOptions = employees.map((e) => ({
    value: e.id,
    label: `${e.name} (KST ${e.costCenter})`,
  }));

  // -----------------------------------------------------------------------
  // Modal size class based on active tab
  // -----------------------------------------------------------------------

  const modalClassName =
    activeTab === "batch"
      ? "!max-w-6xl max-h-[90vh] flex flex-col"
      : "!max-w-3xl max-h-[90vh] flex flex-col";

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        title="KPI-Eingabe"
        className={modalClassName}
      >
        <div className="flex flex-col gap-4 overflow-hidden -mx-5 -mb-5 px-5 pb-5">
          {/* Tabs */}
          <Tabs
            tabs={MODAL_TABS}
            activeTab={activeTab}
            onChange={setActiveTab}
          />

          {/* Date picker row */}
          <div className="flex items-end gap-3">
            <div className="w-48">
              <Input
                label={`KW ${getISOWeek(date)}: ${formatDE(date)} – ${formatDE(toSunday(date))}`}
                type="date"
                value={date}
                onChange={(e) => handleDateChange(e.target.value)}
              />
            </div>
          </div>

          {/* Missing weeks warning */}
          {missingWeeks.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <svg
                  className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
                <div>
                  <h4 className="text-xs font-semibold text-amber-800 mb-1.5">
                    Fehlende Kalenderwochen
                  </h4>
                  <div className="space-y-1">
                    {missingWeeks.map((info) => (
                      <div
                        key={info.employeeName}
                        className="flex flex-wrap items-center gap-1"
                      >
                        <span className="text-[10px] font-medium text-amber-900">
                          {info.employeeName}:
                        </span>
                        {info.missingWeeks.slice(0, 10).map((kw) => (
                          <button
                            key={kw}
                            onClick={() => {
                              const monday = getMondayOfWeek(
                                new Date().getFullYear(),
                                kw
                              );
                              setDate(localISO(monday));
                            }}
                            className="inline-flex items-center px-1 py-0.5 rounded text-[9px] font-semibold bg-red-100 text-red-700 hover:bg-red-200 transition-colors cursor-pointer"
                          >
                            KW {kw}
                          </button>
                        ))}
                        {info.missingWeeks.length > 10 && (
                          <span className="text-[9px] text-amber-600">
                            +{info.missingWeeks.length - 10} weitere
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Content area */}
          <div className="overflow-y-auto flex-1 min-h-0">
            {loadingEmployees ? (
              <Loading text="Mitarbeiter werden geladen..." size="sm" />
            ) : activeTab === "single" ? (
              /* ============================================================
                 SINGLE ENTRY TAB
                 ============================================================ */
              <div className="space-y-4">
                <div className="max-w-xs">
                  <Select
                    label="Mitarbeiter"
                    placeholder="Mitarbeiter auswaehlen..."
                    options={employeeOptions}
                    value={selectedEmployeeId}
                    onChange={(e) => setSelectedEmployeeId(e.target.value)}
                  />
                </div>

                {loadingExisting && (
                  <Loading
                    size="sm"
                    text="Vorhandene Daten werden geladen..."
                  />
                )}

                {selectedEmployeeId && !loadingExisting && (
                  <>
                    {KPI_FIELDS.map((section) => (
                      <div key={section.section}>
                        <h4 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-2">
                          {section.section}
                        </h4>
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                          {section.fields.map((field) => (
                            <Input
                              key={field.key}
                              label={field.label}
                              type="number"
                              min={0}
                              value={getSingleInputValue(field.key)}
                              placeholder="0"
                              onChange={(e) =>
                                handleSingleChange(field.key, e.target.value)
                              }
                            />
                          ))}
                        </div>
                      </div>
                    ))}

                    {/* Comment field */}
                    <div>
                      <h4 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-2">
                        Kommentar
                      </h4>
                      <textarea
                        value={singleComment}
                        onChange={(e) => {
                          setSingleComment(e.target.value);
                          setIsDirty(true);
                        }}
                        placeholder="Optionaler Kommentar zur Kalenderwoche..."
                        maxLength={500}
                        rows={2}
                        className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 resize-none"
                      />
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        {singleComment.length}/500
                      </p>
                    </div>

                    {/* Save button */}
                    <div className="flex justify-end pt-2">
                      <Button
                        onClick={handleSingleSubmit}
                        loading={submitting}
                        size="md"
                      >
                        Speichern
                        <span className="ml-2 text-[10px] opacity-60 hidden sm:inline">
                          Ctrl+S
                        </span>
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              /* ============================================================
                 BATCH ENTRY TAB
                 ============================================================ */
              <div className="space-y-4">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-2 px-1.5 font-semibold text-gray-700 sticky left-0 bg-white min-w-[120px]">
                          Mitarbeiter
                        </th>
                        <th className="text-left py-2 px-1.5 font-semibold text-gray-500 min-w-[50px]">
                          KST
                        </th>
                        {KPI_FIELDS.map((section) => (
                          <th
                            key={section.section}
                            colSpan={section.fields.length}
                            className="text-center py-1 px-1 font-semibold text-gray-900 border-b border-gray-100"
                          >
                            {section.section}
                          </th>
                        ))}
                        <th className="text-center py-1 px-1 font-semibold text-gray-900 border-b border-gray-100 min-w-[100px]">
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
                              className="text-center py-1.5 px-0.5 font-medium text-gray-500 text-[10px] whitespace-nowrap"
                            >
                              {field.label}
                            </th>
                          ))
                        )}
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {batchRows.map((row, idx) => {
                        const isModified = modifiedRows.has(row.employeeId);
                        return (
                        <tr
                          key={row.employeeId}
                          className={`border-b border-gray-50 ${isModified ? "bg-blue-50/50" : "hover:bg-gray-50/50"}`}
                        >
                          <td className={`py-1.5 px-1.5 font-medium text-gray-900 sticky left-0 text-xs ${isModified ? "bg-blue-50/50" : "bg-white"}`}>
                            <span className="flex items-center gap-1.5">
                              {isModified && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />}
                              {row.employeeName}
                            </span>
                          </td>
                          <td className="py-1.5 px-1.5 text-gray-500 text-xs">
                            {row.costCenter}
                          </td>
                          {ALL_KPI_KEYS.map((key) => (
                            <td key={key} className="py-1 px-0.5">
                              <input
                                type="number"
                                min={0}
                                value={getBatchInputValue(idx, key)}
                                placeholder="0"
                                onChange={(e) =>
                                  handleBatchChange(idx, key, e.target.value)
                                }
                                className="w-16 text-center border border-gray-200 rounded px-1 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400"
                              />
                            </td>
                          ))}
                          <td className="py-1 px-0.5">
                            <input
                              type="text"
                              value={row.comment}
                              onChange={(e) =>
                                handleBatchCommentChange(idx, e.target.value)
                              }
                              placeholder="..."
                              maxLength={500}
                              className="w-32 border border-gray-200 rounded px-1.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400"
                            />
                          </td>
                        </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Save button */}
                <div className="flex justify-end pt-2">
                  <Button
                    onClick={() => setShowBatchConfirm(true)}
                    loading={submitting}
                    size="md"
                  >
                    Alle speichern
                    <span className="ml-2 text-[10px] opacity-60 hidden sm:inline">
                      Ctrl+S
                    </span>
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={showBatchConfirm}
        onClose={() => setShowBatchConfirm(false)}
        onConfirm={() => {
          setShowBatchConfirm(false);
          handleBatchSubmit();
        }}
        title="Änderungen speichern?"
        description={`Möchten Sie die KPI-Daten für ${modifiedRows.size} geänderte(n) Mitarbeiter speichern? Nicht bearbeitete Mitarbeiter bleiben unverändert.`}
        variant="warning"
        confirmLabel="Speichern"
      />
    </>
  );
}
