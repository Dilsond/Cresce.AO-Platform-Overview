import { useState, useEffect } from 'react';
import { Heart, ArrowLeft, MapPin, Calendar, Clock, Search, Bookmark, Sparkles, Users, CalendarDays, Building2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import logo from "../assets/logo.png";

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

export interface FavoriteOrganizer {
  id: string;
  organizerId: string;
  name: string;
  email: string;
  logo?: string;
  location?: string;
  description?: string;
  eventosCount: number;
  likes: number;
  createdAt: string;
}

export function FavoritesPage() {
  const [activeTab, setActiveTab] = useState<'events' | 'organizers'>('events');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Todas');
  const [likedEvents, setLikedEvents] = useState<string[]>([]);
  const [likedOrganizers, setLikedOrganizers] = useState<string[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [organizers, setOrganizers] = useState<FavoriteOrganizer[]>([]);
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

  // Verificar se o usuário é normal (pode ver a aba de organizadores)
  const isNormalUser = currentUser?.type === 'user';

  // Buscar favoritos do usuário
  useEffect(() => {
    if (currentUser) {
      fetchUserLikes();
    } else {
      navigate('/login');
    }
  }, [currentUser, activeTab]);

  // Buscar eventos favoritos do usuário
  const fetchUserLikes = async () => {
    if (!currentUser) return;

    try {
      setIsLoading(true);
      setError(null);

      if (activeTab === 'events') {
        await fetchFavoriteEvents();
      } else if (isNormalUser) {
        // Só busca organizadores se for usuário normal
        await fetchFavoriteOrganizers();
      }

    } catch (err) {
      console.error('Erro inesperado:', err);
      setError('Ocorreu um erro ao carregar favoritos');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchFavoriteEvents = async () => {
    try {
      console.log('Buscando eventos favoritos do usuário:', currentUser?.id);

      // Construir query baseada no tipo de usuário
      let query = supabase.from('favoritos_eventos').select('evento_id');

      if (currentUser?.type === 'user') {
        query = query.eq('usuario_normal_id', currentUser.id);
      } else if (currentUser?.type === 'organizer') {
        query = query.eq('organizador_id', currentUser.id);
      }

      const { data: favorites, error: favError } = await query;

      if (favError) {
        console.error('Erro ao buscar favoritos:', favError);
        setError('Erro ao carregar favoritos');
        return;
      }

      const likedIds = favorites.map(fav => fav.evento_id);
      setLikedEvents(likedIds);
      localStorage.setItem('cresceao_liked', JSON.stringify(likedIds));

      if (likedIds.length === 0) {
        setEvents([]);
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
        return;
      }

      // Filtrar apenas eventos cujo organizador NÃO está deletado
      const eventosValidos = [];

      for (const evento of eventos || []) {
        const { data: organizador, error: orgError } = await supabase
          .from('organizadores')
          .select('nome_empresa, id, deleted_at')
          .eq('id', evento.organizador_id)
          .single();

        if (orgError || organizador?.deleted_at) {
          console.log(`Evento ${evento.id} ignorado: organizador não disponível`);
          continue;
        }

        // Buscar contagem de likes para este evento
        const { count: likesCount } = await supabase
          .from('favoritos_eventos')
          .select('*', { count: 'exact', head: true })
          .eq('evento_id', evento.id);

        eventosValidos.push({
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
          organizerId: organizador.id,
          organizerName: organizador.nome_empresa || 'Organizador',
          likes: likesCount || 0
        });
      }

      setEvents(eventosValidos);
    } catch (err) {
      console.error('Erro ao buscar eventos favoritos:', err);
    }
  };

  const fetchFavoriteOrganizers = async () => {
    try {
      console.log('Buscando organizadores favoritos do usuário normal:', currentUser?.id);

      // Buscar IDs dos organizadores favoritados (apenas para usuários normais)
      const { data: favorites, error: favError } = await supabase
        .from('favoritos_organizadores')
        .select('organizador_favoritado_id')
        .eq('usuario_normal_id', currentUser?.id);

      if (favError) {
        console.error('Erro ao buscar favoritos de organizadores:', favError);
        setError('Erro ao carregar organizadores favoritos');
        return;
      }

      const likedIds = favorites.map(fav => fav.organizador_favoritado_id);
      setLikedOrganizers(likedIds);

      if (likedIds.length === 0) {
        setOrganizers([]);
        return;
      }

      // Buscar detalhes dos organizadores
      const { data: organizadores, error: orgError } = await supabase
        .from('organizadores')
        .select('*')
        .in('id', likedIds)
        .is('deleted_at', null);

      if (orgError) {
        console.error('Erro ao buscar organizadores:', orgError);
        setError('Erro ao carregar organizadores');
        return;
      }

      // Para cada organizador, buscar contagem de eventos e likes
      const organizadoresCompletos = await Promise.all(
        organizadores.map(async (org) => {
          // Contar eventos deste organizador
          const { count: eventosCount } = await supabase
            .from('eventos')
            .select('*', { count: 'exact', head: true })
            .eq('organizador_id', org.id)
            .is('deleted_at', null);

          // Contar quantas vezes este organizador foi favoritado
          const { count: likesCount } = await supabase
            .from('favoritos_organizadores')
            .select('*', { count: 'exact', head: true })
            .eq('organizador_favoritado_id', org.id);

          return {
            id: org.id,
            organizerId: org.id,
            name: org.nome_empresa,
            email: org.email_empresa,
            logo: org.avatar_url,
            location: org.localizacao,
            description: org.sobre,
            eventosCount: eventosCount || 0,
            likes: likesCount || 0,
            createdAt: org.created_at
          };
        })
      );

      setOrganizers(organizadoresCompletos);
    } catch (err) {
      console.error('Erro ao buscar organizadores favoritos:', err);
    }
  };

  const handleRemoveEventLike = async (eventId: string) => {
    if (!currentUser) return;

    try {
      let query = supabase.from('favoritos_eventos').delete().eq('evento_id', eventId);

      if (currentUser.type === 'user') {
        query = query.eq('usuario_normal_id', currentUser.id);
      } else if (currentUser.type === 'organizer') {
        query = query.eq('organizador_id', currentUser.id);
      }

      const { error } = await query;

      if (error) throw error;

      // Atualizar estado local
      setLikedEvents(prev => prev.filter(id => id !== eventId));
      setEvents(prev => prev.filter(event => event.id !== eventId));
    } catch (err) {
      console.error('Erro ao remover evento favorito:', err);
    }
  };

  const handleRemoveOrganizerLike = async (organizerId: string) => {
    if (!currentUser || !isNormalUser) return;

    try {
      const { error } = await supabase
        .from('favoritos_organizadores')
        .delete()
        .eq('organizador_favoritado_id', organizerId)
        .eq('usuario_normal_id', currentUser.id);

      if (error) throw error;

      // Atualizar estado local
      setLikedOrganizers(prev => prev.filter(id => id !== organizerId));
      setOrganizers(prev => prev.filter(org => org.organizerId !== organizerId));
    } catch (err) {
      console.error('Erro ao remover organizador favorito:', err);
    }
  };

  const handleEventClick = (eventId: string) => {
    navigate(`/event/${eventId}`);
  };

  const handleOrganizerClick = (organizerId: string) => {
    navigate(`/organizer/${organizerId}`);
  };

  const categories = ['Todas', 'Palestras', 'Workshops', 'Feiras', 'Masterclasses'];

  // Filtrar eventos
  const filteredEvents = events.filter(event => {
    const matchesSearch = searchQuery === '' ||
      event.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.location.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'Todas' || event.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Filtrar organizadores (apenas para usuários normais)
  const filteredOrganizers = organizers.filter(org => {
    return searchQuery === '' ||
      org.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      org.location?.toLowerCase().includes(searchQuery.toLowerCase());
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
  // if (isLoading) {
  //   return (
  //     <div className="min-h-screen bg-gray-50 flex items-center justify-center">
  //       <div className="text-center">
  //         <div className="w-16 h-16 border-4 border-orange-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
  //         <p className="text-gray-600">Carregando favoritos...</p>
  //       </div>
  //     </div>
  //   );
  // }

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

  const hasEvents = activeTab === 'events' && events.length > 0;
  const hasOrganizers = activeTab === 'organizers' && organizers.length > 0;

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
          <div className="flex items-center">
            <img src={logo} alt="Cresce.AO Logo" className="h-10 w-auto object-contain" />
            <span className="text-xl font-bold text-gray-900 tracking-tight">
              Cresce<span className="text-orange-600">.AO</span>
            </span>
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
                {activeTab === 'events'
                  ? `${events.length} ${events.length === 1 ? 'evento' : 'eventos'} guardados`
                  : `${organizers.length} ${organizers.length === 1 ? 'organizador' : 'organizadores'} guardados`}
              </p>
            </div>
            <div className="hidden md:flex w-20 h-20 rounded-2xl bg-white/20 backdrop-blur items-center justify-center shadow-lg">
              <Heart className="w-10 h-10 fill-white text-white" />
            </div>
          </div>
        </motion.div>

        {/* Tabs - Mostrar apenas a aba de organizadores para usuários normais */}
        <div className="flex gap-2 border-b border-gray-200 pb-2">
          <button
            onClick={() => setActiveTab('events')}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl border cursor-pointer text-sm font-semibold rounded-t-lg transition-all ${
              activeTab === 'events'
                ? 'bg-orange-600 text-white'
                : 'text-gray-600 hover:text-orange-600 hover:bg-orange-50'
            }`}
          >
            <CalendarDays className="w-4 h-4" />
            Eventos Favoritos ({events.length})
          </button>
          
          {/* Só mostrar a aba de organizadores se for usuário normal */}
          {isNormalUser && (
            <button
              onClick={() => setActiveTab('organizers')}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl border cursor-pointer text-sm font-semibold rounded-t-lg transition-all ${
                activeTab === 'organizers'
                  ? 'bg-orange-600 text-white'
                  : 'text-gray-600 hover:text-orange-600 hover:bg-orange-50'
              }`}
            >
              <Building2 className="w-4 h-4" />
              Organizadores Favoritos ({organizers.length})
            </button>
          )}
        </div>

        {/* Search - só mostrar se houver itens na aba atual */}
        {(hasEvents || (isNormalUser && hasOrganizers)) && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex flex-col sm:flex-row gap-4"
          >
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder={`Pesquisar ${activeTab === 'events' ? 'eventos' : 'organizadores'} favoritos...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-4xl pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none text-sm"
              />
            </div>
          </motion.div>
        )}

        {/* Content based on active tab */}
        <AnimatePresence mode="wait">
          {activeTab === 'events' ? (
            // Eventos Favoritos (disponível para todos)
            <motion.div
              key="events"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              {events.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mb-4">
                    <CalendarDays className="w-10 h-10 text-orange-400" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-800 mb-2">Sem eventos favoritos</h3>
                  <p className="text-gray-500 max-w-sm">
                    Explore os eventos e clique no coração para guardar os que mais lhe interessam.
                  </p>
                </div>
              ) : filteredEvents.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  Nenhum evento encontrado com esses filtros.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {filteredEvents.map((event, index) => (
                    <motion.div
                      key={event.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.04 }}
                      className="group bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all border border-gray-100 hover:border-orange-200 cursor-pointer"
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
                        <span className={`absolute top-3 left-3 px-2.5 py-1 rounded-full text-xs font-semibold ${categoryColor[event.category] || 'bg-gray-100 text-gray-700'}`}>
                          {event.category}
                        </span>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleRemoveEventLike(event.id); }}
                          className="absolute top-3 right-3 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-md hover:scale-110 transition-transform"
                          title="Remover dos favoritos"
                        >
                          <Heart className="w-4 h-4 fill-red-500 text-red-500" />
                        </button>
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
                        <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2 group-hover:text-orange-600">
                          {event.name}
                        </h3>
                        <div className="space-y-1.5 text-sm text-gray-500">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-orange-500" />
                            <span>{formatDate(event.date)}</span>
                            <Clock className="w-3.5 h-3.5 text-orange-500 ml-1" />
                            <span>{event.time}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-orange-500" />
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
                </div>
              )}
            </motion.div>
          ) : (
            // Organizadores Favoritos (apenas para usuários normais)
            isNormalUser && (
              <motion.div
                key="organizers"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
              >
                {organizers.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mb-4">
                      <Building2 className="w-10 h-10 text-orange-400" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-800 mb-2">Sem organizadores favoritos</h3>
                    <p className="text-gray-500 max-w-sm">
                      Explore os organizadores e clique no coração para guardar os que mais gosta.
                    </p>
                  </div>
                ) : filteredOrganizers.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    Nenhum organizador encontrado com esses filtros.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredOrganizers.map((org, index) => (
                      <motion.div
                        key={org.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.04 }}
                        className="group bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all border border-gray-100 hover:border-orange-200 cursor-pointer"
                        onClick={() => handleOrganizerClick(org.organizerId)}
                      >
                        <div className="p-6">
                          <div className="flex items-center gap-4 mb-4">
                            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
                              {org.logo ? (
                                <img src={org.logo} alt={org.name} className="w-full h-full rounded-full object-cover" />
                              ) : (
                                org.name.charAt(0).toUpperCase()
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-gray-900 text-lg truncate group-hover:text-orange-600">
                                {org.name}
                              </h3>
                              <p className="text-sm text-gray-500 truncate">{org.email}</p>
                            </div>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleRemoveOrganizerLike(org.organizerId); }}
                              className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-md hover:scale-110 transition-transform"
                              title="Remover dos favoritos"
                            >
                              <Heart className="w-4 h-4 fill-red-500 text-red-500" />
                            </button>
                          </div>

                          {org.location && (
                            <div className="flex items-center gap-1.5 text-sm text-gray-500 mb-2">
                              <MapPin className="w-3.5 h-3.5 text-orange-500" />
                              <span className="truncate">{org.location}</span>
                            </div>
                          )}

                          <p className="text-sm text-gray-600 line-clamp-2 mb-4">
                            {org.description || 'Organizador de eventos na plataforma Cresce.AO'}
                          </p>

                          <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                            <div className="flex items-center gap-2">
                              <CalendarDays className="w-4 h-4 text-orange-500" />
                              <span className="text-xs text-gray-600">{org.eventosCount} eventos</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Heart className="w-4 h-4 text-red-500 fill-red-500" />
                              <span className="text-xs font-medium text-gray-600">{org.likes}</span>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>
            )
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}