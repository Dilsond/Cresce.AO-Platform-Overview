import { useState, useEffect } from "react";
import {
    ArrowLeft,
    Calendar,
    Edit2,
    X,
    TrendingUp,
    Users,
    BarChart3,
    Building2,
    Heart,
    Ticket,
    Activity,
    Eye,
    Calendar as CalendarIcon,
    Clock,
    UserCheck,
    ShoppingBag,
    Award,
    PieChart as PieChartIcon,
    LineChart,
} from "lucide-react";
import { motion } from 'motion/react';
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
import logo from '../assets/logo.png';

ChartJS.register(
    CategoryScale, LinearScale, PointElement, LineElement,
    BarElement, ArcElement, Title, Tooltip, Legend, Filler
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
    status: string;
    organizerId: string;
    organizerName: string;
    likes: number;
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
        totalEvents: 0, activeEvents: 0, cancelledEvents: 0, finishedEvents: 0,
        totalLikes: 0, totalFollowers: 0, totalTicketsSold: 0, totalRevenue: 0,
        averageRating: 0, engagementRate: 0
    });
    const [followersCount, setFollowersCount] = useState(0);
    const [recentEvents, setRecentEvents] = useState<Event[]>([]);
    const [popularEvents, setPopularEvents] = useState<Event[]>([]);

    // ── Auth ────────────────────────────────────────────────────────────────
    useEffect(() => {
        const stored = localStorage.getItem('user');
        if (!stored) { navigate('/login'); return; }
        try {
            const parsed = JSON.parse(stored);
            if (parsed.type !== 'organizer') {
                setError('Acesso não autorizado');
                setTimeout(() => navigate('/events'), 2000);
                return;
            }
            setUser(parsed);
        } catch { setError('Erro ao carregar dados do utilizador'); }
    }, [navigate]);

    useEffect(() => { if (user) fetchOrganizerData(); }, [user]);

    // ── Fetch ────────────────────────────────────────────────────────────────
    const fetchOrganizerData = async () => {
        if (!user) return;
        try {
            setIsLoading(true); setError(null);

            const { data: eventos, error: eventosError } = await supabase
                .from('eventos').select('*')
                .eq('organizador_id', user.id)
                .order('data_evento', { ascending: false });
            if (eventosError) throw eventosError;

            const { count: fc } = await supabase
                .from('favoritos_organizadores').select('*', { count: 'exact', head: true })
                .eq('organizador_favoritado_id', user.id);
            setFollowersCount(fc || 0);

            let totalLikes = 0, totalTicketsSold = 0, totalRevenue = 0;
            let totalRatings = 0, totalRatingsCount = 0;
            const processed: Event[] = [];

            for (const ev of eventos || []) {
                const { count: likes } = await supabase
                    .from('favoritos_eventos').select('*', { count: 'exact', head: true })
                    .eq('evento_id', ev.id);
                totalLikes += likes || 0;

                const { data: pedidos } = await supabase
                    .from('pedidos').select('quantidade, valor_total')
                    .eq('evento_id', ev.id).eq('status', 'pago');
                const ingressosVendidos = pedidos?.reduce((s, p) => s + p.quantidade, 0) || 0;
                const receitaTotal = pedidos?.reduce((s, p) => s + p.valor_total, 0) || 0;
                totalTicketsSold += ingressosVendidos;
                totalRevenue += receitaTotal;

                const { data: comentarios } = await supabase
                    .from('comentarios').select('avaliacao')
                    .eq('evento_id', ev.id).not('avaliacao', 'is', null);
                if (comentarios?.length) {
                    totalRatings += comentarios.reduce((s, c) => s + (c.avaliacao || 0), 0);
                    totalRatingsCount += comentarios.length;
                }

                const hoje = new Date();
                const dataEvento = new Date(ev.data_evento);
                const status = ev.deleted_at ? 'Cancelada' : dataEvento < hoje ? 'Finalizado' : 'A decorrer';

                processed.push({
                    id: ev.id, name: ev.nome_evento, date: ev.data_evento,
                    time: formatTime(ev.hora_evento), location: ev.local || 'Local a definir',
                    eventType: ev.tipo_evento, description: ev.descricao || '',
                    category: ev.categoria, image: ev.imagem_url || '',
                    status, organizerId: ev.organizador_id, organizerName: user.name,
                    likes: likes || 0, created_at: ev.created_at,
                    ingressos_vendidos: ingressosVendidos, receita_total: receitaTotal,
                });
            }

            setEvents(processed);
            const activeEvents = processed.filter(e => e.status === 'A decorrer').length;
            const cancelledEvents = processed.filter(e => e.status === 'Cancelada').length;
            const finishedEvents = processed.filter(e => e.status === 'Finalizado').length;
            const averageRating = totalRatingsCount > 0 ? totalRatings / totalRatingsCount : 0;
            const engagementRate = totalLikes > 0 && (fc || 0) > 0 ? (totalLikes / (fc || 1)) * 100 : 0;

            setStats({
                totalEvents: processed.length, activeEvents, cancelledEvents, finishedEvents,
                totalLikes, totalFollowers: fc || 0, totalTicketsSold, totalRevenue,
                averageRating, engagementRate,
            });
            setRecentEvents(processed.slice(0, 5));
            setPopularEvents([...processed].sort((a, b) => b.likes - a.likes).slice(0, 5));
        } catch (err) {
            console.error(err); setError('Ocorreu um erro ao carregar dados');
        } finally {
            setIsLoading(false);
        }
    };

    // ── Helpers ──────────────────────────────────────────────────────────────
    const formatTime = (t: string) => t ? t.split(':').slice(0, 2).join(':') : '';
    const formatDate = (d: string) => new Date(d).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' });
    const formatCurrency = (v: number) => v.toLocaleString('pt-AO') + ' Kz';

    // ── Gráfico 1: Eventos por mês (últimos 12 meses) — dados REAIS ──────────
    const buildMonthlyChart = () => {
        const now = new Date();
        // Gerar os últimos 12 meses
        const months: { label: string; key: string }[] = [];
        for (let i = 11; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            months.push({
                label: d.toLocaleDateString('pt-PT', { month: 'short', year: '2-digit' }),
                key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
            });
        }

        // Contar eventos criados por mês (usa created_at)
        const countByMonth: Record<string, number> = {};
        months.forEach(m => { countByMonth[m.key] = 0; });
        events.forEach(ev => {
            if (!ev.created_at) return;
            const d = new Date(ev.created_at);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            if (key in countByMonth) countByMonth[key]++;
        });

        // Contar likes acumulados por mês do evento (data_evento)
        const likesByMonth: Record<string, number> = {};
        months.forEach(m => { likesByMonth[m.key] = 0; });
        events.forEach(ev => {
            const d = new Date(ev.date);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            if (key in likesByMonth) likesByMonth[key] += ev.likes;
        });

        return {
            labels: months.map(m => m.label),
            datasets: [
                {
                    label: 'Eventos criados',
                    data: months.map(m => countByMonth[m.key]),
                    borderColor: '#ea580c',
                    backgroundColor: 'rgba(234,88,12,0.1)',
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#ea580c',
                    pointBorderColor: '#fff',
                    pointRadius: 5,
                    pointHoverRadius: 7,
                    yAxisID: 'y',
                },
                {
                    label: 'Interessados',
                    data: months.map(m => likesByMonth[m.key]),
                    borderColor: '#ec4899',
                    backgroundColor: 'rgba(236,72,153,0.07)',
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#ec4899',
                    pointBorderColor: '#fff',
                    pointRadius: 5,
                    pointHoverRadius: 7,
                    yAxisID: 'y1',
                },
            ],
        };
    };

    const lineChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index' as const, intersect: false },
        plugins: {
            legend: { position: 'bottom' as const },
            tooltip: {
                callbacks: {
                    label: (ctx: any) => ` ${ctx.dataset.label}: ${ctx.parsed.y}`,
                },
            },
        },
        scales: {
            y: {
                type: 'linear' as const,
                display: true,
                position: 'left' as const,
                title: { display: true, text: 'Eventos', color: '#ea580c', font: { size: 11 } },
                ticks: { stepSize: 1, precision: 0 },
                grid: { color: 'rgba(0,0,0,0.05)' },
            },
            y1: {
                type: 'linear' as const,
                display: true,
                position: 'right' as const,
                title: { display: true, text: 'Interessados', color: '#ec4899', font: { size: 11 } },
                ticks: { stepSize: 1, precision: 0 },
                grid: { drawOnChartArea: false },
            },
        },
    };

    // ── Gráfico 2: Pizza ─────────────────────────────────────────────────────
    const pieChartData = {
        labels: ['Ativos', 'Finalizados', 'Cancelados'],
        datasets: [{
            data: [stats.activeEvents, stats.finishedEvents, stats.cancelledEvents],
            backgroundColor: ['rgb(34,197,94)', 'rgb(156,163,175)', 'rgb(239,68,68)'],
            borderColor: 'white', borderWidth: 2,
        }],
    };

    // ── Gráfico 3: Barras por categoria ──────────────────────────────────────
    const categoryCount: Record<string, number> = {};
    events.forEach(ev => {
        const cat = ev.category.charAt(0).toUpperCase() + ev.category.slice(1);
        categoryCount[cat] = (categoryCount[cat] || 0) + 1;
    });
    const barChartData = {
        labels: Object.keys(categoryCount),
        datasets: [{
            label: 'Quantidade de Eventos',
            data: Object.values(categoryCount),
            backgroundColor: 'rgba(249,115,22,0.8)',
            borderRadius: 8,
        }],
    };

    const chartOptions = {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom' as const } },
    };

    // ── Loading ──────────────────────────────────────────────────────────────
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

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white shadow-sm border-b sticky top-0 z-20">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
                    <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-600 hover:text-orange-600 transition-colors cursor-pointer">
                        <ArrowLeft className="w-5 h-5" /><span>Voltar</span>
                    </button>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
                {error && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-red-600 text-sm">{error}</p>
                    </div>
                )}

                {/* Hero */}
                <div className="relative overflow-hidden bg-gradient-to-br from-orange-600 via-orange-500 to-red-600 rounded-3xl shadow-2xl p-8 text-white">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                    <div className="absolute bottom-0 left-0 w-32 h-32 bg-black/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
                    <div className="relative z-10">
                        <p className="text-orange-100 text-sm font-medium mb-2 uppercase tracking-wider">Painel do Organizador</p>
                        <h1 className="text-3xl md:text-4xl font-bold mb-2">Dashboard</h1>
                        <p className="text-xl text-orange-50 flex items-center gap-2">
                            <Building2 className="w-5 h-5" />{user.company || user.name}
                        </p>
                    </div>
                </div>

                {/* Stats cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[
                        { icon: Calendar, iconBg: 'bg-orange-100', iconColor: 'text-orange-600', trendIcon: <TrendingUp className="w-5 h-5 text-green-500" />, value: stats.totalEvents, label: 'Total de Eventos', sub: `↑ ${stats.activeEvents} ativos • ${stats.finishedEvents} finalizados` },
                        { icon: Heart, iconBg: 'bg-pink-100', iconColor: 'text-pink-600', trendIcon: <Users className="w-5 h-5 text-blue-500" />, value: stats.totalLikes, label: 'Interessados', sub: `Média de ${(stats.totalLikes / (stats.totalEvents || 1)).toFixed(1)} por evento` },
                        { icon: Ticket, iconBg: 'bg-green-100', iconColor: 'text-green-600', trendIcon: <ShoppingBag className="w-5 h-5 text-purple-500" />, value: stats.totalTicketsSold, label: 'Ingressos vendidos', sub: 'Gratuitos e pagos' },
                        { icon: UserCheck, iconBg: 'bg-purple-100', iconColor: 'text-purple-600', trendIcon: <Award className="w-5 h-5 text-yellow-500" />, value: stats.totalFollowers, label: 'Seguidores', sub: `Engajamento: ${stats.engagementRate.toFixed(1)}%` },
                    ].map(({ icon: Icon, iconBg, iconColor, trendIcon, value, label, sub }) => (
                        <div key={label} className="bg-white rounded-2xl shadow-md p-6 hover:shadow-xl transition-shadow">
                            <div className="flex items-center justify-between mb-4">
                                <div className={`w-12 h-12 ${iconBg} rounded-xl flex items-center justify-center`}>
                                    <Icon className={`w-6 h-6 ${iconColor}`} />
                                </div>
                                {trendIcon}
                            </div>
                            <p className="text-3xl font-bold text-gray-900">{value}</p>
                            <p className="text-sm text-gray-500 mt-1">{label}</p>
                            <p className="mt-3 text-xs text-gray-500">{sub}</p>
                        </div>
                    ))}
                </div>

                {/* Gráficos */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* ── Evolução real por mês ── */}
                    <div className="bg-white rounded-2xl shadow-md p-6 lg:col-span-2">
                        <div className="flex items-center justify-between mb-1">
                            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                                <LineChart className="w-5 h-5 text-orange-600" />
                                Atividade nos últimos 12 meses
                            </h3>
                            <span className="text-xs text-gray-400">eventos criados vs interessados</span>
                        </div>
                        {events.length === 0 ? (
                            <div className="h-64 flex items-center justify-center text-gray-400 text-sm">
                                Ainda sem dados para mostrar
                            </div>
                        ) : (
                            <div className="h-72">
                                <Line data={buildMonthlyChart()} options={lineChartOptions} />
                            </div>
                        )}
                    </div>

                    {/* Pizza */}
                    <div className="bg-white rounded-2xl shadow-md p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <PieChartIcon className="w-5 h-5 text-orange-600" />
                            Distribuição por estado
                        </h3>
                        {stats.totalEvents === 0 ? (
                            <div className="h-64 flex items-center justify-center text-gray-400 text-sm">Sem eventos</div>
                        ) : (
                            <div className="h-64"><Pie data={pieChartData} options={chartOptions} /></div>
                        )}
                    </div>

                    {/* Barras */}
                    <div className="bg-white rounded-2xl shadow-md p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <BarChart3 className="w-5 h-5 text-orange-600" />
                            Eventos por categoria
                        </h3>
                        {Object.keys(categoryCount).length === 0 ? (
                            <div className="h-64 flex items-center justify-center text-gray-400 text-sm">Sem categorias</div>
                        ) : (
                            <div className="h-64"><Bar data={barChartData} options={chartOptions} /></div>
                        )}
                    </div>
                </div>

                {/* Eventos Recentes */}
                <div className="bg-white rounded-2xl shadow-md p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <Clock className="w-5 h-5 text-orange-600" />Eventos Recentes
                    </h3>
                    <div className="space-y-3">
                        {recentEvents.length === 0 ? (
                            <p className="text-gray-500 text-center py-8">Nenhum evento encontrado</p>
                        ) : recentEvents.map((event) => (
                            <div key={event.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-orange-50 transition-colors">
                                <div className="flex-1">
                                    <p className="font-medium text-gray-900">{event.name}</p>
                                    <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                                        <span className="flex items-center gap-1"><CalendarIcon className="w-3 h-3" />{formatDate(event.date)}</span>
                                        <span className="flex items-center gap-1"><Heart className="w-3 h-3" />{event.likes} likes</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${event.status === 'A decorrer' ? 'bg-green-100 text-green-700' : event.status === 'Cancelada' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'}`}>
                                        {event.status}
                                    </span>
                                    <button onClick={() => navigate(`/event/${event.id}`)} className="p-2 text-gray-400 hover:text-orange-600 transition-colors cursor-pointer">
                                        <Eye className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Mais Populares */}
                <div className="bg-white rounded-2xl shadow-md p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-orange-600" />Eventos Mais Populares
                    </h3>
                    <div className="space-y-3">
                        {popularEvents.length === 0 ? (
                            <p className="text-gray-500 text-center py-8">Nenhum evento encontrado</p>
                        ) : popularEvents.map((event, idx) => (
                            <div key={event.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl">
                                <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-bold">{idx + 1}</div>
                                <div className="flex-1">
                                    <p className="font-medium text-gray-900">{event.name}</p>
                                    <p className="text-xs text-gray-500">{formatDate(event.date)}</p>
                                </div>
                                <div className="flex items-center gap-1 text-pink-600">
                                    <Heart className="w-4 h-4 fill-current" />
                                    <span className="font-semibold">{event.likes}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </main>
        </div>
    );
}