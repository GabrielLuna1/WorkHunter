"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Send, Trash2, Plus, Loader2, MessageCircle, ChevronDown, Bot, User, Check } from "lucide-react";
import Link from "next/link";
import { ChatMessage } from "@/components/chat/ChatMessage";
import {
  criarSessaoChat, listarSessoesChat, deletarSessaoChat,
  listarMensagensChat, enviarMensagemChat,
  type ChatSession, type ChatMessage as ChatMessageType,
} from "@/lib/api";
import { cn } from "@/lib/utils";
import type { HubView, HubViewData } from "./HubContext";

export function HubChat({ onContextChange }: {
  onContextChange: (view: HubView, data: HubViewData, loading?: boolean) => void;
}) {
  const [sessoes, setSessoes] = useState<ChatSession[]>([]);
  const [sessaoAtiva, setSessaoAtiva] = useState<ChatSession | null>(null);
  const [mensagens, setMensagens] = useState<ChatMessageType[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamBuffer, setStreamBuffer] = useState("");
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const [showSessoes, setShowSessoes] = useState(false);
  const [toolRunning, setToolRunning] = useState(false);
  const [toolName, setToolName] = useState("");
  const [reasoning, setReasoning] = useState("");
  const [showReasoning, setShowReasoning] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef("");
  const creatingSessionRef = useRef(false);
  const sessionRetryRef = useRef(0);
  const MAX_SESSION_RETRIES = 3;

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => { loadSessoes(); }, []);

  useEffect(() => {
    if (!initialLoad
      && !loading
      && !creatingSessionRef.current
      && sessoes.length === 0
      && !sessaoAtiva
      && sessionRetryRef.current < MAX_SESSION_RETRIES
    ) {
      handleNovaSessao();
    }
  }, [initialLoad, loading, sessoes.length, sessaoAtiva]);
  useEffect(() => { scrollToBottom(); }, [mensagens, streamBuffer, scrollToBottom]);

  useEffect(() => {
    const onNewSession = () => handleNovaSessao();
    const onFocusInput = () => inputRef.current?.focus();
    document.addEventListener("hub-new-session", onNewSession);
    document.addEventListener("hub-focus-input", onFocusInput);
    return () => {
      document.removeEventListener("hub-new-session", onNewSession);
      document.removeEventListener("hub-focus-input", onFocusInput);
    };
  }, []);

  useEffect(() => {
    const onQuickAction = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!detail?.action) return;
      handleExternalAction(detail.action, detail.vagaId);
    };
    document.addEventListener("hub-quick-action", onQuickAction);
    return () => document.removeEventListener("hub-quick-action", onQuickAction);
  }, [sessaoAtiva]);

  async function loadSessoes() {
    try {
      const data = await listarSessoesChat();
      setSessoes(data);
      setInitialLoad(false);
      if (data.length > 0 && !sessaoAtiva) {
        selecionarSessao(data[0]);
      }
    } catch {
      setInitialLoad(false);
    }
  }

  async function selecionarSessao(sessao: ChatSession) {
    setSessaoAtiva(sessao);
    setShowSessoes(false);
    setMensagens([]);
    setStreamBuffer("");
    onContextChange("welcome", {});
    try {
      const msgs = await listarMensagensChat(sessao.id);
      setMensagens(msgs);
        const lastToolMsg = [...msgs].reverse().find(m => m.metadata?.tool_result);
        if (lastToolMsg && lastToolMsg.metadata) {
          parseToolResult(lastToolMsg.metadata.tool_result as string, lastToolMsg.conteudo);
        }
    } catch {}
  }

  async function handleNovaSessao() {
    if (creatingSessionRef.current) return;
    creatingSessionRef.current = true;
    setLoading(true);
    try {
      const sessao = await criarSessaoChat();
      sessionRetryRef.current = 0;
      setSessoes((prev) => [sessao, ...prev]);
      await selecionarSessao(sessao);
    } catch {
      sessionRetryRef.current += 1;
    }
    setLoading(false);
    creatingSessionRef.current = false;
  }

  async function handleDeletarSessao(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    try {
      await deletarSessaoChat(id);
      setSessoes((prev) => prev.filter((s) => s.id !== id));
      if (sessaoAtiva?.id === id) {
        setSessaoAtiva(null);
        setMensagens([]);
        onContextChange("welcome", {});
      }
    } catch {}
  }

  const parseToolResult = (tool: string, content: string) => {
    if (tool === "pipeline_status") {
      const lines = content.split("\n");
      const pipeData: Record<string, number> = { total: 0 };
      for (const line of lines) {
        for (const stage of ["salva", "aplicada", "em_analise", "entrevista_rh", "entrevista_tecnica", "teste_tecnico", "contratado", "rejeitado"]) {
          const match = line.match(new RegExp(`${stage}[^\\d]*(\\d+)`));
          if (match) pipeData[stage] = parseInt(match[1]);
        }
        const totalMatch = line.match(/Total[^\\d]*(\\d+)/);
        if (totalMatch) pipeData.total = parseInt(totalMatch[1]);
      }
      if (pipeData.total > 0) onContextChange("pipeline_status", { pipeline: pipeData }, false);
    }
  };

  const handleQuickAction = async (action: string, vagaId?: string) => {
    if (action === "analise_completa" && vagaId) {
      onContextChange("analise_completa", { vagaId }, false);
      return;
    }

    if (!sessaoAtiva || streaming) {
      if (!sessaoAtiva) { await handleNovaSessao(); }
      return;
    }

    const messages: Record<string, string> = {
      pipeline_status: "Mostre o status do meu pipeline de candidaturas",
      analisar_ultima: "Analise a última vaga em detalhes",
      calcular_match: "Calcule o match da vaga atual com meu perfil",
      analisar: vagaId ? `Analise esta vaga em detalhes. [TOOL:analyze_vaga|${vagaId}]` : "Analise esta vaga em detalhes",
      match: vagaId ? `Calcule o match da vaga atual com meu perfil. [TOOL:calcular_match|${vagaId}]` : "Calcule o match da vaga atual com meu perfil",
      cover_letter: vagaId ? `Gere uma cover letter para a vaga atual. [TOOL:gerar_cover_letter|${vagaId}]` : "Gere uma cover letter",
    };

    const msg = messages[action];
    if (!msg) return;
    setInput("");
    setStreamBuffer("");
    streamRef.current = "";

    const userMsg: ChatMessageType = {
      id: "qa-" + Date.now(), sessao_id: sessaoAtiva.id,
      papel: "user", conteudo: msg, metadata: null,
      created_at: new Date().toISOString(),
    };
    setMensagens((prev) => [...prev, userMsg]);

    setStreaming(true);
    setToolRunning(false);
    setToolName("");
    setReasoning("");
    setShowReasoning(false);

    try {
      await enviarMensagemChat(
        sessaoAtiva.id, msg,
        (token) => { streamRef.current += token; setStreamBuffer(streamRef.current); },
        () => {
          setStreaming(false); setToolRunning(false);
          let finalContent = streamRef.current || reasoning;
          if (finalContent) finalContent = finalContent.replace(/\[TOOL:\w+(?:\|[^\]]+)?\]/g, "").trim();
          setReasoning("");
          streamRef.current = ""; setStreamBuffer("");
          if (finalContent) {
            setMensagens((prev) => [...prev, {
              id: "assistant-" + Date.now(), sessao_id: sessaoAtiva.id,
              papel: "assistant", conteudo: finalContent, metadata: null,
              created_at: new Date().toISOString(),
            }]);
          }
          listarSessoesChat().then(setSessoes).catch(() => {});
        },
        (error) => {
          setStreaming(false); setToolRunning(false);
          setReasoning("");
          setMensagens((prev) => [...prev, {
            id: "err-" + Date.now(), sessao_id: sessaoAtiva.id,
            papel: "assistant", conteudo: `Erro: ${error}`, metadata: null,
            created_at: new Date().toISOString(),
          }]);
        },
        (tool, params) => { setToolRunning(true); setToolName(tool); onContextChange("waiting", { toolName: tool }, true); },
        (result) => {
          setToolRunning(false);
          if (result.success && result.result) {
            const toolMsg: ChatMessageType = {
              id: "tool-" + Date.now(), sessao_id: sessaoAtiva.id,
              papel: "assistant",
              conteudo: typeof result.result === 'string' ? result.result : JSON.stringify(result.result),
              metadata: { tool_result: toolName, requires_confirmation: result.requires_confirmation || false },
              created_at: new Date().toISOString(),
            };
            setMensagens((prev) => [...prev, toolMsg]);
            updateContextFromTool(toolName, result);
          } else if (!result.success && result.error) {
            setMensagens((prev) => [...prev, {
              id: "tlerr-" + Date.now(), sessao_id: sessaoAtiva.id,
              papel: "assistant", conteudo: `❌ ${result.error}`, metadata: null,
              created_at: new Date().toISOString(),
            }]);
            onContextChange("welcome", {}, false);
          }
          listarSessoesChat().then(setSessoes).catch(() => {});
        },
        undefined,
        (token) => { setReasoning((prev) => prev + token); setShowReasoning(true); },
      );
    } catch (err: any) {
      setStreaming(false);
      setMensagens((prev) => [...prev, {
        id: "err2-" + Date.now(), sessao_id: sessaoAtiva.id,
        papel: "assistant", conteudo: `Erro: ${err?.message || "Falha na comunicação"}`, metadata: null,
        created_at: new Date().toISOString(),
      }]);
    }
  };

  const sendMessage = async (msg: string, vagaId?: string) => {
    if (!sessaoAtiva || streaming) return;
    setInput("");
    setStreamBuffer("");
    streamRef.current = "";

    const userMsg: ChatMessageType = {
      id: "ext-" + Date.now(), sessao_id: sessaoAtiva.id,
      papel: "user", conteudo: msg, metadata: null,
      created_at: new Date().toISOString(),
    };
    setMensagens((prev) => [...prev, userMsg]);
    setStreaming(true);
    setToolRunning(false);
    setToolName("");
    setReasoning("");
    setShowReasoning(false);

    try {
      await enviarMensagemChat(
        sessaoAtiva.id, msg,
        (token) => { streamRef.current += token; setStreamBuffer(streamRef.current); },
        () => {
          setStreaming(false); setToolRunning(false);
          let finalContent = streamRef.current || reasoning;
          if (finalContent) finalContent = finalContent.replace(/\[TOOL:\w+(?:\|[^\]]+)?\]/g, "").trim();
          setReasoning("");
          streamRef.current = ""; setStreamBuffer("");
          if (finalContent) {
            setMensagens((prev) => [...prev, {
              id: "asx-" + Date.now(), sessao_id: sessaoAtiva.id,
              papel: "assistant", conteudo: finalContent, metadata: null,
              created_at: new Date().toISOString(),
            }]);
          }
          listarSessoesChat().then(setSessoes).catch(() => {});
        },
        (error) => {
          setStreaming(false); setToolRunning(false); setReasoning("");
          setMensagens((prev) => [...prev, {
            id: "esx-" + Date.now(), sessao_id: sessaoAtiva.id,
            papel: "assistant", conteudo: `Erro: ${error}`, metadata: null,
            created_at: new Date().toISOString(),
          }]);
        },
        (tool, params) => { setToolRunning(true); setToolName(tool); onContextChange("waiting", { toolName: tool }, true); },
        (result) => {
          setToolRunning(false);
          if (result.success && result.result) {
            const toolMsg: ChatMessageType = {
              id: "tlx-" + Date.now(), sessao_id: sessaoAtiva.id,
              papel: "assistant",
              conteudo: typeof result.result === 'string' ? result.result : JSON.stringify(result.result),
              metadata: { tool_result: toolName, requires_confirmation: result.requires_confirmation || false },
              created_at: new Date().toISOString(),
            };
            setMensagens((prev) => [...prev, toolMsg]);
            updateContextFromTool(toolName, result);
          } else if (!result.success && result.error) {
            setMensagens((prev) => [...prev, {
              id: "tle-" + Date.now(), sessao_id: sessaoAtiva.id,
              papel: "assistant", conteudo: `❌ ${result.error}`, metadata: null,
              created_at: new Date().toISOString(),
            }]);
          }
          listarSessoesChat().then(setSessoes).catch(() => {});
        },
        vagaId,
        (token) => { setReasoning((prev) => prev + token); setShowReasoning(true); },
      );
    } catch (err: any) {
      setStreaming(false);
      setMensagens((prev) => [...prev, {
        id: "esx2-" + Date.now(), sessao_id: sessaoAtiva.id,
        papel: "assistant", conteudo: `Erro: ${err?.message || "Falha na comunicação"}`, metadata: null,
        created_at: new Date().toISOString(),
      }]);
    }
  };

  const handleExternalAction = async (action: string, vagaId?: string) => {
    const msgs: Record<string, string> = {
      pipeline_status: "Mostre o status do meu pipeline de candidaturas",
      analisar_ultima: "Analise a última vaga em detalhes",
      calcular_match: "Calcule o match da vaga atual com meu perfil",
      analisar: "Analise essa vaga em detalhes",
      match: "Calcule o match dessa vaga com meu perfil",
      cover_letter: "Gere uma cover letter para esta vaga",
    };
    const msg = msgs[action];
    if (!msg) return;
    await sendMessage(msg, vagaId);
  };

  const updateContextFromTool = (tool: string, result: any) => {
    if (tool === "analyze_vaga" && result.raw) {
      onContextChange("analyze_vaga", {
        analise: {
          id: "", vaga_id: result.vaga_id || "",
          stack_principal: result.raw?.stack_principal || [],
          nivel: result.raw?.nivel || "",
          salario_estimado_min: result.raw?.salario_estimado_min,
          salario_estimado_max: result.raw?.salario_estimado_max,
          resumo: result.raw?.resumo || result.result || "",
          requisitos_obrigatorios: result.raw?.requisitos_obrigatorios || [],
          requisitos_desejaveis: result.raw?.requisitos_desejaveis || [],
          soft_skills: result.raw?.soft_skills || [],
          palavras_chave_ats: result.raw?.palavras_chave_ats || [],
          created_at: new Date().toISOString(),
        },
      }, false);
    } else if (tool === "calcular_match" && result.raw) {
      onContextChange("calcular_match", {
        match: {
          id: "", vaga_id: result.vaga_id || "",
          score_geral: result.raw?.score_geral || 0,
          score_tecnico: result.raw?.score_tecnico || 0,
          score_experiencia: result.raw?.score_experiencia || 0,
          score_soft_skills: result.raw?.score_soft_skills || 0,
          skills_match: result.raw?.skills_match || [],
          missing_skills: result.raw?.missing_skills || [],
          gaps: result.raw?.gaps || [],
          chance_entrevista: result.raw?.chance_entrevista || "media",
          created_at: new Date().toISOString(),
        },
        vagaId: result.vaga_id,
      }, false);
    } else if (tool === "pipeline_status") {
      parseToolResult(tool, result.result || "");
      onContextChange("pipeline_status", { pipeline: {} }, false); // Reset loading if needed
    } else if (tool === "gerar_cover_letter") {
      onContextChange("gerar_cover_letter", {
        coverLetter: {
          text: typeof result.result === 'string' ? result.result : JSON.stringify(result.result),
          assunto: result.raw?.assunto,
        },
      }, false);
    } else if (tool === "analisar_match") {
      onContextChange("analisar_match", {
        curriculo: {
          changes: [typeof result.result === 'string' ? result.result : "Currículo otimizado com sucesso"],
        },
      }, false);
    } else if (tool === "buscar_vagas") {
      const vagas = result.raw?.vagas || [];
      if (vagas.length > 0) {
        onContextChange("buscar_vagas", { vagasBusca: vagas }, false);
      } else {
        onContextChange("welcome", {}, false);
      }
    } else {
      onContextChange("welcome", {}, false);
    }
  };

  async function handleSend() {
    const msg = input.trim();
    if (!msg || !sessaoAtiva || streaming) return;
    setInput("");
    setStreamBuffer("");
    streamRef.current = "";

    const userMsg: ChatMessageType = {
      id: "send-" + Date.now(), sessao_id: sessaoAtiva.id,
      papel: "user", conteudo: msg, metadata: null,
      created_at: new Date().toISOString(),
    };
    setMensagens((prev) => [...prev, userMsg]);
    setStreaming(true);
    setToolRunning(false);
    setToolName("");
    setReasoning("");
    setShowReasoning(false);

    try {
      await enviarMensagemChat(
        sessaoAtiva.id, msg,
        (token) => { streamRef.current += token; setStreamBuffer(streamRef.current); },
        () => {
          setStreaming(false); setToolRunning(false);
          let finalContent = streamRef.current || reasoning;
          if (finalContent) finalContent = finalContent.replace(/\[TOOL:\w+(?:\|[^\]]+)?\]/g, "").trim();
          setReasoning("");
          streamRef.current = ""; setStreamBuffer("");
          if (finalContent) {
            setMensagens((prev) => [...prev, {
              id: "asst-" + Date.now(), sessao_id: sessaoAtiva.id,
              papel: "assistant", conteudo: finalContent, metadata: null,
              created_at: new Date().toISOString(),
            }]);
          }
          listarSessoesChat().then(setSessoes).catch(() => {});
        },
        (error) => {
          setStreaming(false); setToolRunning(false);
          setReasoning("");
          setMensagens((prev) => [...prev, {
            id: "esnd-" + Date.now(), sessao_id: sessaoAtiva.id,
            papel: "assistant", conteudo: `Erro: ${error}`, metadata: null,
            created_at: new Date().toISOString(),
          }]);
        },
        (tool, params) => { setToolRunning(true); setToolName(tool); onContextChange("waiting", { toolName: tool }, true); },
        (result) => {
          setToolRunning(false);
          if (result.success && result.result) {
            const toolMsg: ChatMessageType = {
              id: "tlsnd-" + Date.now(), sessao_id: sessaoAtiva.id,
              papel: "assistant",
              conteudo: typeof result.result === 'string' ? result.result : JSON.stringify(result.result),
              metadata: { tool_result: toolName, requires_confirmation: result.requires_confirmation || false },
              created_at: new Date().toISOString(),
            };
            setMensagens((prev) => [...prev, toolMsg]);
            updateContextFromTool(toolName, result);
          } else if (!result.success && result.error) {
            setMensagens((prev) => [...prev, {
              id: "tle-" + Date.now(), sessao_id: sessaoAtiva.id,
              papel: "assistant", conteudo: `❌ ${result.error}`, metadata: null,
              created_at: new Date().toISOString(),
            }]);
            onContextChange("welcome", {}, false);
          }
          listarSessoesChat().then(setSessoes).catch(() => {});
        },
        undefined,
        (token) => { setReasoning((prev) => prev + token); setShowReasoning(true); },
      );
    } catch (err: any) {
      setStreaming(false);
      setMensagens((prev) => [...prev, {
        id: "esnd2-" + Date.now(), sessao_id: sessaoAtiva.id,
        papel: "assistant", conteudo: `Erro: ${err?.message || "Falha na comunicação"}`, metadata: null,
        created_at: new Date().toISOString(),
      }]);
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Session tabs */}
      <div className="flex items-center gap-1 px-3 py-2 border-b border-hairline bg-surface-2/50">
        <button onClick={handleNovaSessao} disabled={loading}
          className="p-1.5 rounded-md hover:bg-surface-2 text-ink-tertiary hover:text-accent transition-colors disabled:opacity-50">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
        </button>
        <div className="flex-1 flex gap-1 overflow-x-auto scrollbar-none">
          {sessoes.slice(0, 10).map((s) => (
            <button key={s.id} onClick={() => selecionarSessao(s)}
              className={cn(
                "flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[12px] whitespace-nowrap transition-colors group shrink-0 max-w-[140px]",
                sessaoAtiva?.id === s.id ? "bg-surface text-ink border border-hairline" : "text-ink-muted hover:text-ink hover:bg-surface-2"
              )}>
              <MessageCircle className="w-3 h-3 shrink-0" />
              <span className="truncate">{s.titulo || "Nova conversa"}</span>
              <span onClick={(e) => handleDeletarSessao(e, s.id)}
                className="ml-auto p-0.5 rounded cursor-pointer opacity-0 group-hover:opacity-100 hover:bg-danger/10 hover:text-danger transition-all shrink-0">
                <Trash2 className="w-3 h-3" />
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto" ref={messagesEndRef}>
        {mensagens.length === 0 && !streamBuffer ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-8">
            <Bot className="w-10 h-10 text-ink-tertiary" />
            <p className="text-sm text-ink-subtle font-medium">Nova conversa</p>
            <p className="text-[12px] text-ink-tertiary">Digite algo ou use as ações no painel ao lado para começar.</p>
          </div>
        ) : (
          <div>
            {mensagens.map((msg) => (
              <ChatMessage
                key={msg.id}
                papel={msg.papel}
                conteudo={msg.conteudo}
                metadata={msg.metadata}
              />
            ))}
            {reasoning && showReasoning && (
              <div className="px-4 py-2">
                <button onClick={() => setShowReasoning(false)}
                  className="text-[11px] text-ink-tertiary hover:text-ink-muted transition-colors mb-1">
                  {showReasoning ? "Ocultar" : "Mostrar"} pensamento
                </button>
                <div className="text-[11px] text-ink-tertiary border-l-2 border-hairline pl-3 leading-relaxed whitespace-pre-wrap max-h-[200px] overflow-y-auto">
                  {reasoning}
                </div>
              </div>
            )}
            {streamBuffer && (
              <ChatMessage papel="assistant" conteudo={streamBuffer} isStreaming />
            )}
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-hairline p-3 bg-surface-2/30">
        <div className="flex items-center gap-2 bg-surface border border-hairline rounded-xl px-4 py-2.5 focus-within:border-accent/50 transition-colors">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={streaming ? "Aguardando resposta..." : "Digite sua mensagem..."}
            disabled={streaming}
            className="flex-1 bg-transparent text-[14px] text-ink placeholder:text-ink-tertiary outline-none disabled:opacity-50"
          />
          <button onClick={handleSend} disabled={!input.trim() || !sessaoAtiva || streaming}
            className="p-1.5 rounded-lg bg-accent text-white hover:bg-accent-hover transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
