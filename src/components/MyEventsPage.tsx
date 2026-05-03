import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Calendar,
    MapPin,
    Heart,
    Edit2,
    Trash2,
    Plus,
    Ticket,
    Users,
    Clock,
    AlertCircle,
    CheckCircle,
    XCircle,
    Eye,
    Copy,
    Share2,
    UserPlus,
    X,
    Lock,
    ArrowLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../lib/supabase';
import { EventCardSkeleton } from './EventCardSkeleton';
import { EditEventModal } from './EditEventModal';
import { EventLikersModal } from './EventLikersModal';
import { DeleteEventModal } from './DeleteEventModal';
import logo from "../assets/logo.png";

interface User {
    id: string;
    name: string;
    type: 'user' | 'organizer';
    company?: string;
}

interface Estacao {
    nome: string;
    quantidade: number;
    preco: number;
    vantagens: string[];
}

interface Event {
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
    statusAprovacao: 'pendente' | 'aprovado' | 'rejeitado';
    motivoRejeicao?: string;
    organizerId: string;
    organizerName: string;
    likes: number;
    price?: number;
    estacoes?: Estacao[];
    totalIngressos?: number;
    ingressosVendidos?: number;
    created_at?: string;
}

// Ilustração SVG para evento pendente
function PendingIllustration() {
    return (
        <svg viewBox="0 0 280 160" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
            <rect width="280" height="160" fill="#FFF7ED" />
            {/* Background circles */}
            <circle cx="240" cy="20" r="40" fill="#FED7AA" opacity="0.4" />
            <circle cx="40" cy="140" r="30" fill="#FDBA74" opacity="0.3" />

            {/* Document */}
            <rect x="90" y="25" width="100" height="110" rx="8" fill="white" stroke="#F97316" strokeWidth="2" />
            <rect x="100" y="40" width="60" height="6" rx="3" fill="#FED7AA" />
            <rect x="100" y="54" width="80" height="4" rx="2" fill="#FEE2CE" />
            <rect x="100" y="64" width="70" height="4" rx="2" fill="#FEE2CE" />
            <rect x="100" y="74" width="75" height="4" rx="2" fill="#FEE2CE" />

            {/* Clock icon in center */}
            <circle cx="140" cy="105" r="20" fill="#FFF7ED" stroke="#F97316" strokeWidth="2" />
            <circle cx="140" cy="105" r="2" fill="#F97316" />
            <line x1="140" y1="105" x2="140" y2="95" stroke="#F97316" strokeWidth="2" strokeLinecap="round" />
            <line x1="140" y1="105" x2="148" y2="109" stroke="#F97316" strokeWidth="2" strokeLinecap="round" />

            {/* Stars/sparkles */}
            <path d="M65 50 L67 46 L69 50 L73 52 L69 54 L67 58 L65 54 L61 52 Z" fill="#FB923C" opacity="0.7" />
            <path d="M210 80 L212 76 L214 80 L218 82 L214 84 L212 88 L210 84 L206 82 Z" fill="#F97316" opacity="0.5" />
            <circle cx="75" cy="90" r="3" fill="#FDBA74" />
            <circle cx="205" cy="45" r="4" fill="#FB923C" opacity="0.6" />
        </svg>
    );
}

// Ilustração SVG para evento rejeitado
function RejectedIllustration() {
    return (
        <svg viewBox="0 0 280 160" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
            <rect width="280" height="160" fill="#FEF2F2" />
            {/* Background shapes */}
            <circle cx="240" cy="20" r="40" fill="#FECACA" opacity="0.4" />
            <circle cx="40" cy="140" r="30" fill="#FCA5A5" opacity="0.3" />

            {/* Document */}
            <rect x="90" y="25" width="100" height="110" rx="8" fill="white" stroke="#EF4444" strokeWidth="2" />
            <rect x="100" y="40" width="60" height="6" rx="3" fill="#FECACA" />
            <rect x="100" y="54" width="80" height="4" rx="2" fill="#FEE2E2" />
            <rect x="100" y="64" width="70" height="4" rx="2" fill="#FEE2E2" />
            <rect x="100" y="74" width="75" height="4" rx="2" fill="#FEE2E2" />

            {/* X icon in center */}
            <circle cx="140" cy="105" r="20" fill="#FEF2F2" stroke="#EF4444" strokeWidth="2" />
            <line x1="132" y1="97" x2="148" y2="113" stroke="#EF4444" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="148" y1="97" x2="132" y2="113" stroke="#EF4444" strokeWidth="2.5" strokeLinecap="round" />

            {/* Decorative elements */}
            <path d="M65 50 L67 46 L69 50 L73 52 L69 54 L67 58 L65 54 L61 52 Z" fill="#F87171" opacity="0.7" />
            <path d="M210 80 L212 76 L214 80 L218 82 L214 84 L212 88 L210 84 L206 82 Z" fill="#EF4444" opacity="0.5" />
            <circle cx="75" cy="90" r="3" fill="#FCA5A5" />
            <circle cx="205" cy="45" r="4" fill="#F87171" opacity="0.6" />
        </svg>
    );
}

export function MyEventsPage() {
    const navigate = useNavigate();
    const [user, setUser] = useState<User | null>(null);
    const [events, setEvents] = useState<Event[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showLikersModal, setShowLikersModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [selectedEventForDelete, setSelectedEventForDelete] = useState<{ id: string; name: string } | null>(null);
    const [selectedEventForLikers, setSelectedEventForLikers] = useState<{ id: string; name: string } | null>(null);
    const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'cancelled' | 'finished'>('all');
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            try {
                const parsedUser = JSON.parse(storedUser);
                if (parsedUser.type !== 'organizer') {
                    setError('Apenas organizadores podem acessar esta página');
                    setTimeout(() => navigate('/events'), 2000);
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

            const { data: eventos, error: eventosError } = await supabase
                .from('eventos')
                .select('*')
                .eq('organizador_id', user.id)
                .order('data_evento', { ascending: false });

            if (eventosError) {
                console.error('Erro ao buscar eventos:', eventosError);
                setError('Erro ao carregar eventos');
                return;
            }

            if (!eventos || eventos.length === 0) {
                setEvents([]);
                return;
            }

            const eventosProcessados = await Promise.all(
                eventos.map(async (evento) => {
                    const { count: likesCount } = await supabase
                        .from('favoritos_eventos')
                        .select('*', { count: 'exact', head: true })
                        .eq('evento_id', evento.id);

                    const { data: pedidos } = await supabase
                        .from('pedidos')
                        .select('quantidade')
                        .eq('evento_id', evento.id)
                        .eq('status', 'pago');

                    const ingressosVendidos = pedidos?.reduce((sum, p) => sum + p.quantidade, 0) || 0;

                    const estacoes = evento.estacoes || [];
                    const totalIngressos = estacoes.reduce((sum, e: Estacao) => sum + e.quantidade, 0);

                    const hoje = new Date();
                    const dataEvento = new Date(evento.data_evento);
                    let status = 'active';

                    if (evento.deleted_at) {
                        status = 'cancelled';
                    } else if (dataEvento < hoje) {
                        status = 'finished';
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
                        image: evento.imagem_url || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800',
                        video: evento.video_url,
                        pdf: evento.arquivo_pdf_url,
                        status,
                        statusAprovacao: (evento.status_aprovacao || 'pendente') as 'pendente' | 'aprovado' | 'rejeitado',
                        motivoRejeicao: evento.motivo_rejeicao,
                        organizerId: evento.organizador_id,
                        organizerName: user.name,
                        likes: likesCount || 0,
                        price: evento.valor,
                        estacoes: evento.estacoes || [],
                        totalIngressos,
                        ingressosVendidos,
                        created_at: evento.created_at
                    };
                })
            );

            setEvents(eventosProcessados);

        } catch (err) {
            console.error('Erro inesperado:', err);
            setError('Ocorreu um erro ao carregar eventos');
        } finally {
            setIsLoading(false);
        }
    };

    const formatTime = (time: string) => {
        if (!time) return '';
        return time.split(':').slice(0, 2).join(':');
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('pt-PT', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    };

    const handleEditEvent = (event: Event) => {
        setSelectedEvent(event);
        setShowEditModal(true);
    };

    const handleViewLikers = (event: Event) => {
        setSelectedEventForLikers({ id: event.id, name: event.name });
        setShowLikersModal(true);
    };

    const handleCancelEvent = async (eventId: string) => {
        try {
            const { error } = await supabase
                .from('eventos')
                .update({
                    deleted_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
                .eq('id', eventId);

            if (error) throw error;
            await fetchOrganizerEvents();
        } catch (err) {
            console.error('Erro ao cancelar evento:', err);
            alert('Erro ao cancelar evento. Tente novamente.');
        }
    };

    const handleRestoreEvent = async (eventId: string) => {
        try {
            const { error } = await supabase
                .from('eventos')
                .update({
                    deleted_at: null,
                    updated_at: new Date().toISOString()
                })
                .eq('id', eventId);

            if (error) throw error;
            await fetchOrganizerEvents();
        } catch (err) {
            console.error('Erro ao reativar evento:', err);
            alert('Erro ao reativar evento. Tente novamente.');
        }
    };

    const handleDeleteEvent = (event: Event) => {
        setSelectedEventForDelete({ id: event.id, name: event.name });
        setShowDeleteModal(true);
    };

    const handlePermanentDelete = async () => {
        await fetchOrganizerEvents();
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'active':
                return { color: 'bg-green-100 text-green-700', label: 'Ativo', icon: CheckCircle };
            case 'cancelled':
                return { color: 'bg-red-100 text-gray-700', label: 'Cancelado', icon: XCircle };
            case 'finished':
                return { color: 'bg-gray-100 text-gray-700', label: 'Finalizado', icon: Clock };
            default:
                return { color: 'bg-gray-100 text-gray-700', label: 'Desconhecido', icon: AlertCircle };
        }
    };

    const getAprovacaoBadge = (statusAprovacao: string) => {
        switch (statusAprovacao) {
            case 'aprovado':
                return { color: 'bg-green-100 text-green-700', label: 'Aprovado', icon: CheckCircle };
            case 'pendente':
                return { color: 'bg-amber-100 text-amber-700', label: 'Em análise', icon: Clock };
            case 'rejeitado':
                return { color: 'bg-red-100 text-red-700', label: 'Rejeitado', icon: XCircle };
            default:
                return { color: 'bg-gray-100 text-gray-700', label: 'Desconhecido', icon: AlertCircle };
        }
    };

    // Verifica se o evento está bloqueado (não pode ver detalhes)
    const isEventBlocked = (event: Event) => {
        return event.statusAprovacao === 'pendente' || event.statusAprovacao === 'rejeitado';
    };

    const filteredEvents = events.filter(event => {
        if (filterStatus !== 'all' && event.status !== filterStatus) return false;
        if (searchTerm && !event.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
        return true;
    });

    const stats = {
        total: events.length,
        active: events.filter(e => e.status === 'active').length,
        cancelled: events.filter(e => e.status === 'cancelled').length,
        finished: events.filter(e => e.status === 'finished').length,
        totalLikes: events.reduce((sum, e) => sum + e.likes, 0),
        totalIngressosVendidos: events.reduce((sum, e) => sum + (e.ingressosVendidos || 0), 0)
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

            <main className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Estatísticas */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
                    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                        <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                        <p className="text-sm text-gray-500">Total</p>
                    </div>
                    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                        <p className="text-2xl font-bold text-green-600">{stats.active}</p>
                        <p className="text-sm text-gray-500">Ativos</p>
                    </div>
                    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                        <p className="text-2xl font-bold text-red-600">{stats.cancelled}</p>
                        <p className="text-sm text-gray-500">Cancelados</p>
                    </div>
                </div>

                {/* Filtros e busca */}
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-6">
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1">
                            <input
                                type="text"
                                placeholder="Pesquisar evento..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none text-sm"
                            />
                            <div className="absolute left-3 top-1/2 -translate-y-1/2">
                                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </div>
                            {searchTerm && (
                                <button
                                    onClick={() => setSearchTerm('')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                        <div className="flex gap-2 flex-wrap">
                            {(['all', 'active', 'cancelled', 'finished'] as const).map((s) => (
                                <button
                                    key={s}
                                    onClick={() => setFilterStatus(s)}
                                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${filterStatus === s
                                        ? 'bg-orange-600 text-white'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        }`}
                                >
                                    {{ all: 'Todos', active: 'Ativos', cancelled: 'Cancelados', finished: 'Finalizados' }[s]}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Lista de Eventos */}
                {isLoading ? (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {Array.from({ length: 6 }).map((_, index) => (
                            <EventCardSkeleton key={index} />
                        ))}
                    </div>
                ) : error ? (
                    <div className="text-center py-12 bg-white rounded-xl">
                        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                        <p className="text-red-600">{error}</p>
                        <button
                            onClick={fetchOrganizerEvents}
                            className="mt-4 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
                        >
                            Tentar novamente
                        </button>
                    </div>
                ) : filteredEvents.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-xl">
                        <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Nenhum evento encontrado</h3>
                        <p className="text-gray-500 mb-4">
                            {searchTerm ? 'Tente uma busca diferente' : 'Você ainda não criou nenhum evento'}
                        </p>
                        {!searchTerm && (
                            <button
                                onClick={() => navigate('/create-event')}
                                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
                            >
                                Criar meu primeiro evento
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredEvents.map((event) => {
                            const StatusIcon = getStatusBadge(event.status).icon;
                            const blocked = isEventBlocked(event);
                            const aprovacaoBadge = getAprovacaoBadge(event.statusAprovacao);
                            const AprovacaoIcon = aprovacaoBadge.icon;

                            return (
                                <motion.div
                                    key={event.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className={`bg-white rounded-xl shadow-md overflow-hidden transition-all border ${blocked
                                            ? 'border-gray-200 opacity-90'
                                            : 'border-gray-100 hover:shadow-xl'
                                        }`}
                                >
                                    {/* Área da imagem ou ilustração */}
                                    <div className="relative h-48">
                                        {blocked ? (
                                            // Mostrar ilustração quando pendente ou rejeitado
                                            <div className="w-full h-full">
                                                {event.statusAprovacao === 'pendente'
                                                    ? <PendingIllustration />
                                                    : <RejectedIllustration />
                                                }
                                            </div>
                                        ) : (
                                            // Mostrar imagem normal quando aprovado
                                            <img
                                                src={event.image}
                                                alt={event.name}
                                                className="w-full h-full object-cover"
                                                onError={(e) => {
                                                    (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800';
                                                }}
                                            />
                                        )}

                                        {/* Badge de status de aprovação (sempre visível) */}
                                        <div className="absolute top-3 left-3">
                                            <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold shadow-sm ${aprovacaoBadge.color}`}>
                                                <AprovacaoIcon className="w-3 h-3" />
                                                {aprovacaoBadge.label}
                                            </span>
                                        </div>

                                        {/* Badge de status do evento (só quando aprovado) */}
                                        {!blocked && (
                                            <div className="absolute top-3 right-3">
                                                <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold ${getStatusBadge(event.status).color}`}>
                                                    <StatusIcon className="w-3 h-3" />
                                                    {getStatusBadge(event.status).label}
                                                </span>
                                            </div>
                                        )}

                                        {/* Overlay de bloqueio com ícone de cadeado */}
                                        {blocked && (
                                            <div className="absolute bottom-3 right-3">
                                                <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold shadow-sm backdrop-blur-sm ${event.statusAprovacao === 'pendente'
                                                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                                        : 'bg-red-50 text-red-700 border border-red-200'
                                                    }`}>
                                                    <Lock className="w-3 h-3" />
                                                    <span>Acesso restrito</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Conteúdo */}
                                    <div className="p-5">
                                        <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-1">
                                            {event.name}
                                        </h3>

                                        {/* Mensagem de motivo de rejeição */}
                                        {event.statusAprovacao === 'rejeitado' && event.motivoRejeicao && (
                                            <div className="mb-3 p-2.5 bg-red-50 border border-red-100 rounded-lg">
                                                <p className="text-xs ml-2 text-red-600 font-medium mb-0.5">Motivo da rejeição: {event.motivoRejeicao}</p>
                                            </div>
                                        )}

                                        {/* Mensagem informativa quando pendente */}
                                        {event.statusAprovacao === 'pendente' && (
                                            <div className="mb-3 p-2.5 bg-amber-50 border border-amber-100 rounded-lg">
                                                <p className="text-xs text-amber-700">
                                                    ⏳ Este evento está a aguardar aprovação do administrador.
                                                </p>
                                            </div>
                                        )}

                                        <div className="space-y-2 mb-4">
                                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                                <Calendar className="w-4 h-4" />
                                                <span>{formatDate(event.date)} às {event.time}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                                <MapPin className="w-4 h-4" />
                                                <span className="truncate">{event.location}</span>
                                            </div>
                                            {!blocked && (
                                                <>
                                                    <div className="flex items-center gap-2 text-sm text-gray-600">
                                                        <Ticket className="w-4 h-4" />
                                                        <span>
                                                            {event.ingressosVendidos || 0} vendidos / {event.totalIngressos || 0} disponíveis
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-sm text-gray-600">
                                                        <Heart className="w-4 h-4 text-red-500" />
                                                        <span>{event.likes} interessados</span>
                                                    </div>
                                                </>
                                            )}
                                        </div>

                                        {/* Botões de ação */}
                                        <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-100">
                                            {/* Botão Ver — desabilitado se bloqueado */}
                                            <button
                                                onClick={() => !blocked && navigate(`/event/${event.id}`)}
                                                disabled={blocked}
                                                title={blocked ? 'Disponível após aprovação' : 'Ver evento'}
                                                className={`flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${blocked
                                                        ? 'bg-gray-50 text-gray-300 cursor-not-allowed'
                                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200 cursor-pointer'
                                                    }`}
                                            >
                                                {blocked ? <Lock className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                Ver
                                            </button>

                                            <button
                                                onClick={() => handleEditEvent(event)}
                                                className="flex-1 flex items-center justify-center cursor-pointer gap-1 px-3 py-2 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition-colors text-sm font-medium"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                                Editar
                                            </button>

                                            {/* Botão Interessados — desabilitado se bloqueado */}
                                            <button
                                                onClick={() => !blocked && handleViewLikers(event)}
                                                disabled={blocked}
                                                title={blocked ? 'Disponível após aprovação' : 'Ver interessados'}
                                                className={`flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${blocked
                                                        ? 'bg-gray-50 text-gray-300 cursor-not-allowed'
                                                        : 'bg-pink-100 text-pink-700 hover:bg-pink-200 cursor-pointer'
                                                    }`}
                                            >
                                                <Users className="w-4 h-4" />
                                                Interessados
                                            </button>

                                            {event.status === 'cancelled' ? (
                                                <>
                                                    <button
                                                        onClick={() => handleRestoreEvent(event.id)}
                                                        className="flex-1 flex items-center justify-center cursor-pointer gap-1 px-3 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors text-sm font-medium"
                                                    >
                                                        <CheckCircle className="w-4 h-4" />
                                                        Reativar
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteEvent(event)}
                                                        className="flex-1 flex items-center justify-center cursor-pointer gap-1 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                        Excluir
                                                    </button>
                                                </>
                                            ) : (
                                                <button
                                                    onClick={() => handleCancelEvent(event.id)}
                                                    className="flex-1 flex items-center justify-center cursor-pointer gap-1 px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm font-medium"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                    Cancelar
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                )}
            </main>

            {/* Modal de Edição */}
            {showEditModal && selectedEvent && (
                <EditEventModal
                    event={selectedEvent}
                    onClose={() => {
                        setShowEditModal(false);
                        setSelectedEvent(null);
                    }}
                    onUpdate={fetchOrganizerEvents}
                />
            )}

            {/* Modal de Interessados */}
            {showLikersModal && selectedEventForLikers && (
                <EventLikersModal
                    isOpen={showLikersModal}
                    onClose={() => {
                        setShowLikersModal(false);
                        setSelectedEventForLikers(null);
                    }}
                    eventId={selectedEventForLikers.id}
                    eventName={selectedEventForLikers.name}
                />
            )}

            {/* Modal de Exclusão Permanente */}
            {showDeleteModal && selectedEventForDelete && (
                <DeleteEventModal
                    isOpen={showDeleteModal}
                    onClose={() => {
                        setShowDeleteModal(false);
                        setSelectedEventForDelete(null);
                    }}
                    eventId={selectedEventForDelete.id}
                    eventName={selectedEventForDelete.name}
                    onDelete={handlePermanentDelete}
                />
            )}
        </div>
    );
}