import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true
});

export interface GeneratedQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

// Banco de perguntas por categoria (fallback)
const FALLBACK_QUESTIONS_BY_CATEGORY: Record<string, GeneratedQuestion[]> = {
  'Palestras': [
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
        "Chegar atrasado para não perder a introdução",
        "Ficar no celular durante todo o evento",
        "Fazer perguntas relevantes e tomar notas",
        "Sair antes do final"
      ],
      correctAnswer: 2,
      explanation: "Participação ativa com perguntas e anotações maximiza o aprendizado."
    },
    {
      question: "O que é networking em palestras?",
      options: [
        "Uma pausa para café",
        "Conexões profissionais com outros participantes",
        "O material da palestra",
        "O certificado de participação"
      ],
      correctAnswer: 1,
      explanation: "Networking são as interações e conexões profissionais estabelecidas durante o evento."
    },
    {
      question: "Qual a importância de um bom orador?",
      options: [
        "Apenas entreter o público",
        "Transmitir conhecimento de forma clara e envolvente",
        "Falar o mais rápido possível",
        "Usar muitos slides"
      ],
      correctAnswer: 1,
      explanation: "Um bom orador combina conhecimento com habilidades de comunicação para engajar a audiência."
    },
    {
      question: "O que fazer após assistir uma palestra?",
      options: [
        "Esquecer tudo o que foi dito",
        "Aplicar os aprendizados e compartilhar com colegas",
        "Guardar os materiais sem nunca revisar",
        "Criticar o orador nas redes sociais"
      ],
      correctAnswer: 1,
      explanation: "A aplicação prática do conhecimento é fundamental para fixar o aprendizado."
    }
  ],
  
  'Workshops': [
    {
      question: "O que diferencia um workshop de uma palestra?",
      options: [
        "É mais curto",
        "Foco na prática e participação ativa",
        "Não tem certificado",
        "É sempre online"
      ],
      correctAnswer: 1,
      explanation: "Workshops são caracterizados pela aprendizagem prática e hands-on."
    },
    {
      question: "Como se preparar para um workshop?",
      options: [
        "Não precisa preparação",
        "Ler materiais prévios e trazer equipamentos necessários",
        "Apenas aparecer",
        "Chegar atrasado"
      ],
      correctAnswer: 1,
      explanation: "Preparação adequada maximiza o aproveitamento do workshop."
    },
    {
      question: "Qual a atitude ideal durante um workshop?",
      options: [
        "Ficar em silêncio total",
        "Participar ativamente e fazer perguntas",
        "Usar o telemóvel",
        "Sair mais cedo"
      ],
      correctAnswer: 1,
      explanation: "Workshops são interativos e a participação é essencial."
    },
    {
      question: "O que fazer com as habilidades aprendidas?",
      options: [
        "Guardar para usar depois",
        "Praticar imediatamente em projetos reais",
        "Esquecer após o evento",
        "Apenas contar para amigos"
      ],
      correctAnswer: 1,
      explanation: "A prática imediata consolida o aprendizado."
    },
    {
      question: "Qual o tamanho ideal de um workshop?",
      options: [
        "Mais de 100 pessoas",
        "Grupos pequenos para atenção individualizada",
        "Não importa o tamanho",
        "Apenas uma pessoa"
      ],
      correctAnswer: 1,
      explanation: "Workshops funcionam melhor com grupos menores que permitem interação."
    }
  ],
  
  'Feiras': [
    {
      question: "Qual o principal objetivo de uma feira profissional?",
      options: [
        "Apenas passear",
        "Networking e descoberta de oportunidades",
        "Ganhar brindes",
        "Faltar ao trabalho"
      ],
      correctAnswer: 1,
      explanation: "Feiras são oportunidades para conexões profissionais e novas oportunidades."
    },
    {
      question: "Como se preparar para uma feira?",
      options: [
        "Não precisa preparação",
        "Pesquisar expositores e levar currículos atualizados",
        "Apenas levar dinheiro",
        "Ir sem objetivo definido"
      ],
      correctAnswer: 1,
      explanation: "Preparação aumenta as chances de sucesso na feira."
    },
    {
      question: "O que levar para uma feira profissional?",
      options: [
        "Apenas o telemóvel",
        "Currículos, cartões de visita e bloco de notas",
        "Comida e bebida",
        "Roupa casual"
      ],
      correctAnswer: 1,
      explanation: "Materiais profissionais demonstram preparo e seriedade."
    },
    {
      question: "Como abordar expositores em feiras?",
      options: [
        "Gritar para chamar atenção",
        "Ser educado, fazer perguntas relevantes e mostrar interesse",
        "Ignorar completamente",
        "Tirar fotos sem perguntar"
      ],
      correctAnswer: 1,
      explanation: "Abordagem profissional cria impressões positivas."
    },
    {
      question: "O que fazer após a feira?",
      options: [
        "Esquecer todos os contatos",
        "Fazer follow-up com as conexões importantes",
        "Jogar fora os materiais coletados",
        "Não fazer nada"
      ],
      correctAnswer: 1,
      explanation: "Follow-up atempado é crucial para aproveitar oportunidades."
    }
  ],
  
  'Masterclasses': [
    {
      question: "O que caracteriza uma masterclass?",
      options: [
        "É para iniciantes",
        "Ensino aprofundado por especialistas reconhecidos",
        "É sempre gratuita",
        "Dura apenas 1 hora"
      ],
      correctAnswer: 1,
      explanation: "Masterclasses oferecem conhecimento especializado de mestres na área."
    },
    {
      question: "Quem pode participar de uma masterclass?",
      options: [
        "Apenas especialistas",
        "Profissionais com conhecimento base que buscam aprofundamento",
        "Qualquer pessoa sem experiência",
        "Apenas estudantes"
      ],
      correctAnswer: 1,
      explanation: "Masterclasses geralmente exigem conhecimento prévio para máximo aproveitamento."
    },
    {
      question: "Como aproveitar ao máximo uma masterclass?",
      options: [
        "Assistir passivamente",
        "Estudar material prévio e participar ativamente",
        "Gravar para ver depois",
        "Fazer outras atividades durante"
      ],
      correctAnswer: 1,
      explanation: "Preparação e participação ativa são fundamentais."
    },
    {
      question: "Qual o valor de certificados de masterclasses?",
      options: [
        "Não têm valor",
        "Validam conhecimento especializado e diferenciam profissionalmente",
        "Apenas servem para decoração",
        "Substituem experiência prática"
      ],
      correctAnswer: 1,
      explanation: "Certificados de masterclasses reconhecidas atestam especialização e podem ser diferenciais competitivos."
    },
    {
      question: "Como aplicar conhecimentos de masterclasses?",
      options: [
        "Guardar como teoria",
        "Implementar gradualmente em projetos reais",
        "Esquecer após o curso",
        "Apenas mencionar no currículo"
      ],
      correctAnswer: 1,
      explanation: "A aplicação prática do conhecimento avançado gera valor real."
    }
  ]
};

// Perguntas genéricas para qualquer categoria ou quando a categoria não é encontrada
const GENERIC_FALLBACK_QUESTIONS: GeneratedQuestion[] = [
  {
    question: "Qual a importância de participar em eventos profissionais?",
    options: [
      "Apenas para sair da rotina",
      "Networking, aprendizado e desenvolvimento profissional",
      "Ganhar brindes",
      "Faltar ao trabalho"
    ],
    correctAnswer: 1,
    explanation: "Eventos profissionais oferecem múltiplos benefícios para o crescimento na carreira."
  },
  {
    question: "Como maximizar o valor de um evento?",
    options: [
      "Chegar atrasado e sair mais cedo",
      "Participar ativamente, fazer networking e aplicar os aprendizados",
      "Ficar no celular durante todo o evento",
      "Não interagir com ninguém"
    ],
    correctAnswer: 1,
    explanation: "Participação ativa e networking são chaves para extrair máximo valor de eventos."
  },
  {
    question: "O que fazer antes de um evento?",
    options: [
      "Não precisa preparação",
      "Pesquisar sobre o tema, palestrantes e definir objetivos",
      "Dormir tarde para chegar cansado",
      "Esquecer o evento"
    ],
    correctAnswer: 1,
    explanation: "Preparação prévia aumenta significativamente o aproveitamento do evento."
  },
  {
    question: "Qual a melhor forma de fazer networking em eventos?",
    options: [
      "Falar apenas com quem já conhece",
      "Ter conversas genuínas e trocar contactos estrategicamente",
      "Distribuir currículos para todos",
      "Ignorar os outros participantes"
    ],
    correctAnswer: 1,
    explanation: "Networking eficaz baseia-se em conexões autênticas e de qualidade."
  },
  {
    question: "Como avaliar se um evento foi proveitoso?",
    options: [
      "Pela quantidade de coffee breaks",
      "Pelos aprendizados adquiridos e contactos estabelecidos",
      "Pela duração do evento",
      "Se teve certificado ou não"
    ],
    correctAnswer: 1,
    explanation: "O valor real de um evento mede-se pelos conhecimentos e conexões obtidos."
  }
];

export async function generateQuizQuestions(
  eventName: string,
  eventDescription: string,
  eventCategory: string,
  numberOfQuestions: number = 5
): Promise<GeneratedQuestion[]> {
  // Verificar se temos API key configurada
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
  
  // Se não tiver API key ou for a padrão, usar fallback imediatamente
  if (!apiKey || apiKey === 'sua_chave_api_aqui' || apiKey === '') {
    console.log('API key não configurada. Usando perguntas de fallback.');
    return getFallbackQuestions(eventCategory, numberOfQuestions);
  }

  try {
    console.log('Tentando gerar perguntas com OpenAI...');
    
    const prompt = `
      Gere ${numberOfQuestions} perguntas de quiz sobre o seguinte evento:
      
      Título: ${eventName}
      Categoria: ${eventCategory}
      Descrição: ${eventDescription}
      
      Para cada pergunta, forneça:
      1. A pergunta
      2. 4 opções de resposta (apenas uma correta)
      3. O índice da resposta correta (0-3)
      4. Uma breve explicação sobre a resposta correta
      
      Formato a resposta como um array JSON válido com a seguinte estrutura:
      [
        {
          "question": "string",
          "options": ["string", "string", "string", "string"],
          "correctAnswer": number,
          "explanation": "string"
        }
      ]
      
      As perguntas devem ser relevantes ao tema do evento e educativas.
      Retorne APENAS o array JSON, sem texto adicional.
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { 
          role: "system", 
          content: "Você é um assistente especializado em criar quizzes educativos sobre eventos." 
        },
        { 
          role: "user", 
          content: prompt 
        }
      ],
      temperature: 0.7,
      max_tokens: 2000
    });

    const content = response.choices[0].message.content;
    if (!content) throw new Error('Resposta vazia da IA');

    // Extrair JSON da resposta
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error('Formato de resposta inválido');

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

    console.log('Perguntas geradas com sucesso pela OpenAI');
    return questions;

  } catch (error) {
    console.warn('Erro ao usar OpenAI, usando fallback:', error);
    return getFallbackQuestions(eventCategory, numberOfQuestions);
  }
}

function getFallbackQuestions(category: string, count: number): GeneratedQuestion[] {
  console.log(`Gerando perguntas de fallback para categoria: ${category}`);
  
  // Pegar perguntas da categoria específica ou genéricas
  const categoryQuestions = FALLBACK_QUESTIONS_BY_CATEGORY[category] || GENERIC_FALLBACK_QUESTIONS;
  
  const questions: GeneratedQuestion[] = [];
  
  // Se precisar de mais perguntas do que temos, repetir ciclicamente
  for (let i = 0; i < count; i++) {
    const sourceIndex = i % categoryQuestions.length;
    const sourceQuestion = categoryQuestions[sourceIndex];
    
    // Criar uma cópia para não modificar o original
    questions.push({
      ...sourceQuestion,
      // Adaptar a pergunta para o evento específico se necessário
      question: sourceQuestion.question.replace(
        /evento|workshop|palestra|feira|masterclass/gi,
        category.toLowerCase()
      )
    });
  }
  
  return questions;
}