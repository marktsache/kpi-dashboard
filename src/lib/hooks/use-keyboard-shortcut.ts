"use client";

import { useEffect } from "react";

interface Modifiers {
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
}

/**
 * Registers a keyboard shortcut. Supports Ctrl/Cmd (Mac-compatible).
 */
export function useKeyboardShortcut(
  key: string,
  modifiers: Modifiers,
  callback: () => void,
  enabled: boolean = true
): void {
  useEffect(() => {
    if (!enabled) return;

    const handler = (e: KeyboardEvent) => {
      const ctrlOrCmd = e.ctrlKey || e.metaKey;

      if (modifiers.ctrl && !ctrlOrCmd) return;
      if (modifiers.shift && !e.shiftKey) return;
      if (modifiers.alt && !e.altKey) return;
      if (e.key.toLowerCase() !== key.toLowerCase()) return;

      e.preventDefault();
      callback();
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [key, modifiers, callback, enabled]);
}
