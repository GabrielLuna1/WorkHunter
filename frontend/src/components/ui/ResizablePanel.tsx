"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface ResizablePanelProps {
  defaultRatio?: number;
  minLeft?: number;
  minRight?: number;
  storageKey?: string;
  left: React.ReactNode;
  right: React.ReactNode;
  leftClassName?: string;
  rightClassName?: string;
  className?: string;
}

export function ResizablePanel({
  defaultRatio = 0.6,
  minLeft = 300,
  minRight = 300,
  storageKey = "hub-split-ratio",
  left,
  right,
  leftClassName,
  rightClassName,
  className,
}: ResizablePanelProps) {
  const [ratio, setRatio] = useState(defaultRatio);

  useEffect(() => {
    const stored = localStorage.getItem(storageKey);
    if (stored) setRatio(parseFloat(stored));
  }, [storageKey]);
  const dragging = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    dragging.current = true;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const handlePointerMove = useCallback((e: PointerEvent) => {
    if (!dragging.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const totalWidth = rect.width;
    let newRatio = (e.clientX - rect.left) / totalWidth;
    const leftPx = newRatio * totalWidth;
    const rightPx = totalWidth - leftPx;
    if (leftPx < minLeft) newRatio = minLeft / totalWidth;
    if (rightPx < minRight) newRatio = 1 - minRight / totalWidth;
    setRatio(newRatio);
  }, [minLeft, minRight]);

  const handlePointerUp = useCallback(() => {
    if (dragging.current) {
      dragging.current = false;
      const r = ratio;
      try { localStorage.setItem(storageKey, String(r)); } catch {}
    }
  }, [ratio, storageKey]);

  useEffect(() => {
    const onMove = (e: PointerEvent) => handlePointerMove(e);
    const onUp = () => handlePointerUp();
    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
    return () => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
    };
  }, [handlePointerMove, handlePointerUp]);

  return (
    <div ref={containerRef} className={cn("flex flex-1 overflow-hidden", className)}>
      <div className={cn("overflow-hidden", leftClassName)} style={{ width: `${ratio * 100}%` }}>
        {left}
      </div>
      <div
        className="w-[5px] shrink-0 cursor-col-resize bg-transparent hover:bg-accent/30 active:bg-accent/50 transition-colors relative group"
        onPointerDown={handlePointerDown}
      >
        <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-[3px] rounded-full bg-hairline group-hover:bg-accent/50 group-active:bg-accent transition-colors" />
      </div>
      <div className={cn("overflow-hidden", rightClassName)} style={{ width: `${(1 - ratio) * 100}%` }}>
        {right}
      </div>
    </div>
  );
}
