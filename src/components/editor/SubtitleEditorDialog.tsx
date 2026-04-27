import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useEditorStore } from '@/store/editorStore';
import { Pencil, Save, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const SubtitleEditorDialog = ({ open, onOpenChange }: Props) => {
  const { clips, updateClip, removeClip } = useEditorStore();
  const subtitleClips = clips
    .filter((c) => c.type === 'subtitle')
    .sort((a, b) => a.start - b.start);

  // Estado local com edições — persistido em localStorage como rascunho
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  // Carrega rascunhos do localStorage ao abrir
  useEffect(() => {
    if (open) {
      try {
        const saved = localStorage.getItem('subtitle-editor-drafts');
        const initial: Record<string, string> = {};
        const savedDrafts = saved ? JSON.parse(saved) : {};
        subtitleClips.forEach((c) => {
          initial[c.id] = savedDrafts[c.id] ?? c.text ?? '';
        });
        setDrafts(initial);
      } catch {
        const initial: Record<string, string> = {};
        subtitleClips.forEach((c) => {
          initial[c.id] = c.text ?? '';
        });
        setDrafts(initial);
      }
    }
  }, [open]);

  const updateDraft = (id: string, value: string) => {
    const next = { ...drafts, [id]: value };
    setDrafts(next);
    try {
      localStorage.setItem('subtitle-editor-drafts', JSON.stringify(next));
    } catch {
      // ignore quota errors
    }
  };

  const applyAll = () => {
    let count = 0;
    Object.entries(drafts).forEach(([id, text]) => {
      const clip = subtitleClips.find((c) => c.id === id);
      if (clip && clip.text !== text) {
        updateClip(id, { text });
        count++;
      }
    });
    toast.success(
      count > 0 ? `${count} legenda(s) atualizada(s)` : 'Nenhuma alteração'
    );
    onOpenChange(false);
  };

  const handleRemove = (id: string) => {
    removeClip(id);
    const next = { ...drafts };
    delete next[id];
    setDrafts(next);
    try {
      localStorage.setItem('subtitle-editor-drafts', JSON.stringify(next));
    } catch {}
  };

  const formatTime = (ms: number) => {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    return `${m}:${String(s % 60).padStart(2, '0')}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="w-4 h-4" />
            Editor de Legendas
          </DialogTitle>
          <DialogDescription>
            Edite o texto de cada legenda. Os rascunhos ficam salvos
            temporariamente no navegador.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-3 -mr-3">
          {subtitleClips.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              Nenhuma legenda na timeline. Gere legendas a partir de um roteiro.
            </p>
          ) : (
            <div className="space-y-3">
              {subtitleClips.map((clip, idx) => (
                <div
                  key={clip.id}
                  className="border border-border rounded-md p-3 bg-muted/30"
                >
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-xs font-semibold">
                      #{idx + 1} · {formatTime(clip.start)} →{' '}
                      {formatTime(clip.start + clip.duration)}
                    </Label>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => handleRemove(clip.id)}
                      title="Remover legenda"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                  <Textarea
                    value={drafts[clip.id] ?? ''}
                    onChange={(e) => updateDraft(clip.id, e.target.value)}
                    className="min-h-16 text-sm"
                  />
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={applyAll} disabled={subtitleClips.length === 0}>
            <Save className="w-4 h-4 mr-2" />
            Aplicar alterações
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
