"use client";

import React, { createContext, useContext, useState, useCallback } from "react";

interface KpiEntryContextValue {
  isOpen: boolean;
  preselectedWeek: string | null;
  preselectedEmployeeId: string | null;
  openKpiEntry: (week?: string, employeeId?: string) => void;
  closeKpiEntry: () => void;
}

const KpiEntryContext = createContext<KpiEntryContextValue | null>(null);

export function KpiEntryProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [preselectedWeek, setPreselectedWeek] = useState<string | null>(null);
  const [preselectedEmployeeId, setPreselectedEmployeeId] = useState<string | null>(null);

  const openKpiEntry = useCallback((week?: string, employeeId?: string) => {
    setPreselectedWeek(week ?? null);
    setPreselectedEmployeeId(employeeId ?? null);
    setIsOpen(true);
  }, []);

  const closeKpiEntry = useCallback(() => {
    setIsOpen(false);
    setPreselectedWeek(null);
    setPreselectedEmployeeId(null);
  }, []);

  return (
    <KpiEntryContext.Provider value={{ isOpen, preselectedWeek, preselectedEmployeeId, openKpiEntry, closeKpiEntry }}>
      {children}
    </KpiEntryContext.Provider>
  );
}

export function useKpiEntry(): KpiEntryContextValue {
  const ctx = useContext(KpiEntryContext);
  if (!ctx) throw new Error("useKpiEntry must be used within KpiEntryProvider");
  return ctx;
}
