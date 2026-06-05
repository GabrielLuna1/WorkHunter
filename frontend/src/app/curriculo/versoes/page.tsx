"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, FileText, Loader2, Star, Trash2, Copy, Pencil } from "lucide-react";
import Link from "next/link";
import { api } from "@/lib/api";
import type { VersaoCurriculo } from "@/types/curriculo";
import { PageTransition } from "@/components/ui/PageTransition";

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("pt-BR", {
      day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function CurriculoVersoesPage() {
  const [versoes, setVersoes] = useState<VersaoCurriculo[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/v1/curriculo/versoes");
      setVersoes(res.data?.data || []);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  return (
    <PageTransition className="min-h-screen bg-canvas pb-12">
      <header className="border-b border-hairline bg-canvas/80 backdrop-blur-xl sticky top-0 z-30">
        <div className="px-8 py-6 flex items-end justify-between">
          <div className="flex flex-col gap-1">
            <Link
              href="/curriculo"
              className="inline-flex items-center gap-1.5 text-[12px] text-ink-subtle hover:text-accent transition-colors w-fit"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Voltar ao Currículo
            </Link>
            <h1 className="text-xl font-semibold metallic-gradient tracking-tight font-heading">
              Histórico de Versões
            </h1>
            <p className="text-[13px] text-ink-subtle">
              {versoes.length} versão{versoes.length !== 1 ? "ões" : ""}
            </p>
          </div>
        </div>
      </header>

      <div className="px-8 mt-6 max-w-4xl">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-accent" />
          </div>
        ) : versoes.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-20 text-center">
            <FileText className="w-10 h-10 text-ink-tertiary" />
            <p className="text-sm text-ink-subtle">Nenhuma versão salva ainda.</p>
            <p className="text-[13px] text-ink-tertiary">
              Faça upload de um currículo na página principal para começar.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {versoes.map((v) => {
              const label = v.nome_versao || `Versão ${v.versao}`;
              return (
                <div
                  key={v._id}
                  className="bg-surface border border-hairline rounded-xl p-5 card-glow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center">
                        <FileText className="w-4 h-4 text-accent" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-ink flex items-center gap-1.5">
                          {label}
                          {v.ativo && <Star className="w-3.5 h-3.5 text-accent fill-accent" />}
                        </p>
                        <p className="text-[12px] text-ink-subtle">{formatDate(v.atualizado_em)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {v.ativo && (
                        <span className="text-[11px] px-2 py-0.5 rounded bg-accent/10 text-accent border border-accent/20">
                          Padrão
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </PageTransition>
  );
}
