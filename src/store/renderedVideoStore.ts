import { create } from 'zustand';

interface RenderedVideoState {
  blob: Blob | null;
  filename: string | null;
  createdAt: number | null;
  setRendered: (blob: Blob, filename: string) => void;
  clear: () => void;
}

// Armazenamento temporário em memória do último vídeo renderizado.
// Permite "Agendar direto no Buffer" sem precisar reupload do arquivo.
export const useRenderedVideoStore = create<RenderedVideoState>((set) => ({
  blob: null,
  filename: null,
  createdAt: null,
  setRendered: (blob, filename) =>
    set({ blob, filename, createdAt: Date.now() }),
  clear: () => set({ blob: null, filename: null, createdAt: null }),
}));
