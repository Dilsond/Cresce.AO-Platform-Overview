import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload, X, Image, Video, Loader2, Heart, Bell, Plus, Trash2, Ticket, DollarSign, Users, Clock, Calendar as CalendarIcon, MapPin, Building2, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../lib/supabase';
import { emailService } from '../services/emailService';
import { showLocalNotification } from '../lib/pushNotifications';
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

export function CreateEvent() {
    const navigate = useNavigate();
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [seguidoresCount, setSeguidoresCount] = useState(0);
    const [notificacaoEnviada, setNotificacaoEnviada] = useState(false);

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

    // Tipo de evento (pago ou gratuito)
    const [isPaidEvent, setIsPaidEvent] = useState(false);

    // Estações (ingressos) - só aparece se for evento pago
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

    // File states
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [videoFile, setVideoFile] = useState<File | null>(null);
    const [uploadProgress, setUploadProgress] = useState(0);

    // Buscar número de seguidores
    useEffect(() => {
        if (user) {
            fetchSeguidoresCount();
        }
    }, [user]);

    const fetchSeguidoresCount = async () => {
        if (!user) return;

        try {
            const { count, error } = await supabase
                .from('favoritos_organizadores')
                .select('*', { count: 'exact', head: true })
                .eq('organizador_favoritado_id', user.id);

            if (!error && count !== null) {
                setSeguidoresCount(count);
            }
        } catch (err) {
            console.error('Erro ao buscar seguidores:', err);
        }
    };

    // Verificar usuário logado
    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            try {
                const parsedUser = JSON.parse(storedUser);
                if (parsedUser.type !== 'organizer') {
                    setError('Apenas organizadores podem criar eventos');
                    setTimeout(() => navigate('/events'), 3000);
                    return;
                }
                setUser(parsedUser);
            } catch (err) {
                console.error('Erro ao parsear usuário:', err);
                setError('Erro ao carregar dados do usuário');
                navigate('/login');
            }
        } else {
            navigate('/login');
        }
    }, [navigate]);

    // Funções para gerenciar estações
    const adicionarEstacao = () => {
        setEstacoes([
            ...estacoes,
            {
                id: crypto.randomUUID(),
                nome: `Estação ${estacoes.length + 1}`,
                quantidade: 50,
                preco: 0,
                vantagens: []
            }
        ]);
    };

    const removerEstacao = (id: string) => {
        if (estacoes.length === 1) {
            setError('É necessário ter pelo menos uma estação');
            return;
        }
        setEstacoes(estacoes.filter(e => e.id !== id));
    };

    const atualizarEstacao = (id: string, campo: keyof Estacao, valor: any) => {
        setEstacoes(estacoes.map(e =>
            e.id === id ? { ...e, [campo]: valor } : e
        ));
    };

    const adicionarVantagem = (estacaoId: string) => {
        const input = vantagemInput[estacaoId];
        if (!input?.trim()) return;

        setEstacoes(estacoes.map(e =>
            e.id === estacaoId
                ? { ...e, vantagens: [...e.vantagens, input.trim()] }
                : e
        ));

        setVantagemInput({ ...vantagemInput, [estacaoId]: '' });
    };

    const removerVantagem = (estacaoId: string, index: number) => {
        setEstacoes(estacoes.map(e =>
            e.id === estacaoId
                ? { ...e, vantagens: e.vantagens.filter((_, i) => i !== index) }
                : e
        ));
    };

    const categories = [
        { value: 'palestra', label: 'Palestra' },
        { value: 'workshop', label: 'Workshop' },
        { value: 'feiras', label: 'Feira' },
        { value: 'masterclasse', label: 'Masterclasse' }
    ];

    const eventTypes = [
        { value: 'presencial', label: 'Presencial' },
        { value: 'online', label: 'Online' },
        { value: 'hibrido', label: 'Híbrido' }
    ];

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (!file.type.startsWith('image/')) {
                setError('Por favor, selecione uma imagem válida');
                return;
            }
            setImageFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
            setError(null);
        }
    };

    const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (!file.type.startsWith('video/')) {
                setError('Por favor, selecione um vídeo válido');
                return;
            }
            setVideoFile(file);
            setError(null);
        }
    };

    const removeImage = () => {
        setImageFile(null);
        setImagePreview(null);
    };

    const removeVideo = () => {
        setVideoFile(null);
    };

    const uploadFile = async (file: File, bucket: string): Promise<string | null> => {
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
            const filePath = fileName;

            const { error: uploadError } = await supabase.storage
                .from(bucket)
                .upload(filePath, file, {
                    cacheControl: '3600',
                    upsert: false
                });

            if (uploadError) {
                console.error(`Erro ao fazer upload para ${bucket}:`, uploadError);
                throw uploadError;
            }

            const { data: { publicUrl } } = supabase.storage
                .from(bucket)
                .getPublicUrl(filePath);

            return publicUrl;
        } catch (err) {
            console.error('Erro no upload:', err);
            return null;
        }
    };

    const enviarNotificacoes = async (eventoId: string, eventoNome: string) => {
        try {
            const { data: seguidores, error } = await supabase
                .from('favoritos_organizadores')
                .select(`
                    usuario_normal_id,
                    usuarios_normais (
                        nome_completo,
                        email
                    )
                `)
                .eq('organizador_favoritado_id', user!.id);

            if (error) throw error;

            for (const seguidor of seguidores || []) {
                const seguidorData = seguidor.usuarios_normais;
                if (!seguidorData) continue;

                await supabase
                    .from('notificacoes')
                    .insert({
                        usuario_id: seguidor.usuario_normal_id,
                        tipo_usuario: 'user',
                        titulo: '📢 Novo Evento!',
                        mensagem: `${user?.name} criou um novo evento: ${eventoNome}`,
                        tipo: 'novo_evento'
                    });

                try {
                    await emailService.sendNotification({
                        to_email: seguidorData.email,
                        to_name: seguidorData.nome_completo,
                        assunto: `📢 Novo Evento: ${eventoNome}`,
                        titulo: 'Novo Evento Disponível!',
                        mensagem: `${user?.name} acabou de criar um novo evento: ${eventoNome}. Não perca!`
                    });
                } catch (emailErr) {
                    console.error('Erro ao enviar email:', emailErr);
                }
            }

            setNotificacaoEnviada(true);
        } catch (err) {
            console.error('Erro ao enviar notificações:', err);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!user) {
            setError('Usuário não autenticado');
            return;
        }

        // Validações básicas
        if (!formData.nome_evento) {
            setError('O nome do evento é obrigatório');
            return;
        }
        if (!formData.data_evento) {
            setError('A data do evento é obrigatória');
            return;
        }
        if (!formData.hora_inicio) {
            setError('A hora de início é obrigatória');
            return;
        }
        if (!formData.local && formData.tipo_evento !== 'online') {
            setError('O local do evento é obrigatório para eventos presenciais ou híbridos');
            return;
        }
        if (!imageFile) {
            setError('A imagem do evento é obrigatória');
            return;
        }

        // Validar hora de término (se fornecida)
        if (formData.hora_termino && formData.hora_termino <= formData.hora_inicio) {
            setError('A hora de término deve ser posterior à hora de início');
            return;
        }

        // Validar estações se for evento pago
        if (isPaidEvent) {
            const estacoesValidas = estacoes.every(e =>
                e.nome.trim() &&
                e.quantidade > 0 &&
                e.preco > 0
            );
            if (!estacoesValidas) {
                setError('Preencha corretamente todas as informações das estações (nome, quantidade e preço)');
                return;
            }
        }

        setIsLoading(true);
        setError(null);

        try {
            // Upload da imagem
            const imageUrl = await uploadFile(imageFile, 'event-images');
            if (!imageUrl) throw new Error('Erro ao fazer upload da imagem');

            // Upload do vídeo (opcional)
            let videoUrl = null;
            if (videoFile) {
                videoUrl = await uploadFile(videoFile, 'event-videos');
                if (!videoUrl) throw new Error('Erro ao fazer upload do vídeo');
            }

            // Preparar estações para JSONB (apenas se for evento pago)
            const estacoesJSON = isPaidEvent ? estacoes.map(({ id, ...rest }) => rest) : [];

            // Dados do evento
            const eventData: any = {
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
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            // Adicionar estações apenas se for evento pago
            if (isPaidEvent) {
                eventData.estacoes = estacoesJSON;
                eventData.valor = estacoesJSON[0]?.preco || 0;
            } else {
                eventData.estacoes = [];
                eventData.valor = 0;
            }

            // Inserir evento no banco
            const { data: newEvent, error: insertError } = await supabase
                .from('eventos')
                .insert([eventData])
                .select()
                .single();

            if (insertError) {
                console.error('Erro ao inserir evento:', insertError);
                throw new Error('Erro ao salvar evento no banco de dados: ' + insertError.message);
            }

            // Enviar notificações para seguidores
            if (seguidoresCount > 0) {
                await enviarNotificacoes(newEvent.id, newEvent.nome_evento);
            }

            // Redirecionar para a página do evento
            navigate(`/event/${newEvent.id}`);

        } catch (err: any) {
            console.error('Erro ao criar evento:', err);
            setError(err.message || 'Ocorreu um erro ao criar o evento');
        } finally {
            setIsLoading(false);
        }
    };

    if (!user) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-orange-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-600">Verificando autenticação...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white/80 backdrop-blur-md shadow-sm border-b border-gray-200/50 sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
                    <button
                        onClick={() => navigate(-1)}
                        className="flex items-center gap-2 text-gray-600 cursor-pointer hover:text-orange-600 transition-all group"
                    >
                        <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                        <span className="font-medium">Voltar</span>
                    </button>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Banner */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="relative overflow-hidden bg-gradient-to-br from-orange-600 via-orange-500 to-red-600 rounded-3xl shadow-2xl p-8 text-white mb-8"
                >
                    <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-black/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
                    <div className="relative z-10">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-orange-100 text-sm font-medium mb-2 uppercase tracking-wider">Área de Eventos</p>
                                <h1 className="text-4xl md:text-5xl font-bold mb-2">Criar Novo Evento</h1>
                                {seguidoresCount > 0 && (
                                    <div className="flex items-center gap-2 mt-4 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 w-fit">
                                        <Bell className="w-5 h-5" />
                                        <span className="text-sm font-medium">
                                            {seguidoresCount} {seguidoresCount === 1 ? 'seguidor' : 'seguidores'} serão notificados
                                        </span>
                                    </div>
                                )}
                            </div>
                            {notificacaoEnviada && (
                                <div className="bg-green-500/80 backdrop-blur-sm rounded-xl px-4 py-2">
                                    <span className="text-sm font-medium">✅ Notificações enviadas!</span>
                                </div>
                            )}
                        </div>
                    </div>
                </motion.div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Mensagem de erro */}
                    {error && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                            <p className="text-red-600 text-sm">{error}</p>
                        </div>
                    )}

                    {/* Informações Básicas */}
                    <div className="bg-white rounded-xl shadow-md p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Informações Básicas</h2>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Nome do Evento *
                                </label>
                                <input
                                    type="text"
                                    name="nome_evento"
                                    value={formData.nome_evento}
                                    onChange={handleInputChange}
                                    required
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                                    placeholder="Ex: Workshop de Marketing Digital"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Data *
                                    </label>
                                    <input
                                        type="date"
                                        name="data_evento"
                                        value={formData.data_evento}
                                        onChange={handleInputChange}
                                        required
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Hora de Início *
                                    </label>
                                    <input
                                        type="time"
                                        name="hora_inicio"
                                        value={formData.hora_inicio}
                                        onChange={handleInputChange}
                                        required
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Hora de Término (opcional)
                                    </label>
                                    <input
                                        type="time"
                                        name="hora_termino"
                                        value={formData.hora_termino}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">Deixe em branco se não houver hora definida</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Categoria
                                    </label>
                                    <select
                                        name="categoria"
                                        value={formData.categoria}
                                        onChange={handleInputChange}
                                        required
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                                    >
                                        {categories.map(cat => (
                                            <option key={cat.value} value={cat.value}>
                                                {cat.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Tipo de Evento
                                    </label>
                                    <select
                                        name="tipo_evento"
                                        value={formData.tipo_evento}
                                        onChange={handleInputChange}
                                        required
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                                    >
                                        {eventTypes.map(type => (
                                            <option key={type.value} value={type.value}>
                                                {type.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {(formData.tipo_evento === 'presencial' || formData.tipo_evento === 'hibrido') && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Local do Evento *
                                    </label>
                                    <input
                                        type="text"
                                        name="local"
                                        value={formData.local}
                                        onChange={handleInputChange}
                                        required
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                                        placeholder="Ex: Centro de Convenções de Luanda"
                                    />
                                </div>
                            )}

                            {formData.tipo_evento === 'online' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Link do Evento
                                    </label>
                                    <input
                                        type="url"
                                        name="local"
                                        value={formData.local}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                                        placeholder="https://zoom.us/j/..."
                                    />
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Contacto WhatsApp
                                </label>
                                <input
                                    type="text"
                                    name="contacto_whatsapp"
                                    value={formData.contacto_whatsapp}
                                    onChange={handleInputChange}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                                    placeholder="Ex: 244900000000"
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    Número para contato no WhatsApp (incluindo código do país)
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Descrição */}
                    <div className="bg-white rounded-xl shadow-md p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Descrição</h2>
                        <textarea
                            name="descricao"
                            value={formData.descricao}
                            onChange={handleInputChange}
                            rows={5}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                            placeholder="Descreva os detalhes do evento, programação, palestrantes, etc."
                        />
                    </div>

                    {/* Tipo de Evento (Pago/Gratuito) */}
                    <div className="bg-white rounded-xl shadow-md p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Configuração de Ingressos</h2>

                        <div className="flex gap-4 mb-6">
                            <button
                                type="button"
                                onClick={() => setIsPaidEvent(false)}
                                className={`flex-1 py-3 px-4 rounded-xl cursor-pointer font-semibold transition-all ${!isPaidEvent
                                        ? 'bg-orange-600 text-white shadow-md'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                            >
                                🎟️ Evento Gratuito
                            </button>
                            <button
                                type="button"
                                onClick={() => setIsPaidEvent(true)}
                                className={`flex-1 py-3 px-4 rounded-xl cursor-pointer font-semibold transition-all ${isPaidEvent
                                        ? 'bg-orange-600 text-white shadow-md'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                            >
                                💰 Evento Pago
                            </button>
                        </div>

                        {isPaidEvent ? (
                            <div className="border border-orange-200 rounded-lg p-4 bg-orange-50/30">
                                <div className="flex items-center gap-2 mb-4">
                                    <Ticket className="w-5 h-5 text-orange-600" />
                                    <span className="font-medium text-gray-700">Configure os tipos de ingresso</span>
                                </div>

                                <div className="flex justify-end mb-4">
                                    <button
                                        type="button"
                                        onClick={adicionarEstacao}
                                        className="flex items-center gap-2 px-3 py-1.5 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm"
                                    >
                                        <Plus className="w-4 h-4" />
                                        Adicionar Tipo de Ingresso
                                    </button>
                                </div>

                                <div className="space-y-4">
                                    {estacoes.map((estacao, index) => (
                                        <div key={estacao.id} className="bg-white border border-gray-200 rounded-lg p-4">
                                            <div className="flex items-center justify-between mb-4">
                                                <h3 className="font-semibold text-gray-900">Ingresso {index + 1}</h3>
                                                {estacoes.length > 1 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => removerEstacao(estacao.id)}
                                                        className="text-red-500 hover:text-red-700"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>

                                            <div className="grid grid-cols-3 gap-4 mb-4">
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-700 mb-1">
                                                        Nome
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={estacao.nome}
                                                        onChange={(e) => atualizarEstacao(estacao.id, 'nome', e.target.value)}
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none text-sm"
                                                        placeholder="Ex: VIP"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-700 mb-1">
                                                        Quantidade
                                                    </label>
                                                    <input
                                                        type="number"
                                                        value={estacao.quantidade}
                                                        onChange={(e) => atualizarEstacao(estacao.id, 'quantidade', parseInt(e.target.value) || 0)}
                                                        min="1"
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none text-sm"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-700 mb-1">
                                                        Preço (Kz)
                                                    </label>
                                                    <input
                                                        type="number"
                                                        value={estacao.preco}
                                                        onChange={(e) => atualizarEstacao(estacao.id, 'preco', parseInt(e.target.value) || 0)}
                                                        min="1"
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none text-sm"
                                                    />
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-xs font-medium text-gray-700 mb-2">
                                                    Vantagens
                                                </label>
                                                <div className="flex flex-wrap gap-2 mb-2">
                                                    {estacao.vantagens.map((vantagem, idx) => (
                                                        <span
                                                            key={idx}
                                                            className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 rounded-lg text-xs"
                                                        >
                                                            {vantagem}
                                                            <button
                                                                type="button"
                                                                onClick={() => removerVantagem(estacao.id, idx)}
                                                                className="text-gray-400 hover:text-red-500"
                                                            >
                                                                <X className="w-3 h-3" />
                                                            </button>
                                                        </span>
                                                    ))}
                                                </div>
                                                <div className="flex gap-2">
                                                    <input
                                                        type="text"
                                                        value={vantagemInput[estacao.id] || ''}
                                                        onChange={(e) => setVantagemInput({ ...vantagemInput, [estacao.id]: e.target.value })}
                                                        onKeyPress={(e) => e.key === 'Enter' && adicionarVantagem(estacao.id)}
                                                        placeholder="Adicionar vantagem..."
                                                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none text-sm"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => adicionarVantagem(estacao.id)}
                                                        className="px-3 py-2 bg-orange-50 text-orange-600 rounded-lg hover:bg-orange-100 transition-colors"
                                                    >
                                                        <Plus className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="mt-4 p-4 bg-orange-50 rounded-lg">
                                    <div className="flex items-center gap-2 text-sm text-gray-600">
                                        <Ticket className="w-4 h-4" />
                                        <span>Total de ingressos disponíveis: </span>
                                        <strong>{estacoes.reduce((sum, e) => sum + e.quantidade, 0)}</strong>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-orange-50 border border-orange-200 rounded-lg p-6 text-center">
                                <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <img src={logo} alt="Cresce.AO Logo" className="h-10 w-auto object-contain" />
                                </div>
                                <h3 className="text-lg font-semibold text-orange-800 mb-2">Evento Gratuito</h3>
                                <p className="text-orange-600">
                                    Seu evento será gratuito para todos os participantes.
                                    Não será necessário configurar ingressos pagos.
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Upload de Arquivos */}
                    <div className="bg-white rounded-xl shadow-md p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Arquivos do Evento</h2>

                        <div className="space-y-6">
                            {/* Imagem */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Imagem do Evento * (máx. 5MB)
                                </label>
                                {!imageFile ? (
                                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-orange-500 transition-colors">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleImageChange}
                                            className="hidden"
                                            id="image-upload"
                                        />
                                        <label
                                            htmlFor="image-upload"
                                            className="cursor-pointer flex flex-col items-center gap-2"
                                        >
                                            <Image className="w-8 h-8 text-gray-400" />
                                            <span className="text-sm text-gray-600">
                                                Clique para selecionar uma imagem
                                            </span>
                                            <span className="text-xs text-gray-500">
                                                PNG, JPG, JPEG (máx. 5MB)
                                            </span>
                                        </label>
                                    </div>
                                ) : (
                                    <div className="relative">
                                        <img
                                            src={imagePreview!}
                                            alt="Preview"
                                            className="w-full h-48 object-cover rounded-lg"
                                        />
                                        <button
                                            type="button"
                                            onClick={removeImage}
                                            className="absolute top-2 right-2 p-1 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Vídeo */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Vídeo Promocional (opcional)
                                </label>
                                {!videoFile ? (
                                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-orange-500 transition-colors">
                                        <input
                                            type="file"
                                            accept="video/*"
                                            onChange={handleVideoChange}
                                            className="hidden"
                                            id="video-upload"
                                        />
                                        <label
                                            htmlFor="video-upload"
                                            className="cursor-pointer flex flex-col items-center gap-2"
                                        >
                                            <Video className="w-8 h-8 text-gray-400" />
                                            <span className="text-sm text-gray-600">
                                                Clique para selecionar um vídeo
                                            </span>
                                            <span className="text-xs text-gray-500">
                                                MP4, WebM, etc. (máx. 50MB)
                                            </span>
                                        </label>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                        <div className="flex items-center gap-2">
                                            <Video className="w-5 h-5 text-orange-600" />
                                            <span className="text-sm text-gray-700">{videoFile.name}</span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={removeVideo}
                                            className="p-1 text-red-600 hover:text-red-700"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Botões */}
                    <div className="flex justify-end gap-4">
                        <button
                            type="button"
                            onClick={() => navigate(-1)}
                            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Criando...
                                </>
                            ) : (
                                'Criar Evento'
                            )}
                        </button>
                    </div>
                </form>
            </main>
        </div>
    );
}