"use client";

import { useEffect, useRef } from "react";
import { useSession, signOut } from "next-auth/react";
import { useToast } from "@/components/ui/toast";

/**
 * Monitors session status and shows a toast + redirect when session expires.
 * Must be placed inside SessionProvider and ToastProvider.
 */
export function SessionGuard({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const toast = useToast();
  const prevStatus = useRef(status);

  useEffect(() => {
    // Detect transition from "authenticated" to "unauthenticated"
    if (prevStatus.current === "authenticated" && status === "unauthenticated") {
      toast.info("Sitzung abgelaufen. Sie werden zur Anmeldung weitergeleitet.");
      setTimeout(() => {
        signOut({ callbackUrl: "/login" });
      }, 1500);
    }
    prevStatus.current = status;
  }, [status, toast]);

  return <>{children}</>;
}
