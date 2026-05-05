import { useState, useEffect, useCallback } from 'react';
import {
  Search, MapPin, Heart, User, LogOut,
  CalendarDays, ChevronDown, Menu, X, ChevronRight,
  Filter, SortAsc, XCircle
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
import { NotificationPermissionPrompt } from './NotificationsPermissionPrompt';
import { motion, AnimatePresence } from 'motion/react';

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
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

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
  const searchQuery = layoutContext?.searchQuery !== undefined
    ? layoutContext.searchQuery
    : localSearchQuery;

  useEffect(() => {
    if (!currentUser) navigate('/login');
  }, [currentUser, navigate]);

  useEffect(() => {
    if (currentUser) {
      fetchEvents();
      fetchUserLikes();
    }
  }, [currentUser]);

  // ─── Likes — batch query, sem loop ─────────────────────────────────────────
  const fetchUserLikes = useCallback(async () => {
    if (!currentUser) return;
    try {
      const col = currentUser.type === 'user' ? 'usuario_normal_id' : 'organizador_id';
      const { data: favorites } = await supabase
        .from('favoritos_eventos')
        .select('evento_id')
        .eq(col, currentUser.id);

      if (!favorites?.length) {
        setLikedEvents([]);
        localStorage.setItem('cresceao_liked', '[]');
        return;
      }

      const ids = favorites.map((f: any) => f.evento_id);

      const { data: valid } = await supabase
        .from('eventos')
        .select('id')
        .in('id', ids)
        .is('deleted_at', null)
        .eq('status_aprovacao', 'aprovado');

      const validIds = (valid ?? []).map((e: any) => e.id);
      setLikedEvents(validIds);
      localStorage.setItem('cresceao_liked', JSON.stringify(validIds));
    } catch (err) {
      console.error('fetchUserLikes:', err);
    }
  }, [currentUser]);

  // ─── Like toggle ────────────────────────────────────────────────────────────
  const handleLikeToggle = async (eventId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!currentUser) { navigate('/login'); return; }

    const evento = events.find((ev) => ev.id === eventId);
    const col = currentUser.type === 'user' ? 'usuario_normal_id' : 'organizador_id';
    const isLiked = likedEvents.includes(eventId);

    try {
      if (isLiked) {
        const { error } = await supabase
          .from('favoritos_eventos')
          .delete()
          .eq('evento_id', eventId)
          .eq(col, currentUser.id);
        if (error) return;
        const updated = likedEvents.filter((id) => id !== eventId);
        setLikedEvents(updated);
        localStorage.setItem('cresceao_liked', JSON.stringify(updated));
        setEvents((prev) => prev.map((ev) =>
          ev.id === eventId ? { ...ev, likes: Math.max(0, ev.likes - 1) } : ev
        ));
      } else {
        const payload: any = { evento_id: eventId, created_at: new Date().toISOString() };
        payload[col] = currentUser.id;
        const { error } = await supabase.from('favoritos_eventos').insert(payload);
        if (error) return;
        const updated = [...likedEvents, eventId];
        setLikedEvents(updated);
        localStorage.setItem('cresceao_liked', JSON.stringify(updated));
        setEvents((prev) => prev.map((ev) =>
          ev.id === eventId ? { ...ev, likes: ev.likes + 1 } : ev
        ));

        // Notificação ao organizador (non-blocking)
        if (evento && currentUser.id !== evento.organizerId) {
          supabase
            .from('organizadores')
            .select('email_empresa, nome_empresa')
            .eq('id', evento.organizerId)
            .single()
            .then(({ data: org }) => {
              if (org) {
                notificationService.sendEmailNotification(
                  {
                    id: `tmp-${Date.now()}`,
                    usuario_id: evento.organizerId,
                    tipo_usuario: 'organizer',
                    titulo: 'Novo Like!',
                    mensagem: `${currentUser.name || currentUser.username || 'Um utilizador'} curtiu: ${evento.name}`,
                    tipo: 'novo_like',
                    lida: false,
                    created_at: new Date().toISOString(),
                  },
                  org.email_empresa,
                  org.nome_empresa
                ).catch(() => {});
              }
            })
            .catch(() => {});
        }
      }
    } catch (err) {
      console.error('handleLikeToggle:', err);
    }
  };

  const formatTime = (t: string) => (t ? t.split(':').slice(0, 2).join(':') : '');

  // ─── fetchEvents — batch queries, iOS-safe ──────────────────────────────────
  const fetchEvents = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // 1. Buscar todos os eventos aprovados de uma vez
      const { data: eventos, error: evErr } = await supabase
        .from('eventos')
        .select('id, nome_evento, descricao, categoria, data_evento, hora_evento, tipo_evento, local, valor, imagem_url, organizador_id, status_aprovacao, deleted_at')
        .is('deleted_at', null)
        .eq('status_aprovacao', 'aprovado')
        .order('data_evento', { ascending: true });

      if (evErr) { setError('Erro ao carregar eventos.'); return; }
      if (!eventos?.length) { setEvents([]); return; }

      // 2. Extrair IDs únicos de organizadores
      const orgIds = [...new Set(eventos.map((ev: any) => ev.organizador_id))];

      // 3. Buscar todos os organizadores em UMA query (sem loop)
      const { data: orgs } = await supabase
        .from('organizadores')
        .select('id, nome_empresa, deleted_at, avatar_url, email_empresa')
        .in('id', orgIds)
        .is('deleted_at', null);

      // Mapear por ID para lookup O(1)
      const orgMap: Record<string, any> = {};
      (orgs ?? []).forEach((o: any) => { orgMap[o.id] = o; });

      // 4. Buscar contagens de likes em UMA query com group by simulado
      const eventoIds = eventos.map((ev: any) => ev.id);
      const { data: favoritosData } = await supabase
        .from('favoritos_eventos')
        .select('evento_id')
        .in('evento_id', eventoIds);

      // Contar likes por evento_id
      const likesMap: Record<string, number> = {};
      (favoritosData ?? []).forEach((f: any) => {
        likesMap[f.evento_id] = (likesMap[f.evento_id] ?? 0) + 1;
      });

      // 5. Montar lista final — operação síncrona, sem awaits
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const valid: Event[] = eventos
        .filter((ev: any) => orgMap[ev.organizador_id]) // só eventos de org activos
        .map((ev: any) => {
          const org = orgMap[ev.organizador_id];
          const eventDate = new Date(ev.data_evento);
          const status = eventDate < today ? 'Finalizado' : 'A decorrer';
          return {
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
            logo: org.avatar_url || '',
            organizerName: org.nome_empresa || 'Organizador',
            likes: likesMap[ev.id] ?? 0,
          };
        });

      setEvents(valid);
    } catch (err) {
      console.error('fetchEvents:', err);
      setError('Ocorreu um erro inesperado ao carregar eventos.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const onLogout = () => { localStorage.removeItem('user'); navigate('/login'); };
  const onNavigateToProfile = () => { navigate(isOrganizer ? '/organizer-profile' : '/user-dashboard'); };

  const categories = ['Todas', 'palestra', 'workshop', 'feiras', 'masterclasse'];
  const dateFilters = ['Todas', 'Hoje', 'Esta Semana', 'Este Mês', 'Próximos 3 Meses'];
  const eventTypes = ['Todos', 'presencial', 'online', 'hibrido'];
  const priceFilters = ['Todos', 'Gratuito', 'Pago'];
  const catLabels: Record<string, string> = {
    palestra: 'Palestra', workshop: 'Workshop', feiras: 'Feira', masterclasse: 'Masterclasse',
  };

  const filtered = events.filter((ev) => {
    const q = searchQuery.toLowerCase();
    const matchSearch = !q
      || ev.name.toLowerCase().includes(q)
      || ev.description.toLowerCase().includes(q)
      || ev.organizerName.toLowerCase().includes(q);
    const matchCat = selectedCategory === 'Todas' || ev.category === selectedCategory;
    const matchType = selectedEventType === 'Todos' || ev.eventType === selectedEventType;
    const matchPrice = selectedPriceFilter === 'Todos'
      || (selectedPriceFilter === 'Gratuito' ? !ev.price || ev.price === 0 : !!ev.price && ev.price > 0);

    const d = new Date(ev.date);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    let matchDate = true;
    if (selectedDateFilter === 'Hoje') {
      matchDate = d.toDateString() === today.toDateString();
    } else if (selectedDateFilter === 'Esta Semana') {
      const w = new Date(today); w.setDate(today.getDate() + 7);
      matchDate = d >= today && d <= w;
    } else if (selectedDateFilter === 'Este Mês') {
      matchDate = d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
    } else if (selectedDateFilter === 'Próximos 3 Meses') {
      const m = new Date(today); m.setMonth(today.getMonth() + 3);
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

  const clearAllFilters = () => {
    setSelectedCategory('Todas');
    setSelectedDateFilter('Todas');
    setSelectedEventType('Todos');
    setSelectedPriceFilter('Todos');
    setLocalSearchQuery('');
    setSortBy('Relevância');
  };

  const hasActiveFilters = selectedCategory !== 'Todas' || selectedDateFilter !== 'Todas' || 
                          selectedEventType !== 'Todos' || selectedPriceFilter !== 'Todos' || 
                          localSearchQuery !== '' || sortBy !== 'Relevância';

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="w-12 h-12 sm:w-16 sm:h-16 border-4 border-orange-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm sm:text-base text-gray-600">Redirecionando para login...</p>
        </div>
      </div>
    );
  }

  // ─── Filters Content (reusable) ────────────────────────────────────────────
  const FiltersContent = ({ isMobile = false }: { isMobile?: boolean }) => (
    <div className={`space-y-4 ${isMobile ? 'p-4' : ''}`}>
      {/* Categorias */}
      <div>
        <label className="block text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">Categoria</label>
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-full text-xs sm:text-sm transition-all cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-orange-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {cat === 'Todas' ? 'Todas' : catLabels[cat]}
            </button>
          ))}
        </div>
      </div>

      {/* Data */}
      <div>
        <label className="block text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">Data</label>
        <div className="flex flex-wrap gap-2">
          {dateFilters.map((date) => (
            <button
              key={date}
              onClick={() => setSelectedDateFilter(date)}
              className={`px-3 py-1.5 rounded-full text-xs sm:text-sm transition-all cursor-pointer ${
                selectedDateFilter === date
                  ? 'bg-orange-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {date}
            </button>
          ))}
        </div>
      </div>

      {/* Tipo */}
      <div>
        <label className="block text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">Tipo</label>
        <div className="flex flex-wrap gap-2">
          {eventTypes.map((type) => (
            <button
              key={type}
              onClick={() => setSelectedEventType(type)}
              className={`px-3 py-1.5 rounded-full text-xs sm:text-sm transition-all cursor-pointer ${
                selectedEventType === type
                  ? 'bg-orange-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {type === 'Todos' ? 'Todos' : type === 'presencial' ? 'Presencial' : type === 'online' ? 'Online' : 'Híbrido'}
            </button>
          ))}
        </div>
      </div>

      {/* Preço */}
      <div>
        <label className="block text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">Preço</label>
        <div className="flex flex-wrap gap-2">
          {priceFilters.map((price) => (
            <button
              key={price}
              onClick={() => setSelectedPriceFilter(price)}
              className={`px-3 py-1.5 rounded-full text-xs sm:text-sm transition-all cursor-pointer ${
                selectedPriceFilter === price
                  ? 'bg-orange-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {price}
            </button>
          ))}
        </div>
      </div>

      {/* Ordenação */}
      <div>
        <label className="block text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">Ordenar por</label>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none bg-white"
        >
          {['Relevância', 'Data: Próximos', 'Data: Distantes', 'Preço: Menor para Maior', 'Preço: Maior para Menor'].map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {hasActiveFilters && (
        <button
          onClick={clearAllFilters}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm cursor-pointer"
        >
          <XCircle className="w-4 h-4" />
          Limpar todos os filtros
        </button>
      )}
    </div>
  );

  // ─── Event card ─────────────────────────────────────────────────────────────
  const EventCard = ({ event }: { event: Event }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-2xl hover:border-orange-200 hover:-translate-y-2 transition-all duration-300 cursor-pointer group flex flex-col h-full"
      onClick={() => navigate(`/event/${event.id}`)}
    >
      <div className="relative aspect-[16/9] overflow-hidden bg-gray-100">
        <img
          src={event.image}
          alt={event.name}
          loading="lazy"
          decoding="async"
          className="w-full h-full object-cover group-hover:scale-110 group-hover:opacity-90 transition-all duration-500"
          onError={(e) => {
            (e.target as HTMLImageElement).src =
              'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800';
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <div className="absolute top-2 left-2 sm:top-3 sm:left-3">
          <Badge variant="secondary" className="bg-white/90 backdrop-blur-sm text-gray-900 font-semibold shadow-sm text-xs sm:text-sm">
            {catLabels[event.category] ?? event.category}
          </Badge>
        </div>
        <div className="absolute top-2 right-2 sm:top-3 sm:right-3">
          <button
            className="p-1.5 sm:p-2 rounded-full bg-white/90 backdrop-blur-sm hover:bg-white hover:scale-110 transition-all shadow-sm"
            onClick={(e) => handleLikeToggle(event.id, e)}
          >
            <Heart className={`w-4 h-4 sm:w-5 sm:h-5 transition-all duration-200 ${likedEvents.includes(event.id) ? 'text-red-500 fill-red-500' : 'text-gray-600 hover:text-red-500'}`} />
          </button>
        </div>
        <div className="absolute bottom-2 right-2 sm:bottom-3 sm:right-3">
          <span className={`px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-md text-[10px] sm:text-xs font-bold uppercase tracking-wide bg-white/90 backdrop-blur-sm shadow-sm ${event.status === 'A decorrer' ? 'text-green-600' : 'text-gray-600'}`}>
            {event.status}
          </span>
        </div>
      </div>

      <div className="p-3 sm:p-5 flex-1 flex flex-col bg-white group-hover:bg-gradient-to-b group-hover:from-white group-hover:to-orange-50/30 transition-all duration-300">
        <div className="flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3 flex-wrap">
          <div className="bg-orange-50 text-orange-700 px-1.5 py-0.5 sm:px-2 sm:py-1 rounded text-[10px] sm:text-xs font-bold uppercase border border-orange-100 group-hover:bg-orange-600 group-hover:text-white group-hover:border-orange-600 transition-all duration-300">
            {new Date(event.date).toLocaleDateString('pt-PT', { month: 'short' }).replace('.', '')}
          </div>
          <span className="text-xs sm:text-sm font-semibold text-gray-900 group-hover:text-orange-600 transition-colors duration-300">
            {new Date(event.date).toLocaleDateString('pt-PT', { day: '2-digit' })} • {event.time}
          </span>
        </div>
        <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-1.5 sm:mb-2 line-clamp-2 leading-tight group-hover:text-orange-600 transition-colors duration-300">
          {event.name}
        </h3>
        <div className="flex items-start gap-1.5 sm:gap-2 text-xs sm:text-sm text-gray-500 mb-3 sm:mb-4 line-clamp-1 group-hover:text-gray-700 transition-colors duration-300">
          <MapPin className="w-3 h-3 sm:w-4 sm:h-4 mt-0.5 flex-shrink-0 group-hover:text-orange-600 transition-colors duration-300" />
          <span className="truncate">{event.location}</span>
        </div>
        <div className="mt-auto pt-2 sm:pt-4 border-t border-gray-100 group-hover:border-orange-100 flex items-center justify-between transition-colors duration-300">
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center text-white text-[10px] sm:text-xs font-bold flex-shrink-0 overflow-hidden">
              {event.logo
                ? <img src={event.logo} alt={event.organizerName} className="w-full h-full object-cover" />
                : event.organizerName.charAt(0).toUpperCase()}
            </div>
            <span className="text-[11px] sm:text-xs text-gray-500 group-hover:text-gray-700 truncate max-w-[80px] sm:max-w-[120px] transition-colors duration-300">
              {event.organizerName}
            </span>
          </div>
          <span className="text-xs sm:text-sm font-bold text-green-600 group-hover:text-orange-600 group-hover:scale-110 transition-all duration-300">
            {event.price ? `${event.price.toLocaleString()} Kz` : 'Grátis'}
          </span>
        </div>
      </div>
    </motion.div>
  );

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      {/* Header - Responsivo */}
      {!isOrganizer ? (
        <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
          <div className="max-w-[1800px] mx-auto px-3 sm:px-4 md:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-2 sm:gap-4">
            <div className="flex items-center cursor-pointer gap-1 flex-shrink-0" onClick={() => navigate('/events')}>
              <img src={logo} alt="Cresce.AO Logo" className="h-8 sm:h-10 w-auto object-contain" />
              <span className="text-base sm:text-xl font-bold text-gray-900 tracking-tight hidden xs:inline">
                Cresce<span className="text-orange-600">.AO</span>
              </span>
            </div>
            
            {/* Desktop Search */}
            <div className="hidden md:flex items-center flex-1 max-w-2xl bg-gray-100 rounded-lg border border-gray-200 mx-4">
              <div className="pl-3 text-gray-400"><Search className="w-4 h-4 sm:w-5 sm:h-5" /></div>
              <input
                type="text" placeholder="Buscar experiências"
                value={localSearchQuery} onChange={(e) => setLocalSearchQuery(e.target.value)}
                className="flex-1 bg-transparent border-none py-2 sm:py-2.5 px-2 sm:px-3 text-sm focus:outline-none placeholder:text-gray-500 text-gray-900"
              />
            </div>
            
            {/* Desktop Actions */}
            <div className="hidden lg:flex items-center gap-3">
              <Button variant="ghost" onClick={() => navigate('/favorites')} className="text-gray-600 cursor-pointer hover:text-orange-600 flex gap-2 text-sm">
                <Heart className="w-4 h-4 sm:w-5 sm:h-5" /> <span className="hidden sm:inline">Favoritos</span>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="rounded-full cursor-pointer w-8 h-8 sm:w-10 sm:h-10 p-0 border border-gray-200">
                    <div className="w-full h-full rounded-full bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center text-white font-semibold text-sm sm:text-base">
                      {currentUser.name?.charAt(0).toUpperCase() || currentUser.username?.charAt(0).toUpperCase() || 'U'}
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 sm:w-56">
                  <DropdownMenuItem className="text-xs sm:text-sm font-medium truncate">{currentUser.name || currentUser.username}</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={onNavigateToProfile} className="cursor-pointer text-xs sm:text-sm">Meu Perfil</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={onLogout} className="text-red-600 cursor-pointer text-xs sm:text-sm">
                    <LogOut className="w-3 h-3 sm:w-4 sm:h-4 mr-2" /> Sair
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            
            {/* Mobile Menu Button */}
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="lg:hidden p-1.5 sm:p-2 cursor-pointer text-gray-600 hover:text-orange-600">
              {mobileMenuOpen ? <X className="w-5 h-5 sm:w-6 sm:h-6" /> : <Menu className="w-5 h-5 sm:w-6 sm:h-6" />}
            </button>
          </div>

          {/* Mobile Menu */}
          <AnimatePresence>
            {mobileMenuOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="lg:hidden border-t border-gray-200 bg-white shadow-lg overflow-hidden"
              >
                <div className="p-3 sm:p-4 border-b border-gray-100">
                  <div className="flex items-center bg-gray-100 rounded-lg border border-gray-200">
                    <div className="pl-3 text-gray-400"><Search className="w-4 h-4 sm:w-5 sm:h-5" /></div>
                    <input
                      type="text" placeholder="Buscar experiências"
                      value={localSearchQuery} onChange={(e) => setLocalSearchQuery(e.target.value)}
                      className="flex-1 bg-transparent border-none py-2 sm:py-2.5 px-2 sm:px-3 text-sm focus:outline-none"
                    />
                  </div>
                </div>
                <div className="p-3 sm:p-4 space-y-2">
                  <button onClick={() => { navigate('/favorites'); setMobileMenuOpen(false); }}
                    className="w-full flex items-center cursor-pointer gap-3 px-3 py-2 text-gray-700 hover:bg-orange-50 rounded-lg text-sm">
                    <Heart className="w-4 h-4 sm:w-5 sm:h-5 text-red-500" /> <span>Favoritos</span>
                  </button>
                  <Separator className="my-2" />
                  <button onClick={() => { onNavigateToProfile(); setMobileMenuOpen(false); }}
                    className="w-full flex items-center cursor-pointer gap-3 px-3 py-2 text-gray-700 hover:bg-orange-50 rounded-lg text-sm">
                    <User className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600" /> <span>Perfil</span>
                  </button>
                  <button onClick={() => { onLogout(); setMobileMenuOpen(false); }}
                    className="w-full flex items-center gap-3 px-3 cursor-pointer py-2 text-red-600 hover:bg-red-50 rounded-lg text-sm">
                    <LogOut className="w-4 h-4 sm:w-5 sm:h-5" /> <span>Sair</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </header>
      ) : (
        <div className="bg-white border-b border-gray-200 sticky top-0 z-50">
          <div className="max-w-[1800px] mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-2 sm:py-3">
            <div className="flex items-center w-full max-w-2xl mx-auto bg-gray-100 rounded-lg border border-gray-200">
              <div className="pl-3 text-gray-400"><Search className="w-4 h-4 sm:w-5 sm:h-5" /></div>
              <input
                type="text" placeholder="Buscar eventos..."
                value={localSearchQuery} onChange={(e) => setLocalSearchQuery(e.target.value)}
                className="flex-1 bg-transparent border-none py-2 sm:py-2.5 px-2 sm:px-3 text-sm focus:outline-none placeholder:text-gray-500 text-gray-900"
              />
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-[1800px] mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-gray-500 mb-3 sm:mb-4 overflow-x-auto whitespace-nowrap">
          <span className="hover:text-orange-600 cursor-pointer" onClick={() => navigate('/events')}>
            {isOrganizer ? 'Eventos' : 'Página inicial'}
          </span>
          <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
          <span className="text-gray-900 font-medium">Encontre eventos</span>
        </div>

        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900">Encontre eventos</h1>
          
          {/* Mobile Filter Button */}
          <div className="sm:hidden">
            <Button
              onClick={() => setMobileFiltersOpen(true)}
              className="w-full bg-orange-600 hover:bg-orange-700 text-white gap-2"
            >
              <Filter className="w-4 h-4" />
              Filtros {hasActiveFilters && `(${[
                selectedCategory !== 'Todas', selectedDateFilter !== 'Todas',
                selectedEventType !== 'Todos', selectedPriceFilter !== 'Todos'
              ].filter(Boolean).length})`}
            </Button>
          </div>
        </div>

        {/* Desktop Filters */}
        <div className="hidden sm:block mb-6 sm:mb-8">
          <FiltersContent />
        </div>

        {/* Mobile Filters Modal */}
        <AnimatePresence>
          {mobileFiltersOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/50 sm:hidden"
              onClick={() => setMobileFiltersOpen(false)}
            >
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'tween' }}
                className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between p-4 border-b border-gray-200">
                  <h2 className="text-lg font-bold text-gray-900">Filtros</h2>
                  <button
                    onClick={() => setMobileFiltersOpen(false)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="overflow-y-auto h-[calc(100%-4rem)]">
                  <FiltersContent isMobile />
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Active Filters Chips - Mobile */}
        {hasActiveFilters && (
          <div className="flex flex-wrap gap-2 mb-4 sm:hidden">
            {selectedCategory !== 'Todas' && (
              <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs flex items-center gap-1">
                {catLabels[selectedCategory]}
                <XCircle className="w-3 h-3 cursor-pointer" onClick={() => setSelectedCategory('Todas')} />
              </span>
            )}
            {selectedDateFilter !== 'Todas' && (
              <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs flex items-center gap-1">
                {selectedDateFilter}
                <XCircle className="w-3 h-3 cursor-pointer" onClick={() => setSelectedDateFilter('Todas')} />
              </span>
            )}
            {selectedEventType !== 'Todos' && (
              <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs flex items-center gap-1">
                {selectedEventType === 'presencial' ? 'Presencial' : selectedEventType === 'online' ? 'Online' : 'Híbrido'}
                <XCircle className="w-3 h-3 cursor-pointer" onClick={() => setSelectedEventType('Todos')} />
              </span>
            )}
            {selectedPriceFilter !== 'Todos' && (
              <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs flex items-center gap-1">
                {selectedPriceFilter}
                <XCircle className="w-3 h-3 cursor-pointer" onClick={() => setSelectedPriceFilter('Todos')} />
              </span>
            )}
            {localSearchQuery && (
              <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs flex items-center gap-1">
                Busca: {localSearchQuery}
                <XCircle className="w-3 h-3 cursor-pointer" onClick={() => setLocalSearchQuery('')} />
              </span>
            )}
            <button
              onClick={clearAllFilters}
              className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs hover:bg-gray-200 transition-colors"
            >
              Limpar todos
            </button>
          </div>
        )}

        {/* Results Count */}
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <p className="text-sm sm:text-base text-gray-600">
            <span className="font-semibold text-gray-900">{sorted.length}</span> {sorted.length === 1 ? 'evento encontrado' : 'eventos encontrados'}
          </p>
          {!isOrganizer && (
            <Button
              variant="outline"
              onClick={() => navigate('/favorites')}
              className="lg:hidden text-sm gap-2"
            >
              <Heart className="w-4 h-4" />
              Favoritos
            </Button>
          )}
        </div>

        {/* Error State */}
        {error && (
          <div className="mb-6 p-3 sm:p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600 font-medium mb-1 text-sm">Erro ao carregar eventos</p>
            <p className="text-red-600 text-xs sm:text-sm mb-3">{error}</p>
            <button onClick={fetchEvents} className="px-3 py-1.5 sm:px-4 sm:py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-xs sm:text-sm">
              Tentar novamente
            </button>
          </div>
        )}

        {/* Loading Skeletons */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
            {Array.from({ length: 8 }).map((_, i) => <EventCardSkeleton key={i} />)}
          </div>
        ) : sorted.length === 0 && !error ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16 sm:py-20 md:py-24 bg-white rounded-2xl border border-dashed border-gray-200 px-4"
          >
            <div className="bg-gray-50 p-3 sm:p-4 rounded-full inline-block mb-3 sm:mb-4">
              <CalendarDays className="w-10 h-10 sm:w-12 sm:h-12 text-gray-400" />
            </div>
            <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">Nenhum evento encontrado</h3>
            <p className="text-sm sm:text-base text-gray-500 max-w-md mx-auto mb-4 sm:mb-6">
              Tente ajustar os filtros ou buscar por outro termo.
            </p>
            {hasActiveFilters && (
              <Button onClick={clearAllFilters} className="bg-orange-600 hover:bg-orange-700">
                Limpar todos os filtros
              </Button>
            )}
          </motion.div>
        ) : !error && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
            {sorted.map((ev) => <EventCard key={ev.id} event={ev} />)}
          </div>
        )}

        {/* Notification Permission */}
        {currentUser && (
          <NotificationPermissionPrompt userId={currentUser.id} userType={currentUser.type} />
        )}
      </main>

      {/* Footer */}
      {!isOrganizer && <Footer
        onNavigateToPrivacy={() => navigate('/privacy-policy')}
        onNavigateToTerms={() => navigate('/terms-of-use')}
      />}
    </div>
  );
}