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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useEditorStore } from '@/store/editorStore';
import { Pencil, Save, Trash2, Wand2 } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const FONT_OPTIONS = [
  'Montserrat, system-ui, sans-serif',
  'Inter, system-ui, sans-serif',
  'Arial, sans-serif',
  'Impact, sans-serif',
  'Georgia, serif',
  'Bebas Neue, Impact, sans-serif',
  'Poppins, system-ui, sans-serif',
];

const DEFAULT_STYLE = {
  fontFamily: 'Montserrat, system-ui, sans-serif',
  fontSize: 72,
  fontWeight: 700,
  color: '#ffffff',
  bgColor: '',
  strokeColor: '#000000',
  strokeWidth: 0,
  italic: false,
  uppercase: false,
  bottomOffset: 220,
  shadow: true,
};

const DRAFT_KEY = 'subtitle-editor-drafts-v2';

export const SubtitleEditorDialog = ({ open, onOpenChange }: Props) => {
  const { clips, updateClip, removeClip } = useEditorStore();
  const subtitleClips = clips
    .filter((c) => c.type === 'subtitle')
    .sort((a, b) => a.start - b.start);

  // drafts: id -> { text, duration, style }
  const [drafts, setDrafts] = useState<
    Record<string, { text: string; duration: number; style: any }>
  >({});
  // Estilo global aplicado a todas
  const [globalStyle, setGlobalStyle] = useState<any>(DEFAULT_STYLE);
  const [activeTab, setActiveTab] = useState('list');

  useEffect(() => {
    if (!open) return;
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      const savedDrafts = saved ? JSON.parse(saved) : {};
      const initial: Record<string, any> = {};
      subtitleClips.forEach((c) => {
        const sd = savedDrafts[c.id];
        initial[c.id] = {
          text: sd?.text ?? c.text ?? '',
          duration: sd?.duration ?? c.duration,
          style: { ...DEFAULT_STYLE, ...(c.subtitleStyle || {}), ...(sd?.style || {}) },
        };
      });
      setDrafts(initial);
      // Inferir estilo global do primeiro clip
      const first = subtitleClips[0];
      if (first?.subtitleStyle) {
        setGlobalStyle({ ...DEFAULT_STYLE, ...first.subtitleStyle });
      }
    } catch {
      const initial: Record<string, any> = {};
      subtitleClips.forEach((c) => {
        initial[c.id] = {
          text: c.text ?? '',
          duration: c.duration,
          style: { ...DEFAULT_STYLE, ...(c.subtitleStyle || {}) },
        };
      });
      setDrafts(initial);
    }
  }, [open]);

  const persistDrafts = (next: typeof drafts) => {
    setDrafts(next);
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(next));
    } catch {}
  };

  const updateDraftField = (id: string, field: 'text' | 'duration', value: any) => {
    const next = { ...drafts, [id]: { ...drafts[id], [field]: value } };
    persistDrafts(next);
  };

  const updateDraftStyle = (id: string, partial: any) => {
    const next = {
      ...drafts,
      [id]: { ...drafts[id], style: { ...drafts[id].style, ...partial } },
    };
    persistDrafts(next);
  };

  const applyGlobalToAll = () => {
    const next: typeof drafts = {};
    Object.entries(drafts).forEach(([id, d]) => {
      next[id] = { ...d, style: { ...globalStyle } };
    });
    persistDrafts(next);
    toast.success('Estilo aplicado a todas as legendas');
  };

  const applyAll = () => {
    let count = 0;
    Object.entries(drafts).forEach(([id, d]) => {
      const clip = subtitleClips.find((c) => c.id === id);
      if (!clip) return;
      const changes: any = {};
      if (clip.text !== d.text) changes.text = d.text;
      if (clip.duration !== d.duration) changes.duration = d.duration;
      changes.subtitleStyle = d.style;
      updateClip(id, changes);
      count++;
    });
    toast.success(count > 0 ? `${count} legenda(s) atualizada(s)` : 'Sem alterações');
    onOpenChange(false);
  };

  const handleRemove = (id: string) => {
    removeClip(id);
    const next = { ...drafts };
    delete next[id];
    persistDrafts(next);
  };

  const formatTime = (ms: number) => {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    return `${m}:${String(s % 60).padStart(2, '0')}`;
  };

  const StylePanel = ({
    value,
    onChange,
    compact = false,
  }: {
    value: any;
    onChange: (p: any) => void;
    compact?: boolean;
  }) => (
    <div className={`grid ${compact ? 'grid-cols-2' : 'grid-cols-2'} gap-3`}>
      <div className="col-span-2">
        <Label className="text-xs">Fonte</Label>
        <Select
          value={value.fontFamily}
          onValueChange={(v) => onChange({ fontFamily: v })}
        >
          <SelectTrigger className="h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FONT_OPTIONS.map((f) => (
              <SelectItem key={f} value={f} style={{ fontFamily: f }}>
                {f.split(',')[0]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="text-xs">Tamanho ({value.fontSize}px)</Label>
        <Slider
          value={[value.fontSize]}
          min={24}
          max={180}
          step={2}
          onValueChange={([v]) => onChange({ fontSize: v })}
        />
      </div>
      <div>
        <Label className="text-xs">Peso ({value.fontWeight})</Label>
        <Slider
          value={[value.fontWeight]}
          min={300}
          max={900}
          step={100}
          onValueChange={([v]) => onChange({ fontWeight: v })}
        />
      </div>

      <div>
        <Label className="text-xs">Cor do texto</Label>
        <Input
          type="color"
          value={value.color}
          onChange={(e) => onChange({ color: e.target.value })}
          className="h-8 p-1"
        />
      </div>
      <div>
        <Label className="text-xs">Fundo</Label>
        <div className="flex gap-1">
          <Input
            type="color"
            value={value.bgColor || '#000000'}
            onChange={(e) => onChange({ bgColor: e.target.value })}
            className="h-8 p-1 flex-1"
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 px-2"
            onClick={() => onChange({ bgColor: '' })}
          >
            ×
          </Button>
        </div>
      </div>

      <div>
        <Label className="text-xs">Contorno</Label>
        <Input
          type="color"
          value={value.strokeColor}
          onChange={(e) => onChange({ strokeColor: e.target.value })}
          className="h-8 p-1"
        />
      </div>
      <div>
        <Label className="text-xs">Espessura ({value.strokeWidth}px)</Label>
        <Slider
          value={[value.strokeWidth]}
          min={0}
          max={8}
          step={1}
          onValueChange={([v]) => onChange({ strokeWidth: v })}
        />
      </div>

      <div>
        <Label className="text-xs">Posição (bottom: {value.bottomOffset}px)</Label>
        <Slider
          value={[value.bottomOffset]}
          min={0}
          max={1200}
          step={10}
          onValueChange={([v]) => onChange({ bottomOffset: v })}
        />
      </div>
      <div className="flex flex-col gap-2 justify-end">
        <div className="flex items-center justify-between">
          <Label className="text-xs">MAIÚSCULAS</Label>
          <Switch
            checked={value.uppercase}
            onCheckedChange={(v) => onChange({ uppercase: v })}
          />
        </div>
        <div className="flex items-center justify-between">
          <Label className="text-xs">Itálico</Label>
          <Switch
            checked={value.italic}
            onCheckedChange={(v) => onChange({ italic: v })}
          />
        </div>
        <div className="flex items-center justify-between">
          <Label className="text-xs">Sombra</Label>
          <Switch
            checked={value.shadow}
            onCheckedChange={(v) => onChange({ shadow: v })}
          />
        </div>
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[88vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="w-4 h-4" />
            Editor de Legendas
          </DialogTitle>
          <DialogDescription>
            Edite texto, tempo e estilo. Rascunhos ficam salvos no navegador.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="list">Legendas ({subtitleClips.length})</TabsTrigger>
            <TabsTrigger value="global">Estilo global</TabsTrigger>
          </TabsList>

          <TabsContent value="list" className="flex-1 overflow-hidden mt-3">
            <ScrollArea className="h-[55vh] pr-3">
              {subtitleClips.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">
                  Nenhuma legenda na timeline. Gere a partir de um roteiro.
                </p>
              ) : (
                <div className="space-y-3">
                  {subtitleClips.map((clip, idx) => {
                    const d = drafts[clip.id];
                    if (!d) return null;
                    return (
                      <div
                        key={clip.id}
                        className="border border-border rounded-md p-3 bg-muted/30 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-semibold">
                            #{idx + 1} · início {formatTime(clip.start)}
                          </Label>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={() => handleRemove(clip.id)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                        <Textarea
                          value={d.text}
                          onChange={(e) => updateDraftField(clip.id, 'text', e.target.value)}
                          className="min-h-14 text-sm"
                        />
                        <div className="flex items-center gap-3">
                          <Label className="text-xs whitespace-nowrap">
                            Duração: {(d.duration / 1000).toFixed(1)}s
                          </Label>
                          <Slider
                            value={[d.duration]}
                            min={500}
                            max={15000}
                            step={100}
                            onValueChange={([v]) => updateDraftField(clip.id, 'duration', v)}
                            className="flex-1"
                          />
                        </div>
                        <details className="text-xs">
                          <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                            Estilo individual
                          </summary>
                          <div className="mt-3">
                            <StylePanel
                              value={d.style}
                              onChange={(p) => updateDraftStyle(clip.id, p)}
                              compact
                            />
                          </div>
                        </details>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="global" className="flex-1 overflow-hidden mt-3">
            <ScrollArea className="h-[55vh] pr-3">
              <div className="space-y-4">
                <p className="text-xs text-muted-foreground">
                  Defina um estilo padrão e aplique a todas as legendas de uma vez.
                </p>
                <StylePanel value={globalStyle} onChange={(p) => setGlobalStyle({ ...globalStyle, ...p })} />
                <Button onClick={applyGlobalToAll} variant="secondary" className="w-full" size="sm">
                  <Wand2 className="w-4 h-4 mr-2" />
                  Aplicar a todas
                </Button>
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>

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
