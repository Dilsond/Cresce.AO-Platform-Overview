import { useState, useRef } from 'react';
import { ArrowLeft, Building2, Shield, LogIn, Eye, EyeOff, Upload, FileText, X, CheckCircle, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export function OrganizerSignupPage({ onBack }: { onBack: () => void }) {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const navigate = useNavigate();

  // Signup form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [company, setCompany] = useState('');
  const [nif, setNif] = useState('');
  const [contacto, setContacto] = useState('');
  const [localizacao, setLocalizacao] = useState('');
  const [sobre, setSobre] = useState('');

  // Document upload state
  const [documentoFile, setDocumentoFile] = useState<File | null>(null);
  const [documentoPreview, setDocumentoPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Função auxiliar para gerar hash SHA-256
  async function sha256(message: string) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // Função para fazer upload do documento
  // Função para fazer upload do documento (versão melhorada)
  const handleDocumentUpload = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `organizador_documento_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `documentos/${fileName}`;

      console.log('📤 Fazendo upload do documento:', fileName);
      console.log('📦 Bucket:', 'organizador-documentos');

      // Tentativa 1: Upload normal
      const { error: uploadError, data } = await supabase.storage
        .from('organizador-documentos')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type
        });

      if (uploadError) {
        console.error('Erro detalhado no upload:', uploadError);

        // Se o erro for de permissão, tentar criar o bucket primeiro
        if (uploadError.message.includes('row-level security') || uploadError.message.includes('permission')) {
          console.log('⚠️ Erro de permissão, tentando método alternativo...');

          // Tentativa 2: Usar bucket público 'documents'
          const { error: uploadError2, data: data2 } = await supabase.storage
            .from('documents')
            .upload(filePath, file, {
              cacheControl: '3600',
              upsert: false,
              contentType: file.type
            });

          if (uploadError2) {
            console.error('Erro no método alternativo:', uploadError2);
            throw uploadError2;
          }

          const { data: { publicUrl } } = supabase.storage
            .from('documents')
            .getPublicUrl(filePath);

          return publicUrl;
        }

        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('organizador-documentos')
        .getPublicUrl(filePath);

      console.log('✅ Documento enviado com sucesso:', publicUrl);
      return publicUrl;

    } catch (err) {
      console.error('Erro no upload:', err);
      return null;
    }
  };

  const handleDocumentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validar tipo de arquivo
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
      if (!allowedTypes.includes(file.type)) {
        setError('O documento deve ser PDF, JPEG ou PNG');
        return;
      }

      // Validar tamanho (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        setError('O documento deve ter no máximo 10MB');
        return;
      }

      setDocumentoFile(file);
      setDocumentoPreview(URL.createObjectURL(file));
      setError(null);
    }
  };

  const removeDocument = () => {
    setDocumentoFile(null);
    setDocumentoPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Validações básicas
      if (!company.trim()) {
        setError('Nome da empresa é obrigatório');
        setIsLoading(false);
        return;
      }

      if (!/^\d{9,10}$/.test(nif)) {
        setError('NIF inválido. Digite apenas números (9-10 dígitos)');
        setIsLoading(false);
        return;
      }

      if (!email.includes('@') || email.split('@')[1].split('.').length < 2) {
        setError('Por favor, insira um email empresarial válido');
        setIsLoading(false);
        return;
      }

      if (password.length < 6) {
        setError('A senha deve ter pelo menos 6 caracteres');
        setIsLoading(false);
        return;
      }

      if (!documentoFile) {
        setError('Por favor, faça upload do Certificado de Admissibilidade ou Alvará Comercial');
        setIsLoading(false);
        return;
      }

      // Verificar se já existe organizador com este email
      const { data: existingOrganizerEmail, error: emailCheckError } = await supabase
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

      if (existingOrganizerEmail) {
        setError('Este email empresarial já está registado');
        setIsLoading(false);
        return;
      }

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

      // Upload do documento
      setIsUploading(true);
      const documentoUrl = await handleDocumentUpload(documentoFile);
      if (!documentoUrl) {
        setError('Erro ao fazer upload do documento. Tente novamente.');
        setIsLoading(false);
        return;
      }
      setIsUploading(false);

      // Gerar hash da senha
      const hashedPassword = '$2a$10$' + await sha256(password);

      // Inserir organizador com status pendente
      const { data: newOrganizer, error: insertError } = await supabase
        .from('organizadores')
        .insert([
          {
            nome_empresa: company,
            nif: nif,
            email_empresa: email,
            senha: hashedPassword,
            contacto: contacto || null,
            localizacao: localizacao || null,
            sobre: sobre || null,
            tags: ['Empreendedorismo', 'Tecnologia'],
            status: 'pendente',
            documento_url: documentoUrl,
            documento_nome: documentoFile.name,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ])
        .select()
        .single();

      if (insertError) {
        console.error('Erro ao inserir:', insertError);
        setError(`Erro ao criar conta: ${insertError.message}`);
        setIsLoading(false);
        return;
      }

      // Enviar notificação para admins (opcional - via trigger ou email)
      console.log('Organizador cadastrado com sucesso. Aguardando aprovação:', newOrganizer.id);

      setSuccess('Cadastro realizado com sucesso! Sua conta está aguardando aprovação por um administrador. Você receberá um email quando for aprovada.');

      // Limpar formulário
      setCompany('');
      setNif('');
      setEmail('');
      setPassword('');
      setContacto('');
      setLocalizacao('');
      setSobre('');
      removeDocument();

      // Redirecionar após 5 segundos
      setTimeout(() => {
        navigate('/organizer-login');
      }, 5000);

    } catch (err) {
      console.error('Erro inesperado:', err);
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
          <div className="lg:w-1/2 p-12 flex flex-col justify-center overflow-y-auto max-h-[90vh]">
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

              {/* Mensagem de sucesso */}
              {success && (
                <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-green-800 text-sm font-medium">Cadastro enviado!</p>
                      <p className="text-green-700 text-sm mt-1">{success}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Mensagem de erro */}
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                    <p className="text-red-600 text-sm">{error}</p>
                  </div>
                </div>
              )}

              {/* Validation Notice */}
              <div className="mb-6 p-4 bg-orange-50 rounded-xl border border-orange-100">
                <div className="flex items-start gap-3">
                  <Shield className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-gray-900 mb-1">Validação Documental Obrigatória</p>
                    <p className="text-xs text-gray-600">
                      É obrigatório o envio do Certificado de Admissibilidade ou Alvará Comercial.
                      Após a validação pela nossa equipa, a sua conta será ativada.
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

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Certificado de Admissibilidade ou Alvará Comercial *
                  </label>
                  {!documentoFile ? (
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-orange-500 transition-colors">
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={handleDocumentChange}
                        className="hidden"
                        id="document-upload"
                        ref={fileInputRef}
                      />
                      <label
                        htmlFor="document-upload"
                        className="cursor-pointer flex flex-col items-center gap-2"
                      >
                        <Upload className="w-8 h-8 text-gray-400" />
                        <span className="text-sm text-gray-600">
                          Clique para selecionar o documento
                        </span>
                        <span className="text-xs text-gray-500">
                          PDF, JPEG ou PNG (máx. 10MB)
                        </span>
                      </label>
                    </div>
                  ) : (
                    <div className="relative p-4 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center gap-3">
                        <FileText className="w-8 h-8 text-green-600" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">{documentoFile.name}</p>
                          <p className="text-xs text-gray-500">
                            {(documentoFile.size / (1024 * 1024)).toFixed(2)} MB
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={removeDocument}
                          className="p-1 text-red-500 hover:text-red-700 transition-colors"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                      {documentoPreview && documentoFile.type.startsWith('image/') && (
                        <img
                          src={documentoPreview}
                          alt="Preview"
                          className="mt-3 max-h-32 object-contain rounded-lg"
                        />
                      )}
                    </div>
                  )}
                </div>

                {/* Campos opcionais */}
                <details className="text-sm">
                  <summary className="cursor-pointer text-orange-600 hover:text-orange-700 font-medium">
                    Informações adicionais (opcional)
                  </summary>
                  <div className="mt-4 space-y-4">
                    <div>
                      <label htmlFor="contacto" className="block text-sm font-medium text-gray-700 mb-2">
                        Contacto
                      </label>
                      <input
                        id="contacto"
                        type="text"
                        value={contacto}
                        onChange={(e) => setContacto(e.target.value)}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all text-gray-900 placeholder-gray-400"
                        placeholder="+244 900 000 000"
                      />
                    </div>

                    <div>
                      <label htmlFor="localizacao" className="block text-sm font-medium text-gray-700 mb-2">
                        Localização
                      </label>
                      <input
                        id="localizacao"
                        type="text"
                        value={localizacao}
                        onChange={(e) => setLocalizacao(e.target.value)}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                        placeholder="Luanda, Angola"
                      />
                    </div>

                    <div>
                      <label htmlFor="sobre" className="block text-sm font-medium text-gray-700 mb-2">
                        Sobre a organização
                      </label>
                      <textarea
                        id="sobre"
                        value={sobre}
                        onChange={(e) => setSobre(e.target.value)}
                        rows={3}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                        placeholder="Descreva brevemente a sua organização..."
                      />
                    </div>
                  </div>
                </details>

                <motion.button
                  type="submit"
                  disabled={isLoading || isUploading}
                  className="w-full bg-orange-600 text-white py-3.5 cursor-pointer rounded-xl font-semibold hover:bg-orange-700 transition-all shadow-lg shadow-orange-500/30 hover:shadow-xl hover:shadow-orange-500/40 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                >
                  {isLoading || isUploading ? (
                    <>
                      <motion.div
                        className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                      />
                      {isUploading ? 'Enviando documento...' : 'Criando...'}
                    </>
                  ) : (
                    'Solicitar Registo'
                  )}
                </motion.button>
              </form>

              {/* Toggle Mode Button */}
              <div className="mt-6 text-center pt-4 border-t border-gray-100">
                <p className="text-gray-600 mb-2">
                  Já tem conta de organizador?
                </p>
                <button
                  onClick={() => { navigate('/organizer-login'); }}
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