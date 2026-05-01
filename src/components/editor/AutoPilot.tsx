import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAutomationStore } from '@/store/automationStore';
import { usePropertyStore } from '@/store/propertyStore';
import { useEditorStore } from '@/store/editorStore';
import { useRenderedVideoStore } from '@/store/renderedVideoStore';

const LOCAL_SOUNDTRACK = {
  id: 'local-1',
  name: 'Tech House Vibes',
  url: '/soundtracks/mixkit-tech-house-vibes-130.mp3',
  duration: 130000,
};

// Converte números/abreviações p/ fala (espelha ScriptPanel)
const numberToWordsPtBr = (n: number): string => {
  if (n === 0) return 'zero';
  if (n < 0) return 'menos ' + numberToWordsPtBr(-n);
  const u = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove'];
  const e = ['dez', 'onze', 'doze', 'treze', 'catorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
  const d = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
  const c = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];
  const a999 = (num: number): string => {
    if (num === 100) return 'cem';
    const cc = Math.floor(num / 100);
    const r = num % 100;
    const p: string[] = [];
    if (cc > 0) p.push(c[cc]);
    if (r > 0) {
      if (r < 10) p.push(u[r]);
      else if (r < 20) p.push(e[r - 10]);
      else {
        const dd = Math.floor(r / 10);
        const uu = r % 10;
        p.push(uu === 0 ? d[dd] : `${d[dd]} e ${u[uu]}`);
      }
    }
    return p.join(' e ');
  };
  const partes: string[] = [];
  const mi = Math.floor(n / 1_000_000);
  const mil = Math.floor((n % 1_000_000) / 1000);
  const r = n % 1000;
  if (mi > 0) partes.push(mi === 1 ? 'um milhão' : `${a999(mi)} milhões`);
  if (mil > 0) partes.push(mil === 1 ? 'mil' : `${a999(mil)} mil`);
  if (r > 0) partes.push(a999(r));
  return partes.join(' e ');
};

const normalizeForSpeech = (text: string): string => {
  let t = text;
  t = t.replace(/R\$\s*([\d\.,]+)/gi, (_m, num: string) => {
    const clean = num.replace(/\./g, '').replace(',', '.');
    const v = parseFloat(clean);
    if (isNaN(v)) return num;
    return `${numberToWordsPtBr(Math.round(v))} reais`;
  });
  t = t.replace(/m²/gi, 'metros quadrados').replace(/m2\b/gi, 'metros quadrados');
  t = t.replace(/\bAv\./gi, 'Avenida').replace(/\bR\./gi, 'Rua');
  return t.replace(/\s+/g, ' ').trim();
};

export const AutoPilot = () => {
  const { enabled, dueAtIso, triggered, consume, setStep, reset } = useAutomationStore();
  const { propertyData, generatedCopy } = usePropertyStore();
  const ranRef = useRef(false);

  useEffect(() => {
    if (!enabled || triggered || ranRef.current) return;
    if (!propertyData || !propertyData.url) return;

    // Aguardar imagens já estarem na timeline (PropertyScanner adiciona imagens depois do navigate)
    const editorState = useEditorStore.getState();
    const hasImages = editorState.clips.some((c) => c.type === 'image');
    if (!hasImages) return;

    ranRef.current = true;
    const { dueAtIso: due } = consume();

    const run = async () => {
      try {
        if (!due) throw new Error('Data/hora de agendamento ausente');
        if (new Date(due).getTime() < Date.now()) throw new Error('Data de agendamento já passou');

        toast.message('🤖 Automação iniciada', { description: 'Executando pipeline completo...' });

        // ===== 1) Adicionar trilha sonora =====
        setStep('add-music');
        toast.message('🎵 Etapa 1/6: Adicionando trilha sonora');
        await addMusicTrack();

        // ===== 2) Gerar roteiro =====
        setStep('generate-script');
        toast.message('✍️ Etapa 2/6: Gerando roteiro');
        const script = await generateScript();

        // ===== 3) Gerar legendas =====
        setStep('generate-subtitles');
        toast.message('💬 Etapa 3/6: Gerando legendas');
        generateSubtitlesFromScript(script);

        // ===== 4) Gerar locução =====
        setStep('generate-voiceover');
        toast.message('🎤 Etapa 4/6: Gerando locução LMNT');
        await generateVoiceover();

        // Pequena pausa para store/canvas consolidarem
        await new Promise((r) => setTimeout(r, 800));

        // ===== 5) Renderizar vídeo =====
        setStep('render');
        toast.message('🎬 Etapa 5/6: Renderizando vídeo (pode demorar)');
        const trigger = (window as any).__triggerVideoExport as
          | (() => Promise<{ blob: Blob; filename: string }>)
          | undefined;
        if (!trigger) throw new Error('Exportador não disponível');
        const { blob, filename } = await trigger();

        // ===== 6) Agendar nos 3 canais =====
        setStep('schedule');
        toast.message('📅 Etapa 6/6: Agendando nos canais');
        await scheduleAllChannels(blob, filename, due);

        setStep('done');
        toast.success('✅ Automação concluída! Vídeo agendado nos 3 canais.');
        setTimeout(() => reset(), 5000);
      } catch (err: any) {
        console.error('AutoPilot error:', err);
        setStep('error', err?.message || 'Erro desconhecido');
        toast.error(`Automação falhou: ${err?.message || 'erro'}`);
      }
    };

    run();
  }, [enabled, triggered, propertyData, consume, setStep, reset]);

  return null;
};

// ===== Helpers =====

async function addMusicTrack() {
  const response = await fetch(LOCAL_SOUNDTRACK.url);
  const arrayBuffer = await response.arrayBuffer();
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
  const mediaId = `free-audio-${Date.now()}`;
  const store = useEditorStore.getState();
  store.addMediaItem({
    id: mediaId,
    type: 'audio',
    name: LOCAL_SOUNDTRACK.name,
    data: audioBuffer,
    duration: LOCAL_SOUNDTRACK.duration,
  });
  if (!store.trackStates.find((t) => t.name === 'A2')) store.addTrackState('A2');
  store.addClip({
    id: `clip-${Date.now()}-music`,
    type: 'audio',
    mediaId,
    track: 'A2',
    start: 0,
    duration: LOCAL_SOUNDTRACK.duration,
    scale: 1,
    brightness: 0,
    contrast: 0,
    volume: 0.15,
    speed: 1,
    opacity: 1,
  });
  store.updateTotalDuration();
}

async function generateScript(): Promise<string> {
  const { propertyData } = usePropertyStore.getState();
  const { data, error } = await supabase.functions.invoke('mistral-generate', {
    body: { mode: 'script', property: propertyData },
  });
  if (error) throw error;
  let text = (data?.text || '').trim();
  if (!text) throw new Error('Roteiro vazio');

  // Hard cap 145 palavras
  const MAX_WORDS = 145;
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length > MAX_WORDS) {
    let truncated = words.slice(0, MAX_WORDS).join(' ');
    const lastPunct = Math.max(truncated.lastIndexOf('.'), truncated.lastIndexOf('!'), truncated.lastIndexOf('?'));
    truncated = lastPunct > truncated.length * 0.6 ? truncated.slice(0, lastPunct + 1) : truncated.replace(/[,;:\s]+$/, '') + '.';
    text = truncated;
  }
  return text;
}

function generateSubtitlesFromScript(script: string) {
  const cleanText = normalizeForSpeech(
    script.replace(/\*\*/g, '').replace(/INÍCIO:|MEIO:|FIM:/gi, '').replace(/\n+/g, ' ').trim()
  );
  const allWords = cleanText.split(/\s+/).filter(Boolean);
  if (allWords.length === 0) return;

  const CHUNK_SIZE = 4;
  const chunks: string[] = [];
  for (let i = 0; i < allWords.length; i += CHUNK_SIZE) {
    chunks.push(allWords.slice(i, i + CHUNK_SIZE).join(' '));
  }

  const WPM = 165;
  const naturalTotalMs = (allWords.length / WPM) * 60 * 1000;
  const store = useEditorStore.getState();
  const targetTotalMs = store.globalSettings.timeLimitEnabled
    ? Math.min(store.globalSettings.timeLimit - 1000, Math.max(naturalTotalMs, 15000))
    : naturalTotalMs;

  store.clips.filter((c) => c.type === 'subtitle').forEach((c) => store.removeClip(c.id));

  let currentStart = 0;
  chunks.forEach((chunk, index) => {
    const wordsInChunk = chunk.split(/\s+/).length;
    const proportion = wordsInChunk / allWords.length;
    const duration = Math.max(600, Math.round(targetTotalMs * proportion));
    store.addClip({
      id: `subtitle-${Date.now()}-${index}`,
      type: 'subtitle',
      mediaId: `subtitle-${Date.now()}-${index}`,
      track: 'SUB1',
      start: currentStart,
      duration,
      scale: 1,
      brightness: 0,
      contrast: 0,
      volume: 1,
      speed: 1,
      opacity: 1,
      text: chunk,
    });
    currentStart += duration;
  });
  store.updateTotalDuration();
}

async function generateVoiceover() {
  const store = useEditorStore.getState();
  const subtitleClips = store.clips.filter((c) => c.type === 'subtitle').sort((a, b) => a.start - b.start);
  const sourceText = subtitleClips.map((c) => (c.text || '').trim()).filter(Boolean).join(' ');
  if (!sourceText) throw new Error('Sem texto para locução');

  const { data, error } = await supabase.functions.invoke('lmnt-tts', {
    body: { text: sourceText, voice: 'lily', language: 'pt', model: 'blizzard', format: 'mp3', speed: 1.0 },
  });
  if (error) throw error;
  if (!data?.audioBase64) throw new Error('Locução vazia');

  const binary = atob(data.audioBase64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const blob = new Blob([bytes], { type: data.mimeType || 'audio/mpeg' });
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  const audioBuffer = await audioContext.decodeAudioData(bytes.buffer.slice(0));
  const durationMs = Math.max(1000, Math.round(audioBuffer.duration * 1000));

  if (!store.trackStates.find((t) => t.name === 'A1')) store.addTrackState('A1');
  store.clips.filter((c) => c.track === 'A1' && c.mediaId.startsWith('lmnt-')).forEach((c) => store.removeClip(c.id));
  store.mediaItems.filter((m) => m.id.startsWith('lmnt-')).forEach((m) => store.removeMediaItem(m.id));

  const mediaId = `lmnt-${Date.now()}`;
  store.addMediaItem({ id: mediaId, type: 'audio', name: 'Locução LMNT', data: audioBuffer, duration: durationMs, audioBlob: blob });
  store.addClip({
    id: `clip-${mediaId}`,
    type: 'audio',
    mediaId,
    track: 'A1',
    start: 0,
    duration: durationMs,
    scale: 1,
    brightness: 0,
    contrast: 0,
    volume: 1,
    speed: 1,
    opacity: 1,
  });
  store.updateTotalDuration();
}

async function blobToBase64(blob: Blob): Promise<string> {
  const buf = await blob.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

async function scheduleAllChannels(blob: Blob, filename: string, dueAtIso: string) {
  const { generatedCopy } = usePropertyStore.getState();
  const text = generatedCopy?.trim() || '';
  if (!text) throw new Error('Copy vazio - escaneie novamente');

  // Buscar canais
  const { data: chData, error: chErr } = await supabase.functions.invoke('buffer-channels');
  if (chErr) throw chErr;
  const channels = (chData?.channels ?? []).filter((c: any) =>
    ['instagram', 'facebook', 'tiktok'].includes(c.service?.toLowerCase())
  );
  if (channels.length === 0) throw new Error('Nenhum canal Instagram/Facebook/TikTok no Buffer');

  const videoBase64 = await blobToBase64(blob);
  const orderedServices = ['instagram', 'facebook', 'tiktok'];
  const sorted = [...channels].sort(
    (a: any, b: any) =>
      orderedServices.indexOf(a.service?.toLowerCase()) - orderedServices.indexOf(b.service?.toLowerCase())
  );

  let okCount = 0;
  const failures: string[] = [];
  for (let i = 0; i < sorted.length; i++) {
    const ch = sorted[i];
    const svc = ch.service?.toLowerCase() ?? '';
    const label = ch.name || ch.serviceUsername || svc;
    toast.message(`📤 ${i + 1}/${sorted.length}: ${svc.toUpperCase()} (${label})`);
    try {
      const opts: any = { channelId: ch.id, service: svc };
      if (svc === 'instagram') opts.instagramType = 'reel';
      if (svc === 'facebook') opts.facebookType = 'reel';
      if (svc === 'tiktok') opts.tiktokPrivacy = 'PUBLIC_TO_EVERYONE';

      const { data, error } = await supabase.functions.invoke('buffer-schedule-post', {
        body: {
          channelIds: [ch.id],
          channelOptions: [opts],
          text,
          videoBase64,
          filename,
          dueAt: dueAtIso,
        },
      });
      if (error) throw error;
      const r = (data?.results ?? [])[0];
      if (r?.ok) {
        okCount++;
        toast.success(`✓ ${svc.toUpperCase()} agendado`);
      } else {
        const msg = r?.result?.message ?? 'erro';
        failures.push(`${svc}: ${msg}`);
        toast.error(`✗ ${svc.toUpperCase()}: ${msg}`);
      }
    } catch (err: any) {
      failures.push(`${svc}: ${err?.message ?? 'erro'}`);
      toast.error(`✗ ${svc.toUpperCase()}: ${err?.message ?? 'erro'}`);
    }
  }

  if (okCount === 0) throw new Error(`Nenhum canal agendado. ${failures.join(' | ')}`);
}
