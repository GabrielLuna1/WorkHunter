"use client";

import { LayoutGrid, List } from "lucide-react";
import { cn } from "@/lib/utils";

interface ViewToggleProps {
  view: "grid" | "list";
  onChange: (view: "grid" | "list") => void;
}

export default function ViewToggle({ view, onChange }: ViewToggleProps) {
  return (
    <div className="flex items-center gap-1 bg-surface border border-hairline rounded-md p-0.5">
      <button
        onClick={() => onChange("grid")}
        className={cn(
          "p-1.5 rounded transition-colors",
          view === "grid" ? "bg-accent text-black" : "text-ink-muted hover:text-ink"
        )}
        title="Visualização em grade"
      >
        <LayoutGrid className="w-4 h-4" />
      </button>
      <button
        onClick={() => onChange("list")}
        className={cn(
          "p-1.5 rounded transition-colors",
          view === "list" ? "bg-accent text-black" : "text-ink-muted hover:text-ink"
        )}
        title="Visualização em lista"
      >
        <List className="w-4 h-4" />
      </button>
    </div>
  );
}
