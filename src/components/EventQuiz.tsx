import { useState, useEffect } from 'react';
import { CheckCircle2, XCircle, Trophy, RotateCcw, ArrowRight, Sparkles, Brain } from 'lucide-react';

interface EventQuizProps {
  eventId: string;
  eventName: string;
  eventDescription?: string;
  eventCategory?: string;
  eventImage?: string;
  currentUser?: { id: string; type: 'user' | 'organizer' | 'admin' } | null;
  onClose: () => void;
}

interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation?: string;
}

// ─── Loading ──────────────────────────────────────────────────────────────────
const QuizLoading = ({ message }: { message: string }) => (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <div className="bg-white rounded-2xl max-w-md w-full p-8 text-center">
      <div className="w-24 h-24 mx-auto mb-6 relative">
        <div className="absolute inset-0 rounded-full border-4 border-orange-200" />
        <div className="absolute inset-0 rounded-full border-4 border-orange-600 border-t-transparent animate-spin" />
        <Brain className="absolute inset-0 m-auto w-10 h-10 text-orange-600 animate-pulse" />
      </div>
      <h3 className="text-xl font-bold text-gray-900 mb-2">Preparando Quiz</h3>
      <p className="text-gray-600">{message}</p>
      <p className="text-sm text-gray-400 mt-2">A IA está a criar perguntas personalizadas...</p>
    </div>
  </div>
);

// ─── Chama a Netlify Function — a chave fica segura no servidor ───────────────
async function generateQuizWithAI(
  eventName: string,
  eventDescription: string,
  eventCategory: string,
  numberOfQuestions = 5
): Promise<QuizQuestion[]> {
  const response = await fetch('/.netlify/functions/quiz-generator', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ eventName, eventDescription, eventCategory, numberOfQuestions }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.error ?? `Erro ${response.status} ao gerar quiz`);
  }

  if (!Array.isArray(data?.questions) || data.questions.length === 0) {
    throw new Error('Nenhuma pergunta válida foi gerada. Tenta novamente.');
  }

  return data.questions;
}

// ─── Componente principal ─────────────────────────────────────────────────────
export function EventQuiz({
  eventId,
  eventName,
  eventDescription = '',
  eventCategory = 'Geral',
  eventImage = 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800',
  currentUser,
  onClose,
}: EventQuizProps) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<number[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState(false);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { generateQuestions(); }, []);

  const generateQuestions = async () => {
    setIsLoading(true);
    setError(null);
    setCurrentQuestion(0);
    setSelectedAnswers([]);
    setShowResults(false);
    setSelectedOption(null);
    setIsAnswerSubmitted(false);
    try {
      const q = await generateQuizWithAI(eventName, eventDescription, eventCategory, 5);
      setQuestions(q);
    } catch (err: any) {
      setError(err.message || 'Erro ao gerar perguntas. Tenta novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectOption = (i: number) => { if (!isAnswerSubmitted) setSelectedOption(i); };

  const handleNextQuestion = () => {
    if (selectedOption === null || isAnswerSubmitted) return;
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
  };

  const calculateScore = () =>
    selectedAnswers.reduce((acc, ans, i) => acc + (ans === questions[i]?.correctAnswer ? 1 : 0), 0);

  const getScorePercentage = () => (questions.length === 0 ? 0 : (calculateScore() / questions.length) * 100);

  const getFeedback = () => {
    const p = getScorePercentage();
    if (p === 100) return { title: 'Excelente! Desempenho Perfeito! 🎉', msg: 'Parabéns! Dominas completamente os conceitos abordados.', color: 'text-green-600' };
    if (p >= 80)  return { title: 'Muito Bom! 👏', msg: 'Ótimo desempenho! Tens um bom domínio dos conceitos.', color: 'text-blue-600' };
    if (p >= 60)  return { title: 'Bom Desempenho! 👍', msg: 'Bom trabalho! Continua a estudar para melhorar ainda mais.', color: 'text-orange-600' };
    return { title: 'Pode Melhorar 📚', msg: 'Recomendamos rever os materiais e tentar novamente.', color: 'text-red-600' };
  };

  const fallbackImg = 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800';
  const onImgError = (e: React.SyntheticEvent<HTMLImageElement>) => { (e.target as HTMLImageElement).src = fallbackImg; };

  // ── Estados de ecrã ────────────────────────────────────────────────────────
  if (isLoading) return <QuizLoading message="A IA está a gerar perguntas personalizadas para este evento..." />;

  if (error) return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-8 text-center">
        <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-gray-900 mb-2">Erro ao Gerar Quiz</h3>
        <p className="text-gray-600 mb-6">{error}</p>
        <div className="flex gap-3">
          <button onClick={generateQuestions} className="flex-1 bg-orange-600 text-white py-3 rounded-lg font-semibold hover:bg-orange-700 transition-colors">Tentar Novamente</button>
          <button onClick={onClose} className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300 transition-colors">Fechar</button>
        </div>
      </div>
    </div>
  );

  if (!questions.length) return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-8 text-center">
        <Sparkles className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-gray-900 mb-2">Sem Perguntas</h3>
        <p className="text-gray-600 mb-6">Não foi possível gerar perguntas para este evento.</p>
        <button onClick={onClose} className="w-full bg-orange-600 text-white py-3 rounded-lg font-semibold hover:bg-orange-700">Fechar</button>
      </div>
    </div>
  );

  // ── Resultados ─────────────────────────────────────────────────────────────
  if (showResults) {
    const score = calculateScore();
    const percentage = getScorePercentage();
    const fb = getFeedback();
    const circumference = 2 * Math.PI * 70;
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
        <div className="bg-white rounded-2xl max-w-2xl w-full my-8">
          <div className="relative h-48 rounded-t-2xl overflow-hidden">
            <img src={eventImage} alt={eventName} className="w-full h-full object-cover" onError={onImgError} />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
            <div className="absolute bottom-4 left-6 right-6 text-center">
              <Trophy className="w-12 h-12 text-white mx-auto mb-2" />
              <h2 className="text-2xl font-bold text-white">Resultados do Quiz</h2>
              <p className="text-white/90 text-sm mt-1">{eventName}</p>
            </div>
          </div>
          <div className="p-6">
            <div className="flex justify-center mb-6">
              <div className="relative w-40 h-40">
                <svg className="w-40 h-40 -rotate-90">
                  <circle cx="80" cy="80" r="70" stroke="#e5e7eb" strokeWidth="12" fill="none" />
                  <circle cx="80" cy="80" r="70" stroke="#f97316" strokeWidth="12" fill="none"
                    strokeDasharray={circumference}
                    strokeDashoffset={circumference * (1 - percentage / 100)}
                    strokeLinecap="round" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-4xl font-bold text-gray-900">{percentage.toFixed(0)}%</span>
                  <span className="text-sm text-gray-600">{score}/{questions.length}</span>
                </div>
              </div>
            </div>
            <div className="text-center mb-6">
              <h3 className={`text-2xl font-bold mb-2 ${fb.color}`}>{fb.title}</h3>
              <p className="text-gray-600">{fb.msg}</p>
            </div>
            <div className="space-y-4 mb-6 max-h-96 overflow-y-auto">
              <h4 className="font-semibold text-gray-900 text-lg sticky top-0 bg-white py-2">Revisão das Respostas:</h4>
              {questions.map((q, i) => {
                const ua = selectedAnswers[i];
                const ok = ua === q.correctAnswer;
                return (
                  <div key={q.id} className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      {ok
                        ? <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
                        : <XCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />}
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900 mb-2">{i + 1}. {q.question}</p>
                        <p className="text-sm text-gray-600 mb-1"><span className="font-medium">Sua resposta:</span> {q.options[ua]}</p>
                        {!ok && <p className="text-sm text-green-700 mb-1"><span className="font-medium">Resposta correcta:</span> {q.options[q.correctAnswer]}</p>}
                        {q.explanation && <p className="text-sm text-gray-500 italic mt-2">💡 {q.explanation}</p>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex gap-3">
              <button onClick={generateQuestions} className="flex-1 bg-orange-600 text-white py-3 rounded-lg font-semibold hover:bg-orange-700 flex items-center justify-center gap-2 transition-colors">
                <RotateCcw className="w-5 h-5" /> Novo Quiz
              </button>
              <button onClick={onClose} className="flex-1 bg-gray-200 text-gray-900 py-3 rounded-lg font-semibold hover:bg-gray-300 transition-colors">Fechar</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Pergunta actual ────────────────────────────────────────────────────────
  const question = questions[currentQuestion];
  const progress = ((currentQuestion + 1) / questions.length) * 100;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full">
        <div className="relative h-48 rounded-t-2xl overflow-hidden">
          <img src={eventImage} alt={eventName} className="w-full h-full object-cover" onError={onImgError} />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
          <div className="absolute bottom-4 left-6 right-6">
            <h2 className="text-2xl font-bold text-white">Quiz Educativo</h2>
            <p className="text-white/90 text-sm mt-1">{eventName}</p>
          </div>
        </div>

        <div className="bg-orange-600 text-white px-6 py-4">
          <div className="bg-white/20 rounded-full h-2 overflow-hidden">
            <div className="bg-white h-full transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
          <p className="text-sm text-white/90 mt-2">Pergunta {currentQuestion + 1} de {questions.length}</p>
        </div>

        <div className="p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-6">{question.question}</h3>
          <div className="space-y-3 mb-6">
            {question.options.map((option, index) => {
              const isCorrectAnswer = index === question.correctAnswer;
              const isSelected = selectedOption === index;
              const showFeedback = isAnswerSubmitted;
              let cls = 'w-full text-left p-4 rounded-lg border-2 transition-all ';
              if (showFeedback) {
                if (isSelected && isCorrectAnswer)       cls += 'border-green-600 bg-green-50';
                else if (isSelected && !isCorrectAnswer) cls += 'border-red-600 bg-red-50';
                else if (isCorrectAnswer)                cls += 'border-green-600 bg-green-50';
                else                                     cls += 'border-gray-200 bg-white opacity-40';
              } else {
                cls += isSelected
                  ? 'border-orange-500 bg-orange-50 cursor-pointer'
                  : 'border-gray-200 bg-white hover:border-orange-300 hover:bg-orange-50/30 cursor-pointer';
              }
              return (
                <button key={index} onClick={() => handleSelectOption(index)} disabled={showFeedback} className={cls}>
                  <div className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${
                      showFeedback && isCorrectAnswer ? 'border-green-600 bg-green-600' :
                      showFeedback && isSelected && !isCorrectAnswer ? 'border-red-600 bg-red-600' :
                      isSelected ? 'border-orange-600 bg-orange-600' : 'border-gray-300'
                    }`}>
                      {showFeedback && isCorrectAnswer && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                      {showFeedback && isSelected && !isCorrectAnswer && <XCircle className="w-3.5 h-3.5 text-white" />}
                      {!showFeedback && isSelected && <div className="w-2.5 h-2.5 bg-white rounded-full" />}
                    </div>
                    <span className={`text-gray-900 ${showFeedback && !isCorrectAnswer && !isSelected ? 'opacity-40' : ''}`}>{option}</span>
                  </div>
                </button>
              );
            })}
          </div>

          {isAnswerSubmitted && question.explanation && (
            <div className={`mb-6 p-4 rounded-lg border ${
              selectedOption === question.correctAnswer ? 'bg-green-50 border-green-200' : 'bg-blue-50 border-blue-200'
            }`}>
              <p className="text-sm text-gray-700"><span className="font-semibold">💡 Explicação:</span> {question.explanation}</p>
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={onClose} className="px-6 py-3 bg-gray-200 text-gray-900 rounded-lg font-semibold hover:bg-gray-300 transition-colors">Cancelar</button>
            <button
              onClick={handleNextQuestion}
              disabled={selectedOption === null || isAnswerSubmitted}
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