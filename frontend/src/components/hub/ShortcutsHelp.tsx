"use client";

import { X, Keyboard } from "lucide-react";

const SHORTCUTS = [
  { keys: ["Ctrl", "N"], desc: "Nova sessão de chat" },
  { keys: ["Ctrl", "L"], desc: "Focar no input" },
  { keys: ["Ctrl", "Shift", "B"], desc: "Abrar vagas" },
  { keys: ["?"], desc: "Mostrar atalhos" },
];

export function ShortcutsHelp({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-canvas border border-hairline rounded-2xl shadow-2xl w-[420px] max-w-[90vw] overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-hairline">
          <div className="flex items-center gap-2">
            <Keyboard className="w-4 h-4 text-accent" />
            <h2 className="text-sm font-semibold text-ink font-heading">Atalhos do Teclado</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-surface-2 text-ink-tertiary hover:text-ink transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 space-y-2">
          {SHORTCUTS.map((s) => (
            <div key={s.keys.join("-")} className="flex items-center justify-between py-2">
              <span className="text-[13px] text-ink-muted">{s.desc}</span>
              <div className="flex items-center gap-1">
                {s.keys.map((k) => (
                  <kbd key={k} className="px-2 py-0.5 text-[11px] font-medium text-ink-subtle bg-surface-2 border border-hairline rounded-md">
                    {k}
                  </kbd>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
