"use client";

import { useEffect, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Area, AreaChart,
} from "recharts";
import {
  getOverview, getStacksMaisPedidas, getMediaSalarial,
  getVagasPorFonte, getVagasPorSenioridade, getTimeline,
  pipelineEstatisticas, getChatAnalytics,
  getScorePorFonte, getSkillsPopulares,
  Overview, StackCount, SalarioPorStack, FonteCount,
  SenioridadeCount, TimelinePoint, ChatAnalytics,
  FonteScore, SkillCount,
} from "@/lib/api";
import {
  AlertCircle, TrendingUp, Users, Briefcase, AlertTriangle,
  Activity, MessageCircle, Bot, Sparkles, MousePointerClick, Code2,
} from "lucide-react";
import { PageTransition } from "@/components/ui/PageTransition";
import { TelegramSettings } from "@/components/ai/TelegramSettings";
import { SkeletonAnalytics } from "@/components/ui/Skeleton";

const GOLD_PRIMARY = "#D4A017";
const GOLD_LIGHT = "#F5C842";
const GOLD_MUTED = "#B8960F";

const CORES_PIE = [
  "#FFB300", // amber vivo
  "#D4A017", // dourado clássico
  "#E8891A", // laranja-dourado
  "#F5C842", // dourado claro
  "#CD853F", // cobre
  "#B8860B", // goldenrod escuro
  "#FF8C00", // laranja intenso
];

const renderLabelPie = ({ name, percent, cx, cy, midAngle, innerRadius, outerRadius }: any) => {
  if (percent < 0.05) return null;
  const RADIAN = Math.PI / 180;
  const radius = outerRadius + 20;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="#fff" fontSize={12} fontWeight={600} textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central">
      {name}
    </text>
  );
};

function formatCurrency(v: number | null | undefined) {
  if (v == null || v === 0) return "—";
  return `R$ ${Number(v).toLocaleString("pt-BR")}`;
}

function formatDateBR(dateStr: string) {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("pt-BR", { day: "numeric", month: "short" });
}

const CustomTooltip = ({ active, payload, label, formatter, labelFormatter }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-surface border border-hairline rounded-lg shadow-lg px-3 py-2 text-[13px]">
      <p className="text-ink-muted mb-1 text-[11px] font-medium">
        {labelFormatter ? labelFormatter(label) : label}
      </p>
      {payload.map((p: any, i: number) => (
        <p key={i} className="text-ink" style={{ color: p.color }}>
          {p.name}: {formatter ? formatter(p.value) : p.value}
        </p>
      ))}
    </div>
  );
};

function Card({ titulo, valor, cor, icone: Icon, desc }: { titulo: string; valor: string | number; cor: string; icone: React.ElementType; desc?: string }) {
  return (
    <div className="bg-surface border border-hairline rounded-xl p-5 flex flex-col justify-between h-full stat-card">
      <div className="flex items-start justify-between mb-4">
        <div className="text-[12px] text-ink-subtle uppercase tracking-wider font-semibold">{titulo}</div>
        <div className="w-8 h-8 rounded-md bg-surface-2 flex items-center justify-center">
          <Icon className="w-4 h-4 text-ink-tertiary" />
        </div>
      </div>
      <div>
        <div className="text-3xl font-heading font-semibold" style={{ color: cor }}>{valor}</div>
        {desc && <div className="text-[13px] text-ink-muted mt-2 leading-relaxed">{desc}</div>}
      </div>
    </div>
  );
}

function ChartCard({ titulo, desc, className, children }: { titulo: string; desc?: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={"bg-surface border border-hairline rounded-xl p-5 flex flex-col h-full card-glow " + (className || "")}>
      <div className="mb-5">
        <h3 className="font-heading font-medium text-ink">{titulo}</h3>
        {desc && <p className="text-[13px] text-ink-muted mt-1">{desc}</p>}
      </div>
      <div className="flex-1 min-h-[260px]">
        {children}
      </div>
    </div>
  );
}

const ETAPAS_PIPELINE = [
  { key: "salva", label: "Salvas", cor: "var(--color-ink-muted)", icon: "📥" },
  { key: "aplicada", label: "Aplicadas", cor: "var(--color-accent)", icon: "📤" },
  { key: "em_analise", label: "Em Análise", cor: "#60a5fa", icon: "🔍" },
  { key: "entrevista_rh", label: "Entrevista RH", cor: "var(--color-warning)", icon: "📞" },
  { key: "entrevista_tecnica", label: "Entrevista Técnica", cor: "#f59e0b", icon: "💻" },
  { key: "teste_tecnico", label: "Teste Técnico", cor: "#3b82f6", icon: "🧪" },
  { key: "contratado", label: "Contratado", cor: "var(--color-success)", icon: "🎉" },
  { key: "rejeitado", label: "Rejeitado", cor: "var(--color-danger)", icon: "❌" },
];

export default function AnalyticsPage() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [stacks, setStacks] = useState<StackCount[]>([]);
  const [salarios, setSalarios] = useState<SalarioPorStack[]>([]);
  const [fontes, setFontes] = useState<FonteCount[]>([]);
  const [senioridade, setSenioridade] = useState<SenioridadeCount[]>([]);
  const [timeline, setTimeline] = useState<TimelinePoint[]>([]);
  const [pipelineData, setPipelineData] = useState<Record<string, number> | null>(null);
  const [chatData, setChatData] = useState<ChatAnalytics | null>(null);
  const [fontesScore, setFontesScore] = useState<FonteScore[]>([]);
  const [skills, setSkills] = useState<SkillCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [ov, st, sa, fo, se, ti, pp, chat, fs, sk] = await Promise.all([
          getOverview(),
          getStacksMaisPedidas(12),
          getMediaSalarial(12),
          getVagasPorFonte(),
          getVagasPorSenioridade(),
          getTimeline(30),
          pipelineEstatisticas().catch(() => null),
          getChatAnalytics().catch(() => null),
          getScorePorFonte().catch(() => [] as FonteScore[]),
          getSkillsPopulares(12).catch(() => [] as SkillCount[]),
        ]);
        setOverview(ov); setStacks(st); setSalarios(sa);
        setFontes(fo); setSenioridade(se); setTimeline(ti);
        setPipelineData(pp as unknown as Record<string, number> | null);
        setChatData(chat); setFontesScore(fs); setSkills(sk);
        setError(null);
      } catch {
        setError("API Backend offline. A análise preditiva requer conexão direta.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <SkeletonAnalytics />;

  if (error) {
    return (
      <PageTransition className="min-h-screen bg-canvas flex items-center justify-center p-8">
        <div className="flex flex-col items-center gap-4 px-8 py-8 rounded-2xl bg-danger/5 border border-danger/20 text-center max-w-lg">
          <AlertCircle className="w-8 h-8 text-danger mb-2" />
          <div>
            <h2 className="font-heading text-lg font-medium text-ink mb-2">Telemetry Offline</h2>
            <p className="text-[14px] text-ink-subtle leading-relaxed">{error}</p>
          </div>
        </div>
      </PageTransition>
    );
  }

  const totalSalarios = salarios.reduce((a, b) => a + (b.salario_medio_max || 0), 0);
  const mediaGeral = salarios.length > 0 ? Math.round(totalSalarios / salarios.length) : 0;

  return (
    <PageTransition className="min-h-screen bg-canvas pb-12">
      <header className="border-b border-hairline bg-canvas/80 backdrop-blur-xl sticky top-0 z-30">
        <div className="px-8 py-6 flex items-end justify-between">
          <div>
            <h1 className="text-xl font-semibold metallic-gradient tracking-tight" style={{ fontFamily: 'var(--font-poppins)' }}>
              Radar de Mercado
            </h1>
            <p className="text-sm text-ink-subtle mt-1">
              Inteligência artificial cruzando dados de stacks, salários e níveis em tempo real.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <TelegramSettings />
          </div>
        </div>
      </header>

      <main className="px-8 py-8 space-y-6">
        {overview && (
          <section>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              <Card titulo="Total Radar" valor={overview.total_vagas} cor="var(--color-ink)" icone={Briefcase} desc="Volume total processado." />
              <Card titulo="Match Score" valor={overview.score_medio} cor="var(--color-success)" icone={TrendingUp} desc="Índice médio de afinidade." />
              <Card titulo="Fake Junior" valor={overview.fake_junior_count} cor="var(--color-danger)" icone={AlertTriangle} desc="Anomalias de sênioridade detectadas." />
              <Card titulo="Top Matches" valor={overview.alertas.length} cor="var(--color-warning)" icone={Users} desc="Vagas com score ≥ 85." />
            </div>
          </section>
        )}

        {pipelineData && (pipelineData.total ?? 0) > 0 && (
          <section>
            <h2 className="text-[12px] font-semibold text-ink-subtle uppercase tracking-wider mb-4">
              Funil de Pipeline
            </h2>
            <div className="bg-surface border border-hairline rounded-xl p-5 card-glow">
              <div className="flex items-center justify-between mb-5">
                <span className="text-sm text-ink-muted">
                  <strong className="text-ink">{pipelineData.total}</strong> candidaturas ·{' '}
                  <strong className="text-success">{pipelineData.taxa_conversao ?? 0}%</strong> taxa de conversão ·{' '}
                  <strong className="text-danger">{pipelineData.taxa_rejeicao ?? 0}%</strong> rejeição
                </span>
              </div>
              <div className="space-y-2.5">
                {ETAPAS_PIPELINE.map((s) => {
                  const count = pipelineData[s.key] ?? 0;
                  const total = Object.keys(pipelineData)
                    .filter(k => !["total", "taxa_conversao", "taxa_rejeicao"].includes(k))
                    .reduce((a, k) => a + ((pipelineData as any)[k] || 0), 0);
                  const pct = total > 0 ? (count / total) * 100 : 0;
                  return (
                    <div key={s.key} className="flex items-center gap-3">
                      <span className="w-6 text-center shrink-0 text-[13px]">{s.icon}</span>
                      <span className="w-[120px] text-[12px] text-ink-subtle shrink-0">{s.label}</span>
                      <div className="flex-1 h-6 bg-surface-2 rounded-full overflow-hidden border border-hairline relative">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${pct}%`, backgroundColor: s.cor }}
                        />
                      </div>
                      <span className="w-8 text-right text-[12px] font-medium text-ink tabular-nums">{count}</span>
                      <span className="w-10 text-right text-[11px] text-ink-muted tabular-nums">
                        {pct.toFixed(1)}%
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {chatData && (
          <section>
            <h2 className="text-[12px] font-semibold text-ink-subtle uppercase tracking-wider mb-4 flex items-center gap-2">
              <MessageCircle className="w-4 h-4" />
              AI Copilot
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-5 mb-5">
              <Card titulo="Sessões" valor={chatData.total_sessoes} cor="var(--color-accent)" icone={MessageCircle} desc={`${chatData.sessoes_hoje} nas últimas 24h`} />
              <Card titulo="Mensagens" valor={chatData.total_mensagens} cor="var(--color-accent)" icone={Sparkles} desc={`Média de ${chatData.media_mensagens_por_sessao} por sessão`} />
              <Card titulo="Ferramentas" valor={Object.keys(chatData.tools_executadas).length} cor="var(--color-success)" icone={MousePointerClick} desc="Tools executadas pelo copiloto" />
              <Card titulo="Resultados" valor={Object.keys(chatData.tools_resultados).length} cor="var(--color-warning)" icone={Bot} desc="Tools com resultado salvo" />
            </div>
            {Object.keys(chatData.tools_executadas).length > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <div className="bg-surface border border-hairline rounded-xl p-5 card-glow">
                  <h3 className="text-[13px] font-medium text-ink mb-3 flex items-center gap-2">
                    <MousePointerClick className="w-4 h-4 text-accent" />
                    Tools Executadas
                  </h3>
                  <div className="space-y-2">
                    {Object.entries(chatData.tools_executadas).map(([tool, count]) => (
                      <div key={tool} className="flex items-center gap-3">
                        <span className="w-32 text-[12px] text-ink-muted truncate">{tool}</span>
                        <div className="flex-1 h-4 bg-surface-2 rounded-full overflow-hidden border border-hairline">
                          <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${Math.min((count / Math.max(...Object.values(chatData.tools_executadas))) * 100, 100)}%` }} />
                        </div>
                        <span className="w-8 text-right text-[12px] font-medium text-ink tabular-nums">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-surface border border-hairline rounded-xl p-5 card-glow">
                  <h3 className="text-[13px] font-medium text-ink mb-3 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-accent" />
                    Atividade Diária (7d)
                  </h3>
                  <div className="space-y-2">
                    {chatData.atividade_diaria.map((d) => (
                      <div key={d.data} className="flex items-center gap-3">
                        <span className="w-24 text-[11px] text-ink-subtle">
                          {formatDateBR(d.data)}
                        </span>
                        <div className="flex-1 h-3 bg-surface-2 rounded-full overflow-hidden border border-hairline">
                          <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${Math.min((d.mensagens / Math.max(...chatData.atividade_diaria.map(x => x.mensagens), 1)) * 100, 100)}%` }} />
                        </div>
                        <span className="w-6 text-right text-[11px] text-ink-muted tabular-nums">{d.mensagens}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <ChartCard titulo="Demandas Tecnológicas" desc="Frequência de requisitos técnicos extraídos via NLP das descrições.">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stacks} layout="vertical" margin={{ left: 80, right: 20 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="stack" tick={{ fontSize: 11, fill: "var(--color-ink-subtle)" }} width={80} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: "var(--color-surface-2)" }} />
                <Bar dataKey="count" fill={GOLD_PRIMARY} radius={[0, 4, 4, 0]} barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard titulo="Projeção Salarial" desc="Comparativo entre piso e teto salarial por stack.">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={salarios} margin={{ bottom: 20 }}>
                <XAxis dataKey="stack" tick={{ fontSize: 10, fill: "var(--color-ink-subtle)" }} angle={-30} textAnchor="end" axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip content={<CustomTooltip formatter={(v: any) => formatCurrency(v)} />} cursor={{ fill: "var(--color-surface-2)" }} />
                <Bar dataKey="salario_medio_min" name="Piso" fill={GOLD_MUTED} radius={[4, 0, 0, 4]} barSize={12} />
                <Bar dataKey="salario_medio_max" name="Teto" fill={GOLD_LIGHT} radius={[0, 4, 4, 0]} barSize={12} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </section>

        {skills.length > 0 && (
          <section>
            <ChartCard titulo="Skills em Alta" desc="Habilidades mais requisitadas no mercado.">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={skills} layout="vertical" margin={{ left: 100, right: 20 }}>
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="skill" tick={{ fontSize: 11, fill: "var(--color-ink-subtle)" }} width={100} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: "var(--color-surface-2)" }} />
                  <Bar dataKey="count" fill={GOLD_PRIMARY} radius={[0, 4, 4, 0]} barSize={14} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </section>
        )}

        <section className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <ChartCard titulo="Distribuição por Fonte">
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={fontes} dataKey="count" nameKey="fonte" cx="50%" cy="50%" innerRadius={60} outerRadius={80} stroke="#fff" strokeWidth={2} label={renderLabelPie}>
                  {fontes.map((_, i) => <Cell key={i} fill={CORES_PIE[i % CORES_PIE.length]} />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard titulo="Sênioridade Declarada">
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={senioridade} dataKey="count" nameKey="nivel" cx="50%" cy="50%" innerRadius={60} outerRadius={80} stroke="#fff" strokeWidth={2} label={renderLabelPie}>
                  {senioridade.map((_, i) => <Cell key={i} fill={CORES_PIE[i % CORES_PIE.length]} />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard titulo="Volume Histórico (30d)" desc="Vagas coletadas por dia com tendência.">
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={timeline}>
                <XAxis dataKey="data" hide />
                <YAxis hide />
                <Tooltip
                  content={<CustomTooltip formatter={(v: number) => `${v} vagas`} labelFormatter={formatDateBR} />}
                />
                <defs>
                  <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={GOLD_LIGHT} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={GOLD_LIGHT} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="count" stroke={GOLD_PRIMARY} strokeWidth={2} fill="url(#areaGrad)" dot={false} activeDot={{ r: 4, fill: GOLD_LIGHT }} />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>
        </section>

        {fontesScore.length > 0 && (
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <ChartCard titulo="Score Médio por Fonte" desc="Qual fonte entrega as melhores oportunidades (score médio + max).">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={fontesScore} margin={{ left: 60, right: 20 }}>
                  <XAxis dataKey="fonte" tick={{ fontSize: 13, fill: "#fff", fontWeight: 600 }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} hide />
                  <Tooltip content={<CustomTooltip formatter={(v: any) => `${v} pts`} />} cursor={{ fill: "var(--color-surface-2)" }} />
                  <Bar dataKey="score_medio" name="Score Médio" fill={GOLD_PRIMARY} radius={[4, 4, 0, 0]} barSize={28} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard titulo="Skills Populares" desc="Competências mais exigidas nas vagas coletadas.">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={skills} layout="vertical" margin={{ left: 90, right: 20 }}>
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="skill" tick={{ fontSize: 10, fill: "var(--color-ink-subtle)" }} width={90} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: "var(--color-surface-2)" }} />
                  <Bar dataKey="count" fill={GOLD_PRIMARY} radius={[0, 4, 4, 0]} barSize={12} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </section>
        )}

        {overview && overview.alertas.length > 0 && (
          <section className="animate-fade-in-up delay-200">
            <h2 className="text-[12px] font-semibold text-ink-subtle uppercase tracking-wider mb-3">
              Oportunidades High-Score
            </h2>
            <div className="bg-surface border border-hairline rounded-xl overflow-hidden">
              <div className="divide-y divide-hairline">
                {overview.alertas.map((a) => (
                  <div key={a.id} className="flex items-center justify-between px-5 py-4 hover:bg-surface-2 transition-colors group">
                    <div className="min-w-0 pr-4">
                      <p className="text-[14px] font-medium text-ink truncate">{a.titulo}</p>
                      <p className="text-[12px] text-ink-muted">{a.empresa}</p>
                    </div>
                    <div className="flex items-center gap-4 shrink-0">
                      <span className="text-[10px] font-bold text-warning bg-warning/10 px-2 py-0.5 rounded tracking-wide">
                        {a.score} MATCH
                      </span>
                      <a href={a.url} target="_blank" rel="noopener noreferrer" className="text-[12px] font-medium text-accent hover:text-accent-hover transition-colors opacity-0 group-hover:opacity-100">
                        Investigar ↗
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>
    </PageTransition>
  );
}
