import { useState, useEffect } from 'react';
import {
  Search, MapPin, Heart, User, LogOut,
  CalendarDays, ChevronDown, Menu, X, ChevronRight,
  MessageSquare, Users
} from 'lucide-react';
import { Button } from './ui/button';
import logo from '../assets/logo.png';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { EventCardSkeleton } from './EventCardSkeleton';
import { Footer } from './Footer';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { supabase } from '../lib/supabase';
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
  avatarUrl?: string;
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
  const layoutContext = useOutletContext<{ searchQuery?: string }>();
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const u = localStorage.getItem('user');
      return u ? JSON.parse(u) : null;
    } catch { return null; }
  });

  const [likedEvents, setLikedEvents] = useState<string[]>([]);
  const [localSearchQuery, setLocalSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todas');
  const [selectedDateFilter, setSelectedDateFilter] = useState('Todas');
  const [selectedEventType, setSelectedEventType] = useState('Todos');
  const [selectedPriceFilter, setSelectedPriceFilter] = useState('Todos');
  const [sortBy, setSortBy] = useState('Relevância');

  const isOrganizer = currentUser?.type === 'organizer';

  // Usar searchQuery do layout se disponível, senão usar local
  const searchQuery = layoutContext?.searchQuery !== undefined ? layoutContext.searchQuery : localSearchQuery;

  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
    }
  }, [currentUser, navigate]);

  useEffect(() => {
    if (currentUser) {
      fetchEvents();
      fetchUserLikes();
    }
  }, [currentUser]);

  const fetchUserLikes = async () => {
    if (!currentUser) return;
    try {
      let query = supabase.from('favoritos_eventos').select('evento_id') as any;
      if (currentUser.type === 'user') {
        query = query.eq('usuario_normal_id', currentUser.id);
      } else {
        query = query.eq('organizador_id', currentUser.id);
      }
      const { data: favorites, error } = await query;
      if (error) return;
      const ids = favorites.map((f: any) => f.evento_id);
      if (ids.length > 0) {
        const { data: valid } = await supabase.from('eventos').select('id').in('id', ids).is('deleted_at', null);
        const validIds = (valid ?? []).map((e: any) => e.id);
        setLikedEvents(validIds);
        localStorage.setItem('cresceao_liked', JSON.stringify(validIds));
        return;
      }
      setLikedEvents(ids);
      localStorage.setItem('cresceao_liked', JSON.stringify(ids));
    } catch (err) { console.error(err); }
  };

  const handleLikeToggle = async (eventId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    if (!currentUser) {
      navigate('/login');
      return;
    }

    const evento = events.find((ev) => ev.id === eventId);
    try {
      const isLiked = likedEvents.includes(eventId);
      if (isLiked) {
        let q = supabase.from('favoritos_eventos').delete() as any;
        q = currentUser.type === 'user'
          ? q.eq('evento_id', eventId).eq('usuario_normal_id', currentUser.id)
          : q.eq('evento_id', eventId).eq('organizador_id', currentUser.id);
        const { error } = await q;
        if (error) return;
        const updated = likedEvents.filter((id) => id !== eventId);
        setLikedEvents(updated);
        localStorage.setItem('cresceao_liked', JSON.stringify(updated));
        setEvents((prev) => prev.map((ev) => ev.id === eventId ? { ...ev, likes: Math.max(0, ev.likes - 1) } : ev));
      } else {
        const data: any = { evento_id: eventId, created_at: new Date().toISOString() };
        if (currentUser.type === 'user') {
          data.usuario_normal_id = currentUser.id;
        } else {
          data.organizador_id = currentUser.id;
        }
        const { error } = await supabase.from('favoritos_eventos').insert(data);
        if (error) return;
        const updated = [...likedEvents, eventId];
        setLikedEvents(updated);
        localStorage.setItem('cresceao_liked', JSON.stringify(updated));
        setEvents((prev) => prev.map((ev) => ev.id === eventId ? { ...ev, likes: ev.likes + 1 } : ev));

        if (evento && currentUser.id !== evento.organizerId) {
          const { data: org } = await supabase
            .from('organizadores')
            .select('email_empresa, nome_empresa')
            .eq('id', evento.organizerId)
            .single();

          if (org) {
            // showLocalNotification('❤️ Novo Like!', `${currentUser.name || currentUser.username || 'Alguém'} curtiu: ${evento.name}`);
            await notificationService.sendEmailNotification(
              {
                id: `tmp-${Date.now()}`,
                usuario_id: evento.organizerId,
                tipo_usuario: 'organizer',
                titulo: 'Novo Like!',
                mensagem: `${currentUser.name || currentUser.username || 'Um usuário'} curtiu: ${evento.name}`,
                tipo: 'novo_like',
                lida: false,
                created_at: new Date().toISOString()
              },
              org.email_empresa,
              org.nome_empresa
            );
          }
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const formatTime = (t: string) => (t ? t.split(':').slice(0, 2).join(':') : '');

  const fetchEvents = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data: eventos, error: err } = await supabase
        .from('eventos')
        .select('*')
        .is('deleted_at', null)
        .order('data_evento', { ascending: true });

      if (err) {
        setError('Erro ao carregar eventos.');
        return;
      }

      if (!eventos?.length) {
        setEvents([]);
        return;
      }

      const valid: Event[] = [];
      for (const ev of eventos) {
        const { data: org, error: orgErr } = await supabase
          .from('organizadores')
          .select('nome_empresa,id,deleted_at,avatar_url,email_empresa')
          .eq('id', ev.organizador_id)
          .single();

        if (orgErr || org?.deleted_at) continue;

        const { count } = await supabase
          .from('favoritos_eventos')
          .select('*', { count: 'exact', head: true })
          .eq('evento_id', ev.id);

        const status = new Date(ev.data_evento) < new Date() ? 'Finalizado' : 'A decorrer';

        valid.push({
          id: ev.id,
          name: ev.nome_evento,
          description: ev.descricao || 'Sem descrição disponível',
          category: ev.categoria,
          date: ev.data_evento,
          time: formatTime(ev.hora_evento),
          eventType: ev.tipo_evento,
          location: ev.local || 'Local a definir',
          price: ev.valor || 0,
          image: ev.imagem_url || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800',
          status,
          organizerId: org.id,
          organizerEmail: org.email_empresa,
          logo: org.avatar_url,
          organizerName: org.nome_empresa || 'Organizador',
          likes: count || 0,
        });
      }
      setEvents(valid);
    } catch (err) {
      console.error('Erro ao buscar eventos:', err);
      setError('Ocorreu um erro inesperado ao carregar eventos.');
    } finally {
      setIsLoading(false);
    }
  };

  const onLogout = () => {
    localStorage.removeItem('user');
    navigate('/login');
  };

  const onNavigateToProfile = () => {
    if (isOrganizer) {
      navigate('/organizer-profile');
    } else {
      navigate('/user-dashboard');
    }
  };

  const categories = ['Todas', 'palestra', 'workshop', 'feiras', 'masterclasse'];
  const dateFilters = ['Todas', 'Hoje', 'Esta Semana', 'Este Mês', 'Próximos 3 Meses'];
  const eventTypes = ['Todos', 'presencial', 'online', 'hibrido'];
  const priceFilters = ['Todos', 'Gratuito', 'Pago'];
  const catLabels: Record<string, string> = {
    palestra: 'Palestra',
    workshop: 'Workshop',
    feiras: 'Feira',
    masterclasse: 'Masterclasse'
  };

  const filtered = events.filter((ev) => {
    const q = searchQuery.toLowerCase();
    const matchSearch = !q || ev.name.toLowerCase().includes(q) || ev.description.toLowerCase().includes(q) || ev.organizerName.toLowerCase().includes(q);
    const matchCat = selectedCategory === 'Todas' || ev.category === selectedCategory;
    const matchType = selectedEventType === 'Todos' || ev.eventType === selectedEventType;
    const matchPrice = selectedPriceFilter === 'Todos' || (selectedPriceFilter === 'Gratuito' ? !ev.price || ev.price === 0 : !!ev.price && ev.price > 0);
    const d = new Date(ev.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let matchDate = true;
    if (selectedDateFilter === 'Hoje') matchDate = d.toDateString() === today.toDateString();
    else if (selectedDateFilter === 'Esta Semana') {
      const w = new Date(today);
      w.setDate(today.getDate() + 7);
      matchDate = d >= today && d <= w;
    }
    else if (selectedDateFilter === 'Este Mês') matchDate = d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
    else if (selectedDateFilter === 'Próximos 3 Meses') {
      const m = new Date(today);
      m.setMonth(today.getMonth() + 3);
      matchDate = d >= today && d <= m;
    }
    return matchSearch && matchCat && matchType && matchPrice && matchDate;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'Relevância') return b.likes - a.likes || new Date(a.date).getTime() - new Date(b.date).getTime();
    if (sortBy === 'Data: Próximos') return new Date(a.date).getTime() - new Date(b.date).getTime();
    if (sortBy === 'Data: Distantes') return new Date(b.date).getTime() - new Date(a.date).getTime();
    if (sortBy === 'Preço: Menor para Maior') return (a.price || 0) - (b.price || 0);
    if (sortBy === 'Preço: Maior para Menor') return (b.price || 0) - (a.price || 0);
    return 0;
  });

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-orange-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Redirecionando para login...</p>
        </div>
      </div>
    );
  }

  const FiltersBar = () => (
    <div className="flex flex-col gap-3 border-b border-gray-100 pb-4 sm:pb-6">

      {/* Linha 1 — Filtrar por */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 hide-scrollbar">
        <span className="text-sm font-semibold text-gray-700 whitespace-nowrap">Filtrar por</span>
        {[
          { label: 'Categoria', value: selectedCategory, set: setSelectedCategory, opts: categories.map(c => ({ value: c, label: c === 'Todas' ? 'Todas' : catLabels[c] })) },
          { label: 'Data', value: selectedDateFilter, set: setSelectedDateFilter, opts: dateFilters.map(d => ({ value: d, label: d })) },
          { label: 'Preço', value: selectedPriceFilter, set: setSelectedPriceFilter, opts: priceFilters.map(p => ({ value: p, label: p })) },
          { label: 'Tipo Evento', value: selectedEventType, set: setSelectedEventType, opts: eventTypes.map(t => ({ value: t, label: t === 'Todos' ? 'Todos' : t === 'presencial' ? 'Presencial' : t === 'online' ? 'Online' : 'Híbrido' })) },
        ].map(({ label, value, set, opts }) => (
          <DropdownMenu key={label}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="rounded-full cursor-pointer border-gray-300 text-gray-700 hover:border-orange-500 hover:text-orange-600 h-8 sm:h-9 text-xs sm:text-sm whitespace-nowrap flex-shrink-0"
              >
                {value === 'Todas' || value === 'Todos' ? label : (catLabels[value] || value)}
                <ChevronDown className="w-3 h-3 sm:w-4 sm:h-4 ml-1.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {opts.map(o => (
                <DropdownMenuItem key={o.value} onClick={() => set(o.value)}>
                  {o.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        ))}
      </div>

      {/* Linha 2 — Ordenar por */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-gray-700 whitespace-nowrap">Ordenar por</span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className="bg-orange-50 text-orange-600 cursor-pointer border-orange-100 hover:bg-orange-100 h-8 sm:h-9 px-3 text-xs sm:text-sm whitespace-nowrap"
            >
              {sortBy}
              <ChevronDown className="w-3 h-3 sm:w-4 sm:h-4 ml-1.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="sm:align-end">
            {['Relevância', 'Data: Próximos', 'Data: Distantes', 'Preço: Menor para Maior', 'Preço: Maior para Menor'].map(s => (
              <DropdownMenuItem key={s} onClick={() => setSortBy(s)}>{s}</DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

    </div>
  );

  const EventCard = ({ event }: { event: Event }) => (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-2xl hover:border-orange-200 hover:-translate-y-2 transition-all duration-300 cursor-pointer group flex flex-col h-full" onClick={() => navigate(`/event/${event.id}`)}>
      <div className="relative aspect-[16/9] overflow-hidden bg-gray-900">
        <img src={event.image} alt={event.name} className="w-full h-full object-cover group-hover:scale-110 group-hover:opacity-90 transition-all duration-500" onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800'; }} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <div className="absolute top-3 left-3"><Badge variant="secondary" className="bg-white/90 backdrop-blur-sm text-gray-900 font-semibold shadow-sm">{catLabels[event.category]}</Badge></div>
        <div className="absolute top-3 right-3">
          <button className="p-2 rounded-full bg-white/90 backdrop-blur-sm hover:bg-white hover:scale-110 transition-all shadow-sm" onClick={(e) => handleLikeToggle(event.id, e)}>
            <Heart className={`w-5 h-5 transition-all duration-200 ${likedEvents.includes(event.id) ? 'text-red-500 fill-red-500' : 'text-gray-600 hover:text-red-500'}`} />
          </button>
        </div>1
        <div className="absolute bottom-3 right-3">
          <span className={`px-2 py-1 rounded-md text-xs font-bold uppercase tracking-wide bg-white/90 backdrop-blur-sm shadow-sm ${event.status === 'A decorrer' ? 'text-green-600' : 'text-gray-600'}`}>{event.status}</span>
        </div>
      </div>
      <div className="p-5 flex-1 flex flex-col bg-white group-hover:bg-gradient-to-b group-hover:from-white group-hover:to-orange-50/30 transition-all duration-300">
        <div className="flex items-center gap-2 mb-3">
          <div className="bg-orange-50 text-orange-700 px-2 py-1 rounded text-xs font-bold uppercase border border-orange-100 group-hover:bg-orange-600 group-hover:text-white group-hover:border-orange-600 transition-all duration-300">
            {new Date(event.date).toLocaleDateString('pt-PT', { month: 'short' }).replace('.', '')}
          </div>
          <span className="text-sm font-semibold text-gray-900 group-hover:text-orange-600 transition-colors duration-300">
            {new Date(event.date).toLocaleDateString('pt-PT', { day: '2-digit' })} • {event.time}
          </span>
        </div>
        <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2 leading-tight group-hover:text-orange-600 transition-colors duration-300">{event.name}</h3>
        <div className="flex items-start gap-2 text-sm text-gray-500 mb-4 line-clamp-1 group-hover:text-gray-700 transition-colors duration-300">
          <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0 group-hover:text-orange-600 transition-colors duration-300" />
          <span className="truncate">{event.location}</span>
        </div>
        <div className="mt-auto pt-4 border-t border-gray-100 group-hover:border-orange-100 flex items-center justify-between transition-colors duration-300">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 overflow-hidden">
              {event.logo ? <img src={event.logo} alt={event.organizerName} className="w-full h-full object-cover" /> : event.organizerName.charAt(0).toUpperCase()}
            </div>
            <span className="text-xs text-gray-500 group-hover:text-gray-700 truncate max-w-[120px] transition-colors duration-300">{event.organizerName}</span>
          </div>
          <span className="text-sm font-bold text-green-600 group-hover:text-orange-600 group-hover:scale-110 transition-all duration-300">
            {event.price ? `${event.price.toLocaleString()} Kz` : 'Grátis'}
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      {/* Header condicional */}
      {!isOrganizer ? (
        // Header completo para usuário normal
        <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
          <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
            <div className="flex items-center cursor-pointer" onClick={() => navigate('/events')}>
              <img src={logo} alt="Cresce.AO Logo" className="h-10 w-auto object-contain" />
              <span className="text-xl font-bold text-gray-900 tracking-tight">Cresce<span className="text-orange-600">.AO</span></span>
            </div>

            <div className="hidden md:flex items-center w-full max-w-2xl bg-gray-100 rounded-lg border border-gray-200">
              <div className="pl-3 text-gray-400"><Search className="w-5 h-5" /></div>
              <input
                type="text"
                placeholder="Buscar experiências"
                value={localSearchQuery}
                onChange={(e) => setLocalSearchQuery(e.target.value)}
                className="flex-1 bg-transparent border-none py-2.5 px-3 text-sm focus:outline-none placeholder:text-gray-500 text-gray-900"
              />
            </div>

            <div className="hidden lg:flex items-center gap-4">
              <Button variant="ghost" onClick={() => navigate('/favorites')} className="text-gray-600 cursor-pointer hover:text-orange-600 flex gap-2">
                <Heart className="w-5 h-5" /> Favoritos
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="rounded-full cursor-pointer w-10 h-10 p-0 border border-gray-200">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center text-white font-semibold">
                      {currentUser.name?.charAt(0).toUpperCase() || currentUser.username?.charAt(0).toUpperCase() || 'U'}
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem className="text-sm font-medium">{currentUser.name || currentUser.username}</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={onNavigateToProfile} className="cursor-pointer">Meu Perfil</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={onLogout} className="text-red-600 cursor-pointer"><LogOut className="w-4 h-4 mr-2" /> Sair</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="lg:hidden p-2 cursor-pointer text-gray-600 hover:text-orange-600">
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {mobileMenuOpen && (
            <div className="lg:hidden border-t border-gray-200 bg-white shadow-lg">
              <div className="p-4 border-b border-gray-100">
                <div className="flex items-center bg-gray-100 rounded-lg border border-gray-200">
                  <div className="pl-3 text-gray-400"><Search className="w-5 h-5" /></div>
                  <input
                    type="text"
                    placeholder="Buscar experiências"
                    value={localSearchQuery}
                    onChange={(e) => setLocalSearchQuery(e.target.value)}
                    className="flex-1 bg-transparent border-none py-2.5 px-3 text-sm focus:outline-none"
                  />
                </div>
              </div>
              <div className="p-4 space-y-2">
                <button onClick={() => { navigate('/favorites'); setMobileMenuOpen(false); }} className="w-full flex items-center cursor-pointer gap-3 px-3 py-2 text-gray-700 hover:bg-orange-50 rounded-lg">
                  <Heart className="w-5 h-5 text-red-500" /> <span>Favoritos</span>
                </button>
                <Separator className="my-2" />
                <button onClick={() => { onNavigateToProfile(); setMobileMenuOpen(false); }} className="w-full flex items-center cursor-pointer gap-3 px-3 py-2 text-gray-700 hover:bg-orange-50 rounded-lg">
                  <User className="w-5 h-5 text-orange-600" /> <span>Perfil</span>
                </button>
                <button onClick={() => { onLogout(); setMobileMenuOpen(false); }} className="w-full flex items-center gap-3 px-3 cursor-pointer py-2 text-red-600 hover:bg-red-50 rounded-lg">
                  <LogOut className="w-5 h-5" /> <span>Sair</span>
                </button>
              </div>
            </div>
          )}
        </header>
      ) : (
        // Header simplificado apenas com busca para organizador
        <div className="bg-white border-b border-gray-200 sticky top-0 z-50">
          <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <div className="flex items-center w-full max-w-2xl mx-auto bg-gray-100 rounded-lg border border-gray-200">
              <div className="pl-3 text-gray-400"><Search className="w-5 h-5" /></div>
              <input
                type="text"
                placeholder="Buscar eventos..."
                value={localSearchQuery}
                onChange={(e) => setLocalSearchQuery(e.target.value)}
                className="flex-1 bg-transparent border-none py-2.5 px-3 text-sm focus:outline-none placeholder:text-gray-500 text-gray-900"
              />
            </div>
          </div>
        </div>
      )}

      {/* Conteúdo principal */}
      <main className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
          <span className="hover:text-orange-600 cursor-pointer" onClick={() => navigate('/events')}>
            {isOrganizer ? 'Eventos' : 'Página inicial'}
          </span>
          <ChevronRight className="w-4 h-4" />
          <span className="text-gray-900 font-medium">Encontre eventos</span>
        </div>

        <div className="flex flex-col gap-6 mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900">Encontre eventos</h1>
          <FiltersBar />
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600 font-medium mb-1">Erro ao carregar eventos</p>
            <p className="text-red-600 text-sm mb-3">{error}</p>
            <button onClick={fetchEvents} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm">Tentar novamente</button>
          </div>
        )}

        <h2 className="text-lg font-medium text-gray-600 mb-6">
          {sorted.length} {sorted.length === 1 ? 'evento encontrado' : 'eventos encontrados'}
        </h2>

        {isLoading ? (
          <div className="grid sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => <EventCardSkeleton key={i} />)}
          </div>
        ) : sorted.length === 0 && !error ? (
          <div className="text-center py-24 bg-white rounded-2xl border border-dashed border-gray-200">
            <div className="bg-gray-50 p-4 rounded-full inline-block mb-4">
              <CalendarDays className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Nenhum evento encontrado</h3>
            <p className="text-gray-500 max-w-md mx-auto mb-6">Tente limpar os filtros ou buscar por outro termo.</p>
            <Button onClick={() => { setSelectedCategory('Todas'); setSelectedDateFilter('Todas'); setSelectedEventType('Todos'); setSelectedPriceFilter('Todos'); setLocalSearchQuery(''); }} className="bg-orange-600 hover:bg-orange-700">
              Limpar filtros
            </Button>
          </div>
        ) : !error && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {sorted.map((ev) => <EventCard key={ev.id} event={ev} />)}
          </div>
        )}

        {currentUser && <NotificationPermissionPrompt userId={currentUser.id} userType={currentUser.type} />}
      </main>

      {!isOrganizer && (
        <Footer onNavigateToPrivacy={() => navigate('/privacy-policy')} onNavigateToTerms={() => navigate('/terms-of-use')} />
      )}
    </div>
  );
}