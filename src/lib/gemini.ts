import { GoogleGenerativeAI } from '@google/generative-ai';

// Configuração do Gemini
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

if (!API_KEY) {
  console.warn('⚠️ VITE_GEMINI_API_KEY não configurada. Usando fallback.');
}

const genAI = new GoogleGenerativeAI(API_KEY || 'dummy-key');

export interface GeneratedQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

// Banco de perguntas por categoria (fallback)
const FALLBACK_QUESTIONS_BY_CATEGORY: Record<string, GeneratedQuestion[]> = {
  'palestra': [
    {
      question: "Qual é a principal característica de uma palestra?",
      options: [
        "É interativa e prática",
        "É expositiva, com um orador transmitindo conhecimento",
        "É sempre online",
        "Não requer participação do público"
      ],
      correctAnswer: 1,
      explanation: "Palestras são predominantemente expositivas, onde um especialista compartilha conhecimento com a audiência."
    },
    {
      question: "Como aproveitar melhor uma palestra?",
      options: [
        "Chegar atrasado",
        "Ficar no celular",
        "Fazer perguntas e tomar notas",
        "Sair antes do final"
      ],
      correctAnswer: 2,
      explanation: "Participação ativa com perguntas e anotações maximiza o aprendizado."
    }
  ],
  'workshop': [
    {
      question: "O que diferencia um workshop de uma palestra?",
      options: [
        "É mais curto",
        "Foco na prática e participação ativa",
        "Não tem certificado",
        "É sempre online"
      ],
      correctAnswer: 1,
      explanation: "Workshops são caracterizados pela aprendizagem prática."
    },
    {
      question: "Como se preparar para um workshop?",
      options: [
        "Não precisa preparação",
        "Ler materiais prévios",
        "Apenas aparecer",
        "Chegar atrasado"
      ],
      correctAnswer: 1,
      explanation: "Preparação adequada maximiza o aproveitamento."
    }
  ],
  'feiras': [
    {
      question: "Qual o principal objetivo de uma feira profissional?",
      options: [
        "Apenas passear",
        "Networking e oportunidades",
        "Ganhar brindes",
        "Faltar ao trabalho"
      ],
      correctAnswer: 1,
      explanation: "Feiras são oportunidades para conexões profissionais."
    },
    {
      question: "Como se preparar para uma feira?",
      options: [
        "Não precisa",
        "Pesquisar expositores e levar currículos",
        "Apenas levar dinheiro",
        "Ir sem objetivo"
      ],
      correctAnswer: 1,
      explanation: "Preparação aumenta as chances de sucesso."
    }
  ],
  'masterclasse': [
    {
      question: "O que caracteriza uma masterclass?",
      options: [
        "É para iniciantes",
        "Ensino aprofundado por especialistas",
        "É sempre gratuita",
        "Dura apenas 1 hora"
      ],
      correctAnswer: 1,
      explanation: "Masterclasses oferecem conhecimento especializado de mestres."
    },
    {
      question: "Como aproveitar ao máximo uma masterclass?",
      options: [
        "Assistir passivamente",
        "Estudar material prévio e participar",
        "Gravar para ver depois",
        "Fazer outras atividades"
      ],
      correctAnswer: 1,
      explanation: "Preparação e participação ativa são fundamentais."
    }
  ]
};

// Perguntas genéricas
const GENERIC_QUESTIONS: GeneratedQuestion[] = [
  {
    question: "Qual a importância de participar em eventos profissionais?",
    options: [
      "Apenas sair da rotina",
      "Networking, aprendizado e desenvolvimento",
      "Ganhar brindes",
      "Faltar ao trabalho"
    ],
    correctAnswer: 1,
    explanation: "Eventos oferecem múltiplos benefícios para a carreira."
  },
  {
    question: "Como maximizar o valor de um evento?",
    options: [
      "Chegar atrasado",
      "Participar ativamente e fazer networking",
      "Ficar no celular",
      "Não interagir"
    ],
    correctAnswer: 1,
    explanation: "Participação ativa é chave para extrair valor."
  }
];

function getFallbackQuestions(category: string, count: number): GeneratedQuestion[] {
  console.log(`📚 Usando perguntas de fallback para categoria: ${category}`);

  const categoryQuestions = FALLBACK_QUESTIONS_BY_CATEGORY[category] || GENERIC_QUESTIONS;
  const questions: GeneratedQuestion[] = [];

  for (let i = 0; i < count; i++) {
    const sourceIndex = i % categoryQuestions.length;
    questions.push({ ...categoryQuestions[sourceIndex] });
  }

  return questions;
}

// Função para testar modelos disponíveis
async function listAvailableModels() {
  try {
    const models = await genAI.listModels();
    console.log('📋 Modelos disponíveis:', models);
    return models;
  } catch (error) {
    console.error('Erro ao listar modelos:', error);
  }
}

export async function generateQuizQuestions(
  eventName: string,
  eventDescription: string,
  eventCategory: string,
  numberOfQuestions: number = 5
): Promise<GeneratedQuestion[]> {
  // Verificar se a API key está configurada
  if (!API_KEY) {
    console.log('⚠️ API key não configurada. Usando fallback.');
    return getFallbackQuestions(eventCategory, numberOfQuestions);
  }

  try {
    console.log('🤖 Gerando perguntas com Gemini para:', eventName);

    // Usar gemini-pro que é mais estável
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    const prompt = `
      Gere ${numberOfQuestions} perguntas de quiz sobre o seguinte evento:
      
      Título do Evento: ${eventName}
      Categoria: ${eventCategory}
      Descrição: ${eventDescription}
      
      As perguntas devem ser educativas, relevantes ao tema do evento e ter 4 opções de resposta (apenas uma correta).
      
      Para cada pergunta, forneça:
      1. A pergunta
      2. 4 opções de resposta (apenas uma correta)
      3. O índice da resposta correta (0-3)
      4. Uma breve explicação sobre a resposta correta
      
      Responda APENAS com um array JSON válido no seguinte formato:
      [
        {
          "question": "string",
          "options": ["string", "string", "string", "string"],
          "correctAnswer": number,
          "explanation": "string"
        }
      ]
      
      Não inclua texto adicional, apenas o array JSON.
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    console.log('📦 Resposta do Gemini:', text);

    // Extrair JSON da resposta
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.error('❌ Formato de resposta inválido:', text);
      return getFallbackQuestions(eventCategory, numberOfQuestions);
    }

    const questions = JSON.parse(jsonMatch[0]) as GeneratedQuestion[];

    // Validar estrutura
    questions.forEach((q, index) => {
      if (!q.question || !q.options || !Array.isArray(q.options) || q.options.length !== 4) {
        throw new Error(`Pergunta ${index + 1} com formato inválido`);
      }
      if (typeof q.correctAnswer !== 'number' || q.correctAnswer < 0 || q.correctAnswer > 3) {
        throw new Error(`Pergunta ${index + 1} com índice de resposta inválido`);
      }
    });

    console.log('✅ Perguntas geradas com sucesso pelo Gemini');
    return questions;

  } catch (error) {
    console.error('❌ Erro ao gerar perguntas com Gemini:', error);
    return getFallbackQuestions(eventCategory, numberOfQuestions);
  }
}