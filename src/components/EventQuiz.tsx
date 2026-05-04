import { useState, useEffect, useRef } from 'react';
import { CheckCircle2, XCircle, Trophy, RotateCcw, Brain, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

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

const OPTION_LABELS = ['A', 'B', 'C', 'D'];
const TIMER_SECONDS = 20;

// ─── Confetti ─────────────────────────────────────────────────────────────────
const Confetti = () => {
  const colors = ['#f97316', '#fb923c', '#fbbf24', '#34d399', '#60a5fa', '#f472b6', '#a78bfa'];
  return (
    <div className="pointer-events-none fixed inset-0 z-[60] overflow-hidden">
      {Array.from({ length: 35 }).map((_, i) => (
        <motion.div key={i}
          className="absolute w-3 h-3 rounded-sm"
          style={{ backgroundColor: colors[i % colors.length], left: `${Math.random() * 100}%`, top: '-12px' }}
          animate={{ y: ['0vh', '110vh'], x: [(Math.random() - 0.5) * 250], rotate: [0, Math.random() * 720 - 360], opacity: [1, 1, 0] }}
          transition={{ duration: 2.5 + Math.random() * 1.5, delay: Math.random() * 0.8, ease: 'easeIn' }}
        />
      ))}
    </div>
  );
};

// ─── Timer circular ───────────────────────────────────────────────────────────
const CircularTimer = ({ seconds, total }: { seconds: number; total: number }) => {
  const r = 20;
  const circ = 2 * Math.PI * r;
  const urgent = seconds <= 5;
  return (
    <div className="relative w-14 h-14 flex items-center justify-center">
      <svg className="-rotate-90 absolute inset-0 w-full h-full">
        <circle cx="28" cy="28" r={r} stroke="#ffffff15" strokeWidth="3" fill="none" />
        <motion.circle cx="28" cy="28" r={r}
          stroke={urgent ? '#ef4444' : '#f97316'} strokeWidth="3" fill="none"
          strokeLinecap="round"
          strokeDasharray={circ}
          animate={{ strokeDashoffset: circ - (seconds / total) * circ }}
          transition={{ duration: 1, ease: 'linear' }}
        />
      </svg>
      <motion.span
        animate={{ scale: urgent ? [1, 1.2, 1] : 1, color: urgent ? '#ef4444' : '#ffffff' }}
        transition={{ duration: 0.3, repeat: urgent ? Infinity : 0 }}
        className="text-lg font-black tabular-nums z-10"
      >
        {seconds}
      </motion.span>
    </div>
  );
};

// ─── Loading screen ───────────────────────────────────────────────────────────
const QuizLoading = ({ eventImage, eventName }: { eventImage: string; eventName: string }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
    style={{ background: 'radial-gradient(ellipse at 60% 40%, #1e1b4b 0%, #0f0a1e 100%)' }}>
    <div className="text-center max-w-sm w-full">
      <div className="relative w-32 h-32 mx-auto mb-8">
        <div className="absolute inset-0 rounded-full overflow-hidden opacity-25 blur-sm scale-110">
          <img src={eventImage} alt="" className="w-full h-full object-cover" />
        </div>
        <motion.div className="absolute inset-0 rounded-full border-2 border-orange-500/40"
          animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0, 0.4] }}
          transition={{ duration: 2, repeat: Infinity }} />
        <motion.div className="absolute inset-0 rounded-full border-2 border-orange-500/60"
          animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }} />
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 1.5, repeat: Infinity }}>
            <Brain className="w-14 h-14 text-orange-400" />
          </motion.div>
        </div>
      </div>
      <h3 className="text-2xl font-black text-white mb-2 tracking-tight">A preparar o quiz</h3>
      <p className="text-orange-300/80 text-sm mb-8">IA a gerar perguntas personalizadas...</p>
      <div className="h-1 bg-white/10 rounded-full overflow-hidden mx-auto max-w-[200px]">
        <motion.div className="h-full rounded-full"
          style={{ background: 'linear-gradient(90deg, #f97316, #ec4899)' }}
          animate={{ x: ['-100%', '200%'] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }} />
      </div>
    </div>
  </div>
);

// ─── API ──────────────────────────────────────────────────────────────────────
async function generateQuizWithAI(eventName: string, eventDescription: string, eventCategory: string, n = 5): Promise<QuizQuestion[]> {
  const res = await fetch('/.netlify/functions/quiz-generator', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ eventName, eventDescription, eventCategory, numberOfQuestions: n }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error ?? `Erro ${res.status}`);
  if (!Array.isArray(data?.questions) || !data.questions.length)
    throw new Error('Nenhuma pergunta gerada. Tenta novamente.');
  return data.questions;
}

// ─── Componente ───────────────────────────────────────────────────────────────
export function EventQuiz({
  eventId, eventName, eventDescription = '', eventCategory = 'Geral',
  eventImage = 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800',
  currentUser, onClose,
}: EventQuizProps) {
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(TIMER_SECONDS);
  const [confetti, setConfetti] = useState(false);
  const [streak, setStreak] = useState(0);
  const [streakFlash, setStreakFlash] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => { loadQuiz(); }, []);

  useEffect(() => {
    if (loading || showResults || submitted || !questions.length) return;
    setTimeLeft(TIMER_SECONDS);
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) { clearInterval(timerRef.current!); submitAnswer(-1); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current!);
  }, [current, loading, showResults, submitted, questions.length]);

  const loadQuiz = async () => {
    setLoading(true); setError(null); setCurrent(0); setAnswers([]);
    setShowResults(false); setSelected(null); setSubmitted(false); setStreak(0);
    try { setQuestions(await generateQuizWithAI(eventName, eventDescription, eventCategory, 5)); }
    catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  const submitAnswer = (opt: number) => {
    clearInterval(timerRef.current!);
    setSelected(opt); setSubmitted(true);
    const correct = opt === questions[current]?.correctAnswer;
    const newStreak = correct ? streak + 1 : 0;
    setStreak(newStreak);
    if (newStreak >= 2) { setStreakFlash(true); setTimeout(() => setStreakFlash(false), 1800); }

    setTimeout(() => {
      const newAnswers = [...answers, opt];
      setAnswers(newAnswers);
      if (current < questions.length - 1) {
        setCurrent((c) => c + 1); setSelected(null); setSubmitted(false);
      } else {
        const score = newAnswers.filter((a, i) => a === questions[i]?.correctAnswer).length;
        if (score / questions.length >= 0.8) { setConfetti(true); setTimeout(() => setConfetti(false), 3500); }
        setShowResults(true);
      }
    }, 2000);
  };

  const score = answers.filter((a, i) => a === questions[i]?.correctAnswer).length;
  const pct = questions.length ? (score / questions.length) * 100 : 0;

  const feedback = (() => {
    if (pct === 100) return { title: 'Perfeito! 🏆', msg: 'Dominas completamente este tema!', color: '#f59e0b', grade: 'S' };
    if (pct >= 80)  return { title: 'Excelente! ⚡', msg: 'Muito bom desempenho!', color: '#34d399', grade: 'A' };
    if (pct >= 60)  return { title: 'Bom trabalho! 👍', msg: 'Continua a melhorar!', color: '#60a5fa', grade: 'B' };
    if (pct >= 40)  return { title: 'Pode melhorar 📚', msg: 'Revê os conteúdos.', color: '#f97316', grade: 'C' };
    return { title: 'Tenta novamente 💪', msg: 'Não desistas!', color: '#f472b6', grade: 'D' };
  })();

  const fallbackImg = 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800';
  const imgErr = (e: React.SyntheticEvent<HTMLImageElement>) => { (e.target as HTMLImageElement).src = fallbackImg; };

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) return <QuizLoading eventImage={eventImage} eventName={eventName} />;

  // ── Erro ───────────────────────────────────────────────────────────────────
  if (error) return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'radial-gradient(ellipse at 60% 40%, #1e1b4b 0%, #0f0a1e 100%)' }}>
      <motion.div initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-sm rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
          <XCircle className="w-8 h-8 text-red-400" />
        </div>
        <h3 className="text-xl font-black text-white mb-2">Erro ao gerar quiz</h3>
        <p className="text-white/50 text-sm mb-6">{error}</p>
        <div className="flex gap-3">
          <button onClick={loadQuiz} className="flex-1 py-3 rounded-xl font-bold text-white text-sm active:scale-95"
            style={{ background: 'linear-gradient(135deg,#f97316,#ec4899)' }}>Tentar de novo</button>
          <button onClick={onClose} className="flex-1 py-3 rounded-xl font-bold text-white/60 text-sm bg-white/10 hover:bg-white/20 active:scale-95">Fechar</button>
        </div>
      </motion.div>
    </div>
  );

  if (!questions.length) return null;

  // ── Resultados ─────────────────────────────────────────────────────────────
  if (showResults) {
    const circ = 2 * Math.PI * 54;
    return (
      <>
        {confetti && <Confetti />}
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
          style={{ background: 'radial-gradient(ellipse at 60% 40%, #1e1b4b 0%, #0f0a1e 100%)' }}>
          <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-2xl my-4">

            {/* Capa */}
            <div className="relative h-52 rounded-t-3xl overflow-hidden">
              <img src={eventImage} alt={eventName} className="w-full h-full object-cover" onError={imgErr} />
              <div className="absolute inset-0"
                style={{ background: 'linear-gradient(to top,#0f0a1e 0%,#0f0a1e50 55%,transparent 100%)' }} />
              <div className="absolute bottom-4 left-0 right-0 text-center">
                <Trophy className="w-10 h-10 mx-auto mb-1" style={{ color: feedback.color }} />
                <h2 className="text-2xl font-black text-white">Resultados Finais</h2>
              </div>
            </div>

            <div className="bg-white/5 backdrop-blur-xl border border-white/10 border-t-0 rounded-b-3xl p-6">
              {/* Score + grade */}
              <div className="flex items-center justify-center gap-10 mb-6">
                <div className="relative w-36 h-36">
                  <svg className="w-36 h-36 -rotate-90">
                    <circle cx="72" cy="72" r="54" stroke="#ffffff10" strokeWidth="8" fill="none" />
                    <motion.circle cx="72" cy="72" r="54" stroke={feedback.color} strokeWidth="8" fill="none"
                      strokeLinecap="round" strokeDasharray={circ}
                      initial={{ strokeDashoffset: circ }}
                      animate={{ strokeDashoffset: circ * (1 - pct / 100) }}
                      transition={{ duration: 1.4, ease: 'easeOut', delay: 0.2 }} />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.7, type: 'spring' }}
                      className="text-4xl font-black text-white">{pct.toFixed(0)}%</motion.span>
                    <span className="text-white/40 text-xs">{score}/{questions.length} certas</span>
                  </div>
                </div>
                <motion.div initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: 0.9, type: 'spring', stiffness: 180 }}
                  className="w-20 h-20 rounded-2xl flex items-center justify-center border-2 select-none"
                  style={{ borderColor: feedback.color, background: `${feedback.color}20` }}>
                  <span className="text-4xl font-black" style={{ color: feedback.color }}>{feedback.grade}</span>
                </motion.div>
              </div>

              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.1 }} className="text-center mb-6">
                <h3 className="text-xl font-black text-white mb-1">{feedback.title}</h3>
                <p className="text-white/40 text-sm">{feedback.msg}</p>
              </motion.div>

              {/* Revisão */}
              <div className="space-y-2.5 mb-6 max-h-64 overflow-y-auto pr-1"
                style={{ scrollbarWidth: 'thin', scrollbarColor: '#ffffff15 transparent' }}>
                <p className="text-xs font-bold text-white/30 uppercase tracking-widest mb-2">Revisão das respostas</p>
                {questions.map((q, i) => {
                  const ua = answers[i];
                  const ok = ua === q.correctAnswer;
                  return (
                    <motion.div key={q.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 1.3 + i * 0.07 }}
                      className="rounded-2xl p-3.5 border"
                      style={{ background: ok ? '#34d39912' : '#f4727212', borderColor: ok ? '#34d39930' : '#f4727230' }}>
                      <div className="flex gap-3 items-start">
                        <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                          style={{ background: ok ? '#34d399' : '#f47272' }}>
                          {ok ? <CheckCircle2 className="w-3 h-3 text-white" /> : <XCircle className="w-3 h-3 text-white" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white/85 text-sm font-semibold leading-snug mb-0.5">{i + 1}. {q.question}</p>
                          {ua === -1
                            ? <p className="text-xs text-red-400">⏱ Tempo esgotado</p>
                            : <p className="text-xs text-white/35">Escolheste: <span className="text-white/60">{q.options[ua]}</span></p>
                          }
                          {!ok && ua !== -1 && <p className="text-xs text-emerald-400 mt-0.5">✓ {q.options[q.correctAnswer]}</p>}
                          {q.explanation && <p className="text-xs text-white/35 mt-1 italic">💡 {q.explanation}</p>}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              <div className="flex gap-3">
                <button onClick={loadQuiz}
                  className="flex-1 py-3.5 rounded-2xl font-black text-white text-sm flex items-center justify-center gap-2 active:scale-95 transition-transform"
                  style={{ background: 'linear-gradient(135deg,#f97316,#ec4899)' }}>
                  <RotateCcw className="w-4 h-4" /> Novo Quiz
                </button>
                <button onClick={onClose}
                  className="flex-1 py-3.5 rounded-2xl font-bold text-white/60 text-sm bg-white/10 hover:bg-white/20 active:scale-95 transition-all">
                  Fechar
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </>
    );
  }

  // ── Pergunta ───────────────────────────────────────────────────────────────
  const q = questions[current];
  const progressPct = (current / questions.length) * 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'radial-gradient(ellipse at 60% 40%, #1e1b4b 0%, #0f0a1e 100%)' }}>

      {/* Streak flash */}
      <AnimatePresence>
        {streakFlash && (
          <motion.div initial={{ scale: 0, y: -20, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-[70] flex items-center gap-2 px-5 py-2.5 rounded-full font-black text-white text-sm shadow-2xl"
            style={{ background: 'linear-gradient(135deg,#f59e0b,#f97316)' }}>
            <Zap className="w-4 h-4" /> {streak} em sequência! 🔥
          </motion.div>
        )}
      </AnimatePresence>

      <div className="w-full max-w-2xl">
        {/* Capa do evento */}
        <div className="relative h-44 rounded-t-3xl overflow-hidden">
          <img src={eventImage} alt={eventName} className="w-full h-full object-cover" onError={imgErr} />
          <div className="absolute inset-0"
            style={{ background: 'linear-gradient(to top,#0f0a1e 0%,#0f0a1e40 55%,transparent 100%)' }} />

          {/* Barra progresso no topo */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-white/10">
            <motion.div className="h-full rounded-r-full"
              style={{ background: 'linear-gradient(90deg,#f97316,#ec4899)' }}
              animate={{ width: `${progressPct}%` }} transition={{ duration: 0.5 }} />
          </div>

          {/* Topo: contador + timer */}
          <div className="absolute top-3 left-5 right-5 flex items-center justify-between">
            <div className="flex items-center gap-1.5 bg-black/40 backdrop-blur-sm rounded-full px-3 py-1.5">
              <span className="text-white/50 text-xs">Pergunta</span>
              <span className="text-white font-black text-sm">{current + 1}</span>
              <span className="text-white/30 text-xs">/ {questions.length}</span>
            </div>
            <CircularTimer seconds={timeLeft} total={TIMER_SECONDS} />
          </div>

          {/* Fundo: nome + streak */}
          <div className="absolute bottom-3 left-5 right-5 flex items-end justify-between">
            <div>
              <p className="text-orange-300 text-xs font-bold uppercase tracking-widest mb-0.5">Quiz IA · {eventCategory}</p>
              <p className="text-white/70 text-xs truncate max-w-[220px]">{eventName}</p>
            </div>
            <AnimatePresence>
              {streak >= 2 && (
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                  className="flex items-center gap-1 rounded-full px-2.5 py-1 border"
                  style={{ background: '#f9731620', borderColor: '#f9731640' }}>
                  <Zap className="w-3 h-3 text-orange-400" />
                  <span className="text-orange-300 text-xs font-bold">{streak}🔥</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Corpo */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 border-t-0 rounded-b-3xl p-6">
          <AnimatePresence mode="wait">
            <motion.div key={current}
              initial={{ opacity: 0, x: 25 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -25 }}
              transition={{ duration: 0.25 }}>

              <p className="text-white font-bold text-lg leading-snug mb-5">{q.question}</p>

              {/* Opções */}
              <div className="space-y-2.5 mb-5">
                {q.options.map((opt, idx) => {
                  const isCorrect = idx === q.correctAnswer;
                  const isSel = selected === idx;
                  const fb = submitted;

                  let cardStyle = 'border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/25 cursor-pointer';
                  let labelStyle = 'bg-white/10 text-white/50';

                  if (fb) {
                    if (isCorrect) { cardStyle = 'border-emerald-500/50 bg-emerald-500/15'; labelStyle = 'bg-emerald-500 text-white'; }
                    else if (isSel) { cardStyle = 'border-red-500/50 bg-red-500/15'; labelStyle = 'bg-red-500 text-white'; }
                    else { cardStyle = 'border-white/5 bg-white/3 opacity-35'; }
                  } else if (isSel) {
                    cardStyle = 'border-orange-500/60 bg-orange-500/15 cursor-pointer';
                    labelStyle = 'bg-orange-500 text-white';
                  }

                  return (
                    <motion.button key={idx}
                      whileHover={!fb ? { x: 5 } : {}}
                      whileTap={!fb ? { scale: 0.98 } : {}}
                      onClick={() => !fb && submitAnswer(idx)}
                      disabled={fb}
                      className={`w-full text-left p-4 rounded-2xl border transition-all flex items-center gap-3 ${cardStyle}`}>
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-sm flex-shrink-0 transition-all ${labelStyle}`}>
                        {fb && isCorrect ? <CheckCircle2 className="w-4 h-4" />
                          : fb && isSel && !isCorrect ? <XCircle className="w-4 h-4" />
                          : OPTION_LABELS[idx]}
                      </div>
                      <span className="text-white/90 text-sm font-medium leading-snug">{opt}</span>
                    </motion.button>
                  );
                })}
              </div>

              {/* Explicação */}
              <AnimatePresence>
                {submitted && q.explanation && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                    className="mb-4 p-4 rounded-2xl border border-blue-400/25 bg-blue-500/10">
                    <p className="text-blue-200 text-sm leading-relaxed">
                      <span className="font-bold">💡 </span>{q.explanation}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </AnimatePresence>

          {/* Rodapé com dots */}
          <div className="flex items-center justify-between mt-2">
            <button onClick={onClose} className="text-white/30 hover:text-white/60 text-xs transition-colors">Sair do quiz</button>
            <div className="flex gap-1.5">
              {questions.map((_, i) => (
                <motion.div key={i}
                  animate={{ scale: i === current ? 1.4 : 1 }}
                  className="w-1.5 h-1.5 rounded-full transition-colors"
                  style={{
                    background: i < current
                      ? answers[i] === questions[i]?.correctAnswer ? '#34d399' : '#f47272'
                      : i === current ? '#f97316' : '#ffffff20'
                  }} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}