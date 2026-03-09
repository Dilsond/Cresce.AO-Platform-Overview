import { useState, useEffect } from "react";
import {
    ArrowLeft,
    Plus,
    Calendar,
    MapPin,
    Edit2,
    X,
    CheckCircle2,
    TrendingUp,
    Users,
    BarChart3,
    Building2,
    LayoutDashboard,
    Sparkles,
    FileText,
    Upload,
    MessageSquare,
} from "lucide-react";
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from "react-router-dom";
import { supabase } from '../lib/supabase';
import { OrganizerCommentManagement } from "./OrganizerCommentManegament";

export type UserType = "user" | "organizer";

export interface User {
    id: string;
    name: string;
    username?: string;
    email: string;
    type: UserType;
    company?: string;
}

export interface Event {
    id: string;
    name: string;
    date: string;
    time: string;
    location: string;
    eventType: string;
    description: string;
    category: string;
    image: string;
    video?: string;
    pdf?: string;
    status: string;
    organizerId: string;
    organizerName: string;
    likes: number;
    contacto_whatsapp?: string;
    created_at?: string;
    deleted_at?: string | null;
}

export function OrganizerDashboard() {
    const [activeTab, setActiveTab] = useState("dashboard");
    const [showAddForm, setShowAddForm] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();

    // Usuário do localStorage
    const [user, setUser] = useState<User | null>(null);

    // Eventos do organizador
    const [events, setEvents] = useState<Event[]>([]);

    // Estado para o formulário
    const [formData, setFormData] = useState({
        name: "",
        date: "",
        time: "",
        location: "",
        eventType: "presencial",
        description: "",
        category: "Workshops",
        image: "",
        video: "",
        contacto_whatsapp: ""
    });

    // Estado para upload de arquivos
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [videoFile, setVideoFile] = useState<File | null>(null);
    const [pdfFile, setPdfFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);

    // Carregar usuário do localStorage
    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            try {
                const parsedUser = JSON.parse(storedUser);
                console.log('Usuário carregado:', parsedUser);

                if (parsedUser.type !== 'organizer') {
                    setError('Acesso não autorizado');
                    setTimeout(() => navigate('/events'), 3000);
                    return;
                }

                setUser(parsedUser);
            } catch (err) {
                console.error('Erro ao parsear usuário:', err);
                setError('Erro ao carregar dados do usuário');
            }
        } else {
            navigate('/login');
        }
    }, [navigate]);

    // Buscar eventos do organizador
    useEffect(() => {
        if (user) {
            fetchOrganizerEvents();
        }
    }, [user]);

    const fetchOrganizerEvents = async () => {
        if (!user) return;

        try {
            setIsLoading(true);
            setError(null);

            console.log('Buscando eventos do organizador:', user.id);

            // Buscar eventos do organizador, excluindo os deletados se quiser escondê-los
            // Ou incluindo todos e tratando o status baseado no deleted_at
            const { data: eventos, error: eventosError } = await supabase
                .from('eventos')
                .select('*')
                .eq('organizador_id', user.id)
                .order('data_evento', { ascending: true });

            if (eventosError) {
                console.error('Erro ao buscar eventos:', eventosError);
                setError('Erro ao carregar eventos');
                return;
            }

            console.log('Eventos encontrados:', eventos);

            if (!eventos || eventos.length === 0) {
                setEvents([]);
                return;
            }

            // Para cada evento, buscar contagem de likes
            const eventosComLikes = await Promise.all(
                eventos.map(async (evento) => {
                    const { count: likesCount, error: likesError } = await supabase
                        .from('favoritos_eventos')
                        .select('*', { count: 'exact', head: true })
                        .eq('evento_id', evento.id);

                    if (likesError) {
                        console.error(`Erro ao buscar likes para evento ${evento.id}:`, likesError);
                    }

                    // Determinar status baseado na data e no deleted_at
                    const hoje = new Date();
                    const dataEvento = new Date(evento.data_evento);
                    let status = 'A decorrer';

                    if (evento.deleted_at) {
                        status = 'Cancelada';
                    } else if (dataEvento < hoje) {
                        status = 'Finalizado';
                    }

                    return {
                        id: evento.id,
                        name: evento.nome_evento,
                        date: evento.data_evento,
                        time: formatTime(evento.hora_evento),
                        location: evento.local || 'Local a definir',
                        eventType: evento.tipo_evento,
                        description: evento.descricao || '',
                        category: evento.categoria,
                        image: evento.imagem_url || '',
                        video: evento.video_url,
                        pdf: evento.arquivo_pdf_url,
                        status,
                        organizerId: evento.organizador_id,
                        organizerName: user.name,
                        likes: likesCount || 0,
                        contacto_whatsapp: evento.contacto_whatsapp,
                        created_at: evento.created_at,
                        deleted_at: evento.deleted_at
                    };
                })
            );

            setEvents(eventosComLikes);

        } catch (err) {
            console.error('Erro inesperado:', err);
            setError('Ocorreu um erro ao carregar eventos');
        } finally {
            setIsLoading(false);
        }
    };

    // Função para formatar hora (remover segundos)
    const formatTime = (time: string) => {
        if (!time) return '';
        return time.split(':').slice(0, 2).join(':');
    };

    const activeEvents = events.filter(e => e.status === "A decorrer");
    const cancelledEvents = events.filter(e => e.status === "Cancelada");
    const totalLikes = events.reduce((sum, e) => sum + e.likes, 0);

    // Função para fazer upload de arquivo
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

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (!file.type.startsWith('image/')) {
                alert('Por favor, selecione uma imagem válida');
                return;
            }

            if (file.size > 5 * 1024 * 1024) {
                alert('A imagem deve ter no máximo 5MB');
                return;
            }

            setImageFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (!file.type.startsWith('video/')) {
                alert('Por favor, selecione um vídeo válido');
                return;
            }

            if (file.size > 50 * 1024 * 1024) {
                alert('O vídeo deve ter no máximo 50MB');
                return;
            }

            setVideoFile(file);
        }
    };

    const handlePdfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.type !== 'application/pdf') {
                alert('Por favor, selecione um arquivo PDF válido');
                return;
            }

            if (file.size > 10 * 1024 * 1024) {
                alert('O PDF deve ter no máximo 10MB');
                return;
            }

            setPdfFile(file);
        }
    };

    // const handleSubmit = async (e: React.FormEvent) => {
    //     e.preventDefault();

    //     if (!user) {
    //         setError('Usuário não autenticado');
    //         return;
    //     }

    //     setUploading(true);
    //     setError(null);

    //     try {
    //         // Validações
    //         if (!formData.name) throw new Error('O nome do evento é obrigatório');
    //         if (!formData.date) throw new Error('A data do evento é obrigatória');
    //         if (!formData.time) throw new Error('A hora do evento é obrigatória');
    //         if (!formData.location && formData.eventType !== 'online') {
    //             throw new Error('O local do evento é obrigatório para eventos presenciais ou híbridos');
    //         }
    //         if (!imageFile) throw new Error('A imagem do evento é obrigatória');

    //         console.log('Iniciando criação do evento...');

    //         // Upload da imagem (obrigatório)
    //         const imageUrl = await uploadFile(imageFile, 'event-images');
    //         if (!imageUrl) throw new Error('Erro ao fazer upload da imagem');

    //         // Upload do vídeo (opcional)
    //         let videoUrl = null;
    //         if (videoFile) {
    //             videoUrl = await uploadFile(videoFile, 'event-videos');
    //             if (!videoUrl) throw new Error('Erro ao fazer upload do vídeo');
    //         }

    //         // Upload do PDF (opcional)
    //         let pdfUrl = null;
    //         if (pdfFile) {
    //             pdfUrl = await uploadFile(pdfFile, 'event-pdfs');
    //             if (!pdfUrl) throw new Error('Erro ao fazer upload do PDF');
    //         }

    //         // Inserir evento no banco
    //         const { data: newEvent, error: insertError } = await supabase
    //             .from('eventos')
    //             .insert([
    //                 {
    //                     organizador_id: user.id,
    //                     nome_evento: formData.name,
    //                     categoria: formData.category.toLowerCase(),
    //                     data_evento: formData.date,
    //                     hora_evento: formData.time,
    //                     tipo_evento: formData.eventType,
    //                     local: formData.location || null,
    //                     descricao: formData.description || null,
    //                     valor: null, // Adicionar campo de preço se necessário
    //                     contacto_whatsapp: formData.contacto_whatsapp || null,
    //                     imagem_url: imageUrl,
    //                     video_url: videoUrl,
    //                     arquivo_pdf_url: pdfUrl,
    //                     created_at: new Date().toISOString(),
    //                     updated_at: new Date().toISOString()
    //                 }
    //             ])
    //             .select()
    //             .single();

    //         if (insertError) {
    //             console.error('Erro ao inserir evento:', insertError);
    //             throw new Error('Erro ao salvar evento no banco de dados');
    //         }

    //         console.log('Evento criado com sucesso:', newEvent);

    //         // Limpar formulário
    //         setFormData({
    //             name: "",
    //             date: "",
    //             time: "",
    //             location: "",
    //             eventType: "presencial",
    //             description: "",
    //             category: "Workshops",
    //             image: "",
    //             video: "",
    //             contacto_whatsapp: ""
    //         });
    //         setImageFile(null);
    //         setImagePreview(null);
    //         setVideoFile(null);
    //         setPdfFile(null);
    //         setShowAddForm(false);

    //         // Recarregar eventos
    //         fetchOrganizerEvents();

    //     } catch (err: any) {
    //         console.error('Erro ao criar evento:', err);
    //         setError(err.message || 'Ocorreu um erro ao criar o evento');
    //     } finally {
    //         setUploading(false);
    //     }
    // };

    const handleStatusToggle = async (id: string, currentStatus: string) => {
        try {
            // Encontrar o evento atual
            const event = events.find(e => e.id === id);
            if (!event) return;

            // Determinar a nova ação
            const isCurrentlyDeleted = !!event.deleted_at;

            if (isCurrentlyDeleted) {
                // Reativar: remover deleted_at
                const { error: updateError } = await supabase
                    .from('eventos')
                    .update({
                        deleted_at: null,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', id);

                if (updateError) {
                    console.error('Erro ao reativar evento:', updateError);
                    setError('Erro ao reativar evento');
                    return;
                }

                // Atualizar estado local
                setEvents(events.map(event =>
                    event.id === id
                        ? { ...event, deleted_at: null, status: 'A decorrer' }
                        : event
                ));

            } else {
                // Cancelar: definir deleted_at com a data atual
                const { error: updateError } = await supabase
                    .from('eventos')
                    .update({
                        deleted_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', id);

                if (updateError) {
                    console.error('Erro ao cancelar evento:', updateError);
                    setError('Erro ao cancelar evento');
                    return;
                }

                // Atualizar estado local
                setEvents(events.map(event =>
                    event.id === id
                        ? { ...event, deleted_at: new Date().toISOString(), status: 'Cancelada' }
                        : event
                ));
            }

        } catch (err) {
            console.error('Erro ao alterar status:', err);
            setError('Ocorreu um erro ao alterar o status do evento');
        }
    };

    const formatDate = (date: string) => {
        return new Date(date).toLocaleDateString("pt-PT");
    };

    if (!user) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-orange-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-600">Carregando...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* HEADER */}
            <header className="bg-white shadow-sm border-b">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center justify-between">
                        <button
                            onClick={() => navigate(-1)}
                            className="flex items-center gap-2 text-gray-600 cursor-pointer hover:text-gray-900 transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5" />
                            <span>Voltar</span>
                        </button>
                        <div className="flex items-center gap-2">
                            <Sparkles className="w-6 h-6 text-orange-600" />
                            <span className="font-bold text-gray-900">Cresce.AO</span>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
                {/* Mensagem de erro */}
                {error && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-red-600 text-sm">{error}</p>
                    </div>
                )}

                {/* Tabs */}
                <div className="flex items-center justify-between bg-white rounded-2xl px-4 shadow-sm border border-gray-100">
                    <div className="flex gap-1 overflow-x-auto">
                        {[
                            { key: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
                            { key: 'comments', label: 'Comentários', icon: <MessageSquare className="w-4 h-4" /> }
                        ].map(tab => (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key as any)}
                                className={`flex items-center gap-2 px-5 py-4 text-sm font-semibold border-b-2 transition-all whitespace-nowrap border-orange-600 text-orange-600`}
                            >
                                {tab.icon}
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Botão */}
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => navigate('/create-event')}
                        className="flex items-center gap-2 px-5 py-4 text-sm font-semibold border-2 rounded-2xl transition-all whitespace-nowrap border-orange-600 text-orange-600"
                    >
                        Criar Evento
                    </motion.button>
                </div>

                {/* HERO */}
                <div className="relative overflow-hidden bg-gradient-to-br from-orange-600 via-orange-500 to-red-600 rounded-3xl shadow-2xl p-8 text-white">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-black/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
                    <div className="relative z-10 flex items-center justify-between">
                        <div>
                            <p className="text-orange-100 text-sm font-medium mb-2 uppercase tracking-wider">Painel do Organizador</p>
                            <h1 className="text-4xl md:text-5xl font-bold mb-3">Dashboard</h1>
                            <p className="text-xl text-orange-50 flex items-center gap-2">
                                <Building2 className="w-5 h-5" />
                                {user.company || user.name}
                            </p>
                        </div>
                    </div>
                </div>

                {/* STATS */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[
                        {
                            gradient: 'from-blue-500 to-blue-600',
                            icon: <BarChart3 className="w-6 h-6" />,
                            badge: <TrendingUp className="w-5 h-5 text-blue-200" />,
                            value: events.length,
                            label: 'Total de Eventos',
                            labelColor: 'text-blue-100'
                        },
                        {
                            gradient: 'from-green-500 to-emerald-600',
                            icon: <CheckCircle2 className="w-6 h-6" />,
                            badge: <span className="px-2 py-1 bg-white/20 rounded-full text-xs font-semibold backdrop-blur-sm">Ativos</span>,
                            value: activeEvents.length,
                            label: 'Eventos Activos',
                            labelColor: 'text-green-100'
                        },
                        {
                            gradient: 'from-purple-500 to-purple-600',
                            icon: <Users className="w-6 h-6" />,
                            badge: <TrendingUp className="w-5 h-5 text-purple-200" />,
                            value: totalLikes,
                            label: 'Total de Interessados',
                            labelColor: 'text-purple-100'
                        },
                        {
                            gradient: 'from-rose-500 to-red-600',
                            icon: <X className="w-6 h-6" />,
                            badge: <span className="px-2 py-1 bg-white/20 rounded-full text-xs font-semibold backdrop-blur-sm">Inativos</span>,
                            value: cancelledEvents.length,
                            label: 'Eventos Cancelados',
                            labelColor: 'text-rose-100'
                        },
                    ].map((stat, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 + i * 0.1 }}
                            className={`group relative overflow-hidden bg-gradient-to-br ${stat.gradient} rounded-2xl shadow-lg p-6 text-white hover:shadow-2xl transition-all`}
                        >
                            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl translate-x-1/2 -translate-y-1/2" />
                            <div className="relative z-10">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                                        {stat.icon}
                                    </div>
                                    {stat.badge}
                                </div>
                                <p className="text-5xl font-bold mb-2">{stat.value}</p>
                                <p className={`${stat.labelColor} font-medium`}>{stat.label}</p>
                            </div>
                        </motion.div>
                    ))}
                </div>

                
                {activeTab === 'comments' && (
                    <OrganizerCommentManagement organizerId={user.id} />
                )}

                {/* LISTA DE EVENTOS */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="bg-white rounded-2xl shadow-lg p-8"
                >
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h2 className="text-3xl font-bold text-gray-900">Meus Eventos</h2>
                            <p className="text-gray-600 mt-1">Gerencie todos os seus eventos publicados</p>
                        </div>
                        {events.length > 0 && (
                            <div className="px-4 py-2 bg-gradient-to-r from-orange-100 to-red-100 rounded-lg border border-orange-200">
                                <p className="text-sm font-semibold text-orange-700">
                                    {events.length} {events.length === 1 ? 'Evento' : 'Eventos'}
                                </p>
                            </div>
                        )}
                    </div>

                    {isLoading ? (
                        <div className="text-center py-16">
                            <div className="w-16 h-16 border-4 border-orange-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                            <p className="text-gray-600">Carregando eventos...</p>
                        </div>
                    ) : events.length === 0 ? (
                        <div className="text-center py-16 px-6">
                            <div className="w-24 h-24 bg-gradient-to-br from-orange-100 to-orange-200 rounded-full flex items-center justify-center mx-auto mb-6">
                                <Calendar className="w-12 h-12 text-orange-600" />
                            </div>
                            <h3 className="text-2xl font-bold text-gray-900 mb-3">Nenhum evento criado</h3>
                            <p className="text-gray-600 mb-6 max-w-md mx-auto">
                                Comece a criar eventos incríveis para alcançar seu público. É rápido e fácil!
                            </p>

                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => setShowAddForm(!showAddForm)}
                                className="inline-flex items-center gap-2 px-6 py-3 bg-orange-600 text-white rounded-xl hover:bg-orange-700 transition-all shadow-lg font-semibold"
                            >
                                {showAddForm ? <X className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                                {showAddForm ? 'Cancelar' : 'Criar Primeiro Evento'}
                            </motion.button>
                        </div>
                    ) : (
                        <div className="grid gap-6">
                            {events.map((event, index) => (
                                <motion.div
                                    key={event.id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                    className={`group relative overflow-hidden rounded-2xl border-2 transition-all hover:shadow-xl ${event.status === 'Cancelada'
                                        ? 'bg-gray-50 border-gray-200'
                                        : 'bg-gradient-to-br from-white to-orange-50/30 border-orange-200/50 hover:border-orange-300'
                                        }`}
                                >
                                    <div className={`absolute top-0 left-0 right-0 h-1.5 ${event.status === 'Cancelada'
                                        ? 'bg-gradient-to-r from-gray-400 to-gray-500'
                                        : 'bg-gradient-to-r from-orange-500 via-red-500 to-orange-600'
                                        }`} />

                                    <div className="p-6">
                                        <div className="grid md:grid-cols-[200px_1fr_auto] gap-6 items-start">
                                            {/* Thumbnail */}
                                            <div className="relative overflow-hidden rounded-xl aspect-video bg-gray-200 group-hover:scale-105 transition-transform shadow-md">
                                                <img
                                                    onClick={() => navigate(`/event/${event.id}`)}
                                                    src={event.image}
                                                    alt={event.name}
                                                    className="w-full h-full object-cover"
                                                    onError={(e) => {
                                                        (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800';
                                                    }}
                                                />
                                                {event.status === 'Cancelada' && (
                                                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                                        <span className="px-3 py-1.5 bg-red-600 text-white text-xs font-bold rounded-full">CANCELADO</span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Info */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-start gap-3 mb-3 flex-wrap">
                                                    <h3 className="text-2xl font-bold text-gray-900 flex-1 min-w-0">{event.name}</h3>
                                                </div>
                                                <div className="flex items-center gap-2 mb-4 flex-wrap">
                                                    <span className={`px-3 py-1.5 rounded-lg text-xs font-bold ${event.status === 'A decorrer'
                                                        ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-md'
                                                        : 'bg-gray-200 text-gray-700'
                                                        }`}>
                                                        {event.status}
                                                    </span>
                                                    <span className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold capitalize">
                                                        {event.eventType}
                                                    </span>
                                                    <span className="px-3 py-1.5 bg-orange-100 text-orange-700 rounded-lg text-xs font-semibold">
                                                        {event.category}
                                                    </span>
                                                </div>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                    <div className="flex items-center gap-2 text-gray-600">
                                                        <div className="w-7 h-7 bg-orange-50 rounded-lg flex items-center justify-center flex-shrink-0">
                                                            <Calendar className="w-4 h-4 text-orange-600" />
                                                        </div>
                                                        <span className="text-sm font-medium">{formatDate(event.date)} às {event.time}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-gray-600">
                                                        <div className="w-7 h-7 bg-orange-50 rounded-lg flex items-center justify-center flex-shrink-0">
                                                            <MapPin className="w-4 h-4 text-orange-600" />
                                                        </div>
                                                        <span className="text-sm font-medium truncate">{event.location}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Actions */}
                                            <div className="flex flex-col gap-3 min-w-[140px]">
                                                <div className="text-center p-3 bg-gradient-to-br from-orange-50 to-red-50 rounded-xl border border-orange-100">
                                                    <p className="text-2xl font-bold text-orange-600">{event.likes}</p>
                                                    <p className="text-xs text-gray-500 font-medium">Interessados</p>
                                                </div>
                                                <button
                                                    onClick={() => handleStatusToggle(event.id, event.status)}
                                                    className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${event.status === 'A decorrer'
                                                        ? 'bg-red-50 text-red-600 border-2 border-red-200 hover:bg-red-100 hover:border-red-300'
                                                        : 'bg-green-50 text-green-600 border-2 border-green-200 hover:bg-green-100 hover:border-green-300'
                                                        }`}
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                    {event.status === 'A decorrer' ? 'Cancelar' : 'Reativar'}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </motion.div>
            </main>
        </div>
    );
}