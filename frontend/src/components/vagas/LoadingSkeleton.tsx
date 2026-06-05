"use client";

export default function LoadingSkeleton({ view }: { view: "grid" | "list" }) {
  if (view === "list") {
    return (
      <div className="space-y-2">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-5 py-3.5 bg-surface border border-hairline rounded-lg animate-pulse">
            <div className="w-4 h-4 rounded bg-surface-2" />
            <div className="w-10 h-4 rounded bg-surface-2" />
            <div className="flex-1 grid grid-cols-12 gap-2">
              <div className="col-span-3 h-3 bg-surface-2 rounded" />
              <div className="col-span-4 h-3 bg-surface-2 rounded" />
              <div className="col-span-2 h-3 bg-surface-2 rounded" />
              <div className="col-span-1 h-3 bg-surface-2 rounded" />
              <div className="col-span-1 h-3 bg-surface-2 rounded" />
              <div className="col-span-1 h-3 bg-surface-2 rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="bg-surface border border-hairline rounded-xl p-5 h-[280px] animate-pulse">
          <div className="flex gap-4 mb-4">
            <div className="w-10 h-10 rounded-lg bg-surface-2" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-surface-2 rounded w-3/4" />
              <div className="h-3 bg-surface-2 rounded w-1/2" />
            </div>
          </div>
          <div className="space-y-2 mb-4">
            <div className="h-4 bg-surface-2 rounded w-full" />
            <div className="h-3 bg-surface-2 rounded w-4/5" />
          </div>
          <div className="space-y-2">
            <div className="h-3 bg-surface-2 rounded w-2/3" />
            <div className="h-3 bg-surface-2 rounded w-1/2" />
            <div className="h-3 bg-surface-2 rounded w-3/4" />
          </div>
        </div>
      ))}
    </div>
  );
}
