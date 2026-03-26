"use client";

import { useState } from "react";
import Sidebar from "./sidebar";

interface AppShellProps {
  children: React.ReactNode;
  pageTitle: string;
}

export function AppShell({ children, pageTitle }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[var(--background)] bg-mesh">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="pl-0 md:pl-[var(--sidebar-width)] min-h-screen">
        {/* Mobile top bar */}
        <div className="sticky top-0 z-30 flex h-12 items-center gap-2 border-b border-gray-200/60 bg-white/80 backdrop-blur-xl px-4 md:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1.5 -ml-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Menü öffnen"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          </button>
          <h2 className="text-sm font-semibold text-gray-900">{pageTitle}</h2>
        </div>
        <main className="p-4 md:p-5 animate-fade-in">{children}</main>
      </div>
    </div>
  );
}
