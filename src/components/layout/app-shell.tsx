"use client";

import Sidebar from "./sidebar";
import Header from "./header";

interface AppShellProps {
  children: React.ReactNode;
  pageTitle: string;
}

export function AppShell({ children, pageTitle }: AppShellProps) {
  return (
    <div className="min-h-screen bg-[var(--background)] bg-mesh">
      <Sidebar />
      <div className="pl-[var(--sidebar-width)]">
        <Header pageTitle={pageTitle} />
        <main className="p-5 animate-fade-in">{children}</main>
      </div>
    </div>
  );
}
