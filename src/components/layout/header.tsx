"use client";

import { useSession } from "next-auth/react";

interface HeaderProps {
  pageTitle: string;
  onMenuClick?: () => void;
}

export default function Header({ pageTitle, onMenuClick }: HeaderProps) {
  const { data: session } = useSession();

  const userInitials = session?.user?.name
    ? session.user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

  return (
    <header className="sticky top-0 z-30 flex h-12 items-center justify-between border-b border-gray-200/60 bg-white/80 backdrop-blur-xl px-5">
      <div className="flex items-center gap-2">
        {onMenuClick && (
          <button
            onClick={onMenuClick}
            className="md:hidden p-1.5 -ml-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Menü öffnen"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          </button>
        )}
        <h2 className="text-sm font-semibold text-gray-900">{pageTitle}</h2>
      </div>

      <div className="flex items-center gap-2.5">
        {session?.user && (
          <>
            <div className="text-right hidden sm:block">
              <p className="text-xs font-medium text-gray-700 leading-none">
                {session.user.name ?? "Benutzer"}
              </p>
              <p className="text-[10px] text-gray-400 leading-none mt-0.5">
                {session.user.email ?? ""}
              </p>
            </div>
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-navy-700 to-navy-900 text-white text-[10px] font-bold ring-2 ring-white shadow-sm">
              {userInitials}
            </div>
          </>
        )}
      </div>
    </header>
  );
}
