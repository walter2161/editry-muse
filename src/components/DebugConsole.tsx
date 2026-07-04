import { useState } from 'react';
import { Bug, Trash2, X, Copy } from 'lucide-react';
import { useErrorLogStore } from '@/store/errorLogStore';
import { toast } from 'sonner';

export const DebugConsole = () => {
  const [open, setOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const entries = useErrorLogStore((s) => s.entries);
  const clear = useErrorLogStore((s) => s.clear);

  const count = entries.length;

  const copyAll = async () => {
    const txt = entries
      .map((e) => `[${new Date(e.timestamp).toLocaleTimeString('pt-BR')}] (${e.source}) ${e.details || e.message}`)
      .join('\n\n---\n\n');
    try {
      await navigator.clipboard.writeText(txt);
      toast.success('Erros copiados');
    } catch {
      toast.error('Falha ao copiar');
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-4 right-4 z-[10000] flex items-center gap-2 rounded-full bg-card border border-border shadow-lg px-3 py-2 text-xs hover:bg-muted transition"
        title="Console de erros"
      >
        <Bug className={`h-4 w-4 ${count > 0 ? 'text-destructive' : 'text-muted-foreground'}`} />
        <span className="font-mono">{count}</span>
      </button>

      {open && (
        <div className="fixed bottom-16 right-4 z-[10000] w-[min(560px,calc(100vw-2rem))] max-h-[70vh] bg-card border border-border rounded-lg shadow-2xl flex flex-col">
          <div className="flex items-center justify-between px-3 py-2 border-b border-border">
            <div className="flex items-center gap-2">
              <Bug className="h-4 w-4 text-destructive" />
              <span className="text-sm font-semibold">Console de erros ({count})</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={copyAll}
                disabled={count === 0}
                className="p-1.5 rounded hover:bg-muted disabled:opacity-40"
                title="Copiar tudo"
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={clear}
                disabled={count === 0}
                className="p-1.5 rounded hover:bg-muted disabled:opacity-40"
                title="Limpar"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
              <button onClick={() => setOpen(false)} className="p-1.5 rounded hover:bg-muted" title="Fechar">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
          <div className="overflow-y-auto flex-1 divide-y divide-border">
            {count === 0 && (
              <div className="p-6 text-center text-xs text-muted-foreground">Nenhum erro registrado.</div>
            )}
            {entries.map((e) => {
              const isOpen = expandedId === e.id;
              return (
                <div key={e.id} className="p-2 text-xs">
                  <button
                    onClick={() => setExpandedId(isOpen ? null : e.id)}
                    className="w-full text-left flex items-start gap-2 hover:bg-muted/40 rounded p-1"
                  >
                    <span className="font-mono text-[10px] text-muted-foreground shrink-0 mt-0.5">
                      {new Date(e.timestamp).toLocaleTimeString('pt-BR')}
                    </span>
                    <span className="text-[10px] uppercase text-primary shrink-0 mt-0.5">{e.source}</span>
                    <span className="text-destructive break-words flex-1">{e.message}</span>
                  </button>
                  {isOpen && e.details && (
                    <pre className="mt-1 p-2 bg-muted/40 rounded text-[10px] whitespace-pre-wrap break-words max-h-64 overflow-auto">
                      {e.details}
                    </pre>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
};
