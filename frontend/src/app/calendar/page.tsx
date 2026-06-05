'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { 
  ChevronLeft, ChevronRight, Calendar as CalendarIcon, 
  Clock, Monitor, X, Building2, MapPin, Loader2, AlertCircle, RefreshCw, Trash2
} from 'lucide-react';
import { listarEventos, syncPipelineEventos, deletarEvento, cleanupEventosOrfaos } from '@/lib/api';
import type { EventoCalendario } from '@/lib/api';
import { cn } from '@/lib/utils';

const HOURS = Array.from({ length: 16 }, (_, i) => i + 7);
const WEEKDAYS_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

const TIPO_LABELS: Record<string, string> = {
  entrevista_rh: 'Entrevista RH',
  entrevista_tecnica: 'Entrevista Técnica',
  teste_tecnico: 'Teste Técnico',
  follow_up: 'Follow-up',
};

const TIPO_COLORS: Record<string, string> = {
  entrevista_rh: 'bg-accent/10 border-accent/20 border-l-accent text-accent',
  entrevista_tecnica: 'bg-warning/10 border-warning/20 border-l-warning text-warning',
  teste_tecnico: 'bg-blue-500/10 border-blue-500/20 border-l-blue-500 text-blue-400',
  follow_up: 'bg-surface-3 border-hairline border-l-ink-subtle text-ink-subtle',
};

function formatTime(date: string) {
  return new Date(date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export default function CalendarPage() {
  const [eventos, setEventos] = useState<EventoCalendario[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedEvento, setSelectedEvento] = useState<EventoCalendario | null>(null);
  const [viewMode, setViewMode] = useState<'day' | 'week'>('week');
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listarEventos();
      setEventos(data);
    } catch {
      setEventos([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const handleDeleteEvento = async () => {
    if (!selectedEvento) return;
    setDeleting(true);
    try {
      await deletarEvento(selectedEvento.id);
      setEventos(prev => prev.filter(e => e.id !== selectedEvento.id));
      setSelectedEvento(null);
    } catch {
      // silent
    } finally {
      setDeleting(false);
    }
  };

  const handleCleanup = async () => {
    setCleaning(true);
    try {
      const result = await cleanupEventosOrfaos();
      if (result.removidos > 0) await carregar();
    } catch {
      // silent
    } finally {
      setCleaning(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      await syncPipelineEventos();
      await carregar();
    } catch {
      // silent
    } finally {
      setSyncing(false);
    }
  };

  const getEventosForDate = useCallback((date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const day = date.getDate();
    return eventos
      .filter(ev => {
        const d = new Date(ev.data_inicio);
        return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day;
      })
      .sort((a, b) => new Date(a.data_inicio).getTime() - new Date(b.data_inicio).getTime());
  }, [eventos]);

  const getWeekDays = useMemo(() => {
    const start = new Date(selectedDate);
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - start.getDay());
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [selectedDate]);

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  const navigate = (dir: number) => {
    const newDate = new Date(selectedDate);
    if (viewMode === 'day') newDate.setDate(newDate.getDate() + dir);
    else newDate.setDate(newDate.getDate() + dir * 7);
    setSelectedDate(newDate);
  };

  const getStatusStyle = (tipo: string) => {
    const style = TIPO_COLORS[tipo] || TIPO_COLORS.follow_up;
    const parts = style.split(' ');
    return {
      bg: parts[0],
      border: parts[1],
      borderLeft: parts[2],
      text: parts[3],
    };
  };

  const getHourPosition = (time: string) => {
    const date = new Date(time);
    return ((date.getHours() - 7) * 80) + (date.getMinutes() / 60 * 80);
  };

  if (loading) {
    return (
      <div className="p-6 h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-accent animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 h-screen overflow-hidden flex flex-col max-w-7xl mx-auto bg-canvas">
      <div className="mb-6 flex-shrink-0 flex items-center justify-between animate-fade-in-up">
        <div>
          <h1 className="text-xl font-semibold metallic-gradient tracking-tight" style={{ fontFamily: 'var(--font-poppins)' }}>
            Calendário de Entrevistas
          </h1>
          <p className="mt-1 text-sm text-ink-subtle capitalize">
            {selectedDate.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleCleanup}
            disabled={cleaning}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-ink bg-surface-2 border border-hairline hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400 rounded-lg transition-colors"
          >
            <Trash2 size={12} className={cleaning ? 'animate-spin' : ''} />
            Limpar Órfãos
          </button>
          <button
            onClick={handleSync}
            disabled={syncing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-ink bg-surface-2 border border-hairline hover:bg-surface-3 rounded-lg transition-colors"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", syncing && "animate-spin")} />
            Sincronizar Pipeline
          </button>
          <div className="flex bg-surface-2 p-1 rounded-lg border border-hairline">
            {(['day', 'week'] as const).map(mode => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                  viewMode === mode 
                    ? 'bg-surface border border-hairline shadow-sm text-ink' 
                    : 'text-ink-tertiary hover:text-ink hover:bg-surface-3'
                }`}
              >
                {mode === 'day' ? 'Dia' : 'Semana'}
              </button>
            ))}
          </div>
          <button 
            onClick={() => setSelectedDate(new Date())}
            className="px-3 py-1.5 text-xs font-medium text-ink bg-surface-2 border border-hairline hover:bg-surface-3 rounded-lg transition-colors"
          >
            Hoje
          </button>
        </div>
      </div>

      <div className="mb-6 flex-shrink-0 flex items-center gap-4 p-3 bg-surface border border-hairline rounded-xl animate-fade-in-up delay-100">
        <button onClick={() => navigate(-1)} className="p-1.5 text-ink-subtle hover:text-ink hover:bg-surface-3 rounded-md transition-colors">
          <ChevronLeft size={18} />
        </button>
        <div className="flex-1 text-center">
          <span className="text-sm font-medium text-ink">
            {viewMode === 'week' 
              ? `${getWeekDays[0].getDate()} a ${getWeekDays[6].getDate()} de ${MONTHS[selectedDate.getMonth()]}`
              : `${MONTHS[selectedDate.getMonth()]} de ${selectedDate.getFullYear()}`
            }
          </span>
        </div>
        <button onClick={() => navigate(1)} className="p-1.5 text-ink-subtle hover:text-ink hover:bg-surface-3 rounded-md transition-colors">
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-auto bg-surface border border-hairline rounded-xl animate-fade-in-up delay-200">
        {viewMode === 'week' ? (
          <div className="min-w-[800px] relative">
            <div className="grid grid-cols-8 sticky top-0 bg-surface border-b border-hairline z-10 shadow-sm">
              <div className="w-16 flex-shrink-0 bg-surface-2 border-r border-hairline" />
              {getWeekDays.map((date, idx) => {
                const isToday = date.toISOString().split('T')[0] === todayStr;
                const isSelected = date.toISOString().split('T')[0] === selectedDate.toISOString().split('T')[0];
                const dayEvents = getEventosForDate(date);
                return (
                  <button
                    key={idx}
                    onClick={() => { setSelectedDate(date); setViewMode('day'); }}
                    className={`p-2 text-center transition-all duration-200 border-r border-hairline hover:bg-surface-2 flex flex-col items-center gap-1 ${
                      isSelected ? 'bg-surface-3' : ''
                    }`}
                  >
                    <span className={`text-[10px] font-semibold uppercase tracking-wider ${isToday ? 'text-accent' : 'text-ink-subtle'}`}>
                      {WEEKDAYS_SHORT[date.getDay()]}
                    </span>
                    <span className={`text-sm flex items-center justify-center w-6 h-6 rounded-full ${
                      isToday ? 'bg-accent text-white font-bold' : 'text-ink font-medium'
                    }`}>
                      {date.getDate()}
                    </span>
                    {dayEvents.length > 0 && (
                      <div className="w-1 h-1 rounded-full bg-accent mt-0.5" />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="relative">
              {HOURS.map(hour => (
                <div key={hour} className="grid grid-cols-8 border-b border-hairline h-[80px]">
                  <div className="w-16 flex-shrink-0 p-2 text-[10px] font-medium text-ink-tertiary border-r border-hairline bg-surface-2 flex justify-end pr-2">
                    {hour.toString().padStart(2, '0')}:00
                  </div>
                  {getWeekDays.map((_, idx) => (
                    <div key={idx} className="border-r border-hairline relative" />
                  ))}
                </div>
              ))}

              {getWeekDays.map((date, dayIdx) => {
                const dayEvents = getEventosForDate(date);
                return dayEvents.map(ev => {
                  const pos = getHourPosition(ev.data_inicio);
                  const styles = getStatusStyle(ev.tipo);
                  return (
                    <div
                      key={ev.id}
                      className={`absolute ${styles.bg} border-y border-r ${styles.border} ${styles.borderLeft} border-l-4 rounded-md p-1.5 cursor-pointer shadow-sm hover:z-10 transition-all duration-200 overflow-hidden group`}
                      style={{
                        left: `calc(${(dayIdx + 1) * 12.5}% + 4px)`,
                        top: `${pos}px`,
                        width: 'calc(12.5% - 8px)',
                        height: '80px',
                        minHeight: '24px',
                      }}
                      onClick={(e) => { e.stopPropagation(); setSelectedEvento(ev); }}
                    >
                      <div className="flex items-start gap-1">
                        <div className="flex-1 min-w-0 leading-tight">
                          <p className="text-[11px] font-semibold truncate text-ink">{ev.empresa}</p>
                          <p className="text-[9px] truncate text-ink-subtle mt-0.5 font-medium">{ev.titulo}</p>
                          <p className="text-[8px] text-ink-tertiary mt-0.5">{formatTime(ev.data_inicio)}</p>
                        </div>
                      </div>
                    </div>
                  );
                });
              })}
            </div>
          </div>
        ) : (
          <div className="p-6 max-w-3xl mx-auto animate-fade-in">
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-ink">
                {selectedDate.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
              </h2>
              <p className="text-sm text-ink-subtle mt-1">{getEventosForDate(selectedDate).length} eventos previstos</p>
            </div>

            <div className="space-y-3">
              {getEventosForDate(selectedDate).length === 0 ? (
                <div className="text-center py-16 px-4 rounded-xl border border-dashed border-hairline bg-surface-2">
                  <CalendarIcon size={32} className="mx-auto text-ink-tertiary mb-3" />
                  <p className="text-sm font-medium text-ink">Nenhum evento hoje</p>
                  <p className="text-xs text-ink-subtle mt-1">
                    Use "Sincronizar Pipeline" para importar entrevistas e testes agendados.
                  </p>
                </div>
              ) : (
                getEventosForDate(selectedDate).map(ev => {
                  const styles = getStatusStyle(ev.tipo);
                  return (
                    <div
                      key={ev.id}
                      onClick={() => setSelectedEvento(ev)}
                      className={`cursor-pointer bg-surface-2 hover:bg-surface-3 border border-hairline transition-all duration-200 border-l-4 ${styles.borderLeft} rounded-xl p-4 group`}
                    >
                      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                        <div className="flex items-center gap-4">
                          <div className="text-center w-16">
                            <p className="font-semibold text-ink">{formatTime(ev.data_inicio)}</p>
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-ink text-sm">{ev.empresa}</p>
                              <span className={`text-[10px] px-2 py-0.5 rounded-full border ${styles.bg} ${styles.border} ${styles.text}`}>
                                {TIPO_LABELS[ev.tipo] || ev.tipo}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-ink-subtle mt-1">
                              <span className="flex items-center gap-1"><Monitor size={12} /> {ev.titulo}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {selectedEvento && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
          onClick={() => setSelectedEvento(null)}
        >
          <div 
            className="w-full max-w-sm bg-surface border border-hairline rounded-2xl shadow-2xl animate-slide-up overflow-hidden" 
            onClick={e => e.stopPropagation()}
          >
            <div className="p-5">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-surface-2 border border-hairline flex items-center justify-center text-ink">
                    <Building2 size={20} className="text-accent" />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-ink">{selectedEvento.empresa}</h2>
                    <p className="text-[10px] text-ink-subtle uppercase tracking-wider">{TIPO_LABELS[selectedEvento.tipo] || selectedEvento.tipo}</p>
                  </div>
                </div>
                <button onClick={() => setSelectedEvento(null)} className="text-ink-tertiary hover:text-ink">
                  <X size={20} />
                </button>
              </div>
              
              <div className="bg-surface-2 rounded-lg p-3 space-y-3 mb-5 border border-hairline">
                <div className="flex items-center gap-2 text-sm text-ink-subtle">
                  <Clock size={14} className="text-ink-tertiary" />
                  <span>
                    {new Date(selectedEvento.data_inicio).toLocaleDateString('pt-BR')} às {formatTime(selectedEvento.data_inicio)}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-ink-subtle">
                  <Monitor size={14} className="text-ink-tertiary" />
                  <span>{selectedEvento.titulo}</span>
                </div>
                {selectedEvento.local && (
                  <div className="flex items-center gap-2 text-sm text-ink-subtle">
                    <MapPin size={14} className="text-ink-tertiary" />
                    <span>{selectedEvento.local}</span>
                  </div>
                )}
              </div>
              
              {selectedEvento.descricao && (
                <div className="bg-surface-2 rounded-lg p-3 mb-5 border border-hairline">
                  <p className="text-[11px] font-semibold text-ink-subtle uppercase tracking-wider mb-1">Descrição</p>
                  <p className="text-sm text-ink-muted">{selectedEvento.descricao}</p>
                </div>
              )}
              
              <div className="flex flex-col gap-2">
                {selectedEvento.url && (
                  <button 
                    onClick={() => window.open(selectedEvento.url, '_blank')}
                    className="w-full flex justify-center items-center gap-2 px-4 py-2 bg-accent text-black text-sm font-medium rounded-lg hover:bg-accent-hover transition-colors"
                  >
                    Abrir Vaga
                  </button>
                )}
                <button 
                  onClick={() => {
                    if (confirmDelete === selectedEvento.id) {
                      handleDeleteEvento();
                    } else {
                      setConfirmDelete(selectedEvento.id);
                    }
                  }}
                  disabled={deleting}
                  className="w-full flex justify-center items-center gap-2 px-4 py-2 bg-surface-2 border border-hairline hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400 text-ink text-sm font-medium rounded-lg transition-colors"
                >
                  <Trash2 size={14} className={deleting ? 'animate-spin' : ''} />
                  {deleting ? 'Excluindo...' : confirmDelete === selectedEvento.id ? 'Confirmar Exclusão?' : 'Excluir Evento'}
                </button>
                <button 
                  onClick={() => { setSelectedEvento(null); setConfirmDelete(null); }}
                  className="w-full flex justify-center items-center gap-2 px-4 py-2 bg-surface-2 border border-hairline hover:bg-surface-3 text-ink text-sm font-medium rounded-lg transition-colors"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
