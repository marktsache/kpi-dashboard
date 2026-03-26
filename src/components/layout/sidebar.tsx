"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useMissingWeeks } from "@/lib/hooks/use-missing-weeks";

interface Employee {
  id: string;
  name: string;
  costCenter: string;
  active: boolean;
  photoUrl?: string | null;
}

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export default function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { count: missingWeeks } = useMissingWeeks();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const fetchEmployees = () => {
    fetch("/api/employees?active=true")
      .then((res) => res.json())
      .then((data: Employee[]) => {
        const sorted = [...data].sort((a, b) => a.name.localeCompare(b.name, "de"));
        setEmployees(sorted);
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchEmployees();
    const handler = () => fetchEmployees();
    window.addEventListener("employee-updated", handler);
    return () => window.removeEventListener("employee-updated", handler);
  }, []);

  const isDashboardActive = pathname === "/";
  const isEinstellungenActive = pathname.startsWith("/einstellungen");

  const userInitials = session?.user?.name
    ? session.user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

  return (
    <>
      {/* Mobile backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-navy-950/60 backdrop-blur-sm md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed left-0 top-0 z-40 h-screen w-[var(--sidebar-width)] flex flex-col bg-navy-950 text-white overflow-hidden
          transform transition-transform duration-300 ease-in-out
          ${open ? "translate-x-0" : "-translate-x-full"}
          md:translate-x-0
        `}
      >
        {/* Subtle gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-navy-900/50 via-transparent to-navy-950/80 pointer-events-none" />

        {/* Mobile close button */}
        <div className="absolute top-3 right-3 md:hidden z-50">
          <button
            onClick={onClose}
            className="text-white/40 hover:text-white/80 transition-colors p-1"
            aria-label="Menü schließen"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Brand */}
        <div className="relative px-5 pt-5 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-400 to-blue-600 shadow-glow">
              <svg viewBox="0 0 20 20" fill="white" className="w-4 h-4">
                <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h1 className="text-[15px] font-bold tracking-tight leading-none">
                CORE<span className="text-blue-400">.kpi</span>
              </h1>
              <p className="text-[9px] font-medium uppercase tracking-[0.2em] text-blue-300/50 mt-0.5">
                Hanseaten
              </p>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="mx-4 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

        {/* Navigation */}
        <nav className="relative flex-1 overflow-y-auto px-3 pt-3 pb-2">
          <ul className="space-y-0.5">
            {/* Dashboard */}
            <li>
              <Link
                href="/"
                onClick={() => onClose()}
                className={`group flex items-center gap-2.5 rounded-lg px-2.5 py-[7px] text-[13px] font-medium transition-all duration-150 ${
                  isDashboardActive
                    ? "bg-blue-600/20 text-blue-300 nav-active"
                    : "text-white/50 hover:text-white/90 hover:bg-white/[0.06]"
                }`}
              >
                <span className={`flex-shrink-0 ${isDashboardActive ? "text-blue-400" : "text-white/40 group-hover:text-white/70"}`}>
                  <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                    <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
                  </svg>
                </span>
                Dashboard
                {missingWeeks > 0 && (
                  <span className="ml-auto bg-red-500 text-white text-[9px] font-bold min-w-[18px] h-[18px] flex items-center justify-center px-1 rounded-full">
                    {missingWeeks > 99 ? "99+" : missingWeeks}
                  </span>
                )}
                {isDashboardActive && missingWeeks === 0 && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-400" />
                )}
              </Link>
            </li>
          </ul>

          {/* Mitarbeiter Section */}
          <div className="mt-4">
            <div className="flex items-center gap-2 px-2.5 mb-1.5">
              <span className="text-white/30">
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                  <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                </svg>
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-white/30 select-none">
                Mitarbeiter
              </span>
            </div>
            <ul className="space-y-0.5">
              {employees.map((emp) => {
                const empActive = pathname.startsWith(`/mitarbeiter/${emp.id}`);
                return (
                  <li key={emp.id}>
                    <Link
                      href={`/mitarbeiter/${emp.id}`}
                      onClick={() => onClose()}
                      className={`group flex items-center gap-2 rounded-lg pl-3 pr-2.5 py-[5px] text-[12px] font-medium transition-all duration-150 ${
                        empActive
                          ? "bg-blue-600/20 text-blue-300 nav-active"
                          : "text-white/50 hover:text-white/90 hover:bg-white/[0.06]"
                      }`}
                    >
                      {/* Employee avatar */}
                      {emp.photoUrl ? (
                        <img
                          src={emp.photoUrl}
                          alt={emp.name}
                          className="h-5 w-5 rounded-full object-cover flex-shrink-0"
                        />
                      ) : (
                        <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[8px] font-bold flex-shrink-0 ${
                          empActive
                            ? "bg-blue-400/30 text-blue-300"
                            : "bg-white/10 text-white/40"
                        }`}>
                          {emp.name.split(" ").map((s) => s[0]).join("").toUpperCase().slice(0, 2)}
                        </span>
                      )}
                      <span className="truncate">{emp.name}</span>
                      <span className={`ml-auto flex-shrink-0 rounded-full px-1.5 py-[1px] text-[9px] font-semibold ${
                        empActive
                          ? emp.costCenter === "370" ? "bg-yellow-400/20 text-yellow-300"
                            : emp.costCenter === "350" ? "bg-orange-400/20 text-orange-300"
                            : "bg-blue-400/20 text-blue-300"
                          : "bg-white/[0.08] text-white/35"
                      }`}>
                        {emp.costCenter}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </nav>

        {/* ── Bottom Section: Einstellungen + User ── */}
        <div className="relative mt-auto">
          <div className="mx-4 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

          <div className="px-3 py-2 space-y-0.5">
            {/* Einstellungen */}
            <Link
              href="/einstellungen"
              onClick={() => onClose()}
              className={`group flex items-center gap-2.5 rounded-lg px-2.5 py-[7px] text-[13px] font-medium transition-all duration-150 ${
                isEinstellungenActive
                  ? "bg-blue-600/20 text-blue-300 nav-active"
                  : "text-white/40 hover:text-white/80 hover:bg-white/[0.06]"
              }`}
            >
              <span className={`flex-shrink-0 ${isEinstellungenActive ? "text-blue-400" : "text-white/30 group-hover:text-white/60"}`}>
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                  <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                </svg>
              </span>
              Einstellungen
              {isEinstellungenActive && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-400" />
              )}
            </Link>
          </div>

          <div className="mx-4 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

          {/* User Account */}
          <div className="px-3 py-3">
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] hover:bg-white/[0.06] transition-all group"
              >
                {session?.user?.photoUrl ? (
                  <img
                    src={session.user.photoUrl}
                    alt={session?.user?.name ?? ""}
                    className="h-8 w-8 rounded-full object-cover flex-shrink-0 ring-2 ring-white/10"
                  />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-[10px] font-bold flex-shrink-0 ring-2 ring-white/10">
                    {userInitials}
                  </div>
                )}
                <div className="flex-1 text-left min-w-0">
                  <p className="text-[12px] font-medium text-white/80 truncate leading-none">
                    {session?.user?.name ?? "Benutzer"}
                  </p>
                  <p className="text-[10px] text-white/30 truncate leading-none mt-0.5">
                    {session?.user?.email ?? ""}
                  </p>
                </div>
                <svg
                  className={`w-3.5 h-3.5 text-white/30 transition-transform ${userMenuOpen ? "rotate-180" : ""}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="2"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
                </svg>
              </button>

              {/* Dropdown menu */}
              {userMenuOpen && (
                <div className="absolute bottom-full left-0 right-0 mb-1 bg-navy-900 border border-white/10 rounded-lg shadow-xl overflow-hidden">
                  <button
                    onClick={() => {
                      setUserMenuOpen(false);
                      onClose();
                      signOut({ callbackUrl: "/login" });
                    }}
                    className="flex w-full items-center gap-2.5 px-4 py-2.5 text-[12px] font-medium text-red-400 hover:bg-white/[0.06] transition-colors"
                  >
                    <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                      <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" />
                    </svg>
                    Abmelden
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
