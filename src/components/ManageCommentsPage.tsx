import { useState, useEffect } from "react";
import {
    ArrowLeft,
    MessageSquare,
    Star,
    Trash2,
    Edit2,
    Check,
    X,
    Filter,
    Search,
    Calendar,
    User,
    Mail,
    Eye,
    RefreshCw,
    AlertCircle,
    CheckCircle2,
    Clock,
    MoreVertical,
    Reply,
    Pin,
    Flag
} from "lucide-react";
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from "react-router-dom";
import { supabase } from '../lib/supabase';
import logo from "../assets/logo.png";

interface User {
    id: string;
    name: string;
    email: string;
    type: 'user' | 'organizer';
}

interface Comment {
    id: string;
    evento_id: string;
    evento_nome: string;
    usuario_id: string;
    usuario_nome: string;
    usuario_email: string;
    descricao: string;
    avaliacao: number;
    imagem_url: string | null;
    created_at: string;
    updated_at: string;
    deleted_at: string | null;
    respostas?: Comment[];
}

interface CommentStats {
    total: number;
    averageRating: number;
    withRating: number;
    withoutRating: number;
    recentCount: number;
    pendingResponse: number;
}

export function ManageCommentsPage() {
    const navigate = useNavigate();
    const [user, setUser] = useState<User | null>(null);
    const [comments, setComments] = useState<Comment[]>([]);
    const [filteredComments, setFilteredComments] = useState<Comment[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterRating, setFilterRating] = useState<number | 'all'>('all');
    const [filterEvent, setFilterEvent] = useState<string>('all');
    const [events, setEvents] = useState<{ id: string; name: string }[]>([]);
    const [stats, setStats] = useState<CommentStats>({
        total: 0,
        averageRating: 0,
        withRating: 0,
        withoutRating: 0,
        recentCount: 0,
        pendingResponse: 0
    });
    const [editingComment, setEditingComment] = useState<string | null>(null);
    const [editText, setEditText] = useState('');
    const [editRating, setEditRating] = useState(0);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

    // Carregar usuário logado
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

    // Buscar eventos do organizador
    useEffect(() => {
        if (user) {
            fetchEvents();
            fetchComments();
        }
    }, [user]);

    const fetchEvents = async () => {
        if (!user) return;

        try {
            const { data, error } = await supabase
                .from('eventos')
                .select('id, nome_evento')
                .eq('organizador_id', user.id)
                .is('deleted_at', null);

            if (!error && data) {
                setEvents(data);
            }
        } catch (err) {
            console.error('Erro ao buscar eventos:', err);
        }
    };

    const fetchComments = async () => {
        if (!user) return;

        try {
            setIsLoading(true);
            setError(null);

            // Buscar eventos do organizador
            const { data: eventos, error: eventosError } = await supabase
                .from('eventos')
                .select('id, nome_evento')
                .eq('organizador_id', user.id);

            if (eventosError) throw eventosError;

            if (!eventos || eventos.length === 0) {
                setComments([]);
                setFilteredComments([]);
                setStats({
                    total: 0,
                    averageRating: 0,
                    withRating: 0,
                    withoutRating: 0,
                    recentCount: 0,
                    pendingResponse: 0
                });
                setIsLoading(false);
                return;
            }

            const eventoIds = eventos.map(e => e.id);
            const eventoMap = new Map(eventos.map(e => [e.id, e.nome_evento]));

            // Buscar comentários dos eventos
            const { data: comentarios, error: comentariosError } = await supabase
                .from('comentarios')
                .select(`
                    id,
                    evento_id,
                    usuario_normal_id,
                    descricao,
                    avaliacao,
                    imagem_url,
                    created_at,
                    updated_at,
                    deleted_at,
                    usuarios_normais (
                        id,
                        nome_completo,
                        email
                    )
                `)
                .in('evento_id', eventoIds)
                .is('deleted_at', null)
                .order('created_at', { ascending: false });

            if (comentariosError) throw comentariosError;

            // Processar comentários
            const processedComments: Comment[] = (comentarios || []).map(comentario => {
                const usuario = comentario.usuarios_normais;
                return {
                    id: comentario.id,
                    evento_id: comentario.evento_id,
                    evento_nome: eventoMap.get(comentario.evento_id) || 'Evento',
                    usuario_id: usuario?.id || '',
                    usuario_nome: usuario?.nome_completo || 'Usuário',
                    usuario_email: usuario?.email || '',
                    descricao: comentario.descricao || '',
                    avaliacao: comentario.avaliacao || 0,
                    imagem_url: comentario.imagem_url,
                    created_at: comentario.created_at,
                    updated_at: comentario.updated_at,
                    deleted_at: comentario.deleted_at,
                    respostas: []
                };
            });

            setComments(processedComments);
            applyFilters(processedComments, searchTerm, filterRating, filterEvent);

            // Calcular estatísticas
            const withRating = processedComments.filter(c => c.avaliacao > 0).length;
            const withoutRating = processedComments.filter(c => c.avaliacao === 0 || !c.avaliacao).length;
            const averageRating = processedComments.reduce((sum, c) => sum + (c.avaliacao || 0), 0) / (withRating || 1);
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            const recentCount = processedComments.filter(c => new Date(c.created_at) > sevenDaysAgo).length;

            setStats({
                total: processedComments.length,
                averageRating: averageRating,
                withRating,
                withoutRating,
                recentCount,
                pendingResponse: 0
            });

        } catch (err) {
            console.error('Erro ao buscar comentários:', err);
            setError('Ocorreu um erro ao carregar comentários');
        } finally {
            setIsLoading(false);
        }
    };

    const applyFilters = (commentsList: Comment[], search: string, rating: number | 'all', eventId: string) => {
        let filtered = [...commentsList];

        if (search) {
            filtered = filtered.filter(c =>
                c.descricao.toLowerCase().includes(search.toLowerCase()) ||
                c.usuario_nome.toLowerCase().includes(search.toLowerCase()) ||
                c.evento_nome.toLowerCase().includes(search.toLowerCase())
            );
        }

        if (rating !== 'all') {
            filtered = filtered.filter(c => c.avaliacao === rating);
        }

        if (eventId !== 'all') {
            filtered = filtered.filter(c => c.evento_id === eventId);
        }

        setFilteredComments(filtered);
    };

    const handleSearch = () => {
        applyFilters(comments, searchTerm, filterRating, filterEvent);
    };

    const handleClearFilters = () => {
        setSearchTerm('');
        setFilterRating('all');
        setFilterEvent('all');
        applyFilters(comments, '', 'all', 'all');
    };

    const handleEditComment = (comment: Comment) => {
        setEditingComment(comment.id);
        setEditText(comment.descricao);
        setEditRating(comment.avaliacao);
    };

    const handleSaveEdit = async (commentId: string) => {
        try {
            const { error } = await supabase
                .from('comentarios')
                .update({
                    descricao: editText,
                    avaliacao: editRating,
                    updated_at: new Date().toISOString()
                })
                .eq('id', commentId);

            if (error) throw error;

            // Atualizar lista local
            setComments(prev => prev.map(c =>
                c.id === commentId
                    ? { ...c, descricao: editText, avaliacao: editRating, updated_at: new Date().toISOString() }
                    : c
            ));
            
            setEditingComment(null);
            applyFilters(comments, searchTerm, filterRating, filterEvent);
            
        } catch (err) {
            console.error('Erro ao editar comentário:', err);
            alert('Erro ao editar comentário');
        }
    };

    const handleDeleteComment = async (commentId: string) => {
        setDeletingId(commentId);

        try {
            const { error } = await supabase
                .from('comentarios')
                .update({ deleted_at: new Date().toISOString() })
                .eq('id', commentId);

            if (error) throw error;

            // Atualizar lista local
            setComments(prev => prev.filter(c => c.id !== commentId));
            applyFilters(comments.filter(c => c.id !== commentId), searchTerm, filterRating, filterEvent);
            
            setShowDeleteConfirm(null);
            
        } catch (err) {
            console.error('Erro ao deletar comentário:', err);
            alert('Erro ao deletar comentário');
        } finally {
            setDeletingId(null);
        }
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Agora mesmo';
        if (diffMins < 60) return `${diffMins} min atrás`;
        if (diffHours < 24) return `${diffHours} h atrás`;
        if (diffDays < 7) return `${diffDays} dias atrás`;
        
        return date.toLocaleDateString('pt-PT', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    };

    const renderStars = (rating: number) => {
        return (
            <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                        key={star}
                        className={`w-4 h-4 ${
                            star <= rating
                                ? 'fill-yellow-400 text-yellow-400'
                                : 'text-gray-300'
                        }`}
                    />
                ))}
            </div>
        );
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
                        <div className="flex items-center gap-2">
                            <img src={logo} alt="Logo" className="h-8 w-auto" />
                            <span className="text-xl font-bold text-gray-900">
                                Cresce<span className="text-orange-600">.AO</span>
                            </span>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
                {/* Hero Banner */}
                <div className="relative overflow-hidden bg-gradient-to-br from-orange-600 via-orange-500 to-red-600 rounded-3xl shadow-2xl p-8 text-white">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                    <div className="absolute bottom-0 left-0 w-32 h-32 bg-black/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
                    <div className="relative z-10">
                        <p className="text-orange-100 text-sm font-medium mb-2 uppercase tracking-wider">Gestão de Conteúdo</p>
                        <h1 className="text-3xl md:text-4xl font-bold mb-2">Comentários</h1>
                        <p className="text-orange-100">
                            Gerencie todos os comentários dos seus eventos
                        </p>
                    </div>
                </div>

                {/* Estatísticas */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div className="bg-white rounded-2xl shadow-md p-4">
                        <div className="flex items-center gap-2 mb-2">
                            <MessageSquare className="w-5 h-5 text-orange-600" />
                            <span className="text-2xl font-bold text-gray-900">{stats.total}</span>
                        </div>
                        <p className="text-sm text-gray-500">Total de Comentários</p>
                    </div>
                    <div className="bg-white rounded-2xl shadow-md p-4">
                        <div className="flex items-center gap-2 mb-2">
                            <Star className="w-5 h-5 text-yellow-500" />
                            <span className="text-2xl font-bold text-gray-900">{stats.averageRating.toFixed(1)}</span>
                        </div>
                        <p className="text-sm text-gray-500">Avaliação Média</p>
                    </div>
                    <div className="bg-white rounded-2xl shadow-md p-4">
                        <div className="flex items-center gap-2 mb-2">
                            <CheckCircle2 className="w-5 h-5 text-green-500" />
                            <span className="text-2xl font-bold text-gray-900">{stats.withRating}</span>
                        </div>
                        <p className="text-sm text-gray-500">Com Avaliação</p>
                    </div>
                    <div className="bg-white rounded-2xl shadow-md p-4">
                        <div className="flex items-center gap-2 mb-2">
                            <AlertCircle className="w-5 h-5 text-gray-400" />
                            <span className="text-2xl font-bold text-gray-900">{stats.withoutRating}</span>
                        </div>
                        <p className="text-sm text-gray-500">Sem Avaliação</p>
                    </div>
                    <div className="bg-white rounded-2xl shadow-md p-4">
                        <div className="flex items-center gap-2 mb-2">
                            <Clock className="w-5 h-5 text-blue-500" />
                            <span className="text-2xl font-bold text-gray-900">{stats.recentCount}</span>
                        </div>
                        <p className="text-sm text-gray-500">Últimos 7 dias</p>
                    </div>
                </div>

                {/* Filtros e Busca */}
                <div className="bg-white rounded-2xl shadow-md p-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="md:col-span-2">
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder=" Buscar por comentário, usuário ou evento..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                                    className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                                />
                            </div>
                        </div>
                        <div>
                            <select
                                value={filterRating}
                                onChange={(e) => {
                                    const value = e.target.value === 'all' ? 'all' : parseInt(e.target.value);
                                    setFilterRating(value);
                                    applyFilters(comments, searchTerm, value, filterEvent);
                                }}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                            >
                                <option value="all">Todas as avaliações</option>
                                <option value="5">5 estrelas</option>
                                <option value="4">4 estrelas</option>
                                <option value="3">3 estrelas</option>
                                <option value="2">2 estrelas</option>
                                <option value="1">1 estrela</option>
                                <option value="0">Sem avaliação</option>
                            </select>
                        </div>
                        <div>
                            <select
                                value={filterEvent}
                                onChange={(e) => {
                                    setFilterEvent(e.target.value);
                                    applyFilters(comments, searchTerm, filterRating, e.target.value);
                                }}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                            >
                                <option value="all">Todos os eventos</option>
                                {events.map(event => (
                                    <option key={event.id} value={event.id}>{event.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div className="flex justify-end mt-4">
                        <button
                            onClick={handleClearFilters}
                            className="px-4 py-2 text-sm text-gray-600 hover:text-orange-600 transition-colors"
                        >
                            Limpar filtros
                        </button>
                    </div>
                </div>

                {/* Lista de Comentários */}
                {isLoading ? (
                    <div className="flex justify-center items-center h-64">
                        <div className="text-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
                            <p className="text-gray-500">Carregando comentários...</p>
                        </div>
                    </div>
                ) : error ? (
                    <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center">
                        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                        <p className="text-red-600">{error}</p>
                        <button
                            onClick={fetchComments}
                            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                        >
                            Tentar novamente
                        </button>
                    </div>
                ) : filteredComments.length === 0 ? (
                    <div className="bg-white rounded-2xl shadow-md p-12 text-center">
                        <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">Nenhum comentário encontrado</h3>
                        <p className="text-gray-500">
                            {searchTerm || filterRating !== 'all' || filterEvent !== 'all'
                                ? 'Tente ajustar os filtros de busca'
                                : 'Ainda não há comentários nos seus eventos'}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {filteredComments.map((comment, index) => (
                            <motion.div
                                key={comment.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                                className="bg-white rounded-2xl shadow-md p-6 hover:shadow-lg transition-shadow"
                            >
                                {editingComment === comment.id ? (
                                    // Modo de edição
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Avaliação
                                            </label>
                                            <div className="flex gap-1">
                                                {[1, 2, 3, 4, 5].map((star) => (
                                                    <button
                                                        key={star}
                                                        onClick={() => setEditRating(star)}
                                                        className="focus:outline-none"
                                                    >
                                                        <Star
                                                            className={`w-8 h-8 ${
                                                                star <= editRating
                                                                    ? 'fill-yellow-400 text-yellow-400'
                                                                    : 'text-gray-300'
                                                            } transition-colors`}
                                                        />
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Comentário
                                            </label>
                                            <textarea
                                                value={editText}
                                                onChange={(e) => setEditText(e.target.value)}
                                                rows={4}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                                            />
                                        </div>
                                        <div className="flex justify-end gap-3">
                                            <button
                                                onClick={() => setEditingComment(null)}
                                                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                                            >
                                                Cancelar
                                            </button>
                                            <button
                                                onClick={() => handleSaveEdit(comment.id)}
                                                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors flex items-center gap-2"
                                            >
                                                <Check className="w-4 h-4" />
                                                Salvar
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    // Modo de visualização
                                    <>
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3 mb-3 flex-wrap">
                                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center text-white font-bold">
                                                        {comment.usuario_nome.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold text-gray-900">
                                                            {comment.usuario_nome}
                                                        </p>
                                                        <p className="text-xs text-gray-500">
                                                            {comment.usuario_email}
                                                        </p>
                                                    </div>
                                                    {comment.avaliacao > 0 && (
                                                        <div className="ml-auto">
                                                            {renderStars(comment.avaliacao)}
                                                        </div>
                                                    )}
                                                </div>
                                                
                                                <div className="mb-3">
                                                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-700 rounded-lg text-xs">
                                                        <Calendar className="w-3 h-3" />
                                                        {formatDate(comment.created_at)}
                                                    </span>
                                                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 rounded-lg text-xs ml-2">
                                                        <Eye className="w-3 h-3" />
                                                        {comment.evento_nome}
                                                    </span>
                                                </div>
                                                
                                                <p className="text-gray-700 leading-relaxed">
                                                    {comment.descricao}
                                                </p>
                                                
                                                {comment.imagem_url && (
                                                    <div className="mt-3">
                                                        <img
                                                            src={comment.imagem_url}
                                                            alt="Comentário"
                                                            className="w-32 h-32 object-cover rounded-lg"
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                            
                                            <div className="flex items-center gap-2 ml-4">
                                                {showDeleteConfirm === comment.id ? (
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={() => handleDeleteComment(comment.id)}
                                                            disabled={deletingId === comment.id}
                                                            className="px-3 py-1 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition-colors"
                                                        >
                                                            {deletingId === comment.id ? '...' : 'Confirmar'}
                                                        </button>
                                                        <button
                                                            onClick={() => setShowDeleteConfirm(null)}
                                                            className="px-3 py-1 bg-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-300 transition-colors"
                                                        >
                                                            Cancelar
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={() => setShowDeleteConfirm(comment.id)}
                                                        className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                                                        title="Excluir"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </>
                                )}
                            </motion.div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}