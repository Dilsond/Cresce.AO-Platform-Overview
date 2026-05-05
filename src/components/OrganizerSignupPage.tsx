import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, Building, Mail, Lock, User, Phone, 
  MapPin, Globe, AlertCircle, CheckCircle, Eye, EyeOff,
  Briefcase, FileText, Upload, X, Calendar
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import logo from '../assets/logo.png';

// Exportação nomeada (para corresponder à importação em App.tsx)
export function OrganizerSignupPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Dados do formulário
  const [formData, setFormData] = useState({
    nome_empresa: '',
    email_empresa: '',
    telefone: '',
    endereco: '',
    website: '',
    nome_responsavel: '',
    cargo_responsavel: '',
    password: '',
    confirmPassword: '',
    descricao: '',
    nif: '',
  });

  // Documentos
  const [comprovativoFile, setComprovativoFile] = useState<File | null>(null);
  const [comprovativoPreview, setComprovativoPreview] = useState<string | null>(null);
  const [alvaraFile, setAlvaraFile] = useState<File | null>(null);
  const [alvaraPreview, setAlvaraPreview] = useState<string | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, tipo: 'comprovativo' | 'alvara') => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validação de tipo
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      setError('O documento deve ser PDF, JPG ou PNG');
      return;
    }

    // Validação de tamanho (máx 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('O documento não pode ultrapassar 10 MB');
      return;
    }

    if (tipo === 'comprovativo') {
      setComprovativoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setComprovativoPreview(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      setAlvaraFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setAlvaraPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
    setError(null);
  };

  const removeFile = (tipo: 'comprovativo' | 'alvara') => {
    if (tipo === 'comprovativo') {
      setComprovativoFile(null);
      setComprovativoPreview(null);
    } else {
      setAlvaraFile(null);
      setAlvaraPreview(null);
    }
  };

  const uploadFile = async (file: File, bucket: string): Promise<string | null> => {
    try {
      const ext = file.name.split('.').pop();
      const path = `${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(path, file, { cacheControl: '3600', upsert: false });
      
      if (uploadError) throw uploadError;
      
      const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(path);
      return publicUrl;
    } catch (err) {
      console.error('Erro no upload:', err);
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    // Validações
    if (!formData.nome_empresa.trim()) {
      setError('Nome da empresa é obrigatório');
      setIsLoading(false);
      return;
    }

    if (!formData.email_empresa.trim()) {
      setError('Email é obrigatório');
      setIsLoading(false);
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email_empresa)) {
      setError('Email inválido');
      setIsLoading(false);
      return;
    }

    if (!formData.password) {
      setError('Senha é obrigatória');
      setIsLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError('A senha deve ter no mínimo 6 caracteres');
      setIsLoading(false);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('As senhas não coincidem');
      setIsLoading(false);
      return;
    }

    if (!formData.nome_responsavel.trim()) {
      setError('Nome do responsável é obrigatório');
      setIsLoading(false);
      return;
    }

    if (!comprovativoFile) {
      setError('Comprovativo de endereço é obrigatório');
      setIsLoading(false);
      return;
    }

    if (!alvaraFile) {
      setError('Alvará ou licença é obrigatório');
      setIsLoading(false);
      return;
    }

    try {
      // Verificar se email já existe
      const { data: existingUser, error: checkError } = await supabase
        .from('organizadores')
        .select('email_empresa')
        .eq('email_empresa', formData.email_empresa)
        .single();

      if (existingUser) {
        setError('Este email já está registrado');
        setIsLoading(false);
        return;
      }

      // Upload dos documentos
      const [comprovativoUrl, alvaraUrl] = await Promise.all([
        uploadFile(comprovativoFile, 'organizer-documents'),
        uploadFile(alvaraFile, 'organizer-documents'),
      ]);

      if (!comprovativoUrl || !alvaraUrl) {
        throw new Error('Erro ao fazer upload dos documentos');
      }

      // Criar hash da senha (simplificado - em produção usar bcrypt)
      const hashedPassword = btoa(formData.password); // Apenas para demonstração

      // Inserir organizador
      const { data: newOrganizer, error: insertError } = await supabase
        .from('organizadores')
        .insert([{
          nome_empresa: formData.nome_empresa,
          email_empresa: formData.email_empresa,
          telefone: formData.telefone || null,
          endereco: formData.endereco || null,
          website: formData.website || null,
          nome_responsavel: formData.nome_responsavel,
          cargo_responsavel: formData.cargo_responsavel || null,
          descricao: formData.descricao || null,
          nif: formData.nif || null,
          comprovativo_endereco_url: comprovativoUrl,
          alvara_licenca_url: alvaraUrl,
          status_aprovacao: 'pendente',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }])
        .select()
        .single();

      if (insertError) throw insertError;

      // Criar usuário na tabela de autenticação (simplificado)
      // Em produção, usar auth.signUp do Supabase
      const { error: authError } = await supabase.auth.signUp({
        email: formData.email_empresa,
        password: formData.password,
        options: {
          data: {
            nome_empresa: formData.nome_empresa,
            tipo: 'organizador',
            organizador_id: newOrganizer.id,
          }
        }
      });

      if (authError) throw authError;

      setSuccess(true);
      
      // Redirecionar após 3 segundos
      setTimeout(() => {
        navigate('/organizer-login');
      }, 3000);

    } catch (err: any) {
      console.error('Erro no cadastro:', err);
      setError(err.message || 'Erro ao cadastrar organizador');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center"
        >
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Cadastro Enviado!</h2>
          <p className="text-gray-600 mb-6">
            Sua solicitação de cadastro como organizador foi enviada com sucesso. 
            Nossa equipe analisará seus documentos e você receberá um email com a confirmação.
          </p>
          <div className="bg-orange-50 rounded-lg p-4 mb-6">
            <p className="text-sm text-orange-800">
              ⏱️ O processo de análise pode levar até 48 horas úteis.
            </p>
          </div>
          <button
            onClick={() => navigate('/organizer-login')}
            className="w-full bg-orange-600 text-white py-3 rounded-lg font-semibold hover:bg-orange-700 transition-colors"
          >
            Ir para o Login
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-gray-600 hover:text-orange-600 transition-colors mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            Voltar
          </button>
          
          <div className="flex items-center gap-3 mb-2">
            <img src={logo} alt="Cresce.AO" className="h-12 w-auto" />
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
              Cadastro de <span className="text-orange-600">Organizador</span>
            </h1>
          </div>
          <p className="text-gray-600">
            Junte-se à nossa plataforma e comece a vender ingressos para seus eventos
          </p>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-xl p-6 md:p-8">
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3"
            >
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-red-600 text-sm">{error}</p>
            </motion.div>
          )}

          {/* Seção: Informações da Empresa */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Building className="w-5 h-5 text-orange-600" />
              Informações da Empresa
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nome da Empresa *
                </label>
                <input
                  type="text"
                  name="nome_empresa"
                  value={formData.nome_empresa}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                  placeholder="Ex: Eventos Ltda"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  NIF *
                </label>
                <input
                  type="text"
                  name="nif"
                  value={formData.nif}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                  placeholder="Número de identificação fiscal"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  name="email_empresa"
                  value={formData.email_empresa}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                  placeholder="contato@empresa.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Telefone *
                </label>
                <input
                  type="tel"
                  name="telefone"
                  value={formData.telefone}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                  placeholder="+244 900 000 000"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Endereço
                </label>
                <textarea
                  name="endereco"
                  value={formData.endereco}
                  onChange={handleInputChange}
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                  placeholder="Endereço completo da empresa"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Website
                </label>
                <input
                  type="url"
                  name="website"
                  value={formData.website}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                  placeholder="https://www.empresa.com"
                />
              </div>
            </div>
          </div>

          {/* Seção: Responsável */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-orange-600" />
              Dados do Responsável
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  name="nome_responsavel"
                  value={formData.nome_responsavel}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                  placeholder="Nome do responsável legal"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cargo
                </label>
                <input
                  type="text"
                  name="cargo_responsavel"
                  value={formData.cargo_responsavel}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                  placeholder="CEO, Diretor, etc."
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Descrição da Empresa
                </label>
                <textarea
                  name="descricao"
                  value={formData.descricao}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                  placeholder="Fale um pouco sobre sua empresa, histórico, eventos realizados, etc."
                />
              </div>
            </div>
          </div>

          {/* Seção: Documentação */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-orange-600" />
              Documentos Obrigatórios
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Comprovativo de Endereço */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Comprovativo de Endereço *
                </label>
                {!comprovativoFile ? (
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-orange-400 transition-colors cursor-pointer">
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => handleFileChange(e, 'comprovativo')}
                      className="hidden"
                      id="comprovativo-upload"
                    />
                    <label htmlFor="comprovativo-upload" className="cursor-pointer flex flex-col items-center gap-2">
                      <Upload className="w-8 h-8 text-gray-400" />
                      <span className="text-sm text-gray-600">Clique para anexar</span>
                      <span className="text-xs text-gray-500">PDF, JPG, PNG até 10MB</span>
                    </label>
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-3 bg-orange-50 border border-orange-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <FileText className="w-5 h-5 text-orange-600" />
                      <span className="text-sm text-gray-700 truncate">{comprovativoFile.name}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile('comprovativo')}
                      className="p-1 text-red-500 hover:text-red-700"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Alvará/Licença */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Alvará / Licença de Funcionamento *
                </label>
                {!alvaraFile ? (
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-orange-400 transition-colors cursor-pointer">
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => handleFileChange(e, 'alvara')}
                      className="hidden"
                      id="alvara-upload"
                    />
                    <label htmlFor="alvara-upload" className="cursor-pointer flex flex-col items-center gap-2">
                      <Upload className="w-8 h-8 text-gray-400" />
                      <span className="text-sm text-gray-600">Clique para anexar</span>
                      <span className="text-xs text-gray-500">PDF, JPG, PNG até 10MB</span>
                    </label>
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-3 bg-orange-50 border border-orange-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <FileText className="w-5 h-5 text-orange-600" />
                      <span className="text-sm text-gray-700 truncate">{alvaraFile.name}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile('alvara')}
                      className="p-1 text-red-500 hover:text-red-700"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-3">
              📄 Os documentos serão analisados pela nossa equipe. Apenas organizadores verificados podem publicar eventos.
            </p>
          </div>

          {/* Seção: Senha */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Lock className="w-5 h-5 text-orange-600" />
              Segurança
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Senha *
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                    placeholder="Mínimo 6 caracteres"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confirmar Senha *
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                    placeholder="Confirme sua senha"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Botão de Submissão */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-orange-600 to-red-600 text-white py-3 rounded-lg font-semibold hover:from-orange-700 hover:to-red-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Enviando Cadastro...
              </>
            ) : (
              <>
                <Building className="w-5 h-5" />
                Cadastrar como Organizador
              </>
            )}
          </button>

          <p className="text-center text-sm text-gray-600 mt-6">
            Já tem uma conta?{' '}
            <Link to="/organizer-login" className="text-orange-600 hover:text-orange-700 font-semibold">
              Faça login
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}