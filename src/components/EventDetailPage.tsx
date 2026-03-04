import image_2b98f25257b1238c48d47c9236d12c5ed6e3cffe from 'figma:asset/2b98f25257b1238c48d47c9236d12c5ed6e3cffe.png'
import image_60c6c4feca86a0a2717d134942980a7a4f5c7e88 from 'figma:asset/60c6c4feca86a0a2717d134942980a7a4f5c7e88.png'
import { ArrowLeft, Calendar, MapPin, Heart, Building2, Clock, Share2, CreditCard, Minus, Plus, Info, MessageCircle, GraduationCap, MessageSquare } from 'lucide-react';
import type { Event, User } from '../App';
import { EventReviews } from './EventReviews';
import { Breadcrumbs } from './Breadcrumbs';
import { useState } from 'react';
import { EventQuiz } from './EventQuiz';
import { EventChat } from './EventChat';
import { Footer } from './Footer';

interface EventDetailPageProps {
  event: Event;
  isLiked: boolean;
  onLikeToggle: () => void;
  onBack: () => void;
  currentUser: User | null;
  onAddReview: (eventId: string, rating: number, comment: string, images?: string[]) => void;
  onUpdateReview?: (eventId: string, reviewId: string, rating: number, comment: string, images?: string[]) => void;
  onDeleteReview?: (eventId: string, reviewId: string) => void;
  onNavigateToPrivacy?: () => void;
  onNavigateToTerms?: () => void;
}

export function EventDetailPage({ event, isLiked, onLikeToggle, onBack, currentUser, onAddReview, onUpdateReview, onDeleteReview, onNavigateToPrivacy, onNavigateToTerms }: EventDetailPageProps) {
  const [showQuiz, setShowQuiz] = useState(false);
  const [showChat, setShowChat] = useState(false);

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
    const phoneNumber = '244900000000'; // Mock number - replace with actual organizer phone
    const message = encodeURIComponent(
      `Olá! Gostaria de obter mais informações sobre o evento: ${event.name}`
    );
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${message}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Voltar aos Eventos
          </button>
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
              src={image_2b98f25257b1238c48d47c9236d12c5ed6e3cffe}
              alt={event.name}
              className="w-full h-full object-cover min-h-[400px]"
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
              <button className="flex items-center gap-2 bg-white px-5 py-3 rounded-full shadow-lg hover:bg-gray-100 transition-colors">
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
                
                {/* Additional descriptive content */}
                <p className="text-gray-600">
                  Esta é uma oportunidade única de participar num evento que une profissionais, 
                  estudantes e entusiastas da área. Prepare-se para uma experiência enriquecedora 
                  com networking, aprendizagem e desenvolvimento profissional.
                </p>
                
                <p className="text-gray-600">
                  Não perca esta chance de expandir seus horizontes e conectar-se com outros 
                  profissionais da sua área de interesse.
                </p>
                
                <p className="font-semibold text-gray-900 mt-6">
                  Preparado para este encontro no {event.location}?
                </p>
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
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3.5 px-6 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 shadow-md"
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
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Vídeo Promocional</h2>
                <div className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden group">
                  {/* Video Thumbnail/Preview */}
                  <img
                    src={event.image}
                    alt={`Preview de ${event.name}`}
                    className="w-full h-full object-cover"
                  />
                  
                  {/* Overlay gradient */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent"></div>
                  
                  {/* Play button */}
                  <a
                    href={event.video}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="absolute inset-0 flex items-center justify-center group-hover:bg-black/20 transition-all"
                  >
                    <div className="w-20 h-20 bg-orange-600 rounded-full flex items-center justify-center group-hover:bg-orange-700 group-hover:scale-110 transition-all shadow-2xl">
                      <svg 
                        className="w-10 h-10 text-white ml-1" 
                        fill="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path d="M8 5v14l11-7z"/>
                      </svg>
                    </div>
                  </a>
                  
                  {/* Label */}
                  <div className="absolute bottom-4 left-4 bg-black/70 backdrop-blur-sm px-4 py-2 rounded-lg">
                    <p className="text-white font-semibold text-sm">▶ Assistir Vídeo Promocional</p>
                  </div>
                </div>
              </div>
            )}

            {/* Organizer Info */}
            <div className="bg-white rounded-xl shadow-md p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Organizador</h2>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-gradient-to-br from-orange-600 to-red-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                  {event.organizerName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">{event.organizerName}</h3>
                  <p className="text-gray-600">Organizador de Eventos</p>
                </div>
              </div>
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
                      className="w-full bg-green-600 hover:bg-green-700 text-white py-3.5 px-6 rounded-lg font-semibold transition-colors flex items-center justify-center gap-3 shadow-md"
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
                    className={`w-full px-6 py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${
                      isLiked
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
              <button className="w-full mt-4 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors flex items-center justify-center gap-2">
                <Share2 className="w-5 h-5" />
                Partilhar Evento
              </button>
            </div>

            {/* Quiz Section */}
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-xl shadow-md p-6">
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
            </div>

            {/* Chat Section */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl shadow-md p-6">
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
            </div>
          </div>
        </div>

        {/* Reviews Section */}
        <div className="mt-8">
          <EventReviews
            reviews={event.reviews}
            averageRating={event.averageRating}
            onAddReview={(rating, comment, images) => onAddReview(event.id, rating, comment, images)}
            onUpdateReview={onUpdateReview ? (reviewId, rating, comment, images) => onUpdateReview(event.id, reviewId, rating, comment, images) : undefined}
            onDeleteReview={onDeleteReview ? (reviewId) => onDeleteReview(event.id, reviewId) : undefined}
            currentUserName={currentUser?.name}
          />
        </div>
      </main>

      {/* Quiz Modal */}
      {showQuiz && (
        <EventQuiz 
          eventName={event.name}
          eventCategory={event.category}
          eventImage={event.image}
          onClose={() => setShowQuiz(false)}
        />
      )}

      {/* Chat Modal */}
      {showChat && (
        <EventChat 
          eventId={event.id}
          eventName={event.name}
          currentUser={currentUser}
          onClose={() => setShowChat(false)}
        />
      )}

      {/* Footer */}
      <Footer onNavigateToPrivacy={onNavigateToPrivacy} onNavigateToTerms={onNavigateToTerms} />
    </div>
  );
}