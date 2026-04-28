import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Sparkles, Copy, RefreshCw } from 'lucide-react';
import { usePropertyStore } from '@/store/propertyStore';
import { toast } from 'sonner';

const MISTRAL_API_KEY = 'aynCSftAcQBOlxmtmpJqVzco8K4aaTDQ';

export const CopyGenerator = () => {
  const { propertyData, generatedCopy, setGeneratedCopy } = usePropertyStore();
  const [isGenerating, setIsGenerating] = useState(false);

  const generateCopy = async () => {
    if (!propertyData) {
      toast.error('Preencha os dados do imóvel primeiro');
      return;
    }

    setIsGenerating(true);

    try {
    const prompt = `Crie uma copy COMPLETA, RICA E PERSUASIVA para um post de Instagram/Facebook/TikTok sobre este imóvel. A copy deve ser longa e profissional (entre 180 e 260 palavras) usando todos os dados disponíveis.

═══ DADOS DO IMÓVEL ═══
Tipo: ${propertyData.tipo}
Transação: ${propertyData.transacao}
Código de referência: ${propertyData.referencia || '-'}

═══ LOCALIZAÇÃO ═══
Bairro: ${propertyData.bairro}
Cidade/Estado: ${propertyData.cidade}/${propertyData.estado}

═══ CARACTERÍSTICAS ═══
Quartos: ${propertyData.quartos}
Banheiros: ${propertyData.banheiros}
Vagas de garagem: ${propertyData.vagas}
Área útil: ${propertyData.area}m²
${propertyData.areaTerreno ? `Área do terreno: ${propertyData.areaTerreno}m²` : ''}

═══ VALORES ═══
Valor: R$ ${propertyData.valor.toLocaleString('pt-BR')}
${propertyData.valorEntrada ? `Entrada facilitada: R$ ${propertyData.valorEntrada.toLocaleString('pt-BR')}` : ''}
${propertyData.condominio ? `Condomínio: R$ ${propertyData.condominio.toLocaleString('pt-BR')}/mês` : ''}
${propertyData.iptu ? `IPTU: R$ ${propertyData.iptu.toLocaleString('pt-BR')}/ano` : ''}

═══ DIFERENCIAIS ═══
${propertyData.diferenciais.length ? propertyData.diferenciais.map(d => `• ${d}`).join('\n') : '• Imóvel de qualidade'}

═══ OBSERVAÇÕES EXTRAS ═══
${propertyData.descricaoAdicional || '-'}

═══ EMPRESA / CORRETOR ═══
Nome: ${propertyData.nomeCorretor}
WhatsApp: ${propertyData.telefoneCorretor || '(entre em contato pela bio)'}
${propertyData.creci || 'CRECI: 25571-J'}

═══ ESTRUTURA OBRIGATÓRIA DA COPY ═══

1) Linha 1: HEADLINE com 1-2 emojis e uma chamada de impacto que mencione o tipo, a transação e o bairro.
2) Linha em branco.
3) Parágrafo de APRESENTAÇÃO (3-4 frases): descreva o imóvel com adjetivos vendedores, cite localização completa (bairro, cidade/estado).
4) Linha em branco.
5) Bloco "🔎 O QUE ESSE IMÓVEL OFERECE:" com lista bullet (✅ ou 🛏️ 🚿 🚗 📐) cobrindo TODOS os números (quartos, banheiros, vagas, área) e TODOS os diferenciais um por um.
6) Linha em branco.
7) Bloco "💰 CONDIÇÕES:" listando valor, entrada (se houver), condomínio (se houver), IPTU (se houver) e a frase "Aceita financiamento bancário 🏦".
8) Linha em branco.
9) Parágrafo "📍 LOCALIZAÇÃO:" com 1-2 frases sobre o bairro/cidade.
10) Linha em branco.
11) CTA forte com WhatsApp: "📲 Chame agora no WhatsApp ${propertyData.telefoneCorretor || '(coloque seu número)'} e agende sua visita!"
12) Linha em branco.
13) Bloco de assinatura da empresa: "🏠 ${propertyData.nomeCorretor}" + linha "📋 REF.: ${propertyData.referencia || ''}" + linha "${propertyData.creci || 'CRECI: 25571-J'}"
14) Linha em branco.
15) Linha de hashtags relevantes (8-12): #imoveis #${propertyData.cidade.toLowerCase().replace(/\s+/g, '')} #${propertyData.bairro.toLowerCase().replace(/\s+/g, '')} #${propertyData.tipo.toLowerCase()} #${propertyData.transacao.toLowerCase()}imoveis #imobiliaria #realestate #investimento #${propertyData.cidade.toLowerCase().replace(/\s+/g, '')}imoveis e variações.

REGRAS:
- Use TODOS os dados fornecidos, não invente nada
- Tom profissional, entusiasmado e humano
- Emojis estratégicos, sem exagero
- NUNCA omita o CRECI nem o nome da empresa
- Retorne APENAS o texto final pronto para colar, sem aspas envolvendo, sem comentários`;

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
          temperature: 0.7,
          max_tokens: 500,
        }),
      });

      if (!response.ok) {
        throw new Error('Erro na API da Mistral');
      }

      const data = await response.json();
      const copy = data.choices[0].message.content;
      setGeneratedCopy(copy);
      toast.success('Copy gerada com sucesso!');
    } catch (error) {
      console.error('Erro ao gerar copy:', error);
      const cidade = propertyData.cidade || '';
      const bairro = propertyData.bairro || '';
      const tipo = propertyData.tipo || 'Imóvel';
      const transacao = propertyData.transacao || 'Venda';
      const valor = propertyData.valor ? `por R$ ${propertyData.valor.toLocaleString('pt-BR')}` : '';
      const caracts = [
        propertyData.quartos ? `${propertyData.quartos} quartos` : null,
        propertyData.banheiros ? `${propertyData.banheiros} banheiros` : null,
        propertyData.vagas ? `${propertyData.vagas} vagas` : null,
        propertyData.area ? `${propertyData.area}m²` : null,
      ]
        .filter(Boolean)
        .join(' · ');

      const difs = propertyData.diferenciais && propertyData.diferenciais.length
        ? `Destaques: ${propertyData.diferenciais.slice(0, 5).join(', ')}.\n`
        : '';

      const ref = propertyData.referencia ? `\n\n📋 REF: ${propertyData.referencia}` : '';
      const creci = propertyData.creci || 'CRECI: 25571-J';
      const fallback = `✨ ${tipo} para ${transacao} em ${bairro} · ${cidade}\n\n${caracts}${valor ? ` \u2014 ${valor}` : ''}\n${difs}\nCorra! Oportunidade única com excelente localização. Fale agora e agende sua visita! 📲${ref}\n\n${creci}\n\n#imoveis #${cidade.toLowerCase()}`;
      setGeneratedCopy(fallback);
      toast.success('Copy gerada (fallback)');
    } finally {
      setIsGenerating(false);
    }
  };

  const copyCopy = () => {
    navigator.clipboard.writeText(generatedCopy);
    toast.success('Copy copiada!');
  };

  return (
    <div className="space-y-2 p-3 bg-card rounded-md border">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
          Copy com IA
        </h2>
        {generatedCopy && (
          <Button size="sm" variant="ghost" onClick={copyCopy} className="h-7 px-2 text-xs">
            <Copy className="w-3 h-3 mr-1" />
            Copiar
          </Button>
        )}
      </div>

      <Button onClick={generateCopy} disabled={isGenerating} className="w-full h-8 text-xs" size="sm">
        {isGenerating ? (
          <>
            <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
            Gerando...
          </>
        ) : (
          <>
            <Sparkles className="w-3.5 h-3.5 mr-1.5" />
            Gerar Copy
          </>
        )}
      </Button>

      {generatedCopy && (
        <Textarea
          value={generatedCopy}
          onChange={(e) => setGeneratedCopy(e.target.value)}
          rows={8}
          className="font-sans text-xs"
        />
      )}
    </div>
  );
};

const Input = ({ ...props }: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input 
    {...props} 
    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
  />
);
