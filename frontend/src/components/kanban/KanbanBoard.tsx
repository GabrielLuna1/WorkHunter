"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { Filter, Loader2, AlertCircle, Zap, Check } from "lucide-react";
import { JobDetailSheet } from "./JobDetailSheet";
import { Job } from "./KanbanBoard.types";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import {
  listarPipeline,
  avancarEtapaPipeline,
  PipelineItem,
  pipelineEstatisticas,
} from "@/lib/api";
import { cn } from "@/lib/utils";

const ETAPAS = [
  { id: "salva",             title: "Salvas",              color: "#8a8f98" },
  { id: "aplicada",          title: "Aplicadas",           color: "#d4af37" },
  { id: "em_analise",        title: "Em Análise",          color: "#d4af37" },
  { id: "entrevista_rh",     title: "Entrevista RH",       color: "#c5a059" },
  { id: "entrevista_tecnica",title: "Entrevista Técnica",   color: "#d4af37" },
  { id: "teste_tecnico",     title: "Teste Técnico",       color: "#d4af37" },
  { id: "contratado",        title: "Contratado",          color: "#27a644" },
  { id: "rejeitado",         title: "Rejeitado",           color: "#d24a4a" },
];

function pipelineToJob(p: PipelineItem): Job {
  return {
    id: p.id,
    vaga_id: p.vaga_id,
    company: p.empresa,
    title: p.vaga_titulo,
    location: "",
    model: "",
    score: p.score,
    isFakeJunior: false,
    tags: [],
    status: p.etapa,
    url: p.url,
    follow_up: p.proxima_data || undefined,
    aplicada_em: p.aplicada_em || undefined,
    notas: p.notas || undefined,
    proxima_acao: p.proxima_acao || undefined,
    proxima_data: p.proxima_data || undefined,
  };
}

function InlineJobCard({
  job,
  index,
  onClick,
}: {
  job: Job;
  index: number;
  onClick: () => void;
}) {
  return (
    <Draggable draggableId={job.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`mb-2 rounded-lg border bg-surface-2 transition-all ${
            snapshot.isDragging
              ? "border-accent shadow-lg shadow-accent/10 rotate-1 scale-[1.02] z-10"
              : "border-hairline hover:border-hairline-strong card-glow"
          }`}
        >
          <div className="p-4 pb-2">
            <div className="flex items-start justify-between gap-2">
              <div onClick={onClick} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && onClick()} className="flex-1 text-left min-w-0 cursor-pointer">
                <p className="text-base font-medium text-ink truncate hover:text-accent-hover transition-colors">
                  {job.title}
                </p>
                <p className="text-sm text-ink-tertiary mt-0.5 truncate">
                  {job.company}
                </p>
                {job.location && (
                  <p className="text-xs text-ink-subtle mt-0.5 truncate">
                    {job.location}
                  </p>
                )}
              </div>
              {job.score > 0 && (
                <span
                  className={`shrink-0 text-xs font-semibold px-2 py-0.5 rounded border ${
                    job.score >= 80
                      ? "bg-success/10 text-success border-success/20"
                      : job.score >= 60
                      ? "bg-accent/10 text-accent border-accent/20"
                      : "bg-warning/10 text-warning border-warning/20"
                  }`}
                >
                  {job.score}
                </span>
              )}
            </div>

          </div>

          {job.follow_up && (
            <div className="px-3 pb-3">
              <div className="flex items-center gap-1.5 text-xs text-accent">
                <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse-dot" />
                {new Date(job.follow_up).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
              </div>
            </div>
          )}
        </div>
      )}
    </Draggable>
  );
}

function Column({
  column,
  jobs,
  setSelectedJob,
}: {
  column: (typeof ETAPAS)[0];
  jobs: Job[];
  setSelectedJob: (j: Job) => void;
}) {
  return (
    <Droppable droppableId={column.id}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.droppableProps}
          className={`flex flex-col h-full max-h-full min-w-[280px] max-w-[320px] rounded-xl border transition-all ${
            snapshot.isDraggingOver
              ? "border-accent/50 bg-accent/[0.02]"
              : "border-hairline bg-surface/50"
          }`}
        >
          <div className="p-4 pb-3 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: column.color }} />
              <h3 className="text-sm font-semibold text-ink" style={{ fontFamily: "var(--font-poppins)" }}>
                {column.title}
              </h3>
              <span className="text-xs text-ink-tertiary font-medium">{jobs.length}</span>
            </div>

          </div>

          <div className="flex-1 overflow-y-auto p-3 pt-0 space-y-2 min-h-0 scrollbar-thin scrollbar-thumb-hairline scrollbar-track-transparent">
            {jobs.map((job, index) => (
              <InlineJobCard key={job.id} job={job} index={index} onClick={() => setSelectedJob(job)} />
            ))}
            {provided.placeholder}
            {jobs.length === 0 && (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <p className="text-xs text-ink-tertiary">Nenhuma vaga</p>
              </div>
            )}
          </div>
        </div>
      )}
    </Droppable>
  );
}

export default function KanbanBoard() {
  const [items, setItems] = useState<PipelineItem[]>([]);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Record<string, number>>({});

  const [filterCompany, setFilterCompany] = useState("");

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [pipeData, statsData] = await Promise.all([
          listarPipeline(),
          pipelineEstatisticas().catch(() => null),
        ]);
        setItems(pipeData);
        if (statsData) setStats(statsData as unknown as Record<string, number>);
      } catch {
        setItems([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);



  const onDragEnd = useCallback(async (result: DropResult) => {
    const { destination, source, draggableId } = result;
    if (!destination || (destination.droppableId === source.droppableId && destination.index === source.index)) {
      return;
    }

    const newStatus = destination.droppableId;
    setItems((prev) =>
      prev.map((j) => (j.id === draggableId ? { ...j, etapa: newStatus } : j))
    );

    try {
      await avancarEtapaPipeline(draggableId, newStatus);
    } catch {
      setItems((prev) =>
        prev.map((j) =>
          j.id === draggableId ? { ...j, etapa: source.droppableId } : j
        )
      );
    }
  }, []);

  const uniqueCompanies = useMemo(
    () => Array.from(new Set(items.map((j) => j.empresa).filter(Boolean))),
    [items]
  );

  const filteredItems = items.filter((j) => {
    if (filterCompany && j.empresa !== filterCompany) return false;
    return true;
  });

  if (!mounted) {
    return (
      <div className="p-6 h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-accent animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 h-screen overflow-hidden flex flex-col">
      <div className="mb-5 animate-fade-in-up">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold metallic-gradient tracking-tight" style={{ fontFamily: "var(--font-poppins)" }}>
              Pipeline
            </h1>
            <p className="mt-1 text-base text-ink-subtle">
              Gerencie seu pipeline por estágio do funil
            </p>
          </div>
          <div className="flex items-center gap-2">
            {stats.total > 0 && (
              <span className="text-[12px] text-ink-subtle bg-surface-2 border border-hairline px-3 py-1.5 rounded-md">
                {stats.total} itens · {stats.taxa_conversao || 0}% conversão
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-3 animate-fade-in-up delay-100 p-3 rounded-xl bg-surface-2 border border-hairline/50 z-20 relative">
        <div className="flex items-center gap-2 text-sm font-medium text-ink-muted pl-2">
          <Filter className="w-4 h-4 text-accent" />
          Filtros:
        </div>
        <SearchableSelect
          options={uniqueCompanies.map((c) => ({ id: c, label: c }))}
          value={filterCompany}
          onChange={setFilterCompany}
          placeholder="Todas as Empresas"
          className="min-w-[180px] max-w-[280px]"
        />
        {filterCompany && (
          <button
            onClick={() => setFilterCompany("")}
            className="px-3 py-1.5 rounded-lg text-sm font-medium text-ink-subtle hover:text-ink hover:bg-surface transition-colors ml-auto"
          >
            Limpar Filtros
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-6 h-6 text-accent animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4 text-center max-w-md">
            <AlertCircle className="w-8 h-8 text-ink-tertiary" />
            <h2 className="font-heading text-lg text-ink">Pipeline vazio</h2>
            <p className="text-sm text-ink-subtle">
              Nenhuma candidatura ainda. Vá para a página <strong>Vagas</strong> e clique em "Aplicar" para iniciar seu pipeline.
            </p>
          </div>
        </div>
      ) : (
        <>


          <DragDropContext onDragEnd={onDragEnd}>
            <div className="flex gap-4 overflow-x-auto pb-4 flex-1 min-h-0">
              {ETAPAS.map((column) => (
                <Column
                  key={column.id}
                  column={column}
                  jobs={filteredItems
                    .filter((j) => j.etapa === column.id)
                    .map(pipelineToJob)
                    .sort((a, b) => b.score - a.score)}
                  setSelectedJob={setSelectedJob}
                />
              ))}
            </div>
          </DragDropContext>
        </>
      )}

      <JobDetailSheet
        job={selectedJob}
        open={!!selectedJob}
        onOpenChange={(val) => !val && setSelectedJob(null)}
        onDelete={(id) => {
          setItems((prev) => prev.filter((j) => j.id !== id));
          setSelectedJob(null);
        }}
        onStatusChange={(id, status) => {
          setItems((prev) => prev.map((j) => j.id === id ? { ...j, etapa: status } : j));
          setSelectedJob((prev) => prev && prev.id === id ? { ...prev, status } : prev);
        }}
      />
    </div>
  );
}
