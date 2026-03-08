import { useState } from 'react';
import { ArrowLeft, UserPlus, Eye, EyeOff, Building2 } from 'lucide-react';
import { motion } from 'motion/react';
import { supabase } from '../lib/supabase';

interface SignupPageProps {
  onSignup: (user: any) => void;
  onNavigateToLogin: () => void;
  onBack: () => void;
}

export function SignupPage({ onSignup, onNavigateToLogin, onBack }: SignupPageProps) {
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
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
      console.log('1. Iniciando cadastro de usuário...');

      // Validar username (apenas letras, números e underscore)
      if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
        setError('Nome de utilizador deve ter entre 3-20 caracteres e conter apenas letras, números e _');
        setIsLoading(false);
        return;
      }

      // Validar email
      if (!email.includes('@') || email.split('@')[1].split('.').length < 2) {
        setError('Por favor, insira um email válido');
        setIsLoading(false);
        return;
      }

      console.log('2. Verificando email existente...');
      // Verificar se já existe usuário com este email
      const { data: existingEmail, error: emailCheckError } = await supabase
        .from('usuarios_normais')
        .select('email')
        .eq('email', email)
        .maybeSingle();

      if (emailCheckError) {
        console.error('Erro ao verificar email:', emailCheckError);
        setError('Erro ao verificar email. Tente novamente.');
        setIsLoading(false);
        return;
      }

      if (existingEmail) {
        setError('Este email já está registado');
        setIsLoading(false);
        return;
      }

      console.log('3. Verificando username existente...');
      // Verificar se já existe usuário com este username
      const { data: existingUsername, error: usernameCheckError } = await supabase
        .from('usuarios_normais')
        .select('nome_utilizador')
        .eq('nome_utilizador', username)
        .maybeSingle();

      if (usernameCheckError) {
        console.error('Erro ao verificar username:', usernameCheckError);
        setError('Erro ao verificar nome de utilizador. Tente novamente.');
        setIsLoading(false);
        return;
      }

      if (existingUsername) {
        setError('Este nome de utilizador já está em uso');
        setIsLoading(false);
        return;
      }

      console.log('4. Gerando hash da senha...');
      // Gerar hash da senha (igual ao mock_hash_password)
      const hashedPassword = '$2a$10$' + await sha256(password);

      console.log('5. Inserindo novo usuário...');

      // Inserir novo usuário
      const { data: newUser, error: insertError } = await supabase
        .from('usuarios_normais')
        .insert([
          {
            nome_completo: name,
            nome_utilizador: username,
            email: email,
            senha: hashedPassword,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ])
        .select();

      if (insertError) {
        console.error('ERRO DETALHADO AO INSERIR:', insertError);

        // Mensagens de erro específicas
        if (insertError.message.includes('row-level security')) {
          setError('Erro de permissão. Contacte o administrador.');
        } else if (insertError.code === '23505') {
          setError('Este email ou nome de utilizador já está registado.');
        } else {
          setError(`Erro ao criar conta: ${insertError.message}`);
        }
        setIsLoading(false);
        return;
      }

      console.log('6. Usuário inserido com sucesso:', newUser);

      if (!newUser || newUser.length === 0) {
        setError('Erro ao criar conta. Nenhum dado retornado.');
        setIsLoading(false);
        return;
      }

      // Cadastro bem-sucedido
      const user = {
        id: newUser[0].id,
        name: newUser[0].nome_completo,
        username: newUser[0].nome_utilizador,
        email: newUser[0].email,
        type: 'user' as const
      };

      console.log('7. Chamando onSignup com:', user);
      onSignup(user);

    } catch (err) {
      console.error('ERRO INESPERADO:', err);
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
        className="fixed top-6 left-6 flex cursor-pointer items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors z-50"
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
        <div className="flex flex-col lg:flex-row min-h-[600px]">
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
                  Crie sua conta e comece a crescer hoje mesmo
                </h2>
                <p className="text-white/80 text-lg">
                  Descubra eventos incríveis, conecte-se com profissionais e expanda sua rede de networking em Angola
                </p>
              </motion.div>
            </div>

            <motion.div
              className="relative z-10"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.6 }}
            >
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-white/90">
                  <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span>Acesso ilimitado a eventos</span>
                </div>
                <div className="flex items-center gap-3 text-white/90">
                  <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span>Networking com profissionais</span>
                </div>
                <div className="flex items-center gap-3 text-white/90">
                  <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span>Certificados e conquistas</span>
                </div>
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
                  <UserPlus className="w-5 h-5 text-orange-600" />
                </div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Criar Conta</h1>
                <p className="text-gray-600">
                  Junte-se à comunidade e comece sua jornada de crescimento profissional
                </p>
              </div>

              {/* Mensagem de erro */}
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-600 text-sm">{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                    Nome Completo
                  </label>
                  <input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all text-gray-900 placeholder-gray-400"
                    placeholder="Digite seu nome completo"
                  />
                </div>

                <div>
                  <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                    Nome de Utilizador
                  </label>
                  <input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all text-gray-900 placeholder-gray-400"
                    placeholder="Digite seu nome de utilizador"
                  />
                  <p className="text-xs text-gray-500 mt-1.5">3-20 caracteres, apenas letras, números e _</p>
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    E-mail
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all text-gray-900 placeholder-gray-400"
                    placeholder="seu@email.com"
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
                      minLength={6}
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
                  <p className="text-xs text-gray-500 mt-1.5">Mínimo de 6 caracteres</p>
                </div>

                <motion.button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-orange-600 text-white py-3.5 rounded-xl font-semibold hover:bg-orange-700 transition-all shadow-lg shadow-orange-500/30 hover:shadow-xl hover:shadow-orange-500/40 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
                      Criando...
                    </>
                  ) : (
                    'Cadastrar-se'
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
                    <span className="px-4 bg-white text-gray-500">Ou</span>
                  </div>
                </div>
              </div>

              {/* Social buttons */}
              <div className="border-t border-gray-100">
                <button
                  onClick={() => window.location.href = '/organizer-signup'}
                  className="w-full flex items-center justify-center gap-2 cursor-pointer px-4 py-3 border-2 border-orange-600 text-orange-600 rounded-xl hover:bg-orange-50 transition-colors font-semibold"
                >
                  <Building2 className="w-5 h-5" />
                  Cadastrar-se Como Organizador
                </button>
              </div>

              <p className="text-center text-gray-600 mt-6">
                Já tem conta?{' '}
                <button
                  onClick={onNavigateToLogin}
                  className="text-orange-600 hover:text-orange-700 cursor-pointer font-semibold transition-colors"
                >
                  Iniciar sessão
                </button>
              </p>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}