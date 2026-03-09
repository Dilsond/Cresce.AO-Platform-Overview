import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Calendar, MapPin, Heart, ArrowLeft, Sparkles, Building2 } from "lucide-react";
import { supabase } from "../lib/supabase";
import { EventCardSkeleton } from "./EventCardSkeleton";
import logo from "../assets/logo.png";

export default function OrganizerProfilePage() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [events, setEvents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [organizerName, setOrganizerName] = useState("");
  const [organizerInfo, setOrganizerInfo] = useState<any>(null);

  const formatTime = (time: string) => {
    if (!time) return "";
    return time.slice(0, 5);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-PT', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const fetchOrganizerEvents = async () => {
    if (!id) return;

    try {
      setIsLoading(true);
      setError(null);

      console.log("Buscando eventos do organizador:", id);

      // Buscar informações do organizador
      const { data: organizer, error: orgError } = await supabase
        .from("organizadores")
        .select("nome_empresa, email_empresa, nif")
        .eq("id", id)
        .is("deleted_at", null)
        .single();

      if (orgError) {
        console.error("Erro ao buscar organizador:", orgError);
      } else if (organizer) {
        setOrganizerInfo(organizer);
        setOrganizerName(organizer.nome_empresa);
      }

      // Buscar eventos do organizador
      const { data: eventos, error: eventosError } = await supabase
        .from("eventos")
        .select("*")
        .eq("organizador_id", id)
        .is("deleted_at", null)
        .order("data_evento", { ascending: true });

      if (eventosError) {
        console.error("Erro ao buscar eventos:", eventosError);
        setError("Erro ao carregar eventos");
        return;
      }

      if (!eventos || eventos.length === 0) {
        setEvents([]);
        return;
      }

      const eventosComLikes = await Promise.all(
        eventos.map(async (evento) => {
          const { count: likesCount } = await supabase
            .from("favoritos_eventos")
            .select("*", { count: "exact", head: true })
            .eq("evento_id", evento.id);

          const hoje = new Date();
          const dataEvento = new Date(evento.data_evento);

          let status = "A decorrer";

          if (dataEvento < hoje) {
            status = "Finalizado";
          }

          return {
            id: evento.id,
            name: evento.nome_evento,
            date: evento.data_evento,
            formattedDate: formatDate(evento.data_evento),
            time: formatTime(evento.hora_evento),
            location: evento.local || "Local a definir",
            description: evento.descricao || "",
            category: evento.categoria,
            eventType: evento.tipo_evento,
            image: evento.imagem_url || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800',
            video: evento.video_url,
            status,
            organizerId: evento.organizador_id,
            likes: likesCount || 0,
            price: evento.valor
          };
        })
      );

      setEvents(eventosComLikes);

    } catch (err) {
      console.error("Erro inesperado:", err);
      setError("Ocorreu um erro ao carregar eventos");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrganizerEvents();
  }, [id]);

  const categoryColor: Record<string, string> = {
    Palestras: 'bg-blue-100 text-blue-700',
    Workshops: 'bg-green-100 text-green-700',
    Feiras: 'bg-purple-100 text-purple-700',
    Masterclasses: 'bg-amber-100 text-amber-700',
  };

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
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Banner */}
        <div className="relative overflow-hidden bg-gradient-to-br from-orange-600 via-orange-500 to-red-600 rounded-3xl shadow-2xl p-8 text-white mb-8">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-black/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

          <div className="relative z-10 flex items-center justify-between">
            <div>
              <p className="text-orange-100 text-sm font-medium mb-2 uppercase tracking-wider">Perfil do Organizador</p>
              <h1 className="text-4xl md:text-5xl font-bold mb-3">{organizerName || "Organizador"}</h1>

              {organizerInfo && (
                <div className="flex items-center gap-4 mt-4 text-orange-50">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-5 h-5" />
                    <span>{organizerInfo.email_empresa}</span>
                  </div>
                  {organizerInfo.nif && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm opacity-80">NIF: {organizerInfo.nif}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="hidden md:flex items-center gap-3 bg-white/20 backdrop-blur-sm rounded-2xl px-6 py-3">
              <Heart className="w-6 h-6 fill-white text-white" />
              <span className="text-2xl font-bold">{events.length}</span>
              <span className="text-sm opacity-90">eventos</span>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 3 }).map((_, index) => (
              <EventCardSkeleton key={index} />
            ))}
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600 font-medium mb-2">Erro ao carregar eventos</p>
            <p className="text-red-600 text-sm mb-3">{error}</p>
            <button
              onClick={fetchOrganizerEvents}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
            >
              Tentar novamente
            </button>
          </div>
        )}

        {/* Events Grid */}
        {!isLoading && !error && (
          <>
            {events.length === 0 ? (
              <div className="text-center py-24 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                <div className="bg-white p-4 rounded-full shadow-sm inline-block mb-4">
                  <Calendar className="w-10 h-10 text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Nenhum evento encontrado</h3>
                <p className="text-gray-500 max-w-md mx-auto">
                  Este organizador ainda não publicou nenhum evento.
                </p>
              </div>
            ) : (
              <>
                {/* Results Count */}
                <div className="mb-6">
                  <h2 className="text-lg font-medium text-gray-600">
                    {events.length} {events.length === 1 ? 'evento encontrado' : 'eventos encontrados'}
                  </h2>
                </div>

                {/* Grid de Eventos */}
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {events.map((event) => (
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
                          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${categoryColor[event.category] || 'bg-gray-100 text-gray-700'}`}>
                            {event.category}
                          </span>
                        </div>

                        {/* Price Badge */}
                        {event.price ? (
                          <div className="absolute top-3 right-3 transform group-hover:scale-110 transition-transform duration-300">
                            <span className="px-2 py-1 rounded-md text-xs font-bold bg-white/90 backdrop-blur-sm text-green-600 shadow-sm">
                              {event.price.toLocaleString()} Kz
                            </span>
                          </div>
                        ) : (
                          <div className="absolute top-3 right-3 transform group-hover:scale-110 transition-transform duration-300">
                            <span className="px-2 py-1 rounded-md text-xs font-bold bg-white/90 backdrop-blur-sm text-green-600 shadow-sm">
                              Grátis
                            </span>
                          </div>
                        )}

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
                            <div className="w-6 h-6 rounded-full bg-gray-200 group-hover:bg-orange-100 flex items-center justify-center text-xs font-bold text-gray-600 group-hover:text-orange-600 transition-all duration-300">
                              {organizerName.charAt(0)}
                            </div>
                            <span className="text-xs text-gray-500 group-hover:text-gray-700 truncate max-w-[120px] transition-colors duration-300">
                              {organizerName}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Heart className="w-4 h-4 text-red-500 fill-red-500" />
                            <span className="text-xs font-semibold text-gray-600">{event.likes}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}