"use client";

import { cn } from "@/lib/utils";

function SkeletonBlock({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return <div className={cn("bg-surface-2 rounded animate-pulse", className)} style={style} />;
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn("bg-surface border border-hairline rounded-xl p-5", className)}>
      <div className="flex items-start justify-between mb-4">
        <SkeletonBlock className="h-3 w-20" />
        <SkeletonBlock className="w-8 h-8 rounded-md" />
      </div>
      <SkeletonBlock className="h-8 w-24 mb-2" />
      <SkeletonBlock className="h-3 w-36" />
    </div>
  );
}

export function SkeletonChart({ className }: { className?: string }) {
  return (
    <div className={cn("bg-surface border border-hairline rounded-xl p-5", className)}>
      <SkeletonBlock className="h-4 w-40 mb-1" />
      <SkeletonBlock className="h-3 w-56 mb-5" />
      <div className="flex items-end gap-2 h-[200px] pt-4">
        {[...Array(8)].map((_, i) => (
          <SkeletonBlock
            key={i}
            className="flex-1 rounded-t"
            style={{ height: `${40 + Math.random() * 60}%` }}
          />
        ))}
      </div>
    </div>
  );
}

export function SkeletonRow({ lines = 1 }: { lines?: number }) {
  return (
    <div className="space-y-2">
      {[...Array(lines)].map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-5 py-3.5 bg-surface border border-hairline rounded-lg animate-pulse">
          <SkeletonBlock className="w-4 h-4 rounded" />
          <SkeletonBlock className="w-10 h-4 rounded" />
          <SkeletonBlock className="flex-1 h-3 rounded" style={{ maxWidth: `${60 + Math.random() * 30}%` }} />
          <SkeletonBlock className="w-16 h-3 rounded" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonAnalytics() {
  return (
    <div className="min-h-screen bg-canvas pb-12">
      <div className="border-b border-hairline bg-canvas/80 px-8 py-6">
        <SkeletonBlock className="h-6 w-48 mb-2" />
        <SkeletonBlock className="h-4 w-80" />
      </div>
      <div className="px-8 py-8 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {[...Array(2)].map((_, i) => <SkeletonChart key={i} />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {[...Array(3)].map((_, i) => <SkeletonChart key={i} />)}
        </div>
      </div>
    </div>
  );
}

export default SkeletonBlock;
