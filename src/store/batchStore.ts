import { create } from 'zustand';

export interface BatchItem {
  url: string;
  dueAtIso: string; // ISO datetime para agendar nos canais
}

interface BatchState {
  queue: BatchItem[];
  currentIndex: number; // índice do item em execução (0-based) ou -1 se inativo
  total: number;
  setQueue: (items: BatchItem[]) => void;
  popNext: () => BatchItem | null;
  advance: () => void;
  reset: () => void;
}

const STORAGE_KEY = 'batch-queue';

const load = (): { queue: BatchItem[]; currentIndex: number; total: number } | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const persist = (state: { queue: BatchItem[]; currentIndex: number; total: number }) => {
  try {
    if (state.queue.length === 0) localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
};

export const useBatchStore = create<BatchState>((set, get) => {
  const persisted = load();
  return {
    queue: persisted?.queue ?? [],
    currentIndex: persisted?.currentIndex ?? -1,
    total: persisted?.total ?? 0,
    setQueue: (items) => {
      const state = { queue: items, currentIndex: 0, total: items.length };
      persist(state);
      set(state);
    },
    popNext: () => {
      const { queue } = get();
      return queue[0] ?? null;
    },
    advance: () => {
      const { queue, currentIndex, total } = get();
      const newQueue = queue.slice(1);
      const newState = {
        queue: newQueue,
        currentIndex: newQueue.length > 0 ? currentIndex + 1 : -1,
        total,
      };
      persist(newState);
      set(newState);
    },
    reset: () => {
      try { localStorage.removeItem(STORAGE_KEY); } catch {}
      set({ queue: [], currentIndex: -1, total: 0 });
    },
  };
});
