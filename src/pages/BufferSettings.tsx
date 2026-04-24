import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Home, RefreshCw, CheckCircle2, XCircle, Settings as SettingsIcon, Instagram, Facebook } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface BufferChannel {
  id: string;
  name: string;
  service: string;
  avatar?: string;
  organizationName?: string;
  timezone?: string;
}

const STORAGE_KEY = "buffer_default_channels";

const serviceIcon = (service: string) => {
  const s = service.toLowerCase();
  if (s.includes("instagram")) return <Instagram className="w-4 h-4" />;
  if (s.includes("facebook")) return <Facebook className="w-4 h-4" />;
  return <span className="text-xs font-bold uppercase">{s.slice(0, 2)}</span>;
};

const serviceColor = (service: string) => {
  const s = service.toLowerCase();
  if (s.includes("instagram")) return "bg-gradient-to-br from-purple-500 to-pink-500 text-white";
  if (s.includes("tiktok")) return "bg-foreground text-background";
  if (s.includes("facebook")) return "bg-blue-600 text-white";
  return "bg-muted text-foreground";
};

export default function BufferSettings() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"idle" | "ok" | "error">("idle");
  const [channels, setChannels] = useState<BufferChannel[]>([]);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [selected, setSelected] = useState<string[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setSelected(JSON.parse(saved));
      } catch {/* noop */}
    }
    void runTest();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const runTest = async () => {
    setLoading(true);
    setStatus("idle");
    setErrorMsg("");
    try {
      const { data, error } = await supabase.functions.invoke("buffer-channels");
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      const list: BufferChannel[] = (data as any)?.channels ?? [];
      setChannels(list);
      setStatus("ok");
      toast.success(`Conexão OK — ${list.length} canais encontrados`);
    } catch (err: any) {
      console.error(err);
      setStatus("error");
      setErrorMsg(err?.message ?? "Falha desconhecida");
      toast.error("Falha ao conectar com o Buffer");
    } finally {
      setLoading(false);
    }
  };

  const toggle = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const saveDefaults = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(selected));
    toast.success(`${selected.length} canal(is) padrão salvos`);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="h-14 border-b border-border flex items-center justify-between px-4">
        <div className="flex items-center gap-2 text-primary font-bold">
          <SettingsIcon className="w-5 h-5" />
          <span>Configurações do Buffer</span>
        </div>
        <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
          <Home className="w-4 h-4 mr-2" />
          Início
        </Button>
      </header>

      <main className="container max-w-3xl py-8 space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  Status da API
                  {status === "ok" && (
                    <Badge variant="default" className="gap-1 bg-green-600 hover:bg-green-600">
                      <CheckCircle2 className="w-3 h-3" /> Conectado
                    </Badge>
                  )}
                  {status === "error" && (
                    <Badge variant="destructive" className="gap-1">
                      <XCircle className="w-3 h-3" /> Erro
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  Testa a chave <code className="text-xs">BUFFER_API_KEY</code> e lista os canais
                  conectados na sua conta Buffer.
                </CardDescription>
              </div>
              <Button onClick={runTest} disabled={loading} size="sm">
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                Testar conexão
              </Button>
            </div>
          </CardHeader>
          {status === "error" && (
            <CardContent>
              <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                {errorMsg}
              </div>
            </CardContent>
          )}
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Canais disponíveis</CardTitle>
            <CardDescription>
              Marque os canais que devem vir pré-selecionados ao agendar uma postagem.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {loading && channels.length === 0 && (
              <>
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </>
            )}

            {!loading && channels.length === 0 && status !== "error" && (
              <p className="text-sm text-muted-foreground py-6 text-center">
                Nenhum canal conectado no Buffer.
              </p>
            )}

            {channels.map((ch) => {
              const isChecked = selected.includes(ch.id);
              return (
                <label
                  key={ch.id}
                  htmlFor={`ch-${ch.id}`}
                  className="flex items-center gap-3 rounded-lg border border-border p-3 cursor-pointer hover:bg-accent/50 transition-colors"
                >
                  <Checkbox
                    id={`ch-${ch.id}`}
                    checked={isChecked}
                    onCheckedChange={() => toggle(ch.id)}
                  />
                  {ch.avatar ? (
                    <img
                      src={ch.avatar}
                      alt={ch.name}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center ${serviceColor(ch.service)}`}
                    >
                      {serviceIcon(ch.service)}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{ch.name}</div>
                    <div className="text-xs text-muted-foreground capitalize flex items-center gap-2">
                      <span>{ch.service}</span>
                      {ch.organizationName && (
                        <>
                          <span>·</span>
                          <span className="truncate">{ch.organizationName}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div
                    className={`w-7 h-7 rounded-md flex items-center justify-center ${serviceColor(ch.service)}`}
                  >
                    {serviceIcon(ch.service)}
                  </div>
                </label>
              );
            })}
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => { setSelected([]); }}>
            Limpar seleção
          </Button>
          <Button onClick={saveDefaults} disabled={channels.length === 0}>
            Salvar canais padrão ({selected.length})
          </Button>
        </div>
      </main>
    </div>
  );
}
