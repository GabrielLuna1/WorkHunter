"use client";

import { useCallback, useRef, useState } from "react";
import { HubChat } from "@/components/hub/HubChat";
import { HubContext, type HubView, type HubViewData } from "@/components/hub/HubContext";
import { ResizablePanel } from "@/components/ui/ResizablePanel";
import { ShortcutsHelp } from "@/components/hub/ShortcutsHelp";
import { useKeyboardShortcuts } from "@/lib/use-keyboard-shortcuts";
import { PageTransition } from "@/components/ui/PageTransition";
import { Keyboard, Search } from "lucide-react";
import type { Vaga } from "@/lib/api";

export default function HubPage() {
  const [view, setView] = useState<HubView>("welcome");
  const [viewData, setViewData] = useState<HubViewData>({});
  const [contextLoading, setContextLoading] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showBrowser, setShowBrowser] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleContextChange = useCallback((newView: HubView, data: HubViewData, loading?: boolean) => {
    setView(newView);
    setViewData((prev) => ({ ...prev, ...data }));
    if (loading !== undefined) setContextLoading(loading);
  }, []);

  const handleQuickAction = useCallback((action: string, vagaId?: string) => {
    if (action === "close_browser") {
      setShowBrowser(false);
      setView("welcome");
      return;
    }
    if (action === "abrir_browser") {
      setShowBrowser(true);
      setView("vagas_browser");
      return;
    }
    const event = new CustomEvent("hub-quick-action", { detail: { action, vagaId } });
    document.dispatchEvent(event);
  }, []);

  const handleSelectVaga = useCallback((vaga: Vaga) => {
    setView("vaga");
    setViewData((prev) => ({ ...prev, vaga }));
    setShowBrowser(false);
  }, []);

  const handleNovaSessao = useCallback(() => {
    const event = new CustomEvent("hub-new-session");
    document.dispatchEvent(event);
  }, []);

  const handleToggleVagaBrowser = useCallback(() => {
    setShowBrowser((prev) => {
      if (!prev) {
        setView("vagas_browser");
      } else {
        setView("welcome");
      }
      return !prev;
    });
  }, []);

  const handleFocusInput = useCallback(() => {
    const event = new CustomEvent("hub-focus-input");
    document.dispatchEvent(event);
  }, []);

  useKeyboardShortcuts({
    onNovaSessao: handleNovaSessao,
    onFocusInput: handleFocusInput,
    onToggleVagaBrowser: handleToggleVagaBrowser,
    onToggleHelp: () => setShowShortcuts((p) => !p),
  });

  const handleRightPanelAction = useCallback((action: string) => {
    if (action === "analisar" || action === "match" || action === "cover_letter") {
      const vagaId = viewData?.vaga?.id;
      handleQuickAction(action, vagaId);
    } else {
      handleQuickAction(action);
    }
  }, [handleQuickAction, viewData]);

  return (
    <PageTransition className="h-full flex flex-col bg-canvas">
      <div className="flex items-center justify-between px-4 py-1.5 border-b border-hairline bg-surface-2/30">
        <p className="text-[12px] text-ink-subtle">Hub Copilot</p>
        <div className="flex items-center gap-1">
          <button onClick={handleToggleVagaBrowser}
            className={showBrowser
              ? "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium bg-accent/15 text-accent border border-accent/30"
              : "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] text-ink-subtle hover:text-accent hover:bg-surface-2 transition-colors"
            }>
            <Search className="w-3.5 h-3.5" />
            Vagas
          </button>
          <button onClick={() => setShowShortcuts((p) => !p)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] text-ink-subtle hover:text-accent hover:bg-surface-2 transition-colors">
            <Keyboard className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <ResizablePanel
        storageKey="hub-panel-ratio"
        defaultRatio={0.55}
        minLeft={400}
        minRight={360}
        left={
          <HubChat onContextChange={handleContextChange} />
        }
        right={
          <HubContext
            view={view}
            data={viewData}
            onAction={handleRightPanelAction}
            loading={contextLoading}
            onSelectVaga={handleSelectVaga}
          />
        }
      />

      {showShortcuts && <ShortcutsHelp onClose={() => setShowShortcuts(false)} />}
    </PageTransition>
  );
}
