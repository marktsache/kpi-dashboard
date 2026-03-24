"use client";

import { useSession } from "next-auth/react";

interface HeaderProps {
  pageTitle: string;
}

export default function Header({ pageTitle }: HeaderProps) {
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
      <h2 className="text-sm font-semibold text-gray-900">{pageTitle}</h2>

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
