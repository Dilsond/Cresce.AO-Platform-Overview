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

// ─── Confetti responsivo ─────────────────────────────────────────────────────
const Confetti = () => {
  const colors = ['#ea580c', '#f97316', '#fb923c', '#fdba74', '#16a34a', '#4ade80', '#1d4ed8', '#60a5fa'];
  // Reduz número de confetes em mobile
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  const count = isMobile ? 24 : 48;
  
  return (
    <div className="pointer-events-none fixed inset-0 z-[80] overflow-hidden">
      {Array.from({ length: count }).map((_, i) => (
        <motion.div key={i} className="absolute rounded-sm"
          style={{
            backgroundColor: colors[i % colors.length],
            width: (isMobile ? 3 : 5) + Math.random() * (isMobile ? 5 : 7), 
            height: (isMobile ? 3 : 5) + Math.random() * (isMobile ? 5 : 7),
            left: `${Math.random() * 100}%`, top: '-16px',
          }}
          animate={{
            y: ['0vh', '110vh'], x: [(Math.random() - 0.5) * (isMobile ? 180 : 280)],
            rotate: [0, Math.random() * 720 - 360], opacity: [1, 1, 0],
          }}
          transition={{ duration: (isMobile ? 1.5 : 2) + Math.random() * (isMobile ? 1.5 : 2), 
            delay: Math.random() * (isMobile ? 0.8 : 1.2), ease: 'easeIn' }}
        />
      ))}
    </div>
  );
};

// ─── Timer circular responsivo ───────────────────────────────────────────────
const CircularTimer = ({ seconds, total }: { seconds: number; total: number }) => {
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  const r = isMobile ? 16 : 20;
  const circ = 2 * Math.PI * r;
  const urgent = seconds <= 5;
  const warning = seconds <= 10;
  const color = urgent ? '#dc2626' : warning ? '#d97706' : '#ea580c';
  const size = isMobile ? 36 : 48;
  
  return (
    <div className={`relative w-${size/4} h-${size/4} flex items-center justify-center flex-shrink-0`}
         style={{ width: size, height: size }}>
      <svg className="-rotate-90 absolute inset-0 w-full h-full">
        <circle cx={size/2} cy={size/2} r={r} stroke="#e5e7eb" strokeWidth={isMobile ? 2.5 : 3} fill="none" />
        <motion.circle cx={size/2} cy={size/2} r={r}
          stroke={color} strokeWidth={isMobile ? 2.5 : 3} fill="none" strokeLinecap="round"
          strokeDasharray={circ}
          animate={{ strokeDashoffset: circ - (seconds / total) * circ }}
          transition={{ duration: 1, ease: 'linear' }}
        />
      </svg>
      <motion.span
        key={urgent ? 'u' : 'n'}
        animate={urgent ? { scale: [1, 1.2, 1] } : { scale: 1 }}
        transition={{ duration: 0.4, repeat: urgent ? Infinity : 0 }}
        className={`text-${isMobile ? 'xs' : 'sm'} font-black tabular-nums relative z-10`}
        style={{ color }}
      >{seconds}</motion.span>
    </div>
  );
};

// ─── Mapa de temas → paletas e ícones SVG responsivo ─────────────────────────
const CATEGORY_THEMES: Record<string, { bg: string; accent: string; light: string; letter: string }> = {
  default: { bg: '#FFF7ED', accent: '#EA580C', light: '#FDDCBB', letter: 'G' },
  musica: { bg: '#F0FDF4', accent: '#16A34A', light: '#BBF7D0', letter: 'M' },
  arte: { bg: '#FDF4FF', accent: '#9333EA', light: '#E9D5FF', letter: 'A' },
  tecnologia: { bg: '#EFF6FF', accent: '#1D4ED8', light: '#BFDBFE', letter: 'T' },
  desporto: { bg: '#FEFCE8', accent: '#CA8A04', light: '#FEF08A', letter: 'D' },
  ciencia: { bg: '#ECFDF5', accent: '#0F766E', light: '#99F6E4', letter: 'C' },
  historia: { bg: '#FFF8F1', accent: '#C2410C', light: '#FED7AA', letter: 'H' },
  gastronomia: { bg: '#FFF1F2', accent: '#DC2626', light: '#FECACA', letter: 'G' },
};

function getCategory(category: string, question: string) {
  const t = (category + ' ' + question).toLowerCase();
  if (/music|song|canc|sound|banda|álbum/.test(t)) return CATEGORY_THEMES.musica;
  if (/art|paint|design|desen|pintura/.test(t)) return CATEGORY_THEMES.arte;
  if (/tech|code|software|program|comput/.test(t)) return CATEGORY_THEMES.tecnologia;
  if (/sport|futebol|basket|desport|corrida/.test(t)) return CATEGORY_THEMES.desporto;
  if (/scien|ciência|biolog|quimic|física/.test(t)) return CATEGORY_THEMES.ciencia;
  if (/histor|guerra|war|empire|império/.test(t)) return CATEGORY_THEMES.historia;
  if (/food|comida|chef|gastro|culin|receita/.test(t)) return CATEGORY_THEMES.gastronomia;
  return CATEGORY_THEMES.default;
}

function AIQuestionImage({ prompt, question }: { prompt?: string; question: string }) {
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  const cat = prompt?.split(':')[0] ?? '';
  const theme = getCategory(cat, question);

  const tags = question.replace(/[?!.,]/g, '').split(' ')
    .filter(w => w.length > 3).slice(0, isMobile ? 2 : 3);

  const hash = question.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const barPct = 30 + (hash % 55);
  const triPoints = `${360 + (hash % 30)},10 ${420},10 ${390 + (hash % 20)},${40 + (hash % 20)}`;
  
  const width = isMobile ? 320 : 440;
  const height = isMobile ? 120 : 150;
  const fontSize = isMobile ? 11 : 13;
  const tagFontSize = isMobile ? 9 : 10;

  const svg = `
<svg width="100%" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${width}" height="${height}" fill="${theme.bg}" rx="${isMobile ? 6 : 10}"/>
  <rect x="0" y="0" width="${isMobile ? 6 : 10}" height="${height}" fill="${theme.accent}" rx="${isMobile ? 2 : 3}"/>

  <circle cx="${width - 100}" cy="${isMobile ? 25 : 30}" r="${isMobile ? 40 : 60}" fill="${theme.accent}" opacity=".05"/>
  <circle cx="${width - 35}" cy="${height - 20}" r="${isMobile ? 25 : 38}" fill="${theme.accent}" opacity=".07"/>
  <polygon points="${triPoints}" fill="${theme.accent}" opacity=".07"/>

  <circle cx="${isMobile ? 40 : 56}" cy="${height/2}" r="${isMobile ? 20 : 30}" fill="${theme.accent}" opacity=".10"/>
  <circle cx="${isMobile ? 40 : 56}" cy="${height/2}" r="${isMobile ? 13 : 20}" fill="${theme.accent}" opacity=".17"/>
  <circle cx="${isMobile ? 40 : 56}" cy="${height/2}" r="${isMobile ? 8 : 12}" fill="${theme.accent}"/>
  <text x="${isMobile ? 40 : 56}" y="${height/2 + (isMobile ? 3 : 5)}" text-anchor="middle"
    font-family="system-ui,sans-serif" font-size="${isMobile ? 10 : 13}" font-weight="700" fill="#fff">${theme.letter}</text>

  <text x="${isMobile ? 70 : 104}" y="${isMobile ? 42 : 52}" font-family="system-ui,sans-serif"
    font-size="${isMobile ? 10 : 11}" font-weight="600" fill="${theme.accent}" opacity=".8">${cat || 'Geral'}</text>

  <text x="${isMobile ? 70 : 104}" y="${isMobile ? 60 : 74}" font-family="system-ui,sans-serif"
    font-size="${fontSize}" font-weight="700" fill="#1F2937">
    ${question.length > (isMobile ? 35 : 52) ? question.slice(0, isMobile ? 35 : 52) + '…' : question}
  </text>

  <rect x="${isMobile ? 70 : 104}" y="${isMobile ? 70 : 87}" width="${width - (isMobile ? 90 : 130)}" height="${isMobile ? 3 : 5}" rx="${isMobile ? 1.5 : 2.5}" fill="${theme.light}"/>
  <rect x="${isMobile ? 70 : 104}" y="${isMobile ? 70 : 87}" width="${Math.round((width - (isMobile ? 90 : 130)) * barPct / 100)}" height="${isMobile ? 3 : 5}" rx="${isMobile ? 1.5 : 2.5}" fill="${theme.accent}" opacity=".65"/>

  ${tags.map((w, i) => {
    const x = isMobile 
      ? (i === 0 ? 70 : 70 + tags[0].length * 5 + 15)
      : (i === 0 ? 104 : i === 1 ? 104 + tags[0].length * 6 + 18 : 104 + tags[0].length * 6 + 18 + (tags[1]?.length ?? 0) * 6 + 26);
    const tagWidth = w.length * (isMobile ? 5 : 6) + (isMobile ? 10 : 14);
    return `
  <rect x="${x}" y="${isMobile ? 82 : 103}" width="${tagWidth}" height="${isMobile ? 12 : 16}" rx="${isMobile ? 6 : 8}"
    fill="${theme.accent}" opacity="${0.12 - i * 0.02}"/>
  <text x="${x + (isMobile ? 4 : 7)}" y="${isMobile ? 91 : 115}" font-family="system-ui,sans-serif"
    font-size="${tagFontSize}" fill="${theme.accent}">${w.toLowerCase()}</text>`;
  }).join('')}
</svg>`;

  return (
    <div
      className="w-full rounded-lg overflow-hidden"
      dangerouslySetInnerHTML={{ __html: svg }}
      style={{ lineHeight: 0 }}
    />
  );
}

// ─── Loading responsivo ──────────────────────────────────────────────────────
const QuizLoading = ({ eventName }: { eventName: string }) => (
  <div className="flex flex-col items-center justify-center p-6 sm:p-8 text-center min-h-[280px] sm:min-h-[360px] bg-white">
    <div className="relative w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 sm:mb-5">
      <motion.div className="absolute inset-0 rounded-full border-2 border-orange-200"
        animate={{ scale: [1, 1.25, 1], opacity: [0.5, 0, 0.5] }}
        transition={{ duration: 2, repeat: Infinity }} />
      <motion.div className="absolute inset-0 rounded-full border-2 border-orange-500"
        animate={{ rotate: 360 }} transition={{ duration: 1.8, repeat: Infinity, ease: 'linear' }} />
      <div className="absolute inset-0 flex items-center justify-center bg-orange-50 rounded-full">
        <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 1.5, repeat: Infinity }}>
          <Brain className="w-7 h-7 sm:w-9 sm:h-9 text-orange-600" />
        </motion.div>
      </div>
    </div>
    <h3 className="text-sm sm:text-base font-bold text-gray-900 mb-1">A preparar o quiz</h3>
    <p className="text-xs sm:text-sm text-gray-500 mb-4 sm:mb-5">IA a gerar perguntas e ilustrações...</p>
    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden w-32 sm:w-36 mx-auto">
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

// ─── Componente principal responsivo ─────────────────────────────────────────
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
    if (pct >= 80) return { title: 'Excelente! ⚡', msg: 'Muito bom desempenho!', color: '#16a34a', grade: 'A' };
    if (pct >= 60) return { title: 'Bom trabalho! 👍', msg: 'Continua a melhorar!', color: '#1d4ed8', grade: 'B' };
    if (pct >= 40) return { title: 'Pode melhorar 📚', msg: 'Revê os conteúdos.', color: '#d97706', grade: 'C' };
    return { title: 'Tenta novamente 💪', msg: 'Não desistas!', color: '#6b7280', grade: 'D' };
  })();

  const currentQ = questions[current];

  const modalContent = (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-3 md:p-5"
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
          maxWidth: 'min(460px, 95vw)',
          borderRadius: 'clamp(12px, 4vw, 14px)',
          maxHeight: 'min(92vh, 700px)',
          border: '1px solid #e5e7eb',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Responsivo */}
        <div className="flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3 bg-white border-b border-gray-100">
          <div className="flex items-center gap-2 sm:gap-2.5">
            <div className="w-7 h-7 sm:w-8 sm:h-8 bg-orange-600 rounded-lg flex items-center justify-center shadow-sm">
              <Brain className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
            </div>
            <div>
              <p className="text-xs sm:text-sm font-bold text-gray-900 leading-tight">Quiz Educativo</p>
              <p className="text-[9px] sm:text-[10px] text-gray-400 truncate max-w-[120px] sm:max-w-[150px]">{eventName}</p>
            </div>
          </div>
          <div className="flex items-center gap-1 sm:gap-1.5">
            <button onClick={() => setSoundOn(s => !s)}
              className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center bg-gray-100 hover:bg-orange-50 hover:text-orange-600 transition-colors">
              {soundOn
                ? <Volume2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-orange-600" />
                : <VolumeX className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-gray-400" />}
            </button>
            <button onClick={onClose}
              className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center bg-gray-100 hover:bg-red-50 transition-colors">
              <X className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Body com scroll responsivo */}
        <div className="overflow-y-auto" style={{ maxHeight: 'min(calc(92vh - 52px), 650px)', scrollbarWidth: 'none' }}>
          {loading
            ? <QuizLoading eventName={eventName} />
            : error
              ? (
                <div className="p-4 sm:p-6 text-center">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-red-50 border border-red-200 flex items-center justify-center mx-auto mb-3">
                    <XCircle className="w-5 h-5 sm:w-6 sm:h-6 text-red-500" />
                  </div>
                  <h3 className="text-sm sm:text-base font-bold text-gray-900 mb-1">Erro ao gerar quiz</h3>
                  <p className="text-gray-500 text-xs mb-3 sm:mb-4 leading-relaxed">{error}</p>
                  <div className="flex gap-2">
                    <button onClick={loadQuiz}
                      className="flex-1 py-2 sm:py-2.5 rounded-lg font-semibold text-white text-sm bg-orange-600 hover:bg-orange-700 transition-colors">
                      Tentar novamente
                    </button>
                    <button onClick={onClose}
                      className="flex-1 py-2 sm:py-2.5 rounded-lg font-semibold text-gray-600 text-sm bg-gray-100 hover:bg-gray-200 transition-colors">
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

// ─── Ecrã de pergunta responsivo ─────────────────────────────────────────────
function QuestionScreen({
  q, current, questions, selected, submitted, timeLeft, streak,
  streakFlash, answers, eventCategory, submitAnswer, onClose,
}: any) {
  const progressPct = ((current + 1) / questions.length) * 100;
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <div className="bg-white">
      {/* Progress */}
      <div className="h-0.5 sm:h-1 bg-gray-100">
        <motion.div className="h-full bg-orange-500"
          animate={{ width: `${progressPct}%` }} transition={{ duration: 0.4 }} />
      </div>

      {/* Streak toast responsivo */}
      <AnimatePresence>
        {streakFlash && (
          <motion.div
            initial={{ y: -24, opacity: 0, scale: 0.88 }} animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -24, opacity: 0, scale: 0.88 }}
            className="absolute top-12 sm:top-14 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-white text-[10px] sm:text-xs font-bold shadow-lg bg-orange-600 border border-orange-700 whitespace-nowrap"
          >
            <Zap className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> {streak} seguidas! 🔥
          </motion.div>
        )}
      </AnimatePresence>

      <div className="p-3 sm:p-4">
        {/* Meta row responsivo */}
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            <span className="text-[9px] sm:text-[10px] font-bold text-orange-600 bg-orange-50 border border-orange-200 px-1.5 sm:px-2 py-0.5 rounded-full uppercase tracking-wider">
              {eventCategory}
            </span>
            <div className="flex gap-0.5 sm:gap-1 items-center">
              {questions.map((_: any, i: number) => (
                <div key={i} className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full transition-all duration-300"
                  style={{
                    background: i < current
                      ? (answers[i] === questions[i]?.correctAnswer ? '#16a34a' : '#dc2626')
                      : i === current ? '#ea580c' : '#e5e7eb'
                  }} />
              ))}
              <span className="text-[9px] sm:text-[10px] text-gray-400 font-medium ml-0.5 sm:ml-1">{current + 1}/{questions.length}</span>
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
            <div className="mb-2 sm:mb-3">
              <AIQuestionImage
                prompt={q.imagePrompt || `${eventCategory}: ${q.question}`}
                question={q.question}
              />
            </div>

            {/* Pergunta */}
            <p className="text-sm sm:text-base font-bold text-gray-900 leading-snug mb-3">{q.question}</p>

            {/* Opções responsivas */}
            <div className="space-y-2 sm:space-y-2.5 mb-3">
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
                    icon = <CheckCircle2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />;
                  } else if (isSel) {
                    style = { bg: 'bg-red-50', border: 'border-red-400', lBg: 'bg-red-500', lColor: 'text-white', txt: 'text-red-800', opacity: '' };
                    icon = <XCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5" />;
                  } else {
                    style.opacity = 'opacity-30';
                  }
                } else if (isSel) {
                  style = { bg: 'bg-orange-50', border: 'border-orange-500', lBg: 'bg-orange-600', lColor: 'text-white', txt: 'text-orange-900', opacity: '' };
                }

                return (
                  <motion.button key={idx}
                    whileHover={!submitted ? { x: isMobile ? 2 : 3 } : {}}
                    whileTap={!submitted ? { scale: 0.985 } : {}}
                    onClick={() => !submitted && submitAnswer(idx)}
                    disabled={submitted}
                    className={`w-full text-left flex items-center gap-2 sm:gap-2.5 rounded-lg border px-2 sm:px-3 py-2 sm:py-2.5 transition-all ${style.bg} ${style.border} ${style.opacity}`}
                    style={{ cursor: submitted ? 'default' : 'pointer' }}
                  >
                    <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-md flex items-center justify-center font-bold text-[10px] sm:text-xs flex-shrink-0 ${style.lBg} ${style.lColor}`}>
                      {icon}
                    </div>
                    <span className={`text-xs sm:text-sm font-medium leading-snug ${style.txt}`}>{opt}</span>
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
                  className="rounded-lg p-2 sm:p-3 mb-3 overflow-hidden bg-blue-50 border border-blue-200">
                  <p className="text-[10px] sm:text-xs text-blue-800 leading-relaxed">
                    <span className="font-bold">💡 </span>{q.explanation}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </AnimatePresence>

        {/* Rodapé responsivo */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-100 mt-1">
          <button onClick={onClose} className="text-[10px] sm:text-xs text-gray-400 hover:text-gray-600 transition-colors font-medium">
            Sair
          </button>
          {streak >= 2 && !streakFlash && (
            <div className="flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-xs font-bold bg-orange-50 border border-orange-200 text-orange-600">
              <Zap className="w-2 h-2 sm:w-2.5 sm:h-2.5" /> {streak}🔥
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Ecrã de resultados responsivo ───────────────────────────────────────────
function ResultsScreen({ questions, answers, pct, score, feedback, loadQuiz, onClose }: any) {
  const [isMobile, setIsMobile] = useState(false);
  const r = isMobile ? 36 : 48;
  const circ = 2 * Math.PI * r;
  
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  return (
    <div className="bg-white">
      {/* Score header responsivo */}
      <div className="px-4 sm:px-5 py-4 sm:py-5 border-b border-gray-100">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="relative w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0">
            <svg className="w-20 h-20 sm:w-24 sm:h-24 -rotate-90" viewBox="0 0 96 96">
              <circle cx="48" cy="48" r={r} stroke="#f3f4f6" strokeWidth={isMobile ? 8 : 6} fill="none" />
              <motion.circle cx="48" cy="48" r={r}
                stroke={feedback.color} strokeWidth={isMobile ? 8 : 6} fill="none" strokeLinecap="round"
                strokeDasharray={circ}
                initial={{ strokeDashoffset: circ }}
                animate={{ strokeDashoffset: circ * (1 - pct / 100) }}
                transition={{ duration: 1.1, ease: 'easeOut', delay: 0.2 }} />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.5, type: 'spring' }}
                className="text-xl sm:text-2xl font-black text-gray-900 leading-none">{pct.toFixed(0)}%</motion.span>
              <span className="text-[8px] sm:text-[10px] text-gray-400 font-medium">{score}/{questions.length}</span>
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2 mb-1">
              <Trophy className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" style={{ color: feedback.color }} />
              <h2 className="text-sm sm:text-base font-black text-gray-900 truncate">{feedback.title}</h2>
            </div>
            <p className="text-[10px] sm:text-xs text-gray-500 mb-1.5 sm:mb-2">{feedback.msg}</p>
            <motion.div
              initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.7, type: 'spring' }}
              className="inline-flex items-center px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-lg border-2 font-black text-lg sm:text-xl leading-none"
              style={{ borderColor: feedback.color, color: feedback.color, background: `${feedback.color}12` }}>
              {feedback.grade}
            </motion.div>
          </div>
        </div>
      </div>

      <div className="p-3 sm:p-4">
        <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Revisão das respostas</p>
        <div className="space-y-2 sm:space-y-2.5 mb-3 sm:mb-4 max-h-48 sm:max-h-60 overflow-y-auto pr-0.5"
          style={{ scrollbarWidth: 'thin', scrollbarColor: '#e5e7eb transparent' }}>
          {questions.map((q: QuizQuestion, i: number) => {
            const ua = answers[i];
            const ok = ua === q.correctAnswer;
            return (
              <motion.div key={q.id}
                initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.9 + i * 0.07 }}
                className={`rounded-lg p-2 sm:p-2.5 border flex gap-2 items-start ${ok ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                <div className={`w-3 h-3 sm:w-4 sm:h-4 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${ok ? 'bg-green-500' : 'bg-red-500'}`}>
                  {ok ? <CheckCircle2 className="w-2 h-2 sm:w-2.5 sm:h-2.5 text-white" /> : <XCircle className="w-2 h-2 sm:w-2.5 sm:h-2.5 text-white" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] sm:text-xs font-semibold text-gray-800 leading-snug">{i + 1}. {q.question}</p>
                  {ua === -1
                    ? <p className="text-[9px] sm:text-[10px] text-red-500 font-medium mt-0.5">⏱ Tempo esgotado</p>
                    : <p className="text-[9px] sm:text-[10px] text-gray-400 mt-0.5">
                      Escolheste: <span className="text-gray-700 font-medium">{q.options[ua]}</span>
                    </p>
                  }
                  {!ok && ua !== -1 && (
                    <p className="text-[9px] sm:text-[10px] text-green-600 font-semibold mt-0.5">✓ {q.options[q.correctAnswer]}</p>
                  )}
                  {q.explanation && (
                    <p className="text-[9px] sm:text-[10px] text-gray-400 italic mt-0.5">💡 {q.explanation}</p>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>

        <div className="flex gap-2">
          <button onClick={loadQuiz}
            className="flex-1 py-2.5 sm:py-3 rounded-lg font-bold text-white text-xs sm:text-sm bg-orange-600 hover:bg-orange-700 transition-colors flex items-center justify-center gap-1.5 sm:gap-2 shadow-sm">
            <RotateCcw className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> Novo Quiz
          </button>
          <button onClick={onClose}
            className="flex-1 py-2.5 sm:py-3 rounded-lg font-semibold text-gray-600 text-xs sm:text-sm bg-gray-100 hover:bg-gray-200 transition-colors">
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}