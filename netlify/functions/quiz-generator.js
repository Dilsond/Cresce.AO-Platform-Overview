// netlify/functions/quiz-generator.js
// ESM puro — compatível com "type": "module" no package.json
// Node 18+ com fetch nativo (sem node-fetch)

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
      console.error('[quiz-generator] ANTHROPIC_API_KEY não está definida');
      return json(500, { error: 'ANTHROPIC_API_KEY não configurada nas variáveis de ambiente do Netlify' });
    }

    let body;
    try {
      body = JSON.parse(event.body || '{}');
    } catch {
      return json(400, { error: 'Body inválido' });
    }

    const { eventName, eventDescription, eventCategory, numberOfQuestions = 5 } = body;

    if (!eventName) {
      return json(400, { error: 'eventName é obrigatório' });
    }

    console.log(`[quiz-generator] Gerando ${numberOfQuestions} perguntas para: "${eventName}"`);

    const prompt = `Cria ${numberOfQuestions} perguntas de quiz sobre o seguinte evento:

Nome: ${eventName}
Categoria: ${eventCategory || 'Geral'}
Descrição: ${eventDescription || 'Sem descrição fornecida'}

Regras:
- Perguntas relevantes para o tema, categoria e conteúdo do evento
- Cada pergunta tem exactamente 4 opções de resposta
- Inclui uma explicação breve para cada resposta correcta
- Varia a dificuldade (fácil, médio, difícil)
- Escreve em Português de Angola/Portugal

Responde APENAS com JSON válido, sem texto adicional, sem blocos markdown, sem comentários:
{
  "questions": [
    {
      "id": "q1",
      "question": "Pergunta?",
      "options": ["Opção A", "Opção B", "Opção C", "Opção D"],
      "correctAnswer": 0,
      "explanation": "Explicação da resposta correcta."
    }
  ]
}`;

    const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2048,
        system: 'Respondes SEMPRE e SOMENTE com JSON válido. Sem texto adicional. Sem blocos markdown. Sem comentários.',
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    const anthropicText = await anthropicResponse.text();
    console.log(`[quiz-generator] Anthropic status: ${anthropicResponse.status}`);

    if (!anthropicResponse.ok) {
      console.error('[quiz-generator] Anthropic error body:', anthropicText);
      let errMsg = `Erro da API Anthropic (${anthropicResponse.status})`;
      try {
        const errJson = JSON.parse(anthropicText);
        errMsg = errJson?.error?.message ?? errMsg;
      } catch { /* ignora */ }
      return json(500, { error: errMsg });
    }

    let anthropicData;
    try {
      anthropicData = JSON.parse(anthropicText);
    } catch {
      console.error('[quiz-generator] Falha ao parsear resposta Anthropic:', anthropicText);
      return json(500, { error: 'Resposta inválida da API Anthropic' });
    }

    const rawText = anthropicData?.content?.[0]?.text ?? '';
    console.log('[quiz-generator] Raw model output:', rawText.substring(0, 200));

    // Limpar eventuais blocos markdown
    const clean = rawText
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    let parsed;
    try {
      parsed = JSON.parse(clean);
    } catch (parseErr) {
      console.error('[quiz-generator] Falha ao parsear JSON do modelo:', clean.substring(0, 300));
      return json(500, { error: 'O modelo não devolveu JSON válido. Tenta novamente.' });
    }

    if (!Array.isArray(parsed?.questions)) {
      console.error('[quiz-generator] Formato inválido, falta array questions:', JSON.stringify(parsed).substring(0, 200));
      return json(500, { error: 'Formato de resposta inválido do modelo.' });
    }

    const questions = parsed.questions
      .filter((q) =>
        q.question &&
        Array.isArray(q.options) &&
        q.options.length === 4 &&
        typeof q.correctAnswer === 'number' &&
        q.correctAnswer >= 0 &&
        q.correctAnswer <= 3
      )
      .map((q, i) => ({
        id: q.id ?? `q${i + 1}`,
        question: String(q.question),
        options: q.options.map(String),
        correctAnswer: Number(q.correctAnswer),
        explanation: q.explanation ? String(q.explanation) : undefined,
      }));

    if (questions.length === 0) {
      return json(500, { error: 'Nenhuma pergunta válida foi gerada. Tenta novamente.' });
    }

    console.log(`[quiz-generator] Sucesso: ${questions.length} perguntas geradas`);
    return json(200, { questions });

  } catch (err) {
    console.error('[quiz-generator] Erro inesperado:', err?.message ?? err);
    return json(500, { error: err?.message ?? 'Erro interno do servidor' });
  }
};