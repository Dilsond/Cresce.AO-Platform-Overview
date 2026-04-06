import { useState, useEffect } from 'react';
import {
  ArrowLeft, Edit2, Sparkles, Save, X,
  Lock, KeyRound, Mail, CheckCircle, AlertCircle,
  Eye, EyeOff, User, AtSign, HelpCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { emailService } from '../services/emailService';
import logo from "../assets/logo.png";

interface PasswordChangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userEmail: string;
  userName: string;
  onSuccess: () => void;
}

function PasswordChangeModal({ isOpen, onClose, userId, userEmail, userName, onSuccess }: PasswordChangeModalProps) {
  const [step, setStep] = useState<'current' | 'forgot' | 'code' | 'new'>('current');
  const [currentPassword, setCurrentPassword] = useState('');
  const [forgotEmail, setForgotEmail] = useState(userEmail);
  const [codigo, setCodigo] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [recoveryId, setRecoveryId] = useState<string | null>(null);
  const [tempUserId, setTempUserId] = useState<string | null>(userId);
  const [tempUserEmail, setTempUserEmail] = useState(userEmail);
  const [tempUserName, setTempUserName] = useState(userName);

  // Função auxiliar para gerar hash SHA-256
  async function sha256(message: string) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

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

  // Buscar usuário por email
  const findUserByEmail = async (email: string) => {
    const { data: userData, error: userError } = await supabase
      .from('usuarios_normais')
      .select('id, nome_completo, email')
      .eq('email', email)
      .maybeSingle();

    if (userError) {
      console.error('Erro ao buscar usuário:', userError);
      return null;
    }

    return userData;
  };

  // Passo 1: Verificar senha atual
  const handleVerifyCurrentPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const { data: user, error: userError } = await supabase
        .from('usuarios_normais')
        .select('senha')
        .eq('id', userId)
        .single();

      if (userError || !user) {
        setError('Erro ao verificar usuário');
        setIsLoading(false);
        return;
      }

      const hashedCurrentPassword = '$2a$10$' + await sha256(currentPassword);

      if (user.senha !== hashedCurrentPassword) {
        setError('Senha atual incorreta');
        setIsLoading(false);
        return;
      }

      // Se senha correta, vai direto para o passo de nova senha (sem enviar código)
      setSuccess('Senha verificada com sucesso!');
      setStep('new');

    } catch (err) {
      console.error('Erro:', err);
      setError('Ocorreu um erro inesperado');
    } finally {
      setIsLoading(false);
    }
  };

  // Enviar código de verificação por email
  const sendVerificationCode = async (email: string, id: string, name: string) => {
    try {
      const codigoGerado = generateCode();
      const expiraEm = new Date();
      expiraEm.setMinutes(expiraEm.getMinutes() + 15);
      // console.log('🔑 Código gerado:', codigoGerado);

      // Remover códigos antigos
      await supabase
        .from('recuperacao_senha')
        .update({ utilizado: true })
        .eq('email', email)
        .eq('utilizado', false);

      // Inserir novo código
      const { data: insertedData, error: insertError } = await supabase
        .from('recuperacao_senha')
        .insert([{
          email: email,
          codigo: codigoGerado,
          tipo_usuario: 'usuario_normal',
          expira_em: expiraEm.toISOString(),
          utilizado: false,
          usuario_normal_id: id
        }])
        .select()
        .single();

      if (insertError) {
        console.error('Erro ao salvar código:', insertError);
        setError('Erro ao gerar código de verificação');
        return false;
      }

      setRecoveryId(insertedData.id);

      // Enviar email
      const emailResult = await emailService.sendRecoveryCode({
        to_email: email,
        to_name: name,
        codigo: codigoGerado,
        userType: 'user'
      });

      if (!emailResult.success) {
        setError('Erro ao enviar email. Tente novamente.');
        return false;
      }

      return true;

    } catch (err) {
      console.error('Erro:', err);
      setError('Erro ao enviar código de verificação');
      return false;
    }
  };

  // Iniciar recuperação por email (esqueceu a senha)
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const user = await findUserByEmail(forgotEmail);

      if (!user) {
        setError('Email não encontrado');
        setIsLoading(false);
        return;
      }

      setTempUserId(user.id);
      setTempUserEmail(user.email);
      setTempUserName(user.nome_completo);

      const sent = await sendVerificationCode(user.email, user.id, user.nome_completo);

      if (sent) {
        setSuccess('Código enviado para seu email!');
        setStep('code');
        startCountdown();
      }

    } catch (err) {
      console.error('Erro:', err);
      setError('Ocorreu um erro inesperado');
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
      const { data: recovery, error: recoveryError } = await supabase
        .from('recuperacao_senha')
        .select('*')
        .eq('email', tempUserEmail)
        .eq('codigo', codigo)
        .eq('utilizado', false)
        .gte('expira_em', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (recoveryError || !recovery) {
        setError('Código inválido ou expirado');
        setIsLoading(false);
        return;
      }

      setRecoveryId(recovery.id);
      setSuccess('Código verificado com sucesso!');
      setStep('new');

    } catch (err) {
      console.error('Erro:', err);
      setError('Erro ao verificar código');
    } finally {
      setIsLoading(false);
    }
  };

  // Passo 3: Definir nova senha
  const handleNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    if (newPassword.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres');
      setIsLoading(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('As senhas não coincidem');
      setIsLoading(false);
      return;
    }

    try {
      const hashedPassword = '$2a$10$' + await sha256(newPassword);

      const { error: updateError } = await supabase
        .from('usuarios_normais')
        .update({
          senha: hashedPassword,
          updated_at: new Date().toISOString()
        })
        .eq('id', tempUserId);

      if (updateError) {
        console.error('Erro ao atualizar senha:', updateError);
        setError('Erro ao atualizar senha');
        setIsLoading(false);
        return;
      }

      // Marcar código como utilizado (se veio do fluxo de recuperação)
      if (recoveryId) {
        await supabase
          .from('recuperacao_senha')
          .update({ utilizado: true })
          .eq('id', recoveryId);
      }

      setSuccess('Senha atualizada com sucesso!');
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 2000);

    } catch (err) {
      console.error('Erro:', err);
      setError('Erro ao atualizar senha');
    } finally {
      setIsLoading(false);
    }
  };

  // Reenviar código
  const handleResendCode = async () => {
    if (countdown > 0) return;
    setIsLoading(true);
    const sent = await sendVerificationCode(tempUserEmail, tempUserId!, tempUserName);
    if (sent) {
      setSuccess('Novo código enviado!');
      startCountdown();
    }
    setIsLoading(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
              <Lock className="w-5 h-5 text-orange-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900">Alterar Senha</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 cursor-pointer hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Step Indicator (só mostrar quando não está no fluxo de recuperação) */}
          {step !== 'forgot' && (
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${step === 'current' ? 'bg-orange-600 text-white' : 'bg-gray-100 text-gray-400'
                  }`}>1</div>
                <span className="text-sm text-gray-600">Verificação</span>
              </div>
              <div className="flex-1 h-0.5 mx-2 bg-gray-200"></div>
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${step === 'code' ? 'bg-orange-600 text-white' : 'bg-gray-100 text-gray-400'
                  }`}>2</div>
                <span className="text-sm text-gray-600">Código</span>
              </div>
              <div className="flex-1 h-0.5 mx-2 bg-gray-200"></div>
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${step === 'new' ? 'bg-orange-600 text-white' : 'bg-gray-100 text-gray-400'
                  }`}>3</div>
                <span className="text-sm text-gray-600">Nova Senha</span>
              </div>
            </div>
          )}

          {/* Mensagens */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
              <p className="text-green-600 text-sm">{success}</p>
            </div>
          )}

          {/* Step 1: Current Password */}
          {step === 'current' && (
            <form onSubmit={handleVerifyCurrentPassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Senha Atual
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPassword ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none pr-12"
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading || !currentPassword}
                className="w-full bg-orange-600 text-white py-3 rounded-xl font-semibold hover:bg-orange-700 transition-colors disabled:opacity-50"
              >
                {isLoading ? 'Verificando...' : 'Verificar Senha'}
              </button>

              <div className="text-center mt-4">
                <button
                  type="button"
                  onClick={() => setStep('forgot')}
                  className="text-orange-600 hover:text-orange-700 cursor-pointer text-sm font-semibold inline-flex items-center gap-1"
                >
                  <HelpCircle className="w-4 h-4" />
                  Esqueceu a sua senha?
                </button>
              </div>
            </form>
          )}

          {/* Step: Forgot Password - Email Input */}
          {step === 'forgot' && (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email da conta
                </label>
                <div className="flex items-center gap-2 px-4 py-3 border border-gray-300 rounded-xl focus-within:ring-2 focus-within:ring-orange-500">
                  <Mail className="w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    className="flex-1 focus:outline-none"
                    placeholder="seuemail@gmail.com"
                    required
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1.5">
                  Enviaremos um código de verificação para este email
                </p>
              </div>

              <button
                type="submit"
                disabled={isLoading || !forgotEmail}
                className="w-full bg-orange-600 text-white py-3 rounded-xl font-semibold hover:bg-orange-700 transition-colors disabled:opacity-50"
              >
                {isLoading ? 'Enviando...' : 'Enviar Código'}
              </button>

              <div className="text-center mt-4">
                <button
                  type="button"
                  onClick={() => setStep('current')}
                  className="text-orange-600 hover:text-orange-700 text-sm font-semibold"
                >
                  Voltar para verificação de senha
                </button>
              </div>
            </form>
          )}

          {/* Step 2: Code Verification */}
          {step === 'code' && (
            <form onSubmit={handleVerifyCode} className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-2">
                <p className="text-sm text-blue-700">
                  <strong>📧 Código enviado para:</strong>
                  <br />
                  {tempUserEmail}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Código de Verificação
                </label>
                <input
                  type="text"
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none text-center text-2xl tracking-widest"
                  placeholder="000000"
                  maxLength={6}
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isLoading || codigo.length !== 6}
                className="w-full bg-orange-600 text-white py-3 rounded-xl font-semibold hover:bg-orange-700 transition-colors disabled:opacity-50"
              >
                {isLoading ? 'Verificando...' : 'Verificar Código'}
              </button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={handleResendCode}
                  disabled={countdown > 0 || isLoading}
                  className="text-orange-600 hover:text-orange-700 text-sm font-semibold disabled:text-gray-400"
                >
                  {countdown > 0 ? `Reenviar em ${countdown}s` : 'Reenviar Código'}
                </button>
              </div>
            </form>
          )}

          {/* Step 3: New Password */}
          {step === 'new' && (
            <form onSubmit={handleNewPassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nova Senha
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none pr-12"
                    placeholder="••••••••"
                    minLength={6}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1.5">Mínimo de 6 caracteres</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confirmar Nova Senha
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none pr-12"
                    placeholder="••••••••"
                    minLength={6}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading || !newPassword || !confirmPassword}
                className="w-full bg-orange-600 text-white py-3 rounded-xl font-semibold hover:bg-orange-700 transition-colors disabled:opacity-50"
              >
                {isLoading ? 'Atualizando...' : 'Atualizar Senha'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export function UserDashboard() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Estados para edição
  const [editName, setEditName] = useState('');
  const [editUsername, setEditUsername] = useState('');

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const user = JSON.parse(storedUser);
      setCurrentUser(user);
      setEditName(user.name || '');
      setEditUsername(user.username || '');
    } else {
      navigate('/login');
    }
  }, [navigate]);

  const handleEditClick = () => {
    setIsEditing(true);
    setError(null);
    setSuccessMessage(null);
  };

  const handleCancelClick = () => {
    setIsEditing(false);
    setError(null);
    setSuccessMessage(null);
    setEditName(currentUser.name);
    setEditUsername(currentUser.username);
  };

  const handleSaveClick = async () => {
    if (!editName.trim()) {
      setError('O nome não pode estar vazio');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const updateData: any = {
        nome_completo: editName,
        updated_at: new Date().toISOString()
      };

      if (editUsername && editUsername !== currentUser.username) {
        if (!/^[a-zA-Z0-9_]{3,20}$/.test(editUsername)) {
          setError('Nome de utilizador deve ter entre 3-20 caracteres e conter apenas letras, números e _');
          setIsLoading(false);
          return;
        }

        const { data: existingUsername } = await supabase
          .from('usuarios_normais')
          .select('nome_utilizador')
          .eq('nome_utilizador', editUsername)
          .neq('id', currentUser.id)
          .maybeSingle();

        if (existingUsername) {
          setError('Este nome de utilizador já está em uso');
          setIsLoading(false);
          return;
        }

        updateData.nome_utilizador = editUsername;
      }

      const { data: updatedUser, error } = await supabase
        .from('usuarios_normais')
        .update(updateData)
        .eq('id', currentUser.id)
        .select()
        .single();

      if (error) {
        setError('Erro ao atualizar perfil');
        setIsLoading(false);
        return;
      }

      const updatedUserData = {
        ...currentUser,
        name: updatedUser.nome_completo,
        username: updatedUser.nome_utilizador
      };

      setCurrentUser(updatedUserData);
      localStorage.setItem('user', JSON.stringify(updatedUserData));

      setSuccessMessage('Perfil atualizado com sucesso!');
      setIsEditing(false);

    } catch (err) {
      setError('Erro inesperado');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordChangeSuccess = () => {
    setSuccessMessage('Senha alterada com sucesso!');
  };

  if (!currentUser) return null;

  const initials = currentUser.name
    ? currentUser.name.split(' ').map((n: string) => n[0]).join('').toUpperCase()
    : 'U';

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-orange-50/20 to-gray-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md shadow-sm border-b border-gray-200/50 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <button
            onClick={() => navigate('/events')}
            className="flex items-center gap-2 text-gray-600 cursor-pointer hover:text-orange-600 transition-all group"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            <span className="font-medium">Voltar</span>
          </button>
          <div className="flex items-center">
            <img src={logo} alt="Cresce.AO Logo" className="h-10 w-auto object-contain" />
            <span className="text-xl font-bold text-gray-900 tracking-tight">
              Cresce<span className="text-orange-600">.AO</span>
            </span>
          </div>
        </div>
      </header>

      {/* Conteúdo */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Banner */}
        <div className="relative overflow-hidden bg-gradient-to-br from-orange-600 via-orange-500 to-red-600 rounded-3xl shadow-2xl p-8 text-white mb-8">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-black/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
          <div className="relative z-10">
            <p className="text-orange-100 text-sm font-medium mb-2 uppercase tracking-wider">Dashboard</p>
            <h1 className="text-4xl md:text-5xl font-bold mb-3">Meu Perfil</h1>
            <p className="text-xl text-orange-50">Gerencie suas informações pessoais</p>
          </div>
        </div>

        {/* Mensagens */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        {successMessage && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
            <p className="text-green-600 text-sm">{successMessage}</p>
          </div>
        )}

        {/* Profile Card */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden mb-6">
          <div className="h-36 bg-gradient-to-br from-orange-500 via-orange-400 to-red-500"></div>

          <div className="px-8 pb-8">
            <div className="-mt-12 flex items-end justify-between mb-6">
              <div className="w-24 h-24 bg-white rounded-2xl border-4 border-white shadow-xl flex items-center justify-center text-orange-600 text-4xl font-bold">
                {initials}
              </div>

              {!isEditing ? (
                <button
                  onClick={handleEditClick}
                  className="flex items-center gap-2 px-4 py-2 bg-orange-600 cursor-pointer text-white rounded-lg hover:bg-orange-700 transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                  Editar Perfil
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSaveClick}
                    disabled={isLoading}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 cursor-pointer text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                  >
                    {isLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        Salvar
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleCancelClick}
                    disabled={isLoading}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-200 cursor-pointer text-gray-700 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50"
                  >
                    <X className="w-4 h-4" />
                    Cancelar
                  </button>
                </div>
              )}
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              {/* Left Column - Basic Info */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <User className="w-5 h-5 text-orange-600" />
                  Informações Básicas
                </h3>

                <div className="space-y-4">
                  {/* Nome de Utilizador */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nome de Utilizador
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all"
                        placeholder="Seu nome completo"
                      />
                    ) : (
                      <p className="px-4 py-3 bg-gray-50 rounded-xl text-gray-900 font-medium">
                        {currentUser.name}
                      </p>
                    )}
                  </div>

                  {/* Nome Completo */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nome Completo
                    </label>
                    {isEditing ? (
                      <div>
                        <div className="flex items-center border border-gray-300 rounded-xl focus-within:ring-2 focus-within:ring-orange-500">
                          <span className="text-gray-500 pl-4">@</span>
                          <input
                            type="text"
                            value={editUsername}
                            onChange={(e) => setEditUsername(e.target.value)}
                            className="flex-1 px-4 py-3 bg-white rounded-xl focus:outline-none"
                            placeholder="nomeutilizador"
                          />
                        </div>
                        <p className="text-xs text-gray-500 mt-1.5">
                          3-20 caracteres, apenas letras, números e _
                        </p>
                      </div>
                    ) : (
                      <p className="px-4 py-3 bg-gray-50 rounded-xl text-gray-900 font-medium">
                        @{currentUser.username}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column - Security */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Lock className="w-5 h-5 text-orange-600" />
                  Segurança
                </h3>

                {/* Email (não editável) */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    E-mail
                  </label>
                  <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 rounded-xl">
                    <Mail className="w-5 h-5 text-gray-400" />
                    <span className="text-gray-600">{currentUser.email}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1.5">
                    O e-mail não pode ser alterado
                  </p>
                </div>

                {/* Alterar Senha */}
                <button
                  onClick={() => setIsChangingPassword(true)}
                  className="w-full flex items-center justify-center cursor-pointer gap-2 px-4 py-3 bg-orange-50 text-orange-700 border-2 border-orange-200 rounded-xl hover:bg-orange-100 transition-colors font-medium"
                >
                  <KeyRound className="w-5 h-5" />
                  Alterar Senha
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Additional Info */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-6">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0">
              <img src={logo} alt="Cresce.AO Logo" className="h-10 w-auto object-contain" />
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-1">Dica de Segurança</h4>
              <p className="text-sm text-gray-600">
                Mantenha sua senha segura e nunca a compartilhe com ninguém.
                Recomendamos alterar sua senha periodicamente para maior segurança.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Modal de Alteração de Senha */}
      <PasswordChangeModal
        isOpen={isChangingPassword}
        onClose={() => setIsChangingPassword(false)}
        userId={currentUser.id}
        userEmail={currentUser.email}
        userName={currentUser.name}
        onSuccess={handlePasswordChangeSuccess}
      />
    </div>
  );
}