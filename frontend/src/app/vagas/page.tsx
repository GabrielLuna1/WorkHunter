"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Activity, Database, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { PageTransition } from "@/components/ui/PageTransition";
import { toast } from "sonner";
import { listarVagasPaginado, favoritarVaga, criarPipeline, syncPipelineEventos, obterMatchesBulk, listarCategorias, coletarAgora } from "@/lib/api";
import type { Vaga, VagaListaResponse, Categoria } from "@/lib/api";
import FilterBar from "@/components/vagas/FilterBar";
import VagaCard from "@/components/vagas/VagaCard";
import VagaListItem from "@/components/vagas/VagaListItem";
import VagaPagination from "@/components/vagas/VagaPagination";
import ViewToggle from "@/components/vagas/ViewToggle";
import EmptyState from "@/components/vagas/EmptyState";
import LoadingSkeleton from "@/components/vagas/LoadingSkeleton";
import { useChat } from "@/lib/chat-context";

function VagasContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const params = useMemo(() => {
    const ufRaw = searchParams.get("uf");
    const uf = ufRaw ? ufRaw.split(",").map(s => s.trim()).filter(Boolean) : [];
    return {
      page: parseInt(searchParams.get("page") || "1", 10),
      limit: 24,
      busca: searchParams.get("q") || "",
      fonte: searchParams.get("fonte") || "",
      score_min: parseInt(searchParams.get("score_min") || "0", 10),
      status: searchParams.get("status") || "",
      modelo_trabalho: searchParams.get("modelo") || "",
      uf,
      categoria: searchParams.get("categoria") || "",
      order_by: searchParams.get("sort") || "coletada_em",
      order_dir: searchParams.get("dir") || "desc",
      view: (searchParams.get("view") || "grid") as "grid" | "list",
    };
  }, [searchParams]);

  const [result, setResult] = useState<VagaListaResponse | null>(null);
  const [matchScores, setMatchScores] = useState<Record<string, number | null>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [coletando, setColetando] = useState(false);
  const [categorias, setCategorias] = useState<Categoria[]>([]);

  const updateParams = useCallback((updates: Record<string, string>) => {
    const newParams = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([k, v]) => {
      if (!v || v === "0" || v === "1") {
        newParams.delete(k);
      } else {
        newParams.set(k, v);
      }
    });
    router.replace(`/vagas?${newParams.toString()}`, { scroll: false });
  }, [searchParams, router]);

  const carregar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listarVagasPaginado({
        page: params.page,
        limit: params.limit,
        busca: params.busca || undefined,
        fonte: params.fonte || undefined,
        score_min: params.score_min > 0 ? params.score_min : undefined,
        status: params.status || undefined,
        modelo_trabalho: params.modelo_trabalho || undefined,
        uf: params.uf.length > 0 ? params.uf : undefined,
        categoria: params.categoria || undefined,
        order_by: params.order_by,
        order_dir: params.order_dir,
      });
      setResult(data);
      const ids = data.data.map((v: Vaga) => v.id);
      if (ids.length > 0) {
        obterMatchesBulk(ids).then((matches) => {
          const scores: Record<string, number | null> = {};
          Object.entries(matches).forEach(([id, m]) => { scores[id] = m.score; });
          setMatchScores(scores);
        }).catch(() => {});
      }
    } catch {
      setError("Erro ao carregar vagas. Verifique se o backend está rodando.");
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  useEffect(() => {
    listarCategorias().then(setCategorias).catch(() => {});
  }, []);

  const handleCategoriaChange = useCallback((cat: string) => {
    updateParams({ categoria: cat, page: "" });
  }, [updateParams]);

  const handleBuscaChange = useCallback((v: string) => {
    updateParams({ q: v || "", page: "" });
  }, [updateParams]);

  const handleBuscaSubmit = useCallback(() => {
    updateParams({ q: params.busca || "", page: "" });
  }, [updateParams, params.busca]);

  const handleFonteChange = useCallback((v: string) => {
    updateParams({ fonte: v, page: "" });
  }, [updateParams]);

  const handleScoreChange = useCallback((v: number) => {
    updateParams({ score_min: v > 0 ? String(v) : "", page: "" });
  }, [updateParams]);

  const handleStatusChange = useCallback((v: string) => {
    updateParams({ status: v, page: "" });
  }, [updateParams]);

  const handleModeloTrabalhoChange = useCallback((v: string) => {
    updateParams({ modelo: v, page: "" });
  }, [updateParams]);

  const handleUfChange = useCallback((v: string[]) => {
    updateParams({ uf: v.length > 0 ? v.join(",") : "", page: "" });
  }, [updateParams]);

  const handleOrderByChange = useCallback((v: string) => {
    updateParams({ sort: v, page: "" });
  }, [updateParams]);

  const handleOrderDirToggle = useCallback(() => {
    updateParams({ dir: params.order_dir === "desc" ? "asc" : "desc", page: "" });
  }, [updateParams, params.order_dir]);

  const handlePageChange = useCallback((p: number) => {
    updateParams({ page: String(p) });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [updateParams]);

  const handleViewChange = useCallback((v: "grid" | "list") => {
    updateParams({ view: v });
    try { localStorage.setItem("vagas-view", v); } catch {}
  }, [updateParams]);

  const handleFavoritar = useCallback(async (vagaId: string) => {
    setResult((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        data: prev.data.map((v) =>
          v.id === vagaId
            ? { ...v, usuario_status: { ...v.usuario_status!, favoritada: !v.usuario_status?.favoritada } }
            : v
        ),
      };
    });
    try {
      await favoritarVaga(vagaId);
    } catch {
      setResult((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          data: prev.data.map((v) =>
            v.id === vagaId
              ? { ...v, usuario_status: { ...v.usuario_status!, favoritada: !v.usuario_status?.favoritada } }
              : v
          ),
        };
      });
    }
  }, []);

  const handleSalvar = useCallback(async (vagaId: string) => {
    try {
      await criarPipeline(vagaId, "salva");
      await syncPipelineEventos().catch(() => {});
      setResult((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          data: prev.data.map((v) =>
            v.id === vagaId
              ? { ...v, usuario_status: { ...v.usuario_status!, salva: true } }
              : v
          ),
        };
      });
      setMsg("Vaga salva no Pipeline!");
    } catch {
      setError("Erro ao salvar esta vaga.");
    }
    setTimeout(() => setMsg(null), 3000);
  }, []);

  const handleAplicar = useCallback(async (vagaId: string) => {
    try {
      await criarPipeline(vagaId, "aplicada");
      await syncPipelineEventos().catch(() => {});
      setResult((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          data: prev.data.map((v) =>
            v.id === vagaId
              ? { ...v, usuario_status: { ...v.usuario_status!, aplicada: true } }
              : v
          ),
        };
      });
      setMsg("Vaga movida para o Pipeline!");
    } catch {
      setError("Erro ao aplicar para esta vaga.");
    }
    setTimeout(() => setMsg(null), 3000);
  }, []);

  const handleColetar = useCallback(async () => {
    if (!params.busca) return;
    setColetando(true);
    const toastId = toast.loading(`Coleta iniciada! Buscando por: "${params.busca}"`);
    try {
      const res = await coletarAgora([params.busca]);
      toast.success(`${res.novas_inseridas} vagas coletadas para "${params.busca}"`, { id: toastId });
      carregar();
    } catch {
      toast.error("Erro ao coletar vagas. Verifique o backend.", { id: toastId });
    } finally {
      setColetando(false);
    }
  }, [params.busca, carregar]);

  const { openChatWithVaga } = useChat();

  const handleAnalisar = useCallback((vagaId: string) => {
    const vaga = result?.data.find((v) => v.id === vagaId);
    if (vaga) {
      openChatWithVaga({
        vagaId: vaga.id,
        titulo: vaga.titulo,
        empresa: vaga.empresa,
      });
    }
  }, [result, openChatWithVaga]);

  if (error) {
    return (
      <PageTransition className="min-h-screen bg-canvas flex items-center justify-center p-8">
        <div className="flex flex-col items-center gap-4 px-8 py-8 rounded-2xl bg-danger/5 border border-danger/20 text-center max-w-lg">
          <Activity className="w-8 h-8 text-danger mb-2" />
          <h2 className="font-heading text-lg font-medium text-ink mb-2">Erro ao carregar</h2>
          <p className="text-[14px] text-ink-subtle leading-relaxed">{error}</p>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition className="min-h-screen bg-canvas pb-12">
      <header className="border-b border-hairline bg-canvas/80 backdrop-blur-xl sticky top-0 z-30">
        <div className="px-8 py-6 flex items-end justify-between">
          <div className="flex flex-col gap-1">
            <h1 className="text-xl font-semibold metallic-gradient tracking-tight" style={{ fontFamily: 'var(--font-poppins)' }}>
              Vagas
            </h1>
            <p className="text-sm text-ink-subtle flex items-center gap-2">
              <Database className="w-4 h-4" />
              {result
                ? `${result.total} oportunidades — Página ${result.page} de ${result.total_pages}`
                : "Carregando..."}
            </p>
          </div>
          <ViewToggle view={params.view} onChange={handleViewChange} />
        </div>
      </header>

      <main className="px-8 py-6 space-y-6">
        <FilterBar
          busca={params.busca}
          onBuscaChange={handleBuscaChange}
          onBuscaSubmit={handleBuscaSubmit}
          fonte={params.fonte}
          onFonteChange={handleFonteChange}
          scoreMin={params.score_min}
          onScoreChange={handleScoreChange}
          status={params.status}
          onStatusChange={handleStatusChange}
          modeloTrabalho={params.modelo_trabalho}
          onModeloTrabalhoChange={handleModeloTrabalhoChange}
          uf={params.uf}
          onUfChange={handleUfChange}
          orderBy={params.order_by}
          onOrderByChange={handleOrderByChange}
          orderDir={params.order_dir}
          onOrderDirToggle={handleOrderDirToggle}
        />

        {categorias.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => handleCategoriaChange("")}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-medium transition-colors border",
                !params.categoria
                  ? "bg-accent text-white border-accent"
                  : "bg-surface text-ink-muted border-hairline hover:border-hairline-strong"
              )}
            >
              Todas
            </button>
            {categorias.filter(c => c.id !== "irrelevant").map((cat) => (
              <button
                key={cat.id}
                onClick={() => handleCategoriaChange(cat.id)}
                className={cn(
                  "px-3 py-1.5 rounded-md text-xs font-medium transition-colors border",
                  params.categoria === cat.id
                    ? "text-white border-transparent"
                    : "bg-surface text-ink-muted border-hairline hover:border-hairline-strong"
                )}
                style={params.categoria === cat.id ? { backgroundColor: cat.cor } : undefined}
              >
                {cat.label}
              </button>
            ))}
          </div>
        )}

        {(msg || error) && (
          <div
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-md border text-sm font-medium animate-fade-in-up",
              msg ? "bg-success/10 border-success/20 text-success" : "bg-danger/10 border-danger/20 text-danger"
            )}
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{msg || error}</span>
            <button onClick={() => { setMsg(null); setError(null); }} className="ml-auto opacity-70 hover:opacity-100 transition-opacity">
              &times;
            </button>
          </div>
        )}

        {loading ? (
          <LoadingSkeleton view={params.view} />
        ) : !result || result.data.length === 0 ? (
          <EmptyState
            type={params.busca ? "busca" : params.fonte || params.status || params.score_min > 0 ? "filtro" : "geral"}
            busca={params.busca}
            onColetar={params.busca ? handleColetar : undefined}
            coletando={coletando}
          />
        ) : (
          <>
            {params.view === "grid" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {result.data.map((vaga: Vaga, i: number) => (
                  <div key={vaga.id} style={{ animationDelay: `${i * 0.04}s` }}>
                    <VagaCard
                      vaga={vaga}
                      matchScore={matchScores[vaga.id] ?? null}
                      onFavoritar={handleFavoritar}
                      onAnalisar={handleAnalisar}
                      onAplicar={handleAplicar}
                      onSalvar={handleSalvar}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {result.data.map((vaga: Vaga, i: number) => (
                  <div key={vaga.id} style={{ animationDelay: `${i * 0.03}s` }}>
                    <VagaListItem
                      vaga={vaga}
                      matchScore={matchScores[vaga.id] ?? null}
                      onFavoritar={handleFavoritar}
                      onAnalisar={handleAnalisar}
                      onAplicar={handleAplicar}
                      onSalvar={handleSalvar}
                    />
                  </div>
                ))}
              </div>
            )}

            <VagaPagination
              page={result.page}
              totalPages={result.total_pages}
              onPageChange={handlePageChange}
            />
          </>
        )}
      </main>
    </PageTransition>
  );
}

export default function VagasPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-canvas flex items-center justify-center">
        <Activity className="w-8 h-8 text-accent animate-pulse" />
      </div>
    }>
      <VagasContent />
    </Suspense>
  );
}
