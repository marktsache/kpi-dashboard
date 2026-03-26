"use client";

import { useEffect } from "react";

/**
 * Warns the user when they try to close the tab or refresh with unsaved changes.
 * Note: In Next.js App Router, in-app navigation cannot be intercepted,
 * so this only handles browser close/refresh (beforeunload).
 */
export function useUnsavedChanges(isDirty: boolean): void {
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (!isDirty) return;
      e.preventDefault();
      // Modern browsers ignore custom messages but still show the dialog
      e.returnValue = "Ungespeicherte Änderungen vorhanden. Seite wirklich verlassen?";
    };

    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);
}
