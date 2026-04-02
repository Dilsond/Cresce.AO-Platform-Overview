import { useState, useEffect } from "react";
import {
    ArrowLeft,
    Calendar,
    MapPin,
    Edit2,
    X,
    CheckCircle2,
    TrendingUp,
    Users,
    BarChart3,
    Building2,
    Heart,
    Ticket,
    DollarSign,
    Activity,
    Eye,
    Calendar as CalendarIcon,
    Clock,
    Star,
    UserCheck,
    ShoppingBag,
    Award,
    PieChart as PieChartIcon,
    LineChart,
    TrendingDown
} from "lucide-react";
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from "react-router-dom";
import { supabase } from '../lib/supabase';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    ArcElement,
    BarElement,
    Filler
} from 'chart.js';
import { Line, Pie, Bar } from 'react-chartjs-2';
import logo from "../assets/logo.png";

// Registrar componentes do Chart.js
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
    Filler
);

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
    ingressos_vendidos?: number;
    receita_total?: number;
}

interface DashboardStats {
    totalEvents: number;
    activeEvents: number;
    cancelledEvents: number;
    finishedEvents: number;
    totalLikes: number;
    totalFollowers: number;
    totalTicketsSold: number;
    totalRevenue: number;
    averageRating: number;
    engagementRate: number;
}

export function OrganizerDashboard() {
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();
    const [user, setUser] = useState<User | null>(null);
    const [events, setEvents] = useState<Event[]>([]);
    const [stats, setStats] = useState<DashboardStats>({
        totalEvents: 0,
        activeEvents: 0,
        cancelledEvents: 0,
        finishedEvents: 0,
        totalLikes: 0,
        totalFollowers: 0,
        totalTicketsSold: 0,
        totalRevenue: 0,
        averageRating: 0,
        engagementRate: 0
    });
    const [followersCount, setFollowersCount] = useState(0);
    const [recentEvents, setRecentEvents] = useState<Event[]>([]);
    const [popularEvents, setPopularEvents] = useState<Event[]>([]);

    // Carregar usuário do localStorage
    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            try {
                const parsedUser = JSON.parse(storedUser);
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

    // Buscar dados do organizador
    useEffect(() => {
        if (user) {
            fetchOrganizerData();
        }
    }, [user]);

    const fetchOrganizerData = async () => {
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

            if (eventosError) throw eventosError;

            // Buscar número de seguidores
            const { count: followersCount, error: followersError } = await supabase
                .from('favoritos_organizadores')
                .select('*', { count: 'exact', head: true })
                .eq('organizador_favoritado_id', user.id);

            if (!followersError) setFollowersCount(followersCount || 0);

            // Processar eventos
            let totalLikes = 0;
            let totalTicketsSold = 0;
            let totalRevenue = 0;
            let totalRatings = 0;
            let totalRatingsCount = 0;
            const eventosProcessados: Event[] = [];

            for (const evento of eventos || []) {
                // Buscar likes
                const { count: likesCount } = await supabase
                    .from('favoritos_eventos')
                    .select('*', { count: 'exact', head: true })
                    .eq('evento_id', evento.id);
                
                const likes = likesCount || 0;
                totalLikes += likes;

                // Buscar pedidos pagos
                const { data: pedidos } = await supabase
                    .from('pedidos')
                    .select('quantidade, valor_total')
                    .eq('evento_id', evento.id)
                    .eq('status', 'pago');

                const ingressosVendidos = pedidos?.reduce((sum, p) => sum + p.quantidade, 0) || 0;
                const receitaTotal = pedidos?.reduce((sum, p) => sum + p.valor_total, 0) || 0;
                
                totalTicketsSold += ingressosVendidos;
                totalRevenue += receitaTotal;

                // Buscar avaliações
                const { data: comentarios } = await supabase
                    .from('comentarios')
                    .select('avaliacao')
                    .eq('evento_id', evento.id)
                    .not('avaliacao', 'is', null);

                if (comentarios && comentarios.length > 0) {
                    const sumRatings = comentarios.reduce((sum, c) => sum + (c.avaliacao || 0), 0);
                    totalRatings += sumRatings;
                    totalRatingsCount += comentarios.length;
                }

                // Determinar status
                const hoje = new Date();
                const dataEvento = new Date(evento.data_evento);
                let status = 'A decorrer';
                
                if (evento.deleted_at) {
                    status = 'Cancelada';
                } else if (dataEvento < hoje) {
                    status = 'Finalizado';
                }

                eventosProcessados.push({
                    id: evento.id,
                    name: evento.nome_evento,
                    date: evento.data_evento,
                    time: formatTime(evento.hora_evento),
                    location: evento.local || 'Local a definir',
                    eventType: evento.tipo_evento,
                    description: evento.descricao || '',
                    category: evento.categoria,
                    image: evento.imagem_url || '',
                    status,
                    organizerId: evento.organizador_id,
                    organizerName: user.name,
                    likes,
                    ingressos_vendidos: ingressosVendidos,
                    receita_total: receitaTotal
                });
            }

            setEvents(eventosProcessados);
            
            // Calcular estatísticas
            const activeEvents = eventosProcessados.filter(e => e.status === 'A decorrer').length;
            const cancelledEvents = eventosProcessados.filter(e => e.status === 'Cancelada').length;
            const finishedEvents = eventosProcessados.filter(e => e.status === 'Finalizado').length;
            const averageRating = totalRatingsCount > 0 ? totalRatings / totalRatingsCount : 0;
            const engagementRate = totalLikes > 0 && followersCount > 0 ? (totalLikes / followersCount) * 100 : 0;

            setStats({
                totalEvents: eventosProcessados.length,
                activeEvents,
                cancelledEvents,
                finishedEvents,
                totalLikes,
                totalFollowers: followersCount || 0,
                totalTicketsSold,
                totalRevenue,
                averageRating,
                engagementRate
            });

            // Eventos recentes (últimos 5)
            setRecentEvents(eventosProcessados.slice(0, 5));
            
            // Eventos mais populares (top 5 por likes)
            setPopularEvents([...eventosProcessados].sort((a, b) => b.likes - a.likes).slice(0, 5));

        } catch (err) {
            console.error('Erro inesperado:', err);
            setError('Ocorreu um erro ao carregar dados');
        } finally {
            setIsLoading(false);
        }
    };

    const formatTime = (time: string) => {
        if (!time) return '';
        return time.split(':').slice(0, 2).join(':');
    };

    const formatDate = (date: string) => {
        return new Date(date).toLocaleDateString("pt-PT", {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    };

    const formatCurrency = (value: number) => {
        return value.toLocaleString('pt-AO') + ' Kz';
    };

    // Gráfico de linhas - Evolução de eventos
    const lineChartData = {
        labels: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'],
        datasets: [
            {
                label: 'Eventos Criados',
                data: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                borderColor: 'rgb(249, 115, 22)',
                backgroundColor: 'rgba(249, 115, 22, 0.1)',
                fill: true,
                tension: 0.4,
                pointBackgroundColor: 'rgb(249, 115, 22)',
                pointBorderColor: '#fff',
                pointHoverRadius: 6,
            }
        ]
    };

    // Gráfico de pizza - Distribuição por status
    const pieChartData = {
        labels: ['Ativos', 'Finalizados', 'Cancelados'],
        datasets: [
            {
                data: [stats.activeEvents, stats.finishedEvents, stats.cancelledEvents],
                backgroundColor: [
                    'rgb(34, 197, 94)',
                    'rgb(156, 163, 175)',
                    'rgb(239, 68, 68)'
                ],
                borderColor: 'white',
                borderWidth: 2,
            }
        ]
    };

    // Gráfico de barras - Eventos por categoria
    const categoryCount: Record<string, number> = {};
    events.forEach(event => {
        const cat = event.category.charAt(0).toUpperCase() + event.category.slice(1);
        categoryCount[cat] = (categoryCount[cat] || 0) + 1;
    });

    const barChartData = {
        labels: Object.keys(categoryCount),
        datasets: [
            {
                label: 'Quantidade de Eventos',
                data: Object.values(categoryCount),
                backgroundColor: 'rgba(249, 115, 22, 0.8)',
                borderRadius: 8,
            }
        ]
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'bottom' as const,
            }
        }
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
            {/* Header */}
            <header className="bg-white shadow-sm border-b sticky top-0 z-20">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center justify-between">
                        <button
                            onClick={() => navigate(-1)}
                            className="flex items-center gap-2 text-gray-600 cursor-pointer hover:text-orange-600 transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5" />
                            <span>Voltar</span>
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
                {error && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-red-600 text-sm">{error}</p>
                    </div>
                )}

                {/* Hero Banner */}
                <div className="relative overflow-hidden bg-gradient-to-br from-orange-600 via-orange-500 to-red-600 rounded-3xl shadow-2xl p-8 text-white">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                    <div className="absolute bottom-0 left-0 w-32 h-32 bg-black/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
                    <div className="relative z-10">
                        <p className="text-orange-100 text-sm font-medium mb-2 uppercase tracking-wider">Painel do Organizador</p>
                        <h1 className="text-3xl md:text-4xl font-bold mb-2">Dashboard</h1>
                        <p className="text-xl text-orange-50 flex items-center gap-2">
                            <Building2 className="w-5 h-5" />
                            {user.company || user.name}
                        </p>
                    </div>
                </div>

                {/* Cards de Estatísticas Principais */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="bg-white rounded-2xl shadow-md p-6 hover:shadow-xl transition-shadow">
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                                <Calendar className="w-6 h-6 text-orange-600" />
                            </div>
                            <TrendingUp className="w-5 h-5 text-green-500" />
                        </div>
                        <p className="text-3xl font-bold text-gray-900">{stats.totalEvents}</p>
                        <p className="text-sm text-gray-500 mt-1">Total de Eventos</p>
                        <div className="mt-3 flex gap-2 text-xs">
                            <span className="text-green-600">↑ {stats.activeEvents} ativos</span>
                            <span className="text-gray-400">•</span>
                            <span className="text-gray-500">{stats.finishedEvents} finalizados</span>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl shadow-md p-6 hover:shadow-xl transition-shadow">
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-12 h-12 bg-pink-100 rounded-xl flex items-center justify-center">
                                <Heart className="w-6 h-6 text-pink-600" />
                            </div>
                            <Users className="w-5 h-5 text-blue-500" />
                        </div>
                        <p className="text-3xl font-bold text-gray-900">{stats.totalLikes}</p>
                        <p className="text-sm text-gray-500 mt-1">Total de Interessados</p>
                        <div className="mt-3 text-xs text-gray-500">
                            Média de {(stats.totalLikes / stats.totalEvents || 0).toFixed(1)} por evento
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl shadow-md p-6 hover:shadow-xl transition-shadow">
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                                <Ticket className="w-6 h-6 text-green-600" />
                            </div>
                            <ShoppingBag className="w-5 h-5 text-purple-500" />
                        </div>
                        <p className="text-3xl font-bold text-gray-900">{stats.totalTicketsSold}</p>
                        <p className="text-sm text-gray-500 mt-1">Ingressos Vendidos</p>
                        <div className="mt-3 text-xs text-green-600 font-medium">
                            {formatCurrency(stats.totalRevenue)}
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl shadow-md p-6 hover:shadow-xl transition-shadow">
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                                <UserCheck className="w-6 h-6 text-purple-600" />
                            </div>
                            <Award className="w-5 h-5 text-yellow-500" />
                        </div>
                        <p className="text-3xl font-bold text-gray-900">{stats.totalFollowers}</p>
                        <p className="text-sm text-gray-500 mt-1">Seguidores</p>
                        <div className="mt-3 text-xs text-gray-500">
                            Taxa de engajamento: {stats.engagementRate.toFixed(1)}%
                        </div>
                    </div>
                </div>

                {/* Gráficos */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Gráfico de Linhas */}
                    <div className="bg-white rounded-2xl shadow-md p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <LineChart className="w-5 h-5 text-orange-600" />
                            Evolução de Eventos
                        </h3>
                        <div className="h-64">
                            <Line data={lineChartData} options={chartOptions} />
                        </div>
                    </div>

                    {/* Gráfico de Pizza */}
                    <div className="bg-white rounded-2xl shadow-md p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <PieChartIcon className="w-5 h-5 text-orange-600" />
                            Distribuição por Status
                        </h3>
                        <div className="h-64">
                            <Pie data={pieChartData} options={chartOptions} />
                        </div>
                    </div>
                </div>

                {/* Gráfico de Barras */}
                <div className="bg-white rounded-2xl shadow-md p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <BarChart3 className="w-5 h-5 text-orange-600" />
                        Eventos por Categoria
                    </h3>
                    <div className="h-80">
                        <Bar data={barChartData} options={chartOptions} />
                    </div>
                </div>

                {/* Eventos Recentes */}
                <div className="bg-white rounded-2xl shadow-md p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <Clock className="w-5 h-5 text-orange-600" />
                        Eventos Recentes
                    </h3>
                    <div className="space-y-3">
                        {recentEvents.length === 0 ? (
                            <p className="text-gray-500 text-center py-8">Nenhum evento encontrado</p>
                        ) : (
                            recentEvents.map((event) => (
                                <div key={event.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-orange-50 transition-colors">
                                    <div className="flex-1">
                                        <p className="font-medium text-gray-900">{event.name}</p>
                                        <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                                            <span className="flex items-center gap-1">
                                                <CalendarIcon className="w-3 h-3" />
                                                {formatDate(event.date)}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Heart className="w-3 h-3" />
                                                {event.likes} likes
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                            event.status === 'A decorrer' ? 'bg-green-100 text-green-700' :
                                            event.status === 'Cancelada' ? 'bg-red-100 text-red-700' :
                                            'bg-gray-100 text-gray-700'
                                        }`}>
                                            {event.status}
                                        </span>
                                        <button
                                            onClick={() => navigate(`/event/${event.id}`)}
                                            className="p-2 text-gray-400 hover:text-orange-600 transition-colors cursor-pointer"
                                        >
                                            <Eye className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Eventos Mais Populares */}
                <div className="bg-white rounded-2xl shadow-md p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-orange-600" />
                        Eventos Mais Populares
                    </h3>
                    <div className="space-y-3">
                        {popularEvents.length === 0 ? (
                            <p className="text-gray-500 text-center py-8">Nenhum evento encontrado</p>
                        ) : (
                            popularEvents.map((event, idx) => (
                                <div key={event.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl">
                                    <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-bold">
                                        {idx + 1}
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-medium text-gray-900">{event.name}</p>
                                        <p className="text-xs text-gray-500">{formatDate(event.date)}</p>
                                    </div>
                                    <div className="flex items-center gap-1 text-pink-600">
                                        <Heart className="w-4 h-4 fill-current" />
                                        <span className="font-semibold">{event.likes}</span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}