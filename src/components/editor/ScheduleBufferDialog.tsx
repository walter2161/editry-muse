import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { AlertCircle, CalendarClock, Facebook, Instagram, Loader2, RefreshCw, Send } from "lucide-react";
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { usePropertyStore } from "@/store/propertyStore";
import { useRenderedVideoStore } from "@/store/renderedVideoStore";
import { toast } from "sonner";

type Channel = {
  id: string;
  name: string;
  service: string;
  serviceUsername?: string;
  avatar?: string;
  organizationName?: string;
};

type InstagramType = "post" | "reel" | "story";
type FacebookType = "post" | "reel" | "story";
type TikTokPrivacy = "PUBLIC_TO_EVERYONE" | "MUTUAL_FOLLOW_FRIENDS" | "SELF_ONLY";

interface ChannelOpts {
  instagramType?: InstagramType;
  facebookType?: FacebookType;
  facebookTitle?: string;
  tiktokPrivacy?: TikTokPrivacy;
  tiktokDisableComments?: boolean;
  tiktokDisableDuet?: boolean;
  tiktokDisableStitch?: boolean;
}

interface DiagnosticsState {
  statusCode: number;
  filename: string;
  blobType: string;
  sizeBytes: number;
  base64Length: number;
  base64Start: string;
  base64End: string;
  message: string;
}

const SUPPORTED_SERVICES = ["instagram", "facebook", "tiktok"];

const serviceIcon = (service: string) => {
  const s = service?.toLowerCase();
  if (s === "instagram") return <Instagram className="w-4 h-4" />;
  if (s === "facebook") return <Facebook className="w-4 h-4" />;
  if (s === "tiktok") {
    return (
      <span className="rounded bg-foreground px-1 text-[10px] font-bold tracking-tight text-background">
        TT
      </span>
    );
  }
  return null;
};

interface ScheduleBufferDialogProps {
  controlledOpen?: boolean;
  onControlledOpenChange?: (open: boolean) => void;
  hideTrigger?: boolean;
}

export const ScheduleBufferDialog = ({
  controlledOpen,
  onControlledOpenChange,
  hideTrigger,
}: ScheduleBufferDialogProps = {}) => {
  const { generatedCopy } = usePropertyStore();
  const renderedBlob = useRenderedVideoStore((s) => s.blob);
  const renderedFilename = useRenderedVideoStore((s) => s.filename);
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = (v: boolean) => {
    onControlledOpenChange ? onControlledOpenChange(v) : setInternalOpen(v);
  };

  const [loadingChannels, setLoadingChannels] = useState(false);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [text, setText] = useState("");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [time, setTime] = useState("10:00");
  const [submitting, setSubmitting] = useState(false);
  const [opts, setOpts] = useState<Record<string, ChannelOpts>>({});
  const [diagnostics, setDiagnostics] = useState<DiagnosticsState | null>(null);

  const effectiveVideo: { name: string; size: number; blob: Blob } | null = videoFile
    ? { name: videoFile.name, size: videoFile.size, blob: videoFile }
    : renderedBlob && renderedFilename
      ? { name: renderedFilename, size: renderedBlob.size, blob: renderedBlob }
      : null;

  useEffect(() => {
    if (open && generatedCopy && !text) setText(generatedCopy);
  }, [open, generatedCopy, text]);

  useEffect(() => {
    if (open && channels.length === 0) loadChannels();
  }, [open]);

  const updateOpt = <K extends keyof ChannelOpts>(channelId: string, key: K, value: ChannelOpts[K]) => {
    setOpts((prev) => ({
      ...prev,
      [channelId]: { ...prev[channelId], [key]: value },
    }));
  };

  const loadChannels = async () => {
    setLoadingChannels(true);
    try {
      const { data, error } = await supabase.functions.invoke("buffer-channels");
      if (error) throw error;

      const list: Channel[] = (data?.channels ?? []).filter((c: Channel) =>
        SUPPORTED_SERVICES.includes(c.service?.toLowerCase()),
      );

      setChannels(list);

      try {
        const saved = JSON.parse(localStorage.getItem("buffer_default_channels") || "[]") as string[];
        if (saved.length) {
          const valid = saved.filter((id) => list.some((c) => c.id === id));
          if (valid.length) setSelected(new Set(valid));
        }
      } catch {
        // noop
      }

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

  const blobToBase64 = async (blob: Blob): Promise<string> => {
    const buf = await blob.arrayBuffer();
    const bytes = new Uint8Array(buf);
    let binary = "";
    const chunkSize = 0x8000;

    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
    }

    return btoa(binary);
  };

  const buildDiagnostics = (
    video: { name: string; size: number; blob: Blob },
    videoBase64: string,
    statusCode: number,
    message: string,
  ): DiagnosticsState => ({
    statusCode,
    filename: video.name,
    blobType: video.blob.type || "(sem type)",
    sizeBytes: video.size,
    base64Length: videoBase64.length,
    base64Start: videoBase64.slice(0, 48),
    base64End: videoBase64.slice(-48),
    message,
  });

  const handleSubmit = async () => {
    if (!effectiveVideo) return toast.error("Renderize ou selecione um vídeo MP4");
    if (selected.size === 0) return toast.error("Selecione ao menos um canal");
    if (!text.trim()) return toast.error("O texto do post não pode estar vazio");
    if (!dueAtIso) return toast.error("Escolha data e horário do agendamento");
    if (new Date(dueAtIso).getTime() < Date.now()) {
      return toast.error("A data de agendamento precisa estar no futuro");
    }
    if (effectiveVideo.size > 50 * 1024 * 1024) {
      return toast.error("Vídeo acima de 50MB. Reduza ou comprima antes de enviar.");
    }

    setSubmitting(true);
    setDiagnostics(null);

    try {
      toast.message("Enviando vídeo...", { description: "Isso pode levar alguns segundos." });

      const videoBase64 = await blobToBase64(effectiveVideo.blob);
      const channelIds = Array.from(selected);
      const channelOptions = channelIds.map((id) => {
        const ch = channels.find((c) => c.id === id);
        const o = opts[id] ?? {};
        return { channelId: id, service: ch?.service ?? "", ...o };
      });

      const { data, error } = await supabase.functions.invoke("buffer-schedule-post", {
        body: {
          channelIds,
          channelOptions,
          text,
          videoBase64,
          filename: effectiveVideo.name,
          dueAt: dueAtIso,
        },
      });

      if (error) {
        const statusCode = Number(error.context?.status ?? error.status ?? 500);
        if (statusCode === 500) {
          setDiagnostics(
            buildDiagnostics(
              effectiveVideo,
              videoBase64,
              statusCode,
              error.message ?? "Falha ao agendar no Buffer",
            ),
          );
        }
        throw error;
      }

      const results = (data?.results ?? []) as Array<{
        channelId: string;
        ok: boolean;
        result: { message?: string } | unknown;
      }>;

      const okCount = results.filter((r) => r.ok).length;
      const failCount = results.length - okCount;

      if (okCount > 0) toast.success(`${okCount} post(s) agendado(s) no Buffer!`);
      if (failCount > 0) {
        const firstErr = (results.find((r) => !r.ok)?.result as { message?: string } | undefined)?.message ?? "Erro desconhecido";
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
      {!hideTrigger && (
        <DialogTrigger asChild>
          <Button variant="default" size="sm" title="Agendar no Buffer">
            <CalendarClock className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Agendar</span>
          </Button>
        </DialogTrigger>
      )}

      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Agendar no Instagram, TikTok e Facebook</DialogTitle>
          <DialogDescription>
            Envie o vídeo renderizado para suas contas conectadas no Buffer e escolha quando publicar.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {diagnostics && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Diagnóstico do envio</AlertTitle>
              <AlertDescription>
                <div className="mt-2 space-y-1 text-xs">
                  <p>{diagnostics.message}</p>
                  <div className="grid gap-1 font-mono">
                    <div><span className="font-medium">status:</span> {diagnostics.statusCode}</div>
                    <div><span className="font-medium">arquivo:</span> {diagnostics.filename}</div>
                    <div><span className="font-medium">blob.type:</span> {diagnostics.blobType}</div>
                    <div><span className="font-medium">tamanho bytes:</span> {diagnostics.sizeBytes}</div>
                    <div><span className="font-medium">base64 length:</span> {diagnostics.base64Length}</div>
                    <div className="break-all"><span className="font-medium">base64 início:</span> {diagnostics.base64Start}</div>
                    <div className="break-all"><span className="font-medium">base64 fim:</span> {diagnostics.base64End}</div>
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="buffer-video">Vídeo (MP4)</Label>
            {renderedBlob && !videoFile && (
              <div className="rounded-md border border-primary/30 bg-primary/5 p-2 text-xs">
                <span className="font-medium text-foreground">✓ Usando vídeo renderizado:</span>{" "}
                <span className="text-muted-foreground">
                  {renderedFilename} · {(renderedBlob.size / (1024 * 1024)).toFixed(1)} MB
                </span>
              </div>
            )}
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
              {renderedBlob
                ? "O vídeo recém-renderizado será enviado automaticamente. Selecione um arquivo apenas se quiser sobrescrever."
                : 'Dica: exporte o vídeo primeiro com o botão "Exportar" — ele será enviado automaticamente.'}
            </p>
          </div>

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
                <RefreshCw className={cn("mr-1 h-3 w-3", loadingChannels && "animate-spin")} />
                Atualizar
              </Button>
            </div>

            <div className="max-h-48 overflow-y-scroll rounded-md border border-border bg-card pr-1">
              <div className="space-y-1 p-2">
                {loadingChannels && (
                  <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando canais...
                  </div>
                )}

                {!loadingChannels && channels.length === 0 && (
                  <p className="py-6 text-center text-sm text-muted-foreground">Nenhum canal disponível.</p>
                )}

                {channels.map((c) => {
                  const svc = c.service?.toLowerCase();
                  const isSelected = selected.has(c.id);
                  const o = opts[c.id] ?? {};

                  return (
                    <div key={c.id} className="rounded border border-border/50">
                      <label className="flex cursor-pointer items-center gap-3 rounded p-2 hover:bg-accent">
                        <Checkbox checked={isSelected} onCheckedChange={() => toggle(c.id)} />
                        {serviceIcon(c.service)}
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium">{c.name || c.serviceUsername || c.id}</div>
                          <div className="truncate text-xs text-muted-foreground">
                            {c.service}
                            {c.organizationName ? ` · ${c.organizationName}` : ""}
                          </div>
                        </div>
                      </label>

                      {isSelected && (
                        <div className="space-y-2 border-t border-border/40 bg-muted/20 px-3 pb-3 pt-1">
                          {svc === "instagram" && (
                            <div className="space-y-1">
                              <Label className="text-xs">Tipo de post (Instagram)</Label>
                              <Select
                                value={o.instagramType ?? "reel"}
                                onValueChange={(v) => updateOpt(c.id, "instagramType", v as InstagramType)}
                              >
                                <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="reel">Reel</SelectItem>
                                  <SelectItem value="post">Post (feed)</SelectItem>
                                  <SelectItem value="story">Story</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          )}

                          {svc === "facebook" && (
                            <>
                              <div className="space-y-1">
                                <Label className="text-xs">Tipo (Facebook)</Label>
                                <Select
                                  value={o.facebookType ?? "post"}
                                  onValueChange={(v) => updateOpt(c.id, "facebookType", v as FacebookType)}
                                >
                                  <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="post">Post</SelectItem>
                                    <SelectItem value="reel">Reel</SelectItem>
                                    <SelectItem value="story">Story</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs">Título (opcional)</Label>
                                <Input
                                  className="h-8"
                                  value={o.facebookTitle ?? ""}
                                  onChange={(e) => updateOpt(c.id, "facebookTitle", e.target.value)}
                                  placeholder="Título do vídeo no Facebook"
                                />
                              </div>
                            </>
                          )}

                          {svc === "tiktok" && (
                            <>
                              <div className="space-y-1">
                                <Label className="text-xs">Privacidade (TikTok)</Label>
                                <Select
                                  value={o.tiktokPrivacy ?? "PUBLIC_TO_EVERYONE"}
                                  onValueChange={(v) => updateOpt(c.id, "tiktokPrivacy", v as TikTokPrivacy)}
                                >
                                  <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="PUBLIC_TO_EVERYONE">Público</SelectItem>
                                    <SelectItem value="MUTUAL_FOLLOW_FRIENDS">Amigos</SelectItem>
                                    <SelectItem value="SELF_ONLY">Apenas eu</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="flex flex-wrap gap-3 text-xs">
                                <label className="flex items-center gap-1.5">
                                  <Checkbox
                                    checked={!!o.tiktokDisableComments}
                                    onCheckedChange={(v) => updateOpt(c.id, "tiktokDisableComments", !!v)}
                                  />
                                  Desativar comentários
                                </label>
                                <label className="flex items-center gap-1.5">
                                  <Checkbox
                                    checked={!!o.tiktokDisableDuet}
                                    onCheckedChange={(v) => updateOpt(c.id, "tiktokDisableDuet", !!v)}
                                  />
                                  Desativar Duet
                                </label>
                                <label className="flex items-center gap-1.5">
                                  <Checkbox
                                    checked={!!o.tiktokDisableStitch}
                                    onCheckedChange={(v) => updateOpt(c.id, "tiktokDisableStitch", !!v)}
                                  />
                                  Desativar Stitch
                                </label>
                              </div>
                              <p className="text-[11px] text-muted-foreground">⚠️ TikTok exige vídeo com no mínimo 3 segundos.</p>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Data</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}
                  >
                    <CalendarClock className="mr-2 h-4 w-4" />
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
                    className={cn("pointer-events-auto p-3")}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="buffer-time">Horário</Label>
              <Input id="buffer-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
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
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enviando...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" /> Agendar no Buffer
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
