"use client";

import { useEffect } from "react";

interface ShortcutMap {
  onNovaSessao: () => void;
  onFocusInput: () => void;
  onToggleVagaBrowser: () => void;
  onToggleHelp?: () => void;
}

export function useKeyboardShortcuts(handlers: ShortcutMap) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;

      if (e.key === "n" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handlers.onNovaSessao();
        return;
      }

      if (e.key === "l" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handlers.onFocusInput();
        return;
      }

      if (e.key === "b" && (e.ctrlKey || e.metaKey) && e.shiftKey) {
        e.preventDefault();
        handlers.onToggleVagaBrowser();
        return;
      }

      if (e.key === "?" && !isInput) {
        e.preventDefault();
        handlers.onToggleHelp?.();
        return;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handlers]);
}
