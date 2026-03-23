import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Calendar, MapPin, Heart, ArrowLeft, Sparkles, Building2, HeartOff, UserCheck, UserPlus } from "lucide-react";
import { supabase } from "../lib/supabase";
import { EventCardSkeleton } from "./EventCardSkeleton";
import { notificationService } from "../services/notificationService";
import { showLocalNotification } from "../lib/pushNotifications";
import { emailService } from "../services/emailService";
import logo from "../assets/logo.png";

export default function OrganizerProfilePage() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [events, setEvents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [organizerName, setOrganizerName] = useState("");
  const [organizerInfo, setOrganizerInfo] = useState<any>(null);

  // Estados para favoritar organizador
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteCount, setFavoriteCount] = useState(0);
  const [isFavoriteLoading, setIsFavoriteLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Buscar usuário logado
  useEffect(() => {
    const userFromStorage = localStorage.getItem('user');
    if (userFromStorage) {
      setCurrentUser(JSON.parse(userFromStorage));
    }
  }, []);

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
        .select("*")
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

      // Buscar informações de favoritos do organizador
      await fetchFavoriteInfo(organizer?.id);

    } catch (err) {
      console.error("Erro inesperado:", err);
      setError("Ocorreu um erro ao carregar eventos");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchFavoriteInfo = async (organizerId: string) => {
    try {
      // Buscar contagem de favoritos do organizador
      const { count } = await supabase
        .from("favoritos_organizadores")
        .select("*", { count: "exact", head: true })
        .eq("organizador_favoritado_id", organizerId);

      setFavoriteCount(count || 0);

      // Verificar se o usuário atual já favoritou este organizador
      if (currentUser && currentUser.type === 'user') {
        const { data: favorite } = await supabase
          .from("favoritos_organizadores")
          .select("id")
          .eq("organizador_favoritado_id", organizerId)
          .eq("usuario_normal_id", currentUser.id)
          .maybeSingle();

        setIsFavorite(!!favorite);
      }
    } catch (err) {
      console.error("Erro ao buscar informações de favoritos:", err);
    }
  };

  const handleFavoriteToggle = async () => {
    if (!currentUser) {
      alert("Faça login para favoritar organizadores");
      navigate('/login');
      return;
    }

    if (currentUser.type !== 'user') {
      alert("Apenas usuários podem favoritar organizadores");
      return;
    }

    if (!id) return;

    setIsFavoriteLoading(true);

    try {
      if (isFavorite) {
        // Remover dos favoritos
        const { error } = await supabase
          .from("favoritos_organizadores")
          .delete()
          .eq("organizador_favoritado_id", id)
          .eq("usuario_normal_id", currentUser.id);

        if (error) throw error;

        setIsFavorite(false);
        setFavoriteCount(prev => prev - 1);
      } else {
        // Adicionar aos favoritos
        const { error } = await supabase
          .from("favoritos_organizadores")
          .insert({
            organizador_favoritado_id: id,
            usuario_normal_id: currentUser.id,
            created_at: new Date().toISOString()
          });

        if (error) throw error;

        setIsFavorite(true);
        setFavoriteCount(prev => prev + 1);

        // 🔔 NOTIFICAÇÃO: Enviar email para o organizador
        const isDifferentUser = organizerInfo && currentUser.id !== organizerInfo.id;

        // Dentro do handleFavoriteToggle, após adicionar o favorito
        if (isDifferentUser && organizerInfo?.email_empresa) {
          console.log('📧 Enviando email de notificação para:', organizerInfo.email_empresa);

          try {
            // Enviar email via EmailJS
            const emailResult = await emailService.sendNotification({
              to_email: organizerInfo.email_empresa,
              to_name: organizerInfo.nome_empresa,
              assunto: '👥 Novo Seguidor!',
              titulo: 'Você ganhou um novo seguidor!',
              mensagem: `${currentUser.name || currentUser.username || 'Um usuário'} começou a seguir sua organização na plataforma Cresce.AO.\n\nAcesse seu perfil para ver mais detalhes.`
            });

            if (emailResult.success) {
              console.log('✅ Email de notificação enviado com sucesso');
            } else {
              console.error('❌ Falha ao enviar email:', emailResult.message);
            }
          } catch (emailError) {
            console.error('Erro ao enviar email de notificação:', emailError);
          }

          // Mostrar notificação local
          showLocalNotification(
            '👥 Novo Seguidor!',
            `${currentUser.name || currentUser.username || 'Um usuário'} começou a seguir o seu perfil`
          );
        }
      }
    } catch (err) {
      console.error("Erro ao alternar favorito:", err);
      alert("Erro ao favoritar organizador");
    } finally {
      setIsFavoriteLoading(false);
    }
  };

  useEffect(() => {
    fetchOrganizerEvents();
  }, [id, currentUser]);

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
          <div className="flex items-center">
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

          <div className="relative z-10">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-sm font-medium mb-2 uppercase tracking-wider">Perfil do Organizador</p>
                <h1 className="text-4xl md:text-5xl font-bold mb-3">{organizerName || "Organizador"}</h1>

                {organizerInfo && (
                  <div className="flex flex-col gap-2 mt-4 text-orange-50">
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

              {/* Botão de Favoritar Organizador */}
              {currentUser?.type === 'user' && (
                <button
                  onClick={handleFavoriteToggle}
                  disabled={isFavoriteLoading}
                  className={`flex items-center gap-3 px-6 py-3 rounded-xl cursor-pointer font-semibold transition-all transform hover:scale-105 ${isFavorite
                      ? 'bg-white text-red-600 hover:bg-red-50'
                      : 'bg-white/20 backdrop-blur-sm text-white hover:bg-white/30'
                    }`}
                >
                  {isFavorite ? (
                    <>
                      <UserCheck className="w-6 h-6" />
                      <span>Seguindo ({favoriteCount})</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-6 h-6" />
                      <span>Seguir ({favoriteCount})</span>
                    </>
                  )}
                </button>
              )}

              {/* Mostrar apenas contagem para não-usuários */}
              {(!currentUser || currentUser.type !== 'user') && (
                <div className="flex items-center gap-3 bg-white/20 backdrop-blur-sm rounded-2xl px-6 py-3">
                  <Heart className="w-6 h-6" />
                  <div className="text-left">
                    <span className="text-2xl font-bold block">{favoriteCount}</span>
                    <span className="text-xs opacity-90">seguidores</span>
                  </div>
                </div>
              )}
            </div>

            {/* Estatísticas rápidas */}
            <div className="flex gap-6 mt-6 pt-6 border-t border-white/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{events.length}</p>
                  <p className="text-xs opacity-90">eventos</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                  <Heart className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {events.reduce((acc, e) => acc + e.likes, 0)}
                  </p>
                  <p className="text-xs opacity-90">likes em eventos</p>
                </div>
              </div>
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
                <div className="mb-6 flex items-center justify-between">
                  <h2 className="text-lg font-medium text-gray-600">
                    {events.length} {events.length === 1 ? 'evento encontrado' : 'eventos encontrados'}
                  </h2>

                  {/* Mini estatística de total de likes */}
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Heart className="w-4 h-4 text-red-500" />
                    <span>{events.reduce((acc, e) => acc + e.likes, 0)} likes totais</span>
                  </div>
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