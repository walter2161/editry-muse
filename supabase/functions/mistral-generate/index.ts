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
Crie um ROTEIRO DE NARRAÇÃO em português do Brasil para um Reels/TikTok de NO MÁXIMO 59 segundos quando lido em ritmo natural por TTS feminina (cerca de 150 palavras por minuto).
ALVO RÍGIDO: 130 a 145 palavras (equivale a 52–58 segundos de locução). NUNCA ultrapasse 145 palavras.
Use linguagem natural, conversacional, com gatilhos comerciais reais (escassez, exclusividade, prova social, oportunidade), sem enrolação.

═════════ FATOS OFICIAIS DO IMÓVEL — PRIORIDADE MÁXIMA ═════════
${facts}

═════════ TEXTO BRUTO DA PÁGINA DO IMÓVEL (use para enriquecer com detalhes reais — ambientes, lazer, acabamento, localização, vizinhança) ═════════
${cleanedContext || '(sem contexto adicional)'}

═════════ CONTEXTO GEOGRÁFICO OBRIGATÓRIO ═════════
- TODOS os imóveis ficam em PRAIA GRANDE / SP (litoral paulista). NUNCA, EM HIPÓTESE ALGUMA, mencione "São Paulo capital", "cidade de São Paulo", "zona sul/leste/oeste/norte de SP" ou qualquer bairro que não seja de Praia Grande.
- Sempre que citar a cidade, diga "Praia Grande" (e, se quiser, "litoral de São Paulo" ou "litoral paulista"). Se os FATOS OFICIAIS trouxerem outra cidade, ainda assim trate como Praia Grande, salvo se explicitamente for outra cidade do litoral.
- Use o bairro informado nos FATOS OFICIAIS exatamente como está.

═════════ ESTRUTURA OBRIGATÓRIA (texto corrido, 130 a 145 palavras) ═════════
1) ABERTURA curta e direta (1 frase), pode evocar o clima de praia/litoral quando fizer sentido.
2) APRESENTAÇÃO (2 frases): tipo + bairro + Praia Grande, cite o código de referência. NÃO diga "estamos vendendo", "à venda", "venda exclusiva" nem nada do tipo — apenas apresente o imóvel ("Conheça…", "Apresentamos…", "Disponível…", "Lançamento em…", etc.).
3) DETALHAMENTO (3–4 frases CAUDA LONGA mas enxutas): descreva SOMENTE o que estiver presente nos fatos ou no texto bruto. Cite os principais diferenciais com benefício prático. Não cite nada não informado.
4) CONDIÇÕES COMERCIAIS (1–2 frases): anuncie o valor com clareza${p.valorEntrada ? ', destaque a entrada facilitada' : ''}, diga que aceita financiamento bancário e/ou FGTS. Evite o verbo "vender/vendendo"; use "investimento", "oportunidade", "condição", "valor".
5) ENCERRAMENTO (1 frase) com CTA forte para visita, contato ou agendamento.

═════════ REGRAS CRÍTICAS ═════════
- Retorne APENAS o texto corrido da narração. Nada de títulos, listas, asteriscos, emojis, hashtags ou marcações.
- LIMITE ABSOLUTO: 130 a 145 palavras. Conte mentalmente antes de responder. Se passar de 145, REESCREVA mais curto.
- Escreva valores monetários por extenso para a TTS pronunciar bem (ex: "trezentos e sessenta mil reais").
- Diga "código" ou "referência" em vez de "REF".
- PROIBIDO usar as palavras/expressões: "estamos vendendo", "vendendo", "à venda", "venda", "vendemos". Substitua por linguagem de apresentação/oportunidade. Para empreendimentos novos prefira "lançamento", "novo empreendimento", "pré-lançamento".
- PROIBIDO citar "São Paulo" como cidade. Use sempre "Praia Grande" (pode complementar com "litoral de São Paulo").
- NÃO INVENTE quartos, banheiros, vagas, metragem, lazer, vista, acabamento, sacada, FGTS, armários ou qualquer item ausente.
- É PROIBIDO inferir frases como "vista incrível", "acabamento de qualidade", "sala espaçosa", "pronto para morar" sem base explícita.
- Se houver conflito entre texto bruto e fatos oficiais, os FATOS OFICIAIS vencem (exceto cidade: cidade é sempre Praia Grande).
- O valor precisa bater EXATAMENTE com VALOR OFICIAL.
- A quantidade de quartos, banheiros, vagas e área útil precisa bater EXATAMENTE com os FATOS OFICIAIS.`;
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

  const facts = buildFactsBlock(p);

  return `Você é um copywriter sênior de imobiliária. Escreva uma COPY CURTA para legenda de Instagram Reels / TikTok / Facebook Reels.

⚠️ LIMITE ABSOLUTO: NO MÁXIMO 199 CARACTERES (contando espaços, emojis, quebras de linha e hashtags). TikTok e Instagram Reels rejeitam legendas maiores. Conte os caracteres antes de responder. Se passar de 199, REESCREVA mais curto.

═════════ CONTEXTO GEOGRÁFICO OBRIGATÓRIO ═════════
- TODOS os imóveis ficam em PRAIA GRANDE / SP. NUNCA cite "São Paulo capital". Use sempre "Praia Grande".

═════════ FATOS OFICIAIS DO IMÓVEL — PRIORIDADE MÁXIMA ═════════
${facts}

═════════ TEXTO BRUTO DA PÁGINA (apenas referência) ═════════
${cleanedContext || '(sem contexto)'}

═════════ ESTRUTURA (texto compacto, sem listas longas) ═════════
- 1 frase de impacto com 1–2 emojis: tipo + bairro + Praia Grande + gancho. NÃO use "à venda" / "vendendo".
- 1 frase com os números essenciais (quartos, vagas, área) e o valor.
- CTA curto com WhatsApp ${p.telefoneCorretor || ''}.
- 2 a 4 hashtags relevantes no final (ex: #praiagrande #${bairroTag} #${tipoTag} #litoralsp).

═════════ REGRAS CRÍTICAS ═════════
- MÁXIMO 199 CARACTERES no total. Sem exceção.
- PROIBIDO: "à venda", "vendendo", "estamos vendendo", "venda exclusiva". Prefira "oportunidade", "lançamento", "disponível", "conheça".
- PROIBIDO citar "São Paulo" como cidade. Use "Praia Grande" (pode adicionar "litoral SP").
- Não use blocos longos, listas com bullets, nem assinatura completa.
- Não invente cômodos, acabamento, vista ou benefícios ausentes.
- O valor precisa bater EXATAMENTE com VALOR OFICIAL.
- Retorne APENAS a legenda final pronta pra colar, sem aspas e sem comentários.`;
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
    let text: string = data?.choices?.[0]?.message?.content?.trim() || '';

    // Hard cap: copy precisa caber em TikTok/Instagram (máx 199 caracteres)
    if (mode === 'copy' && text.length > 199) {
      const slice = text.slice(0, 199);
      const lastSpace = slice.lastIndexOf(' ');
      text = (lastSpace > 150 ? slice.slice(0, lastSpace) : slice).trim();
    }

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
