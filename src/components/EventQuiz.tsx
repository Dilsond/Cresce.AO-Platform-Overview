import { useState, useEffect } from 'react';
import { CheckCircle2, XCircle, Trophy, RotateCcw, ArrowRight, Sparkles } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { generateQuizQuestions, GeneratedQuestion } from '../lib/ia';
import { createQuizWithQuestions, getQuizForEvent, saveUserAnswers, getUserQuizResults } from '../services/quizServices';
import { QuizLoading } from './QuizLoading';

interface EventQuizProps {
  eventId: string;
  eventName: string;
  eventDescription: string;
  eventCategory: 'Palestras' | 'Workshops' | 'Feiras' | 'Masterclasses';
  eventImage: string;
  currentUser?: {
    id: string;
    type: 'user' | 'organizer';
  } | null;
  onClose: () => void;
}

interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation?: string;
  ordem: number;
}

export function EventQuiz({ 
  eventId,
  eventName, 
  eventDescription,
  eventCategory, 
  eventImage,
  currentUser,
  onClose 
}: EventQuizProps) {
  // Estados com valores iniciais seguros
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<number[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState(false);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [quizId, setQuizId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userAnswers, setUserAnswers] = useState<Set<string>>(new Set());

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

  // Carregar ou gerar quiz
  useEffect(() => {
    loadOrGenerateQuiz();
  }, [eventId]);

  // Carregar respostas anteriores do usuário
  useEffect(() => {
    if (quizId && currentUser) {
      loadUserAnswers();
    }
  }, [quizId, currentUser]);

  const loadOrGenerateQuiz = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Tentar buscar quiz existente
      const existingQuiz = await getQuizForEvent(eventId);

      if (existingQuiz) {
        console.log('Quiz existente encontrado:', existingQuiz);
        setQuizId(existingQuiz.id);
        const loadedQuestions = existingQuiz.questoes?.sort((a: any, b: any) => a.ordem - b.ordem) || [];
        setQuestions(loadedQuestions);
      } else {
        // Gerar novo quiz
        await generateNewQuiz();
      }
    } catch (err) {
      console.error('Erro ao carregar quiz:', err);
      setError('Erro ao carregar quiz. Tente novamente.');
      setQuestions([]);
    } finally {
      setIsLoading(false);
    }
  };

  const generateNewQuiz = async () => {
    try {
      setIsGenerating(true);
      setError(null);

      // Gerar perguntas
      const generatedQuestions = await generateQuizQuestions(
        eventName,
        eventDescription,
        eventCategory,
        5
      );

      // Converter para o formato QuizQuestion
      const formattedQuestions: QuizQuestion[] = generatedQuestions.map((q, index) => ({
        id: `temp-${index}`,
        question: q.question,
        options: q.options,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
        ordem: index
      }));

      setQuestions(formattedQuestions);

      // Se tiver usuário logado, salvar no banco
      if (currentUser) {
        try {
          const quizData = {
            evento_id: eventId,
            titulo: `Quiz sobre ${eventName}`,
            descricao: `Teste seus conhecimentos sobre ${eventName}`,
            ...(currentUser?.type === 'user' 
              ? { created_by_usuario: currentUser.id }
              : { created_by_organizador: currentUser?.id })
          };

          const { quiz, questoes } = await createQuizWithQuestions(quizData, generatedQuestions);
          setQuizId(quiz.id);
          setQuestions(questoes.sort((a: any, b: any) => a.ordem - b.ordem));
        } catch (dbError) {
          console.warn('Erro ao salvar quiz no banco, mas perguntas já estão disponíveis:', dbError);
        }
      }
    } catch (err) {
      console.error('Erro ao gerar quiz:', err);
      setError('Erro ao gerar perguntas. Tente novamente.');
      setQuestions([]);
    } finally {
      setIsGenerating(false);
    }
  };

  const loadUserAnswers = async () => {
    if (!quizId || !currentUser) return;

    try {
      const answers = await getUserQuizResults(quizId, currentUser.id, currentUser.type);
      if (answers) {
        const answeredQuestionIds = new Set(answers.map((a: any) => a.questao_id));
        setUserAnswers(answeredQuestionIds);

        // Se já respondeu todas as questões, mostrar resultados
        if (answeredQuestionIds.size === questions.length && questions.length > 0) {
          const answersMap = new Map(answers.map((a: any) => [a.questao_id, a.resposta_selecionada]));
          const userSelectedAnswers = questions.map((q) => {
            const answer = answersMap.get(q.id);
            return answer !== undefined ? answer : -1;
          });
          setSelectedAnswers(userSelectedAnswers);
          setShowResults(true);
        }
      }
    } catch (err) {
      console.error('Erro ao carregar respostas:', err);
    }
  };

  const handleSelectOption = (optionIndex: number) => {
    if (!questions.length) return;
    if (!isAnswerSubmitted && !userAnswers.has(questions[currentQuestion]?.id)) {
      setSelectedOption(optionIndex);
    }
  };

  const handleNextQuestion = async () => {
    if (!questions.length) return;
    if (selectedOption !== null && !isAnswerSubmitted && currentUser) {
      const isCorrect = selectedOption === questions[currentQuestion].correctAnswer;
      
      try {
        if (quizId) {
          await saveUserAnswers(
            quizId,
            questions[currentQuestion].id,
            selectedOption,
            isCorrect,
            currentUser.id,
            currentUser.type
          );
        }
      } catch (err) {
        console.error('Erro ao salvar resposta:', err);
      }

      setIsAnswerSubmitted(true);
      
      setTimeout(() => {
        const newAnswers = [...selectedAnswers, selectedOption];
        setSelectedAnswers(newAnswers);
        
        if (currentQuestion < questions.length - 1) {
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
    setUserAnswers(new Set());
  };

  const calculateScore = () => {
    if (!questions.length) return 0;
    let correct = 0;
    selectedAnswers.forEach((answer, index) => {
      if (answer === questions[index]?.correctAnswer) {
        correct++;
      }
    });
    return correct;
  };

  const getScorePercentage = () => {
    if (questions.length === 0) return 0;
    return (calculateScore() / questions.length) * 100;
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

  // Verificações de segurança ANTES de qualquer renderização
  if (isLoading || isGenerating) {
    return <QuizLoading message={isGenerating ? "Gerando perguntas..." : "Carregando quiz..."} />;
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-8 h-8 text-red-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Erro</h3>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={onClose}
            className="w-full bg-orange-600 text-white py-3 rounded-lg font-semibold hover:bg-orange-700 transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    );
  }

  if (!questions || questions.length === 0) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Sparkles className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Sem Perguntas</h3>
          <p className="text-gray-600 mb-6">Não foi possível carregar as perguntas para este evento.</p>
          <button
            onClick={onClose}
            className="w-full bg-orange-600 text-white py-3 rounded-lg font-semibold hover:bg-orange-700 transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    );
  }

  // Verificar se a questão atual existe
  if (!questions[currentQuestion]) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl max-w-md w-full p-8 text-center">
          <h3 className="text-xl font-bold text-gray-900 mb-2">Erro na Questão</h3>
          <p className="text-gray-600 mb-6">A questão atual não está disponível.</p>
          <button
            onClick={onClose}
            className="w-full bg-orange-600 text-white py-3 rounded-lg font-semibold hover:bg-orange-700 transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    );
  }

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
                  <span className="text-sm text-gray-600">{score}/{questions.length}</span>
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
              {questions.map((question, index) => {
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

  const question = questions[currentQuestion];
  const progress = ((currentQuestion + 1) / questions.length) * 100;

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
            Pergunta {currentQuestion + 1} de {questions.length}
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
                if (isSelected && isCorrectAnswer) {
                  optionClasses += 'border-green-600 bg-green-50';
                  circleClasses += 'border-green-600 bg-green-600';
                  iconElement = <CheckCircle2 className="w-6 h-6 text-green-600" />;
                } else if (isSelected && !isCorrectAnswer) {
                  optionClasses += 'border-red-600 bg-red-50';
                  circleClasses += 'border-red-600 bg-red-600';
                  iconElement = <XCircle className="w-6 h-6 text-red-600" />;
                } else if (!isSelected && isCorrectAnswer) {
                  optionClasses += 'border-green-600 bg-green-50';
                  circleClasses += 'border-green-600 bg-green-600';
                  iconElement = <CheckCircle2 className="w-6 h-6 text-green-600" />;
                } else {
                  optionClasses += 'border-gray-200 bg-white opacity-50';
                  circleClasses += 'border-gray-300';
                }
              } else {
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
                  disabled={showFeedback || userAnswers.has(question.id)}
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
              disabled={selectedOption === null || userAnswers.has(question.id)}
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
              {currentQuestion < questions.length - 1 ? 'Próxima' : 'Finalizar'}
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}