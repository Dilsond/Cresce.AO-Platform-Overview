import { useState, useEffect } from 'react';
import { CheckCircle2, XCircle, Trophy, RotateCcw, ArrowRight, Sparkles, Brain, GraduationCap } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { generateQuizQuestions, GeneratedQuestion } from '../lib/gemini';

interface EventQuizProps {
  eventId: string;
  eventName: string;
  eventDescription: string;
  eventCategory: string;
  eventImage: string;
  currentUser?: {
    id: string;
    type: 'user' | 'organizer' | 'admin';
  } | null;
  onClose: () => void;
}

interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation?: string;
}

const QuizLoading = ({ message }: { message: string }) => (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <div className="bg-white rounded-2xl max-w-md w-full p-8 text-center">
      <div className="relative">
        <div className="w-24 h-24 mx-auto mb-6 relative">
          <div className="absolute inset-0 rounded-full border-4 border-orange-200"></div>
          <div className="absolute inset-0 rounded-full border-4 border-orange-600 border-t-transparent animate-spin"></div>
          <Brain className="absolute inset-0 m-auto w-10 h-10 text-orange-600 animate-pulse" />
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">Preparando Quiz</h3>
        <p className="text-gray-600">{message}</p>
      </div>
    </div>
  </div>
);

export function EventQuiz({ 
  eventId,
  eventName, 
  eventDescription,
  eventCategory, 
  eventImage,
  currentUser,
  onClose 
}: EventQuizProps) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<number[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState(false);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    generateQuestions();
  }, []);

  const generateQuestions = async () => {
    try {
      setIsGenerating(true);
      setError(null);

      // console.log('🤖 Solicitando perguntas ao Gemini...');
      
      const generatedQuestions = await generateQuizQuestions(
        eventName,
        eventDescription,
        eventCategory,
        5
      );

      // console.log('✅ Perguntas geradas:', generatedQuestions);

      const formattedQuestions: QuizQuestion[] = generatedQuestions.map((q, index) => ({
        id: `q-${index}-${Date.now()}`,
        question: q.question,
        options: q.options,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation
      }));

      setQuestions(formattedQuestions);

    } catch (err) {
      console.error('❌ Erro ao gerar quiz:', err);
      setError('Erro ao gerar perguntas. Tente novamente.');
    } finally {
      setIsGenerating(false);
      setIsLoading(false);
    }
  };

  const handleSelectOption = (optionIndex: number) => {
    if (!isAnswerSubmitted) {
      setSelectedOption(optionIndex);
    }
  };

  const handleNextQuestion = () => {
    if (selectedOption !== null && !isAnswerSubmitted) {
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
  };

  const calculateScore = () => {
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

  if (isLoading || isGenerating) {
    return <QuizLoading message={isGenerating ? "Gerando perguntas com Gemini..." : "Carregando quiz..."} />;
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl max-w-md w-full p-8 text-center">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">Erro</h3>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={onClose}
            className="w-full bg-orange-600 text-white py-3 rounded-lg font-semibold hover:bg-orange-700"
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
          <Sparkles className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">Sem Perguntas</h3>
          <p className="text-gray-600 mb-6">Não foi possível gerar perguntas para este evento.</p>
          <button
            onClick={onClose}
            className="w-full bg-orange-600 text-white py-3 rounded-lg font-semibold hover:bg-orange-700"
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
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
        <div className="bg-white rounded-2xl max-w-2xl w-full my-8">
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

          <div className="p-6">
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
                    stroke="#f97316"
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

            <div className="text-center mb-6">
              <h3 className={`text-2xl font-bold mb-2 ${feedback.color}`}>
                {feedback.title}
              </h3>
              <p className="text-gray-600">{feedback.message}</p>
            </div>

            <div className="space-y-4 mb-6 max-h-96 overflow-y-auto">
              <h4 className="font-semibold text-gray-900 text-lg sticky top-0 bg-white py-2">Revisão das Respostas:</h4>
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

            <div className="flex gap-3">
              <button
                onClick={handleRestart}
                className="flex-1 bg-orange-600 text-white py-3 rounded-lg font-semibold hover:bg-orange-700 flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-5 h-5" />
                Refazer Quiz
              </button>
              <button
                onClick={onClose}
                className="flex-1 bg-gray-200 text-gray-900 py-3 rounded-lg font-semibold hover:bg-gray-300"
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
      <div className="bg-white rounded-2xl max-w-2xl w-full">
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

        <div className="bg-orange-600 text-white px-6 py-4">
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

        <div className="p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-6">
            {question.question}
          </h3>

          <div className="space-y-3 mb-6">
            {question.options.map((option, index) => {
              const isCorrectAnswer = index === question.correctAnswer;
              const isSelected = selectedOption === index;
              const showFeedback = isAnswerSubmitted;
              
              let optionClasses = 'w-full text-left p-4 rounded-lg border-2 transition-all ';
              
              if (showFeedback) {
                if (isSelected && isCorrectAnswer) {
                  optionClasses += 'border-green-600 bg-green-50';
                } else if (isSelected && !isCorrectAnswer) {
                  optionClasses += 'border-red-600 bg-red-50';
                } else if (!isSelected && isCorrectAnswer) {
                  optionClasses += 'border-green-600 bg-green-50';
                } else {
                  optionClasses += 'border-gray-200 bg-white opacity-50';
                }
              } else {
                if (isSelected) {
                  optionClasses += 'border-orange-500 bg-orange-50';
                } else {
                  optionClasses += 'border-gray-200 bg-white hover:border-orange-300 hover:bg-orange-50/30';
                }
              }
              
              return (
                <button
                  key={index}
                  onClick={() => handleSelectOption(index)}
                  disabled={showFeedback}
                  className={optionClasses}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 ${
                      showFeedback && isCorrectAnswer ? 'border-green-600 bg-green-600' :
                      showFeedback && isSelected && !isCorrectAnswer ? 'border-red-600 bg-red-600' :
                      isSelected && !showFeedback ? 'border-orange-600 bg-orange-600' :
                      'border-gray-300'
                    }`}>
                      {isSelected && !showFeedback && (
                        <div className="w-3 h-3 bg-white rounded-full m-0.5" />
                      )}
                    </div>
                    <span className={`text-gray-900 ${showFeedback && !isCorrectAnswer && !isSelected ? 'opacity-50' : ''}`}>
                      {option}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

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
              className="flex-1 bg-orange-600 text-white py-3 rounded-lg font-semibold hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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