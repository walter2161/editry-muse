import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { CalendarClock, Send, Loader2, RefreshCw, Instagram, Facebook } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { usePropertyStore } from "@/store/propertyStore";
import { toast } from "sonner";

type Channel = {
  id: string;
  name: string;
  service: string;
  serviceUsername?: string;
  avatar?: string;
  organizationName?: string;
};

const SUPPORTED_SERVICES = ["instagram", "facebook", "tiktok"];

const serviceIcon = (service: string) => {
  const s = service?.toLowerCase();
  if (s === "instagram") return <Instagram className="w-4 h-4" />;
  if (s === "facebook") return <Facebook className="w-4 h-4" />;
  // TikTok não tem ícone oficial no lucide; usa um marcador textual
  if (s === "tiktok")
    return (
      <span className="text-[10px] font-bold tracking-tight px-1 rounded bg-foreground text-background">
        TT
      </span>
    );
  return null;
};

export const ScheduleBufferDialog = () => {
  const { generatedCopy } = usePropertyStore();
  const [open, setOpen] = useState(false);
  const [loadingChannels, setLoadingChannels] = useState(false);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [text, setText] = useState("");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [time, setTime] = useState<string>("10:00");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open && generatedCopy && !text) setText(generatedCopy);
  }, [open, generatedCopy, text]);

  const loadChannels = async () => {
    setLoadingChannels(true);
    try {
      const { data, error } = await supabase.functions.invoke("buffer-channels");
      if (error) throw error;
      const list: Channel[] = (data?.channels ?? []).filter((c: Channel) =>
        SUPPORTED_SERVICES.includes(c.service?.toLowerCase()),
      );
      setChannels(list);
      // Pre-select default channels saved in settings page
      try {
        const saved = JSON.parse(localStorage.getItem("buffer_default_channels") || "[]") as string[];
        if (saved.length) {
          const valid = saved.filter((id) => list.some((c) => c.id === id));
          if (valid.length) setSelected(new Set(valid));
        }
      } catch {/* noop */}
      if (list.length === 0) {
        toast.info("Nenhum canal Instagram/Facebook/TikTok encontrado na sua conta Buffer.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Falha ao carregar canais do Buffer. Verifique sua API key.");
    } finally {
      setLoadingChannels(false);
    }
  };

  useEffect(() => {
    if (open && channels.length === 0) loadChannels();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const dueAtIso = useMemo(() => {
    if (!date) return undefined;
    const [hh, mm] = time.split(":").map((n) => parseInt(n, 10));
    const d = new Date(date);
    d.setHours(hh || 0, mm || 0, 0, 0);
    return d.toISOString();
  }, [date, time]);

  const fileToBase64 = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(",")[1] ?? "");
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });

  const handleSubmit = async () => {
    if (!videoFile) return toast.error("Selecione o vídeo renderizado (MP4)");
    if (selected.size === 0) return toast.error("Selecione ao menos um canal");
    if (!text.trim()) return toast.error("O texto do post não pode estar vazio");
    if (!dueAtIso) return toast.error("Escolha data e horário do agendamento");
    if (new Date(dueAtIso).getTime() < Date.now()) {
      return toast.error("A data de agendamento precisa estar no futuro");
    }
    if (videoFile.size > 50 * 1024 * 1024) {
      return toast.error("Vídeo acima de 50MB. Reduza ou comprima antes de enviar.");
    }

    setSubmitting(true);
    try {
      toast.message("Enviando vídeo...", { description: "Isso pode levar alguns segundos." });
      const videoBase64 = await fileToBase64(videoFile);
      const { data, error } = await supabase.functions.invoke("buffer-schedule-post", {
        body: {
          channelIds: Array.from(selected),
          text,
          videoBase64,
          filename: videoFile.name,
          dueAt: dueAtIso,
        },
      });
      if (error) throw error;

      const results = (data?.results ?? []) as Array<{ channelId: string; ok: boolean; result: any }>;
      const okCount = results.filter((r) => r.ok).length;
      const failCount = results.length - okCount;
      if (okCount > 0) toast.success(`${okCount} post(s) agendado(s) no Buffer!`);
      if (failCount > 0) {
        const firstErr = results.find((r) => !r.ok)?.result?.message ?? "Erro desconhecido";
        toast.error(`${failCount} falha(s): ${firstErr}`);
      }
      if (okCount > 0 && failCount === 0) {
        setOpen(false);
        setVideoFile(null);
        setSelected(new Set());
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message ?? "Falha ao agendar no Buffer");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="default" size="sm" title="Agendar no Buffer">
          <CalendarClock className="w-4 h-4 sm:mr-2" />
          <span className="hidden sm:inline">Agendar</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Agendar no Instagram, TikTok e Facebook</DialogTitle>
          <DialogDescription>
            Envie o vídeo renderizado para suas contas conectadas no Buffer e escolha quando publicar.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Vídeo */}
          <div className="space-y-2">
            <Label htmlFor="buffer-video">Vídeo renderizado (MP4)</Label>
            <Input
              id="buffer-video"
              type="file"
              accept="video/mp4,video/*"
              onChange={(e) => setVideoFile(e.target.files?.[0] ?? null)}
            />
            {videoFile && (
              <p className="text-xs text-muted-foreground">
                {videoFile.name} · {(videoFile.size / (1024 * 1024)).toFixed(1)} MB
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Dica: exporte o vídeo primeiro com o botão "Exportar" e selecione o arquivo aqui.
            </p>
          </div>

          {/* Copy */}
          <div className="space-y-2">
            <Label htmlFor="buffer-text">Texto do post</Label>
            <Textarea
              id="buffer-text"
              rows={6}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Digite a legenda do post..."
            />
            <p className="text-xs text-muted-foreground">
              {text.length} caracteres
              {generatedCopy && text !== generatedCopy && (
                <button
                  type="button"
                  onClick={() => setText(generatedCopy)}
                  className="ml-2 underline hover:text-foreground"
                >
                  usar copy gerado
                </button>
              )}
            </p>
          </div>

          {/* Canais */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Canais</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={loadChannels}
                disabled={loadingChannels}
              >
                <RefreshCw className={cn("w-3 h-3 mr-1", loadingChannels && "animate-spin")} />
                Atualizar
              </Button>
            </div>
            <div className="rounded-md border border-border bg-card">
              <ScrollArea className="max-h-48">
                <div className="p-2 space-y-1">
                  {loadingChannels && (
                    <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Carregando canais...
                    </div>
                  )}
                  {!loadingChannels && channels.length === 0 && (
                    <p className="py-6 text-center text-sm text-muted-foreground">
                      Nenhum canal disponível.
                    </p>
                  )}
                  {channels.map((c) => (
                    <label
                      key={c.id}
                      className="flex items-center gap-3 p-2 rounded hover:bg-accent cursor-pointer"
                    >
                      <Checkbox
                        checked={selected.has(c.id)}
                        onCheckedChange={() => toggle(c.id)}
                      />
                      {serviceIcon(c.service)}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">
                          {c.name || c.serviceUsername || c.id}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {c.service}
                          {c.organizationName ? ` · ${c.organizationName}` : ""}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </div>

          {/* Data e hora */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Data</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !date && "text-muted-foreground",
                    )}
                  >
                    <CalendarClock className="w-4 h-4 mr-2" />
                    {date ? format(date, "dd/MM/yyyy") : "Escolher data"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label htmlFor="buffer-time">Horário</Label>
              <Input
                id="buffer-time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Enviando...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" /> Agendar no Buffer
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
