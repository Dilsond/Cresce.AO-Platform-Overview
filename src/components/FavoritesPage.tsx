import { useState, useEffect } from 'react';
import { Heart, ArrowLeft, MapPin, Calendar, Clock, Search, Bookmark, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export type UserType = 'user' | 'organizer' | null;

export interface User {
  id: string;
  name: string;
  username: string;
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
  price?: number;
}

export function FavoritesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Todas');
  const [likedEvents, setLikedEvents] = useState<string[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();

  // Pegar usuário do localStorage
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const u = localStorage.getItem('user');
      return u ? JSON.parse(u) : null;
    } catch {
      return null;
    }
  });

  // Buscar favoritos do usuário
  useEffect(() => {
    if (currentUser) {
      fetchUserLikes();
    } else {
      navigate('/login');
    }
  }, [currentUser]);

  // Buscar eventos favoritos do usuário
  const fetchUserLikes = async () => {
    if (!currentUser) return;

    try {
      setIsLoading(true);
      setError(null);

      console.log('Buscando favoritos do usuário:', currentUser.id, 'Tipo:', currentUser.type);

      // Construir query baseada no tipo de usuário
      let query = supabase.from('favoritos_eventos').select('evento_id');

      if (currentUser.type === 'user') {
        query = query.eq('usuario_normal_id', currentUser.id);
      } else if (currentUser.type === 'organizer') {
        query = query.eq('organizador_id', currentUser.id);
      }

      const { data: favorites, error: favError } = await query;

      if (favError) {
        console.error('Erro ao buscar favoritos:', favError);
        setError('Erro ao carregar favoritos');
        setIsLoading(false);
        return;
      }

      console.log('Favoritos encontrados:', favorites);

      const likedIds = favorites.map(fav => fav.evento_id);
      setLikedEvents(likedIds);
      localStorage.setItem('cresceao_liked', JSON.stringify(likedIds));

      if (likedIds.length === 0) {
        setEvents([]);
        setIsLoading(false);
        return;
      }

      // Buscar os eventos completos baseado nos IDs
      const { data: eventos, error: eventosError } = await supabase
        .from('eventos')
        .select('*')
        .in('id', likedIds)
        .is('deleted_at', null)
        .order('data_evento', { ascending: true });

      if (eventosError) {
        console.error('Erro ao buscar eventos:', eventosError);
        setError('Erro ao carregar eventos');
        setIsLoading(false);
        return;
      }

      console.log('Eventos encontrados:', eventos);

      // Para cada evento, buscar o organizador correspondente
      const eventosComOrganizadores = await Promise.all(
        eventos.map(async (evento) => {
          const { data: organizador, error: orgError } = await supabase
            .from('organizadores')
            .select('nome_empresa, id')
            .eq('id', evento.organizador_id)
            .single();

          if (orgError) {
            console.error(`Erro ao buscar organizador para evento ${evento.id}:`, orgError);
          }

          // Buscar contagem de likes para este evento
          const { count: likesCount, error: likesError } = await supabase
            .from('favoritos_eventos')
            .select('*', { count: 'exact', head: true })
            .eq('evento_id', evento.id);

          if (likesError) {
            console.error(`Erro ao buscar likes para evento ${evento.id}:`, likesError);
          }

          return {
            id: evento.id,
            name: evento.nome_evento,
            description: evento.descricao || 'Sem descrição disponível',
            category: evento.categoria,
            date: evento.data_evento,
            time: evento.hora_evento,
            eventType: evento.tipo_evento,
            location: evento.local || 'Local a definir',
            price: evento.valor || 0,
            image: evento.imagem_url || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800',
            status: 'A decorrer',
            organizerId: organizador?.id || evento.organizador_id,
            organizerName: organizador?.nome_empresa || 'Organizador não identificado',
            likes: likesCount || 0
          };
        })
      );

      console.log('Eventos formatados:', eventosComOrganizadores);
      setEvents(eventosComOrganizadores);

    } catch (err) {
      console.error('Erro inesperado:', err);
      setError('Ocorreu um erro ao carregar favoritos');
    } finally {
      setIsLoading(false);
    }
  };

  // Função para remover dos favoritos
  const handleLikeToggle = async (eventId: string) => {
    if (!currentUser) {
      navigate('/login');
      return;
    }

    try {
      console.log('Removendo dos favoritos:', eventId);

      // Construir query de deleção baseada no tipo de usuário
      let query = supabase.from('favoritos_eventos').delete().eq('evento_id', eventId);

      if (currentUser.type === 'user') {
        query = query.eq('usuario_normal_id', currentUser.id);
      } else if (currentUser.type === 'organizer') {
        query = query.eq('organizador_id', currentUser.id);
      }

      const { error } = await query;

      if (error) {
        console.error('Erro ao remover favorito:', error);
        return;
      }

      // Atualizar estado local
      const newLikedEvents = likedEvents.filter(id => id !== eventId);
      setLikedEvents(newLikedEvents);
      localStorage.setItem('cresceao_liked', JSON.stringify(newLikedEvents));

      // Remover evento da lista
      setEvents(prevEvents => prevEvents.filter(event => event.id !== eventId));

    } catch (err) {
      console.error('Erro ao alternar like:', err);
    }
  };

  const handleEventClick = (eventId: string) => {
    navigate(`/event/${eventId}`);
  };

  const categories = ['Todas', 'Palestras', 'Workshops', 'Feiras', 'Masterclasses'];

  // Filtrar eventos
  const filtered = events.filter(event => {
    const matchesSearch =
      event.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.location.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'Todas' || event.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categoryColor: Record<string, string> = {
    Palestras: 'bg-blue-100 text-blue-700',
    Workshops: 'bg-green-100 text-green-700',
    Feiras: 'bg-purple-100 text-purple-700',
    Masterclasses: 'bg-amber-100 text-amber-700',
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('pt-PT', { day: 'numeric', month: 'short', year: 'numeric' });

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-orange-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando favoritos...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Erro ao carregar</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => navigate('/events')}
            className="bg-orange-600 text-white px-6 py-3 rounded-lg hover:bg-orange-700 transition-colors"
          >
            Voltar aos eventos
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
            onClick={() => navigate("/events")}
            className="flex items-center gap-2 text-gray-600 cursor-pointer hover:text-orange-600 transition-all group"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            <span className="font-medium">Voltar</span>
          </button>
          <div className="flex items-center gap-2 text-orange-600">
            <Heart className="w-5 h-5 fill-orange-600" />
            <span className="font-semibold text-gray-800">Os Meus Favoritos</span>
          </div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-orange-600" />
            <span className="font-bold text-gray-900">Cresce.AO</span>
          </div>
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
          <div className="relative z-10 flex items-center justify-between">
            <div>
              <p className="text-orange-100 text-sm font-medium mb-2 uppercase tracking-wider">Colecção Pessoal</p>
              <h1 className="text-4xl md:text-5xl font-bold mb-2">Favoritos</h1>
              <p className="text-orange-100">
                {events.length === 0
                  ? 'Ainda não marcou nenhum evento'
                  : `${events.length} ${events.length === 1 ? 'evento guardado' : 'eventos guardados'}`}
              </p>
            </div>
            <div className="hidden md:flex w-20 h-20 rounded-2xl bg-white/20 backdrop-blur items-center justify-center shadow-lg">
              <Heart className="w-10 h-10 fill-white text-white" />
            </div>
          </div>
        </motion.div>

        {/* Events Grid */}
        <AnimatePresence mode="wait">
          {events.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center py-24 text-center"
            >
              <div className="w-24 h-24 bg-orange-100 rounded-full flex items-center justify-center mb-6">
                <Bookmark className="w-12 h-12 text-orange-400" />
              </div>
              <h3 className="text-2xl font-bold text-gray-800 mb-2">Sem favoritos ainda</h3>
              <p className="text-gray-500 max-w-sm">
                Explore os eventos e clique no ícone de coração para guardar os que mais lhe interessam.
              </p>
              <button onClick={() => navigate('/events')}
                className="mt-6 px-6 py-3 bg-orange-600 text-white cursor-pointer rounded-xl hover:bg-orange-700 transition-all font-medium shadow-lg"
              >
                Explorar Eventos
              </button>
            </motion.div>
          ) : filtered.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-16 text-gray-500"
            >
              <p>Nenhum favorito encontrado com esses filtros.</p>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
            >
              {filtered.map((event, index) => (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.04 }}
                  className="group bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-orange-200 cursor-pointer"
                  onClick={() => handleEventClick(event.id)}
                >
                  {/* Image */}
                  <div className="relative overflow-hidden aspect-video">
                    <img
                      src={event.image}
                      alt={event.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800';
                      }}
                    />
                    {/* Category badge */}
                    <span className={`absolute top-3 left-3 px-2.5 py-1 rounded-full text-xs font-semibold ${categoryColor[event.category] || 'bg-gray-100 text-gray-700'}`}>
                      {event.category}
                    </span>
                    {/* Remove from favorites */}
                    <button
                      onClick={(e) => { e.stopPropagation(); handleLikeToggle(event.id); }}
                      className="absolute top-3 right-3 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-md hover:scale-110 transition-transform"
                      title="Remover dos favoritos"
                    >
                      <Heart className="w-4 h-4 fill-red-500 text-red-500" />
                    </button>
                    {/* Price */}
                    {event.price ? (
                      <div className="absolute bottom-3 right-3 px-2.5 py-1 bg-black/70 text-white text-xs font-semibold rounded-lg backdrop-blur-sm">
                        {event.price.toLocaleString('pt-AO')} Kz
                      </div>
                    ) : (
                      <div className="absolute bottom-3 right-3 px-2.5 py-1 bg-green-600/90 text-white text-xs font-semibold rounded-lg backdrop-blur-sm">
                        Gratuito
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2 group-hover:text-orange-600 transition-colors">
                      {event.name}
                    </h3>
                    <div className="space-y-1.5 text-sm text-gray-500">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-orange-500 flex-shrink-0" />
                        <span>{formatDate(event.date)}</span>
                        <Clock className="w-3.5 h-3.5 text-orange-500 flex-shrink-0 ml-1" />
                        <span>{event.time}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-orange-500 flex-shrink-0" />
                        <span className="truncate">{event.eventType === 'online' ? 'Online' : event.location}</span>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                      <span className="text-xs text-gray-500">{event.organizerName}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        event.eventType === 'online' ? 'bg-blue-100 text-blue-700' :
                        event.eventType === 'híbrido' ? 'bg-purple-100 text-purple-700' :
                          'bg-orange-100 text-orange-700'
                      }`}>
                        {event.eventType}
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}