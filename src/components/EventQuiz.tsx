import { useState } from 'react';
import { CheckCircle2, XCircle, Trophy, RotateCcw, ArrowRight } from 'lucide-react';

interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation?: string;
}

interface EventQuizProps {
  eventName: string;
  eventCategory: 'Palestras' | 'Workshops' | 'Feiras' | 'Masterclasses';
  eventImage: string;
  onClose: () => void;
}

// Quiz data organizado por categoria de evento
const quizQuestionsByCategory: Record<string, QuizQuestion[]> = {
  'ANGOTIC': [
    {
      id: 1,
      question: "O que significa a sigla ANGOTIC?",
      options: [
        "Angola Tecnologia e Informação Corporativa",
        "Angola International Technology Conference",
        "Angola International Forum of Information and Communication Technologies",
        "Associação Nacional de Gestão Tecnológica"
      ],
      correctAnswer: 2,
      explanation: "ANGOTIC significa Angola International Forum of Information and Communication Technologies, representando o maior fórum de tecnologias de informação do país."
    },
    {
      id: 2,
      question: "O ANGOTIC é organizado principalmente por qual entidade?",
      options: [
        "Ministério das Telecomunicações, Tecnologias de Informação e Comunicação Social",
        "Banco Nacional de Angola",
        "Ministério da Educação",
        "União Africana"
      ],
      correctAnswer: 0,
      explanation: "O ANGOTIC é organizado pelo Ministério das Telecomunicações, Tecnologias de Informação e Comunicação Social de Angola."
    },
    {
      id: 3,
      question: "Qual é o principal objetivo do ANGOTIC?",
      options: [
        "Promover turismo internacional",
        "Incentivar inovação tecnológica e networking digital",
        "Vender equipamentos eletrónicos",
        "Criar jogos digitais"
      ],
      correctAnswer: 1,
      explanation: "O ANGOTIC tem como principal objetivo incentivar a inovação tecnológica, promover networking digital e discutir o futuro das TIC em Angola."
    },
    {
      id: 4,
      question: "Quem pode participar no ANGOTIC?",
      options: [
        "Apenas engenheiros informáticos",
        "Apenas empresas estrangeiras",
        "Startups, empresas, estudantes e especialistas",
        "Apenas membros do governo"
      ],
      correctAnswer: 2,
      explanation: "O ANGOTIC é aberto a todos os interessados em tecnologia: startups, empresas nacionais e internacionais, estudantes, especialistas e profissionais do setor."
    },
    {
      id: 5,
      question: "O ANGOTIC normalmente inclui quais atividades?",
      options: [
        "Shows musicais apenas",
        "Competições desportivas",
        "Palestras, exposições tecnológicas e workshops",
        "Filmes e teatro"
      ],
      correctAnswer: 2,
      explanation: "O ANGOTIC oferece um programa completo com palestras de especialistas, exposições de produtos tecnológicos, workshops práticos e oportunidades de networking."
    }
  ],
  'Palestras': [
    {
      id: 1,
      question: "Qual é a principal vantagem de participar em palestras profissionais?",
      options: [
        "Apenas ouvir palestras passivamente",
        "Obter conhecimento atualizado e insights de especialistas",
        "Receber certificados automáticos",
        "Evitar trabalho durante o horário do evento"
      ],
      correctAnswer: 1,
      explanation: "Palestras oferecem conhecimento direto de especialistas e permitem aprender com suas experiências práticas."
    },
    {
      id: 2,
      question: "Como maximizar o valor de uma palestra?",
      options: [
        "Apenas assistir sem tomar notas",
        "Chegar atrasado para evitar introduções",
        "Fazer perguntas relevantes e participar ativamente",
        "Usar o telemóvel durante toda a palestra"
      ],
      correctAnswer: 2,
      explanation: "Participação ativa, incluindo perguntas, aumenta significativamente o valor e aprendizado em palestras."
    },
    {
      id: 3,
      question: "O que caracteriza um bom orador em palestras profissionais?",
      options: [
        "Falar sem parar sem considerar o público",
        "Usar apenas termos técnicos complexos",
        "Comunicar de forma clara e envolver a audiência",
        "Ler diretamente dos slides"
      ],
      correctAnswer: 2,
      explanation: "Clareza na comunicação e capacidade de engajamento são fundamentais para transmitir conhecimento eficazmente."
    },
    {
      id: 4,
      question: "Qual é o benefício do networking durante palestras?",
      options: [
        "Não há benefício em conversar com outros",
        "Conectar-se com profissionais de interesses similares",
        "Apenas colecionar cartões de visita",
        "Competir com outros participantes"
      ],
      correctAnswer: 1,
      explanation: "Palestras reúnem pessoas com interesses comuns, criando oportunidades valiosas de conexão profissional."
    },
    {
      id: 5,
      question: "Como aplicar o conhecimento adquirido em palestras?",
      options: [
        "Esquecer tudo após o evento",
        "Apenas guardar os materiais sem revisar",
        "Implementar ações concretas baseadas nos aprendizados",
        "Esperar que mudanças aconteçam automaticamente"
      ],
      correctAnswer: 2,
      explanation: "O valor real de uma palestra vem da aplicação prática dos conhecimentos adquiridos."
    }
  ],
  'Workshops': [
    {
      id: 1,
      question: "O que diferencia um workshop de uma palestra tradicional?",
      options: [
        "Workshops são sempre mais caros",
        "Workshops focam em aprendizagem prática e participação ativa",
        "Workshops não precisam de preparação",
        "Workshops são apenas para iniciantes"
      ],
      correctAnswer: 1,
      explanation: "Workshops são experiências práticas e interativas onde os participantes aprendem fazendo."
    },
    {
      id: 2,
      question: "Como se preparar adequadamente para um workshop?",
      options: [
        "Não é necessário preparação prévia",
        "Apenas aparecer no dia",
        "Pesquisar o tema, trazer materiais e estar pronto para participar",
        "Deixar outros fazerem o trabalho"
      ],
      correctAnswer: 2,
      explanation: "A preparação prévia maximiza o aproveitamento e permite participação mais significativa no workshop."
    },
    {
      id: 3,
      question: "Qual é a atitude ideal durante um workshop?",
      options: [
        "Observar passivamente sem interagir",
        "Dominar todas as conversas",
        "Participar ativamente, fazer perguntas e colaborar",
        "Criticar todas as ideias apresentadas"
      ],
      correctAnswer: 2,
      explanation: "Workshops prosperam com participação ativa e colaboração construtiva entre todos os participantes."
    },
    {
      id: 4,
      question: "O que fazer com as competências aprendidas num workshop?",
      options: [
        "Guardar apenas como conhecimento teórico",
        "Praticar e aplicar imediatamente no trabalho",
        "Esperar meses para começar a usar",
        "Apenas mencionar no currículo"
      ],
      correctAnswer: 1,
      explanation: "A aplicação imediata das competências práticas solidifica o aprendizado e gera resultados concretos."
    },
    {
      id: 5,
      question: "Como avaliar se um workshop foi eficaz?",
      options: [
        "Apenas pela duração do evento",
        "Se recebeu certificado ou não",
        "Se adquiriu competências aplicáveis e conhecimento prático",
        "Pelo número de pausas para café"
      ],
      correctAnswer: 2,
      explanation: "A eficácia de um workshop mede-se pela capacidade de aplicar as competências aprendidas na prática."
    }
  ],
  'Feiras': [
    {
      id: 1,
      question: "Qual é o principal objetivo de participar numa feira profissional?",
      options: [
        "Apenas passear e ver estandes",
        "Networking estratégico e descoberta de oportunidades",
        "Colecionar brindes gratuitos",
        "Evitar o escritório por um dia"
      ],
      correctAnswer: 1,
      explanation: "Feiras são oportunidades únicas para fazer conexões estratégicas e descobrir novas oportunidades de carreira."
    },
    {
      id: 2,
      question: "Como se destacar numa feira de oportunidades?",
      options: [
        "Vestir roupa casual e informal",
        "Ter um currículo atualizado e elevator pitch preparado",
        "Visitar apenas um ou dois estandes",
        "Não fazer perguntas para evitar constrangimento"
      ],
      correctAnswer: 1,
      explanation: "Preparação profissional com currículo e pitch bem elaborados aumenta significativamente as chances de sucesso."
    },
    {
      id: 3,
      question: "Qual é a melhor estratégia para networking em feiras?",
      options: [
        "Falar apenas com pessoas que já conhece",
        "Distribuir cartões a todos sem conversar",
        "Ter conversas genuínas e trocar contactos estrategicamente",
        "Evitar contacto visual"
      ],
      correctAnswer: 2,
      explanation: "Networking eficaz em feiras baseia-se em conversas autênticas e conexões estratégicas de qualidade."
    },
    {
      id: 4,
      question: "O que fazer após participar numa feira?",
      options: [
        "Esquecer todos os contactos feitos",
        "Fazer follow-up rápido com as conexões relevantes",
        "Esperar que as empresas entrem em contacto",
        "Guardar cartões sem contactar ninguém"
      ],
      correctAnswer: 1,
      explanation: "O follow-up atempado demonstra profissionalismo e mantém as oportunidades vivas após a feira."
    },
    {
      id: 5,
      question: "Como pesquisar empresas antes de uma feira?",
      options: [
        "Não é necessário pesquisar previamente",
        "Ver apenas o nome das empresas",
        "Estudar perfil, cultura e vagas disponíveis das empresas alvo",
        "Confiar apenas na impressão do momento"
      ],
      correctAnswer: 2,
      explanation: "Pesquisa prévia permite conversas mais informadas e demonstra interesse genuíno nas empresas."
    }
  ],
  'Masterclasses': [
    {
      id: 1,
      question: "O que distingue uma masterclass de outros formatos de aprendizagem?",
      options: [
        "É sempre gratuita e aberta a todos",
        "Ensino aprofundado por especialistas reconhecidos",
        "Duração mais curta que workshops",
        "Não requer participação ativa"
      ],
      correctAnswer: 1,
      explanation: "Masterclasses oferecem conhecimento especializado e aprofundado de mestres reconhecidos nas suas áreas."
    },
    {
      id: 2,
      question: "Qual é o nível esperado de participantes em masterclasses?",
      options: [
        "Apenas iniciantes completos",
        "Profissionais com conhecimento base que desejam especializar-se",
        "Apenas especialistas avançados",
        "Qualquer pessoa sem interesse específico"
      ],
      correctAnswer: 1,
      explanation: "Masterclasses geralmente exigem conhecimento base e visam elevar competências a nível avançado."
    },
    {
      id: 3,
      question: "Como maximizar o aprendizado numa masterclass?",
      options: [
        "Apenas assistir passivamente",
        "Estudar material prévio, participar ativamente e praticar após",
        "Focar apenas em tirar fotografias",
        "Comparar-se constantemente com outros"
      ],
      correctAnswer: 1,
      explanation: "Preparação, participação ativa e prática posterior são chaves para extrair máximo valor de masterclasses."
    },
    {
      id: 4,
      question: "Qual é o valor de certificados de masterclasses?",
      options: [
        "Apenas servem para decoração",
        "Validam conhecimento especializado e podem diferenciar profissionalmente",
        "Não têm nenhum valor",
        "Substituem completamente a experiência prática"
      ],
      correctAnswer: 1,
      explanation: "Certificados de masterclasses reconhecidas atestam especialização e podem ser diferenciadores competitivos."
    },
    {
      id: 5,
      question: "Como aplicar conhecimentos avançados de masterclasses?",
      options: [
        "Guardar como curiosidade teórica",
        "Implementar gradualmente em projetos reais e casos práticos",
        "Apenas mencionar em conversas casuais",
        "Esperar oportunidades perfeitas que nunca chegam"
      ],
      correctAnswer: 1,
      explanation: "Conhecimento avançado ganha valor real quando aplicado sistematicamente em contextos práticos."
    }
  ]
};

export function EventQuiz({ eventName, eventCategory, eventImage, onClose }: EventQuizProps) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<number[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState(false);

  // Detect if this is ANGOTIC event and use specific questions
  const quizCategory = eventName.toUpperCase().includes('ANGOTIC') ? 'ANGOTIC' : eventCategory;

  // Color scheme based on event category
  const getColorScheme = () => {
    if (eventName.toUpperCase().includes('ANGOTIC')) {
      return {
        gradient: 'from-blue-600 to-indigo-600',
        primaryBg: '#2563eb',
        primaryHoverBg: '#1d4ed8',
        lightBg: '#eff6ff',
        borderColor: '#93c5fd',
        ringColor: '#bfdbfe',
        circleStroke: '#2563eb'
      };
    }
    
    switch (eventCategory) {
      case 'Palestras':
        return {
          gradient: 'from-purple-600 to-pink-600',
          primaryBg: '#9333ea',
          primaryHoverBg: '#7e22ce',
          lightBg: '#faf5ff',
          borderColor: '#e9d5ff',
          ringColor: '#d8b4fe',
          circleStroke: '#9333ea'
        };
      case 'Workshops':
        return {
          gradient: 'from-orange-600 to-amber-600',
          primaryBg: '#ea580c',
          primaryHoverBg: '#c2410c',
          lightBg: '#fff7ed',
          borderColor: '#fed7aa',
          ringColor: '#fdba74',
          circleStroke: '#ea580c'
        };
      case 'Feiras':
        return {
          gradient: 'from-emerald-600 to-teal-600',
          primaryBg: '#059669',
          primaryHoverBg: '#047857',
          lightBg: '#f0fdf4',
          borderColor: '#a7f3d0',
          ringColor: '#6ee7b7',
          circleStroke: '#059669'
        };
      case 'Masterclasses':
        return {
          gradient: 'from-rose-600 to-red-600',
          primaryBg: '#e11d48',
          primaryHoverBg: '#be123c',
          lightBg: '#fff1f2',
          borderColor: '#fecdd3',
          ringColor: '#fda4af',
          circleStroke: '#e11d48'
        };
      default:
        return {
          gradient: 'from-orange-600 to-red-600',
          primaryBg: '#ea580c',
          primaryHoverBg: '#c2410c',
          lightBg: '#fff7ed',
          borderColor: '#fed7aa',
          ringColor: '#fdba74',
          circleStroke: '#ea580c'
        };
    }
  };

  const colors = getColorScheme();

  const handleSelectOption = (optionIndex: number) => {
    if (!isAnswerSubmitted) {
      setSelectedOption(optionIndex);
    }
  };

  const handleNextQuestion = () => {
    if (selectedOption !== null && !isAnswerSubmitted) {
      // Submit the answer and show feedback
      setIsAnswerSubmitted(true);
      
      // Wait 2 seconds before moving to next question
      setTimeout(() => {
        const newAnswers = [...selectedAnswers, selectedOption];
        setSelectedAnswers(newAnswers);
        
        if (currentQuestion < quizQuestionsByCategory[quizCategory].length - 1) {
          setCurrentQuestion(currentQuestion + 1);
          setSelectedOption(null);
          setIsAnswerSubmitted(false);
        } else {
          setShowResults(true);
        }
      }, 2000);
    }
  };

  const handleRestart = () => {
    setCurrentQuestion(0);
    setSelectedAnswers([]);
    setShowResults(false);
    setSelectedOption(null);
  };

  const calculateScore = () => {
    let correct = 0;
    selectedAnswers.forEach((answer, index) => {
      if (answer === quizQuestionsByCategory[quizCategory][index].correctAnswer) {
        correct++;
      }
    });
    return correct;
  };

  const getScorePercentage = () => {
    return (calculateScore() / quizQuestionsByCategory[quizCategory].length) * 100;
  };

  const getFeedbackMessage = () => {
    const percentage = getScorePercentage();
    if (percentage === 100) {
      return {
        title: "Excelente! Desempenho Perfeito! 🎉",
        message: "Parabéns! Você domina completamente os conceitos abordados.",
        color: "text-green-600"
      };
    } else if (percentage >= 80) {
      return {
        title: "Muito Bom! 👏",
        message: "Ótimo desempenho! Você tem um bom domínio dos conceitos.",
        color: "text-blue-600"
      };
    } else if (percentage >= 60) {
      return {
        title: "Bom Desempenho! 👍",
        message: "Bom trabalho! Continue estudando para melhorar ainda mais.",
        color: "text-orange-600"
      };
    } else {
      return {
        title: "Pode Melhorar 📚",
        message: "Recomendamos rever os materiais e tentar novamente.",
        color: "text-red-600"
      };
    }
  };

  if (showResults) {
    const score = calculateScore();
    const percentage = getScorePercentage();
    const feedback = getFeedbackMessage();

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          {/* Event Image */}
          <div className="relative h-48 rounded-t-2xl overflow-hidden">
            <img 
              src={eventImage} 
              alt={eventName}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>
            <div className="absolute bottom-4 left-6 right-6">
              <div className="flex items-center justify-center mb-2">
                <Trophy className="w-12 h-12 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-center text-white">Resultados do Quiz</h2>
              <p className="text-center text-white/90 text-sm mt-1">{eventName}</p>
            </div>
          </div>

          {/* Results */}
          <div className="p-6">
            {/* Score Circle */}
            <div className="flex justify-center mb-6">
              <div className="relative w-40 h-40">
                <svg className="w-40 h-40 transform -rotate-90">
                  <circle
                    cx="80"
                    cy="80"
                    r="70"
                    stroke="#e5e7eb"
                    strokeWidth="12"
                    fill="none"
                  />
                  <circle
                    cx="80"
                    cy="80"
                    r="70"
                    stroke={colors.circleStroke}
                    strokeWidth="12"
                    fill="none"
                    strokeDasharray={`${2 * Math.PI * 70}`}
                    strokeDashoffset={`${2 * Math.PI * 70 * (1 - percentage / 100)}`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center flex-col">
                  <span className="text-4xl font-bold text-gray-900">{percentage.toFixed(0)}%</span>
                  <span className="text-sm text-gray-600">{score}/{quizQuestionsByCategory[quizCategory].length}</span>
                </div>
              </div>
            </div>

            {/* Feedback Message */}
            <div className="text-center mb-6">
              <h3 className={`text-2xl font-bold mb-2 ${feedback.color}`}>
                {feedback.title}
              </h3>
              <p className="text-gray-600">{feedback.message}</p>
            </div>

            {/* Review Answers */}
            <div className="space-y-4 mb-6">
              <h4 className="font-semibold text-gray-900 text-lg">Revisão das Respostas:</h4>
              {quizQuestionsByCategory[quizCategory].map((question, index) => {
                const userAnswer = selectedAnswers[index];
                const isCorrect = userAnswer === question.correctAnswer;
                
                return (
                  <div key={question.id} className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-start gap-3 mb-2">
                      {isCorrect ? (
                        <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
                      ) : (
                        <XCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
                      )}
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900 mb-2">
                          {index + 1}. {question.question}
                        </p>
                        <p className="text-sm text-gray-600 mb-1">
                          <span className="font-medium">Sua resposta:</span> {question.options[userAnswer]}
                        </p>
                        {!isCorrect && (
                          <p className="text-sm text-green-700 mb-1">
                            <span className="font-medium">Resposta correta:</span> {question.options[question.correctAnswer]}
                          </p>
                        )}
                        {question.explanation && (
                          <p className="text-sm text-gray-500 italic mt-2">
                            💡 {question.explanation}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={handleRestart}
                style={{ backgroundColor: colors.primaryBg }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.primaryHoverBg}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = colors.primaryBg}
                className="flex-1 flex items-center justify-center gap-2 text-white py-3 rounded-lg font-semibold transition-colors"
              >
                <RotateCcw className="w-5 h-5" />
                Refazer Quiz
              </button>
              <button
                onClick={onClose}
                className="flex-1 bg-gray-200 text-gray-900 py-3 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const question = quizQuestionsByCategory[quizCategory][currentQuestion];
  const progress = ((currentQuestion + 1) / quizQuestionsByCategory[quizCategory].length) * 100;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Event Image */}
        <div className="relative h-48 rounded-t-2xl overflow-hidden">
          <img 
            src={eventImage} 
            alt={eventName}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>
          <div className="absolute bottom-4 left-6 right-6">
            <h2 className="text-2xl font-bold text-white">Quiz Educativo</h2>
            <p className="text-white/90 text-sm mt-1">{eventName}</p>
          </div>
        </div>

        {/* Header with Progress */}
        <div className={`bg-gradient-to-r ${colors.gradient} text-white px-6 py-4`}>
          {/* Progress Bar */}
          <div className="bg-white/20 rounded-full h-2 overflow-hidden">
            <div 
              className="bg-white h-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-sm text-white/90 mt-2">
            Pergunta {currentQuestion + 1} de {quizQuestionsByCategory[quizCategory].length}
          </p>
        </div>

        {/* Question Content */}
        <div className="p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-6">
            {question.question}
          </h3>

          {/* Options */}
          <div className="space-y-3 mb-6">
            {question.options.map((option, index) => {
              const isCorrectAnswer = index === question.correctAnswer;
              const isSelected = selectedOption === index;
              const showFeedback = isAnswerSubmitted;
              
              let optionClasses = 'w-full text-left p-4 rounded-lg border-2 transition-all ';
              let circleClasses = 'w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ';
              let iconElement = null;
              let optionStyle = {};
              let circleStyle = {};
              
              if (showFeedback) {
                // Show feedback after submission
                if (isSelected && isCorrectAnswer) {
                  // Selected and correct - Green
                  optionClasses += 'border-green-600 bg-green-50';
                  circleClasses += 'border-green-600 bg-green-600';
                  iconElement = <CheckCircle2 className="w-6 h-6 text-green-600" />;
                } else if (isSelected && !isCorrectAnswer) {
                  // Selected but wrong - Red
                  optionClasses += 'border-red-600 bg-red-50';
                  circleClasses += 'border-red-600 bg-red-600';
                  iconElement = <XCircle className="w-6 h-6 text-red-600" />;
                } else if (!isSelected && isCorrectAnswer) {
                  // Not selected but is correct answer - Show in green
                  optionClasses += 'border-green-600 bg-green-50';
                  circleClasses += 'border-green-600 bg-green-600';
                  iconElement = <CheckCircle2 className="w-6 h-6 text-green-600" />;
                } else {
                  // Not selected and not correct
                  optionClasses += 'border-gray-200 bg-white opacity-50';
                  circleClasses += 'border-gray-300';
                }
              } else {
                // Before submission - normal selection with dynamic colors
                if (isSelected) {
                  optionClasses += 'bg-white';
                  optionStyle = {
                    borderColor: colors.borderColor,
                    backgroundColor: colors.lightBg
                  };
                  circleStyle = {
                    borderColor: colors.primaryBg,
                    backgroundColor: colors.primaryBg
                  };
                  circleClasses += '';
                } else {
                  optionClasses += 'border-gray-200 bg-white';
                  circleClasses += 'border-gray-300';
                }
              }
              
              return (
                <button
                  key={index}
                  onClick={() => handleSelectOption(index)}
                  disabled={showFeedback}
                  className={optionClasses}
                  style={optionStyle}
                >
                  <div className="flex items-center gap-3">
                    {showFeedback && iconElement ? (
                      iconElement
                    ) : (
                      <div className={circleClasses} style={circleStyle}>
                        {isSelected && !showFeedback && (
                          <div className="w-3 h-3 bg-white rounded-full" />
                        )}
                      </div>
                    )}
                    <span className={`text-gray-900 ${showFeedback && !isCorrectAnswer && !isSelected ? 'opacity-50' : ''}`}>
                      {option}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Explanation after submission */}
          {isAnswerSubmitted && question.explanation && (
            <div className={`mb-6 p-4 rounded-lg ${
              selectedOption === question.correctAnswer 
                ? 'bg-green-50 border border-green-200' 
                : 'bg-blue-50 border border-blue-200'
            }`}>
              <p className="text-sm text-gray-700">
                <span className="font-semibold">💡 Explicação:</span> {question.explanation}
              </p>
            </div>
          )}

          {/* Navigation */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-6 py-3 bg-gray-200 text-gray-900 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleNextQuestion}
              disabled={selectedOption === null}
              style={{
                backgroundColor: selectedOption === null ? '#d1d5db' : colors.primaryBg,
                cursor: selectedOption === null ? 'not-allowed' : 'pointer'
              }}
              onMouseEnter={(e) => {
                if (selectedOption !== null) {
                  e.currentTarget.style.backgroundColor = colors.primaryHoverBg;
                }
              }}
              onMouseLeave={(e) => {
                if (selectedOption !== null) {
                  e.currentTarget.style.backgroundColor = colors.primaryBg;
                }
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-semibold transition-colors ${
                selectedOption === null
                  ? 'text-gray-500'
                  : 'text-white'
              }`}
            >
              {currentQuestion < quizQuestionsByCategory[quizCategory].length - 1 ? 'Próxima' : 'Finalizar'}
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}