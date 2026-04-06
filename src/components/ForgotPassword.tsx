import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Mail, KeyRound, Lock, CheckCircle, AlertCircle, Building2, User } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { emailService } from '../services/emailService';

interface ForgotPasswordProps {
    onBack: () => void;
    onSuccess?: () => void;
    userType?: 'usuario_normal' | 'organizador';
}

type Step = 'email' | 'code' | 'newPassword' | 'success';

export function ForgotPassword({ onBack, onSuccess, userType = 'usuario_normal' }: ForgotPasswordProps) {
    const [step, setStep] = useState<Step>('email');
    const [email, setEmail] = useState('');
    const [codigo, setCodigo] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [countdown, setCountdown] = useState(0);
    const [usuarioNormalId, setUsuarioNormalId] = useState<string | null>(null);
    const [organizadorId, setOrganizadorId] = useState<string | null>(null);
    const [userName, setUserName] = useState<string>('');
    const [recoveryId, setRecoveryId] = useState<string | null>(null); // Adicionado para referência

    // Função para gerar código de 6 dígitos
    const generateCode = () => {
        return Math.floor(100000 + Math.random() * 900000).toString();
    };

    // Função para iniciar countdown para reenvio
    const startCountdown = () => {
        setCountdown(60);
        const interval = setInterval(() => {
            setCountdown((prev) => {
                if (prev <= 1) {
                    clearInterval(interval);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    };

    // Função auxiliar para gerar hash SHA-256
    async function sha256(message: string) {
        const msgBuffer = new TextEncoder().encode(message);
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    // Buscar usuário por email (em ambas as tabelas)
    const findUserByEmail = async (email: string) => {
        // console.log('🔍 Buscando email:', email);

        // Primeiro, tentar na tabela de usuários normais
        const { data: userData, error: userError } = await supabase
            .from('usuarios_normais')
            .select('id, nome_completo, email, deleted_at')
            .eq('email', email)
            .maybeSingle();

        if (userError) {
            console.error('Erro ao buscar usuário normal:', userError);
        }

        if (userData && !userData.deleted_at) {
            // console.log('✅ Usuário normal encontrado:', userData);
            return {
                type: 'usuario_normal' as const,
                id: userData.id,
                name: userData.nome_completo,
                email: userData.email
            };
        }

        // Se não encontrou ou está deletado, tentar na tabela de organizadores
        // console.log('🔍 Tentando buscar organizador...');
        const { data: organizerData, error: organizerError } = await supabase
            .from('organizadores')
            .select('id, nome_empresa, email_empresa, deleted_at')
            .eq('email_empresa', email)
            .maybeSingle();

        if (organizerError) {
            console.error('Erro ao buscar organizador:', organizerError);
        }

        if (organizerData && !organizerData.deleted_at) {
            // console.log('✅ Organizador encontrado:', organizerData);
            return {
                type: 'organizador' as const,
                id: organizerData.id,
                name: organizerData.nome_empresa,
                email: organizerData.email_empresa
            };
        }

        // console.log('❌ Nenhum usuário encontrado com este email');
        return null;
    };

    // Passo 1: Enviar código por email
    const handleSendCode = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        setSuccess(null);

        try {
            // console.log('🔍 Verificando email:', email);

            const user = await findUserByEmail(email);

            if (!user) {
                setError('Email não encontrado ou conta desativada. Verifique o email informado.');
                setIsLoading(false);
                return;
            }

            // Armazenar IDs conforme o tipo
            if (user.type === 'usuario_normal') {
                setUsuarioNormalId(user.id);
                setOrganizadorId(null);
            } else {
                setUsuarioNormalId(null);
                setOrganizadorId(user.id);
            }

            setUserName(user.name);

            // Gerar código
            const codigoGerado = generateCode();
            const expiraEm = new Date();
            expiraEm.setMinutes(expiraEm.getMinutes() + 15);

            // console.log('🔑 Código gerado:', codigoGerado);
            // console.log('📧 Enviando para tipo:', user.type);

            // Remover códigos antigos não utilizados para este email
            const { error: deleteError } = await supabase
                .from('recuperacao_senha')
                .update({ utilizado: true })
                .eq('email', email)
                .eq('utilizado', false);

            if (deleteError) {
                console.error('Erro ao limpar códigos antigos:', deleteError);
            }

            // Inserir novo código com os IDs apropriados
            const recoveryData: any = {
                email: email,
                codigo: codigoGerado,
                tipo_usuario: user.type,
                expira_em: expiraEm.toISOString(),
                utilizado: false
            };

            if (user.type === 'usuario_normal') {
                recoveryData.usuario_normal_id = user.id;
            } else {
                recoveryData.organizador_id = user.id;
            }

            // console.log('💾 Inserindo código no banco:', recoveryData);

            const { data: insertedData, error: insertError } = await supabase
                .from('recuperacao_senha')
                .insert([recoveryData])
                .select()
                .single();

            if (insertError) {
                console.error('Erro ao salvar código:', insertError);
                setError('Erro ao gerar código de recuperação. Tente novamente.');
                setIsLoading(false);
                return;
            }

            // console.log('✅ Código salvo com sucesso:', insertedData);

            // Guardar o ID do registro para uso posterior
            if (insertedData) {
                setRecoveryId(insertedData.id);
            }

            // Enviar email - CORREÇÃO: Converter o tipo para o formato esperado pelo serviço
            // console.log('📧 Enviando email...');

            const emailUserType = user.type === 'usuario_normal' ? 'user' : 'organizer';

            const emailResult = await emailService.sendRecoveryCode({
                to_email: email,
                to_name: user.name || 'Usuário',
                codigo: codigoGerado,
                userType: emailUserType
            });

            if (!emailResult.success) {
                console.error('Falha no envio do email:', emailResult.message);

                if (import.meta.env.DEV) {
                    // console.log('⚠️ MODO DESENVOLVIMENTO - Código:', codigoGerado);
                    // alert(`CÓDIGO (DEV): ${codigoGerado}\n\nO email não pôde ser enviado, mas aqui está seu código para teste.`);
                } else {
                    setError('Erro ao enviar email. Verifique se o endereço está correto ou tente novamente.');
                    setIsLoading(false);
                    return;
                }
            }

            setSuccess('Código enviado com sucesso! Verifique sua caixa de entrada do email.');
            setStep('code');
            startCountdown();

        } catch (err: any) {
            console.error('Erro inesperado:', err);
            setError('Ocorreu um erro inesperado. Tente novamente.');
        } finally {
            setIsLoading(false);
        }
    };

    // Passo 2: Verificar código
    const handleVerifyCode = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            // console.log('🔍 Verificando código:', codigo, 'para email:', email);

            // Buscar código válido - filtrar apenas os não utilizados e não expirados
            const { data: recovery, error: recoveryError } = await supabase
                .from('recuperacao_senha')
                .select('*')
                .eq('email', email)
                .eq('codigo', codigo)
                .eq('utilizado', false)
                .gte('expira_em', new Date().toISOString())
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (recoveryError) {
                console.error('Erro ao verificar código:', recoveryError);
                setError('Erro ao verificar código. Tente novamente.');
                setIsLoading(false);
                return;
            }

            if (!recovery) {
                setError('Código inválido ou expirado. Solicite um novo código.');
                setIsLoading(false);
                return;
            }

            // console.log('✅ Código válido encontrado:', recovery);

            // Armazenar IDs conforme o tipo
            if (recovery.tipo_usuario === 'usuario_normal') {
                setUsuarioNormalId(recovery.usuario_normal_id);
                setOrganizadorId(null);
            } else {
                setUsuarioNormalId(null);
                setOrganizadorId(recovery.organizador_id);
            }

            // Guardar o ID do registro para marcar como utilizado depois
            setRecoveryId(recovery.id);

            setSuccess('Código verificado com sucesso!');
            setStep('newPassword');

        } catch (err) {
            console.error('Erro inesperado:', err);
            setError('Ocorreu um erro inesperado. Tente novamente.');
        } finally {
            setIsLoading(false);
        }
    };

    // Passo 3: Definir nova senha
    // Substitua a função handleNewPassword com esta versão corrigida:

    const handleNewPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        if (newPassword.length < 6) {
            setError('A senha deve ter pelo menos 6 caracteres.');
            setIsLoading(false);
            return;
        }

        if (newPassword !== confirmPassword) {
            setError('As senhas não coincidem.');
            setIsLoading(false);
            return;
        }

        try {
            // console.log('🔑 Gerando hash da nova senha...');

            const hashedPassword = '$2a$10$' + await sha256(newPassword);

            // console.log('💾 Atualizando senha...');
            // console.log('📝 usuarioNormalId:', usuarioNormalId);
            // console.log('📝 organizadorId:', organizadorId);

            // ANTES de atualizar, verificar se o usuário existe
            if (usuarioNormalId) {
                // console.log('🔍 Verificando se usuário normal existe com ID:', usuarioNormalId);

                const { data: existingUser, error: checkError } = await supabase
                    .from('usuarios_normais')
                    .select('id, email')
                    .eq('id', usuarioNormalId)
                    .maybeSingle();

                if (checkError) {
                    console.error('Erro ao verificar usuário:', checkError);
                }

                if (!existingUser) {
                    console.error('❌ Usuário normal NÃO encontrado com este ID!');
                    setError('Erro: usuário não encontrado. Tente reiniciar o processo.');
                    setIsLoading(false);
                    return;
                }

                // console.log('✅ Usuário encontrado:', existingUser);

                // Agora sim, atualizar a senha
                const { error: updateError, data } = await supabase
                    .from('usuarios_normais')
                    .update({
                        senha: hashedPassword,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', usuarioNormalId)
                    .select();

                if (updateError) {
                    console.error('❌ Erro ao atualizar senha do usuário:', updateError);
                    setError('Erro ao atualizar senha: ' + updateError.message);
                    setIsLoading(false);
                    return;
                }

                // console.log('✅ Resultado da atualização:', data);

                if (!data || data.length === 0) {
                    console.error('❌ Nenhum dado retornado - possível erro de permissão RLS');
                    setError('Erro ao atualizar senha: permissão negada. Tente novamente.');
                    setIsLoading(false);
                    return;
                }

                // console.log('✅ Senha do usuário normal atualizada com sucesso:', data);

            } else if (organizadorId) {
                // console.log('🔍 Verificando se organizador existe com ID:', organizadorId);

                const { data: existingOrg, error: checkError } = await supabase
                    .from('organizadores')
                    .select('id, email_empresa')
                    .eq('id', organizadorId)
                    .maybeSingle();

                if (checkError) {
                    console.error('Erro ao verificar organizador:', checkError);
                }

                if (!existingOrg) {
                    console.error('❌ Organizador NÃO encontrado com este ID!');
                    setError('Erro: organizador não encontrado. Tente reiniciar o processo.');
                    setIsLoading(false);
                    return;
                }

                // console.log('✅ Organizador encontrado:', existingOrg);

                const { error: updateError, data } = await supabase
                    .from('organizadores')
                    .update({
                        senha: hashedPassword,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', organizadorId)
                    .select();

                if (updateError) {
                    console.error('❌ Erro ao atualizar senha do organizador:', updateError);
                    setError('Erro ao atualizar senha: ' + updateError.message);
                    setIsLoading(false);
                    return;
                }

                // console.log('✅ Resultado da atualização:', data);

                if (!data || data.length === 0) {
                    console.error('❌ Nenhum dado retornado - possível erro de permissão RLS');
                    setError('Erro ao atualizar senha: permissão negada. Tente novamente.');
                    setIsLoading(false);
                    return;
                }

                // console.log('✅ Senha do organizador atualizada com sucesso:', data);

            } else {
                setError('Erro ao identificar o tipo de usuário.');
                setIsLoading(false);
                return;
            }

            // Marcar código como utilizado
            if (recoveryId) {
                // console.log('📝 Marcando código como utilizado, ID:', recoveryId);

                const { error: markUsedError } = await supabase
                    .from('recuperacao_senha')
                    .update({ utilizado: true })
                    .eq('id', recoveryId);

                if (markUsedError) {
                    console.error('❌ Erro ao marcar código como utilizado:', markUsedError);
                } else {
                    // console.log('✅ Código marcado como utilizado');
                }
            }

            // console.log('✅ Processo concluído com sucesso');

            setSuccess('Senha atualizada com sucesso!');
            setStep('success');

            // Aguardar 2 segundos e redirecionar baseado no tipo de usuário
            setTimeout(() => {
                if (onSuccess) {
                    onSuccess();
                } else {
                    if (usuarioNormalId) {
                        window.location.href = '/login';
                    } else if (organizadorId) {
                        window.location.href = '/organizer-login';
                    } else {
                        // Fallback - se não conseguir identificar, volta para a página anterior
                        onBack();
                    }
                }
            }, 2000);

        } catch (err) {
            console.error('❌ Erro inesperado:', err);
            setError('Ocorreu um erro inesperado. Tente novamente.');
        } finally {
            setIsLoading(false);
        }
    };

    // Reenviar código
    const handleResendCode = async () => {
        if (countdown > 0) return;

        setIsLoading(true);
        setError(null);
        setSuccess(null);

        try {
            const user = await findUserByEmail(email);

            if (!user) {
                setError('Erro ao reenviar código. Tente novamente.');
                setIsLoading(false);
                return;
            }

            const codigoGerado = generateCode();
            const expiraEm = new Date();
            expiraEm.setMinutes(expiraEm.getMinutes() + 15);

            // Remover códigos antigos
            await supabase
                .from('recuperacao_senha')
                .update({ utilizado: true })
                .eq('email', email)
                .eq('utilizado', false);

            // Inserir novo código
            const recoveryData: any = {
                email: email,
                codigo: codigoGerado,
                tipo_usuario: user.type,
                expira_em: expiraEm.toISOString(),
                utilizado: false
            };

            if (user.type === 'usuario_normal') {
                recoveryData.usuario_normal_id = user.id;
            } else {
                recoveryData.organizador_id = user.id;
            }

            const { data: insertedData } = await supabase
                .from('recuperacao_senha')
                .insert([recoveryData])
                .select()
                .single();

            if (insertedData) {
                setRecoveryId(insertedData.id);
            }

            // Reenviar email - CORREÇÃO: Converter o tipo
            const emailUserType = user.type === 'usuario_normal' ? 'user' : 'organizer';

            const emailResult = await emailService.sendRecoveryCode({
                to_email: email,
                to_name: user.name || 'Usuário',
                codigo: codigoGerado,
                userType: emailUserType
            });

            if (!emailResult.success && !import.meta.env.DEV) {
                setError('Erro ao reenviar email. Tente novamente.');
                setIsLoading(false);
                return;
            }

            // if (import.meta.env.DEV) {
            //    console.log('⚠️ MODO DESENVOLVIMENTO - Novo código:', codigoGerado);
            //     alert(`NOVO CÓDIGO (DEV): ${codigoGerado}`);
            // }

            setSuccess('Novo código enviado! Verifique seu email.');
            startCountdown();

        } catch (err) {
            console.error('Erro ao reenviar código:', err);
            setError('Erro ao reenviar código. Tente novamente.');
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
                className="w-full max-w-md"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
            >
                <div className="bg-white rounded-3xl shadow-2xl p-8">
                    {/* Header com indicador do tipo de usuário */}
                    <div className="text-center mb-8">
                        <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                            {step === 'email' && (userType === 'organizador' ?
                                <Building2 className="w-8 h-8 text-orange-600" /> :
                                <User className="w-8 h-8 text-orange-600" />
                            )}
                            {step === 'code' && <KeyRound className="w-8 h-8 text-orange-600" />}
                            {step === 'newPassword' && <Lock className="w-8 h-8 text-orange-600" />}
                            {step === 'success' && <CheckCircle className="w-8 h-8 text-orange-600" />}
                        </div>

                        <h1 className="text-2xl font-bold text-gray-900 mb-2">
                            {step === 'email' && `Recuperar Senha - ${userType === 'organizador' ? 'Organizador' : 'Usuário'}`}
                            {step === 'code' && 'Verificar Código'}
                            {step === 'newPassword' && 'Nova Senha'}
                            {step === 'success' && 'Senha Alterada!'}
                        </h1>

                        <p className="text-gray-600">
                            {step === 'email' && 'Digite seu email para receber um código de recuperação'}
                            {step === 'code' && `Enviamos um código para ${email}`}
                            {step === 'newPassword' && 'Digite sua nova senha'}
                            {step === 'success' && 'Sua senha foi alterada com sucesso!'}
                        </p>
                    </div>

                    {/* Mensagens de erro/sucesso */}
                    <AnimatePresence mode="wait">
                        {error && (
                            <motion.div
                                key="error"
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                                className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2"
                            >
                                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                                <p className="text-red-600 text-sm">{error}</p>
                            </motion.div>
                        )}

                        {success && (
                            <motion.div
                                key="success"
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                                className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2"
                            >
                                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                                <p className="text-green-600 text-sm">{success}</p>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Step 1: Email Form */}
                    {step === 'email' && (
                        <form onSubmit={handleSendCode} className="space-y-5">
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
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all text-gray-900"
                                    placeholder="seuemail@gmail.com"
                                />
                            </div>

                            <motion.button
                                type="submit"
                                disabled={isLoading}
                                className="w-full bg-orange-600 cursor-pointer text-white py-3.5 rounded-xl font-semibold hover:bg-orange-700 transition-all shadow-lg shadow-orange-500/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
                                        Enviando...
                                    </>
                                ) : (
                                    'Enviar Código'
                                )}
                            </motion.button>
                        </form>
                    )}

                    {/* Step 2: Code Form */}
                    {step === 'code' && (
                        <form onSubmit={handleVerifyCode} className="space-y-5">
                            {/* Alerta sobre spam */}
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                                <p className="text-blue-700 text-sm">
                                    <strong>📧 Não recebeu o código?</strong>
                                    <br />
                                    • Verifique sua caixa de spam ou lixo eletrônico
                                    <br />
                                    • Adicione naoresponder@cresceao.com aos seus contatos
                                    <br />
                                    • Aguarde alguns minutos - pode haver atraso
                                </p>
                            </div>

                            <div>
                                <label htmlFor="codigo" className="block text-sm font-medium text-gray-700 mb-2">
                                    Código de verificação
                                </label>
                                <input
                                    id="codigo"
                                    type="text"
                                    value={codigo}
                                    onChange={(e) => setCodigo(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                    required
                                    maxLength={6}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all text-gray-900 text-center text-2xl tracking-widest"
                                    placeholder="000000"
                                    autoFocus
                                />
                            </div>

                            <motion.button
                                type="submit"
                                disabled={isLoading || codigo.length !== 6}
                                className="w-full bg-orange-600 cursor-pointer text-white py-3.5 rounded-xl font-semibold hover:bg-orange-700 transition-all shadow-lg shadow-orange-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                                whileHover={{ scale: 1.01 }}
                                whileTap={{ scale: 0.99 }}
                            >
                                {isLoading ? 'Verificando...' : 'Verificar Código'}
                            </motion.button>

                            <div className="text-center">
                                <button
                                    type="button"
                                    onClick={handleResendCode}
                                    disabled={countdown > 0 || isLoading}
                                    className="text-orange-600 hover:text-orange-700 text-sm font-semibold disabled:text-gray-400 disabled:cursor-not-allowed"
                                >
                                    {countdown > 0
                                        ? `Reenviar código em ${countdown}s`
                                        : 'Reenviar código'}
                                </button>
                            </div>
                        </form>
                    )}

                    {/* Step 3: New Password Form */}
                    {step === 'newPassword' && (
                        <form onSubmit={handleNewPassword} className="space-y-5">
                            <div>
                                <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-2">
                                    Nova senha
                                </label>
                                <div className="relative">
                                    <input
                                        id="newPassword"
                                        type={showPassword ? "text" : "password"}
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        required
                                        minLength={6}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all text-gray-900 pr-12"
                                        placeholder="••••••••"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                    >
                                        {showPassword ? '👁️' : '👁️‍🗨️'}
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                                    Confirmar nova senha
                                </label>
                                <div className="relative">
                                    <input
                                        id="confirmPassword"
                                        type={showConfirmPassword ? "text" : "password"}
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        required
                                        minLength={6}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all text-gray-900 pr-12"
                                        placeholder="••••••••"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                    >
                                        {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
                                    </button>
                                </div>
                            </div>

                            <motion.button
                                type="submit"
                                disabled={isLoading}
                                className="w-full bg-orange-600 cursor-pointer text-white py-3.5 rounded-xl font-semibold hover:bg-orange-700 transition-all shadow-lg shadow-orange-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                                whileHover={{ scale: 1.01 }}
                                whileTap={{ scale: 0.99 }}
                            >
                                {isLoading ? 'Atualizando...' : 'Atualizar Senha'}
                            </motion.button>
                        </form>
                    )}

                    {/* Step 4: Success */}
                    {step === 'success' && (
                        <div className="text-center space-y-5">
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: "spring", delay: 0.2 }}
                                className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto"
                            >
                                <CheckCircle className="w-10 h-10 text-green-600" />
                            </motion.div>

                            <p className="text-gray-600">
                                Redirecionando para o login...
                            </p>
                        </div>
                    )}

                    {/* Link para voltar ao login */}
                    {step !== 'success' && (
                        <p className="text-center text-gray-600 mt-6">
                            Lembrou sua senha?{' '}
                            <button
                                onClick={onBack}
                                className="text-orange-600 cursor-pointer hover:text-orange-700 font-semibold transition-colors"
                            >
                                Voltar ao login
                            </button>
                        </p>
                    )}
                </div>
            </motion.div>
        </div>
    );
}