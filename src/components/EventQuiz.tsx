import { useState, useEffect, useRef, useCallback } from 'react';
import { CheckCircle2, XCircle, Trophy, RotateCcw, Brain, Zap, Volume2, VolumeX, X, ImageIcon } from 'lucide-react';
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
  imagePrompt?: string;
}

const OPTION_LABELS = ['A', 'B', 'C', 'D'];
const TIMER_SECONDS = 20;

// ─── Web Audio API ────────────────────────────────────────────────────────────
function useSound(enabled: boolean) {
  const ctxRef = useRef<AudioContext | null>(null);
  const getCtx = useCallback(() => {
    if (!ctxRef.current)
      ctxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    return ctxRef.current;
  }, []);

  const playCorrect = useCallback(() => {
    if (!enabled) return;
    try {
      const ctx = getCtx();
      [523.25, 659.25, 783.99].forEach((freq, i) => {
        const osc = ctx.createOscillator(); const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.type = 'sine'; osc.frequency.value = freq;
        const t = ctx.currentTime + i * 0.12;
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.18, t + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
        osc.start(t); osc.stop(t + 0.4);
      });
    } catch { }
  }, [enabled, getCtx]);

  const playWrong = useCallback(() => {
    if (!enabled) return;
    try {
      const ctx = getCtx();
      [220, 180].forEach((freq, i) => {
        const osc = ctx.createOscillator(); const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.type = 'sawtooth'; osc.frequency.value = freq;
        const t = ctx.currentTime + i * 0.15;
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.12, t + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
        osc.start(t); osc.stop(t + 0.35);
      });
    } catch { }
  }, [enabled, getCtx]);

  const playTick = useCallback((urgent: boolean) => {
    if (!enabled) return;
    try {
      const ctx = getCtx();
      const osc = ctx.createOscillator(); const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = 'square'; osc.frequency.value = urgent ? 880 : 440;
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(urgent ? 0.08 : 0.04, ctx.currentTime + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
      osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.1);
    } catch { }
  }, [enabled, getCtx]);

  const playVictory = useCallback(() => {
    if (!enabled) return;
    try {
      const ctx = getCtx();
      [523, 659, 784, 1047, 784, 1047].forEach((freq, i) => {
        const osc = ctx.createOscillator(); const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.type = 'sine'; osc.frequency.value = freq;
        const t = ctx.currentTime + i * 0.13;
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.15, t + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
        osc.start(t); osc.stop(t + 0.3);
      });
    } catch { }
  }, [enabled, getCtx]);

  return { playCorrect, playWrong, playTick, playVictory };
}

// ─── Confetti ─────────────────────────────────────────────────────────────────
const Confetti = () => {
  const colors = ['#ea580c', '#f97316', '#fb923c', '#fdba74', '#16a34a', '#4ade80', '#1d4ed8', '#60a5fa'];
  return (
    <div className="pointer-events-none fixed inset-0 z-[80] overflow-hidden">
      {Array.from({ length: 48 }).map((_, i) => (
        <motion.div key={i} className="absolute rounded-sm"
          style={{
            backgroundColor: colors[i % colors.length],
            width: 5 + Math.random() * 7, height: 5 + Math.random() * 7,
            left: `${Math.random() * 100}%`, top: '-16px',
          }}
          animate={{
            y: ['0vh', '110vh'], x: [(Math.random() - 0.5) * 280],
            rotate: [0, Math.random() * 720 - 360], opacity: [1, 1, 0],
          }}
          transition={{ duration: 2 + Math.random() * 2, delay: Math.random() * 1.2, ease: 'easeIn' }}
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
  const warning = seconds <= 10;
  const color = urgent ? '#dc2626' : warning ? '#d97706' : '#ea580c';
  return (
    <div className="relative w-12 h-12 flex items-center justify-center flex-shrink-0">
      <svg className="-rotate-90 absolute inset-0 w-full h-full">
        <circle cx="24" cy="24" r={r} stroke="#e5e7eb" strokeWidth="3" fill="none" />
        <motion.circle cx="24" cy="24" r={r}
          stroke={color} strokeWidth="3" fill="none" strokeLinecap="round"
          strokeDasharray={circ}
          animate={{ strokeDashoffset: circ - (seconds / total) * circ }}
          transition={{ duration: 1, ease: 'linear' }}
        />
      </svg>
      <motion.span
        key={urgent ? 'u' : 'n'}
        animate={urgent ? { scale: [1, 1.2, 1] } : { scale: 1 }}
        transition={{ duration: 0.4, repeat: urgent ? Infinity : 0 }}
        className="text-sm font-black tabular-nums relative z-10"
        style={{ color }}
      >{seconds}</motion.span>
    </div>
  );
};

// ─── Imagem SVG gerada por IA para cada pergunta ──────────────────────────────
function AIQuestionImage({ prompt, question }: { prompt?: string; question: string }) {
  const [svgData, setSvgData] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const generatedFor = useRef('');

  useEffect(() => {
    const key = prompt || question;
    if (generatedFor.current === key) return;
    generatedFor.current = key;

    setLoading(true);
    setFailed(false);
    setSvgData(null);

    (async () => {
      try {
        const res = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 1024,
            messages: [{
              role: 'user',
              content: `Create an educational SVG illustration for this quiz topic: "${key}"

Respond ONLY with valid JSON, no markdown, no backticks, no extra text:
{"svg": "...full SVG string here..."}

SVG requirements:
- viewBox="0 0 440 200" xmlns="http://www.w3.org/2000/svg"
- Rich, colorful educational infographic style
- Use these colors only: #ea580c #f97316 #fb923c #fff7ed #1f2937 #374151 #6b7280 #f3f4f6 #16a34a #dcfce7 #1d4ed8 #dbeafe #fef9c3 #ca8a04
- Include relevant shapes, icons drawn with SVG paths/circles/rects, symbolic elements
- Add 2-3 short text labels (max 3 words each) using font-family="system-ui,sans-serif"
- Make it look like a modern card illustration
- NO external resources, NO images tags, only SVG primitives`
            }]
          })
        });

        if (!res.ok) throw new Error('API error');
        const data = await res.json();
        const text = data.content?.find((b: any) => b.type === 'text')?.text || '';
        const clean = text.replace(/```json|```/g, '').trim();
        const parsed = JSON.parse(clean);
        if (parsed?.svg && typeof parsed.svg === 'string') {
          setSvgData(parsed.svg);
        } else {
          throw new Error('No SVG');
        }
      } catch {
        setFailed(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [prompt, question]);

  if (loading) {
    return (
      <div className="w-full h-32 bg-orange-50 border border-orange-100 rounded-lg flex flex-col items-center justify-center gap-2">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.4, repeat: Infinity, ease: 'linear' }}>
          <Brain className="w-6 h-6 text-orange-500" />
        </motion.div>
        <div className="h-1 bg-orange-100 rounded-full overflow-hidden w-20">
          <motion.div className="h-full bg-orange-400 rounded-full"
            animate={{ x: ['-100%', '200%'] }}
            transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }} />
        </div>
        <p className="text-[10px] text-orange-400 font-semibold tracking-wide">A gerar ilustração...</p>
      </div>
    );
  }

  if (failed || !svgData) {
    return (
      <div className="w-full h-32 bg-gray-50 border border-gray-200 rounded-lg flex flex-col items-center justify-center gap-1.5">
        <ImageIcon className="w-6 h-6 text-gray-300" />
        <p className="text-[10px] text-gray-400">Ilustração indisponível</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="w-full rounded-lg overflow-hidden border border-orange-100"
      dangerouslySetInnerHTML={{ __html: svgData }}
      style={{ lineHeight: 0, display: 'block' }}
    />
  );
}

// ─── Loading ──────────────────────────────────────────────────────────────────
const QuizLoading = ({ eventName }: { eventName: string }) => (
  <div className="flex flex-col items-center justify-center p-8 text-center min-h-[360px] bg-white">
    <div className="relative w-20 h-20 mx-auto mb-5">
      <motion.div className="absolute inset-0 rounded-full border-2 border-orange-200"
        animate={{ scale: [1, 1.25, 1], opacity: [0.5, 0, 0.5] }}
        transition={{ duration: 2, repeat: Infinity }} />
      <motion.div className="absolute inset-0 rounded-full border-2 border-orange-500"
        animate={{ rotate: 360 }} transition={{ duration: 1.8, repeat: Infinity, ease: 'linear' }} />
      <div className="absolute inset-0 flex items-center justify-center bg-orange-50 rounded-full">
        <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 1.5, repeat: Infinity }}>
          <Brain className="w-9 h-9 text-orange-600" />
        </motion.div>
      </div>
    </div>
    <h3 className="text-base font-bold text-gray-900 mb-1">A preparar o quiz</h3>
    <p className="text-sm text-gray-500 mb-5">IA a gerar perguntas e ilustrações...</p>
    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden w-36 mx-auto">
      <motion.div className="h-full rounded-full bg-orange-500"
        animate={{ x: ['-100%', '200%'] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }} />
    </div>
  </div>
);

// ─── API ──────────────────────────────────────────────────────────────────────
async function generateQuizWithAI(
  eventName: string, eventDescription: string, eventCategory: string, n = 5
): Promise<QuizQuestion[]> {
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

// ─── Componente principal ─────────────────────────────────────────────────────
export function EventQuiz({
  eventId, eventName, eventDescription = '', eventCategory = 'Geral',
  eventImage, currentUser, onClose,
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
  const [soundOn, setSoundOn] = useState(true);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastTickRef = useRef(-1);

  const { playCorrect, playWrong, playTick, playVictory } = useSound(soundOn);

  useEffect(() => { loadQuiz(); }, []);

  useEffect(() => {
    if (loading || showResults || submitted || !questions.length) return;
    setTimeLeft(TIMER_SECONDS);
    lastTickRef.current = -1;

    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        const next = t - 1;
        if (next <= 10 && next !== lastTickRef.current) {
          lastTickRef.current = next;
          playTick(next <= 5);
        }
        if (next <= 0) { clearInterval(timerRef.current!); submitAnswer(-1); return 0; }
        return next;
      });
    }, 1000);
    return () => clearInterval(timerRef.current!);
  }, [current, loading, showResults, submitted, questions.length]);

  const loadQuiz = async () => {
    setLoading(true); setError(null); setCurrent(0); setAnswers([]);
    setShowResults(false); setSelected(null); setSubmitted(false); setStreak(0);
    try {
      const qs = await generateQuizWithAI(eventName, eventDescription, eventCategory, 5);
      setQuestions(qs);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  const submitAnswer = (opt: number) => {
    clearInterval(timerRef.current!);
    setSelected(opt); setSubmitted(true);
    const correct = opt === questions[current]?.correctAnswer;
    if (opt !== -1) correct ? playCorrect() : playWrong();
    const newStreak = correct ? streak + 1 : 0;
    setStreak(newStreak);
    if (newStreak >= 2) { setStreakFlash(true); setTimeout(() => setStreakFlash(false), 2000); }

    setTimeout(() => {
      const newAnswers = [...answers, opt];
      setAnswers(newAnswers);
      if (current < questions.length - 1) {
        setCurrent((c) => c + 1); setSelected(null); setSubmitted(false);
      } else {
        const sc = newAnswers.filter((a, i) => a === questions[i]?.correctAnswer).length;
        if (sc / questions.length >= 0.8) { playVictory(); setConfetti(true); setTimeout(() => setConfetti(false), 4000); }
        setShowResults(true);
      }
    }, 2000);
  };

  const score = answers.filter((a, i) => a === questions[i]?.correctAnswer).length;
  const pct = questions.length ? (score / questions.length) * 100 : 0;

  const feedback = (() => {
    if (pct === 100) return { title: 'Perfeito! 🏆', msg: 'Dominas completamente este tema!', color: '#ea580c', grade: 'S' };
    if (pct >= 80)  return { title: 'Excelente! ⚡', msg: 'Muito bom desempenho!', color: '#16a34a', grade: 'A' };
    if (pct >= 60)  return { title: 'Bom trabalho! 👍', msg: 'Continua a melhorar!', color: '#1d4ed8', grade: 'B' };
    if (pct >= 40)  return { title: 'Pode melhorar 📚', msg: 'Revê os conteúdos.', color: '#d97706', grade: 'C' };
    return { title: 'Tenta novamente 💪', msg: 'Não desistas!', color: '#6b7280', grade: 'D' };
  })();

  const currentQ = questions[current];

  const modalContent = (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5"
      style={{ background: 'rgba(17,24,39,0.65)', backdropFilter: 'blur(5px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 14 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 14 }}
        transition={{ type: 'spring', stiffness: 320, damping: 32 }}
        className="relative w-full bg-white shadow-2xl overflow-hidden"
        style={{
          maxWidth: '460px',
          borderRadius: '14px',
          maxHeight: '92vh',
          border: '1px solid #e5e7eb',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-orange-600 rounded-lg flex items-center justify-center shadow-sm">
              <Brain className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-900 leading-tight">Quiz Educativo</p>
              <p className="text-[10px] text-gray-400 truncate max-w-[150px]">{eventName}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={() => setSoundOn(s => !s)}
              className="w-7 h-7 rounded-lg flex items-center justify-center bg-gray-100 hover:bg-orange-50 hover:text-orange-600 transition-colors">
              {soundOn
                ? <Volume2 className="w-3.5 h-3.5 text-orange-600" />
                : <VolumeX className="w-3.5 h-3.5 text-gray-400" />}
            </button>
            <button onClick={onClose}
              className="w-7 h-7 rounded-lg flex items-center justify-center bg-gray-100 hover:bg-red-50 transition-colors">
              <X className="w-3.5 h-3.5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="overflow-y-auto" style={{ maxHeight: 'calc(92vh - 52px)', scrollbarWidth: 'none' }}>
          {loading
            ? <QuizLoading eventName={eventName} />
            : error
            ? (
              <div className="p-6 text-center">
                <div className="w-12 h-12 rounded-full bg-red-50 border border-red-200 flex items-center justify-center mx-auto mb-3">
                  <XCircle className="w-6 h-6 text-red-500" />
                </div>
                <h3 className="text-sm font-bold text-gray-900 mb-1">Erro ao gerar quiz</h3>
                <p className="text-gray-500 text-xs mb-4 leading-relaxed">{error}</p>
                <div className="flex gap-2">
                  <button onClick={loadQuiz}
                    className="flex-1 py-2.5 rounded-lg font-semibold text-white text-sm bg-orange-600 hover:bg-orange-700 transition-colors">
                    Tentar novamente
                  </button>
                  <button onClick={onClose}
                    className="flex-1 py-2.5 rounded-lg font-semibold text-gray-600 text-sm bg-gray-100 hover:bg-gray-200 transition-colors">
                    Fechar
                  </button>
                </div>
              </div>
            )
            : showResults
            ? <ResultsScreen
                questions={questions} answers={answers} pct={pct} score={score}
                feedback={feedback} loadQuiz={loadQuiz} onClose={onClose}
              />
            : questions.length > 0
            ? <QuestionScreen
                q={currentQ} current={current} questions={questions}
                selected={selected} submitted={submitted} timeLeft={timeLeft}
                streak={streak} streakFlash={streakFlash} answers={answers}
                eventCategory={eventCategory} submitAnswer={submitAnswer} onClose={onClose}
              />
            : null
          }
        </div>
      </motion.div>
    </motion.div>
  );

  return (
    <>
      {confetti && <Confetti />}
      <AnimatePresence>{modalContent}</AnimatePresence>
    </>
  );
}

// ─── Ecrã de pergunta ─────────────────────────────────────────────────────────
function QuestionScreen({
  q, current, questions, selected, submitted, timeLeft, streak,
  streakFlash, answers, eventCategory, submitAnswer, onClose,
}: any) {
  const progressPct = ((current + 1) / questions.length) * 100;

  return (
    <div className="bg-white">
      {/* Progress */}
      <div className="h-1 bg-gray-100">
        <motion.div className="h-full bg-orange-500"
          animate={{ width: `${progressPct}%` }} transition={{ duration: 0.4 }} />
      </div>

      {/* Streak toast */}
      <AnimatePresence>
        {streakFlash && (
          <motion.div
            initial={{ y: -24, opacity: 0, scale: 0.88 }} animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -24, opacity: 0, scale: 0.88 }}
            className="absolute top-14 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-white text-xs font-bold shadow-lg bg-orange-600 border border-orange-700 whitespace-nowrap"
          >
            <Zap className="w-3 h-3" /> {streak} seguidas! 🔥
          </motion.div>
        )}
      </AnimatePresence>

      <div className="p-4">
        {/* Meta row */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-bold text-orange-600 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-full uppercase tracking-wider">
              {eventCategory}
            </span>
            <div className="flex gap-1 items-center">
              {questions.map((_: any, i: number) => (
                <div key={i} className="w-1.5 h-1.5 rounded-full transition-all duration-300"
                  style={{
                    background: i < current
                      ? (answers[i] === questions[i]?.correctAnswer ? '#16a34a' : '#dc2626')
                      : i === current ? '#ea580c' : '#e5e7eb'
                  }} />
              ))}
              <span className="text-[10px] text-gray-400 font-medium ml-1">{current + 1}/{questions.length}</span>
            </div>
          </div>
          <CircularTimer seconds={timeLeft} total={TIMER_SECONDS} />
        </div>

        {/* AI illustration + question (animated per question) */}
        <AnimatePresence mode="wait">
          <motion.div key={current}
            initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.18 }}>

            {/* AI Image */}
            <div className="mb-3">
              <AIQuestionImage
                prompt={q.imagePrompt || `${eventCategory}: ${q.question}`}
                question={q.question}
              />
            </div>

            {/* Pergunta */}
            <p className="text-sm font-bold text-gray-900 leading-snug mb-3">{q.question}</p>

            {/* Opções */}
            <div className="space-y-1.5 mb-3">
              {q.options.map((opt: string, idx: number) => {
                const isCorrect = idx === q.correctAnswer;
                const isSel = selected === idx;
                let style = {
                  bg: 'bg-white', border: 'border-gray-200',
                  lBg: 'bg-gray-100', lColor: 'text-gray-500',
                  txt: 'text-gray-800', opacity: '',
                };
                let icon: React.ReactNode = OPTION_LABELS[idx];

                if (submitted) {
                  if (isCorrect) {
                    style = { bg: 'bg-green-50', border: 'border-green-400', lBg: 'bg-green-500', lColor: 'text-white', txt: 'text-green-900', opacity: '' };
                    icon = <CheckCircle2 className="w-3.5 h-3.5" />;
                  } else if (isSel) {
                    style = { bg: 'bg-red-50', border: 'border-red-400', lBg: 'bg-red-500', lColor: 'text-white', txt: 'text-red-800', opacity: '' };
                    icon = <XCircle className="w-3.5 h-3.5" />;
                  } else {
                    style.opacity = 'opacity-30';
                  }
                } else if (isSel) {
                  style = { bg: 'bg-orange-50', border: 'border-orange-500', lBg: 'bg-orange-600', lColor: 'text-white', txt: 'text-orange-900', opacity: '' };
                }

                return (
                  <motion.button key={idx}
                    whileHover={!submitted ? { x: 3 } : {}}
                    whileTap={!submitted ? { scale: 0.985 } : {}}
                    onClick={() => !submitted && submitAnswer(idx)}
                    disabled={submitted}
                    className={`w-full text-left flex items-center gap-2.5 rounded-lg border px-3 py-2.5 transition-all ${style.bg} ${style.border} ${style.opacity}`}
                    style={{ cursor: submitted ? 'default' : 'pointer' }}
                  >
                    <div className={`w-6 h-6 rounded-md flex items-center justify-center font-bold text-xs flex-shrink-0 ${style.lBg} ${style.lColor}`}>
                      {icon}
                    </div>
                    <span className={`text-sm font-medium leading-snug ${style.txt}`}>{opt}</span>
                  </motion.button>
                );
              })}
            </div>

            {/* Explicação */}
            <AnimatePresence>
              {submitted && q.explanation && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="rounded-lg p-3 mb-3 overflow-hidden bg-blue-50 border border-blue-200">
                  <p className="text-xs text-blue-800 leading-relaxed">
                    <span className="font-bold">💡 </span>{q.explanation}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </AnimatePresence>

        {/* Rodapé */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-100 mt-1">
          <button onClick={onClose} className="text-xs text-gray-400 hover:text-gray-600 transition-colors font-medium">
            Sair
          </button>
          {streak >= 2 && !streakFlash && (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-orange-50 border border-orange-200 text-orange-600">
              <Zap className="w-2.5 h-2.5" /> {streak}🔥
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Ecrã de resultados ───────────────────────────────────────────────────────
function ResultsScreen({ questions, answers, pct, score, feedback, loadQuiz, onClose }: any) {
  const r = 48; const circ = 2 * Math.PI * r;
  return (
    <div className="bg-white">
      {/* Score header */}
      <div className="px-5 py-5 border-b border-gray-100">
        <div className="flex items-center gap-4">
          <div className="relative w-24 h-24 flex-shrink-0">
            <svg className="w-24 h-24 -rotate-90" viewBox="0 0 96 96">
              <circle cx="48" cy="48" r={r} stroke="#f3f4f6" strokeWidth="6" fill="none" />
              <motion.circle cx="48" cy="48" r={r}
                stroke={feedback.color} strokeWidth="6" fill="none" strokeLinecap="round"
                strokeDasharray={circ}
                initial={{ strokeDashoffset: circ }}
                animate={{ strokeDashoffset: circ * (1 - pct / 100) }}
                transition={{ duration: 1.1, ease: 'easeOut', delay: 0.2 }} />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.5, type: 'spring' }}
                className="text-2xl font-black text-gray-900 leading-none">{pct.toFixed(0)}%</motion.span>
              <span className="text-[10px] text-gray-400 font-medium">{score}/{questions.length}</span>
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Trophy className="w-4 h-4 flex-shrink-0" style={{ color: feedback.color }} />
              <h2 className="text-base font-black text-gray-900 truncate">{feedback.title}</h2>
            </div>
            <p className="text-xs text-gray-500 mb-2">{feedback.msg}</p>
            <motion.div
              initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.7, type: 'spring' }}
              className="inline-flex items-center px-3 py-1 rounded-lg border-2 font-black text-xl leading-none"
              style={{ borderColor: feedback.color, color: feedback.color, background: `${feedback.color}12` }}>
              {feedback.grade}
            </motion.div>
          </div>
        </div>
      </div>

      <div className="p-4">
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Revisão das respostas</p>
        <div className="space-y-1.5 mb-4 max-h-60 overflow-y-auto pr-0.5"
          style={{ scrollbarWidth: 'thin', scrollbarColor: '#e5e7eb transparent' }}>
          {questions.map((q: QuizQuestion, i: number) => {
            const ua = answers[i];
            const ok = ua === q.correctAnswer;
            return (
              <motion.div key={q.id}
                initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.9 + i * 0.07 }}
                className={`rounded-lg p-2.5 border flex gap-2 items-start ${ok ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${ok ? 'bg-green-500' : 'bg-red-500'}`}>
                  {ok ? <CheckCircle2 className="w-2.5 h-2.5 text-white" /> : <XCircle className="w-2.5 h-2.5 text-white" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-800 leading-snug">{i + 1}. {q.question}</p>
                  {ua === -1
                    ? <p className="text-[10px] text-red-500 font-medium mt-0.5">⏱ Tempo esgotado</p>
                    : <p className="text-[10px] text-gray-400 mt-0.5">
                        Escolheste: <span className="text-gray-700 font-medium">{q.options[ua]}</span>
                      </p>
                  }
                  {!ok && ua !== -1 && (
                    <p className="text-[10px] text-green-600 font-semibold mt-0.5">✓ {q.options[q.correctAnswer]}</p>
                  )}
                  {q.explanation && (
                    <p className="text-[10px] text-gray-400 italic mt-0.5">💡 {q.explanation}</p>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>

        <div className="flex gap-2">
          <button onClick={loadQuiz}
            className="flex-1 py-3 rounded-lg font-bold text-white text-sm bg-orange-600 hover:bg-orange-700 transition-colors flex items-center justify-center gap-2 shadow-sm">
            <RotateCcw className="w-3.5 h-3.5" /> Novo Quiz
          </button>
          <button onClick={onClose}
            className="flex-1 py-3 rounded-lg font-semibold text-gray-600 text-sm bg-gray-100 hover:bg-gray-200 transition-colors">
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}