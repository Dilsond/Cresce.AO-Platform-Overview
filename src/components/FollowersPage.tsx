import { useState, useEffect } from 'react';
import { Heart, UserMinus, UserPlus, CalendarDays, MapPin, Mail, Phone, ArrowLeft, Sparkles, Users, X, Award, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import logo from "../assets/logo.png";

interface Follower {
  id: string;
  user_id: string;
  nome_completo: string;
  nome_utilizador: string;
  email: string;
  foto: string | null;
  seguindo_desde: string;
  eventos_favoritados: number;
  total_likes: number;
  ultimo_evento_favoritado?: string;
}

export function FollowersPage() {
  const navigate = useNavigate();
  const [followers, setFollowers] = useState<Follower[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [totalSeguidores, setTotalSeguidores] = useState(0);

  // Buscar usuário logado
  useEffect(() => {
    const userFromStorage = localStorage.getItem('user');
    if (userFromStorage) {
      const user = JSON.parse(userFromStorage);
      setCurrentUser(user);
      if (user.type !== 'organizer') {
        navigate('/events');
      }
    } else {
      navigate('/login');
    }
  }, [navigate]);

  const fetchFollowers = async () => {
    if (!currentUser || currentUser.type !== 'organizer') return;

    try {
      setIsLoading(true);
      setError(null);

      console.log('🔍 Buscando seguidores do organizador:', currentUser.id);

      // Buscar seguidores do organizador
      const { data: seguidores, error: seguidoresError } = await supabase
        .from('favoritos_organizadores')
        .select(`
          id,
          created_at,
          usuario_normal_id,
          usuario_normal:usuarios_normais (
            id,
            nome_completo,
            nome_utilizador,
            email
          )
        `)
        .eq('organizador_favoritado_id', currentUser.id)
        .order('created_at', { ascending: false });

      if (seguidoresError) {
        console.error('Erro ao buscar seguidores:', seguidoresError);
        setError('Erro ao carregar seguidores');
        return;
      }

      console.log('📦 Seguidores encontrados:', seguidores);

      if (!seguidores || seguidores.length === 0) {
        setFollowers([]);
        setTotalSeguidores(0);
        return;
      }

      setTotalSeguidores(seguidores.length);

      // Para cada seguidor, buscar informações adicionais
      const followersWithStats = await Promise.all(
        seguidores.map(async (seguidor) => {
          const usuario = seguidor.usuario_normal;
          
          if (!usuario) {
            console.log('⚠️ Usuário não encontrado para seguidor:', seguidor);
            return null;
          }

          // Buscar quantos eventos este usuário favoritou (tabela favoritos_eventos)
          const { count: eventosFavoritados, error: eventosError } = await supabase
            .from('favoritos_eventos')
            .select('*', { count: 'exact', head: true })
            .eq('usuario_normal_id', usuario.id);

          if (eventosError) {
            console.error('Erro ao buscar eventos favoritados:', eventosError);
          }

          // Buscar total de likes que este usuário deu (mesma tabela)
          const { count: totalLikes, error: likesError } = await supabase
            .from('favoritos_eventos')
            .select('*', { count: 'exact', head: true })
            .eq('usuario_normal_id', usuario.id);

          if (likesError) {
            console.error('Erro ao buscar total de likes:', likesError);
          }

          // Buscar último evento favoritado
          const { data: ultimoEvento, error: ultimoError } = await supabase
            .from('favoritos_eventos')
            .select(`
              created_at,
              evento:eventos (
                nome_evento
              )
            `)
            .eq('usuario_normal_id', usuario.id)
            .order('created_at', { ascending: false })
            .limit(1);

          if (ultimoError) {
            console.error('Erro ao buscar último evento:', ultimoError);
          }

          return {
            id: seguidor.id,
            user_id: usuario.id,
            nome_completo: usuario.nome_completo || 'Usuário',
            nome_utilizador: usuario.nome_utilizador || 'usuario',
            email: usuario.email || '',
            foto: null, // A tabela usuarios_normais não tem campo foto
            seguindo_desde: seguidor.created_at,
            eventos_favoritados: eventosFavoritados || 0,
            total_likes: totalLikes || 0,
            ultimo_evento_favoritado: ultimoEvento?.[0]?.evento?.nome_evento || 'Nenhum'
          };
        })
      );

      // Filtrar nulls
      const validFollowers = followersWithStats.filter(f => f !== null) as Follower[];
      setFollowers(validFollowers);

    } catch (err) {
      console.error('Erro inesperado:', err);
      setError('Ocorreu um erro ao carregar seguidores');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser && currentUser.type === 'organizer') {
      fetchFollowers();
    }
  }, [currentUser]);

  const handleRemoveFollower = async (followerId: string, userId: string) => {
    // if (!confirm('Tem certeza que deseja remover este seguidor? Ele não poderá mais ver seus eventos.')) return;

    setRemovingId(followerId);

    try {
      const { error } = await supabase
        .from('favoritos_organizadores')
        .delete()
        .eq('id', followerId);

      if (error) throw error;

      // Atualizar lista local
      setFollowers(prev => prev.filter(f => f.id !== followerId));
      setTotalSeguidores(prev => prev - 1);

      // alert('Seguidor removido com sucesso!');

    } catch (err) {
      console.error('Erro ao remover seguidor:', err);
      alert('Erro ao remover seguidor. Tente novamente.');
    } finally {
      setRemovingId(null);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Hoje';
    if (diffDays === 1) return 'Ontem';
    if (diffDays < 7) return `${diffDays} dias atrás`;
    
    return date.toLocaleDateString('pt-PT', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const filteredFollowers = followers.filter(follower =>
    follower.nome_completo.toLowerCase().includes(searchQuery.toLowerCase()) ||
    follower.nome_utilizador.toLowerCase().includes(searchQuery.toLowerCase()) ||
    follower.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-orange-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  if (currentUser.type !== 'organizer') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="bg-red-100 rounded-full p-4 inline-block mb-4">
            <X className="w-12 h-12 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Acesso Restrito</h2>
          <p className="text-gray-600 mb-6">Esta página é apenas para organizadores.</p>
          <button
            onClick={() => navigate('/events')}
            className="px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
          >
            Voltar para eventos
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-orange-50/20 to-gray-50">
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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Hero Banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden bg-gradient-to-br from-orange-600 via-orange-500 to-red-600 rounded-3xl shadow-2xl p-8 text-white"
        >
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-black/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
          <div className="relative z-10 flex items-center justify-between flex-wrap gap-4">
            <div>
              <p className="text-orange-100 text-sm font-medium mb-2 uppercase tracking-wider">Comunidade</p>
              <h1 className="text-4xl md:text-5xl font-bold mb-2">Meus Seguidores</h1>
              <p className="text-orange-100 text-lg">
                {totalSeguidores} {totalSeguidores === 1 ? 'pessoa te segue' : 'pessoas te seguem'}
              </p>
            </div>
            <div className="hidden md:flex w-20 h-20 rounded-2xl bg-white/20 backdrop-blur items-center justify-center shadow-lg">
              <Users className="w-10 h-10 text-white" />
            </div>
          </div>
        </motion.div>

        {/* Search */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Pesquisar seguidores por nome, usuário ou email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none text-sm"
            />
            <div className="absolute left-3 top-1/2 -translate-y-1/2">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex justify-center items-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
              <p className="text-gray-500">Carregando seguidores...</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="text-center py-12 bg-red-50 rounded-2xl">
            <div className="bg-red-100 rounded-full p-3 inline-block mb-4">
              <X className="w-8 h-8 text-red-600" />
            </div>
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={fetchFollowers}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Tentar novamente
            </button>
          </div>
        )}

        {/* Followers Grid */}
        {!isLoading && !error && (
          <>
            {followers.length === 0 ? (
              <div className="text-center py-24 bg-white rounded-2xl border border-dashed border-gray-200">
                <div className="bg-gray-100 p-4 rounded-full inline-block mb-4">
                  <Users className="w-12 h-12 text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Nenhum seguidor ainda</h3>
                <p className="text-gray-500 max-w-md mx-auto">
                  Quando alguém começar a seguir você, aparecerá aqui. 
                  Continue publicando eventos de qualidade para atrair mais seguidores!
                </p>
              </div>
            ) : (
              <>
                {/* Resultados da pesquisa */}
                {searchQuery && (
                  <div className="bg-white rounded-xl p-4 shadow-sm">
                    <p className="text-gray-600">
                      {filteredFollowers.length} {filteredFollowers.length === 1 ? 'resultado encontrado' : 'resultados encontrados'} para "{searchQuery}"
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredFollowers.map((follower, index) => (
                    <motion.div
                      key={follower.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="group bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-orange-200"
                    >
                      <div className="p-6">
                        {/* Avatar e Nome */}
                        <div className="flex items-start gap-4 mb-4">
                          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center text-white text-2xl font-bold flex-shrink-0 overflow-hidden shadow-md">
                            {follower.foto ? (
                              <img 
                                src={follower.foto} 
                                alt={follower.nome_completo} 
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              follower.nome_completo.charAt(0).toUpperCase()
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-gray-900 text-lg group-hover:text-orange-600 transition-colors truncate">
                              {follower.nome_completo}
                            </h3>
                            <p className="text-sm text-gray-500">@{follower.nome_utilizador}</p>
                          </div>
                        </div>

                        {/* Email */}
                        <div className="flex items-center gap-2 text-sm text-gray-500 mb-3 bg-gray-50 p-2 rounded-lg">
                          <Mail className="w-4 h-4 text-orange-500 flex-shrink-0" />
                          <span className="truncate">{follower.email}</span>
                        </div>

                        {/* Estatísticas */}
                        <div className="grid grid-cols-2 gap-3 mb-4 pt-2">
                          <div className="text-center p-3 bg-gradient-to-br from-orange-50 to-red-50 rounded-xl">
                            <Heart className="w-5 h-5 text-red-500 mx-auto mb-1 fill-red-500" />
                            <p className="text-xl font-bold text-gray-900">{follower.eventos_favoritados}</p>
                            <p className="text-xs text-gray-500">Eventos favoritados</p>
                          </div>
                          <div className="text-center p-3 bg-gradient-to-br from-orange-50 to-red-50 rounded-xl">
                            <Star className="w-5 h-5 text-orange-500 mx-auto mb-1" />
                            <p className="text-xl font-bold text-gray-900">{follower.total_likes}</p>
                            <p className="text-xs text-gray-500">Likes dados</p>
                          </div>
                        </div>

                        {/* Último evento favoritado */}
                        {follower.ultimo_evento_favoritado !== 'Nenhum' && (
                          <div className="flex items-center gap-2 text-xs text-gray-500 mb-3 bg-gray-50 p-2 rounded-lg">
                            <CalendarDays className="w-3 h-3 text-orange-500" />
                            <span className="truncate">Último evento: {follower.ultimo_evento_favoritado}</span>
                          </div>
                        )}

                        {/* Seguindo desde */}
                        <div className="flex items-center gap-2 text-xs text-gray-400 mb-4">
                          <Heart className="w-3 h-3 text-red-500 fill-red-500" />
                          <span>Seguindo desde {formatDate(follower.seguindo_desde)}</span>
                        </div>

                        {/* Botão Remover */}
                        <button
                          onClick={() => handleRemoveFollower(follower.id, follower.user_id)}
                          disabled={removingId === follower.id}
                          className="w-full flex items-center justify-center cursor-pointer gap-2 px-4 py-2.5 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors font-medium disabled:opacity-50 group-hover:bg-red-100"
                        >
                          {removingId === follower.id ? (
                            <>
                              <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                              Removendo...
                            </>
                          ) : (
                            <>
                              <UserMinus className="w-4 h-4" />
                              Remover Seguidor
                            </>
                          )}
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </>
            )}

            {/* Nenhum resultado na pesquisa */}
            {searchQuery && filteredFollowers.length === 0 && followers.length > 0 && (
              <div className="text-center py-12 bg-white rounded-xl">
                <div className="bg-gray-100 rounded-full p-3 inline-block mb-4">
                  <Users className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-gray-500">
                  Nenhum seguidor encontrado para <strong className="text-gray-700">"{searchQuery}"</strong>
                </p>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}