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
    Share2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../lib/supabase';
import { EventCardSkeleton } from './EventCardSkeleton';
import { EditEventModal } from './EditEventModal';
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
    organizerId: string;
    organizerName: string;
    likes: number;
    price?: number;
    estacoes?: Estacao[];
    totalIngressos?: number;
    ingressosVendidos?: number;
    created_at?: string;
}

export function MyEventsPage() {
    const navigate = useNavigate();
    const [user, setUser] = useState<User | null>(null);
    const [events, setEvents] = useState<Event[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'cancelled' | 'finished'>('all');
    const [searchTerm, setSearchTerm] = useState('');

    // Verificar usuário logado
    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            try {
                const parsedUser = JSON.parse(storedUser);
                if (parsedUser.type !== 'organizer') {
                    setError('Apenas organizadores podem acessar esta página');
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

            // Buscar eventos do organizador
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

            // Processar eventos
            const eventosProcessados = await Promise.all(
                eventos.map(async (evento) => {
                    // Buscar número de likes
                    const { count: likesCount } = await supabase
                        .from('favoritos_eventos')
                        .select('*', { count: 'exact', head: true })
                        .eq('evento_id', evento.id);

                    // Buscar número de ingressos vendidos
                    const { data: pedidos } = await supabase
                        .from('pedidos')
                        .select('quantidade')
                        .eq('evento_id', evento.id)
                        .eq('status', 'pago');

                    const ingressosVendidos = pedidos?.reduce((sum, p) => sum + p.quantidade, 0) || 0;

                    // Calcular total de ingressos disponíveis
                    const estacoes = evento.estacoes || [];
                    const totalIngressos = estacoes.reduce((sum, e: Estacao) => sum + e.quantidade, 0);

                    // Determinar status do evento
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

    const handleDeleteEvent = async (eventId: string) => {
        if (!confirm('Tem certeza que deseja cancelar este evento? Esta ação pode ser desfeita.')) {
            return;
        }

        try {
            const { error } = await supabase
                .from('eventos')
                .update({ 
                    deleted_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
                .eq('id', eventId);

            if (error) throw error;

            // Atualizar lista de eventos
            await fetchOrganizerEvents();
            
            // alert('Evento cancelado com sucesso!');
        } catch (err) {
            console.error('Erro ao cancelar evento:', err);
            alert('Erro ao cancelar evento. Tente novamente.');
        }
    };

    const handleRestoreEvent = async (eventId: string) => {
        if (!confirm('Tem certeza que deseja reativar este evento?')) {
            return;
        }

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
            // alert('Evento reativado com sucesso!');
        } catch (err) {
            console.error('Erro ao reativar evento:', err);
            alert('Erro ao reativar evento. Tente novamente.');
        }
    };

    const handleDuplicateEvent = async (event: Event) => {
        if (!confirm(`Deseja duplicar o evento "${event.name}"?`)) {
            return;
        }

        try {
            const newEventName = `${event.name} (Cópia)`;
            
            const { data: newEvent, error } = await supabase
                .from('eventos')
                .insert({
                    organizador_id: user!.id,
                    nome_evento: newEventName,
                    categoria: event.category,
                    data_evento: event.date,
                    hora_evento: event.time,
                    tipo_evento: event.eventType,
                    local: event.location,
                    descricao: event.description,
                    valor: event.price,
                    imagem_url: event.image,
                    video_url: event.video,
                    arquivo_pdf_url: event.pdf,
                    estacoes: event.estacoes,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
                .select()
                .single();

            if (error) throw error;

            await fetchOrganizerEvents();
            // alert(`Evento duplicado com sucesso!`);
        } catch (err) {
            console.error('Erro ao duplicar evento:', err);
            alert('Erro ao duplicar evento. Tente novamente.');
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'active':
                return { color: 'bg-green-100 text-green-700', label: 'Ativo', icon: CheckCircle };
            case 'cancelled':
                return { color: 'bg-red-100 text-red-700', label: 'Cancelado', icon: XCircle };
            case 'finished':
                return { color: 'bg-gray-100 text-gray-700', label: 'Finalizado', icon: Clock };
            default:
                return { color: 'bg-gray-100 text-gray-700', label: 'Desconhecido', icon: AlertCircle };
        }
    };

    const filteredEvents = events.filter(event => {
        // Filtro por status
        if (filterStatus !== 'all' && event.status !== filterStatus) {
            return false;
        }
        
        // Filtro por busca
        if (searchTerm && !event.name.toLowerCase().includes(searchTerm.toLowerCase())) {
            return false;
        }
        
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
            <header className="bg-white/80 backdrop-blur-md shadow-sm border-b border-gray-200/50 sticky top-0 z-20">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center justify-between">
                        <button
                            onClick={() => navigate(-1)}
                            className="flex items-center gap-2 text-gray-600 cursor-pointer hover:text-orange-600 transition-all group"
                        >
                            <span className="text-xl group-hover:-translate-x-1 transition-transform">←</span>
                            <span className="font-medium">Voltar</span>
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

                {/* Filtros e busca */}
                <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1">
                            <input
                                type="text"
                                placeholder="Buscar evento..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                            />
                        </div>
                        <div className="flex gap-2">
                            {['all', 'active', 'cancelled', 'finished'].map((status) => (
                                <button
                                    key={status}
                                    onClick={() => setFilterStatus(status as any)}
                                    className={`px-4 py-2 rounded-lg font-medium transition-all ${
                                        filterStatus === status
                                            ? 'bg-orange-600 text-white'
                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                                >
                                    {status === 'all' && 'Todos'}
                                    {status === 'active' && 'Ativos'}
                                    {status === 'cancelled' && 'Cancelados'}
                                    {status === 'finished' && 'Finalizados'}
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
                            return (
                                <motion.div
                                    key={event.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-all border border-gray-100"
                                >
                                    {/* Imagem */}
                                    <div className="relative h-48">
                                        <img
                                            src={event.image}
                                            alt={event.name}
                                            className="w-full h-full object-cover"
                                            onError={(e) => {
                                                (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800';
                                            }}
                                        />
                                        <div className="absolute top-3 right-3">
                                            <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold ${getStatusBadge(event.status).color}`}>
                                                <StatusIcon className="w-3 h-3" />
                                                {getStatusBadge(event.status).label}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Conteúdo */}
                                    <div className="p-5">
                                        <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-1">
                                            {event.name}
                                        </h3>
                                        
                                        <div className="space-y-2 mb-4">
                                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                                <Calendar className="w-4 h-4" />
                                                <span>{formatDate(event.date)} às {event.time}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                                <MapPin className="w-4 h-4" />
                                                <span className="truncate">{event.location}</span>
                                            </div>
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
                                        </div>

                                        {/* Botões de ação */}
                                        <div className="flex gap-2 pt-4 border-t border-gray-100">
                                            <button
                                                onClick={() => navigate(`/event/${event.id}`)}
                                                className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
                                            >
                                                <Eye className="w-4 h-4" />
                                                Ver
                                            </button>
                                            <button
                                                onClick={() => handleEditEvent(event)}
                                                className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition-colors text-sm font-medium"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                                Editar
                                            </button>
                                            {event.status === 'cancelled' ? (
                                                <button
                                                    onClick={() => handleRestoreEvent(event.id)}
                                                    className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors text-sm font-medium"
                                                >
                                                    <CheckCircle className="w-4 h-4" />
                                                    Reativar
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => handleDeleteEvent(event.id)}
                                                    className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm font-medium"
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
        </div>
    );
}