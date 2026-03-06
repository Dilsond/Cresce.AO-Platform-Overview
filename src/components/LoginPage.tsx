import { useState } from 'react';
import { ArrowLeft, Building2, Eye, EyeOff, LogIn } from 'lucide-react';
import { motion } from 'motion/react';
import { supabase } from '../lib/supabase';
import { Navigate } from 'react-router-dom';

export function LoginPage({ onBack, onLogin }: { onBack: () => void, onLogin: (user: any) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Função auxiliar para gerar hash SHA-256 (igual ao mock_hash_password)
  async function sha256(message: string) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // Buscar usuário na tabela pelo email
      const { data: userData, error: userError } = await supabase
        .from('usuarios_normais')
        .select('*')
        .eq('email', email)
        .maybeSingle(); // NÃO filtramos por senha diretamente, porque agora é hash

      if (userError) {
        console.error(userError);
        setError('Erro ao consultar usuário.');
        setIsLoading(false);
        return;
      }

      if (!userData) {
        setError('Email ou senha incorretos.');
        setIsLoading(false);
        return;
      }

      if (userData.deleted_at) {
        setError('Esta conta foi desativada.');
        setIsLoading(false);
        return;
      }

      // Gerar hash da senha digitada
      const hashedInputPassword = '$2a$10$' + await sha256(password); // ou use bcrypt

      // Comparar com o hash armazenado no banco
      if (userData.senha !== hashedInputPassword) {
        setError('Email ou senha incorretos.');
        setIsLoading(false);
        return;
      }

      // Login bem-sucedido
      const user = {
        id: userData.id,
        name: userData.nome_completo,
        email: userData.email,
        username: userData.nome_utilizador,
        type: 'user'
      };

      localStorage.setItem('user', JSON.stringify(user));
      onLogin(user);

    } catch (err) {
      console.error(err);
      setError('Erro inesperado. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      {/* Back button */}
      <motion.button
        onClick={onBack}
        className="fixed top-6 left-6 flex items-center cursor-pointer gap-2 text-gray-600 hover:text-gray-900 transition-colors z-50"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        whileHover={{ x: -4 }}
      >
        <ArrowLeft className="w-5 h-5" />
        Voltar
      </motion.button>

      <motion.div
        className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex flex-col lg:flex-row min-h-[550px]">
          {/* Left side - Orange Solid */}
          <motion.div
            className="lg:w-1/2 bg-orange-600 p-12 flex flex-col justify-between text-white relative overflow-hidden"
            initial={{ x: -50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            {/* Decorative circles */}
            <div className="absolute top-10 left-10 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
            <div className="absolute bottom-10 right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>

            <div className="relative z-10">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.4, type: "spring" }}
                className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mb-8"
              >
                <div className="w-8 h-8 bg-white rounded-lg"></div>
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
                  <div className="w-8 h-8 rounded-full bg-white/30 border-2 border-white"></div>
                  <div className="w-8 h-8 rounded-full bg-white/30 border-2 border-white"></div>
                  <div className="w-8 h-8 rounded-full bg-white/30 border-2 border-white"></div>
                </div>
                <span>Junte-se a milhares de profissionais</span>
              </div>
            </motion.div>
          </motion.div>

          {/* Right side - Form */}
          <div className="lg:w-1/2 p-12 flex flex-col justify-center">
            <motion.div
              initial={{ x: 50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <div className="mb-8">
                <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center mb-6">
                  <div className="w-5 h-5 bg-orange-600 rounded-md"></div>
                </div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Login - Usuário</h1>
                <p className="text-gray-600">
                  Acesse sua conta de usuário para participar de eventos
                </p>
              </div>

              {/* Mensagem de erro */}
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-600 text-sm">{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
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
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all text-gray-900 placeholder-gray-400"
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
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all text-gray-900 placeholder-gray-400 pr-12"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5 cursor-pointer" /> : <Eye className="w-5 h-5 cursor-pointer" />}
                    </button>
                  </div>
                </div>

                <motion.button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-orange-600 cursor-pointer text-white py-3.5 rounded-xl font-semibold hover:bg-orange-700 transition-all shadow-lg shadow-orange-500/30 hover:shadow-xl hover:shadow-orange-500/40 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                >
                  {isLoading ? (
                    <>
                      <motion.div
                        className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
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

              {/* Divider */}
              <div className="my-6">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-white text-gray-500">Ou continue com</span>
                  </div>
                </div>
              </div>

              {/* Social buttons */}
              <div className="grid grid-cols-3 gap-3">
                <button className="px-4 py-2.5 border border-gray-200 cursor-pointer rounded-xl hover:bg-gray-50 transition-colors flex items-center justify-center">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                  </svg>
                </button>
                <button className="px-4 py-2.5 border border-gray-200 cursor-pointer rounded-xl hover:bg-gray-50 transition-colors flex items-center justify-center">
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                </button>
                <button className="px-4 py-2.5 border border-gray-200 cursor-pointer rounded-xl hover:bg-gray-50 transition-colors flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                </button>
              </div>

              <p className="text-center text-gray-600 mt-6">
                Não tem uma conta?{' '}
                <button
                  onClick={() => window.location.href = '/signup'}
                  className="text-orange-600 hover:text-orange-700 cursor-pointer font-semibold transition-colors"
                >
                  Criar conta de usuário
                </button>
              </p>

              {/* Organizer link */}
              <div className="pt-6 border-t border-gray-100">
                <button
                  onClick={() => window.location.href = '/organizer-login'}
                  className="w-full flex items-center justify-center gap-2 cursor-pointer px-4 py-3 border-2 border-orange-600 text-orange-600 rounded-xl hover:bg-orange-50 transition-colors font-semibold"
                >
                  <Building2 className="w-5 h-5" />
                  Sou Organizador de Eventos
                </button>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}