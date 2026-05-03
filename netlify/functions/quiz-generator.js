// netlify/functions/quiz-generator.js
const fetch = (...args) => import('node-fetch').then(({ default: f }) => f(...args));

exports.handler = async (event) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: corsHeaders, body: JSON.stringify({ error: 'Método não permitido' }) };
  }

  try {
    const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
    if (!ANTHROPIC_API_KEY) {
      return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: 'ANTHROPIC_API_KEY não configurada' }) };
    }

    const { eventName, eventDescription, eventCategory, numberOfQuestions = 5 } = JSON.parse(event.body || '{}');

    if (!eventName) {
      return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'eventName é obrigatório' }) };
    }

    const prompt = `Cria ${numberOfQuestions} perguntas de quiz sobre o seguinte evento:

Nome: ${eventName}
Categoria: ${eventCategory || 'Geral'}
Descrição: ${eventDescription || 'Sem descrição fornecida'}

Regras:
- Perguntas relevantes para o tema, categoria e conteúdo do evento
- Cada pergunta tem exactamente 4 opções de resposta
- Inclui uma explicação breve para cada resposta correcta
- Varia a dificuldade (fácil, médio, difícil)
- Escreve em Português

Responde APENAS com JSON válido, sem texto adicional, sem blocos markdown:
{
  "questions": [
    {
      "id": "q1",
      "question": "Pergunta?",
      "options": ["A", "B", "C", "D"],
      "correctAnswer": 0,
      "explanation": "Explicação da resposta correcta."
    }
  ]
}`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2048,
        system: 'Respondes SEMPRE e SOMENTE com JSON válido, sem texto adicional, sem blocos markdown.',
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      const msg = err?.error?.message ?? `Anthropic API erro ${response.status}`;
      return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: msg }) };
    }

    const data = await response.json();
    const rawText = data?.content?.[0]?.text ?? '';

    const clean = rawText
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    let parsed;
    try {
      parsed = JSON.parse(clean);
    } catch {
      return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: 'O modelo não devolveu JSON válido' }) };
    }

    if (!Array.isArray(parsed?.questions)) {
      return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: 'Formato de resposta inválido' }) };
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

    return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ questions }) };

  } catch (err) {
    console.error('quiz-generator error:', err);
    return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: err.message ?? 'Erro interno' }) };
  }
};