import { useEffect, useState } from 'react';
import { useAutomationStore, AutomationStep } from '@/store/automationStore';
import { Loader2, CheckCircle2, AlertTriangle, Lock } from 'lucide-react';

const STEPS: { key: AutomationStep; label: string }[] = [
  { key: 'waiting-scan', label: 'Escaneando imóvel e preparando timeline' },
  { key: 'add-music', label: 'Adicionando trilha sonora (15% volume)' },
  { key: 'generate-script', label: 'Gerando roteiro (até 145 palavras)' },
  { key: 'generate-subtitles', label: 'Criando legendas sincronizadas' },
  { key: 'generate-voiceover', label: 'Gerando locução LMNT' },
  { key: 'render', label: 'Renderizando vídeo final' },
  { key: 'schedule', label: 'Agendando nos 3 canais (IG / FB / TikTok)' },
];

export const AutomationOverlay = () => {
  const { enabled, step, error, dueAtIso } = useAutomationStore();
  const [elapsed, setElapsed] = useState(0);

  // Bloquear tentativa de fechar a aba enquanto automação está rodando
  useEffect(() => {
    if (!enabled || step === 'done' || step === 'error' || step === 'idle') return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = 'Automação em andamento. Sair agora cancela todo o processo.';
      return e.returnValue;
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [enabled, step]);

  useEffect(() => {
    if (!enabled || step === 'done' || step === 'error' || step === 'idle') return;
    const start = Date.now();
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 1000);
    return () => clearInterval(id);
  }, [enabled, step]);

  if (!enabled || step === 'idle') return null;

  const currentIndex = STEPS.findIndex((s) => s.key === step);
  const isDone = step === 'done';
  const isError = step === 'error';

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${m}:${r.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black/85 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in">
      <div className="max-w-2xl w-full bg-card border border-border rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary/20 to-primary/5 p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="relative">
              {isDone ? (
                <CheckCircle2 className="h-10 w-10 text-green-500" />
              ) : isError ? (
                <AlertTriangle className="h-10 w-10 text-destructive" />
              ) : (
                <Loader2 className="h-10 w-10 text-primary animate-spin" />
              )}
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-foreground">
                {isDone ? '✅ Automação concluída!' : isError ? '❌ Automação falhou' : '🤖 Automação em andamento'}
              </h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                {dueAtIso && !isError && (
                  <>Agendamento para: <span className="font-semibold">{new Date(dueAtIso).toLocaleString('pt-BR')}</span></>
                )}
              </p>
            </div>
            {!isDone && !isError && (
              <div className="text-right">
                <div className="text-xs text-muted-foreground">Tempo</div>
                <div className="font-mono font-bold text-foreground">{formatTime(elapsed)}</div>
              </div>
            )}
          </div>
        </div>

        {/* Aviso crítico */}
        {!isDone && !isError && (
          <div className="bg-yellow-500/10 border-b border-yellow-500/30 px-6 py-3 flex items-center gap-2">
            <Lock className="h-4 w-4 text-yellow-500 shrink-0" />
            <p className="text-sm text-yellow-200 font-medium">
              ⚠️ NÃO FECHE NEM SAIA DESTA ABA. O processo será cancelado se você sair.
            </p>
          </div>
        )}

        {/* Lista de etapas */}
        <div className="p-6 space-y-2 max-h-[50vh] overflow-y-auto">
          {STEPS.map((s, idx) => {
            const isActive = idx === currentIndex && !isDone && !isError;
            const isComplete = isDone || idx < currentIndex || (idx === currentIndex && isDone);
            const isFailed = isError && idx === currentIndex;
            return (
              <div
                key={s.key}
                className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
                  isActive
                    ? 'bg-primary/15 border border-primary/40'
                    : isComplete
                    ? 'bg-green-500/10'
                    : isFailed
                    ? 'bg-destructive/15 border border-destructive/40'
                    : 'bg-muted/30'
                }`}
              >
                {isActive ? (
                  <Loader2 className="h-5 w-5 text-primary animate-spin shrink-0" />
                ) : isComplete ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                ) : isFailed ? (
                  <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
                ) : (
                  <div className="h-5 w-5 rounded-full border-2 border-muted-foreground/30 shrink-0" />
                )}
                <span
                  className={`text-sm ${
                    isActive
                      ? 'text-foreground font-semibold'
                      : isComplete
                      ? 'text-green-300'
                      : isFailed
                      ? 'text-destructive'
                      : 'text-muted-foreground'
                  }`}
                >
                  {idx + 1}. {s.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Erro / Sucesso */}
        {isError && error && (
          <div className="bg-destructive/15 border-t border-destructive/30 px-6 py-4">
            <p className="text-sm text-destructive font-medium">Erro: {error}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Você já pode interagir com o app normalmente. Esta tela fechará automaticamente.
            </p>
          </div>
        )}
        {isDone && (
          <div className="bg-green-500/15 border-t border-green-500/30 px-6 py-4">
            <p className="text-sm text-green-300 font-medium">
              Vídeo agendado nos canais com sucesso! Você pode fechar esta aba.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
