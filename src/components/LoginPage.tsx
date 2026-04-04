import { useState } from 'react';
import { ArrowLeft, Building2, Eye, EyeOff, LogIn } from 'lucide-react';
import { motion } from 'motion/react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

export function LoginPage({ onBack, onLogin }: { onBack: () => void, onLogin: (user: any) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  async function sha256(message: string): Promise<string> {
    if (!window.crypto || !window.crypto.subtle) {
      if (import.meta.env.DEV) return message;
      throw new Error('Ambiente não seguro para autenticação');
    }
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    if (!email || !password) {
      setError('Por favor, preencha todos os campos');
      setIsLoading(false);
      return;
    }

    try {
      const { data: userData, error: userError } = await supabase
        .from('usuarios_normais')
        .select('*')
        .eq('email', email)
        .maybeSingle();

      if (userError) { setError('Erro ao consultar usuário.'); setIsLoading(false); return; }
      if (!userData)  { setError('Email ou senha incorretos.'); setIsLoading(false); return; }
      if (userData.deleted_at) { setError('Esta conta está suspensa.'); setIsLoading(false); return; }

      const hashedInputPassword = '$2a$10$' + await sha256(password);
      if (userData.senha !== hashedInputPassword) {
        setError('Email ou senha incorretos.');
        setIsLoading(false);
        return;
      }

      const user = {
        id: userData.id,
        name: userData.nome_completo,
        email: userData.email,
        username: userData.nome_utilizador,
        type: 'user' as const
      };

      localStorage.setItem('user', JSON.stringify(user));
      onLogin(user);

    } catch (err) {
      setError('Ocorreu um erro inesperado. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      {/* Back button */}
      <motion.button
        onClick={onBack}
        className="fixed top-4 left-4 sm:top-6 sm:left-6 flex items-center cursor-pointer gap-2 text-gray-600 hover:text-gray-900 transition-colors z-50 bg-white/80 backdrop-blur-sm px-3 py-2 rounded-xl shadow-sm"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        whileHover={{ x: -4 }}
      >
        <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
        <span className="text-sm sm:text-base">Voltar</span>
      </motion.button>

      <motion.div
        className="w-full max-w-4xl bg-white rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden mt-14 sm:mt-0"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex flex-col lg:flex-row min-h-[500px]">

          {/* Left side — visível apenas em lg+ */}
          <motion.div
            className="hidden lg:flex lg:w-1/2 bg-orange-600 p-12 flex-col justify-between text-white relative overflow-hidden"
            initial={{ x: -50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <div className="absolute top-10 left-10 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
            <div className="absolute bottom-10 right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />

            <div className="relative z-10">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.4, type: 'spring' }}
                className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mb-8"
              >
                <div className="w-8 h-8 bg-white rounded-lg" />
              </motion.div>

              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                <p className="text-lg mb-4 text-white/90">Você pode facilmente</p>
                <h2 className="text-4xl font-bold leading-tight mb-6">
                  Acesse sua plataforma de eventos para crescimento e networking
                </h2>
                <p className="text-white/80 text-lg">
                  Conecte-se com profissionais, descubra eventos e impulsione sua carreira com o Cresce.AO
                </p>
              </motion.div>
            </div>

            <motion.div
              className="relative z-10"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.6 }}
            >
              <div className="flex items-center gap-2 text-white/70 text-sm">
                <div className="flex -space-x-2">
                  <div className="w-8 h-8 rounded-full bg-white/30 border-2 border-white" />
                  <div className="w-8 h-8 rounded-full bg-white/30 border-2 border-white" />
                  <div className="w-8 h-8 rounded-full bg-white/30 border-2 border-white" />
                </div>
                <span>Junte-se a milhares de profissionais</span>
              </div>
            </motion.div>
          </motion.div>

          {/* Topo laranja no mobile (substitui o lado esquerdo) */}
          <div className="lg:hidden bg-orange-600 px-6 py-8 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
            <div className="relative z-10">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center mb-3">
                <div className="w-5 h-5 bg-white rounded-md" />
              </div>
              <h2 className="text-xl font-bold leading-tight">
                Plataforma de eventos para crescimento e networking
              </h2>
            </div>
          </div>

          {/* Right side — formulário */}
          <div className="lg:w-1/2 p-6 sm:p-8 lg:p-12 flex flex-col justify-center">
            <motion.div
              initial={{ x: 50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <div className="mb-6 sm:mb-8">
                <div className="hidden lg:flex w-10 h-10 bg-orange-100 rounded-xl items-center justify-center mb-6">
                  <div className="w-5 h-5 bg-orange-600 rounded-md" />
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">Login</h1>
                <p className="text-sm sm:text-base text-gray-600">
                  Acesse sua conta para participar de eventos
                </p>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-600 text-sm">{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    Seu e-mail
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all text-gray-900 placeholder-gray-400 text-sm sm:text-base"
                    placeholder="seuemail@gmail.com"
                  />
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                    Senha
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all text-gray-900 placeholder-gray-400 pr-12 text-sm sm:text-base"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {showPassword
                        ? <EyeOff className="w-5 h-5 cursor-pointer" />
                        : <Eye className="w-5 h-5 cursor-pointer" />
                      }
                    </button>
                  </div>
                </div>

                <div className="text-right">
                  <button
                    type="button"
                    onClick={() => navigate('/forgot-password')}
                    className="text-sm text-orange-600 hover:text-orange-700 font-semibold transition-colors cursor-pointer"
                  >
                    Esqueceu a senha?
                  </button>
                </div>

                <motion.button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-orange-600 cursor-pointer text-white py-3 sm:py-3.5 rounded-xl font-semibold hover:bg-orange-700 transition-all shadow-lg shadow-orange-500/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm sm:text-base"
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                >
                  {isLoading ? (
                    <>
                      <motion.div
                        className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                      />
                      Entrando...
                    </>
                  ) : (
                    <>
                      <LogIn className="w-5 h-5" />
                      Entrar
                    </>
                  )}
                </motion.button>
              </form>

              <div className="my-5 sm:my-6">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-gray-50 text-gray-500">Ou continue com</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => window.location.href = '/organizer-login'}
                className="w-full flex items-center justify-center gap-2 cursor-pointer px-4 py-3 border-2 border-orange-600 text-orange-600 rounded-xl hover:bg-orange-50 transition-colors font-semibold text-sm sm:text-base"
              >
                <Building2 className="w-5 h-5" />
                Sou Organizador de Eventos
              </button>

              <p className="text-center text-gray-600 mt-5 text-sm sm:text-base">
                Não tem uma conta?{' '}
                <button
                  onClick={() => window.location.href = '/signup'}
                  className="text-orange-600 hover:text-orange-700 cursor-pointer font-semibold transition-colors"
                >
                  Criar conta
                </button>
              </p>
            </motion.div>
          </div>

        </div>
      </motion.div>
    </div>
  );
}