"use client";

import Sidebar from "./sidebar";
import Header from "./header";

interface AppShellProps {
  children: React.ReactNode;
  pageTitle: string;
}

export function AppShell({ children, pageTitle }: AppShellProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <div className="pl-64">
        <Header pageTitle={pageTitle} />
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
