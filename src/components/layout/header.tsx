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
    : "??";

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6">
      {/* Page title */}
      <h2 className="text-xl font-semibold text-gray-900">{pageTitle}</h2>

      {/* User info */}
      <div className="flex items-center gap-3">
        {session?.user && (
          <>
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-gray-900 leading-tight">
                {session.user.name ?? "Benutzer"}
              </p>
              <p className="text-xs text-gray-500 leading-tight">
                {session.user.email ?? ""}
              </p>
            </div>

            {/* Avatar placeholder */}
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-700 text-white text-xs font-bold">
              {userInitials}
            </div>
          </>
        )}
      </div>
    </header>
  );
}
