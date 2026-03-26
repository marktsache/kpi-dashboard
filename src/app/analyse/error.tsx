"use client";

import { useEffect } from "react";
import { AppShell } from "@/components/layout/app-shell";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Page error:", error);
  }, [error]);

  return (
    <AppShell pageTitle="Analyse">
      <div className="flex items-center justify-center py-20">
        <div className="bg-white rounded-xl shadow-card border border-gray-100 p-8 max-w-md w-full text-center">
          <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
            <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </div>
          <h2 className="text-sm font-semibold text-gray-900 mb-2">Ein Fehler ist aufgetreten</h2>
          <p className="text-xs text-gray-500 mb-6">
            {error.message || "Etwas ist schiefgelaufen. Bitte versuchen Sie es erneut."}
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={reset}
              className="px-4 py-2 text-xs font-semibold text-white bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all shadow-sm"
            >
              Erneut versuchen
            </button>
            <a
              href="/"
              className="px-4 py-2 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Zur Startseite
            </a>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
