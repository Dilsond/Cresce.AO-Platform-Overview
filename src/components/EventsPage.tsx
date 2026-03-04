import { useState } from 'react';
import { Search, MapPin, Heart, User, LogOut, LayoutDashboard, PlusCircle, CalendarDays, ChevronDown, Menu, X, ChevronRight, SlidersHorizontal } from 'lucide-react';
import type { Event, User as UserType } from '../App';
import { Button } from './ui/button';
import { Input } from './ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from "./ui/dropdown-menu";
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { EventCardSkeleton } from './EventCardSkeleton';
import { Footer } from './Footer';

interface EventsPageProps {
  events: Event[];
  currentUser: UserType | null;
  onEventClick: (eventId: string) => void;
  onNavigateToDashboard: () => void;
  onNavigateToProfile: () => void;
  onNavigateToCreateEvent: () => void;
  onLogout: () => void;
  likedEvents: string[];
  onOpenCreateForm: () => void;
  onNavigateToFavorites: () => void;
  isLoading?: boolean;
  onNavigateToPrivacy?: () => void;
  onNavigateToTerms?: () => void;
}

export function EventsPage({
  events,
  currentUser,
  onEventClick,
  onNavigateToDashboard,
  onNavigateToProfile,
  onNavigateToCreateEvent,
  onLogout,
  likedEvents,
  onOpenCreateForm,
  onNavigateToFavorites,
  isLoading = false,
  onNavigateToPrivacy,
  onNavigateToTerms
}: EventsPageProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Todas');
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>('Todas');
  const [selectedEventType, setSelectedEventType] = useState<string>('Todos');
  const [selectedPriceFilter, setSelectedPriceFilter] = useState<string>('Todos');
  const [sortBy, setSortBy] = useState<string>('Relevância');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const categories = ['Todas', 'Palestras', 'Workshops', 'Feiras', 'Masterclasses'];
  const dateFilters = ['Todas', 'Hoje', 'Esta Semana', 'Este Mês', 'Próximos 3 Meses'];
  const eventTypes = ['Todos', 'presencial', 'online', 'híbrido'];
  const priceFilters = ['Todos', 'Gratuito', 'Pago'];

  // Filter events
  const filteredEvents = events.filter(event => {
    const matchesSearch = event.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.organizerName.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = selectedCategory === 'Todas' || event.category === selectedCategory;
    const matchesEventType = selectedEventType === 'Todos' || event.eventType === selectedEventType;

    // Price filtering
    let matchesPrice = true;
    if (selectedPriceFilter === 'Gratuito') {
      matchesPrice = !event.price || event.price === 0;
    } else if (selectedPriceFilter === 'Pago') {
      matchesPrice = !!event.price && event.price > 0;
    }

    // Date filtering
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

    return matchesSearch && matchesCategory && matchesEventType && matchesDate && matchesPrice;
  });

  // Sort events
  const sortedEvents = [...filteredEvents].sort((a, b) => {
    if (sortBy === 'Relevância') {
      // Simple relevance logic: prioritized by likes then date
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

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-PT', { day: 'numeric', month: 'short' }); // Shortened for card
  };

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case 'presencial': return 'bg-blue-100 text-blue-700';
      case 'online': return 'bg-green-100 text-green-700';
      case 'híbrido': return 'bg-orange-100 text-orange-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="min-h-screen bg-white font-sans">
      {/* Navbar */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">

          {/* Logo & Search Area */}
          <div className="flex items-center gap-6 flex-1">
            <div className="flex items-center gap-1 flex-shrink-0 cursor-pointer" onClick={() => window.location.reload()}>

              <span className="hidden md:inline text-xl font-bold text-gray-800">Cresce.AO</span>
            </div>

            {/* Desktop Search */}
            <div className="hidden md:flex items-center w-full max-w-2xl bg-gray-100 rounded-lg border border-gray-200 focus-within:ring-2 focus-within:ring-orange-500 transition-all overflow-hidden">
              <div className="pl-3 text-gray-400">
                <Search className="w-5 h-5" />
              </div>
              <input
                type="text"
                placeholder="Buscar experiências"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent border-none py-2.5 px-3 text-sm focus:outline-none placeholder:text-gray-500 text-gray-900"
              />
              <div className="h-6 w-px bg-gray-300 mx-1"></div>
              <button className="flex items-center gap-1 px-3 py-2 text-sm text-orange-600 font-medium hover:bg-gray-200 transition-colors whitespace-nowrap">
                <MapPin className="w-4 h-4" />
                <span>Qualquer lugar</span>
                <ChevronDown className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Right Actions */}
          <div className="hidden lg:flex items-center gap-4">
            {currentUser?.type === 'organizer' && (
              <Button variant="ghost" className="text-gray-600 hover:text-orange-600 font-medium flex gap-2" onClick={() => {
                onOpenCreateForm();
                onNavigateToCreateEvent();
              }}>
                <PlusCircle className="w-5 h-5" />
                Criar evento
              </Button>
            )}

            {currentUser?.type === 'organizer' && (
              <Button variant="ghost" onClick={onNavigateToDashboard} className="text-gray-600 hover:text-orange-600 font-medium flex gap-2">
                <LayoutDashboard className="w-5 h-5" />
                Meus eventos
              </Button>
            )}

            <Button variant="ghost" className="text-gray-600 hover:text-orange-600 font-medium flex gap-2" onClick={onNavigateToFavorites}>
              <Heart className="w-5 h-5" />
              Favoritos
              {likedEvents.length > 0 && (
                <span className="ml-1 bg-orange-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                  {likedEvents.length}
                </span>
              )}
            </Button>

            <div className="h-6 w-px bg-gray-300 mx-2"></div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="rounded-full w-10 h-10 p-0 border border-gray-200">
                  <User className="w-5 h-5 text-gray-600" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {/* <DropdownMenuLabel>Minha Conta</DropdownMenuLabel> */}
                {currentUser && <DropdownMenuItem className="text-sm font-medium">{currentUser.name}</DropdownMenuItem>}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onNavigateToProfile}>
                  <LayoutDashboard className="mr-2 h-4 w-4" />
                  <span>Perfil</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onLogout} className="text-red-600 focus:text-red-600 focus:bg-red-50">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sair</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Mobile Menu Toggle */}
          <div className="lg:hidden">
            <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-gray-200 p-4 bg-white shadow-lg absolute w-full left-0 top-16 z-50">
            <div className="mb-4">
              <Input
                placeholder="Buscar experiências"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full mb-2"
              />
              <Button variant="outline" className="w-full justify-between">
                <span className="flex items-center gap-2"><MapPin className="w-4 h-4" /> Qualquer lugar</span>
                <ChevronDown className="w-4 h-4" />
              </Button>
            </div>
            <div className="space-y-2">
              <Button variant="ghost" className="w-full justify-start" onClick={onNavigateToDashboard}>
                <LayoutDashboard className="w-4 h-4 mr-2" /> Dashboard
              </Button>
              {currentUser?.type === 'organizer' && (
                <Button variant="ghost" className="w-full justify-start" onClick={() => {
                  onOpenCreateForm();
                  onNavigateToDashboard();
                  setMobileMenuOpen(false);
                }}>
                  <PlusCircle className="w-4 h-4 mr-2" /> Criar evento
                </Button>
              )}
              <Separator className="my-2" />
              <Button variant="ghost" onClick={onLogout} className="w-full justify-start text-red-600">
                <LogOut className="w-4 h-4 mr-2" /> Sair
              </Button>
              <Button variant="ghost" className="w-full justify-start" onClick={() => { onNavigateToFavorites(); setMobileMenuOpen(false); }}>
                <Heart className="w-4 h-4 mr-2" /> Favoritos
                {likedEvents.length > 0 && <span className="ml-auto bg-orange-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">{likedEvents.length}</span>}
              </Button>
            </div>
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <main className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8 bg-gray-100">

        {/* Breadcrumbs */}
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
                  <Button variant="outline" className="rounded-full border-gray-300 text-gray-700 hover:border-orange-500 hover:text-orange-600 h-10">
                    {selectedCategory === 'Todas' ? 'Categoria' : selectedCategory}
                    <ChevronDown className="w-4 h-4 ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {categories.map(cat => (
                    <DropdownMenuItem key={cat} onClick={() => setSelectedCategory(cat)}>
                      {cat}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Date Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="rounded-full border-gray-300 text-gray-700 hover:border-orange-500 hover:text-orange-600 h-10">
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
                  <Button variant="outline" className="rounded-full border-gray-300 text-gray-700 hover:border-orange-500 hover:text-orange-600 h-10">
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
                  <Button variant="outline" className="rounded-full border-gray-300 text-gray-700 hover:border-orange-500 hover:text-orange-600 h-10">
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
                  <Button variant="outline" className="bg-orange-50 text-orange-600 border-orange-100 hover:bg-orange-100 hover:border-orange-200 h-10 px-4">
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

        {/* Results Count */}
        <div className="mb-6">
          <h2 className="text-lg font-medium text-gray-600">
            {sortedEvents.length} {sortedEvents.length === 1 ? 'evento encontrado' : 'eventos encontrados'}
          </h2>
        </div>

        {/* Events Grid */}
        {isLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 4 }).map((_, index) => (
              <EventCardSkeleton key={index} />
            ))}
          </div>
        ) : sortedEvents.length === 0 ? (
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
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {sortedEvents.map((event) => (
              <div
                key={event.id}
                className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-2xl hover:border-orange-200 hover:-translate-y-2 transition-all duration-300 cursor-pointer group flex flex-col h-full"
                onClick={() => onEventClick(event.id)}
              >
                {/* Event Image */}
                <div className="relative aspect-[16/9] overflow-hidden bg-gray-900">
                  <img
                    src={event.image}
                    alt={event.name}
                    className="w-full h-full object-cover group-hover:scale-110 group-hover:opacity-90 transition-all duration-500"
                  />

                  {/* Overlay gradient on hover */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

                  {/* Category Badge */}
                  <div className="absolute top-3 left-3 transform group-hover:scale-110 transition-transform duration-300">
                    <Badge variant="secondary" className="bg-white/90 backdrop-blur-sm text-gray-900 hover:bg-white font-semibold shadow-sm">
                      {event.category}
                    </Badge>
                  </div>

                  {/* Likes Badge */}
                  <div className="absolute top-3 right-3 transform group-hover:scale-110 transition-transform duration-300">
                    <button
                      className="p-2 rounded-full bg-white/90 backdrop-blur-sm text-gray-600 hover:text-red-500 hover:bg-white hover:scale-125 transition-all shadow-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        // Handle like action
                      }}
                    >
                      <Heart className={`w-4 h-4 ${likedEvents.includes(event.id) ? 'fill-red-500 text-red-500' : ''}`} />
                    </button>
                  </div>

                  {/* Status/Type Badge */}
                  <div className="absolute bottom-3 right-3 transform group-hover:scale-110 transition-transform duration-300">
                    <span className={`px-2 py-1 rounded-md text-xs font-bold uppercase tracking-wide bg-white/90 backdrop-blur-sm shadow-sm ${event.eventType === 'presencial' ? 'text-blue-600' :
                      event.eventType === 'online' ? 'text-green-600' : 'text-orange-600'
                      }`}>
                      {event.eventType}
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

      {/* Footer */}
      <Footer onNavigateToPrivacy={onNavigateToPrivacy} onNavigateToTerms={onNavigateToTerms} />
    </div>
  );
}