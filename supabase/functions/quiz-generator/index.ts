// supabase/functions/quiz-generator/index.ts
//
// Deploy:  supabase functions deploy quiz-generator
// Secret:  supabase secrets set ANTHROPIC_API_KEY=sk-ant-...

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  // Responder a pre-flight CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (!ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY não configurada nas secrets da Edge Function');
    }

    const { eventName, eventDescription, eventCategory, numberOfQuestions = 5 } = await req.json();

    if (!eventName) {
      return new Response(
        JSON.stringify({ error: 'eventName é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── Prompt ──────────────────────────────────────────────────────────────
    const systemPrompt = `És um especialista em criar quizzes educativos e envolventes sobre eventos.
Respondes SEMPRE e SOMENTE com JSON válido, sem texto adicional, sem blocos markdown, sem explicações fora do JSON.`;

    const userPrompt = `Cria ${numberOfQuestions} perguntas de quiz sobre o seguinte evento:

Nome do Evento: ${eventName}
Categoria: ${eventCategory || 'Geral'}
Descrição: ${eventDescription || 'Sem descrição fornecida'}

Regras:
- As perguntas devem ser relevantes para o tema, categoria e conteúdo do evento
- Cada pergunta deve ter exactamente 4 opções de resposta
- Inclui uma explicação breve e educativa para cada resposta correcta
- Varia a dificuldade: algumas fáceis, outras intermédias, uma ou duas desafiantes
- As perguntas devem ser em Português de Angola/Portugal

Responde APENAS com este JSON (sem mais nada):
{
  "questions": [
    {
      "id": "q1",
      "question": "Texto da pergunta?",
      "options": ["Opção A", "Opção B", "Opção C", "Opção D"],
      "correctAnswer": 0,
      "explanation": "Explicação breve da resposta correcta."
    }
  ]
}

O campo "correctAnswer" é o índice (0-3) da opção correcta no array "options".`;

    // ── Chamada à API da Anthropic ───────────────────────────────────────────
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001', // rápido e económico para quizzes
        max_tokens: 2048,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      console.error('Anthropic API error:', errBody);
      throw new Error(`Anthropic API respondeu com status ${response.status}`);
    }

    const anthropicData = await response.json();
    const rawText = anthropicData?.content?.[0]?.text ?? '';

    // ── Parse do JSON retornado pelo modelo ──────────────────────────────────
    // Remove eventuais blocos markdown caso o modelo os inclua mesmo assim
    const clean = rawText
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    let parsed: { questions: any[] };
    try {
      parsed = JSON.parse(clean);
    } catch {
      console.error('Falha ao fazer parse do JSON:', clean);
      throw new Error('O modelo não devolveu JSON válido');
    }

    if (!Array.isArray(parsed?.questions)) {
      throw new Error('Formato de resposta inválido: falta o array "questions"');
    }

    // ── Validação e normalização das perguntas ───────────────────────────────
    const questions = parsed.questions
      .filter((q: any) =>
        q.question &&
        Array.isArray(q.options) &&
        q.options.length === 4 &&
        typeof q.correctAnswer === 'number' &&
        q.correctAnswer >= 0 &&
        q.correctAnswer <= 3
      )
      .map((q: any, index: number) => ({
        id: q.id ?? `q${index + 1}`,
        question: String(q.question),
        options: q.options.map(String),
        correctAnswer: Number(q.correctAnswer),
        explanation: q.explanation ? String(q.explanation) : undefined,
      }));

    if (questions.length === 0) {
      throw new Error('Nenhuma pergunta válida foi gerada');
    }

    return new Response(
      JSON.stringify({ questions }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err: any) {
    console.error('quiz-generator error:', err);
    return new Response(
      JSON.stringify({ error: err.message ?? 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});