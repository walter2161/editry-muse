const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LMNT_API_KEY = Deno.env.get('LMNT_API_KEY');
    if (!LMNT_API_KEY) {
      return new Response(JSON.stringify({ error: 'LMNT_API_KEY não configurada' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const text: string = (body.text || '').toString().trim();
    const voice: string = body.voice || 'lily';
    const language: string = body.language || 'pt';
    const model: string = body.model || 'blizzard';
    const format: string = body.format || 'mp3';
    const speed: number = typeof body.speed === 'number' ? body.speed : 1.0;

    if (!text) {
      return new Response(JSON.stringify({ error: 'Texto vazio' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Truncar para evitar limites (LMNT aceita ~5000 chars)
    const safeText = text.length > 4500 ? text.slice(0, 4500) : text;

    const lmntResp = await fetch('https://api.lmnt.com/v1/ai/speech/bytes', {
      method: 'POST',
      headers: {
        'X-API-Key': LMNT_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: safeText,
        voice,
        language,
        model,
        format,
        speed,
        sample_rate: 24000,
      }),
    });

    if (!lmntResp.ok) {
      const errText = await lmntResp.text();
      console.error('LMNT error', lmntResp.status, errText);
      return new Response(
        JSON.stringify({ error: `LMNT API error ${lmntResp.status}: ${errText}` }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const audioBuffer = await lmntResp.arrayBuffer();
    const bytes = new Uint8Array(audioBuffer);

    // Base64 sem stack overflow
    let binary = '';
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode.apply(
        null,
        Array.from(bytes.subarray(i, i + chunkSize))
      );
    }
    const base64 = btoa(binary);

    return new Response(
      JSON.stringify({
        audioBase64: base64,
        mimeType: format === 'mp3' ? 'audio/mpeg' : `audio/${format}`,
        size: bytes.length,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    console.error('lmnt-tts exception', e);
    const msg = e instanceof Error ? e.message : 'Erro desconhecido';
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
