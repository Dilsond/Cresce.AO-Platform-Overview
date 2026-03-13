import { useState, useEffect } from 'react';
import { Search, MapPin, Heart, User, LogOut, LayoutDashboard, PlusCircle, CalendarDays, ChevronDown, Menu, X, ChevronRight, Sparkles } from 'lucide-react';
import { Button } from './ui/button';
import logo from "../assets/logo.png";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { EventCardSkeleton } from './EventCardSkeleton';
import { Footer } from './Footer';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export type UserType = 'user' | 'organizer';

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
  price?: number;
}

export function EventsPage() {
  const navigate = useNavigate();
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // pegar usuário do localStorage
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const u = localStorage.getItem('user');
      console.log('Usuário do localStorage:', u);
      return u ? JSON.parse(u) : null;
    } catch (err) {
      console.error('Erro ao parsear usuário:', err);
      return null;
    }
  });

  // Estado para eventos favoritados
  const [likedEvents, setLikedEvents] = useState<string[]>([]);

  // Buscar eventos e favoritos do usuário
  useEffect(() => {
    console.log('useEffect - currentUser:', currentUser);
    if (currentUser) {
      fetchEvents();
      fetchUserLikes();
    }
  }, [currentUser]);

  // Buscar eventos favoritos do usuário
  const fetchUserLikes = async () => {
    if (!currentUser) {
      console.log('fetchUserLikes: usuário não logado');
      return;
    }

    console.log('fetchUserLikes - currentUser:', currentUser);

    try {
      let query = supabase.from('favoritos_eventos').select('evento_id');

      // Filtrar baseado no tipo de usuário
      if (currentUser.type === 'user') {
        query = query.eq('usuario_normal_id', currentUser.id);
      } else if (currentUser.type === 'organizer') {
        query = query.eq('organizador_id', currentUser.id);
      }

      const { data: favorites, error } = await query;

      if (error) {
        console.error('Erro ao buscar favoritos:', error);
        return;
      }

      console.log('Favoritos encontrados:', favorites);

      // Obter os IDs dos favoritos
      const likedIds = favorites.map(fav => fav.evento_id);

      // Verificar quais destes eventos ainda existem e são válidos
      if (likedIds.length > 0) {
        const { data: eventosValidos, error: eventosError } = await supabase
          .from('eventos')
          .select('id')
          .in('id', likedIds)
          .is('deleted_at', null);

        if (eventosError) {
          console.error('Erro ao verificar eventos válidos:', eventosError);
        } else {
          // Filtrar apenas os IDs que correspondem a eventos válidos
          const idsValidos = eventosValidos.map(e => e.id);

          // Opcionalmente, podes também verificar os organizadores
          // Mas isso seria mais complexo e poderia ser feito na página de favoritos

          console.log('IDs válidos:', idsValidos);
          setLikedEvents(idsValidos);
          localStorage.setItem('cresceao_liked', JSON.stringify(idsValidos));
          return;
        }
      }

      // Se não houver eventos para verificar ou se houver erro, usar os IDs originais
      setLikedEvents(likedIds);
      localStorage.setItem('cresceao_liked', JSON.stringify(likedIds));

    } catch (err) {
      console.error('Erro ao buscar favoritos:', err);
    }
  };

  // Função para alternar like
  const handleLikeToggle = async (eventId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    console.log('handleLikeToggle - eventId:', eventId);
    console.log('handleLikeToggle - currentUser:', currentUser);

    if (!currentUser) {
      console.log('Usuário não logado, redirecionando para login');
      navigate('/login');
      return;
    }

    try {
      const isLiked = likedEvents.includes(eventId);
      console.log('Evento já é favorito?', isLiked);

      let query = supabase.from('favoritos_eventos');

      if (isLiked) {
        console.log('Removendo dos favoritos...');

        // Construir query de deleção baseada no tipo de usuário
        if (currentUser.type === 'user') {
          query = query.delete()
            .eq('evento_id', eventId)
            .eq('usuario_normal_id', currentUser.id);
        } else if (currentUser.type === 'organizer') {
          query = query.delete()
            .eq('evento_id', eventId)
            .eq('organizador_id', currentUser.id);
        }

        const { error } = await query;

        if (error) {
          console.error('Erro ao remover favorito:', error);
          console.error('Detalhes do erro:', {
            code: error.code,
            message: error.message,
            details: error.details
          });
          return;
        }

        console.log('Removido com sucesso');

        // Atualizar estado local
        const newLikedEvents = likedEvents.filter(id => id !== eventId);
        setLikedEvents(newLikedEvents);
        localStorage.setItem('cresceao_liked', JSON.stringify(newLikedEvents));

        // Atualizar contagem de likes no evento
        setEvents(prevEvents =>
          prevEvents.map(event =>
            event.id === eventId
              ? { ...event, likes: Math.max(0, event.likes - 1) }
              : event
          )
        );

      } else {
        console.log('Adicionando aos favoritos...');

        // Construir objeto de inserção baseado no tipo de usuário
        const insertData: any = {
          evento_id: eventId,
          created_at: new Date().toISOString()
        };

        if (currentUser.type === 'user') {
          insertData.usuario_normal_id = currentUser.id;
        } else if (currentUser.type === 'organizer') {
          insertData.organizador_id = currentUser.id;
        }

        const { error } = await supabase
          .from('favoritos_eventos')
          .insert(insertData);

        if (error) {
          console.error('Erro ao adicionar favorito:', error);
          console.error('Detalhes do erro:', {
            code: error.code,
            message: error.message,
            details: error.details
          });
          return;
        }

        console.log('Adicionado com sucesso');

        // Atualizar estado local
        const newLikedEvents = [...likedEvents, eventId];
        setLikedEvents(newLikedEvents);
        localStorage.setItem('cresceao_liked', JSON.stringify(newLikedEvents));

        // Atualizar contagem de likes no evento
        setEvents(prevEvents =>
          prevEvents.map(event =>
            event.id === eventId
              ? { ...event, likes: event.likes + 1 }
              : event
          )
        );
      }
    } catch (err) {
      console.error('Erro ao alternar like:', err);
    }
  };

  // Função para formatar hora (remover segundos)
  const formatTime = (time: string) => {
    if (!time) return '';
    // Se tiver no formato HH:MM:SS, pegar apenas HH:MM
    return time.split(':').slice(0, 2).join(':');
  };

  // Buscar eventos do Supabase
  const fetchEvents = async () => {
    try {
      setIsLoading(true);
      setError(null);

      console.log('Buscando eventos...');

      // Primeiro, buscar todos os eventos não deletados
      const { data: eventos, error: eventosError } = await supabase
        .from('eventos')
        .select('*')
        .is('deleted_at', null)
        .order('data_evento', { ascending: true });

      if (eventosError) {
        console.error('Erro ao buscar eventos:', eventosError);
        setError('Erro ao carregar eventos.');
        return;
      }

      console.log('Eventos encontrados:', eventos);

      if (!eventos || eventos.length === 0) {
        setEvents([]);
        return;
      }

      // Filtrar apenas eventos cujo organizador não está deletado
      const eventosValidos = [];

      for (const evento of eventos) {
        // Buscar organizador e verificar se não está deletado
        const { data: organizador, error: orgError } = await supabase
          .from('organizadores')
          .select('nome_empresa, id, deleted_at')
          .eq('id', evento.organizador_id)
          .single();

        if (orgError) {
          console.error(`Erro ao buscar organizador para evento ${evento.id}:`, orgError);
          continue; // Pular este evento se não encontrar organizador
        }

        // Verificar se organizador está deletado
        if (organizador.deleted_at) {
          console.log(`Evento ${evento.id} ignorado: organizador deletado`);
          continue; // Pular este evento se organizador estiver deletado
        }

        // Buscar contagem de likes para este evento
        const { count: likesCount, error: likesError } = await supabase
          .from('favoritos_eventos')
          .select('*', { count: 'exact', head: true })
          .eq('evento_id', evento.id);

        if (likesError) {
          console.error(`Erro ao buscar likes para evento ${evento.id}:`, likesError);
        }

        const hoje = new Date();
        const dataEvento = new Date(evento.data_evento);


        let status = "A decorrer";

        if (dataEvento < hoje) {
          status = "Finalizado";
        }

        eventosValidos.push({
          id: evento.id,
          name: evento.nome_evento,
          description: evento.descricao || 'Sem descrição disponível',
          category: evento.categoria,
          date: evento.data_evento,
          time: formatTime(evento.hora_evento),
          eventType: evento.tipo_evento,
          location: evento.local || 'Local a definir',
          price: evento.valor || 0,
          image: evento.imagem_url || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800',
          status,
          organizerId: organizador.id,
          organizerName: organizador.nome_empresa || 'Organizador não identificado',
          likes: likesCount || 0
        });
      }

      console.log('Eventos válidos encontrados:', eventosValidos);
      setEvents(eventosValidos);

    } catch (err) {
      console.error('Erro inesperado:', err);
      setError('Ocorreu um erro inesperado ao carregar eventos.');
    } finally {
      setIsLoading(false);
    }
  };

  // redirecionar se não estiver logado
  useEffect(() => {
    console.log('Verificando autenticação - currentUser:', currentUser);
    if (!currentUser) {
      console.log('Usuário não logado, redirecionando para login');
      navigate('/login');
    }
  }, [currentUser, navigate]);

  // logout
  const onLogout = () => {
    localStorage.removeItem('user');
    navigate('/login');
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Todas');
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>('Todas');
  const [selectedEventType, setSelectedEventType] = useState<string>('Todos');
  const [selectedPriceFilter, setSelectedPriceFilter] = useState<string>('Todos');
  const [sortBy, setSortBy] = useState<string>('Relevância');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const onNavigateToProfile = () => {
    if (!currentUser) return;
    if (currentUser.type === 'organizer') navigate('/organizer-profile');
    else navigate('/user-dashboard');
  };

  const categories = ['Todas', 'palestra', 'workshop', 'feiras', 'masterclasse'];
  const dateFilters = ['Todas', 'Hoje', 'Esta Semana', 'Este Mês', 'Próximos 3 Meses'];
  const eventTypes = ['Todos', 'presencial', 'online', 'hibrido'];
  const priceFilters = ['Todos', 'Gratuito', 'Pago'];

  const categoryLabels: Record<string, string> = {
    palestra: "Palestra",
    workshop: "Workshop",
    feiras: "Feira",
    masterclasse: "Masterclasse"
  };

  // --- Filtragem ---
  const filteredEvents = events.filter(event => {
    const matchesSearch = searchQuery === '' ||
      event.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.organizerName.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = selectedCategory === 'Todas' || event.category === selectedCategory;
    const matchesEventType = selectedEventType === 'Todos' || event.eventType === selectedEventType;

    let matchesPrice = true;
    if (selectedPriceFilter === 'Gratuito') matchesPrice = !event.price || event.price === 0;
    if (selectedPriceFilter === 'Pago') matchesPrice = !!event.price && event.price > 0;

    let matchesDate = true;
    const eventDate = new Date(event.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (selectedDateFilter === 'Hoje') {
      matchesDate = eventDate.toDateString() === today.toDateString();
    } else if (selectedDateFilter === 'Esta Semana') {
      const weekFromNow = new Date(today);
      weekFromNow.setDate(today.getDate() + 7);
      matchesDate = eventDate >= today && eventDate <= weekFromNow;
    } else if (selectedDateFilter === 'Este Mês') {
      matchesDate = eventDate.getMonth() === today.getMonth() && eventDate.getFullYear() === today.getFullYear();
    } else if (selectedDateFilter === 'Próximos 3 Meses') {
      const threeMonthsFromNow = new Date(today);
      threeMonthsFromNow.setMonth(today.getMonth() + 3);
      matchesDate = eventDate >= today && eventDate <= threeMonthsFromNow;
    }

    return matchesSearch && matchesCategory && matchesEventType && matchesPrice && matchesDate;
  });

  // Ordenação
  const sortedEvents = [...filteredEvents].sort((a, b) => {
    if (sortBy === 'Relevância') {
      return b.likes - a.likes || new Date(a.date).getTime() - new Date(b.date).getTime();
    } else if (sortBy === 'Data: Próximos') {
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    } else if (sortBy === 'Data: Distantes') {
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    } else if (sortBy === 'Preço: Menor para Maior') {
      return (a.price || 0) - (b.price || 0);
    } else if (sortBy === 'Preço: Maior para Menor') {
      return (b.price || 0) - (a.price || 0);
    }
    return 0;
  });

  if (!currentUser) return null;

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      {/* Navbar */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-6 flex-1">
            <div
              className="flex items-center"
            >
              <img
                src={logo}
                alt="Cresce.AO Logo"
                className="h-10 w-auto object-contain"
              />

              <span className="text-xl font-bold text-gray-900 tracking-tight">
                Cresce<span className="text-orange-600">.AO</span>
              </span>
            </div>
            <div className="hidden md:flex items-center w-full max-w-2xl bg-gray-100 rounded-lg border border-gray-200">
              <div className="pl-3 text-gray-400"><Search className="w-5 h-5" /></div>
              <input
                type="text"
                placeholder="Buscar experiências"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent border-none border-gray-200 py-2.5 px-3 text-sm focus:outline-none placeholder:text-gray-500 text-gray-900"
              />
            </div>
          </div>

          <div className="hidden lg:flex items-center gap-4">
            {currentUser.type === 'organizer' && (
              <>
                <Button variant="ghost" onClick={() => navigate('/create-event')} className="text-gray-600 cursor-pointer hover:text-orange-600 flex gap-2">
                  <PlusCircle className="w-5 h-5" /> Criar evento
                </Button>
                <Button variant="ghost" onClick={() => navigate('/organizer-dashboard')} className="text-gray-600 cursor-pointer hover:text-orange-600 flex gap-2">
                  <LayoutDashboard className="w-5 h-5" /> Meus eventos
                </Button>
              </>
            )}
            <Button variant="ghost" onClick={() => navigate('/favorites')} className="text-gray-600 cursor-pointer hover:text-orange-600 flex gap-2">
              <Heart className="w-5 h-5" />
              Favoritos {likedEvents.length > 0 && <span className="ml-1 bg-orange-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">{likedEvents.length}</span>}
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="rounded-full w-10 h-10 cursor-pointer p-0 border border-gray-200">
                  <User className="w-5 h-5 text-gray-600" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem className="text-sm font-medium">
                  {currentUser.type === "organizer" ? currentUser.name : currentUser.username}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onNavigateToProfile} className="cursor-pointer">Perfil</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onLogout} className="cursor-pointer text-red-600">
                  <LogOut className="w-5 h-5 mr-2" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
          <span className="hover:text-orange-600 cursor-pointer">Página inicial</span>
          <ChevronRight className="w-4 h-4" />
          <span className="text-gray-900 font-medium">Encontre eventos</span>
        </div>

        {/* Page Title & Filters Header */}
        <div className="flex flex-col gap-6 mb-8">
          <div className="flex items-baseline justify-between flex-wrap gap-4">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900">Encontre eventos</h1>
          </div>

          {/* Filters Bar */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-gray-100 pb-6">
            {/* Filter Groups */}
            <div className="flex items-center gap-2 md:gap-4 overflow-x-auto pb-2 lg:pb-0 hide-scrollbar">
              <span className="text-sm font-semibold text-gray-700 whitespace-nowrap">Filtrar por</span>

              {/* Category Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="rounded-full cursor-pointer border-gray-300 text-gray-700 hover:border-orange-500 hover:text-orange-600 h-10">
                    {selectedCategory === 'Todas' ? 'Categoria' : selectedCategory}
                    <ChevronDown className="w-4 h-4 ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {categories.map(cat => (
                    <DropdownMenuItem
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                    >
                      {cat === "Todas" ? "Todas" : categoryLabels[cat]}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Date Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="rounded-full border-gray-300 cursor-pointer text-gray-700 hover:border-orange-500 hover:text-orange-600 h-10">
                    {selectedDateFilter === 'Todas' ? 'Data' : selectedDateFilter}
                    <ChevronDown className="w-4 h-4 ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {dateFilters.map(date => (
                    <DropdownMenuItem key={date} onClick={() => setSelectedDateFilter(date)}>
                      {date}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Price Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="rounded-full border-gray-300 cursor-pointer text-gray-700 hover:border-orange-500 hover:text-orange-600 h-10">
                    {selectedPriceFilter === 'Todos' ? 'Preço' : selectedPriceFilter}
                    <ChevronDown className="w-4 h-4 ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {priceFilters.map(price => (
                    <DropdownMenuItem key={price} onClick={() => setSelectedPriceFilter(price)}>
                      {price}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Type Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="rounded-full border-gray-300 cursor-pointer text-gray-700 hover:border-orange-500 hover:text-orange-600 h-10">
                    {selectedEventType === 'Todos' ? 'Tipo Evento' : selectedEventType}
                    <ChevronDown className="w-4 h-4 ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {eventTypes.map(type => (
                    <DropdownMenuItem key={type} onClick={() => setSelectedEventType(type)}>
                      {type}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-2 whitespace-nowrap">
              <span className="text-sm font-semibold text-gray-700">Ordenar por</span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="bg-orange-50 text-orange-600 cursor-pointer border-orange-100 hover:bg-orange-100 hover:border-orange-200 h-10 px-4">
                    {sortBy}
                    <ChevronDown className="w-4 h-4 ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setSortBy('Relevância')}>Relevância</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortBy('Data: Próximos')}>Data: Próximos</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortBy('Data: Distantes')}>Data: Distantes</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortBy('Preço: Menor para Maior')}>Preço: Menor para Maior</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortBy('Preço: Maior para Menor')}>Preço: Maior para Menor</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {/* Mensagem de erro */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600 font-medium mb-2">Erro ao carregar eventos</p>
            <p className="text-red-600 text-sm mb-3">{error}</p>
            <button
              onClick={fetchEvents}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
            >
              Tentar novamente
            </button>
          </div>
        )}

        {/* Results Count */}
        <div className="mb-6">
          <h2 className="text-lg font-medium text-gray-600">
            {sortedEvents.length} {sortedEvents.length === 1 ? 'evento encontrado' : 'eventos encontrados'}
          </h2>
        </div>

        {/* Events Grid */}
        {isLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, index) => (
              <EventCardSkeleton key={index} />
            ))}
          </div>
        ) : sortedEvents.length === 0 && !error ? (
          <div className="text-center py-24 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
            <div className="bg-white p-4 rounded-full shadow-sm inline-block mb-4">
              <CalendarDays className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Nenhum evento encontrado</h3>
            <p className="text-gray-500 max-w-md mx-auto mb-6">Não encontramos eventos correspondentes aos seus filtros. Tente limpar os filtros ou buscar por outro termo.</p>
            <Button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('Todas');
                setSelectedDateFilter('Todas');
                setSelectedEventType('Todos');
                setSelectedPriceFilter('Todos');
              }}
              className="bg-orange-600 hover:bg-orange-700"
            >
              Limpar filtros
            </Button>
          </div>
        ) : !error && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {sortedEvents.map((event) => (
              <div
                key={event.id}
                className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-2xl hover:border-orange-200 hover:-translate-y-2 transition-all duration-300 cursor-pointer group flex flex-col h-full"
                onClick={() => navigate(`/event/${event.id}`)}
              >
                {/* Event Image */}
                <div className="relative aspect-[16/9] overflow-hidden bg-gray-900">
                  <img
                    src={event.image}
                    alt={event.name}
                    className="w-full h-full object-cover group-hover:scale-110 group-hover:opacity-90 transition-all duration-500"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800';
                    }}
                  />

                  {/* Overlay gradient on hover */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

                  {/* Category Badge */}
                  <div className="absolute top-3 left-3 transform group-hover:scale-110 transition-transform duration-300">
                    <Badge variant="secondary" className="bg-white/90 backdrop-blur-sm text-gray-900 hover:bg-white font-semibold shadow-sm">
                      {categoryLabels[event.category]}
                    </Badge>
                  </div>


                  {/* Likes Badge */}
                  <div className="absolute top-3 right-3 transform group-hover:scale-110 transition-transform duration-300">
                    <button
                      className="p-2 rounded-full bg-white/90 backdrop-blur-sm cursor-pointer hover:bg-white hover:scale-110 transition-all shadow-sm"
                      onClick={(e) => handleLikeToggle(event.id, e)}
                    >
                      <Heart
                        className={`w-5 h-5 transition-all duration-200 ${likedEvents.includes(event.id)
                          ? "text-red-500 fill-red-500 scale-110"
                          : "text-gray-600 hover:text-red-500"
                          }`}
                      />
                    </button>
                  </div>

                  <div className="absolute bottom-3 right-3 transform group-hover:scale-110 transition-transform duration-300">
                    <span className={`px-2 py-1 rounded-md text-xs font-bold uppercase tracking-wide bg-white/90 backdrop-blur-sm shadow-sm ${event.status === 'A decorrer' ? 'text-green-600' : 'text-gray-600'
                      }`}>
                      {event.status}
                    </span>
                  </div>


                  {/* Status/Type Badge */}
                  {/* <div className="absolute bottom-3 right-3 transform group-hover:scale-110 transition-transform duration-300">
                    <span className={`px-2 py-1 rounded-md text-xs font-bold uppercase tracking-wide bg-white/90 backdrop-blur-sm shadow-sm ${event.eventType === 'presencial' ? 'text-blue-600' :
                      event.eventType === 'online' ? 'text-green-600' : 'text-orange-600'
                      }`}>
                      {event.eventType}
                    </span>
                  </div> */}
                </div>

                {/* Event Details */}
                <div className="p-5 flex-1 flex flex-col bg-white group-hover:bg-gradient-to-b group-hover:from-white group-hover:to-orange-50/30 transition-all duration-300">
                  {/* Date & Time */}
                  <div className="flex items-center gap-2 mb-3">
                    <div className="bg-orange-50 text-orange-700 px-2 py-1 rounded text-xs font-bold uppercase border border-orange-100 group-hover:bg-orange-600 group-hover:text-white group-hover:border-orange-600 transition-all duration-300">
                      {new Date(event.date).toLocaleDateString('pt-PT', { month: 'short' }).replace('.', '')}
                    </div>
                    <span className="text-sm font-semibold text-gray-900 group-hover:text-orange-600 transition-colors duration-300">
                      {new Date(event.date).toLocaleDateString('pt-PT', { day: '2-digit' })} • {event.time}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2 leading-tight group-hover:text-orange-600 transition-colors duration-300">
                    {event.name}
                  </h3>

                  <div className="flex items-start gap-2 text-sm text-gray-500 mb-4 line-clamp-1 group-hover:text-gray-700 transition-colors duration-300">
                    <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0 group-hover:text-orange-600 transition-colors duration-300" />
                    <span className="truncate">{event.location}</span>
                  </div>

                  <div className="mt-auto pt-4 border-t border-gray-100 group-hover:border-orange-100 flex items-center justify-between transition-colors duration-300">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-gray-200 group-hover:bg-orange-100 flex items-center justify-center text-xs font-bold text-gray-600 group-hover:text-orange-600 transition-all duration-300">
                        {event.organizerName.charAt(0)}
                      </div>
                      <span className="text-xs text-gray-500 group-hover:text-gray-700 truncate max-w-[120px] transition-colors duration-300">{event.organizerName}</span>
                    </div>
                    <span className="text-sm font-bold text-green-600 group-hover:text-orange-600 group-hover:scale-110 transition-all duration-300">
                      {event.price ? `${event.price.toLocaleString()} Kz` : 'Grátis'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <Footer onNavigateToPrivacy={() => navigate('/privacy-policy')} onNavigateToTerms={() => navigate('/terms-of-use')} />
    </div>
  );
}