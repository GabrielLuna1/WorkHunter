"use client";

import { useState, useEffect } from "react";
import { MessageCircle, Loader2, CheckCircle2, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";

export function TelegramSettings() {
  const [open, setOpen] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [chatId, setChatId] = useState("");
  const [notifyMatch, setNotifyMatch] = useState(true);
  const [notifyPipeline, setNotifyPipeline] = useState(true);
  const [notifyDaily, setNotifyDaily] = useState(true);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    api.get("/api/v1/notifications/telegram")
      .then((r: any) => {
        const d = r.data;
        setEnabled(d.enabled);
        setChatId(d.chat_id);
        setNotifyMatch(d.notify_match);
        setNotifyPipeline(d.notify_pipeline);
        setNotifyDaily(d.notify_daily);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put("/api/v1/notifications/telegram", {
        enabled, chat_id: chatId,
        notify_match: notifyMatch,
        notify_pipeline: notifyPipeline,
        notify_daily: notifyDaily,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {}
    setSaving(false);
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      await api.post("/api/v1/notifications/telegram/testar");
      setTestResult("ok");
    } catch {
      setTestResult("erro");
    }
    setTesting(false);
  };

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium bg-accent/10 text-accent hover:bg-accent/20 border border-accent/20 transition-colors"
      >
        <MessageCircle className="w-3.5 h-3.5" />
        Telegram
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20">
          <div className="fixed inset-0 bg-canvas/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative bg-surface border border-hairline rounded-xl shadow-2xl w-full max-w-lg p-6 animate-fade-in-up">
            <h2 className="text-[15px] font-semibold metallic-gradient font-heading mb-4 flex items-center gap-2">
              <MessageCircle className="w-4 h-4" />
              Notificações Telegram
            </h2>

            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-accent" />
              </div>
            ) : (
              <div className="space-y-5">
                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <span className="text-[13px] text-ink font-medium">Ativar notificações</span>
                    <p className="text-[11px] text-ink-tertiary">Receba alertas no Telegram</p>
                  </div>
                  <button
                    onClick={() => setEnabled(!enabled)}
                    className={cn(
                      "relative w-11 h-6 rounded-full transition-colors",
                      enabled ? "bg-accent" : "bg-surface-3"
                    )}
                  >
                    <span className={cn(
                      "absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform",
                      enabled && "translate-x-5"
                    )} />
                  </button>
                </label>

                {enabled && (
                  <>
                    <div>
                      <p className="text-[12px] font-medium text-ink-subtle mb-1.5">Chat ID</p>
                      <input
                        value={chatId}
                        onChange={(e) => setChatId(e.target.value)}
                        placeholder="123456789"
                        className="w-full bg-surface border border-hairline rounded-lg px-3 py-2 text-[13px] text-ink placeholder:text-ink-tertiary outline-none focus:border-accent/50 transition-colors"
                      />
                      <p className="text-[10px] text-ink-tertiary mt-1">
                        Envie /start para <strong>@BotFather</strong> e depois /myid para descobrir seu ID.
                      </p>
                    </div>

                    <div className="space-y-3">
                      <p className="text-[12px] font-medium text-ink-subtle">Notificações</p>
                      {[
                        { key: "notifyMatch", label: "Match ≥85%", desc: "Quando uma vaga com score alto for encontrada", val: notifyMatch, set: setNotifyMatch },
                        { key: "notifyPipeline", label: "Mudanças no Pipeline", desc: "Quando uma candidatura mudar de etapa", val: notifyPipeline, set: setNotifyPipeline },
                        { key: "notifyDaily", label: "Resumo Diário", desc: "Resumo das vagas e pipeline às 8h", val: notifyDaily, set: setNotifyDaily },
                      ].map((item) => (
                        <label key={item.key} className="flex items-center gap-2.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={item.val}
                            onChange={(e) => item.set(e.target.checked)}
                            className="accent-accent rounded"
                          />
                          <div>
                            <span className="text-[13px] text-ink-subtle">{item.label}</span>
                            <p className="text-[11px] text-ink-tertiary">{item.desc}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </>
                )}

                <div className="flex items-center gap-2 pt-2 border-t border-hairline">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12px] font-medium bg-accent text-white hover:bg-accent-hover transition-colors disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : saved ? <CheckCircle2 className="w-3.5 h-3.5" /> : null}
                    {saved ? "Salvo" : "Salvar"}
                  </button>

                  {enabled && chatId && (
                    <button
                      onClick={handleTest}
                      disabled={testing}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12px] font-medium bg-surface-2 text-ink-subtle border border-hairline hover:text-accent transition-colors disabled:opacity-50"
                    >
                      {testing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                      Testar
                    </button>
                  )}

                  {testResult === "ok" && (
                    <span className="text-[12px] text-success">✅ Enviada!</span>
                  )}
                  {testResult === "erro" && (
                    <span className="text-[12px] text-danger">❌ Falha</span>
                  )}

                  <button onClick={() => setOpen(false)}
                    className="ml-auto px-3 py-2 text-[12px] text-ink-subtle hover:text-ink transition-colors">
                    Fechar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
