const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type Mode = 'script' | 'copy';

interface PropertyPayload {
  tipo?: string;
  transacao?: string;
  referencia?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  quartos?: number;
  banheiros?: number;
  vagas?: number;
  area?: number;
  areaTerreno?: number;
  valor?: number;
  valorEntrada?: number;
  condominio?: number;
  iptu?: number;
  diferenciais?: string[];
  descricaoAdicional?: string;
  nomeCorretor?: string;
  telefoneCorretor?: string;
  creci?: string;
  pageContext?: string;
  url?: string;
}

const formatCurrency = (value?: number) => value ? `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-';

const buildFactsBlock = (p: PropertyPayload) => [
  `TIPO: ${p.tipo || 'Imóvel'}`,
  `TRANSAÇÃO: ${p.transacao || 'Venda'}`,
  `REFERÊNCIA: ${p.referencia || '-'}`,
  `BAIRRO: ${p.bairro || '-'}`,
  `CIDADE: ${p.cidade || '-'}`,
  `ESTADO: ${p.estado || '-'}`,
  `QUARTOS: ${p.quartos ?? 0}`,
  `BANHEIROS: ${p.banheiros ?? 0}`,
  `VAGAS: ${p.vagas ?? 0}`,
  `ÁREA ÚTIL: ${p.area ?? 0} m²`,
  `ÁREA TERRENO: ${p.areaTerreno ?? 0} m²`,
  `VALOR OFICIAL: ${formatCurrency(p.valor)}`,
  `ENTRADA: ${formatCurrency(p.valorEntrada)}`,
  `CONDOMÍNIO: ${formatCurrency(p.condominio)}`,
  `IPTU: ${formatCurrency(p.iptu)}`,
  `DIFERENCIAIS: ${(p.diferenciais || []).join(', ') || '-'}`,
  `DESCRIÇÃO EXTRA: ${p.descricaoAdicional || '-'}`,
  `EMPRESA: ${p.nomeCorretor || 'Vendebens Imóveis'}`,
  `WHATSAPP: ${p.telefoneCorretor || '-'}`,
  `CRECI: ${p.creci || 'CRECI: 25571-J'}`,
].join('\n');

function buildScriptPrompt(p: PropertyPayload) {
  const cleanedContext = (p.pageContext || '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 6000);

  const facts = buildFactsBlock(p);

  return `Você é um redator publicitário sênior do mercado imobiliário brasileiro.
Crie um ROTEIRO DE NARRAÇÃO em português do Brasil para um Reels/TikTok de 55 a 59 segundos.
O texto será lido por uma voz feminina humana com IA. Use linguagem natural, conversacional, com gatilhos comerciais reais (escassez, exclusividade, prova social, oportunidade), sem enrolação.

═════════ FATOS OFICIAIS DO IMÓVEL — PRIORIDADE MÁXIMA ═════════
${facts}

═════════ TEXTO BRUTO DA PÁGINA DO IMÓVEL (use para enriquecer com detalhes reais — ambientes, lazer, acabamento, localização, vizinhança) ═════════
${cleanedContext || '(sem contexto adicional)'}

═════════ ESTRUTURA OBRIGATÓRIA (170 a 200 palavras, texto corrido) ═════════
1) ABERTURA natural e direta, sem frase genérica vazia.
2) APRESENTAÇÃO (3 frases): tipo + transação + bairro + cidade/estado, cite o código de referência, crie clima de oportunidade.
3) DETALHAMENTO RICO (5–6 frases CAUDA LONGA): descreva SOMENTE o que estiver presente nos fatos ou no texto bruto. Se sala, cozinha, armários, acabamento ou vista não estiverem informados, não cite. Cite cada diferencial extraído (lazer, segurança, mobília, vista, andar etc.) explicando o BENEFÍCIO PRÁTICO. Comente a localização (proximidade do comércio, escolas, transporte, praia, avenidas) apenas quando o texto bruto trouxer isso.
4) CONDIÇÕES COMERCIAIS (2–3 frases): anuncie o valor com clareza${p.valorEntrada ? ', destaque a entrada facilitada' : ''}${p.condominio ? ', cite o condomínio' : ''}${p.iptu ? ', cite o IPTU' : ''}, diga que aceita financiamento bancário e/ou FGTS, ressalte que é uma oportunidade rara pelo preço.
5) ENCERRAMENTO com CTA forte para visita ou contato.

═════════ REGRAS CRÍTICAS ═════════
- Retorne APENAS o texto corrido da narração. Nada de títulos, listas, asteriscos, emojis, hashtags ou marcações.
- 170 a 200 palavras. Nem mais, nem menos.
- Escreva valores monetários por extenso para a TTS pronunciar bem (ex: "trezentos e sessenta mil reais").
- Diga "código" ou "referência" em vez de "REF".
- NÃO INVENTE quartos, banheiros, vagas, metragem, lazer, vista, acabamento, sacada, FGTS, armários ou qualquer item ausente.
- Se houver conflito entre texto bruto e fatos oficiais, os FATOS OFICIAIS vencem.
- O valor precisa bater EXATAMENTE com VALOR OFICIAL.
- A quantidade de quartos, banheiros, vagas e área útil precisa bater EXATAMENTE com os FATOS OFICIAIS.
- Use gatilhos naturais ("oportunidade rara", "dificilmente aparece outro assim", "imóvel pronto pra morar", "entrega imediata", "última unidade disponível" SOMENTE se fizer sentido).`;
}

function buildCopyPrompt(p: PropertyPayload) {
  const cleanedContext = (p.pageContext || '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 6000);

  const cidadeTag = (p.cidade || '').toLowerCase().replace(/\s+/g, '');
  const bairroTag = (p.bairro || '').toLowerCase().replace(/\s+/g, '');
  const tipoTag = (p.tipo || 'imovel').toLowerCase().replace(/\s+/g, '');
  const trxTag = (p.transacao || 'venda').toLowerCase();

  const facts = buildFactsBlock(p);

  return `Você é um copywriter sênior de imobiliária. Escreva uma COPY LONGA, RICA e PERSUASIVA para Instagram/Facebook/TikTok (entre 220 e 320 palavras), pronta pra colar no Buffer.

═════════ FATOS OFICIAIS DO IMÓVEL — PRIORIDADE MÁXIMA ═════════
${facts}

═════════ TEXTO BRUTO DA PÁGINA DO IMÓVEL (use para extrair detalhes reais) ═════════
${cleanedContext || '(sem contexto)'}

═════════ ESTRUTURA OBRIGATÓRIA ═════════
1) HEADLINE (1 linha) com 1–2 emojis: tipo + transação + bairro + chamada de impacto.
(linha em branco)
2) PARÁGRAFO DE APRESENTAÇÃO (3–4 frases): contextualize o imóvel, cite localização completa e crie desejo.
(linha em branco)
3) BLOCO "🔎 O QUE ESSE IMÓVEL OFERECE:" lista bullet usando ✅ ou 🛏️ 🚿 🚗 📐 cobrindo TODOS os números e TODOS os diferenciais (um por linha, com benefício prático ao lado).
(linha em branco)
4) BLOCO "💰 CONDIÇÕES COMERCIAIS:" lista valor, ${p.valorEntrada ? 'entrada facilitada, ' : ''}${p.condominio ? 'condomínio, ' : ''}${p.iptu ? 'IPTU, ' : ''}aceita financiamento bancário 🏦 e FGTS.
(linha em branco)
5) BLOCO "📍 LOCALIZAÇÃO:" 2 frases sobre o bairro/cidade (proximidade de comércio, escolas, praia, transporte etc).
(linha em branco)
6) CTA forte: "📲 Chame agora no WhatsApp ${p.telefoneCorretor || '(coloque seu número)'} e agende sua visita!"
(linha em branco)
7) ASSINATURA:
🏠 ${p.nomeCorretor || 'Vendebens Imóveis'}
📋 REF.: ${p.referencia || ''}
${p.creci || 'CRECI: 25571-J'}
(linha em branco)
8) HASHTAGS (10–14): #imoveis #${cidadeTag} #${bairroTag} #${tipoTag} #${trxTag}imoveis #imobiliaria #realestate #investimento #${cidadeTag}imoveis #${tipoTag}aVenda + variações relevantes.

═════════ REGRAS ═════════
- Use TODOS os dados, sem inventar.
- Tom profissional, entusiasmado e humano. Emojis estratégicos.
- NUNCA omita CRECI, empresa, referência e WhatsApp.
- O valor anunciado precisa bater EXATAMENTE com VALOR OFICIAL.
- A copy não pode inventar cômodos, acabamento, vista, sacada ou benefícios não presentes nos fatos ou no texto bruto.
- Retorne APENAS o texto final pronto pra colar.`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const MISTRAL_API_KEY = Deno.env.get('MISTRAL_API_KEY');
    if (!MISTRAL_API_KEY) {
      return new Response(JSON.stringify({ error: 'MISTRAL_API_KEY não configurada' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const mode: Mode = body.mode === 'copy' ? 'copy' : 'script';
    const property: PropertyPayload = body.property || {};

    const prompt = mode === 'copy' ? buildCopyPrompt(property) : buildScriptPrompt(property);

    const resp = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MISTRAL_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'mistral-large-latest',
        messages: [{ role: 'user', content: prompt }],
        temperature: mode === 'copy' ? 0.75 : 0.85,
        max_tokens: 2200,
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      console.error('Mistral error', resp.status, errText);
      return new Response(JSON.stringify({ error: `Mistral API ${resp.status}: ${errText}` }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await resp.json();
    const text: string = data?.choices?.[0]?.message?.content?.trim() || '';

    return new Response(JSON.stringify({ text }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('mistral-generate exception', e);
    const msg = e instanceof Error ? e.message : 'Erro desconhecido';
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
