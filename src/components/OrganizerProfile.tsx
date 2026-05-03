import { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Calendar,
  MapPin,
  CheckCircle2,
  Users,
  Mail,
  Phone,
  Briefcase,
  Star,
  Award,
  UserCircle,
  Sparkles,
  Heart,
  Edit2,
  Save,
  X,
  Lock,
  KeyRound,
  AtSign,
  AlertCircle,
  Eye,
  EyeOff,
  HelpCircle,
  Tag,
  Camera,
  Loader2,
  Plus
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { emailService } from '../services/emailService';
import logo from "../assets/logo.png";

// Componente InfoRow (mantido igual)
function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-9 h-9 rounded-xl bg-orange-50 flex items-center justify-center flex-shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-400 font-medium">{label}</p>
        <p className="text-sm text-gray-800 font-semibold truncate">{value || 'Não informado'}</p>
      </div>
    </div>
  );
}

// Componente StatRow (mantido igual)
function StatRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center flex-shrink-0">
          {icon}
        </div>
        <span className="text-sm text-gray-600">{label}</span>
      </div>
      <span className="text-sm font-bold text-gray-900">{value}</span>
    </div>
  );
}

// Modal de Alteração de Senha (adaptado do UserDashboard)
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

  // Buscar organizador por email
  const findOrganizerByEmail = async (email: string) => {
    const { data: organizerData, error: organizerError } = await supabase
      .from('organizadores')
      .select('id, nome_empresa, email_empresa')
      .eq('email_empresa', email)
      .maybeSingle();

    if (organizerError) {
      console.error('Erro ao buscar organizador:', organizerError);
      return null;
    }

    return organizerData;
  };

  // Passo 1: Verificar senha atual
  const handleVerifyCurrentPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const { data: organizer, error: userError } = await supabase
        .from('organizadores')
        .select('senha')
        .eq('id', userId)
        .single();

      if (userError || !organizer) {
        setError('Erro ao verificar organizador');
        setIsLoading(false);
        return;
      }

      const hashedCurrentPassword = '$2a$10$' + await sha256(currentPassword);

      if (organizer.senha !== hashedCurrentPassword) {
        setError('Senha atual incorreta');
        setIsLoading(false);
        return;
      }

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
          tipo_usuario: 'organizador',
          expira_em: expiraEm.toISOString(),
          utilizado: false,
          organizador_id: id
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
        userType: 'organizer'
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
      const organizer = await findOrganizerByEmail(forgotEmail);

      if (!organizer) {
        setError('Email não encontrado');
        setIsLoading(false);
        return;
      }

      setTempUserId(organizer.id);
      setTempUserEmail(organizer.email_empresa);
      setTempUserName(organizer.nome_empresa);

      const sent = await sendVerificationCode(organizer.email_empresa, organizer.id, organizer.nome_empresa);

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
        .from('organizadores')
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

      // Marcar código como utilizado
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
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Step Indicator */}
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
              <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
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
                  className="text-orange-600 hover:text-orange-700 text-sm font-semibold inline-flex items-center gap-1"
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
                    placeholder="empresa@email.com"
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

export function OrganizerProfile() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    ativos: 0,
    cancelados: 0,
    totalLikes: 0,
    avaliacaoMedia: 0,
    membroDesde: '',
    eventosComAvaliacao: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [organizerData, setOrganizerData] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Estados para edição
  const [editName, setEditName] = useState('');
  const [editLocalizacao, setEditLocalizacao] = useState('');
  const [editContacto, setEditContacto] = useState('');
  const [editSobre, setEditSobre] = useState('');
  const [editTags, setEditTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      setUser(parsedUser);
      fetchOrganizerData(parsedUser.id);
      fetchOrganizerEvents(parsedUser.id);
    }
  }, []);

  const fetchOrganizerData = async (organizerId: string) => {
    try {
      const { data, error } = await supabase
        .from('organizadores')
        .select('localizacao, contacto, sobre, tags, avatar_url, created_at, nome_empresa, email_empresa')
        .eq('id', organizerId)
        .single();

      if (error) {
        console.error('Erro ao buscar dados do organizador:', error);
        return;
      }

      setOrganizerData(data);
      setAvatarUrl(data?.avatar_url || null);
      setEditName(data?.nome_empresa || '');
      setEditLocalizacao(data?.localizacao || '');
      setEditContacto(data?.contacto || '');
      setEditSobre(data?.sobre || '');
      setEditTags(data?.tags || []);

      // Calcular tempo de membro
      if (data?.created_at) {
        const dataCriacao = new Date(data.created_at);
        const ano = dataCriacao.getFullYear();
        setStats(prev => ({ ...prev, membroDesde: ano.toString() }));
      }
    } catch (err) {
      console.error('Erro:', err);
    }
  };

  const fetchOrganizerEvents = async (organizerId: string) => {
    try {
      setIsLoading(true);

      const { data: eventos, error: eventosError } = await supabase
        .from('eventos')
        .select('*')
        .eq('organizador_id', organizerId)
        .is('deleted_at', null);

      if (eventosError) {
        console.error('Erro ao buscar eventos:', eventosError);
        return;
      }

      setEvents(eventos || []);

      const hoje = new Date();
      let totalLikes = 0;
      let totalAvaliacoes = 0;
      let somaAvaliacoes = 0;
      let ativos = 0;
      let cancelados = 0;

      for (const evento of eventos || []) {
        const { count: likesCount } = await supabase
          .from('favoritos_eventos')
          .select('*', { count: 'exact', head: true })
          .eq('evento_id', evento.id);

        totalLikes += likesCount || 0;

        const dataEvento = new Date(evento.data_evento);
        if (dataEvento < hoje) {
          cancelados++;
        } else {
          ativos++;
        }

        const { data: avaliacoes } = await supabase
          .from('comentarios')
          .select('avaliacao')
          .eq('evento_id', evento.id)
          .is('deleted_at', null)
          .not('avaliacao', 'is', null);

        if (avaliacoes && avaliacoes.length > 0) {
          totalAvaliacoes += avaliacoes.length;
          somaAvaliacoes += avaliacoes.reduce((acc, curr) => acc + curr.avaliacao, 0);
        }
      }

      const avaliacaoMedia = totalAvaliacoes > 0 ? somaAvaliacoes / totalAvaliacoes : 0;

      setStats({
        total: eventos?.length || 0,
        ativos,
        cancelados,
        totalLikes,
        avaliacaoMedia: Math.round(avaliacaoMedia * 10) / 10,
        membroDesde: stats.membroDesde,
        eventosComAvaliacao: totalAvaliacoes
      });

    } catch (err) {
      console.error('Erro ao calcular estatísticas:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Adicione esta função de upload (igual à do CreateEvent)
  // Use o bucket que já está funcionando
  const uploadAvatar = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `avatars/${user.id}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('event-images')  // Usando o bucket que já funciona
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('event-images')
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (err) {
      console.error('Erro no upload:', err);
      return null;
    }
  };

  // Atualize a função handleAvatarUpload
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    try {
      setIsUploadingAvatar(true);
      setError(null);

      // Validar tipo de arquivo
      if (!file.type.startsWith('image/')) {
        setError('Por favor, selecione uma imagem válida');
        return;
      }

      // Fazer upload (mesma lógica do CreateEvent)
      const imageUrl = await uploadAvatar(file);
      if (!imageUrl) throw new Error('Erro ao fazer upload da imagem');

      // Atualizar banco de dados
      const { error: updateError } = await supabase
        .from('organizadores')
        .update({ avatar_url: imageUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      setAvatarUrl(imageUrl);
      setOrganizerData({ ...organizerData, avatar_url: imageUrl });
      setSuccessMessage('Foto de perfil atualizada com sucesso!');
      setTimeout(() => setSuccessMessage(null), 2000);

    } catch (err: any) {
      console.error('Erro ao fazer upload da foto:', err);
      setError(err.message || 'Erro ao atualizar foto de perfil');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleEditClick = () => {
    setIsEditing(true);
    setError(null);
    setSuccessMessage(null);
  };

  const handleCancelClick = () => {
    setIsEditing(false);
    setError(null);
    setSuccessMessage(null);
    setEditName(organizerData?.nome_empresa || '');
    setEditLocalizacao(organizerData?.localizacao || '');
    setEditContacto(organizerData?.contacto || '');
    setEditSobre(organizerData?.sobre || '');
    setEditTags(organizerData?.tags || []);
  };

  const handleAddTag = () => {
    if (newTag.trim() && !editTags.includes(newTag.trim())) {
      setEditTags([...editTags, newTag.trim()]);
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setEditTags(editTags.filter(tag => tag !== tagToRemove));
  };

  const handleSaveClick = async () => {
    if (!editName.trim()) {
      setError('O nome da empresa não pode estar vazio');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const updateData: any = {
        nome_empresa: editName,
        localizacao: editLocalizacao || null,
        contacto: editContacto || null,
        sobre: editSobre || null,
        tags: editTags,
        updated_at: new Date().toISOString()
      };

      const { data: updatedOrganizer, error } = await supabase
        .from('organizadores')
        .update(updateData)
        .eq('id', user.id)
        .select()
        .single();

      if (error) {
        setError('Erro ao atualizar perfil');
        setIsSaving(false);
        return;
      }

      const updatedUserData = {
        ...user,
        name: updatedOrganizer.nome_empresa
      };

      setUser(updatedUserData);
      setOrganizerData(updatedOrganizer);
      localStorage.setItem('user', JSON.stringify(updatedUserData));

      setSuccessMessage('Perfil atualizado com sucesso!');
      setIsEditing(false);

    } catch (err) {
      setError('Erro inesperado');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordChangeSuccess = () => {
    setSuccessMessage('Senha alterada com sucesso!');
  };

  if (!user || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-5xl font-bold text-orange-600 mb-4 flex items-center" style={{ animation: 'pulse 1.5s ease-in-out infinite' }}>
            <img src={logo} alt="Cresce.AO Logo" className="h-16 w-auto object-contain" />
            <span className="text-gray-400">Cresce</span>.AO
          </div>
        </div>
      </div>
    );
  }

  const memberSince = stats.membroDesde || new Date().getFullYear().toString();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-orange-50/20 to-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-20">
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-gray-600 cursor-pointer hover:text-orange-600 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Voltar</span>
            </button>
            <div className="flex items-center gap-2">
              <img src={logo} alt="Logo" className="h-8 w-auto" />
              <span className="text-xl font-bold text-gray-900">
                Cresce<span className="text-orange-600">.AO</span>
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-4 sm:space-y-6">

        {/* Hero Banner */}
        <div className="relative overflow-hidden bg-gradient-to-br from-orange-600 via-orange-500 to-red-600 rounded-2xl sm:rounded-3xl shadow-2xl p-6 sm:p-8 text-white">
          <div className="absolute top-0 right-0 w-64 sm:w-96 h-64 sm:h-96 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-40 sm:w-64 h-40 sm:h-64 bg-black/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
          <div className="relative z-10">
            <p className="text-orange-100 text-xs sm:text-sm font-medium mb-2 uppercase tracking-wider">Perfil do Organizador</p>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-2 sm:mb-3">Meu Perfil</h1>
            <p className="text-base sm:text-xl text-orange-50">Gerencie suas informações e estatísticas</p>
          </div>
        </div>

        {/* Mensagens */}
        {error && (
          <div className="p-3 sm:p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}
        {successMessage && (
          <div className="p-3 sm:p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
            <p className="text-green-600 text-sm">{successMessage}</p>
          </div>
        )}

        {/* Profile Card */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="h-24 sm:h-36 bg-gradient-to-br from-orange-500 via-orange-400 to-red-500" />

          <div className="px-4 sm:px-8 pb-6 sm:pb-8">
            <div className="-mt-10 sm:-mt-12 flex items-end justify-between mb-4 sm:mb-6">

              {/* Avatar */}
              <div className="relative group">
                <div className="w-20 h-20 sm:w-24 sm:h-24 bg-white rounded-2xl border-4 border-white shadow-xl overflow-hidden">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={user.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?background=f97316&color=fff&bold=true&size=96&name=${encodeURIComponent(user.name || 'O')}`;
                      }}
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center text-white text-3xl sm:text-4xl font-bold">
                      {(user.name || '').charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                {!isEditing && (
                  <label className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                    <Camera className="w-6 h-6 text-white" />
                    <input type="file" accept="image/*" onChange={handleAvatarUpload} disabled={isUploadingAvatar} className="hidden" />
                  </label>
                )}
                {isUploadingAvatar && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-2xl">
                    <Loader2 className="w-6 h-6 text-white animate-spin" />
                  </div>
                )}
              </div>

              {/* Botões edição */}
              {!isEditing ? (
                <button
                  onClick={handleEditClick}
                  className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 bg-orange-600 cursor-pointer text-white rounded-lg hover:bg-orange-700 transition-colors text-sm sm:text-base"
                >
                  <Edit2 className="w-4 h-4" />
                  <span className="hidden xs:inline">Editar Perfil</span>
                  <span className="xs:hidden">Editar</span>
                </button>
              ) : (
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <button
                    onClick={handleSaveClick}
                    disabled={isSaving}
                    className="flex items-center gap-1.5 px-3 sm:px-4 py-2 bg-green-600 cursor-pointer text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 text-sm sm:text-base"
                  >
                    {isSaving ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span className="hidden sm:inline">Salvando...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        <span className="hidden sm:inline">Salvar</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleCancelClick}
                    disabled={isSaving}
                    className="flex items-center gap-1.5 px-3 sm:px-4 py-2 bg-gray-200 cursor-pointer text-gray-700 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50 text-sm sm:text-base"
                  >
                    <X className="w-4 h-4" />
                    <span className="hidden sm:inline">Cancelar</span>
                  </button>
                </div>
              )}
            </div>

            {!isEditing ? (
              <>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
                  {organizerData?.nome_empresa || user.name}
                </h2>
                <p className="text-gray-500 mt-1 text-sm sm:text-base">
                  {organizerData?.email_empresa || 'Email não informado'}
                </p>
              </>
            ) : (
              <div className="space-y-4 mt-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Nome da Empresa *</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none text-sm sm:text-base"
                    placeholder="Nome da empresa"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Localização</label>
                  <input
                    type="text"
                    value={editLocalizacao}
                    onChange={(e) => setEditLocalizacao(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none text-sm sm:text-base"
                    placeholder="Ex: Luanda, Angola"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Contacto</label>
                  <input
                    type="text"
                    value={editContacto}
                    onChange={(e) => setEditContacto(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none text-sm sm:text-base"
                    placeholder="+244 900 000 000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Sobre a Organização</label>
                  <textarea
                    value={editSobre}
                    onChange={(e) => setEditSobre(e.target.value)}
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none text-sm sm:text-base"
                    placeholder="Descreva sua organização..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tags</label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {editTags.map((tag) => (
                      <span key={tag} className="px-3 py-1 bg-orange-50 text-orange-700 border border-orange-200 rounded-full text-sm font-medium flex items-center gap-1">
                        {tag}
                        <button type="button" onClick={() => handleRemoveTag(tag)} className="hover:text-red-600">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none text-sm"
                      placeholder="Adicionar tag"
                    />
                    <button
                      type="button"
                      onClick={handleAddTag}
                      className="px-3 sm:px-4 py-2 bg-orange-600 text-white rounded-xl hover:bg-orange-700 transition-colors text-sm"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Contact + Stats/Security */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">

          {/* Contact Info */}
          <div className="bg-white rounded-2xl shadow-lg p-5 sm:p-6 space-y-4">
            <h3 className="font-bold text-gray-900 text-base sm:text-lg border-b border-gray-100 pb-3">
              Informações de Contacto
            </h3>
            <InfoRow icon={<Mail className="w-5 h-5 text-orange-500" />} label="Email" value={organizerData?.email_empresa || user.email} />
            <InfoRow icon={<Phone className="w-5 h-5 text-orange-500" />} label="Telefone" value={organizerData?.contacto || 'Não informado'} />
            <InfoRow icon={<MapPin className="w-5 h-5 text-orange-500" />} label="Localização" value={organizerData?.localizacao || 'Não informada'} />
            <InfoRow icon={<Briefcase className="w-5 h-5 text-orange-500" />} label="Empresa" value={organizerData?.nome_empresa || user.name} />
          </div>

          {/* Stats + Security */}
          <div className="space-y-4 sm:space-y-6">
            <div className="bg-white rounded-2xl shadow-lg p-5 sm:p-6 space-y-3">
              <h3 className="font-bold text-gray-900 text-base sm:text-lg border-b border-gray-100 pb-3">
                Estatísticas da Conta
              </h3>
              <StatRow icon={<Calendar className="w-4 h-4 text-blue-500" />} label="Total de Eventos" value={stats.total.toString()} />
              <StatRow icon={<Users className="w-4 h-4 text-purple-500" />} label="Total de Interessados" value={stats.totalLikes.toString()} />
              <StatRow icon={<Star className="w-4 h-4 text-amber-500" />} label="Avaliação Média" value={stats.avaliacaoMedia > 0 ? `${stats.avaliacaoMedia} ★` : 'Sem avaliações'} />
              <StatRow icon={<Award className="w-4 h-4 text-orange-500" />} label="Membro desde" value={memberSince} />
            </div>

            <div className="bg-white rounded-2xl shadow-lg p-5 sm:p-6">
              <h3 className="font-bold text-gray-900 text-base sm:text-lg border-b border-gray-100 pb-3 mb-4 flex items-center gap-2">
                <Lock className="w-5 h-5 text-orange-600" />
                Segurança
              </h3>
              <button
                onClick={() => setIsChangingPassword(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-orange-50 cursor-pointer text-orange-700 border-2 border-orange-200 rounded-xl hover:bg-orange-100 transition-colors font-medium text-sm sm:text-base"
              >
                <KeyRound className="w-5 h-5" />
                Alterar Senha
              </button>
            </div>
          </div>
        </div>

        {/* About */}
        <div className="bg-white rounded-2xl shadow-lg p-5 sm:p-6">
          <h3 className="font-bold text-gray-900 text-base sm:text-lg border-b border-gray-100 pb-3 mb-4">
            Sobre a Organização
          </h3>
          <p className="text-gray-600 leading-relaxed text-sm sm:text-base">
            {organizerData?.sobre || 'Organização dedicada à promoção de eventos de capacitação, networking e desenvolvimento profissional em Angola. Comprometidos em criar experiências transformadoras que impulsionam o crescimento pessoal e empresarial.'}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {(organizerData?.tags || ['Empreendedorismo', 'Tecnologia', 'Liderança', 'Inovação', 'Networking']).map((tag: string) => (
              <span key={tag} className="px-3 py-1 bg-orange-50 text-orange-700 border border-orange-200 rounded-full text-xs sm:text-sm font-medium">
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Dica de Segurança */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-4 sm:p-6">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center flex-shrink-0">
              <img src={logo} alt="Cresce.AO Logo" className="h-9 sm:h-10 w-auto object-contain" />
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-1 text-sm sm:text-base">Dica de Segurança</h4>
              <p className="text-xs sm:text-sm text-gray-600">
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
        userId={user.id}
        userEmail={organizerData?.email_empresa || user.email}
        userName={organizerData?.nome_empresa || user.name}
        onSuccess={handlePasswordChangeSuccess}
      />
    </div>
  );
}