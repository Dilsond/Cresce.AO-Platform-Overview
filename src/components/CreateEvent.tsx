import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ArrowLeft, Upload, X, Image, Video, Loader2, Bell,
    Plus, Trash2, Ticket, FileText, CheckCircle, AlertCircle, Clock
} from 'lucide-react';
import { motion } from 'motion/react';
import { supabase } from '../lib/supabase';
import { emailService } from '../services/emailService';
import logo from '../assets/logo.png';

interface User {
    id: string;
    name: string;
    type: 'user' | 'organizer';
    company?: string;
}

interface Estacao {
    id: string;
    nome: string;
    quantidade: number;
    preco: number;
    vantagens: string[];
}

type TipoDocumento = 'contrato_aluguer' | 'carta_autorizacao';

export function CreateEvent() {
    const navigate = useNavigate();
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [seguidoresCount, setSeguidoresCount] = useState(0);
    const [eventoCriado, setEventoCriado] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        nome_evento: '',
        categoria: 'palestra' as 'palestra' | 'workshop' | 'feiras' | 'masterclasse',
        data_evento: '',
        hora_inicio: '',
        hora_termino: '',
        tipo_evento: 'presencial' as 'presencial' | 'online' | 'hibrido',
        local: '',
        descricao: '',
        contacto_whatsapp: '',
    });

    const [isPaidEvent, setIsPaidEvent] = useState(false);

    const [estacoes, setEstacoes] = useState<Estacao[]>([
        {
            id: crypto.randomUUID(),
            nome: 'Normal',
            quantidade: 100,
            preco: 0,
            vantagens: ['Acesso geral']
        }
    ]);

    const [vantagemInput, setVantagemInput] = useState<Record<string, string>>({});

    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [videoFile, setVideoFile] = useState<File | null>(null);

    const [documentoFile, setDocumentoFile] = useState<File | null>(null);
    const [tipoDocumento, setTipoDocumento] = useState<TipoDocumento>('contrato_aluguer');

    // ─── Helpers ─────────────────────────────────────────────────────────────

    const fetchSeguidoresCount = async (userId: string) => {
        try {
            const { count, error } = await supabase
                .from('favoritos_organizadores')
                .select('*', { count: 'exact', head: true })
                .eq('organizador_favoritado_id', userId);
            if (!error && count !== null) setSeguidoresCount(count);
        } catch (err) {
            console.error('Erro ao buscar seguidores:', err);
        }
    };

    // ─── Auth ─────────────────────────────────────────────────────────────────

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            try {
                const parsedUser = JSON.parse(storedUser);
                if (parsedUser.type !== 'organizer') {
                    setError('Apenas organizadores podem criar eventos');
                    setTimeout(() => navigate('/events'), 2000);
                    return;
                }
                setUser(parsedUser);
                fetchSeguidoresCount(parsedUser.id);
            } catch {
                navigate('/login');
            }
        } else {
            navigate('/login');
        }
    }, [navigate]);

    // ─── Estações ─────────────────────────────────────────────────────────────

    const adicionarEstacao = () => {
        setEstacoes(prev => [...prev, {
            id: crypto.randomUUID(),
            nome: `Estação ${prev.length + 1}`,
            quantidade: 50,
            preco: 0,
            vantagens: []
        }]);
    };

    const removerEstacao = (id: string) => {
        if (estacoes.length === 1) { setError('É necessário ter pelo menos uma estação'); return; }
        setEstacoes(prev => prev.filter(e => e.id !== id));
    };

    const atualizarEstacao = (id: string, campo: keyof Estacao, valor: any) => {
        setEstacoes(prev => prev.map(e => e.id === id ? { ...e, [campo]: valor } : e));
    };

    const adicionarVantagem = (estacaoId: string) => {
        const input = vantagemInput[estacaoId];
        if (!input?.trim()) return;
        setEstacoes(prev => prev.map(e =>
            e.id === estacaoId ? { ...e, vantagens: [...e.vantagens, input.trim()] } : e
        ));
        setVantagemInput(prev => ({ ...prev, [estacaoId]: '' }));
    };

    const removerVantagem = (estacaoId: string, index: number) => {
        setEstacoes(prev => prev.map(e =>
            e.id === estacaoId ? { ...e, vantagens: e.vantagens.filter((_, i) => i !== index) } : e
        ));
    };

    // ─── File handlers ────────────────────────────────────────────────────────

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) { setError('Selecione uma imagem válida'); return; }
        if (file.size > 5 * 1024 * 1024) { setError('A imagem não pode ultrapassar 5 MB'); return; }
        setImageFile(file);
        const reader = new FileReader();
        reader.onloadend = () => setImagePreview(reader.result as string);
        reader.readAsDataURL(file);
        setError(null);
    };

    const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith('video/')) { setError('Selecione um vídeo válido'); return; }
        setVideoFile(file);
        setError(null);
    };

    const handleDocumentoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
        if (!allowed.includes(file.type)) {
            setError('O documento deve ser PDF, JPG ou PNG');
            return;
        }
        if (file.size > 10 * 1024 * 1024) { setError('O documento não pode ultrapassar 10 MB'); return; }
        setDocumentoFile(file);
        setError(null);
    };

    // ─── Upload helper ────────────────────────────────────────────────────────

    const uploadFile = async (file: File, bucket: string): Promise<string | null> => {
        try {
            const ext = file.name.split('.').pop();
            const path = `${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
            const { error: upErr } = await supabase.storage.from(bucket).upload(path, file, { cacheControl: '3600', upsert: false });
            if (upErr) throw upErr;
            const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(path);
            return publicUrl;
        } catch (err) {
            console.error('Erro no upload:', err);
            return null;
        }
    };

    // ─── Notificações ─────────────────────────────────────────────────────────

    const enviarNotificacoes = async (eventoId: string, eventoNome: string) => {
        try {
            const { data: seguidores, error } = await supabase
                .from('favoritos_organizadores')
                .select('usuario_normal_id, usuarios_normais(nome_completo, email)')
                .eq('organizador_favoritado_id', user!.id);
            if (error) throw error;

            for (const seg of seguidores || []) {
                const segData = seg.usuarios_normais as any;
                if (!segData) continue;
                await supabase.from('notificacoes').insert({
                    usuario_id: seg.usuario_normal_id,
                    tipo_usuario: 'user',
                    titulo: '📢 Novo Evento em Análise!',
                    mensagem: `${user?.name} publicou "${eventoNome}" — em breve disponível na plataforma.`,
                    tipo: 'novo_evento'
                });
                try {
                    await emailService.sendNotification({
                        to_email: segData.email,
                        to_name: segData.nome_completo,
                        assunto: `📢 Novo Evento: ${eventoNome}`,
                        titulo: 'Novo Evento em Análise!',
                        mensagem: `${user?.name} acabou de publicar "${eventoNome}". Em breve disponível na plataforma!`
                    });
                } catch { /* silencia falha de email */ }
            }
        } catch (err) {
            console.error('Erro ao enviar notificações:', err);
        }
    };

    // ─── Validações de negócio (antes do upload) ──────────────────────────────
    // MODIFICADO: Agora verifica em TODOS os eventos, não apenas do mesmo organizador

    const validarEvento = async (): Promise<string | null> => {
        // 1. Data no passado
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        const dataEvento = new Date(formData.data_evento + 'T00:00:00');
        if (dataEvento < hoje) {
            return 'A data do evento não pode ser anterior à data de hoje.';
        }

        // 2. Verificar nome duplicado em TODOS os eventos (não cancelados)
        const nomeTrimmed = formData.nome_evento.trim();
        if (nomeTrimmed) {
            const { data: comMesmoNome, error: erroNome } = await supabase
                .from('eventos')
                .select('id, nome_evento, organizador_id, organizadores(nome)')
                .ilike('nome_evento', nomeTrimmed) // case-insensitive
                .is('deleted_at', null)
                .limit(1);

            if (erroNome) {
                console.error('Erro ao verificar nome duplicado:', erroNome);
            } else if (comMesmoNome && comMesmoNome.length > 0) {
                const eventoExistente = comMesmoNome[0];
                const organizadorNome = (eventoExistente.organizadores as any)?.nome || 'outro organizador';
                return `❌ Já existe um evento com o nome "${nomeTrimmed}" (criado por ${organizadorNome}). Por favor, escolha um nome diferente.`;
            }
        }

        // 3. Verificar descrição duplicada em TODOS os eventos (se preenchida)
        const descricaoTrimmed = formData.descricao.trim();
        if (descricaoTrimmed) {
            const { data: comMesmaDesc, error: erroDesc } = await supabase
                .from('eventos')
                .select('id, nome_evento, organizador_id, organizadores(nome)')
                .eq('descricao', descricaoTrimmed)
                .is('deleted_at', null)
                .limit(1);

            if (erroDesc) {
                console.error('Erro ao verificar descrição duplicada:', erroDesc);
            } else if (comMesmaDesc && comMesmaDesc.length > 0) {
                const eventoExistente = comMesmaDesc[0];
                const organizadorNome = (eventoExistente.organizadores as any)?.nome || 'outro organizador';
                return `❌ A descrição inserida já está a ser utilizada no evento "${eventoExistente.nome_evento}" (criado por ${organizadorNome}). Por favor, escreva uma descrição única.`;
            }
        }

        return null; // tudo OK
    };

    // ─── Submit ───────────────────────────────────────────────────────────────

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) { setError('Usuário não autenticado'); return; }

        // Validações de campos obrigatórios
        if (!formData.nome_evento.trim()) { setError('O nome do evento é obrigatório'); return; }
        if (!formData.data_evento) { setError('A data do evento é obrigatória'); return; }
        if (!formData.hora_inicio) { setError('A hora de início é obrigatória'); return; }
        if (!imageFile) { setError('A imagem do evento é obrigatória'); return; }
        if (formData.tipo_evento !== 'online' && !formData.local.trim()) {
            setError('O local é obrigatório para eventos presenciais ou híbridos'); return;
        }
        if (formData.hora_termino && formData.hora_termino <= formData.hora_inicio) {
            setError('A hora de término deve ser posterior à hora de início'); return;
        }
        if (formData.tipo_evento !== 'online' && !documentoFile) {
            setError('É obrigatório anexar um contrato de aluguer ou carta de autorização do espaço');
            return;
        }
        if (isPaidEvent) {
            const ok = estacoes.every(e => e.nome.trim() && e.quantidade > 0 && e.preco > 0);
            if (!ok) { setError('Preencha corretamente todas as estações (nome, quantidade e preço)'); return; }
        }

        setIsLoading(true);
        setError(null);

        // ── Validações de negócio (data passada / duplicados GLOBAIS) ──
        const erroNegocio = await validarEvento();
        if (erroNegocio) {
            setError(erroNegocio);
            setIsLoading(false);
            return;
        }

        try {
            // Uploads em paralelo (só depois de passar todas as validações)
            const [imageUrl, videoUrl, documentoUrl] = await Promise.all([
                uploadFile(imageFile, 'event-images'),
                videoFile ? uploadFile(videoFile, 'event-videos') : Promise.resolve(null),
                documentoFile ? uploadFile(documentoFile, 'event-documents') : Promise.resolve(null),
            ]);

            if (!imageUrl) throw new Error('Erro ao fazer upload da imagem');
            if (documentoFile && !documentoUrl) throw new Error('Erro ao fazer upload do documento de autorização');

            const estacoesJSON = isPaidEvent ? estacoes.map(({ id, ...rest }) => rest) : [];

            const eventData: Record<string, any> = {
                organizador_id: user.id,
                nome_evento: formData.nome_evento,
                categoria: formData.categoria,
                data_evento: formData.data_evento,
                hora_evento: formData.hora_inicio,
                hora_termino: formData.hora_termino || null,
                tipo_evento: formData.tipo_evento,
                local: formData.local || null,
                descricao: formData.descricao || null,
                contacto_whatsapp: formData.contacto_whatsapp || null,
                imagem_url: imageUrl,
                video_url: videoUrl,
                estacoes: estacoesJSON,
                valor: isPaidEvent ? (estacoesJSON[0]?.preco ?? 0) : 0,
                status_aprovacao: 'pendente',
                documento_autorizacao_url: documentoUrl,
                documento_autorizacao_tipo: documentoFile ? tipoDocumento : null,
                documento_autorizacao_nome: documentoFile ? documentoFile.name : null,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            };

            const { data: newEvent, error: insertError } = await supabase
                .from('eventos')
                .insert([eventData])
                .select()
                .single();

            if (insertError) throw new Error('Erro ao salvar evento: ' + insertError.message);

            if (seguidoresCount > 0) await enviarNotificacoes(newEvent.id, newEvent.nome_evento);

            const { data: admins } = await supabase
                .from('administradores')
                .select('id')
                .is('deleted_at', null);

            for (const admin of admins || []) {
                await supabase.from('notificacoes').insert({
                    usuario_id: admin.id,
                    tipo_usuario: 'organizer',
                    titulo: '🔔 Novo evento aguarda aprovação',
                    mensagem: `O organizador ${user.name} submeteu o evento "${newEvent.nome_evento}" para revisão.`,
                    tipo: 'evento_pendente'
                });
            }

            setEventoCriado(true);

        } catch (err: any) {
            console.error('Erro ao criar evento:', err);
            setError(err.message || 'Ocorreu um erro ao criar o evento');
        } finally {
            setIsLoading(false);
        }
    };

    // ─── Ecrã de sucesso ─────────────────────────────────────────────────────

    if (eventoCriado) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 sm:p-6">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl p-6 sm:p-8 md:p-10 max-w-lg w-full text-center mx-4"
                >
                    <div className="w-16 h-16 sm:w-20 sm:h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
                        <Clock className="w-8 h-8 sm:w-10 sm:h-10 text-orange-500" />
                    </div>
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2 sm:mb-3">Evento Submetido!</h2>
                    <p className="text-sm sm:text-base text-gray-500 mb-2">
                        O seu evento foi enviado com sucesso e está a aguardar revisão pela nossa equipa de administração.
                    </p>
                    <p className="text-xs sm:text-sm text-orange-600 font-medium mb-6 sm:mb-8">
                        Receberá uma notificação assim que o evento for aprovado ou caso sejam necessárias correções.
                    </p>

                    <div className="flex flex-col gap-3">
                        <div className="flex items-center gap-3 bg-orange-50 rounded-xl p-3 sm:p-4 text-left">
                            <CheckCircle className="w-5 h-5 text-orange-500 flex-shrink-0" />
                            <span className="text-xs sm:text-sm text-gray-700">Documento de autorização recebido</span>
                        </div>
                        <div className="flex items-center gap-3 bg-orange-50 rounded-xl p-3 sm:p-4 text-left">
                            <Clock className="w-5 h-5 text-orange-400 flex-shrink-0" />
                            <span className="text-xs sm:text-sm text-gray-700">Em análise pelo administrador</span>
                        </div>
                    </div>

                    <button
                        onClick={() => navigate('/events')}
                        className="mt-6 sm:mt-8 w-full py-2.5 sm:py-3 bg-orange-600 text-white font-semibold rounded-xl hover:bg-orange-700 transition-colors text-sm sm:text-base"
                    >
                        Voltar aos Eventos
                    </button>
                </motion.div>
            </div>
        );
    }

    // ─── Loading guard ────────────────────────────────────────────────────────

    if (!user) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center px-4">
                    <div className="w-12 h-12 sm:w-16 sm:h-16 border-4 border-orange-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-sm sm:text-base text-gray-600">Verificando autenticação...</p>
                </div>
            </div>
        );
    }

    // ─── Render ───────────────────────────────────────────────────────────────

    const categories = [
        { value: 'palestra', label: 'Palestra' },
        { value: 'workshop', label: 'Workshop' },
        { value: 'feiras', label: 'Feira' },
        { value: 'masterclasse', label: 'Masterclasse' },
    ];

    const eventTypes = [
        { value: 'presencial', label: 'Presencial' },
        { value: 'online', label: 'Online' },
        { value: 'hibrido', label: 'Híbrido' },
    ];

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    // Data mínima para o input de data (hoje)
    const hoje = new Date();
    const dataMinima = hoje.toISOString().split('T')[0];

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header Responsivo */}
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

            <main className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8">
                {/* Banner Responsivo */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="relative overflow-hidden bg-gradient-to-br from-orange-600 via-orange-500 to-red-600 rounded-2xl sm:rounded-3xl shadow-2xl p-4 sm:p-6 md:p-8 text-white mb-6 sm:mb-8"
                >
                    <div className="absolute top-0 right-0 w-48 h-48 sm:w-64 sm:h-64 md:w-96 md:h-96 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                    <div className="absolute bottom-0 left-0 w-32 h-32 sm:w-48 sm:h-48 md:w-64 md:h-64 bg-black/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
                    <div className="relative z-10">
                        <p className="text-orange-100 text-xs sm:text-sm font-medium mb-2 uppercase tracking-wider">Área de Eventos</p>
                        <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-2">Criar Novo Evento</h1>
                        {seguidoresCount > 0 && (
                            <div className="flex items-center gap-2 mt-3 sm:mt-4 bg-white/20 backdrop-blur-sm rounded-full px-3 py-1.5 sm:px-4 sm:py-2 w-fit">
                                <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
                                <span className="text-xs sm:text-sm font-medium">
                                    {seguidoresCount} {seguidoresCount === 1 ? 'seguidor será notificado' : 'seguidores serão notificados'}
                                </span>
                            </div>
                        )}
                    </div>
                </motion.div>

                {/* Aviso de aprovação responsivo */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="flex items-start gap-3 sm:gap-4 bg-amber-50 border border-amber-200 rounded-xl sm:rounded-2xl p-3 sm:p-4 md:p-5 mb-4 sm:mb-6"
                >
                    <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6 text-amber-500 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="font-semibold text-amber-800 mb-1 text-sm sm:text-base">Aprovação necessária</p>
                        <p className="text-xs sm:text-sm text-amber-700">
                            Após a submissão, o evento ficará <strong>pendente de aprovação</strong> pela administração antes de ser publicado na plataforma.
                            Para acelerar o processo, certifique-se de que o documento de autorização é legível e válido.
                        </p>
                    </div>
                </motion.div>

                {/* NOVO AVISO SOBRE NOMES E DESCRIÇÕES ÚNICAS */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    className="flex items-start gap-3 sm:gap-4 bg-blue-50 border border-blue-200 rounded-xl sm:rounded-2xl p-3 sm:p-4 md:p-5 mb-4 sm:mb-6"
                >
                    <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6 text-blue-500 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="font-semibold text-blue-800 mb-1 text-sm sm:text-base">Prevenção de Duplicidade</p>
                        <p className="text-xs sm:text-sm text-blue-700">
                            Para manter a qualidade do catálogo, <strong>nomes e descrições de eventos devem ser únicos</strong> em toda a plataforma.
                            Verificamos automaticamente se já existe outro evento (de qualquer organizador) com o mesmo nome ou descrição.
                        </p>
                    </div>
                </motion.div>

                <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
                    {/* Erro responsivo */}
                    {error && (
                        <motion.div
                            initial={{ opacity: 0, y: -8 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-red-50 border border-red-200 rounded-lg p-3 sm:p-4 flex items-start gap-2 sm:gap-3"
                        >
                            <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-500 flex-shrink-0 mt-0.5" />
                            <p className="text-red-600 text-xs sm:text-sm">{error}</p>
                        </motion.div>
                    )}

                    {/* ── Informações Básicas ── */}
                    <div className="bg-white rounded-xl shadow-md p-4 sm:p-6">
                        <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">Informações Básicas</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Nome do Evento *</label>
                                <input
                                    type="text" name="nome_evento" value={formData.nome_evento}
                                    onChange={handleInputChange} required
                                    className="w-full px-3 py-2 sm:px-4 sm:py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                                    placeholder="Ex: Workshop de Marketing Digital"
                                />
                                <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                                    <AlertCircle className="w-3 h-3" />
                                    Este nome será verificado em toda a plataforma e não pode ser igual ao de outro evento (de qualquer organizador)
                                </p>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Data *</label>
                                    <input
                                        type="date"
                                        name="data_evento"
                                        value={formData.data_evento}
                                        onChange={handleInputChange}
                                        required
                                        min={dataMinima}
                                        className="w-full px-3 py-2 sm:px-4 sm:py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                                    />
                                    <p className="text-xs text-gray-400 mt-1">Datas anteriores a hoje não são permitidas</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Hora de Início *</label>
                                    <input
                                        type="time" name="hora_inicio" value={formData.hora_inicio}
                                        onChange={handleInputChange} required
                                        className="w-full px-3 py-2 sm:px-4 sm:py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Categoria</label>
                                    <select name="categoria" value={formData.categoria} onChange={handleInputChange} required
                                        className="w-full px-3 py-2 sm:px-4 sm:py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none">
                                        {categories.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Evento</label>
                                    <select name="tipo_evento" value={formData.tipo_evento} onChange={handleInputChange} required
                                        className="w-full px-3 py-2 sm:px-4 sm:py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none">
                                        {eventTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Hora de Término <span className="text-gray-400">(opcional)</span></label>
                                    <input
                                        type="time" name="hora_termino" value={formData.hora_termino}
                                        onChange={handleInputChange}
                                        className="w-full px-3 py-2 sm:px-4 sm:py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">Deixe em branco se não houver hora definida</p>
                                </div>
                            </div>

                            {(formData.tipo_evento === 'presencial' || formData.tipo_evento === 'hibrido') && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Local do Evento *</label>
                                    <input
                                        type="text" name="local" value={formData.local}
                                        onChange={handleInputChange} required
                                        className="w-full px-3 py-2 sm:px-4 sm:py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                                        placeholder="Ex: Centro de Convenções de Luanda"
                                    />
                                </div>
                            )}

                            {formData.tipo_evento === 'online' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Link do Evento</label>
                                    <input
                                        type="url" name="local" value={formData.local}
                                        onChange={handleInputChange}
                                        className="w-full px-3 py-2 sm:px-4 sm:py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                                        placeholder="https://zoom.us/j/..."
                                    />
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Contacto WhatsApp</label>
                                <input
                                    type="text" name="contacto_whatsapp" value={formData.contacto_whatsapp}
                                    onChange={handleInputChange}
                                    className="w-full px-3 py-2 sm:px-4 sm:py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                                    placeholder="Ex: 244900000000"
                                />
                                <p className="text-xs text-gray-500 mt-1">Número para contacto no WhatsApp (incluindo código do país)</p>
                            </div>
                        </div>
                    </div>

                    {/* ── Descrição ── */}
                    <div className="bg-white rounded-xl shadow-md p-4 sm:p-6">
                        <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">Descrição</h2>
                        <textarea
                            name="descricao" value={formData.descricao} onChange={handleInputChange} rows={5}
                            className="w-full px-3 py-2 sm:px-4 sm:py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                            placeholder="Descreva os detalhes do evento, programação, palestrantes, etc."
                        />
                        <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            A descrição deve ser única em toda a plataforma — não pode ser igual à descrição de nenhum outro evento (de qualquer organizador)
                        </p>
                    </div>

                    {/* ── Documento de Autorização ── */}
                    {formData.tipo_evento !== 'online' && (
                        <div className="bg-white rounded-xl shadow-md p-4 sm:p-6">
                            <div className="flex items-center gap-2 mb-1">
                                <FileText className="w-5 h-5 text-orange-600" />
                                <h2 className="text-base sm:text-lg font-semibold text-gray-900">Documento de Autorização *</h2>
                            </div>
                            <p className="text-xs sm:text-sm text-gray-500 mb-4 sm:mb-5">
                                Para validar a reserva do espaço, anexe um dos documentos abaixo. O ficheiro será analisado pela administração antes da publicação do evento.
                            </p>

                            <div className="flex flex-col sm:flex-row gap-3 mb-5">
                                <button
                                    type="button"
                                    onClick={() => setTipoDocumento('contrato_aluguer')}
                                    className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border-2 font-medium text-sm transition-all cursor-pointer
                                        ${tipoDocumento === 'contrato_aluguer'
                                            ? 'border-orange-500 bg-orange-50 text-orange-700'
                                            : 'border-gray-200 text-gray-600 hover:border-orange-300'}`}
                                >
                                    <FileText className="w-4 h-4" />
                                    Contrato de Aluguer
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setTipoDocumento('carta_autorizacao')}
                                    className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border-2 font-medium text-sm transition-all cursor-pointer
                                        ${tipoDocumento === 'carta_autorizacao'
                                            ? 'border-orange-500 bg-orange-50 text-orange-700'
                                            : 'border-gray-200 text-gray-600 hover:border-orange-300'}`}
                                >
                                    <FileText className="w-4 h-4" />
                                    Carta de Autorização
                                </button>
                            </div>

                            {!documentoFile ? (
                                <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 sm:p-8 text-center hover:border-orange-400 transition-colors bg-gray-50">
                                    <input
                                        type="file"
                                        accept=".pdf,.jpg,.jpeg,.png"
                                        onChange={handleDocumentoChange}
                                        className="hidden"
                                        id="documento-upload"
                                    />
                                    <label htmlFor="documento-upload" className="cursor-pointer flex flex-col items-center gap-3">
                                        <div className="w-12 h-12 sm:w-14 sm:h-14 bg-orange-100 rounded-full flex items-center justify-center">
                                            <Upload className="w-6 h-6 sm:w-7 sm:h-7 text-orange-500" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-700 text-sm sm:text-base mb-1">
                                                {tipoDocumento === 'contrato_aluguer'
                                                    ? 'Clique para anexar o Contrato de Aluguer'
                                                    : 'Clique para anexar a Carta de Autorização'}
                                            </p>
                                            <p className="text-xs text-gray-500">PDF, JPG ou PNG · máx. 10 MB</p>
                                        </div>
                                    </label>
                                </div>
                            ) : (
                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 sm:p-4 bg-orange-50 border border-orange-200 rounded-xl gap-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                            <FileText className="w-5 h-5 text-orange-600" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-gray-800 break-all">{documentoFile.name}</p>
                                            <p className="text-xs text-gray-500">
                                                {tipoDocumento === 'contrato_aluguer' ? 'Contrato de Aluguer' : 'Carta de Autorização'}
                                                {' · '}{(documentoFile.size / 1024 / 1024).toFixed(2)} MB
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setDocumentoFile(null)}
                                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            )}

                            <p className="text-xs text-gray-400 mt-3 flex items-center gap-1">
                                <AlertCircle className="w-3.5 h-3.5" />
                                Este documento será utilizado apenas para validação interna e não será exibido publicamente.
                            </p>
                        </div>
                    )}

                    {/* ── Ingressos Responsivo ── */}
                    <div className="bg-white rounded-xl shadow-md p-4 sm:p-6">
                        <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">Configuração de Ingressos</h2>

                        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-6">
                            <button type="button" onClick={() => setIsPaidEvent(false)}
                                className={`flex-1 py-3 px-4 rounded-xl cursor-pointer font-semibold transition-all text-sm sm:text-base ${!isPaidEvent ? 'bg-orange-600 text-white shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                                🎟️ Evento Gratuito
                            </button>
                            <button type="button" onClick={() => setIsPaidEvent(true)}
                                className={`flex-1 py-3 px-4 rounded-xl cursor-pointer font-semibold transition-all text-sm sm:text-base ${isPaidEvent ? 'bg-orange-600 text-white shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                                💰 Evento Pago
                            </button>
                        </div>

                        {isPaidEvent ? (
                            <div className="border border-orange-200 rounded-lg p-3 sm:p-4 bg-orange-50/30">
                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
                                    <div className="flex items-center gap-2">
                                        <Ticket className="w-5 h-5 text-orange-600" />
                                        <span className="font-medium text-gray-700">Tipos de ingresso</span>
                                    </div>
                                    <button type="button" onClick={adicionarEstacao}
                                        className="flex items-center justify-center gap-2 px-3 py-1.5 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm w-full sm:w-auto">
                                        <Plus className="w-4 h-4" /> Adicionar
                                    </button>
                                </div>

                                <div className="space-y-4">
                                    {estacoes.map((estacao, index) => (
                                        <div key={estacao.id} className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4">
                                            <div className="flex items-center justify-between mb-4">
                                                <h3 className="font-semibold text-gray-900 text-sm sm:text-base">Ingresso {index + 1}</h3>
                                                {estacoes.length > 1 && (
                                                    <button type="button" onClick={() => removerEstacao(estacao.id)} className="text-red-500 hover:text-red-700">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-4">
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-700 mb-1">Nome</label>
                                                    <input type="text" value={estacao.nome}
                                                        onChange={(e) => atualizarEstacao(estacao.id, 'nome', e.target.value)}
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none text-sm"
                                                        placeholder="Ex: VIP" />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-700 mb-1">Quantidade</label>
                                                    <input type="number" value={estacao.quantidade} min="1"
                                                        onChange={(e) => atualizarEstacao(estacao.id, 'quantidade', parseInt(e.target.value) || 0)}
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none text-sm" />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-700 mb-1">Preço (Kz)</label>
                                                    <input type="number" value={estacao.preco} min="1"
                                                        onChange={(e) => atualizarEstacao(estacao.id, 'preco', parseInt(e.target.value) || 0)}
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none text-sm" />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-gray-700 mb-2">Vantagens</label>
                                                <div className="flex flex-wrap gap-2 mb-2">
                                                    {estacao.vantagens.map((v, idx) => (
                                                        <span key={idx} className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 rounded-lg text-xs">
                                                            {v}
                                                            <button type="button" onClick={() => removerVantagem(estacao.id, idx)} className="text-gray-400 hover:text-red-500">
                                                                <X className="w-3 h-3" />
                                                            </button>
                                                        </span>
                                                    ))}
                                                </div>
                                                <div className="flex flex-col sm:flex-row gap-2">
                                                    <input type="text" value={vantagemInput[estacao.id] || ''}
                                                        onChange={(e) => setVantagemInput(prev => ({ ...prev, [estacao.id]: e.target.value }))}
                                                        onKeyPress={(e) => e.key === 'Enter' && adicionarVantagem(estacao.id)}
                                                        placeholder="Adicionar vantagem..."
                                                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none text-sm" />
                                                    <button type="button" onClick={() => adicionarVantagem(estacao.id)}
                                                        className="px-3 py-2 bg-orange-50 text-orange-600 rounded-lg hover:bg-orange-100 transition-colors">
                                                        <Plus className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="mt-4 p-3 sm:p-4 bg-orange-50 rounded-lg flex items-center gap-2 text-sm text-gray-600">
                                    <Ticket className="w-4 h-4" />
                                    <span>Total de ingressos: <strong>{estacoes.reduce((s, e) => s + e.quantidade, 0)}</strong></span>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 sm:p-6 text-center">
                                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                                    <img src={logo} alt="Logo" className="h-8 sm:h-10 w-auto object-contain" />
                                </div>
                                <h3 className="text-base sm:text-lg font-semibold text-orange-800 mb-2">Evento Gratuito</h3>
                                <p className="text-xs sm:text-sm text-orange-600">Não é necessário configurar ingressos gratuitos.</p>
                            </div>
                        )}
                    </div>

                    {/* ── Arquivos do Evento Responsivo ── */}
                    <div className="bg-white rounded-xl shadow-md p-4 sm:p-6">
                        <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">Arquivos do Evento</h2>
                        <div className="space-y-6">
                            {/* Imagem */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Imagem do Evento * (máx. 5 MB)</label>
                                {!imageFile ? (
                                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 sm:p-6 text-center hover:border-orange-500 transition-colors">
                                        <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" id="image-upload" />
                                        <label htmlFor="image-upload" className="cursor-pointer flex flex-col items-center gap-2">
                                            <Image className="w-8 h-8 text-gray-400" />
                                            <span className="text-xs sm:text-sm text-gray-600">Clique para selecionar uma imagem</span>
                                            <span className="text-xs text-gray-500">PNG, JPG, JPEG</span>
                                        </label>
                                    </div>
                                ) : (
                                    <div className="relative">
                                        <img src={imagePreview!} alt="Preview" className="w-full h-40 sm:h-48 object-cover rounded-lg" />
                                        <button type="button" onClick={() => { setImageFile(null); setImagePreview(null); }}
                                            className="absolute top-2 right-2 p-1 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors">
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Vídeo */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Vídeo Promocional <span className="text-gray-400">(opcional)</span></label>
                                {!videoFile ? (
                                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 sm:p-6 text-center hover:border-orange-500 transition-colors">
                                        <input type="file" accept="video/*" onChange={handleVideoChange} className="hidden" id="video-upload" />
                                        <label htmlFor="video-upload" className="cursor-pointer flex flex-col items-center gap-2">
                                            <Video className="w-8 h-8 text-gray-400" />
                                            <span className="text-xs sm:text-sm text-gray-600">Clique para selecionar um vídeo</span>
                                            <span className="text-xs text-gray-500">MP4, WebM · máx. 50 MB</span>
                                        </label>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                        <div className="flex items-center gap-2">
                                            <Video className="w-5 h-5 text-orange-600" />
                                            <span className="text-sm text-gray-700 truncate">{videoFile.name}</span>
                                        </div>
                                        <button type="button" onClick={() => setVideoFile(null)} className="p-1 text-red-600 hover:text-red-700">
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* ── Botões Responsivos ── */}
                    <div className="flex flex-col sm:flex-row justify-end gap-3 sm:gap-4 pb-6 sm:pb-8">
                        <button type="button" onClick={() => navigate(-1)}
                            className="order-2 sm:order-1 px-4 sm:px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors text-sm sm:text-base">
                            Cancelar
                        </button>
                        <button type="submit" disabled={isLoading}
                            className="order-1 sm:order-2 px-4 sm:px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm sm:text-base">
                            {isLoading ? (
                                <><Loader2 className="w-4 h-4 animate-spin" /> A validar e submeter...</>
                            ) : (
                                <><Upload className="w-4 h-4" /> Submeter para Aprovação</>
                            )}
                        </button>
                    </div>
                </form>
            </main>
        </div>
    );
}