import logo from "../assets/logo.png";
import { ArrowLeft, Calendar, MapPin, Heart, Building2, Ticket, Clock, Share2, CreditCard, Minus, Plus, Info, MessageCircle, GraduationCap, MessageSquare, Sparkles, Users, CheckCircle, Gift } from 'lucide-react';
import { EventReviews } from './EventReviews';
import { useState, useEffect, useCallback } from 'react';
import { EventQuiz } from './EventQuiz';
import { Footer } from './Footer';
import { useNavigate, useParams, Link } from "react-router-dom";
import { supabase } from '../lib/supabase';
import { BuyTicketModal } from './BayTicketModal';
import { getEventImageUrl, getEventVideoUrl, getEventPdfUrl } from '../lib/storage';
import { UserPlus, UserCheck, User } from 'lucide-react';
import { emailService } from '../services/emailService';

type User = {
  id: string;
  name: string;
  email: string;
  type?: 'user' | 'organizer';
};

type Estacao = {
  nome: string;
  quantidade: number;
  preco: number;
  vantagens: string[];
};

type Event = {
  id: string;
  name: string;
  date: string;
  time: string;
  endTime: string;
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
  isFree: boolean;
  estacoes?: Estacao[];
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
  const [reviews, setReviews] = useState<any[]>([]);
  const [averageRating, setAverageRating] = useState<number | undefined>(undefined);
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [organizerAvatar, setOrganizerAvatar] = useState<string | null>(null);
  const [isGettingFreeTicket, setIsGettingFreeTicket] = useState(false);
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [generatedTicket, setGeneratedTicket] = useState<{ code: string; eventName: string; emailSent: boolean; userEmail: string } | null>(null);

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
    return time.split(':').slice(0, 2).join(':');
  };

  const [isLiked, setIsLiked] = useState(false);

  // Verificar se o evento já foi finalizado (data passada)
  const isEventFinished = () => {
    if (!event) return true;
    const hoje = new Date();
    const dataEvento = new Date(event.date);
    hoje.setHours(0, 0, 0, 0);
    dataEvento.setHours(0, 0, 0, 0);
    return dataEvento < hoje;
  };

  // Verificar se o usuário pode comprar ingresso
  const canBuyTicket = () => {
    if (!currentUser) return false;
    if (isEventFinished()) return false;
    if (currentUser.type === 'organizer' && currentUser.id === event?.organizerId) return false;
    return true;
  };

  const fetchEvent = useCallback(async (eventId: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const { data: evento, error: eventoError } = await supabase
        .from('eventos')
        .select('*')
        .eq('id', eventId)
        .is('deleted_at', null)
        .single();

      if (eventoError) {
        // console.error('Erro ao buscar evento:', eventoError);
        setError('Evento não encontrado');
        setIsLoading(false);
        return;
      }

      const { data: organizador } = await supabase
        .from('organizadores')
        .select('nome_empresa, email_empresa')
        .eq('id', evento.organizador_id)
        .single();

      const { count: likesCount } = await supabase
        .from('favoritos_eventos')
        .select('*', { count: 'exact', head: true })
        .eq('evento_id', eventId);

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

      const { data: reviews } = await supabase
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

      let averageRating = 0;
      if (reviews && reviews.length > 0) {
        const sum = reviews.reduce((acc, review) => acc + (review.avaliacao || 0), 0);
        averageRating = sum / reviews.length;
      }

      await fetchOrganizerInfo(evento.organizador_id);

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

      let estacoes = [];
      let isFree = true;

      if (evento.estacoes && Array.isArray(evento.estacoes) && evento.estacoes.length > 0) {
        estacoes = evento.estacoes;
        isFree = estacoes.every(e => e.preco === 0);
      } else if (evento.valor && evento.valor > 0) {
        estacoes = [{
          nome: 'Normal',
          quantidade: 100,
          preco: evento.valor,
          vantagens: ['Acesso geral']
        }];
        isFree = false;
      }

      const imageUrl = getEventImageUrl(evento.imagem_url);
      const videoUrl = getEventVideoUrl(evento.video_url);
      const pdfUrl = getEventPdfUrl(evento.arquivo_pdf_url);

      const hoje = new Date();
      const dataEvento = new Date(evento.data_evento);
      let status = 'A decorrer';
      if (dataEvento < hoje) {
        status = 'Finalizado';
      } else if (evento.deleted_at) {
        status = 'Cancelado';
      }

      const formattedEvent: Event = {
        id: evento.id,
        name: evento.nome_evento,
        description: evento.descricao || 'Sem descrição disponível',
        category: evento.categoria,
        date: evento.data_evento,
        time: formatTime(evento.hora_evento),
        endTime: formatTime(evento.hora_termino),
        eventType: evento.tipo_evento,
        location: evento.local || 'Local a definir',
        price: evento.valor || 0,
        isFree,
        image: imageUrl,
        video: videoUrl,
        pdf: pdfUrl,
        status,
        organizerId: evento.organizador_id,
        organizerName: organizador?.nome_empresa || 'Organizador não identificado',
        organizerEmail: organizador?.email_empresa,
        organizerPhone: evento.contacto_whatsapp,
        likes: likesCount || 0,
        estacoes: estacoes,
        reviews: formattedReviews,
        averageRating
      };

      setEvent(formattedEvent);

    } catch (err) {
      console.error('Erro inesperado:', err);
      setError('Ocorreu um erro ao carregar o evento');
    } finally {
      setIsLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    if (id) {
      fetchEvent(id);
    }
  }, [id, fetchEvent]);

  // Subscrição Realtime
  useEffect(() => {
    if (!id) return;

    const channel = supabase
      .channel(`evento-estacoes-${id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'eventos',
          filter: `id=eq.${id}`,
        },
        (payload) => {
          const novasEstacoes = (payload.new as any).estacoes;
          if (novasEstacoes) {
            setEvent(prev => prev ? { ...prev, estacoes: novasEstacoes } : prev);
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [id]);

  const onLikeToggle = async () => {
    if (!currentUser || !event) return;

    try {
      if (isLiked) {
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
        }
      } else {
        const insertData: any = {
          evento_id: event.id,
          created_at: new Date().toISOString()
        };

        if (currentUser.type === 'user') {
          insertData.usuario_normal_id = currentUser.id;
        } else if (currentUser.type === 'organizer') {
          insertData.organizador_id = currentUser.id;
        }

        const { error } = await supabase.from('favoritos_eventos').insert(insertData);
        if (!error) {
          setIsLiked(true);
          setEvent(prev => prev ? { ...prev, likes: prev.likes + 1 } : prev);
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
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(window.location.href);
        // alert("Link do evento copiado para a área de transferência!");
      }
    } catch (error) {
      console.error("Erro ao partilhar:", error);
    }
  };

  const handleGetFreeTicket = async () => {
    if (!currentUser || !event || !event.isFree) return;
    if (!canBuyTicket()) {
      alert(getBuyBlockMessage());
      return;
    }

    setIsGettingFreeTicket(true);

    try {
      const pedidoId = crypto.randomUUID();

      // console.log('📦 Criando pedido gratuito com ID:', pedidoId);
      // console.log('📧 Enviando para usuário:', currentUser.email);
      // console.log('🎫 Evento:', event.name);

      const { data: pedidoData, error: pedidoError } = await supabase
        .from('pedidos')
        .insert({
          id: pedidoId,
          evento_id: event.id,
          usuario_id: currentUser.id,
          estacao_nome: 'Gratuito',
          quantidade: 1,
          valor_total: 0,
          status: 'pago',
          pagamento_confirmado_em: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (pedidoError) {
        console.error('❌ Erro detalhado ao criar pedido:', pedidoError);
        throw new Error(`Erro ao criar pedido: ${pedidoError.message}`);
      }

      // console.log('✅ Pedido criado com sucesso:', pedidoData);

      const codigoTicket = `FREE_${event.id.substring(0, 8)}_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`.toUpperCase();

      // console.log('🎫 Gerando ticket com código:', codigoTicket);

      const { data: ticketData, error: ticketError } = await supabase
        .from('tickets')
        .insert({
          pedido_id: pedidoId,
          codigo: codigoTicket,
          utilizado: false,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (ticketError) {
        console.error('❌ Erro detalhado ao criar ticket:', ticketError);
        throw new Error(`Erro ao criar ticket: ${ticketError.message}`);
      }

      // console.log('✅ Ticket criado com sucesso:', ticketData);

      // Tentar enviar email
      let emailEnviado = false;
      try {
        if (emailService && typeof emailService.sendFreeTicketEmailSimple === 'function') {
          const emailResult = await emailService.sendFreeTicketEmailSimple({
            to_email: currentUser.email,
            to_name: currentUser.name,
            evento_nome: event.name,
            evento_data: event.date,
            evento_hora: event.time,
            evento_local: event.location,
            evento_imagem: event.image,
            codigo_ticket: codigoTicket
          });

          if (emailResult.success) {
            emailEnviado = true;
          }
        }
      } catch (emailErr) {
        console.error('Erro ao enviar email:', emailErr);
      }

      // Mostrar modal em vez de alert
      setGeneratedTicket({
        code: codigoTicket,
        eventName: event.name,
        emailSent: emailEnviado,
        userEmail: currentUser.email
      });
      setShowTicketModal(true);

      // await fetchEvent(event.id);

    } catch (err: any) {
      console.error('❌ Erro ao obter ingresso gratuito:', err);
      alert(`Erro ao obter ingresso gratuito: ${err.message || 'Tente novamente.'}`);
    } finally {
      setIsGettingFreeTicket(false);
    }
  };

  const onAddReview = async (rating: number, comment: string, images: any[]) => {
    // console.log('Review adicionada:', { rating, comment });
  };

  const onUpdateReview = async (reviewId: string, rating: number, comment: string, images: any[]) => {
    // console.log('Review actualizada:', reviewId);
  };

  const onDeleteReview = async (reviewId: string) => {
    // console.log('Review eliminada:', reviewId);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const formatDateFull = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  };

  const handleWhatsAppContact = () => {
    const phoneNumber = event?.organizerPhone || '244900000000';
    const message = encodeURIComponent(`Olá! Gostaria de obter mais informações sobre o evento: ${event?.name}.`);
    window.open(`https://wa.me/${phoneNumber}?text=${message}`, '_blank');
  };

  const getTotalIngressos = () => {
    if (!event?.estacoes) return 0;
    return event.estacoes.reduce((sum, estacao) => sum + estacao.quantidade, 0);
  };

  const fetchOrganizerInfo = async (organizerId: string) => {
    try {
      const { data: organizer, error: orgError } = await supabase
        .from('organizadores')
        .select('avatar_url, nome_empresa')
        .eq('id', organizerId)
        .single();

      if (!orgError && organizer) {
        setOrganizerAvatar(organizer.avatar_url);
      }

      const { count } = await supabase
        .from('favoritos_organizadores')
        .select('*', { count: 'exact', head: true })
        .eq('organizador_favoritado_id', organizerId);

      setFollowersCount(count || 0);

      if (currentUser && currentUser.type === 'user') {
        const { data: follow } = await supabase
          .from('favoritos_organizadores')
          .select('id')
          .eq('organizador_favoritado_id', organizerId)
          .eq('usuario_normal_id', currentUser.id)
          .maybeSingle();

        setIsFollowing(!!follow);
      }
    } catch (err) {
      console.error('Erro ao buscar informações do organizador:', err);
    }
  };

  const handleFollowToggle = async () => {
    if (!currentUser) {
      alert('Faça login para seguir organizadores');
      navigate('/login');
      return;
    }

    if (currentUser.type !== 'user') {
      alert('Apenas usuários podem seguir organizadores');
      return;
    }

    if (!event) return;

    try {
      if (isFollowing) {
        const { error } = await supabase
          .from('favoritos_organizadores')
          .delete()
          .eq('organizador_favoritado_id', event.organizerId)
          .eq('usuario_normal_id', currentUser.id);

        if (!error) {
          setIsFollowing(false);
          setFollowersCount(prev => prev - 1);
        }
      } else {
        const { error } = await supabase
          .from('favoritos_organizadores')
          .insert({
            organizador_favoritado_id: event.organizerId,
            usuario_normal_id: currentUser.id,
            created_at: new Date().toISOString()
          });

        if (!error) {
          setIsFollowing(true);
          setFollowersCount(prev => prev + 1);
        }
      }
    } catch (err) {
      console.error('Erro ao alternar follow:', err);
    }
  };

  const hasIngressosDisponiveis = () => {
    if (event?.isFree) return true;
    return getTotalIngressos() > 0;
  };

  const isEventFinalizado = () => {
    if (!event) return true;
    const hoje = new Date();
    const dataEvento = new Date(event.date);
    hoje.setHours(0, 0, 0, 0);
    dataEvento.setHours(0, 0, 0, 0);
    return dataEvento < hoje;
  };

  const isOwnEvent = () => {
    if (!currentUser || !event) return false;
    return currentUser.type === 'organizer' && currentUser.id === event.organizerId;
  };

  const getBuyBlockMessage = () => {
    if (isEventFinalizado()) return "Este evento já foi realizado";
    if (isOwnEvent()) return "Você não pode adquirir ingressos para seu próprio evento";
    if (!currentUser) return "Faça login para adquirir ingressos";
    return null;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-5xl font-bold text-orange-600 mb-4 flex items-center" style={{ animation: 'pulse 1.5s ease-in-out infinite' }}>
            <img src={logo} alt="Cresce.AO Logo" className="h-16 w-auto object-contain" />
            <span className="text-gray-400">Cresce</span>.AO
          </div>
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
          <button onClick={() => navigate(-1)} className="bg-orange-600 cursor-pointer text-white px-6 py-3 rounded-lg hover:bg-orange-700 transition-colors">
            Voltar aos eventos
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-600 cursor-pointer hover:text-gray-900 transition-colors">
              <ArrowLeft className="w-5 h-5" />
              <span>Voltar</span>
            </button>
            <div className="flex items-center">
              <img src={logo} alt="Cresce.AO Logo" className="h-10 w-auto object-contain" />
              <span className="text-xl font-bold text-gray-900 tracking-tight">
                Cresce<span className="text-orange-600">.AO</span>
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <div className="grid lg:grid-cols-2 gap-8 mb-8">
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-8 text-white flex flex-col justify-between min-h-[400px]">
            <div>
              <div className="text-sm text-gray-300 mb-4">Fale com o produtor: {event.organizerName}</div>
              <h1 className="text-4xl font-bold mb-6">{event.name}</h1>
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-gray-200">
                  <Calendar className="w-5 h-5" />
                  <span>{formatDate(event.date)} • {event.time}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-200">
                  <MapPin className="w-5 h-5" />
                  <span>Evento {event.eventType} em <span className="text-orange-400 font-semibold">{event.location}</span></span>
                </div>
              </div>
            </div>
            <div className="mt-6">
              <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold ${event.isFree ? 'bg-green-600' : 'bg-orange-600'}`}>
                {event.isFree ? (
                  <>
                    <Gift className="w-4 h-4" />
                    Evento Gratuito
                  </>
                ) : (
                  <>
                    <Ticket className="w-4 h-4" />
                    {event.price?.toLocaleString('pt-AO')} Kz
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="relative rounded-2xl overflow-hidden shadow-xl">
            <img
              src={event.image}
              alt={event.name}
              className="w-full h-full object-cover min-h-[400px]"
              onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800'; }}
            />
            {event.status === 'Cancelado' && (
              <div className="absolute top-6 left-6">
                <span className="px-4 py-2 bg-red-600 text-white rounded-full text-sm font-semibold shadow-lg">Evento Cancelado</span>
              </div>
            )}
            {isEventFinalizado() && event.status !== 'Cancelado' && (
              <div className="absolute top-6 left-6">
                <span className="px-4 py-2 bg-gray-600 text-white rounded-full text-sm font-semibold shadow-lg">Evento Realizado</span>
              </div>
            )}
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            {/* Descrição */}
            <div className="bg-white rounded-xl shadow-md p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6 pb-4 border-b border-gray-200">Descrição do evento</h2>
              <div className="space-y-4 text-gray-700 leading-relaxed">
                <p>{event.description}</p>
              </div>
            </div>

            {/* Tipos de Ingresso - SÓ MOSTRA SE NÃO FOR FINALIZADO E NÃO FOR GRATUITO */}
            {!isEventFinalizado() && !event.isFree && event.estacoes && event.estacoes.length > 0 && (
              <div className="bg-white rounded-xl shadow-md p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6 pb-4 border-b border-gray-200">Tipos de Ingresso</h2>
                <div className="space-y-4">
                  {event.estacoes.map((estacao, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="text-lg font-bold text-gray-900">{estacao.nome}</h3>
                          <p className="text-2xl font-bold text-orange-600 mt-1">{estacao.preco.toLocaleString()} Kz</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-500">
                            <span className={`font-semibold ${estacao.quantidade === 0 ? 'text-red-500' : 'text-gray-700'}`}>
                              {estacao.quantidade === 0 ? 'Esgotado' : `${estacao.quantidade} disponíveis`}
                            </span>
                          </p>
                        </div>
                      </div>
                      {estacao.vantagens && estacao.vantagens.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-gray-100">
                          <p className="text-sm font-semibold text-gray-700 mb-2">Vantagens:</p>
                          <ul className="space-y-1">
                            {estacao.vantagens.map((vantagem, idx) => (
                              <li key={idx} className="flex items-center gap-2 text-sm text-gray-600">
                                {vantagem}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                  <div className="bg-orange-50 rounded-lg p-4 mt-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Total de ingressos disponíveis</p>
                        <p className="text-2xl font-bold text-orange-600">{getTotalIngressos()}</p>
                      </div>
                      <Ticket className="w-8 h-8 text-orange-400" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Mensagem quando evento está finalizado */}
            {isEventFinalizado() && (
              <div className="bg-gray-50 rounded-xl shadow-md p-8 text-center">
                <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Ticket className="w-10 h-10 text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Evento Realizado</h3>
                <p className="text-gray-500">
                  Este evento já foi realizado. Não é possível adquirir ingressos.
                </p>
              </div>
            )}

            {/* Quiz */}
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
                <p className="text-gray-700 mb-4">Avalie o seu conhecimento respondendo a perguntas de múltipla escolha.</p>
                <button
                  onClick={() => setShowQuiz(true)}
                  className="w-full bg-purple-600 hover:bg-purple-700 cursor-pointer text-white py-3.5 px-6 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 shadow-md"
                >
                  <GraduationCap className="w-5 h-5" />
                  Testar Quiz
                </button>
              </div>
            </div>

            {/* Vídeo Promocional */}
            {event.video && (
              <div className="bg-white rounded-xl shadow-md p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Vídeo Promocional</h2>
                <div className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden group">
                  {showVideo ? (
                    <iframe src={event.video} title="Video do evento" className="w-full h-full" allowFullScreen />
                  ) : (
                    <>
                      <img src={event.image} alt={`Preview de ${event.name}`} className="w-full h-full object-cover" />
                      <button onClick={(e) => { e.stopPropagation(); setShowVideo(true); }} className="absolute inset-0 flex items-center justify-center">
                        <div className="w-20 h-20 bg-orange-600 rounded-full flex items-center justify-center shadow-2xl">
                          <svg className="w-10 h-10 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z" />
                          </svg>
                        </div>
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Seção do Organizador */}
            <div className="bg-white rounded-xl shadow-md p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Organizador</h2>

              <div className="flex items-center justify-between flex-wrap gap-4">
                <Link
                  to={`/organizer/${event.organizerId}`}
                  className="flex items-center gap-4 p-2 rounded-lg transition flex-1 min-w-0"
                >
                  <div className="w-16 h-16 rounded-full overflow-hidden bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
                    {organizerAvatar ? (
                      <img
                        src={organizerAvatar}
                        alt={event.organizerName}
                        className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                          const parent = (e.target as HTMLImageElement).parentElement;
                          if (parent) {
                            parent.innerHTML = event.organizerName.charAt(0).toUpperCase();
                          }
                        }}
                      />
                    ) : (
                      event.organizerName.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-xl font-semibold text-gray-900 hover:text-orange-600 transition-colors truncate">
                      {event.organizerName}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Users className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <p className="text-sm text-gray-500">
                        {followersCount} {followersCount === 1 ? 'seguidor' : 'seguidores'}
                      </p>
                    </div>
                  </div>
                </Link>

                {currentUser && currentUser.type === 'user' && currentUser.id !== event.organizerId && (
                  <button
                    onClick={handleFollowToggle}
                    className={`flex items-center gap-2 cursor-pointer px-4 py-2 rounded-lg font-semibold transition-all whitespace-nowrap ${isFollowing
                      ? 'bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100'
                      : 'bg-orange-50 text-orange-600 border border-orange-200 hover:bg-orange-100'
                      }`}
                  >
                    {isFollowing ? (
                      <>
                        <UserCheck className="w-4 h-4" />
                        <span>Seguindo</span>
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4" />
                        <span>Seguir</span>
                      </>
                    )}
                  </button>
                )}

                {(!currentUser || currentUser.type !== 'user' || currentUser.id === event.organizerId) && (
                  <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-lg whitespace-nowrap">
                    <Users className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-600">{followersCount} seguidores</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar - Informações e Contacto */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-md p-6 sticky top-24">
              <h3 className="text-lg font-semibold text-gray-700 mb-4">Informações e Contacto</h3>

              {event.status === 'A decorrer' && !isEventFinalizado() ? (
                <div className="space-y-4">
                  <div className="border border-gray-200 rounded-lg p-5">
                    <div className="space-y-4">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Calendar className="w-5 h-5 text-orange-600" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 font-medium">Data</p>
                          <p className="text-gray-900 font-semibold">{formatDateFull(event.date)}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Clock className="w-5 h-5 text-orange-600" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 font-medium">Horário</p>
                          <p className="text-gray-900 font-semibold">
                            {event.time}
                            {event.endTime ? ` - ${event.endTime}` : ''}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Building2 className="w-5 h-5 text-orange-600" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 font-medium">Modalidade</p>
                          <p className="text-gray-900 font-semibold capitalize">{event.eventType}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <MapPin className="w-5 h-5 text-orange-600" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm text-gray-600 font-medium">Local</p>
                          {event.location.startsWith('http') ? (
                            <a href={event.location} target="_blank" rel="noopener noreferrer" className="text-orange-600 hover:text-orange-700 font-semibold break-all text-sm">Link Online</a>
                          ) : (
                            <p className="text-gray-900 font-semibold">{event.location}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {!isEventFinalizado() && hasIngressosDisponiveis() && (
                    <div className="bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200 rounded-lg p-5">
                      <div className="text-center mb-4">
                        <h4 className="font-semibold text-gray-900 mb-2">
                          {event.isFree ? 'Garanta seu ingresso gratuito!' : 'Garanta seu lugar!'}
                        </h4>
                        <p className="text-sm text-gray-600">
                          {event.isFree
                            ? 'Evento gratuito. Clique abaixo para garantir seu ingresso.'
                            : 'Escolha o tipo de ingresso que melhor se adequa a você'}
                        </p>
                      </div>

                      {getBuyBlockMessage() ? (
                        <div className="text-center p-3 bg-gray-100 rounded-lg">
                          <p className="text-sm text-gray-600">{getBuyBlockMessage()}</p>
                        </div>
                      ) : event.isFree ? (
                        <button
                          onClick={handleGetFreeTicket}
                          disabled={isGettingFreeTicket}
                          className="w-full py-3.5 px-6 rounded-lg font-semibold transition-colors flex items-center justify-center gap-3 shadow-md bg-green-600 hover:bg-green-700 cursor-pointer text-white disabled:opacity-50"
                        >
                          {isGettingFreeTicket ? (
                            <>
                              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              Processando...
                            </>
                          ) : (
                            <>
                              <Gift className="w-6 h-6" />
                              Garantir Ingresso Gratuito
                            </>
                          )}
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={() => setShowBuyModal(true)}
                            disabled={!currentUser}
                            className={`w-full py-3.5 px-6 rounded-lg font-semibold transition-colors flex items-center justify-center gap-3 shadow-md ${currentUser ? 'bg-orange-600 hover:bg-orange-700 cursor-pointer text-white' : 'bg-gray-300 cursor-not-allowed text-gray-500'}`}
                          >
                            <Ticket className="w-6 h-6" />
                            {currentUser ? 'Comprar Ingresso' : 'Faça login para comprar'}
                          </button>
                          {!currentUser && (
                            <p className="text-xs text-center text-gray-500 mt-2">
                              <button onClick={() => navigate('/login')} className="text-orange-600 hover:underline">Faça login</button> para adquirir seu ingresso
                            </p>
                          )}
                        </>
                      )}
                    </div>
                  )}

                  <button
                    onClick={onLikeToggle}
                    className={`w-full px-6 py-3 rounded-lg cursor-pointer font-semibold transition-all flex items-center justify-center gap-2 ${isLiked ? 'bg-orange-600 text-white hover:bg-orange-700' : 'border-2 border-orange-600 text-orange-600 hover:bg-orange-50'}`}
                  >
                    <Heart className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`} />
                    {isLiked ? 'Interessado' : 'Demonstrar Interesse'}
                  </button>

                  <div className="text-center">
                    <p className="text-sm text-gray-600">
                      <span className="font-semibold text-gray-900">{event.likes}</span> pessoas interessadas
                    </p>
                  </div>
                </div>
              ) : (
                <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                  <p className="text-red-600 font-semibold mb-2">
                    {isEventFinalizado() ? 'Este evento já foi realizado' : 'Este evento foi cancelado'}
                  </p>
                  <p className="text-sm text-red-500">Entre em contacto com o organizador para mais informações</p>
                  <button onClick={handleWhatsAppContact} className="mt-4 w-full bg-green-600 cursor-pointer hover:bg-green-700 text-white py-3 px-6 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2">
                    <MessageCircle className="w-5 h-5" />
                    Contactar Organizador
                  </button>
                </div>
              )}

              <button onClick={handleShareEvent} className="w-full mt-4 px-6 py-3 cursor-pointer border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors flex items-center justify-center gap-2">
                <Share2 className="w-5 h-5" />
                Partilhar Evento
              </button>
            </div>
          </div>
        </div>

        {/* Modais */}
        {showBuyModal && event && !event.isFree && (
          <BuyTicketModal
            isOpen={showBuyModal}
            onClose={() => setShowBuyModal(false)}
            eventoId={event.id}
            eventoNome={event.name}
            estacoes={event.estacoes || []}
            usuario={currentUser}
            onCompraRealizada={() => fetchEvent(event.id)}
          />
        )}

        {showQuiz && event && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <EventQuiz eventId={event.id} eventName={event.name} onClose={() => setShowQuiz(false)} />
            </div>
          </div>
        )}

        {showTicketModal && generatedTicket && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
              <div className="text-center">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Gift className="w-10 h-10 text-green-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Ingresso Garantido!</h3>
                <p className="text-gray-600 mb-4">
                  Seu ingresso para <strong>{generatedTicket.eventName}</strong> foi gerado com sucesso.
                </p>

                {/* Imagem do evento no modal */}
                <div className="mb-4 rounded-xl overflow-hidden bg-gray-100">
                  <img
                    src={getEventImageUrl(event?.image || '')}
                    alt={generatedTicket.eventName}
                    className="w-full h-40 object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800';
                    }}
                  />
                </div>

                <div className="bg-gray-100 rounded-xl p-4 mb-4">
                  <p className="text-sm text-gray-500 mb-1">Código do ingresso:</p>
                  <p className="text-2xl font-mono font-bold text-orange-600 break-all">{generatedTicket.code}</p>
                </div>

                <div className="bg-blue-50 rounded-xl p-3 mb-4">
                  <p className="text-sm text-blue-700">
                    {generatedTicket.emailSent
                      ? `📧 Um email foi enviado para ${generatedTicket.userEmail} com os detalhes do seu ingresso.`
                      : `⚠️ Guarde este código! Você precisará dele para entrar no evento.`}
                  </p>
                </div>

                {/* Botões */}
                <div className="flex gap-3">
                  <button
                    onClick={async () => {
                      // Função para gerar PDF com imagem
                      const { jsPDF } = await import('jspdf');
                      const html2canvas = (await import('html2canvas')).default;

                      // Garantir que a imagem está carregada e usar a URL correta
                      const imagemUrl = getEventImageUrl(event?.image || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800');

                      // Pré-carregar a imagem para garantir que esteja disponível
                      const preloadImage = async (url: string): Promise<string> => {
                        return new Promise((resolve) => {
                          const img = new Image();
                          img.onload = () => resolve(url);
                          img.onerror = () => resolve('https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800');
                          img.src = url;
                        });
                      };

                      const imagemFinal = await preloadImage(imagemUrl);

                      // Criar elemento temporário para o PDF
                      const pdfContent = document.createElement('div');
                      pdfContent.style.width = '600px';
                      pdfContent.style.padding = '20px';
                      pdfContent.style.backgroundColor = 'white';
                      pdfContent.style.fontFamily = 'Arial, sans-serif';
                      pdfContent.innerHTML = `
                <div style="text-align: center; margin-bottom: 20px;">
                  <h1 style="color: #f97316; margin-bottom: 10px;">CRESCE.AO</h1>
                  <h2 style="color: #333;">INGRESSO DE EVENTO</h2>
                  <div style="width: 100px; height: 4px; background: linear-gradient(90deg, #f97316, #ea580c); margin: 10px auto;"></div>
                </div>
                
                <div style="margin-bottom: 20px; text-align: center;">
                  <img src="${imagemFinal}" alt="${generatedTicket.eventName}" style="width: 100%; max-height: 250px; object-fit: cover; border-radius: 12px; margin-bottom: 15px;" />
                </div>
                
                <div style="background: #f9fafb; padding: 15px; border-radius: 12px; margin-bottom: 20px;">
                  <h3 style="color: #333; margin-bottom: 10px;">📋 INFORMAÇÕES DO EVENTO</h3>
                  <p style="margin: 5px 0;"><strong>Evento:</strong> ${generatedTicket.eventName}</p>
                  <p style="margin: 5px 0;"><strong>Data:</strong> ${event ? new Date(event.date).toLocaleDateString('pt-PT', { day: '2-digit', month: 'long', year: 'numeric' }) : ''}</p>
                  <p style="margin: 5px 0;"><strong>Horário:</strong> ${event?.time || ''}</p>
                  <p style="margin: 5px 0;"><strong>Local:</strong> ${event?.location || ''}</p>
                </div>
                
                <div style="background: #fff3e0; border: 2px dashed #f97316; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 20px;">
                  <p style="font-size: 12px; color: #666; margin-bottom: 5px;">CÓDIGO DO INGRESSO</p>
                  <div style="font-size: 24px; font-weight: bold; color: #f97316; letter-spacing: 2px; font-family: monospace; word-break: break-all;">${generatedTicket.code}</div>
                </div>
                
                <div style="background: #f0fdf4; padding: 15px; border-radius: 12px; margin-bottom: 20px;">
                  <h3 style="color: #333; margin-bottom: 10px;">👤 DADOS DO PARTICIPANTE</h3>
                  <p style="margin: 5px 0;"><strong>Nome:</strong> ${currentUser?.name || ''}</p>
                  <p style="margin: 5px 0;"><strong>Email:</strong> ${currentUser?.email || ''}</p>
                </div>
                
                <div style="text-align: center; padding-top: 20px; border-top: 1px solid #e5e7eb; margin-top: 10px;">
                  <p style="font-size: 10px; color: #999;">Este ingresso é pessoal e intransferível. Apresente-o na entrada do evento.</p>
                  <p style="font-size: 10px; color: #999; margin-top: 5px;">Cresce.AO - Plataforma de Eventos</p>
                </div>
              `;

                      document.body.appendChild(pdfContent);

                      try {
                        // Aguardar um pouco para garantir que a imagem foi carregada no DOM
                        await new Promise(resolve => setTimeout(resolve, 500));

                        const canvas = await html2canvas(pdfContent, {
                          scale: 2,
                          backgroundColor: '#ffffff',
                          logging: false,
                          useCORS: true, // Permitir imagens de URLs externas
                          allowTaint: false
                        });

                        const imgData = canvas.toDataURL('image/png');
                        const pdf = new jsPDF({
                          orientation: 'portrait',
                          unit: 'mm',
                          format: 'a4'
                        });

                        const imgWidth = 210;
                        const imgHeight = (canvas.height * imgWidth) / canvas.width;

                        pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
                        pdf.save(`ingresso_${generatedTicket.eventName.replace(/\s/g, '_')}.pdf`);
                      } finally {
                        document.body.removeChild(pdfContent);
                      }
                    }}
                    className="flex-1 bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Baixar PDF
                  </button>
                  <button
                    onClick={() => {
                      setShowTicketModal(false);
                      setGeneratedTicket(null);
                    }}
                    className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="mt-8">
          <EventReviews
            eventId={event.id}
            onAddReview={onAddReview}
            onUpdateReview={onUpdateReview}
            onDeleteReview={onDeleteReview}
            currentUserName={currentUser?.name}
            currentUserId={currentUser?.id}
            currentUserType={currentUser?.type}
          />
        </div>
      </main>

      <Footer
        onExplore={() => navigate('/events')}
        onNavigateToPrivacy={() => navigate('/privacy-policy')}
        onNavigateToTerms={() => navigate('/terms-of-use')}
      />
    </div>
  );
}