import { useState } from 'react';
import { Heart, ArrowLeft, MapPin, Calendar, Clock, Search, Bookmark, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';

export type UserType = 'user' | 'organizer' | null;

export interface User {
  id: string;
  name: string;
  username: string;
  email: string;
  type: UserType;
  company?: string;
}

export function FavoritesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Todas');
  const [likedEvents, setLikedEvents] = useState<string[]>(() => {
    try { const l = localStorage.getItem('cresceao_liked'); return l ? JSON.parse(l) : []; } catch { return []; }
  });

  const [selectedEventId, setSelectedEventId] = useState<string | null>(() => {
    try { return localStorage.getItem('cresceao_event_id'); } catch { return null; }
  });
  const handleEventClick = (eventId: string) => {
    setSelectedEventId(eventId);
    navigate('event-detail');
  };

  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try { const u = localStorage.getItem('cresceao_user'); return u ? JSON.parse(u) : null; } catch { return null; }
  });

  const navigate = useNavigate();

  const handleLikeToggle = (eventId: string) => {
    const newLikedEvents = likedEvents.includes(eventId) ? likedEvents.filter(id => id !== eventId) : [...likedEvents, eventId];
    setLikedEvents(newLikedEvents);
    setEvents(events.map(e => e.id === eventId ? { ...e, likes: e.likes + (likedEvents.includes(eventId) ? -1 : 1) } : e));
  };

  const [events, setEvents] = useState<Event[]>([
    {
      id: '1',
      name: 'Workshop de Empreendedorismo Digital',
      date: '2026-01-25',
      time: '14:00',
      location: 'Centro de Inovação de Luanda',
      eventType: 'presencial',
      description: 'Aprenda estratégias práticas para transformar ideias em negócios digitais lucrativos. Workshop interativo com casos de sucesso angolanos.',
      category: 'Workshops',
      image: 'https://images.unsplash.com/photo-1764173039056-3cc602fef942?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb25mZXJlbmNlJTIwd29ya3Nob3AlMjBuZXR3b3JraW5nfGVufDF8fHx8MTc2ODIzNDQwNnww&ixlib=rb-4.1.0&q=80&w=1080',
      status: 'A decorrer',
      organizerId: 'org1',
      organizerName: 'StartHub Angola',
      likes: 45,
      price: 15000
    },
    {
      id: '2',
      name: 'Palestra: O Futuro do Trabalho em Angola',
      date: '2026-01-28',
      time: '10:00',
      location: 'https://zoom.us/meeting',
      eventType: 'online',
      description: 'Discussão sobre tendências do mercado de trabalho, competências do futuro e oportunidades para jovens profissionais angolanos.',
      category: 'Palestras',
      image: 'https://images.unsplash.com/photo-1761250246894-ee2314939662?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9mZXNzaW9uYWwlMjBkZXZlbG9wbWVudCUyMHNlbWluYXJ8ZW58MXx8fHwxNzY4MjM0NDA4fDA&ixlib=rb-4.1.0&q=80&w=1080',
      status: 'A decorrer',
      organizerId: 'org2',
      organizerName: 'Academia de Líderes',
      likes: 78
    },
    {
      id: '3',
      name: 'Feira de Oportunidades Profissionais 2026',
      date: '2026-02-10',
      time: '09:00',
      location: 'Talatona Convention Center',
      eventType: 'presencial',
      description: 'Conecte-se com as principais empresas de Angola. Vagas de emprego, estágios e oportunidades de networking.',
      category: 'Feiras',
      image: 'https://images.unsplash.com/photo-1630343350724-2eafe052719f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhbmdvbGElMjBsdWFuZGElMjBidXNpbmVzcyUyMHByb2Zlc3Npb25hbHN8ZW58MXx8fHwxNzY4MjM0NDA1fDA&ixlib=rb-4.1.0&q=80&w=1080',
      status: 'A decorrer',
      organizerId: 'org3',
      organizerName: 'CarreiraAO',
      likes: 156
    },
  ]);

  const favoriteEvents = events.filter(e => likedEvents.includes(e.id));

  const filtered = favoriteEvents.filter(event => {
    const matchesSearch =
      event.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.location.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'Todas' || event.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = ['Todas', 'Palestras', 'Workshops', 'Feiras', 'Masterclasses'];

  const categoryColor: Record<string, string> = {
    Palestras: 'bg-blue-100 text-blue-700',
    Workshops: 'bg-green-100 text-green-700',
    Feiras: 'bg-purple-100 text-purple-700',
    Masterclasses: 'bg-amber-100 text-amber-700',
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('pt-PT', { day: 'numeric', month: 'short', year: 'numeric' });

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
                {favoriteEvents.length === 0
                  ? 'Ainda não marcou nenhum evento'
                  : `${favoriteEvents.length} ${favoriteEvents.length === 1 ? 'evento guardado' : 'eventos guardados'}`}
              </p>
            </div>
            <div className="hidden md:flex w-20 h-20 rounded-2xl bg-white/20 backdrop-blur items-center justify-center shadow-lg">
              <Heart className="w-10 h-10 fill-white text-white" />
            </div>
          </div>
        </motion.div>

        {favoriteEvents.length > 0 && (
          <>
            {/* Search & Filters */}
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
                  placeholder="Pesquisar nos favoritos..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none text-sm"
                />
              </div>
              <div className="flex gap-2 flex-wrap">
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${selectedCategory === cat
                      ? 'bg-orange-600 text-white shadow-md'
                      : 'bg-white text-gray-600 border border-gray-200 hover:border-orange-300 hover:text-orange-600'
                      }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </motion.div>

            {/* Results count */}
            {searchQuery || selectedCategory !== 'Todas' ? (
              <p className="text-sm text-gray-500">
                {filtered.length} {filtered.length === 1 ? 'resultado' : 'resultados'}
                {selectedCategory !== 'Todas' && ` em ${selectedCategory}`}
                {searchQuery && ` para "${searchQuery}"`}
              </p>
            ) : null}
          </>
        )}

        {/* Events Grid */}
        <AnimatePresence mode="wait">
          {favoriteEvents.length === 0 ? (
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
              className="text-center py-16 text-gray-500">
              <p>Nenhum favorito encontrado com esses filtros.</p>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filtered.map((event, index) => (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.04 }}
                  className="group bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-orange-200 cursor-pointer" onClick={() => handleEventClick(event.id)}
                >
                  {/* Image */}
                  <div className="relative overflow-hidden aspect-video">
                    <img
                      src={event.image}
                      alt={event.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
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
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${event.eventType === 'online' ? 'bg-blue-100 text-blue-700' :
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
    </div >
  );
}
