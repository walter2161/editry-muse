import { create } from 'zustand';

export interface ErrorLogEntry {
  id: string;
  timestamp: number;
  source: string; // 'console.error' | 'window.error' | 'unhandledrejection' | 'toast' | 'manual'
  message: string;
  details?: string;
}

interface ErrorLogState {
  entries: ErrorLogEntry[];
  add: (entry: Omit<ErrorLogEntry, 'id' | 'timestamp'>) => void;
  clear: () => void;
}

const MAX_ENTRIES = 50;

export const useErrorLogStore = create<ErrorLogState>((set) => ({
  entries: [],
  add: (entry) =>
    set((state) => ({
      entries: [
        { ...entry, id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, timestamp: Date.now() },
        ...state.entries,
      ].slice(0, MAX_ENTRIES),
    })),
  clear: () => set({ entries: [] }),
}));

const stringify = (v: unknown): string => {
  if (v == null) return String(v);
  if (typeof v === 'string') return v;
  if (v instanceof Error) return v.stack || `${v.name}: ${v.message}`;
  try {
    return JSON.stringify(v, null, 2);
  } catch {
    return String(v);
  }
};

let installed = false;
export function installGlobalErrorCapture() {
  if (installed || typeof window === 'undefined') return;
  installed = true;

  const add = useErrorLogStore.getState().add;

  const originalError = console.error.bind(console);
  console.error = (...args: unknown[]) => {
    try {
      const message = args.map(stringify).join(' ');
      add({ source: 'console.error', message: message.slice(0, 500), details: message });
    } catch {}
    originalError(...args);
  };

  window.addEventListener('error', (e) => {
    const msg = e.message || 'window error';
    add({
      source: 'window.error',
      message: msg,
      details: `${msg}\n${e.filename}:${e.lineno}:${e.colno}\n${e.error?.stack || ''}`,
    });
  });

  window.addEventListener('unhandledrejection', (e) => {
    const reason = e.reason;
    const msg = reason instanceof Error ? reason.message : stringify(reason);
    add({
      source: 'unhandledrejection',
      message: msg.slice(0, 500),
      details: reason instanceof Error ? reason.stack || msg : msg,
    });
  });
}
