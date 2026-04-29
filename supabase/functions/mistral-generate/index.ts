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

const aberturas = [
  "Oi, pessoal! Hoje quero te apresentar um imóvel que acabou de chegar pra venda",
  "Olá, gente! Separei um tempinho pra te mostrar com calma esse imóvel imperdível",
  "Oi, tudo bem? Hoje eu trouxe uma oportunidade muito interessante pra você",
  "Olá, pessoal! Vem comigo conhecer esse imóvel que tem tudo pra ser o seu próximo lar",
  "E aí, gente! Hoje o assunto é esse imóvel incrível que acabou de entrar no nosso portfólio",
];

const encerramentos = [
  "Gostou? Me chama agora no WhatsApp que eu te envio todas as informações e fotos extras",
  "Tem interesse? Manda mensagem pra mim que eu agendo a sua visita ainda essa semana",
  "Não deixe essa oportunidade passar! Me chama no direct ou no WhatsApp que respondo na hora",
  "Quer conhecer pessoalmente? Fala comigo agora que eu organizo a visita no melhor horário pra você",
  "Esse imóvel tem tudo pra sair rápido. Me chama no WhatsApp que te dou todos os detalhes agora",
];

const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];

function buildScriptPrompt(p: PropertyPayload) {
  const abertura = pick(aberturas);
  const encerramento = pick(encerramentos);
  const cleanedContext = (p.pageContext || '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 6000);

  return `Você é um redator publicitário sênior do mercado imobiliário brasileiro.
Crie um ROTEIRO DE NARRAÇÃO em português do Brasil para um Reels/TikTok de 55 a 59 segundos.
O texto será lido por uma voz feminina humana com IA. Use linguagem natural, conversacional, com gatilhos comerciais reais (escassez, exclusividade, prova social, oportunidade), sem enrolação.

═════════ DADOS ESTRUTURADOS DO IMÓVEL ═════════
Tipo: ${p.tipo || 'Imóvel'}
Transação: ${p.transacao || 'Venda'}
Código de referência: ${p.referencia || 'sem código'}
Bairro: ${p.bairro || ''}
Cidade/Estado: ${p.cidade || ''}/${p.estado || ''}
Quartos: ${p.quartos ?? '-'}
Banheiros: ${p.banheiros ?? '-'}
Vagas: ${p.vagas ?? '-'}
Área útil: ${p.area ? p.area + ' m²' : '-'}
${p.areaTerreno ? `Área do terreno: ${p.areaTerreno} m²` : ''}
Valor: ${p.valor ? 'R$ ' + p.valor.toLocaleString('pt-BR') : '-'}
${p.valorEntrada ? `Entrada facilitada: R$ ${p.valorEntrada.toLocaleString('pt-BR')}` : ''}
${p.condominio ? `Condomínio: R$ ${p.condominio.toLocaleString('pt-BR')}/mês` : ''}
${p.iptu ? `IPTU: R$ ${p.iptu.toLocaleString('pt-BR')}/ano` : ''}
Diferenciais: ${(p.diferenciais && p.diferenciais.length) ? p.diferenciais.join(', ') : 'imóvel de qualidade'}
Observações: ${p.descricaoAdicional || '-'}
Imobiliária: ${p.nomeCorretor || 'Vendebens Imóveis'}
${p.creci ? p.creci : 'CRECI: 25571-J'}

═════════ TEXTO BRUTO DA PÁGINA DO IMÓVEL (use para enriquecer com detalhes reais — ambientes, lazer, acabamento, localização, vizinhança) ═════════
${cleanedContext || '(sem contexto adicional)'}

═════════ ESTRUTURA OBRIGATÓRIA (170 a 200 palavras, texto corrido) ═════════
1) ABERTURA (use literalmente): "${abertura}".
2) APRESENTAÇÃO (3 frases): tipo + transação + bairro + cidade/estado, cite o código de referência, crie clima de oportunidade.
3) DETALHAMENTO RICO (5–6 frases CAUDA LONGA): descreva ambientes (sala, cozinha, dormitórios, banheiros, área de serviço, sacada/varanda se houver), acabamento, distribuição, ventilação/iluminação. Cite cada diferencial extraído (lazer, segurança, mobília, vista, andar etc.) explicando o BENEFÍCIO PRÁTICO. Comente a localização (proximidade do comércio, escolas, transporte, praia, avenidas).
4) CONDIÇÕES COMERCIAIS (2–3 frases): anuncie o valor com clareza${p.valorEntrada ? ', destaque a entrada facilitada' : ''}${p.condominio ? ', cite o condomínio' : ''}${p.iptu ? ', cite o IPTU' : ''}, diga que aceita financiamento bancário e/ou FGTS, ressalte que é uma oportunidade rara pelo preço.
5) ENCERRAMENTO (use literalmente): "${encerramento}".

═════════ REGRAS CRÍTICAS ═════════
- Retorne APENAS o texto corrido da narração. Nada de títulos, listas, asteriscos, emojis, hashtags ou marcações.
- 170 a 200 palavras. Nem mais, nem menos.
- Escreva valores monetários por extenso para a TTS pronunciar bem (ex: "trezentos e sessenta mil reais").
- Diga "código" ou "referência" em vez de "REF".
- Não invente nada que não esteja nos dados ou no texto bruto.
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

  return `Você é um copywriter sênior de imobiliária. Escreva uma COPY LONGA, RICA e PERSUASIVA para Instagram/Facebook/TikTok (entre 220 e 320 palavras), pronta pra colar no Buffer.

═════════ DADOS ESTRUTURADOS ═════════
Tipo: ${p.tipo || 'Imóvel'}
Transação: ${p.transacao || 'Venda'}
Referência: ${p.referencia || '-'}
Bairro: ${p.bairro || ''}
Cidade/Estado: ${p.cidade || ''}/${p.estado || ''}
Quartos: ${p.quartos ?? '-'} | Banheiros: ${p.banheiros ?? '-'} | Vagas: ${p.vagas ?? '-'} | Área: ${p.area ? p.area + 'm²' : '-'}${p.areaTerreno ? ` | Terreno: ${p.areaTerreno}m²` : ''}
Valor: ${p.valor ? 'R$ ' + p.valor.toLocaleString('pt-BR') : '-'}
${p.valorEntrada ? `Entrada: R$ ${p.valorEntrada.toLocaleString('pt-BR')}` : ''}
${p.condominio ? `Condomínio: R$ ${p.condominio.toLocaleString('pt-BR')}/mês` : ''}
${p.iptu ? `IPTU: R$ ${p.iptu.toLocaleString('pt-BR')}/ano` : ''}
Diferenciais: ${(p.diferenciais && p.diferenciais.length) ? p.diferenciais.join(', ') : 'imóvel de qualidade'}
Empresa: ${p.nomeCorretor || 'Vendebens Imóveis'}
WhatsApp: ${p.telefoneCorretor || '(coloque seu número)'}
${p.creci || 'CRECI: 25571-J'}

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
