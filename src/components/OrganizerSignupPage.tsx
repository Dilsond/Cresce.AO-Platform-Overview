import { useState } from 'react';
import { ArrowLeft, Building2, Shield, LogIn, Eye, EyeOff } from 'lucide-react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export function OrganizerSignupPage({ onBack }: { onBack: () => void }) {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  // Signup form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [company, setCompany] = useState('');
  const [nif, setNif] = useState('');

  // Função auxiliar para gerar hash SHA-256 (igual ao mock_hash_password)
  async function sha256(message: string) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      console.log('1. Iniciando cadastro...');

      // Validar NIF
      if (!/^\d{9,10}$/.test(nif)) {
        setError('NIF inválido. Digite apenas números (9-10 dígitos)');
        setIsLoading(false);
        return;
      }

      // Validar email empresarial
      if (!email.includes('@') || email.split('@')[1].split('.').length < 2) {
        setError('Por favor, insira um email empresarial válido');
        setIsLoading(false);
        return;
      }

      console.log('2. Verificando email existente...');
      // Verificar se já existe organizador com este email
      const { data: existingEmail, error: emailCheckError } = await supabase
        .from('organizadores')
        .select('email_empresa')
        .eq('email_empresa', email)
        .maybeSingle();

      if (emailCheckError) {
        console.error('Erro ao verificar email:', emailCheckError);
        setError('Erro ao verificar email. Tente novamente.');
        setIsLoading(false);
        return;
      }

      if (existingEmail) {
        setError('Este email empresarial já está registado');
        setIsLoading(false);
        return;
      }

      console.log('3. Verificando NIF existente...');
      // Verificar se já existe organizador com este NIF
      const { data: existingNif, error: nifCheckError } = await supabase
        .from('organizadores')
        .select('nif')
        .eq('nif', nif)
        .maybeSingle();

      if (nifCheckError) {
        console.error('Erro ao verificar NIF:', nifCheckError);
        setError('Erro ao verificar NIF. Tente novamente.');
        setIsLoading(false);
        return;
      }

      if (existingNif) {
        setError('Este NIF já está registado');
        setIsLoading(false);
        return;
      }

      console.log('4. Gerando hash da senha...');
      // Gerar hash da senha (igual ao mock_hash_password)
      const hashedPassword = '$2a$10$' + await sha256(password);

      console.log('5. Inserindo novo organizador...');

      // SOLUÇÃO: Usar o cliente anônimo do Supabase sem autenticação
      // Ou criar uma política RLS que permita inserção anônima

      // Tentativa 1: Inserir diretamente
      const { data: newOrganizer, error: insertError } = await supabase
        .from('organizadores')
        .insert([
          {
            nome_empresa: company,
            nif: nif,
            email_empresa: email,
            senha: hashedPassword,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ])
        .select();

      if (insertError) {
        console.error('ERRO DETALHADO AO INSERIR:', insertError);

        // Se for erro de RLS, tenta uma abordagem diferente
        if (insertError.message.includes('row-level security')) {
          console.log('Tentando método alternativo...');

          // Tentativa 2: Usar a API de autenticação do Supabase primeiro
          const { data: authData, error: authError } = await supabase.auth.signUp({
            email: email,
            password: password,
            options: {
              data: {
                company: company,
                nif: nif,
                user_type: 'organizer'
              }
            }
          });

          if (authError) {
            console.error('Erro no auth:', authError);
            setError('Erro ao criar conta de autenticação.');
            setIsLoading(false);
            return;
          }

          if (authData.user) {
            // Agora tenta inserir na tabela organizadores com o ID do auth
            const { data: organizerData, error: organizerError } = await supabase
              .from('organizadores')
              .insert([
                {
                  id: authData.user.id, // Usa o mesmo ID do auth
                  nome_empresa: company,
                  nif: nif,
                  email_empresa: email,
                  senha: hashedPassword,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                }
              ])
              .select();

            if (organizerError) {
              console.error('Erro ao inserir organizador após auth:', organizerError);
              setError('Erro ao criar perfil de organizador.');
              setIsLoading(false);
              return;
            }

            if (organizerData && organizerData.length > 0) {
              const user = {
                id: organizerData[0].id,
                name: organizerData[0].nome_empresa,
                email: organizerData[0].email_empresa,
                nif: organizerData[0].nif,
                type: 'organizer' as const
              };
              navigate("/events");
              setIsLoading(false);
              return;
            }
          }
        }

        setError(`Erro ao criar conta: ${insertError.message}`);
        setIsLoading(false);
        return;
      }

      console.log('6. Organizador inserido com sucesso:', newOrganizer);

      if (!newOrganizer || newOrganizer.length === 0) {
        setError('Erro ao criar conta. Nenhum dado retornado.');
        setIsLoading(false);
        return;
      }

      // Login bem-sucedido
      const user = {
        id: newOrganizer[0].id,
        name: newOrganizer[0].nome_empresa,
        email: newOrganizer[0].email_empresa,
        nif: newOrganizer[0].nif,
        type: 'organizer' as const
      };

      console.log('7. Chamando onSignup com:', user);
      localStorage.setItem('user', JSON.stringify(user));
      navigate("/events");

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
                <Building2 className="w-8 h-8" />
              </motion.div>

              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                <p className="text-lg mb-4 text-white/90">Para organizadores</p>
                <h2 className="text-4xl font-bold leading-tight mb-6">
                  Crie e gerencie eventos profissionais
                </h2>
                <p className="text-white/80 text-lg">
                  Conecte-se com milhares de profissionais e expanda o alcance dos seus eventos
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
                  <span>Painel de gestão completo</span>
                </div>
                <div className="flex items-center gap-3 text-white/90">
                  <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span>Análises e métricas detalhadas</span>
                </div>
                <div className="flex items-center gap-3 text-white/90">
                  <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span>Suporte dedicado 24/7</span>
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
                  <Building2 className="w-5 h-5 text-orange-600" />
                </div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  Registo de Organizador
                </h1>
                <p className="text-gray-600">
                  Crie eventos e conecte-se com profissionais
                </p>
              </div>

              {/* Mensagem de erro */}
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-600 text-sm">{error}</p>
                </div>
              )}

              {/* Validation Notice */}
              <div className="mb-6 p-4 bg-orange-50 rounded-xl border border-orange-100">
                <div className="flex items-start gap-3">
                  <Shield className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-gray-900 mb-1">Validação Documental</p>
                    <p className="text-xs text-gray-600">
                      Para garantir a credibilidade da plataforma, solicitamos informações que comprovem a existência legal da sua organização.
                    </p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleSignupSubmit} className="space-y-4">
                <div>
                  <label htmlFor="company" className="block text-sm font-medium text-gray-700 mb-2">
                    Nome Legal da Empresa/Organização *
                  </label>
                  <input
                    id="company"
                    type="text"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    required
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all text-gray-900 placeholder-gray-400"
                    placeholder="Digite o nome da empresa"
                  />
                </div>

                <div>
                  <label htmlFor="nif" className="block text-sm font-medium text-gray-700 mb-2">
                    Número de Identificação Fiscal (NIF) *
                  </label>
                  <input
                    id="nif"
                    type="text"
                    value={nif}
                    onChange={(e) => setNif(e.target.value)}
                    required
                    pattern="[0-9]{9,10}"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all text-gray-900 placeholder-gray-400"
                    placeholder="Digite o NIF da empresa"
                  />
                  <p className="text-xs text-gray-500 mt-1.5">Digite apenas números (9-10 dígitos)</p>
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    E-mail Empresarial *
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all text-gray-900 placeholder-gray-400"
                    placeholder="Contato@empresa.ao"
                  />
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                    Senha *
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
                  className="w-full bg-orange-600 text-white py-3.5 cursor-pointer rounded-xl font-semibold hover:bg-orange-700 transition-all shadow-lg shadow-orange-500/30 hover:shadow-xl hover:shadow-orange-500/40 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
                    'Criar Conta'
                  )}
                </motion.button>
              </form>

              {/* Toggle Mode Button */}
              <div className="mt-6 text-center pt-4 border-t border-gray-100">
                <p className="text-gray-600 mb-2">
                  Já tem conta de organizador?
                </p>
                <button
                  onClick={() => { navigate('/organizer-login'); setShowPassword(false); }}
                  className="text-orange-600 cursor-pointer font-semibold hover:text-orange-700 transition-colors"
                >
                  Entrar na minha conta
                </button>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}