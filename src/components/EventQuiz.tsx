import { useState, useEffect, useRef, useCallback } from 'react';
import { CheckCircle2, XCircle, Trophy, RotateCcw, Brain, Zap, Volume2, VolumeX, X } from 'lucide-react';
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
  videoId?: string; // YouTube video ID relacionado à pergunta
}

const OPTION_LABELS = ['A', 'B', 'C', 'D'];
const TIMER_SECONDS = 20;

// ─── Web Audio API — sons sintetizados (sem ficheiros externos) ───────────────
function useSound(enabled: boolean) {
  const ctxRef = useRef<AudioContext | null>(null);

  const getCtx = useCallback(() => {
    if (!ctxRef.current) {
      ctxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return ctxRef.current;
  }, []);

  const playCorrect = useCallback(() => {
    if (!enabled) return;
    try {
      const ctx = getCtx();
      // Acorde ascendente alegre: C5 → E5 → G5
      const notes = [523.25, 659.25, 783.99];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.value = freq;
        const t = ctx.currentTime + i * 0.12;
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.18, t + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
        osc.start(t); osc.stop(t + 0.4);
      });
    } catch { /* ignora */ }
  }, [enabled, getCtx]);

  const playWrong = useCallback(() => {
    if (!enabled) return;
    try {
      const ctx = getCtx();
      // Dois tons descentes graves
      const notes = [220, 180];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.type = 'sawtooth';
        osc.frequency.value = freq;
        const t = ctx.currentTime + i * 0.15;
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.12, t + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
        osc.start(t); osc.stop(t + 0.35);
      });
    } catch { /* ignora */ }
  }, [enabled, getCtx]);

  const playTick = useCallback((urgent: boolean) => {
    if (!enabled) return;
    try {
      const ctx = getCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = 'square';
      osc.frequency.value = urgent ? 880 : 440;
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(urgent ? 0.08 : 0.04, ctx.currentTime + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
      osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.1);
    } catch { /* ignora */ }
  }, [enabled, getCtx]);

  const playVictory = useCallback(() => {
    if (!enabled) return;
    try {
      const ctx = getCtx();
      const melody = [523, 659, 784, 1047, 784, 1047];
      melody.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.value = freq;
        const t = ctx.currentTime + i * 0.13;
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.15, t + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
        osc.start(t); osc.stop(t + 0.3);
      });
    } catch { /* ignora */ }
  }, [enabled, getCtx]);

  return { playCorrect, playWrong, playTick, playVictory };
}

// ─── Confetti ─────────────────────────────────────────────────────────────────
const Confetti = () => {
  const colors = ['#f97316', '#fbbf24', '#34d399', '#60a5fa', '#f472b6', '#a78bfa', '#fb923c'];
  return (
    <div className="pointer-events-none fixed inset-0 z-[80] overflow-hidden">
      {Array.from({ length: 40 }).map((_, i) => (
        <motion.div key={i}
          className="absolute rounded-sm"
          style={{
            backgroundColor: colors[i % colors.length],
            width: 6 + Math.random() * 8,
            height: 6 + Math.random() * 8,
            left: `${Math.random() * 100}%`,
            top: '-16px',
          }}
          animate={{
            y: ['0vh', '110vh'],
            x: [(Math.random() - 0.5) * 300],
            rotate: [0, Math.random() * 720 - 360],
            opacity: [1, 1, 0],
          }}
          transition={{ duration: 2.2 + Math.random() * 1.8, delay: Math.random() * 1, ease: 'easeIn' }}
        />
      ))}
    </div>
  );
};

// ─── Timer circular ───────────────────────────────────────────────────────────
const CircularTimer = ({ seconds, total }: { seconds: number; total: number }) => {
  const r = 22;
  const circ = 2 * Math.PI * r;
  const urgent = seconds <= 5;
  const warning = seconds <= 10;
  const color = urgent ? '#ef4444' : warning ? '#f59e0b' : '#f97316';
  return (
    <div className="relative w-14 h-14 flex items-center justify-center flex-shrink-0">
      <svg className="-rotate-90 absolute inset-0 w-full h-full">
        <circle cx="28" cy="28" r={r} stroke="#ffffff10" strokeWidth="3.5" fill="none" />
        <motion.circle cx="28" cy="28" r={r}
          stroke={color} strokeWidth="3.5" fill="none" strokeLinecap="round"
          strokeDasharray={circ}
          animate={{ strokeDashoffset: circ - (seconds / total) * circ }}
          transition={{ duration: 1, ease: 'linear' }}
        />
      </svg>
      <motion.span
        key={urgent ? 'urgent' : 'normal'}
        animate={urgent ? { scale: [1, 1.25, 1] } : { scale: 1 }}
        transition={{ duration: 0.4, repeat: urgent ? Infinity : 0 }}
        className="text-base font-black tabular-nums relative z-10"
        style={{ color }}
      >
        {seconds}
      </motion.span>
    </div>
  );
};

// ─── Player de vídeo YouTube embutido (por videoId) ───────────────────────────
const VideoPlayer = ({ videoId, title }: { videoId: string; title: string }) => (
  <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
    <iframe
      className="absolute inset-0 w-full h-full rounded-t-2xl"
      src={`https://www.youtube.com/embed/${videoId}?autoplay=0&rel=0&modestbranding=1&controls=1`}
      title={title}
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowFullScreen
    />
  </div>
);

// ─── Player YouTube com pesquisa (por searchQuery) ────────────────────────────
function VideoPlayerSearch({ searchQuery, title }: { videoId?: string; title: string; searchQuery?: string }) {
  const encoded = encodeURIComponent(searchQuery ?? title);
  const src = `https://www.youtube.com/embed?listType=search&list=${encoded}&autoplay=1&rel=0&modestbranding=1`;
  return (
    <div className="relative w-full bg-black" style={{ paddingBottom: '52%' }}>
      <iframe
        className="absolute inset-0 w-full h-full"
        src={src}
        title={title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  );
}

// ─── Loading ──────────────────────────────────────────────────────────────────
const QuizLoading = ({ eventImage, eventName }: { eventImage: string; eventName: string }) => (
  <div className="flex flex-col items-center justify-center p-8 text-center min-h-[420px]">
    <div className="relative w-28 h-28 mx-auto mb-6">
      <div className="absolute inset-0 rounded-full overflow-hidden opacity-20 blur-sm scale-110">
        <img src={eventImage} alt="" className="w-full h-full object-cover" />
      </div>
      <motion.div className="absolute inset-0 rounded-full border-2 border-orange-500/30"
        animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0, 0.3] }}
        transition={{ duration: 2, repeat: Infinity }} />
      <motion.div className="absolute inset-0 rounded-full border-2 border-orange-400/50"
        animate={{ rotate: 360 }} transition={{ duration: 2.5, repeat: Infinity, ease: 'linear' }} />
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 1.5, repeat: Infinity }}>
          <Brain className="w-12 h-12 text-orange-400" />
        </motion.div>
      </div>
    </div>
    <h3 className="text-xl font-black text-white mb-1 tracking-tight">A preparar o quiz</h3>
    <p className="text-orange-300/70 text-sm mb-6">IA a gerar perguntas + vídeos...</p>
    <div className="h-1 bg-white/10 rounded-full overflow-hidden w-48 mx-auto">
      <motion.div className="h-full rounded-full"
        style={{ background: 'linear-gradient(90deg,#f97316,#ec4899)' }}
        animate={{ x: ['-100%', '200%'] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }} />
    </div>
  </div>
);

// ─── API ──────────────────────────────────────────────────────────────────────
async function generateQuizWithAI(
  eventName: string, eventDescription: string,
  eventCategory: string, n = 5
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
  const [soundOn, setSoundOn] = useState(true);
  const [showVideo, setShowVideo] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastTickRef = useRef(-1);

  const { playCorrect, playWrong, playTick, playVictory } = useSound(soundOn);

  useEffect(() => { loadQuiz(); }, []);

  // Timer
  useEffect(() => {
    if (loading || showResults || submitted || !questions.length) return;
    setTimeLeft(TIMER_SECONDS);
    lastTickRef.current = -1;
    setShowVideo(false);

    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        const next = t - 1;
        // Som de tick nos últimos 10 segundos
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
    setShowVideo(false);
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
        setCurrent((c) => c + 1); setSelected(null); setSubmitted(false); setShowVideo(false);
      } else {
        const sc = newAnswers.filter((a, i) => a === questions[i]?.correctAnswer).length;
        if (sc / questions.length >= 0.8) { playVictory(); setConfetti(true); setTimeout(() => setConfetti(false), 4000); }
        setShowResults(true);
      }
    }, 2200);
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

  // Vídeo relacionado com a pergunta actual
  const currentQ = questions[current];
  const videoQuery = currentQ
    ? `${eventCategory} ${currentQ.question.split(' ').slice(0, 6).join(' ')}`
    : eventName;

  // ── Overlay do modal ─────────────────────────────────────────────────────
  const modalContent = (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6"
      style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.92, opacity: 0, y: 20 }}
        transition={{ type: 'spring', stiffness: 280, damping: 28 }}
        className="relative w-full max-w-lg flex flex-col overflow-hidden shadow-2xl"
        style={{
          background: 'linear-gradient(160deg, #1a1040 0%, #0d0820 100%)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '24px',
          maxHeight: '92vh',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Botão fechar fixo */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-20 w-8 h-8 rounded-full flex items-center justify-center transition-all hover:scale-110"
          style={{ background: 'rgba(255,255,255,0.08)' }}
        >
          <X className="w-4 h-4 text-white/60" />
        </button>

        {/* Som toggle */}
        <button
          onClick={() => setSoundOn((s) => !s)}
          className="absolute top-3 right-14 z-20 w-8 h-8 rounded-full flex items-center justify-center transition-all hover:scale-110"
          style={{ background: 'rgba(255,255,255,0.08)' }}
          title={soundOn ? 'Desligar som' : 'Ligar som'}
        >
          {soundOn
            ? <Volume2 className="w-4 h-4 text-orange-400" />
            : <VolumeX className="w-4 h-4 text-white/30" />}
        </button>

        {/* Conteúdo com scroll */}
        <div className="overflow-y-auto flex-1" style={{ scrollbarWidth: 'none' }}>
          {loading
            ? <QuizLoading eventImage={eventImage} eventName={eventName} />
            : error
            ? (
              <div className="p-8 text-center">
                <div className="w-14 h-14 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
                  <XCircle className="w-7 h-7 text-red-400" />
                </div>
                <h3 className="text-lg font-black text-white mb-2">Erro ao gerar quiz</h3>
                <p className="text-white/50 text-sm mb-6 leading-relaxed">{error}</p>
                <div className="flex gap-3">
                  <button onClick={loadQuiz}
                    className="flex-1 py-3 rounded-xl font-bold text-white text-sm"
                    style={{ background: 'linear-gradient(135deg,#f97316,#ec4899)' }}>
                    Tentar de novo
                  </button>
                  <button onClick={onClose}
                    className="flex-1 py-3 rounded-xl font-bold text-white/50 text-sm bg-white/8 hover:bg-white/15 transition-colors">
                    Fechar
                  </button>
                </div>
              </div>
            )
            : showResults
            ? <ResultsScreen
                questions={questions} answers={answers} pct={pct} score={score}
                feedback={feedback} eventImage={eventImage} eventName={eventName}
                imgErr={imgErr} loadQuiz={loadQuiz} onClose={onClose}
              />
            : questions.length > 0
            ? <QuestionScreen
                q={currentQ} current={current} questions={questions}
                selected={selected} submitted={submitted} timeLeft={timeLeft}
                streak={streak} streakFlash={streakFlash} answers={answers}
                showVideo={showVideo} setShowVideo={setShowVideo}
                videoQuery={videoQuery} eventCategory={eventCategory}
                eventName={eventName} imgErr={imgErr} eventImage={eventImage}
                submitAnswer={submitAnswer} onClose={onClose}
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
      <AnimatePresence>
        {modalContent}
      </AnimatePresence>
    </>
  );
}

// ─── Ecrã de pergunta ─────────────────────────────────────────────────────────
function QuestionScreen({
  q, current, questions, selected, submitted, timeLeft, streak,
  streakFlash, answers, showVideo, setShowVideo, videoQuery,
  eventCategory, eventName, imgErr, eventImage, submitAnswer, onClose,
}: any) {
  const progressPct = (current / questions.length) * 100;

  return (
    <>
      {/* Streak badge */}
      <AnimatePresence>
        {streakFlash && (
          <motion.div
            initial={{ y: -40, opacity: 0, scale: 0.8 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -40, opacity: 0, scale: 0.8 }}
            className="absolute top-12 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 px-4 py-2 rounded-full text-white text-xs font-black shadow-xl"
            style={{ background: 'linear-gradient(135deg,#f59e0b,#f97316)', whiteSpace: 'nowrap' }}
          >
            <Zap className="w-3.5 h-3.5" /> {streak} seguidas! 🔥
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header: vídeo OU imagem */}
      <div className="relative overflow-hidden" style={{ borderRadius: '24px 24px 0 0' }}>
        <AnimatePresence mode="wait">
          {showVideo
            ? (
              <motion.div key="video" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {/* ← usa VideoPlayerSearch em vez de VideoPlayer */}
                <VideoPlayerSearch
                  title={`Vídeo sobre: ${q.question}`}
                  searchQuery={videoQuery}
                />
              </motion.div>
            )
            : (
              <motion.div key="image" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="relative h-40 sm:h-48">
                <img src={eventImage} alt={eventName} className="w-full h-full object-cover" onError={imgErr} />
                <div className="absolute inset-0"
                  style={{ background: 'linear-gradient(to top,#0d0820 0%,#0d082060 50%,transparent 100%)' }} />
                {/* Botão abrir vídeo */}
                <button
                  onClick={() => setShowVideo(true)}
                  className="absolute bottom-3 right-4 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-white transition-all hover:scale-105"
                  style={{ background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.15)' }}
                >
                  <span>▶</span> Ver vídeo
                </button>
              </motion.div>
            )
          }
        </AnimatePresence>

        {/* Barra de progresso */}
        <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: 'rgba(255,255,255,0.08)' }}>
          <motion.div className="h-full"
            style={{ background: 'linear-gradient(90deg,#f97316,#ec4899)' }}
            animate={{ width: `${progressPct}%` }} transition={{ duration: 0.5 }} />
        </div>

        {/* Contador + timer */}
        <div className="absolute top-3 left-4 flex items-center gap-2 z-10">
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs"
            style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <span className="text-white/50">Q</span>
            <span className="text-white font-black">{current + 1}</span>
            <span className="text-white/30">/{questions.length}</span>
          </div>
          {/* Dots de progresso */}
          <div className="flex gap-1">
            {questions.map((_: any, i: number) => (
              <div key={i} className="w-1.5 h-1.5 rounded-full transition-all"
                style={{
                  background: i < current
                    ? answers[i] === questions[i]?.correctAnswer ? '#34d399' : '#f47272'
                    : i === current ? '#f97316' : 'rgba(255,255,255,0.15)'
                }} />
            ))}
          </div>
        </div>

        {/* Timer (canto direito) */}
        {!showVideo && (
          <div className="absolute top-2 right-10 z-10">
            <CircularTimer seconds={timeLeft} total={TIMER_SECONDS} />
          </div>
        )}

        {/* Fechar vídeo */}
        {showVideo && (
          <button onClick={() => setShowVideo(false)}
            className="absolute top-2 left-2 z-20 px-2.5 py-1 rounded-full text-xs font-bold text-white"
            style={{ background: 'rgba(0,0,0,0.6)' }}>
            ← Voltar
          </button>
        )}

        {/* Label categoria */}
        {!showVideo && (
          <div className="absolute bottom-3 left-4 z-10">
            <span className="text-orange-300 text-xs font-bold uppercase tracking-widest"
              style={{ textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}>
              {eventCategory}
            </span>
          </div>
        )}
      </div>

      {/* Corpo da pergunta */}
      <div className="p-4 sm:p-5">
        <AnimatePresence mode="wait">
          <motion.div key={current}
            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.22 }}>

            <p className="text-white font-bold text-base sm:text-lg leading-snug mb-4">{q.question}</p>

            {/* Opções */}
            <div className="space-y-2 mb-4">
              {q.options.map((opt: string, idx: number) => {
                const isCorrect = idx === q.correctAnswer;
                const isSel = selected === idx;

                let bg = 'rgba(255,255,255,0.04)';
                let border = 'rgba(255,255,255,0.08)';
                let labelBg = 'rgba(255,255,255,0.08)';
                let labelColor = 'rgba(255,255,255,0.4)';
                let opacity = 1;
                let textColor = 'rgba(255,255,255,0.85)';

                if (submitted) {
                  if (isCorrect) {
                    bg = 'rgba(52,211,153,0.12)'; border = 'rgba(52,211,153,0.5)';
                    labelBg = '#34d399'; labelColor = '#fff';
                  } else if (isSel) {
                    bg = 'rgba(244,114,114,0.12)'; border = 'rgba(244,114,114,0.5)';
                    labelBg = '#f47272'; labelColor = '#fff';
                  } else {
                    opacity = 0.3;
                  }
                } else if (isSel) {
                  bg = 'rgba(249,115,22,0.15)'; border = 'rgba(249,115,22,0.6)';
                  labelBg = '#f97316'; labelColor = '#fff';
                  textColor = '#fff';
                }

                return (
                  <motion.button key={idx}
                    whileHover={!submitted ? { x: 4, backgroundColor: 'rgba(255,255,255,0.07)' } : {}}
                    whileTap={!submitted ? { scale: 0.985 } : {}}
                    onClick={() => !submitted && submitAnswer(idx)}
                    disabled={submitted}
                    className="w-full text-left flex items-center gap-3 rounded-xl transition-all"
                    style={{
                      padding: '12px 14px',
                      background: bg,
                      border: `1.5px solid ${border}`,
                      opacity,
                      cursor: submitted ? 'default' : 'pointer',
                    }}
                  >
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs flex-shrink-0 transition-all"
                      style={{ background: labelBg, color: labelColor }}>
                      {submitted && isCorrect ? <CheckCircle2 className="w-3.5 h-3.5" />
                        : submitted && isSel && !isCorrect ? <XCircle className="w-3.5 h-3.5" />
                        : OPTION_LABELS[idx]}
                    </div>
                    <span className="text-sm font-medium leading-snug" style={{ color: textColor }}>{opt}</span>
                  </motion.button>
                );
              })}
            </div>

            {/* Explicação */}
            <AnimatePresence>
              {submitted && q.explanation && (
                <motion.div
                  initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                  animate={{ opacity: 1, height: 'auto', marginBottom: 16 }}
                  exit={{ opacity: 0, height: 0 }}
                  className="rounded-xl p-3.5 overflow-hidden"
                  style={{ background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.25)' }}>
                  <p className="text-blue-200 text-sm leading-relaxed">
                    <span className="font-bold">💡 </span>{q.explanation}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

          </motion.div>
        </AnimatePresence>

        {/* Rodapé */}
        <div className="flex items-center justify-between pt-1">
          <button onClick={onClose} className="text-xs transition-colors" style={{ color: 'rgba(255,255,255,0.25)' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.5)') }
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.25)') }>
            Sair
          </button>
          {streak >= 2 && !streakFlash && (
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold"
              style={{ background: 'rgba(249,115,22,0.15)', border: '1px solid rgba(249,115,22,0.3)', color: '#fb923c' }}>
              <Zap className="w-3 h-3" /> {streak}🔥
            </div>
          )}
          {/* Timer pequeno quando vídeo aberto */}
          {showVideo && (
            <div className="flex items-center gap-1 text-xs font-bold" style={{ color: timeLeft <= 5 ? '#ef4444' : '#f97316' }}>
              ⏱ {timeLeft}s
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ─── Ecrã de resultados ───────────────────────────────────────────────────────
function ResultsScreen({ questions, answers, pct, score, feedback, eventImage, eventName, imgErr, loadQuiz, onClose }: any) {
  const circ = 2 * Math.PI * 50;
  return (
    <>
      {/* Capa */}
      <div className="relative h-40 sm:h-48 overflow-hidden" style={{ borderRadius: '24px 24px 0 0' }}>
        <img src={eventImage} alt={eventName} className="w-full h-full object-cover" onError={imgErr} />
        <div className="absolute inset-0"
          style={{ background: 'linear-gradient(to top,#0d0820 0%,#0d082080 50%,transparent 100%)' }} />
        <div className="absolute bottom-4 left-0 right-0 text-center">
          <Trophy className="w-9 h-9 mx-auto mb-1" style={{ color: feedback.color }} />
          <h2 className="text-xl font-black text-white">Resultados Finais</h2>
        </div>
      </div>

      <div className="p-5">
        {/* Score + grade */}
        <div className="flex items-center justify-center gap-8 mb-5">
          <div className="relative w-32 h-32 flex-shrink-0">
            <svg className="w-32 h-32 -rotate-90">
              <circle cx="64" cy="64" r="50" stroke="rgba(255,255,255,0.07)" strokeWidth="7" fill="none" />
              <motion.circle cx="64" cy="64" r="50"
                stroke={feedback.color} strokeWidth="7" fill="none" strokeLinecap="round"
                strokeDasharray={circ}
                initial={{ strokeDashoffset: circ }}
                animate={{ strokeDashoffset: circ * (1 - pct / 100) }}
                transition={{ duration: 1.4, ease: 'easeOut', delay: 0.2 }} />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.7, type: 'spring' }}
                className="text-3xl font-black text-white">{pct.toFixed(0)}%</motion.span>
              <span className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>{score}/{questions.length}</span>
            </div>
          </div>

          <motion.div initial={{ scale: 0, rotate: -15 }} animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.8, type: 'spring', stiffness: 200 }}
            className="w-18 h-18 rounded-2xl flex flex-col items-center justify-center p-4"
            style={{ border: `2px solid ${feedback.color}`, background: `${feedback.color}18` }}>
            <span className="text-4xl font-black leading-none" style={{ color: feedback.color }}>{feedback.grade}</span>
            <span className="text-xs mt-1 font-bold" style={{ color: `${feedback.color}99` }}>NOTA</span>
          </motion.div>
        </div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }}
          className="text-center mb-5">
          <h3 className="text-lg font-black text-white mb-0.5">{feedback.title}</h3>
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>{feedback.msg}</p>
        </motion.div>

        {/* Revisão */}
        <div className="space-y-2 mb-5 max-h-52 overflow-y-auto pr-0.5"
          style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}>
          <p className="text-xs font-bold uppercase tracking-widest mb-2"
            style={{ color: 'rgba(255,255,255,0.25)' }}>Revisão</p>
          {questions.map((q: QuizQuestion, i: number) => {
            const ua = answers[i];
            const ok = ua === q.correctAnswer;
            return (
              <motion.div key={q.id}
                initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1.2 + i * 0.06 }}
                className="rounded-xl p-3"
                style={{
                  background: ok ? 'rgba(52,211,153,0.08)' : 'rgba(244,114,114,0.08)',
                  border: `1px solid ${ok ? 'rgba(52,211,153,0.25)' : 'rgba(244,114,114,0.25)'}`,
                }}>
                <div className="flex gap-2.5 items-start">
                  <div className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ background: ok ? '#34d399' : '#f47272' }}>
                    {ok ? <CheckCircle2 className="w-2.5 h-2.5 text-white" /> : <XCircle className="w-2.5 h-2.5 text-white" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold leading-snug mb-0.5" style={{ color: 'rgba(255,255,255,0.85)' }}>
                      {i + 1}. {q.question}
                    </p>
                    {ua === -1
                      ? <p className="text-xs text-red-400">⏱ Tempo esgotado</p>
                      : <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
                          Escolheste: <span style={{ color: 'rgba(255,255,255,0.6)' }}>{q.options[ua]}</span>
                        </p>
                    }
                    {!ok && ua !== -1 && (
                      <p className="text-xs text-emerald-400 mt-0.5">✓ {q.options[q.correctAnswer]}</p>
                    )}
                    {q.explanation && (
                      <p className="text-xs mt-0.5 italic" style={{ color: 'rgba(255,255,255,0.28)' }}>💡 {q.explanation}</p>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        <div className="flex gap-2.5">
          <button onClick={loadQuiz}
            className="flex-1 py-3.5 rounded-2xl font-black text-white text-sm flex items-center justify-center gap-2 transition-transform active:scale-95"
            style={{ background: 'linear-gradient(135deg,#f97316,#ec4899)' }}>
            <RotateCcw className="w-4 h-4" /> Novo Quiz
          </button>
          <button onClick={onClose}
            className="flex-1 py-3.5 rounded-2xl font-bold text-sm transition-all active:scale-95"
            style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.55)', border: '1px solid rgba(255,255,255,0.1)' }}>
            Fechar
          </button>
        </div>
      </div>
    </>
  );
}