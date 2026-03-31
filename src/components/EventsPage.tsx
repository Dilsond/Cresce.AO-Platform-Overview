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
import { PushNotificationPrompt } from '../components/PushotificationsPrompt';
import { notificationService } from '../services/notificationService';
import { showLocalNotification } from '../lib/pushNotifications';
import { NotificationPermissionPrompt } from './NotificationsPermissionPrompt';

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
  organizerEmail?: string;
  logo: string;
  likes: number;
  price?: number;
}

export function EventsPage() {
  const navigate = useNavigate();
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // pegar usuário do localStorage
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const u = localStorage.getItem('user');
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
    if (currentUser) {
      fetchEvents();
      fetchUserLikes();
    }
  }, [currentUser]);

  // Buscar eventos favoritos do usuário
  const fetchUserLikes = async () => {
    if (!currentUser) return;

    try {
      let query = supabase.from('favoritos_eventos').select('evento_id');

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

      const likedIds = favorites.map(fav => fav.evento_id);

      if (likedIds.length > 0) {
        const { data: eventosValidos, error: eventosError } = await supabase
          .from('eventos')
          .select('id')
          .in('id', likedIds)
          .is('deleted_at', null);

        if (eventosError) {
          console.error('Erro ao verificar eventos válidos:', eventosError);
        } else {
          const idsValidos = eventosValidos.map(e => e.id);
          setLikedEvents(idsValidos);
          localStorage.setItem('cresceao_liked', JSON.stringify(idsValidos));
          return;
        }
      }

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

    if (!currentUser) {
      navigate('/login');
      return;
    }

    // Buscar informações do evento para notificação
    const evento = events.find(e => e.id === eventId);

    try {
      const isLiked = likedEvents.includes(eventId);
      let query = supabase.from('favoritos_eventos');

      if (isLiked) {
        // Remover like
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
          return;
        }

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
        // Adicionar like
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
          return;
        }

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

        // 🔔 NOTIFICAÇÃO: Enviar notificação para o organizador quando receber um like
        if (evento && currentUser.id !== evento.organizerId) {
          // Verificar se o organizador é diferente do usuário atual
          const { data: organizer } = await supabase
            .from('organizadores')
            .select('email_empresa, nome_empresa')
            .eq('id', evento.organizerId)
            .single();

          if (organizer) {
            // Mostrar notificação local (se o organizador estiver logado no mesmo navegador)
            showLocalNotification(
              '❤️ Novo Like!',
              `${currentUser.name || currentUser.username || 'Alguém'} curtiu seu evento: ${evento.name}`
            );

            // Enviar email de notificação
            await notificationService.sendEmailNotification(
              {
                id: `temp-${Date.now()}`,
                usuario_id: evento.organizerId,
                tipo_usuario: 'organizer',
                titulo: 'Novo Like!',
                mensagem: `${currentUser.name || currentUser.username || 'Um usuário'} curtiu seu evento: ${evento.name}`,
                tipo: 'novo_like',
                lida: false,
                created_at: new Date().toISOString()
              },
              organizer.email_empresa,
              organizer.nome_empresa
            );
          }
        }
      }
    } catch (err) {
      console.error('Erro ao alternar like:', err);
    }
  };

  // Função para formatar hora
  const formatTime = (time: string) => {
    if (!time) return '';
    return time.split(':').slice(0, 2).join(':');
  };

  // Buscar eventos do Supabase
  const fetchEvents = async () => {
    try {
      setIsLoading(true);
      setError(null);

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

      if (!eventos || eventos.length === 0) {
        setEvents([]);
        return;
      }

      const eventosValidos = [];

      for (const evento of eventos) {
        const { data: organizador, error: orgError } = await supabase
          .from('organizadores')
          .select('nome_empresa, id, deleted_at, avatar_url, email_empresa')
          .eq('id', evento.organizador_id)
          .single();

        if (orgError || organizador?.deleted_at) {
          continue;
        }

        const { count: likesCount } = await supabase
          .from('favoritos_eventos')
          .select('*', { count: 'exact', head: true })
          .eq('evento_id', evento.id);

        const hoje = new Date();
        const dataEvento = new Date(evento.data_evento);
        let status = dataEvento < hoje ? "Finalizado" : "A decorrer";

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
          organizerEmail: organizador.email_empresa,
          logo: organizador.avatar_url,
          organizerName: organizador.nome_empresa || 'Organizador',
          likes: likesCount || 0
        });
      }

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
    if (!currentUser) {
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
      {/* Navbar com responsividade */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Logo */}
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

          {/* Search Bar - Desktop */}
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

          {/* Desktop Actions */}
          <div className="hidden lg:flex items-center gap-4">
            {currentUser.type === 'organizer' && (
              <>
                <Button variant="ghost" onClick={() => navigate('/create-event')} className="text-gray-600 hover:text-orange-600 flex gap-2 text-sm">
                  <PlusCircle className="w-5 h-5" /> Criar evento
                </Button>
                <Button variant="ghost" onClick={() => navigate('/organizer-dashboard')} className="text-gray-600 hover:text-orange-600 flex gap-2 text-sm">
                  <LayoutDashboard className="w-5 h-5" /> Meus eventos
                </Button>
              </>
            )}

            <Button variant="ghost" onClick={() => navigate('/favorites')} className="text-gray-600 cursor-pointer hover:text-orange-600 flex gap-2">
              <Heart className="w-5 h-5" />
              Favoritos
              {/* {likedEvents.length > 0 && <span className="ml-1 bg-orange-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">{likedEvents.length}</span>} */}
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="rounded-full w-8 h-8 sm:w-10 sm:h-10 p-0 border border-gray-200">
                  <User className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 sm:w-56">
                <DropdownMenuItem className="text-sm font-medium truncate">
                  {currentUser.type === "organizer" ? currentUser.name : currentUser.username}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onNavigateToProfile}>Perfil</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onLogout} className="text-red-600">
                  <LogOut className="w-4 h-4 mr-2" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 text-gray-600 hover:text-orange-600"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-gray-200 bg-white shadow-lg">
            {/* Mobile Search */}
            <div className="p-4 border-b border-gray-100">
              <div className="flex items-center bg-gray-100 rounded-lg border border-gray-200">
                <div className="pl-3 text-gray-400">
                  <Search className="w-5 h-5" />
                </div>
                <input
                  type="text"
                  placeholder="Buscar experiências"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 bg-transparent border-none py-2.5 px-3 text-sm focus:outline-none"
                />
              </div>
            </div>

            {/* Mobile Actions */}
            <div className="p-4 space-y-2">
              {currentUser.type === 'organizer' && (
                <>
                  <button
                    onClick={() => {
                      navigate('/create-event');
                      setMobileMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 text-gray-700 hover:bg-orange-50 rounded-lg"
                  >
                    <PlusCircle className="w-5 h-5 text-orange-600" />
                    <span>Criar evento</span>
                  </button>
                  <button
                    onClick={() => {
                      navigate('/organizer-dashboard');
                      setMobileMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 text-gray-700 hover:bg-orange-50 rounded-lg"
                  >
                    <LayoutDashboard className="w-5 h-5 text-orange-600" />
                    <span>Meus eventos</span>
                  </button>
                </>
              )}

              <button
                onClick={() => {
                  navigate('/favorites');
                  setMobileMenuOpen(false);
                }}
                className="w-full flex items-center gap-3 px-3 py-2 text-gray-700 hover:bg-orange-50 rounded-lg"
              >
                <Heart className="w-5 h-5 text-red-500" />
                <span>Favoritos</span>
              </button>

              <Separator className="my-2" />

              <button
                onClick={() => {
                  onNavigateToProfile();
                  setMobileMenuOpen(false);
                }}
                className="w-full flex items-center gap-3 px-3 py-2 text-gray-700 hover:bg-orange-50 rounded-lg"
              >
                <User className="w-5 h-5 text-orange-600" />
                <span>Perfil</span>
              </button>

              <button
                onClick={() => {
                  onLogout();
                  setMobileMenuOpen(false);
                }}
                className="w-full flex items-center gap-3 px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg"
              >
                <LogOut className="w-5 h-5" />
                <span>Sair</span>
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ... resto do conteúdo ... */}
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

          {/* Filters Bar - Scroll horizontal em mobile */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-gray-100 pb-6">
            <div className="flex items-center gap-2 md:gap-4 overflow-x-auto pb-2 lg:pb-0 hide-scrollbar">
              <span className="text-sm font-semibold text-gray-700 whitespace-nowrap">Filtrar por</span>

              {/* Category Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="rounded-full cursor-pointer border-gray-300 text-gray-700 hover:border-orange-500 hover:text-orange-600 h-9 sm:h-10 text-sm">
                    {selectedCategory === 'Todas' ? 'Categoria' : selectedCategory}
                    <ChevronDown className="w-4 h-4 ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {categories.map(cat => (
                    <DropdownMenuItem key={cat} onClick={() => setSelectedCategory(cat)}>
                      {cat === "Todas" ? "Todas" : categoryLabels[cat]}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Date Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="rounded-full border-gray-300 cursor-pointer text-gray-700 hover:border-orange-500 hover:text-orange-600 h-9 sm:h-10 text-sm">
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
                  <Button variant="outline" className="rounded-full border-gray-300 cursor-pointer text-gray-700 hover:border-orange-500 hover:text-orange-600 h-9 sm:h-10 text-sm">
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
                  <Button variant="outline" className="rounded-full border-gray-300 cursor-pointer text-gray-700 hover:border-orange-500 hover:text-orange-600 h-9 sm:h-10 text-sm">
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
                  <Button variant="outline" className="bg-orange-50 text-orange-600 cursor-pointer border-orange-100 hover:bg-orange-100 hover:border-orange-200 h-9 sm:h-10 px-3 sm:px-4 text-sm">
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
          <div className="grid sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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

                  {/* Status Badge */}
                  <div className="absolute bottom-3 right-3 transform group-hover:scale-110 transition-transform duration-300">
                    <span className={`px-2 py-1 rounded-md text-xs font-bold uppercase tracking-wide bg-white/90 backdrop-blur-sm shadow-sm ${event.status === 'A decorrer' ? 'text-green-600' : 'text-gray-600'
                      }`}>
                      {event.status}
                    </span>
                  </div>
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
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {event.logo ? (
                          <img src={event.logo} alt={event.name} className="w-full h-full rounded-full object-cover" />
                        ) : (
                          event.organizerName.charAt(0).toUpperCase()
                        )}
                      </div>
                      <span className="text-xs text-gray-500 group-hover:text-gray-700 truncate max-w-[100px] sm:max-w-[120px] transition-colors duration-300">
                        {event.organizerName}
                      </span>
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

        {currentUser && (
          <NotificationPermissionPrompt
            userId={currentUser.id}
            userType={currentUser.type}
          />
        )}
      </main>

      <Footer onNavigateToPrivacy={() => navigate('/privacy-policy')} onNavigateToTerms={() => navigate('/terms-of-use')} />
    </div>
  );
}