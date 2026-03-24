"use client";

import { SessionProvider } from "next-auth/react";
import { ToastProvider } from "@/components/ui/toast";
import { FilterProvider } from "@/lib/filter-context";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ToastProvider>
        <FilterProvider>{children}</FilterProvider>
      </ToastProvider>
    </SessionProvider>
  );
}
