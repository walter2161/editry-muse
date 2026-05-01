import { create } from 'zustand';

export type AutomationStep =
  | 'idle'
  | 'waiting-scan'
  | 'add-music'
  | 'generate-script'
  | 'generate-subtitles'
  | 'generate-voiceover'
  | 'render'
  | 'schedule'
  | 'done'
  | 'error';

interface AutomationState {
  enabled: boolean; // automação solicitada
  dueAtIso?: string; // quando agendar nos canais
  triggered: boolean; // já consumido pelo AutoPilot?
  step: AutomationStep;
  error?: string;
  setRequest: (dueAtIso: string) => void;
  consume: () => { dueAtIso?: string };
  setStep: (step: AutomationStep, error?: string) => void;
  reset: () => void;
}

const STORAGE_KEY = 'automation-pending';

const load = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as { dueAtIso: string };
  } catch {
    return null;
  }
};

export const useAutomationStore = create<AutomationState>((set, get) => {
  const persisted = load();
  return {
    enabled: !!persisted,
    dueAtIso: persisted?.dueAtIso,
    triggered: false,
    step: 'idle',
    setRequest: (dueAtIso) => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ dueAtIso }));
      } catch {}
      set({ enabled: true, dueAtIso, triggered: false, step: 'waiting-scan', error: undefined });
    },
    consume: () => {
      const { dueAtIso } = get();
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {}
      set({ triggered: true });
      return { dueAtIso };
    },
    setStep: (step, error) => set({ step, error }),
    reset: () => {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {}
      set({ enabled: false, dueAtIso: undefined, triggered: false, step: 'idle', error: undefined });
    },
  };
});
