"use client";

import { SessionProvider } from "next-auth/react";
import { ToastProvider } from "@/components/ui/toast";
import { SessionGuard } from "@/components/session-guard";
import { FilterProvider } from "@/lib/filter-context";
import { KpiEntryProvider } from "@/lib/kpi-entry-context";
import { KpiEntryModal } from "@/components/kpi-entry-modal";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider refetchInterval={300} refetchOnWindowFocus={true}>
      <ToastProvider>
        <SessionGuard>
          <FilterProvider>
            <KpiEntryProvider>
              {children}
              <KpiEntryModal />
            </KpiEntryProvider>
          </FilterProvider>
        </SessionGuard>
      </ToastProvider>
    </SessionProvider>
  );
}
