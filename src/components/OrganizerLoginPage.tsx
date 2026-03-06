import { useState } from 'react';
import { ArrowLeft, Building2, Shield, LogIn, Eye, EyeOff } from 'lucide-react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export function OrganizerLoginPage({ onBack }: { onBack: () => void }) {
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();

    // Login form state
    const [loginEmail, setLoginEmail] = useState('');
    const [loginPassword, setLoginPassword] = useState('');

    // Função auxiliar para gerar hash SHA-256 (igual ao mock_hash_password)
    async function sha256(message: string) {
        const msgBuffer = new TextEncoder().encode(message);
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    const handleLoginSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            // Buscar organizador na tabela pelo email
            const { data: userData, error: userError } = await supabase
                .from('organizadores')
                .select('*')
                .eq('email_empresa', loginEmail)
                .maybeSingle();

            if (userError) {
                console.error(userError);
                setError('Erro ao consultar organizador.');
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

            // Gerar o hash da senha fornecida (igual ao mock_hash_password)
            const hashedInputPassword = '$2a$10$' + await sha256(loginPassword);

            // Comparar com a senha armazenada
            if (userData.senha !== hashedInputPassword) {
                setError('Email ou senha incorretos.');
                setIsLoading(false);
                return;
            }

            // Login bem-sucedido
            const user = {
                id: userData.id,
                name: userData.nome_empresa,
                email: userData.email_empresa,
                nif: userData.nif,
                type: 'organizer'
            };

            localStorage.setItem('user', JSON.stringify(user));
            navigate("/events");

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
                                    Gerencie seus eventos com facilidade
                                </h2>
                                <p className="text-white/80 text-lg">
                                    Acesse seu painel de controle e acompanhe métricas em tempo real
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
                                    Login de Organizador
                                </h1>
                                <p className="text-gray-600">
                                    Aceda ao seu painel de gestão de eventos
                                </p>
                            </div>

                            {/* Mensagem de erro */}
                            {error && (
                                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                                    <p className="text-red-600 text-sm">{error}</p>
                                </div>
                            )}

                            <form onSubmit={handleLoginSubmit} className="space-y-5">
                                <div>
                                    <label htmlFor="loginEmail" className="block text-sm font-medium text-gray-700 mb-2">
                                        E-mail Empresarial
                                    </label>
                                    <input
                                        id="loginEmail"
                                        type="email"
                                        value={loginEmail}
                                        onChange={(e) => setLoginEmail(e.target.value)}
                                        required
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all text-gray-900 placeholder-gray-400"
                                        placeholder="contato@empresa.ao"
                                    />
                                </div>

                                <div>
                                    <label htmlFor="loginPassword" className="block text-sm font-medium text-gray-700 mb-2">
                                        Senha
                                    </label>
                                    <div className="relative">
                                        <input
                                            id="loginPassword"
                                            type={showPassword ? "text" : "password"}
                                            value={loginPassword}
                                            onChange={(e) => setLoginPassword(e.target.value)}
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
                                            Entrando...
                                        </>
                                    ) : (
                                        <>
                                            <LogIn className="w-5 h-5" />
                                            Entrar como Organizador
                                        </>
                                    )}
                                </motion.button>
                            </form>

                            {/* Link para criar conta */}
                            <div className="mt-6 text-center pt-6 border-t border-gray-100">
                                <p className="text-gray-600 mb-2">
                                    Ainda não tem conta de organizador?
                                </p>
                                <button
                                    onClick={() => { navigate('/organizer-signup'); setShowPassword(false); }}
                                    className="text-orange-600 cursor-pointer font-semibold hover:text-orange-700 transition-colors"
                                >
                                    Criar uma conta
                                </button>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}