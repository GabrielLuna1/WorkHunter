import { useState, useEffect } from "react";
import { Job } from "./KanbanBoard.types";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, Globe, Clock, Building2, TrendingUp, AlertTriangle, ChevronRight, CalendarDays, Save, Trash2 } from "lucide-react";
import { atualizarPipeline, syncPipelineEventos, deletarPipeline } from "@/lib/api";
import { cn } from "@/lib/utils";

const ETAPA_LABELS: Record<string, string> = {
  salva: "Salva",
  aplicada: "Aplicada",
  em_analise: "Em Análise",
  entrevista_rh: "Entrevista RH",
  entrevista_tecnica: "Entrevista Técnica",
  teste_tecnico: "Teste Técnico",
  contratado: "Contratado",
  rejeitado: "Rejeitado",
};

function formatLocalDatetime(iso: string): string {
  const d = new Date(iso);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export function JobDetailSheet({
  job,
  open,
  onOpenChange,
  onDelete,
  onStatusChange,
}: {
  job: Job | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDelete?: (id: string) => void;
  onStatusChange?: (id: string, status: string) => void;
}) {
  const [notas, setNotas] = useState(job?.notas || "");
  const [proximaAcao, setProximaAcao] = useState(job?.proxima_acao || "");
  const [proximaData, setProximaData] = useState(job?.proxima_data ? formatLocalDatetime(job.proxima_data) : "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  useEffect(() => {
    if (job) {
      setNotas(job.notas || "");
      setProximaAcao(job.proxima_acao || "");
      setProximaData(job.proxima_data ? formatLocalDatetime(job.proxima_data) : "");
    }
  }, [job]);

  if (!job) return null;

  const handleSave = async () => {
    setSaving(true);
    try {
      const body: Partial<{ notas: string; proxima_acao: string; proxima_data: string }> = {};
      if (notas) body.notas = notas;
      if (proximaAcao) body.proxima_acao = proximaAcao;
      if (proximaData) {
        const [date, time] = proximaData.split("T");
        const [y, m, d] = date.split("-").map(Number);
        const [h, min] = time.split(":").map(Number);
        body.proxima_data = new Date(y, m - 1, d, h, min).toISOString();
      }
      await atualizarPipeline(job.id, body);
      await syncPipelineEventos().catch(() => {});
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md p-0 border-l border-hairline bg-canvas sm:w-[450px]">
        <div className="flex flex-col h-full">
          <SheetHeader className="px-6 pt-8 pb-5 border-b border-hairline bg-surface relative overflow-hidden">
            <div className="flex justify-between items-start gap-4 relative z-10">
              <div>
                <SheetTitle className="font-heading font-semibold text-xl text-ink mb-1.5 leading-tight">
                  {job.title}
                </SheetTitle>
                <SheetDescription className="flex items-center gap-2 text-[13px] text-ink-subtle font-medium">
                  <Building2 className="w-4 h-4" />
                  {job.company}
                </SheetDescription>
              </div>
              <div className={`flex flex-col items-center justify-center min-w-[50px] h-[50px] rounded-xl border bg-surface-2 ${job.score >= 80 ? 'text-success border-success/30' : job.score >= 60 ? 'text-accent border-accent/30' : 'text-warning border-warning/30'}`}>
                <span className="text-[9px] font-bold uppercase tracking-wider opacity-60 mb-0.5">Match</span>
                <span className="text-lg font-bold leading-none">{job.score}</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 mt-5 relative z-10">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-surface-2 border border-hairline text-ink-subtle text-[11px] font-medium tracking-wide">
                <TrendingUp className="w-3 h-3" />
                {ETAPA_LABELS[job.status] || job.status}
              </div>
              {job.aplicada_em && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-surface-2 border border-hairline text-ink-subtle text-[11px] font-medium tracking-wide">
                  <Clock className="w-3 h-3" />
                  {new Date(job.aplicada_em).toLocaleDateString("pt-BR")}
                </div>
              )}
              {job.isFakeJunior && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-danger/10 border border-danger/20 text-danger text-[11px] font-medium tracking-wide uppercase">
                  <AlertTriangle className="w-3 h-3" />
                  Fake Junior
                </div>
              )}
            </div>
          </SheetHeader>

          <ScrollArea className="flex-1 px-6 py-6">
            <div className="space-y-8">
              <div className="space-y-3">
                <h4 className="text-[11px] font-semibold text-ink-tertiary uppercase tracking-wider flex items-center gap-2">
                  <ChevronRight className="w-3 h-3" />
                  Próximos Passos
                </h4>
                <div className="space-y-3">
                  <div>
                    <label className="text-[11px] text-ink-subtle mb-1 block">Próxima Ação</label>
                    <input
                      type="text"
                      value={proximaAcao}
                      onChange={(e) => setProximaAcao(e.target.value)}
                      placeholder="Ex: Aguardar retorno do RH"
                      className="w-full px-3 py-2 rounded-lg bg-surface-2 border border-hairline text-sm text-ink outline-none focus:border-accent transition-colors placeholder:text-ink-tertiary"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-ink-subtle mb-1 block">Data do Próximo Contato</label>
                    <input
                      type="datetime-local"
                      value={proximaData}
                      onChange={(e) => setProximaData(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-surface-2 border border-hairline text-sm text-ink outline-none focus:border-accent transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-ink-subtle mb-1 block">Notas</label>
                    <textarea
                      value={notas}
                      onChange={(e) => setNotas(e.target.value)}
                      rows={3}
                      placeholder="Observações sobre essa candidatura..."
                      className="w-full px-3 py-2 rounded-lg bg-surface-2 border border-hairline text-sm text-ink outline-none focus:border-accent transition-colors placeholder:text-ink-tertiary resize-none"
                    />
                  </div>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-accent text-black text-sm font-medium hover:bg-accent-hover transition-colors disabled:opacity-50"
                  >
                    {saving ? (
                      "Salvando..."
                    ) : saved ? (
                      <>
                        <Save className="w-4 h-4" />
                        Salvo!
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        Salvar Alterações
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-[11px] font-semibold text-ink-tertiary uppercase tracking-wider flex items-center gap-2">
                  <ChevronRight className="w-3 h-3" />
                  Ações Rápidas
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => window.open(job.url, '_blank')}
                    className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-accent text-white hover:bg-accent-hover transition-colors text-[12px] font-medium"
                  >
                    <Globe className="w-3.5 h-3.5" />
                    Portal da Vaga
                  </button>
                  {confirmDelete ? (
                    <div className="flex gap-1 col-span-2">
                      <button
                        onClick={async () => {
                          await deletarPipeline(job.id);
                          onDelete?.(job.id);
                          onOpenChange(false);
                        }}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-danger text-white hover:bg-danger/90 transition-colors text-[12px] font-medium"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Confirmar Remoção
                      </button>
                      <button
                        onClick={() => setConfirmDelete(false)}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-surface-2 border border-hairline text-ink-subtle hover:text-ink transition-colors text-[12px] font-medium"
                      >
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDelete(true)}
                      className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-danger/10 border border-danger/20 text-danger hover:bg-danger/20 transition-colors text-[12px] font-medium"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Remover
                    </button>
                  )}
                </div>
              </div>

              {job.follow_up && (
                <div className="space-y-3">
                  <h4 className="text-[11px] font-semibold text-ink-tertiary uppercase tracking-wider flex items-center gap-2">
                    <CalendarDays className="w-3 h-3" />
                    Agenda
                  </h4>
                  <div className="bg-surface-2 border border-hairline rounded-xl p-4">
                    <div className="flex items-center gap-2 text-sm text-ink">
                      <CalendarDays className="w-4 h-4 text-accent" />
                      <span>{new Date(job.follow_up).toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}</span>
                    </div>
                    {job.proxima_acao && (
                      <p className="text-[13px] text-ink-muted mt-2">{job.proxima_acao}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
}
