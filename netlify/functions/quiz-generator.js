// netlify/functions/quiz-illustration.js
// ESM puro — Node 18+ fetch nativo

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

const json = (statusCode, body) => ({
  statusCode,
  headers: corsHeaders,
  body: JSON.stringify(body),
});

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Método não permitido' });
  }

  try {
    const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
    if (!ANTHROPIC_API_KEY) {
      return json(500, { error: 'ANTHROPIC_API_KEY não configurada' });
    }

    const { prompt } = JSON.parse(event.body || '{}');
    if (!prompt) return json(400, { error: 'prompt é obrigatório' });

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1200,
        system: 'Respondes SEMPRE e SOMENTE com JSON válido. Sem texto adicional. Sem blocos markdown.',
        messages: [{
          role: 'user',
          content: `Cria uma ilustração SVG educativa para este tema de quiz: "${prompt}"

Responde APENAS com JSON válido, sem markdown, sem backticks:
{"svg": "...SVG completo aqui..."}

Requisitos do SVG:
- viewBox="0 0 440 180" xmlns="http://www.w3.org/2000/svg"
- Estilo infográfico educativo colorido e moderno
- Usa APENAS estas cores: #ea580c #f97316 #fb923c #fff7ed #1f2937 #374151 #6b7280 #f3f4f6 #16a34a #dcfce7 #1d4ed8 #dbeafe #fef9c3 #ca8a04 #ffffff
- Inclui formas geométricas, ícones desenhados com paths/circles/rects e elementos simbólicos relevantes ao tema
- Adiciona 2-3 labels de texto curtos (máx 3 palavras) com font-family="system-ui,sans-serif"
- Visual de card moderno com fundo suave e elementos em destaque
- SEM recursos externos, SEM tags image, apenas primitivas SVG`
        }],
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return json(500, { error: err?.error?.message ?? `Erro Anthropic ${response.status}` });
    }

    const data = await response.json();
    const rawText = data?.content?.[0]?.text ?? '';
    const clean = rawText.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();

    let parsed;
    try { parsed = JSON.parse(clean); } catch {
      return json(500, { error: 'Modelo não devolveu JSON válido' });
    }

    if (!parsed?.svg || typeof parsed.svg !== 'string') {
      return json(500, { error: 'SVG não encontrado na resposta' });
    }

    return json(200, { svg: parsed.svg });

  } catch (err) {
    console.error('[quiz-illustration]', err?.message);
    return json(500, { error: err?.message ?? 'Erro interno' });
  }
};