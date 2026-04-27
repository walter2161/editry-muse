import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Sparkles, Captions, RefreshCw, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { useEditorStore } from '@/store/editorStore';
import { usePropertyStore } from '@/store/propertyStore';
import { SubtitleEditorDialog } from './SubtitleEditorDialog';

const MISTRAL_API_KEY = 'aynCSftAcQBOlxmtmpJqVzco8K4aaTDQ';

export const ScriptPanel = () => {
  const [script, setScript] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingSubtitles, setIsGeneratingSubtitles] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const { addClip, clips, updateTotalDuration, globalSettings } = useEditorStore();
  const { propertyData } = usePropertyStore();
  const subtitleCount = clips.filter((c) => c.type === 'subtitle').length;

  const generateScript = async () => {
    if (!propertyData) {
      toast.error('Escaneie um imóvel primeiro na página inicial');
      return;
    }

    setIsGenerating(true);

    try {
      const iniciosCordiais = [
        "Oi, pessoal! Hoje vou mostrar pra vocês um imóvel que está disponível",
        "Olá, gente! Passei aqui pra apresentar um imóvel que pode ser uma ótima opção pra você",
        "Oi, galera! Quero te mostrar rapidamente um imóvel que vale a pena conhecer",
        "Olá, pessoal! Separei um tempinho pra te mostrar esse imóvel que chegou pra venda",
        "Oi, tudo bem? Tenho uma ótima oportunidade e quero te apresentar esse imóvel com calma"
      ];

      const finaisChamada = [
        "Gostou do imóvel? Me chama no WhatsApp que te envio todas as informações",
        "Esse imóvel pode sair rápido, então me chama agora pra ver disponibilidade",
        "Se esse imóvel não for o ideal, me chama que te envio outras opções no mesmo perfil",
        "Quer conhecer pessoalmente? Me chama e agendo uma visita pra você",
        "Gostou do imóvel? Clica no link da bio ou chama no WhatsApp que eu te respondo na hora"
      ];

      const inicioEscolhido = iniciosCordiais[Math.floor(Math.random() * iniciosCordiais.length)];
      const fimEscolhido = finaisChamada[Math.floor(Math.random() * finaisChamada.length)];

      const prompt = `Crie um roteiro profissional para narração de vídeo sobre este imóvel para redes sociais (TikTok/Instagram Reels).

DADOS DO IMÓVEL (USE TODOS ESTES DADOS NO ROTEIRO):
- Tipo: ${propertyData.tipo}
- Transação: ${propertyData.transacao}
- Localização: ${propertyData.bairro}, ${propertyData.cidade}/${propertyData.estado}
- Quartos: ${propertyData.quartos}
- Banheiros: ${propertyData.banheiros}
- Vagas: ${propertyData.vagas}
- Área: ${propertyData.area}m²
- Valor: R$ ${propertyData.valor.toLocaleString('pt-BR')}
${propertyData.condominio ? `- Condomínio: R$ ${propertyData.condominio.toLocaleString('pt-BR')}` : ''}
- Diferenciais: ${propertyData.diferenciais.join(', ') || 'Imóvel de qualidade'}

ESTRUTURA OBRIGATÓRIA DO ROTEIRO:

1. INÍCIO (copie exatamente):
"${inicioEscolhido}"

2. MEIO (crie 5-7 frases INCLUINDO OBRIGATORIAMENTE):
- Mencione o tipo de imóvel (${propertyData.tipo})
- Fale a localização completa (${propertyData.bairro}, ${propertyData.cidade}/${propertyData.estado})
- Cite TODOS os números: ${propertyData.quartos} quartos, ${propertyData.banheiros} banheiros, ${propertyData.vagas} vagas, ${propertyData.area}m²
- Mencione o valor: R$ ${propertyData.valor.toLocaleString('pt-BR')}
${propertyData.condominio ? `- Fale do condomínio: R$ ${propertyData.condominio.toLocaleString('pt-BR')}` : ''}
- Destaque os diferenciais: ${propertyData.diferenciais.join(', ')}
- Use linguagem natural, entusiasmada e conversacional

3. FIM (copie exatamente):
"${fimEscolhido}"

REGRAS IMPORTANTES:
- Retorne APENAS o texto corrido, sem títulos, marcações, asteriscos ou formatação
- OBRIGATÓRIO incluir TODOS os dados técnicos listados acima
- Entre 100-130 palavras total
- Sem emojis ou hashtags
- Tom profissional mas entusiasmado`;

      const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${MISTRAL_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'mistral-small-latest',
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.8,
          max_tokens: 600,
        }),
      });

      if (!response.ok) {
        throw new Error('Erro na API da Mistral');
      }

      const data = await response.json();
      const generatedScript = data.choices[0].message.content;
      setScript(generatedScript);
      toast.success('Roteiro gerado com sucesso!');
    } catch (error) {
      console.error('Erro ao gerar roteiro:', error);
      
      if (!propertyData) {
        toast.error('Dados do imóvel não disponíveis');
        setIsGenerating(false);
        return;
      }

      const tipo = propertyData.tipo || 'Imóvel';
      const cidade = propertyData.cidade || '';
      const bairro = propertyData.bairro || '';
      const quartos = propertyData.quartos || 0;
      const valor = propertyData.valor ? `R$ ${propertyData.valor.toLocaleString('pt-BR')}` : '';
      
      const iniciosCordiais = [
        "Oi, pessoal! Hoje vou mostrar pra vocês um imóvel que está disponível",
        "Olá, gente! Passei aqui pra apresentar um imóvel que pode ser uma ótima opção pra você",
        "Oi, galera! Quero te mostrar rapidamente um imóvel que vale a pena conhecer",
        "Olá, pessoal! Separei um tempinho pra te mostrar esse imóvel que chegou pra venda",
        "Oi, tudo bem? Tenho uma ótima oportunidade e quero te apresentar esse imóvel com calma"
      ];

      const finaisChamada = [
        "Gostou do imóvel? Me chama no WhatsApp que te envio todas as informações",
        "Esse imóvel pode sair rápido, então me chama agora pra ver disponibilidade",
        "Se esse imóvel não for o ideal, me chama que te envio outras opções no mesmo perfil",
        "Quer conhecer pessoalmente? Me chama e agendo uma visita pra você",
        "Gostou do imóvel? Clica no link da bio ou chama no WhatsApp que eu te respondo na hora"
      ];

      const inicioEscolhido = iniciosCordiais[Math.floor(Math.random() * iniciosCordiais.length)];
      const fimEscolhido = finaisChamada[Math.floor(Math.random() * finaisChamada.length)];
      
      const fallback = `${inicioEscolhido}. Este ${tipo.toLowerCase()} incrível em ${bairro} tem ${quartos} quartos e está localizado em ${cidade}. Amplo, bem localizado e com acabamento de qualidade. ${valor ? `Por apenas ${valor}.` : ''} ${fimEscolhido}.`;
      setScript(fallback);
      toast.success('Roteiro gerado (fallback)');
    } finally {
      setIsGenerating(false);
    }
  };

  // Converte números e valores em palavras para melhorar pronúncia da TTS
  const normalizeForSpeech = (text: string): string => {
    let t = text;

    // R$ 1.234.567,89 ou R$ 1234 -> "X reais"
    t = t.replace(/R\$\s*([\d\.,]+)/gi, (_m, num: string) => {
      const clean = num.replace(/\./g, '').replace(',', '.');
      const value = parseFloat(clean);
      if (isNaN(value)) return num;
      return `${numberToWordsPtBr(Math.round(value))} reais`;
    });

    // m² -> "metros quadrados"
    t = t.replace(/m²/gi, 'metros quadrados');
    t = t.replace(/m2\b/gi, 'metros quadrados');

    // Abreviações comuns
    t = t.replace(/\bAv\./gi, 'Avenida');
    t = t.replace(/\bR\./gi, 'Rua');
    t = t.replace(/\bnº\s*/gi, 'número ');
    t = t.replace(/\bnº/gi, 'número');
    t = t.replace(/\bVl\./gi, 'Vila');
    t = t.replace(/\bJd\./gi, 'Jardim');

    // Limpeza
    t = t.replace(/\s+/g, ' ').trim();
    return t;
  };

  // Converte inteiro em pt-BR (cobre até bilhões)
  const numberToWordsPtBr = (n: number): string => {
    if (n === 0) return 'zero';
    if (n < 0) return 'menos ' + numberToWordsPtBr(-n);

    const unidades = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove'];
    const especiais = ['dez', 'onze', 'doze', 'treze', 'catorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
    const dezenas = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
    const centenas = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];

    const ate999 = (num: number): string => {
      if (num === 100) return 'cem';
      const c = Math.floor(num / 100);
      const resto = num % 100;
      const parts: string[] = [];
      if (c > 0) parts.push(centenas[c]);
      if (resto > 0) {
        if (resto < 10) parts.push(unidades[resto]);
        else if (resto < 20) parts.push(especiais[resto - 10]);
        else {
          const d = Math.floor(resto / 10);
          const u = resto % 10;
          parts.push(u === 0 ? dezenas[d] : `${dezenas[d]} e ${unidades[u]}`);
        }
      }
      return parts.join(' e ');
    };

    const partes: string[] = [];
    const bilhoes = Math.floor(n / 1_000_000_000);
    const milhoes = Math.floor((n % 1_000_000_000) / 1_000_000);
    const milhares = Math.floor((n % 1_000_000) / 1000);
    const resto = n % 1000;

    if (bilhoes > 0) partes.push(`${bilhoes === 1 ? 'um bilhão' : `${ate999(bilhoes)} bilhões`}`);
    if (milhoes > 0) partes.push(`${milhoes === 1 ? 'um milhão' : `${ate999(milhoes)} milhões`}`);
    if (milhares > 0) partes.push(`${milhares === 1 ? 'mil' : `${ate999(milhares)} mil`}`);
    if (resto > 0) partes.push(ate999(resto));

    return partes.join(' e ');
  };

  const generateSubtitles = () => {
    if (!script.trim()) {
      toast.error('Escreva ou gere um roteiro primeiro');
      return;
    }

    setIsGeneratingSubtitles(true);
    toast.info('Gerando legendas...');

    try {
      // 1. Limpar e normalizar para fala (corrige pronúncia)
      const cleanText = normalizeForSpeech(
        script
          .replace(/\*\*/g, '')
          .replace(/INÍCIO:|MEIO:|FIM:/gi, '')
          .replace(/\n+/g, ' ')
          .trim()
      );

      // 2. Quebrar em chunks curtos estilo TikTok/Reels (3-5 palavras)
      const allWords = cleanText.split(/\s+/).filter(Boolean);
      if (allWords.length === 0) {
        toast.error('Não foi possível dividir o roteiro');
        setIsGeneratingSubtitles(false);
        return;
      }

      const CHUNK_SIZE = 4; // palavras por legenda
      const chunks: string[] = [];
      for (let i = 0; i < allWords.length; i += CHUNK_SIZE) {
        chunks.push(allWords.slice(i, i + CHUNK_SIZE).join(' '));
      }

      // 3. Calcular duração: distribuir proporcionalmente até preencher o limite
      // Velocidade alvo: ~165 wpm (ritmo natural pt-BR para vídeo curto)
      const WPM = 165;
      const totalWords = allWords.length;
      const naturalTotalMs = (totalWords / WPM) * 60 * 1000;

      // Usar limite de tempo do projeto se ativo, senão duração natural
      const targetTotalMs = globalSettings.timeLimitEnabled
        ? Math.min(globalSettings.timeLimit - 1000, Math.max(naturalTotalMs, 15000))
        : naturalTotalMs;

      // Verificar posição inicial (após últimas legendas existentes)
      const subtitleClips = clips.filter(c => c.track === 'SUB1');
      const startPosition = subtitleClips.reduce((max, clip) =>
        Math.max(max, clip.start + clip.duration), 0
      );

      // Distribuir tempo proporcional ao número de palavras de cada chunk
      let currentStart = startPosition;
      chunks.forEach((chunk, index) => {
        const wordsInChunk = chunk.split(/\s+/).length;
        const proportion = wordsInChunk / totalWords;
        const duration = Math.max(600, Math.round(targetTotalMs * proportion));

        addClip({
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

      updateTotalDuration();
      toast.success(`${chunks.length} legendas adicionadas (${(targetTotalMs / 1000).toFixed(1)}s total)`);
    } catch (error) {
      console.error('Erro ao gerar legendas:', error);
      toast.error('Erro ao gerar legendas. Tente novamente.');
    } finally {
      setIsGeneratingSubtitles(false);
    }
  };

  return (
    <div className="flex flex-col h-full p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          Roteiro IA
        </h3>
      </div>

      <Button
        onClick={generateScript}
        disabled={isGenerating || isGeneratingSubtitles}
        variant="secondary"
        className="w-full"
        size="sm"
      >
        {isGenerating ? (
          <>
            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            Gerando...
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4 mr-2" />
            Gerar Roteiro
          </>
        )}
      </Button>

      <div className="flex-1 flex flex-col space-y-2">
        <Textarea
          value={script}
          onChange={(e) => setScript(e.target.value)}
          placeholder="Clique em 'Gerar Roteiro' para criar um roteiro com IA, ou escreva seu próprio roteiro aqui..."
          className="flex-1 resize-none text-sm"
        />
      </div>

      <Button
        onClick={generateSubtitles}
        disabled={!script.trim() || isGeneratingSubtitles || isGenerating}
        className="w-full"
        size="sm"
      >
        {isGeneratingSubtitles ? (
          <>
            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            Gerando Legendas...
          </>
        ) : (
          <>
            <Captions className="w-4 h-4 mr-2" />
            Gerar Legendas
          </>
        )}
      </Button>

      <Button
        onClick={() => setEditorOpen(true)}
        disabled={subtitleCount === 0}
        variant="outline"
        size="sm"
        className="w-full"
      >
        <Pencil className="w-4 h-4 mr-2" />
        Editar Legendas {subtitleCount > 0 && `(${subtitleCount})`}
      </Button>

      <p className="text-xs text-muted-foreground">
        As legendas serão adicionadas à timeline e reproduzidas com voz do navegador
      </p>

      <SubtitleEditorDialog open={editorOpen} onOpenChange={setEditorOpen} />
    </div>
  );
};
