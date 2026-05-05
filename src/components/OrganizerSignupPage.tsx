import { useState, useRef } from 'react';
import {
  ArrowLeft, Building2, Shield, Eye, EyeOff, Upload,
  FileText, X, CheckCircle, AlertCircle, User, Camera,
  Link, Instagram, Linkedin, BadgeCheck, ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

// ─── Tipos ────────────────────────────────────────────────────────────────────
type Tab = 'empresa' | 'singular';

// ─── Helpers ──────────────────────────────────────────────────────────────────
async function sha256(message: string) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(message));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function uploadToSupabase(file: File, bucket: string, path: string): Promise<string | null> {
  try {
    const { error } = await supabase.storage.from(bucket).upload(path, file, {
      cacheControl: '3600', upsert: false, contentType: file.type,
    });
    if (error) throw error;
    return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
  } catch (err) {
    console.error(`Upload ${bucket}:`, err);
    return null;
  }
}

// ─── Campo de upload de ficheiro ──────────────────────────────────────────────
function FileUploadField({
  label, hint, accept, required = false,
  file, preview, onChange, onRemove, icon: Icon,
}: {
  label: string; hint: string; accept: string; required?: boolean;
  file: File | null; preview: string | null;
  onChange: (f: File) => void; onRemove: () => void;
  icon: React.ElementType;
}) {
  const ref = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) onChange(f);
  };

  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-1.5">
        {label} {required && <span className="text-orange-500">*</span>}
      </label>
      {!file ? (
        <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-200 rounded-xl p-5 cursor-pointer hover:border-orange-400 hover:bg-orange-50/50 transition-all group">
          <input ref={ref} type="file" accept={accept} className="hidden" onChange={handleChange} />
          <div className="w-10 h-10 rounded-xl bg-gray-100 group-hover:bg-orange-100 flex items-center justify-center transition-colors">
            <Icon className="w-5 h-5 text-gray-400 group-hover:text-orange-500 transition-colors" />
          </div>
          <span className="text-sm font-medium text-gray-600 group-hover:text-orange-600 transition-colors text-center">{hint}</span>
          <span className="text-[11px] text-gray-400">JPG, PNG ou PDF · máx. 15 MB</span>
        </label>
      ) : (
        <div className="flex items-center gap-3 p-3.5 bg-green-50 border border-green-200 rounded-xl">
          {preview && file.type.startsWith('image/') ? (
            <img src={preview} alt="" className="w-12 h-12 object-cover rounded-lg flex-shrink-0" />
          ) : (
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <FileText className="w-6 h-6 text-green-600" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">{file.name}</p>
            <p className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
          </div>
          <button type="button" onClick={onRemove}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Formulário — Singular ────────────────────────────────────────────────────
function SingularForm({ onSuccess }: { onSuccess: () => void }) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [biNumero, setBiNumero] = useState('');
  const [portfolioUrl, setPortfolioUrl] = useState('');

  // Ficheiros
  const [biFrenteFile, setBiFrenteFile] = useState<File | null>(null);
  const [biFrentePreview, setBiFrentePreview] = useState<string | null>(null);
  const [biVersoFile, setBiVersoFile] = useState<File | null>(null);
  const [biVersoPreview, setBiVersoPreview] = useState<string | null>(null);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [selfiePreview, setSelfiePreview] = useState<string | null>(null);

  const setFile = (
    setter: (f: File | null) => void,
    previewSetter: (s: string | null) => void
  ) => (file: File) => {
    setter(file);
    previewSetter(URL.createObjectURL(file));
  };

  const removeFile = (
    setter: (f: File | null) => void,
    previewSetter: (s: string | null) => void
  ) => () => { setter(null); previewSetter(null); };

  // Validar URL de portfólio
  const isValidPortfolio = (url: string) => {
    if (!url) return false;
    return url.includes('linkedin.com') || url.includes('instagram.com');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validações
    if (!nome.trim()) { setError('Nome completo é obrigatório'); return; }
    if (!email.includes('@')) { setError('Email inválido'); return; }
    if (password.length < 6) { setError('Senha deve ter pelo menos 6 caracteres'); return; }
    if (!/^[0-9A-Za-z]{9,14}$/.test(biNumero)) {
      setError('Número de BI inválido (9 a 14 caracteres alfanuméricos)'); return;
    }
    if (!biFrenteFile) { setError('Foto da frente do BI é obrigatória'); return; }
    if (!biVersoFile) { setError('Foto do verso do BI é obrigatória'); return; }
    if (!selfieFile) { setError('Selfie com o BI é obrigatória para verificação'); return; }
    if (!isValidPortfolio(portfolioUrl)) {
      setError('Insere um link válido do LinkedIn ou Instagram profissional'); return;
    }

    setIsLoading(true);
    try {
      // Verificar email duplicado
      const { data: existing } = await supabase
        .from('organizadores')
        .select('email_empresa')
        .eq('email_empresa', email)
        .maybeSingle();
      if (existing) { setError('Este email já está registado'); setIsLoading(false); return; }

      const ts = Date.now();
      const uid = Math.random().toString(36).slice(2, 8);

      // Upload dos 3 ficheiros em paralelo
      const [biFrenteUrl, biVersoUrl, selfieUrl] = await Promise.all([
        uploadToSupabase(biFrenteFile, 'organizador-identidade', `bi-frente/${ts}-${uid}.${biFrenteFile.name.split('.').pop()}`),
        uploadToSupabase(biVersoFile, 'organizador-identidade', `bi-verso/${ts}-${uid}.${biVersoFile.name.split('.').pop()}`),
        uploadToSupabase(selfieFile, 'organizador-identidade', `selfie/${ts}-${uid}.${selfieFile.name.split('.').pop()}`),
      ]);

      if (!biFrenteUrl || !biVersoUrl || !selfieUrl) {
        setError('Erro ao enviar os documentos. Verifica a ligação e tenta novamente.');
        setIsLoading(false);
        return;
      }

      const hashedPassword = '$2a$10$' + await sha256(password);

      // Inserir na tabela organizadores
      const { error: insertError } = await supabase.from('organizadores').insert([{
        // Para singular, usamos o nome como nome_empresa (campo obrigatório)
        nome_empresa: nome,
        nome_completo: nome,
        nif: null,                         // BI substitui NIF para singulares
        email_empresa: email,
        senha: hashedPassword,
        status: 'pendente',
        tipo_organizador: 'singular',
        bi_numero: biNumero,
        bi_frente_url: biFrenteUrl,
        bi_verso_url: biVersoUrl,
        selfie_url: selfieUrl,
        portfolio_url: portfolioUrl,
        tags: ['Eventos'],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }]);

      if (insertError) {
        setError(`Erro ao criar conta: ${insertError.message}`);
        setIsLoading(false);
        return;
      }

      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Erro inesperado. Tenta novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="flex items-start gap-2.5 p-3.5 bg-red-50 border border-red-200 rounded-xl">
          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Info banner */}
      <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
        <BadgeCheck className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-gray-900 mb-0.5">Verificação de Identidade</p>
          <p className="text-xs text-gray-600 leading-relaxed">
            Para organizadores individuais, precisamos verificar a tua identidade com BI + selfie.
            A conta ficará pendente até aprovação da equipa Cresce.AO.
          </p>
        </div>
      </div>

      {/* Nome */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
          Nome Completo <span className="text-orange-500">*</span>
        </label>
        <input type="text" value={nome} onChange={e => setNome(e.target.value)} required
          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none text-gray-900 placeholder-gray-400"
          placeholder="Ex: João Manuel Ferreira" />
      </div>

      {/* Email */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
          Email <span className="text-orange-500">*</span>
        </label>
        <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none text-gray-900 placeholder-gray-400"
          placeholder="joao@email.com" />
      </div>

      {/* Senha */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
          Senha <span className="text-orange-500">*</span>
        </label>
        <div className="relative">
          <input type={showPassword ? 'text' : 'password'} value={password}
            onChange={e => setPassword(e.target.value)} required minLength={6}
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none text-gray-900 pr-12"
            placeholder="••••••••" />
          <button type="button" onClick={() => setShowPassword(s => !s)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-1">Mínimo 6 caracteres</p>
      </div>

      {/* Número do BI */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
          Número do Bilhete de Identidade (BI) <span className="text-orange-500">*</span>
        </label>
        <input type="text" value={biNumero}
          onChange={e => setBiNumero(e.target.value.toUpperCase().replace(/[^0-9A-Z]/g, '').slice(0, 14))}
          required maxLength={14}
          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none text-gray-900 font-mono tracking-widest placeholder-gray-400"
          placeholder="00XXXXXXXXXXX" />
        <p className="text-xs text-gray-400 mt-1">9 a 14 caracteres alfanuméricos</p>
      </div>

      {/* Divisor — Documentos */}
      <div className="pt-1">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Documentos de Identidade</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          <FileUploadField
            label="BI — Frente" hint="Foto da frente do BI"
            accept="image/jpeg,image/png,image/jpg"
            required file={biFrenteFile} preview={biFrentePreview}
            onChange={setFile(setBiFrenteFile, setBiFrentePreview)}
            onRemove={removeFile(setBiFrenteFile, setBiFrentePreview)}
            icon={Upload}
          />
          <FileUploadField
            label="BI — Verso" hint="Foto do verso do BI"
            accept="image/jpeg,image/png,image/jpg"
            required file={biVersoFile} preview={biVersoPreview}
            onChange={setFile(setBiVersoFile, setBiVersoPreview)}
            onRemove={removeFile(setBiVersoFile, setBiVersoPreview)}
            icon={Upload}
          />
        </div>

        <FileUploadField
          label="Selfie com o BI" hint="Foto segurando o BI ao lado do rosto"
          accept="image/jpeg,image/png,image/jpg"
          required file={selfieFile} preview={selfiePreview}
          onChange={setFile(setSelfieFile, setSelfiePreview)}
          onRemove={removeFile(setSelfieFile, setSelfiePreview)}
          icon={Camera}
        />

        {/* Dica selfie */}
        <div className="mt-2 p-3 bg-blue-50 border border-blue-100 rounded-lg">
          <p className="text-xs text-blue-700 leading-relaxed">
            <span className="font-bold">📸 Como fazer a selfie:</span> Segura o BI aberto ao lado do rosto,
            numa zona bem iluminada, com os dados legíveis. O rosto e o BI devem estar ambos visíveis.
          </p>
        </div>
      </div>

      {/* Portfólio / Redes sociais */}
      <div className="pt-1">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Redes Sociais / Portfólio</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
            LinkedIn ou Instagram Profissional <span className="text-orange-500">*</span>
          </label>
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
              {portfolioUrl.includes('linkedin') ? (
                <Linkedin className="w-4 h-4 text-blue-600" />
              ) : portfolioUrl.includes('instagram') ? (
                <Instagram className="w-4 h-4 text-pink-500" />
              ) : (
                <Link className="w-4 h-4 text-gray-400" />
              )}
            </div>
            <input type="url" value={portfolioUrl} onChange={e => setPortfolioUrl(e.target.value)}
              required
              className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none text-gray-900 placeholder-gray-400"
              placeholder="https://linkedin.com/in/o-teu-perfil" />
          </div>
          {portfolioUrl && !isValidPortfolio(portfolioUrl) && (
            <p className="text-xs text-red-500 mt-1">⚠ Deve ser um link do LinkedIn ou Instagram</p>
          )}
          {portfolioUrl && isValidPortfolio(portfolioUrl) && (
            <p className="text-xs text-green-600 mt-1">✓ Link válido</p>
          )}
          <p className="text-xs text-gray-400 mt-1.5">
            Perfil público que comprove a tua actuação na área de eventos
          </p>
        </div>
      </div>

      <motion.button type="submit" disabled={isLoading}
        className="w-full py-3.5 rounded-xl font-bold text-white text-sm shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
        style={{ background: 'linear-gradient(135deg, #ea580c, #dc2626)' }}
        whileHover={{ scale: isLoading ? 1 : 1.01 }}
        whileTap={{ scale: isLoading ? 1 : 0.99 }}
      >
        {isLoading ? (
          <>
            <motion.div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
              animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }} />
            A submeter...
          </>
        ) : (
          <>Solicitar Registo <ChevronRight className="w-4 h-4" /></>
        )}
      </motion.button>
    </form>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────
export function OrganizerSignupPage({ onBack }: { onBack: () => void }) {
  const [activeTab, setActiveTab] = useState<Tab>('empresa');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  // Empresa form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [company, setCompany] = useState('');
  const [nif, setNif] = useState('');
  const [contacto, setContacto] = useState('');
  const [localizacao, setLocalizacao] = useState('');
  const [sobre, setSobre] = useState('');
  const [documentoFile, setDocumentoFile] = useState<File | null>(null);
  const [documentoPreview, setDocumentoPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleNifChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value.replace(/\D/g, '');
    if (v.length <= 10) setNif(v);
  };

  const handleContactoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value.replace(/\D/g, '');
    if (v.length <= 12) setContacto(v);
  };

  const handleDocumentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'].includes(file.type)) {
      setError('Documento deve ser PDF, JPEG ou PNG'); return;
    }
    if (file.size > 10 * 1024 * 1024) { setError('Documento máx. 10 MB'); return; }
    setDocumentoFile(file);
    setDocumentoPreview(URL.createObjectURL(file));
    setError(null);
  };

  const removeDocument = () => {
    setDocumentoFile(null); setDocumentoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleEmpresaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true); setError(null);

    try {
      if (!company.trim()) { setError('Nome da empresa é obrigatório'); return; }
      if (!/^\d{10}$/.test(nif)) { setError('NIF deve ter exactamente 10 dígitos'); return; }
      if (!email.includes('@')) { setError('Email inválido'); return; }
      if (password.length < 6) { setError('Senha mínimo 6 caracteres'); return; }
      if (contacto && !/^\d{9,12}$/.test(contacto)) { setError('Contacto inválido'); return; }
      if (!documentoFile) { setError('Certificado de Admissibilidade ou Alvará é obrigatório'); return; }

      const { data: existEmail } = await supabase.from('organizadores').select('email_empresa').eq('email_empresa', email).maybeSingle();
      if (existEmail) { setError('Email já registado'); return; }

      const { data: existNif } = await supabase.from('organizadores').select('nif').eq('nif', nif).maybeSingle();
      if (existNif) { setError('NIF já registado'); return; }

      setIsUploading(true);
      const ts = Date.now(); const uid = Math.random().toString(36).slice(2, 8);
      const ext = documentoFile.name.split('.').pop();
      const docUrl = await uploadToSupabase(documentoFile, 'organizador-documentos', `documentos/${ts}-${uid}.${ext}`);
      setIsUploading(false);

      if (!docUrl) { setError('Erro ao enviar documento.'); return; }

      const hashed = '$2a$10$' + await sha256(password);

      const { error: insertError } = await supabase.from('organizadores').insert([{
        nome_empresa: company, nif, email_empresa: email, senha: hashed,
        contacto: contacto || null, localizacao: localizacao || null,
        sobre: sobre || null, tags: ['Empreendedorismo', 'Tecnologia'],
        status: 'pendente', tipo_organizador: 'empresa',
        documento_url: docUrl, documento_nome: documentoFile.name,
        created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      }]);

      if (insertError) { setError(`Erro: ${insertError.message}`); return; }
      setSuccess(true);
      setTimeout(() => navigate('/organizer-login'), 5000);
    } catch (err: any) {
      setError(err.message || 'Erro inesperado.');
    } finally {
      setIsLoading(false); setIsUploading(false);
    }
  };

  // ── Ecrã de sucesso ────────────────────────────────────────────────────────
  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <motion.div initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          className="bg-white rounded-3xl shadow-2xl p-10 max-w-md w-full text-center">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: 'spring' }}
            className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </motion.div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Pedido Submetido!</h2>
          <p className="text-gray-500 mb-6 leading-relaxed">
            O teu registo foi enviado com sucesso e está a aguardar validação pela equipa Cresce.AO.
            Receberás uma notificação quando a conta for aprovada.
          </p>
          <div className="flex flex-col gap-2.5 p-4 bg-amber-50 rounded-2xl border border-amber-100 text-left mb-6">
            <div className="flex items-center gap-2.5 text-sm text-amber-800">
              <div className="w-5 h-5 rounded-full bg-amber-200 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold">1</span>
              </div>
              Documentos recebidos e em análise
            </div>
            <div className="flex items-center gap-2.5 text-sm text-amber-800">
              <div className="w-5 h-5 rounded-full bg-amber-200 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold">2</span>
              </div>
              Validação pela equipa (24–48h)
            </div>
            <div className="flex items-center gap-2.5 text-sm text-amber-800">
              <div className="w-5 h-5 rounded-full bg-amber-200 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold">3</span>
              </div>
              Conta activada por email
            </div>
          </div>
          <p className="text-xs text-gray-400">Redireccionando para o login em 5 segundos...</p>
        </motion.div>
      </div>
    );
  }

  const tabs: { id: Tab; label: string; icon: React.ElementType; desc: string }[] = [
    { id: 'empresa', label: 'Empresa', icon: Building2, desc: 'Pessoa colectiva com NIF e Alvará' },
    { id: 'singular', label: 'Individual', icon: User, desc: 'Organizador independente com BI' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      {/* Voltar */}
      <motion.button onClick={onBack}
        className="fixed top-4 left-4 sm:top-6 sm:left-6 flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors z-50 bg-white/90 backdrop-blur-sm px-3 py-2 rounded-xl shadow-sm border border-gray-200"
        initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
        whileHover={{ x: -3 }}>
        <ArrowLeft className="w-4 h-4" />
        <span className="text-sm font-medium">Voltar</span>
      </motion.button>

      <motion.div className="w-full max-w-5xl bg-white rounded-3xl shadow-2xl overflow-hidden"
        initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.45 }}>
        <div className="flex flex-col lg:flex-row min-h-[600px]">

          {/* ── Lado esquerdo ──────────────────────────────────────────────── */}
          <motion.div className="lg:w-5/12 bg-orange-600 p-10 flex flex-col justify-between text-white relative overflow-hidden"
            initial={{ x: -40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.15 }}>
            {/* Decorações */}
            <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-56 h-56 bg-black/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

            <div className="relative z-10">
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
                transition={{ delay: 0.3, type: 'spring' }}
                className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mb-8">
                {activeTab === 'empresa'
                  ? <Building2 className="w-7 h-7" />
                  : <User className="w-7 h-7" />}
              </motion.div>

              <AnimatePresence mode="wait">
                <motion.div key={activeTab}
                  initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.2 }}>
                  <p className="text-orange-100 text-sm font-semibold mb-3 uppercase tracking-widest">
                    {activeTab === 'empresa' ? 'Empresa / Organização' : 'Organizador Individual'}
                  </p>
                  <h2 className="text-3xl font-black leading-tight mb-4">
                    {activeTab === 'empresa'
                      ? 'Leve a sua empresa ao próximo nível'
                      : 'Torna-te um organizador verificado'}
                  </h2>
                  <p className="text-white/75 leading-relaxed">
                    {activeTab === 'empresa'
                      ? 'Crie eventos corporativos, faça a gestão de equipas e aceda a métricas avançadas.'
                      : 'Cria e gere eventos como profissional independente. Verificação rápida, aprovação em 24–48h.'}
                  </p>
                </motion.div>
              </AnimatePresence>
            </div>

            <motion.div className="relative z-10 space-y-2.5"
              initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.5 }}>
              {(activeTab === 'empresa'
                ? ['Painel de gestão completo', 'Análises e métricas detalhadas', 'Suporte dedicado']
                : ['Perfil verificado com badge', 'Publicação de eventos ilimitada', 'Dashboard exclusivo']
              ).map((item) => (
                <div key={item} className="flex items-center gap-3 text-white/85">
                  <div className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="w-3 h-3" />
                  </div>
                  <span className="text-sm font-medium">{item}</span>
                </div>
              ))}
            </motion.div>
          </motion.div>

          {/* ── Lado direito ───────────────────────────────────────────────── */}
          <div className="lg:w-7/12 flex flex-col">
            {/* Tabs */}
            <div className="px-8 pt-8 pb-0">
              <h1 className="text-2xl font-black text-gray-900 mb-1">Criar conta de Organizador</h1>
              <p className="text-sm text-gray-500 mb-6">Escolhe o tipo de registo que melhor te descreve</p>

              <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100 rounded-2xl mb-6">
                {tabs.map((tab) => (
                  <button key={tab.id} type="button" onClick={() => { setActiveTab(tab.id); setError(null); }}
                    className={`relative flex flex-col items-start gap-0.5 px-4 py-3 rounded-xl transition-all text-left ${
                      activeTab === tab.id ? 'bg-white shadow-sm' : 'hover:bg-white/50'
                    }`}>
                    <div className="flex items-center gap-2">
                      <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? 'text-orange-600' : 'text-gray-400'}`} />
                      <span className={`text-sm font-bold ${activeTab === tab.id ? 'text-gray-900' : 'text-gray-500'}`}>
                        {tab.label}
                      </span>
                    </div>
                    <span className="text-[11px] text-gray-400 pl-6">{tab.desc}</span>
                    {activeTab === tab.id && (
                      <motion.div layoutId="tab-indicator"
                        className="absolute bottom-1.5 left-4 right-4 h-0.5 bg-orange-500 rounded-full" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Form body */}
            <div className="flex-1 px-8 pb-8 overflow-y-auto" style={{ maxHeight: '72vh', scrollbarWidth: 'thin' }}>
              <AnimatePresence mode="wait">
                <motion.div key={activeTab}
                  initial={{ opacity: 0, x: activeTab === 'empresa' ? -12 : 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: activeTab === 'empresa' ? 12 : -12 }}
                  transition={{ duration: 0.2 }}>

                  {activeTab === 'singular' ? (
                    <SingularForm onSuccess={() => setSuccess(true)} />
                  ) : (
                    /* ── EMPRESA (original, sem alterações) ── */
                    <form onSubmit={handleEmpresaSubmit} className="space-y-4">
                      {error && (
                        <div className="flex items-start gap-2.5 p-3.5 bg-red-50 border border-red-200 rounded-xl">
                          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                          <p className="text-sm text-red-700">{error}</p>
                        </div>
                      )}

                      <div className="flex items-start gap-3 p-4 bg-orange-50 border border-orange-100 rounded-xl">
                        <Shield className="w-4 h-4 text-orange-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-semibold text-gray-900 mb-0.5">Validação Documental</p>
                          <p className="text-xs text-gray-600 leading-relaxed">
                            Envio obrigatório do Certificado de Admissibilidade ou Alvará Comercial.
                            Conta activada após validação.
                          </p>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Nome Legal da Empresa <span className="text-orange-500">*</span></label>
                        <input type="text" value={company} onChange={e => setCompany(e.target.value)} required
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none text-gray-900 placeholder-gray-400"
                          placeholder="Nome da empresa" />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">NIF <span className="text-orange-500">*</span></label>
                        <div className="relative">
                          <input type="text" inputMode="numeric" value={nif} onChange={handleNifChange} required maxLength={10}
                            className={`w-full px-4 py-3 bg-gray-50 border rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none text-gray-900 pr-16 ${nif.length === 10 ? 'border-green-400' : nif.length > 0 ? 'border-amber-300' : 'border-gray-200'}`}
                            placeholder="10 dígitos" />
                          <span className={`absolute right-4 top-1/2 -translate-y-1/2 text-xs font-mono ${nif.length === 10 ? 'text-green-600' : 'text-gray-400'}`}>{nif.length}/10</span>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email Empresarial <span className="text-orange-500">*</span></label>
                        <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none text-gray-900 placeholder-gray-400"
                          placeholder="contato@empresa.ao" />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Senha <span className="text-orange-500">*</span></label>
                        <div className="relative">
                          <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required minLength={6}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none text-gray-900 pr-12"
                            placeholder="••••••••" />
                          <button type="button" onClick={() => setShowPassword(s => !s)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      {/* Documento */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                          Certificado de Admissibilidade ou Alvará <span className="text-orange-500">*</span>
                        </label>
                        {!documentoFile ? (
                          <label className="flex flex-col items-center gap-2 border-2 border-dashed border-gray-200 rounded-xl p-5 cursor-pointer hover:border-orange-400 hover:bg-orange-50/50 transition-all">
                            <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={handleDocumentChange} className="hidden" ref={fileInputRef} />
                            <Upload className="w-7 h-7 text-gray-400" />
                            <span className="text-sm text-gray-600">Clique para selecionar</span>
                            <span className="text-xs text-gray-400">PDF, JPEG ou PNG · máx. 10 MB</span>
                          </label>
                        ) : (
                          <div className="flex items-center gap-3 p-3.5 bg-green-50 border border-green-200 rounded-xl">
                            <FileText className="w-8 h-8 text-green-600 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-gray-900 truncate">{documentoFile.name}</p>
                              <p className="text-xs text-gray-500">{(documentoFile.size / 1024 / 1024).toFixed(2)} MB</p>
                            </div>
                            <button type="button" onClick={removeDocument} className="text-red-400 hover:text-red-600">
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Opcionais */}
                      <details>
                        <summary className="cursor-pointer text-orange-600 hover:text-orange-700 text-sm font-semibold">
                          Informações adicionais (opcional)
                        </summary>
                        <div className="mt-4 space-y-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Contacto</label>
                            <div className="relative">
                              <input type="text" inputMode="numeric" value={contacto} onChange={handleContactoChange} maxLength={12}
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none text-gray-900 pr-16"
                                placeholder="912 345 678" />
                              {contacto.length > 0 && (
                                <span className={`absolute right-4 top-1/2 -translate-y-1/2 text-xs font-mono ${contacto.length >= 9 ? 'text-green-600' : 'text-amber-500'}`}>{contacto.length}/12</span>
                              )}
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Localização</label>
                            <input type="text" value={localizacao} onChange={e => setLocalizacao(e.target.value)}
                              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none text-gray-900"
                              placeholder="Luanda, Angola" />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Sobre</label>
                            <textarea value={sobre} onChange={e => setSobre(e.target.value)} rows={3}
                              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none text-gray-900"
                              placeholder="Descreva brevemente a organização..." />
                          </div>
                        </div>
                      </details>

                      <motion.button type="submit" disabled={isLoading || isUploading}
                        className="w-full py-3.5 rounded-xl font-bold text-white text-sm shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
                        style={{ background: 'linear-gradient(135deg, #ea580c, #c2410c)' }}
                        whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
                        {isLoading || isUploading ? (
                          <>
                            <motion.div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                              animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }} />
                            {isUploading ? 'A enviar documento...' : 'A criar conta...'}
                          </>
                        ) : (
                          <>Solicitar Registo <ChevronRight className="w-4 h-4" /></>
                        )}
                      </motion.button>
                    </form>
                  )}
                </motion.div>
              </AnimatePresence>

              <div className="mt-5 text-center pt-4 border-t border-gray-100">
                <p className="text-sm text-gray-500 mb-1.5">Já tem conta?</p>
                <button onClick={() => navigate('/organizer-login')}
                  className="text-orange-600 font-semibold hover:text-orange-700 transition-colors text-sm">
                  Entrar na minha conta →
                </button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}