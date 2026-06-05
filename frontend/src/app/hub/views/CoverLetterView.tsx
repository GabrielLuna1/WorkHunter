"use client";

import { useState } from "react";
import { FileText, Copy, Check, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export function CoverLetterView({ text, assunto, onAction }: {
  text: string;
  assunto?: string;
  onAction: (action: string) => void;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold metallic-gradient font-heading mb-1">Cover Letter</h2>
          <p className="text-[12px] text-ink-subtle">Carta de apresentação gerada por IA</p>
        </div>
        <button onClick={handleCopy}
          className={cn(
            "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium border transition-all shrink-0",
            copied ? "bg-success/10 text-success border-success/20" : "bg-surface-2 text-ink-subtle hover:text-accent border-hairline"
          )}>
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? "Copiado" : "Copiar"}
        </button>
      </div>

      {assunto && (
        <div className="bg-surface-2 border border-hairline rounded-lg px-4 py-2.5">
          <p className="text-[11px] text-ink-subtle mb-0.5">Assunto</p>
          <p className="text-[13px] text-ink font-medium">{assunto}</p>
        </div>
      )}

      <div className="bg-surface-2 border border-hairline rounded-xl p-5">
        <p className="text-[13px] text-ink-muted leading-relaxed whitespace-pre-wrap">{text}</p>
      </div>

      <button onClick={() => onAction("otimizar")}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium bg-accent/10 text-accent hover:bg-accent/20 border border-accent/20 transition-colors">
        <Sparkles className="w-3.5 h-3.5" /> Gerar outra
      </button>
    </div>
  );
}
