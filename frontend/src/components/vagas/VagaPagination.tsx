"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface VagaPaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export default function VagaPagination({ page, totalPages, onPageChange }: VagaPaginationProps) {
  const [inputValue, setInputValue] = useState("");

  if (totalPages <= 1) return null;

  const getPages = () => {
    const pages: (number | "...")[] = [];
    const delta = 2;
    const left = Math.max(2, page - delta);
    const right = Math.min(totalPages - 1, page + delta);

    pages.push(1);
    if (left > 2) pages.push("...");
    for (let i = left; i <= right; i++) pages.push(i);
    if (right < totalPages - 1) pages.push("...");
    if (totalPages > 1) pages.push(totalPages);

    return pages;
  };

  const handleGoTo = () => {
    const p = parseInt(inputValue, 10);
    if (p >= 1 && p <= totalPages) {
      onPageChange(p);
      setInputValue("");
    }
  };

  return (
    <div className="flex items-center justify-center gap-2">
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        className="p-1.5 rounded-md bg-surface border border-hairline text-ink-muted hover:text-ink hover:border-hairline-strong transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      <div className="flex items-center gap-1">
        {getPages().map((p, i) =>
          p === "..." ? (
            <span key={`ellipsis-${i}`} className="px-1 text-ink-tertiary text-sm">...</span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              className={cn(
                "min-w-[32px] h-8 rounded-md text-sm font-medium transition-colors",
                p === page
                  ? "bg-accent text-black"
                  : "bg-surface border border-hairline text-ink-muted hover:text-ink hover:border-hairline-strong"
              )}
            >
              {p}
            </button>
          )
        )}
      </div>

      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        className="p-1.5 rounded-md bg-surface border border-hairline text-ink-muted hover:text-ink hover:border-hairline-strong transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <ChevronRight className="w-4 h-4" />
      </button>

      <div className="flex items-center gap-1 ml-4">
        <span className="text-[12px] text-ink-subtle">Ir para:</span>
        <input
          type="number"
          min={1}
          max={totalPages}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleGoTo()}
          className="w-14 bg-surface border border-hairline text-sm text-ink text-center rounded-md px-1 py-1 focus:border-accent focus:outline-none transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
      </div>
    </div>
  );
}
