import image_2b98f25257b1238c48d47c9236d12c5ed6e3cffe from 'figma:asset/2b98f25257b1238c48d47c9236d12c5ed6e3cffe.png';
import { ArrowLeft, Calendar, MapPin, Heart, Building2, Clock, Share2, CreditCard, Minus, Plus, Info, MessageCircle, GraduationCap, MessageSquare, Sparkles } from 'lucide-react';
import { EventReviews } from './EventReviews';
import { useState, useEffect } from 'react';
import { EventQuiz } from './EventQuiz';
import { EventChat } from './EventChat';
import { Footer } from './Footer';
import { useNavigate, useParams, Link } from "react-router-dom";
import { supabase } from '../lib/supabase';

type User = {
  id: string;
  name: string;
  email: string;
  type?: 'user' | 'organizer';
};

type Event = {
  id: string;
  name: string;
  date: string;
  time: string;
  location: string;
  eventType: string;
  description: string;
  category: string;
  image: string;
  video?: string;
  pdf?: string;
  status: string;
  organizerId: string;
  organizerName: string;
  organizerEmail?: string;
  organizerPhone?: string;
  likes: number;
  price?: number;
  reviews?: any[];
  averageRating?: number;
};

export function EventDetailPage() {
  const [showQuiz, setShowQuiz] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [event, setEvent] = useState<Event | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { id } = useParams();
  const [showVideo, setShowVideo] = useState(false);

  const [currentUser] = useState<User | null>(() => {
    try {
      const u = localStorage.getItem('user');
      return u ? JSON.parse(u) : null;
    } catch {
      return null;
    }
  });

  const formatTime = (time: string) => {
    if (!time) return '';
    // Se tiver no formato HH:MM:SS, pegar apenas HH:MM
    return time.split(':').slice(0, 2).join(':');
  };

  const [isLiked, setIsLiked] = useState(false);

  // Buscar evento do banco de dados
  useEffect(() => {
    if (id) {
      fetchEvent(id);
    }
  }, [id]);

  const fetchEvent = async (eventId: string) => {
    try {
      setIsLoading(true);
      setError(null);

      console.log('Buscando evento:', eventId);

      // Buscar evento pelo ID
      const { data: evento, error: eventoError } = await supabase
        .from('eventos')
        .select('*')
        .eq('id', eventId)
        .is('deleted_at', null)
        .single();

      if (eventoError) {
        console.error('Erro ao buscar evento:', eventoError);
        setError('Evento não encontrado');
        setIsLoading(false);
        return;
      }

      console.log('Evento encontrado:', evento);

      // Buscar organizador
      const { data: organizador, error: orgError } = await supabase
        .from('organizadores')
        .select('nome_empresa, email_empresa')
        .eq('id', evento.organizador_id)
        .single();

      if (orgError) {
        console.error('Erro ao buscar organizador:', orgError);
      }

      // Buscar número de likes (da tabela favoritos_eventos)
      const { count: likesCount, error: likesError } = await supabase
        .from('favoritos_eventos')
        .select('*', { count: 'exact', head: true })
        .eq('evento_id', eventId);

      if (likesError) {
        console.error('Erro ao buscar likes:', likesError);
      }

      // Verificar se o usuário atual deu like
      if (currentUser) {
        let query = supabase
          .from('favoritos_eventos')
          .select('id')
          .eq('evento_id', eventId);

        if (currentUser.type === 'user') {
          query = query.eq('usuario_normal_id', currentUser.id);
        } else if (currentUser.type === 'organizer') {
          query = query.eq('organizador_id', currentUser.id);
        }

        const { data: userLike } = await query.maybeSingle();

        setIsLiked(!!userLike);
      }

      // Buscar reviews (da tabela comentarios)
      const { data: reviews, error: reviewsError } = await supabase
        .from('comentarios')
        .select(`
          id,
          descricao,
          avaliacao,
          imagem_url,
          created_at,
          usuario_normal:usuarios_normais (
            nome_completo,
            nome_utilizador
          )
        `)
        .eq('evento_id', eventId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (reviewsError) {
        console.error('Erro ao buscar reviews:', reviewsError);
      }

      // Calcular média das avaliações
      let averageRating = 0;
      if (reviews && reviews.length > 0) {
        const sum = reviews.reduce((acc, review) => acc + (review.avaliacao || 0), 0);
        averageRating = sum / reviews.length;
      }

      // Formatar reviews
      const formattedReviews = reviews?.map(review => ({
        id: review.id,
        userId: review.usuario_normal?.id,
        userName: review.usuario_normal?.nome_completo || 'Usuário',
        userUsername: review.usuario_normal?.nome_utilizador,
        rating: review.avaliacao,
        comment: review.descricao,
        date: review.created_at,
        images: review.imagem_url ? [review.imagem_url] : []
      })) || [];

      // Montar objeto do evento
      const formattedEvent: Event = {
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
        video: evento.video_url,
        pdf: evento.arquivo_pdf_url,
        status: 'A decorrer', // Você pode definir baseado na data
        organizerId: evento.organizador_id,
        organizerName: organizador?.nome_empresa || 'Organizador não identificado',
        organizerEmail: organizador?.email_empresa,
        organizerPhone: evento.contacto_whatsapp,
        likes: likesCount || 0,
        reviews: formattedReviews,
        averageRating
      };

      console.log('Evento formatado:', formattedEvent);
      setEvent(formattedEvent);

    } catch (err) {
      console.error('Erro inesperado:', err);
      setError('Ocorreu um erro ao carregar o evento');
    } finally {
      setIsLoading(false);
    }
  };

  // No EventDetailPage, antes de renderizar o EventReviews:
  console.log('EventDetailPage - event:', event);
  console.log('EventDetailPage - currentUser:', currentUser);
  console.log('EventDetailPage - eventId:', event?.id);
  console.log('EventDetailPage - currentUserId:', currentUser?.id);

  const onLikeToggle = async () => {
    if (!currentUser || !event) return;

    try {
      if (isLiked) {
        // Remover like - construir query baseada no tipo de usuário
        let query = supabase
          .from('favoritos_eventos')
          .delete()
          .eq('evento_id', event.id);

        if (currentUser.type === 'user') {
          query = query.eq('usuario_normal_id', currentUser.id);
        } else if (currentUser.type === 'organizer') {
          query = query.eq('organizador_id', currentUser.id);
        }

        const { error } = await query;

        if (!error) {
          setIsLiked(false);
          setEvent(prev => prev ? { ...prev, likes: prev.likes - 1 } : prev);
        } else {
          console.error('Erro ao remover like:', error);
        }
      } else {
        // Adicionar like - construir objeto baseado no tipo de usuário
        const insertData: any = {
          evento_id: event.id,
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

        if (!error) {
          setIsLiked(true);
          setEvent(prev => prev ? { ...prev, likes: prev.likes + 1 } : prev);
        } else {
          console.error('Erro ao adicionar like:', error);
        }
      }
    } catch (err) {
      console.error('Erro ao alternar like:', err);
    }
  };

  const handleShareEvent = async () => {
    const shareData = {
      title: event?.name,
      text: `Confira este evento: ${event?.name}\n\n${event?.description}`,
      url: window.location.href,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(window.location.href);
        alert("Link do evento copiado para a área de transferência!");
      }
    } catch (error) {
      console.error("Erro ao partilhar:", error);
    }
  };

  const onAddReview = async (rating: number, comment: string, images: any[]) => {
    if (!currentUser || !event) return;

    try {
      // Determinar qual coluna usar baseado no tipo de usuário
      const insertData: any = {
        evento_id: event.id,
        descricao: comment,
        avaliacao: rating,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      if (currentUser.type === 'user') {
        insertData.usuario_normal_id = currentUser.id;
      } else if (currentUser.type === 'organizer') {
        insertData.organizador_id = currentUser.id;
      }

      // Se houver imagens, guardar a primeira
      if (images && images.length > 0) {
        insertData.imagem_url = images[0];
      }

      console.log('Adicionando review:', insertData);

      const { data, error } = await supabase
        .from('comentarios')
        .insert([insertData])
        .select()
        .single();

      if (error) {
        console.error('Erro ao adicionar review:', error);
        return;
      }

      console.log('Review adicionada:', data);

      // Recarregar evento para atualizar reviews
      fetchEvent(event.id);

    } catch (err) {
      console.error('Erro ao adicionar review:', err);
    }
  };

  const onUpdateReview = async (reviewId: string, rating: number, comment: string, images: any[]) => {
    if (!currentUser || !event) return;

    try {
      const updateData: any = {
        descricao: comment,
        avaliacao: rating,
        updated_at: new Date().toISOString()
      };

      if (images && images.length > 0) {
        updateData.imagem_url = images[0];
      }

      console.log('Atualizando review:', reviewId, updateData);

      let query = supabase
        .from('comentarios')
        .update(updateData)
        .eq('id', reviewId);

      // Adicionar filtro baseado no tipo de usuário
      if (currentUser.type === 'user') {
        query = query.eq('usuario_normal_id', currentUser.id);
      } else if (currentUser.type === 'organizer') {
        query = query.eq('organizador_id', currentUser.id);
      }

      const { error } = await query;

      if (error) {
        console.error('Erro ao atualizar review:', error);
        return;
      }

      console.log('Review atualizada com sucesso');
      fetchEvent(event.id);

    } catch (err) {
      console.error('Erro ao atualizar review:', err);
    }
  };

  const onDeleteReview = async (reviewId: string) => {
    if (!currentUser || !event) return;

    try {
      console.log('Deletando review:', reviewId);

      let query = supabase
        .from('comentarios')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', reviewId);

      // Adicionar filtro baseado no tipo de usuário
      if (currentUser.type === 'user') {
        query = query.eq('usuario_normal_id', currentUser.id);
      } else if (currentUser.type === 'organizer') {
        query = query.eq('organizador_id', currentUser.id);
      }

      const { error } = await query;

      if (error) {
        console.error('Erro ao deletar review:', error);
        return;
      }

      console.log('Review deletada com sucesso');
      fetchEvent(event.id);

    } catch (err) {
      console.error('Erro ao deletar review:', err);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-PT', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatDateFull = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-PT', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case 'presencial': return 'bg-blue-100 text-blue-700';
      case 'online': return 'bg-green-100 text-green-700';
      case 'híbrido': return 'bg-orange-100 text-orange-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getEventTypeIcon = (type: string) => {
    switch (type) {
      case 'presencial': return '📍';
      case 'online': return '💻';
      case 'híbrido': return '🌐';
      default: return '📅';
    }
  };

  // WhatsApp contact function
  const handleWhatsAppContact = () => {
    const phoneNumber = event?.organizerPhone || '244900000000';
    const message = encodeURIComponent(
      `Olá! Gostaria de obter mais informações sobre o evento: ${event?.name}. Com a descrição: ${event?.description}`
    );
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${message}`;
    window.open(whatsappUrl, '_blank');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-orange-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando evento...</p>
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Evento não encontrado</h2>
          <p className="text-gray-600 mb-6">{error || 'O evento que você procura não existe ou foi removido.'}</p>
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-gray-600 cursor-pointer hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Voltar</span>
            </button>

            <div className="flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-orange-600" />
              <span className="font-bold text-gray-900">Cresce.AO</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <div className="grid lg:grid-cols-2 gap-8 mb-8">
          {/* Left Column - Event Info */}
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-8 text-white flex flex-col justify-between min-h-[400px]">
            <div>
              <div className="text-sm text-gray-300 mb-4">
                Fale com o produtor: {event.organizerName}
              </div>

              <h1 className="text-4xl font-bold mb-6">{event.name}</h1>

              <div className="space-y-3">
                {/* Date and Time */}
                <div className="flex items-center gap-2 text-gray-200">
                  <Calendar className="w-5 h-5" />
                  <span>{formatDate(event.date)} • {event.time}</span>
                </div>

                {/* Location */}
                <div className="flex items-center gap-2 text-gray-200">
                  <MapPin className="w-5 h-5" />
                  <span>Evento {event.eventType} em <span className="text-orange-400 font-semibold">{event.location}</span></span>
                </div>
              </div>
            </div>

            {/* Payment Option Badge */}
            <div className="mt-6">
              <div className="inline-flex items-center gap-2 bg-orange-600 px-4 py-2 rounded-full text-sm font-semibold">
                <CreditCard className="w-4 h-4" />
                {event.price ? `${event.price.toLocaleString('pt-AO')} Kz` : 'Gratuito'}
              </div>
            </div>
          </div>

          {/* Right Column - Event Image */}
          <div className="relative rounded-2xl overflow-hidden shadow-xl">
            <img
              src={event.image}
              alt={event.name}
              className="w-full h-full object-cover min-h-[400px]"
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800';
              }}
            />

            {/* Status Badge */}
            {event.status === 'Cancelada' && (
              <div className="absolute top-6 left-6">
                <span className="px-4 py-2 bg-red-600 text-white rounded-full text-sm font-semibold shadow-lg">
                  Evento Cancelado
                </span>
              </div>
            )}

            {/* Share Button */}
            <div className="absolute bottom-6 right-6">
              <button
                onClick={handleShareEvent}
                className="flex items-center gap-2 bg-white px-5 cursor-pointer py-3 rounded-full shadow-lg hover:bg-gray-100 transition-colors">
                <Share2 className="w-5 h-5 text-orange-600" />
                <span className="font-semibold text-gray-900">COMPARTILHAR</span>
              </button>
            </div>
          </div>
        </div>

        {/* Event Details Section */}
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Description */}
            <div className="bg-white rounded-xl shadow-md p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6 pb-4 border-b border-gray-200">Descrição do evento</h2>
              <div className="space-y-4 text-gray-700 leading-relaxed">
                <p>{event.description}</p>
              </div>

              {/* Quiz Button in Description */}
              <div className="mt-8 pt-6 border-t border-gray-200">
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-xl p-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-14 h-14 bg-purple-600 rounded-xl flex items-center justify-center flex-shrink-0">
                      <GraduationCap className="w-7 h-7 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-900">Quiz Educativo</h3>
                      <p className="text-sm text-gray-600">Teste seus conhecimentos sobre o tema</p>
                    </div>
                  </div>
                  <p className="text-gray-700 mb-4">
                    Avalie o seu conhecimento respondendo a 5 perguntas de múltipla escolha.
                    No final, receberá feedback personalizado sobre o seu desempenho.
                  </p>
                  <button
                    onClick={() => setShowQuiz(true)}
                    className="w-full bg-purple-600 hover:bg-purple-700 cursor-pointer text-white py-3.5 px-6 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 shadow-md"
                  >
                    <GraduationCap className="w-5 h-5" />
                    Testar Quiz
                  </button>
                </div>
              </div>
            </div>

            {/* Video Section */}
            {event.video && (
              <div className="bg-white rounded-xl shadow-md p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  Vídeo Promocional
                </h2>

                <div className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden group">

                  {showVideo ? (
                    <iframe
                      src={event.video}
                      title="Video do evento"
                      className="w-full h-full"
                      allowFullScreen
                    />
                  ) : (
                    <>
                      <img
                        src={event.image}
                        alt={`Preview de ${event.name}`}
                        className="w-full h-full object-cover"
                      />

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowVideo(true);
                        }}
                        className="absolute inset-0 flex items-center justify-center"
                      >
                        <div className="w-20 h-20 bg-orange-600 rounded-full flex items-center justify-center shadow-2xl">
                          <svg
                            className="w-10 h-10 text-white ml-1"
                            fill="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path d="M8 5v14l11-7z" />
                          </svg>
                        </div>
                      </button>
                    </>
                  )}

                </div>
              </div>
            )}

            {/* Organizer Info */}
            <div className="bg-white rounded-xl shadow-md p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Organizador</h2>

              <Link
                to={`/organizer/${event.organizerId}`}
                className="flex items-center gap-4 hover:bg-gray-50 p-2 rounded-lg transition"
              >
                <div className="w-16 h-16 bg-gradient-to-br from-orange-600 to-red-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                  {event.organizerName.charAt(0).toUpperCase()}
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-gray-900">
                    {event.organizerName}
                  </h3>
                  <p className="text-gray-600">Organizador de Eventos</p>
                </div>
              </Link>
            </div>
          </div>

          {/* Sidebar - Contact & Engagement */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-md p-6 sticky top-24">
              <h3 className="text-lg font-semibold text-gray-700 mb-4">Informações e Contacto</h3>

              {event.status === 'A decorrer' ? (
                <div className="space-y-4">
                  {/* Event Details Card */}
                  <div className="border border-gray-200 rounded-lg p-5">
                    <div className="space-y-4">
                      {/* Date */}
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Calendar className="w-5 h-5 text-orange-600" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 font-medium">Data</p>
                          <p className="text-gray-900 font-semibold">{formatDateFull(event.date)}</p>
                        </div>
                      </div>

                      {/* Time */}
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Clock className="w-5 h-5 text-orange-600" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 font-medium">Horário</p>
                          <p className="text-gray-900 font-semibold">{event.time}</p>
                        </div>
                      </div>

                      {/* Location */}
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <MapPin className="w-5 h-5 text-orange-600" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm text-gray-600 font-medium">Local</p>
                          {event.location.startsWith('http') ? (
                            <a
                              href={event.location}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-orange-600 hover:text-orange-700 font-semibold break-all text-sm"
                            >
                              Link Online
                            </a>
                          ) : (
                            <p className="text-gray-900 font-semibold">{event.location}</p>
                          )}
                        </div>
                      </div>

                      {/* Event Type */}
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Building2 className="w-5 h-5 text-orange-600" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 font-medium">Modalidade</p>
                          <p className="text-gray-900 font-semibold capitalize">{event.eventType}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* WhatsApp Contact Button */}
                  <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-lg p-5">
                    <div className="text-center mb-4">
                      <h4 className="font-semibold text-gray-900 mb-2">Interessado no evento?</h4>
                      <p className="text-sm text-gray-600">
                        Entre em contacto com o organizador para mais informações e inscrições
                      </p>
                    </div>

                    <button
                      onClick={handleWhatsAppContact}
                      className="w-full bg-green-600 hover:bg-green-700 cursor-pointer text-white py-3.5 px-6 rounded-lg font-semibold transition-colors flex items-center justify-center gap-3 shadow-md"
                    >
                      <MessageCircle className="w-6 h-6" />
                      Falar no WhatsApp
                    </button>

                    <p className="text-xs text-center text-gray-500 mt-3">
                      Será redirecionado para o WhatsApp
                    </p>
                  </div>

                  {/* Like Button */}
                  <button
                    onClick={onLikeToggle}
                    className={`w-full px-6 py-3 rounded-lg cursor-pointer font-semibold transition-all flex items-center justify-center gap-2 ${isLiked
                      ? 'bg-orange-600 text-white hover:bg-orange-700'
                      : 'border-2 border-orange-600 text-orange-600 hover:bg-orange-50'
                      }`}
                  >
                    <Heart className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`} />
                    {isLiked ? 'Interessado' : 'Demonstrar Interesse'}
                  </button>

                  {/* Interest Count */}
                  <div className="text-center">
                    <p className="text-sm text-gray-600">
                      <span className="font-semibold text-gray-900">{event.likes}</span> pessoas interessadas
                    </p>
                  </div>
                </div>
              ) : (
                <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                  <p className="text-red-600 font-semibold mb-2">Este evento foi cancelado</p>
                  <p className="text-sm text-red-500">Entre em contacto com o organizador para mais informações</p>
                  <button
                    onClick={handleWhatsAppContact}
                    className="mt-4 w-full bg-green-600 hover:bg-green-700 text-white py-3 px-6 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
                  >
                    <MessageCircle className="w-5 h-5" />
                    Contactar Organizador
                  </button>
                </div>
              )}

              {/* Share Button */}
              <button
                onClick={handleShareEvent}
                className="w-full mt-4 px-6 py-3 cursor-pointer border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
              >
                <Share2 className="w-5 h-5" />
                Partilhar Evento
              </button>
            </div>

            {/* Quiz Section */}
            {/* <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-xl shadow-md p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center">
                  <GraduationCap className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Quiz Educativo</h3>
                  <p className="text-sm text-gray-600">Teste seus conhecimentos</p>
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                Responda 5 perguntas e avalie seu conhecimento sobre o tema do evento
              </p>
              <button
                onClick={() => setShowQuiz(true)}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 px-6 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
              >
                <GraduationCap className="w-5 h-5" />
                Testar Quiz
              </button>
            </div> */}

            {/* Chat Section */}
            {/* <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl shadow-md p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
                  <MessageSquare className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Chat do Evento</h3>
                  <p className="text-sm text-gray-600">Partilhe experiências</p>
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                Converse com outros participantes e partilhe fotografias do evento
              </p>
              <button
                onClick={() => setShowChat(true)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
              >
                <MessageSquare className="w-5 h-5" />
                Abrir Chat
              </button>
            </div> */}

          </div>
        </div>

        {/* Reviews Section */}
        <div className="mt-8">
          <EventReviews
            eventId={event.id}
            onAddReview={(rating, comment, images) => onAddReview(rating, comment, images)}
            onUpdateReview={(reviewId, rating, comment, images) => onUpdateReview(reviewId, rating, comment, images)}
            onDeleteReview={(reviewId) => onDeleteReview(reviewId)}
            currentUserName={currentUser?.name}
            currentUserId={currentUser?.id}
            currentUserType={currentUser?.type}
          />
        </div>
      </main>

      {/* Quiz Modal */}
      {/* {showQuiz && (
        <EventQuiz
          eventId={event.id}
          eventName={event.name}
          eventDescription={event.description}
          eventCategory={event.category}
          eventImage={event.image}
          currentUser={currentUser}
          onClose={() => setShowQuiz(false)}
        />
      )} */}

      {/* Chat Modal */}
      {/* {showChat && (
        <EventChat
          eventId={event.id}
          eventName={event.name}
          currentUser={currentUser}
          onClose={() => setShowChat(false)}
        />
      )} */}

      {/* Footer */}
      <Footer onNavigateToPrivacy={() => navigate('/privacy-policy')} onNavigateToTerms={() => navigate('/terms-of-use')} />
    </div>
  );
}