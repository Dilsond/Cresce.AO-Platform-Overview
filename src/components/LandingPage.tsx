import { Sparkles, Calendar, Users, TrendingUp, Search, Target, Network, Rocket, ArrowRight, Star, Quote, ChevronDown, Building2, Award, ChevronLeft, ChevronRight, MapPin, Clock } from 'lucide-react';
import { useState, useEffect } from 'react';
import { landingPageSlides, cursosWorkshops, eventosNegocios } from './LandingPageSlides';
import { AnimatedCounter } from './AnimatedCounter';
import { Footer } from './Footer';
import heroBg from "figma:asset/d48dbf308596a19f3efe4145eb156c4fa0bae765.png";

interface LandingPageProps {
  onExplore: () => void;
  onNavigateToPrivacy?: () => void;
  onNavigateToTerms?: () => void;
}

export function LandingPage({ onExplore, onNavigateToPrivacy, onNavigateToTerms }: LandingPageProps) {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const slides = landingPageSlides;

  // Auto-play do slideshow
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [slides.length]);

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
  };

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50">
      {/* Hero Section */}
      <section className="relative h-[600px] flex items-center justify-center overflow-hidden text-white">
        <div className="absolute inset-0 w-full h-full z-0">
          <div className="absolute inset-0 bg-black/60 z-10"></div>
          <video
            autoPlay
            loop
            muted
            playsInline
            poster={heroBg}
            className="absolute inset-0 w-full h-full object-cover blur-sm"
            style={{ filter: 'blur(3px)' }}
          >
            <source src="/videos/hero-background.mp4" type="video/mp4" />
          </video>
        </div>
        
        <div className="relative z-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 sm:py-32 w-full">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-6">
              <Sparkles className="w-12 h-12" />
              <h1 className="text-5xl sm:text-7xl font-bold">Cresce.AO</h1>
            </div>
            <p className="text-xl sm:text-2xl mb-8 max-w-3xl mx-auto opacity-95">
              A plataforma que centraliza oportunidades de aprendizagem, networking e desenvolvimento profissional em Angola
            </p>
            <button
              onClick={onExplore}
              className="bg-white text-orange-600 px-8 py-4 rounded-lg font-semibold text-lg hover:bg-gray-100 transition-all transform hover:scale-105 shadow-xl"
            >
              Explorar Eventos
            </button>
          </div>
        </div>
      </section>

      {/* Slideshow de Atividades Disponíveis */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Atividades em Destaque
            </h2>
            <p className="text-xl text-gray-600">
              Explore as últimas oportunidades de aprendizagem e networking
            </p>
          </div>

          <div className="relative">
            {/* Slider Container */}
            <div className="relative h-[400px] flex items-center justify-center overflow-hidden">
              {/* Slides */}
              <div className="relative w-full h-full flex items-center justify-center">
                {slides.map((slide, index) => {
                  const position = index - currentSlide;
                  const isActive = position === 0;
                  const isPrev = position === -1 || (currentSlide === 0 && index === slides.length - 1);
                  const isNext = position === 1 || (currentSlide === slides.length - 1 && index === 0);
                  const isVisible = isActive || isPrev || isNext;

                  if (!isVisible) return null;

                  return (
                    <div
                      key={slide.id}
                      className={`absolute transition-all duration-500 ease-in-out ${
                        isActive 
                          ? 'z-30 scale-100 opacity-100 translate-x-0' 
                          : isPrev
                            ? 'z-10 scale-75 opacity-40 -translate-x-[60%]'
                            : 'z-10 scale-75 opacity-40 translate-x-[60%]'
                      }`}
                      style={{
                        width: isActive ? '600px' : '500px',
                        maxWidth: '90vw'
                      }}
                    >
                      <div className="relative h-[350px] rounded-2xl overflow-hidden shadow-2xl">
                        <img
                          src={slide.image}
                          alt={slide.title}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent"></div>
                        <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="bg-orange-600 px-3 py-1 rounded-full text-xs font-semibold">
                              {slide.category}
                            </span>
                            <span className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full text-xs">
                              {slide.eventType}
                            </span>
                          </div>
                          <h3 className="text-2xl font-bold mb-2">
                            {slide.title}
                          </h3>
                          <p className="text-white/90 text-sm mb-3 line-clamp-2">
                            {slide.description}
                          </p>
                          <div className="flex flex-wrap items-center gap-3 text-xs mb-3">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              <span>{slide.date}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              <span>{slide.time}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              <span className="line-clamp-1">{slide.location}</span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className={`text-xl font-bold ${slide.price === 'Gratuito' ? 'text-green-400' : 'text-orange-400'}`}>
                              {slide.price}
                            </span>
                            {isActive && (
                              <button 
                                onClick={onExplore}
                                className="bg-orange-600 hover:bg-orange-700 px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
                              >
                                Ver Detalhes
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Navigation Buttons */}
            <button
              onClick={prevSlide}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-40 bg-white hover:bg-orange-600 text-orange-600 hover:text-white p-3 rounded-full shadow-lg transition-all transform hover:scale-110"
              aria-label="Anterior"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            
            <button
              onClick={nextSlide}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-40 bg-white hover:bg-orange-600 text-orange-600 hover:text-white p-3 rounded-full shadow-lg transition-all transform hover:scale-110"
              aria-label="Próximo"
            >
              <ChevronRight className="w-6 h-6" />
            </button>

            {/* Dots Indicator */}
            <div className="flex justify-center gap-2 mt-6">
              {slides.map((_, index) => (
                <button
                  key={index}
                  onClick={() => goToSlide(index)}
                  className={`h-2 rounded-full transition-all ${
                    index === currentSlide 
                      ? 'bg-orange-600 w-8' 
                      : 'bg-gray-300 w-2 hover:bg-gray-400'
                  }`}
                  aria-label={`Ir para slide ${index + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Cursos e Workshops - Scroll Horizontal */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-bold text-gray-900">Workshops</h2>
            <button 
              onClick={onExplore}
              className="text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1"
            >
              Ver tudo <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Scroll horizontal */}
          <div className="overflow-x-auto scrollbar-hide -mx-4 px-4">
            <div className="flex gap-4 pb-4">
              {cursosWorkshops.map((curso) => (
                <div key={curso.id} className="flex-shrink-0 w-[280px]">
                  <div className="bg-white rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-all cursor-pointer h-full transform hover:-translate-y-1" onClick={onExplore}>
                    <div className="relative h-[180px]">
                      <img 
                        src={curso.image}
                        alt={curso.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="p-4">
                      <h3 className="font-bold text-gray-900 mb-2">{curso.title}</h3>
                      <p className="text-sm text-gray-600 mb-1">{curso.location}</p>
                      <p className="text-xs text-gray-500">{curso.date}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Eventos de Negócios e Networking - Scroll Horizontal */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-bold text-gray-900">
              Eventos de Negócios e Networking
            </h2>
            <button 
              onClick={onExplore}
              className="text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1"
            >
              Ver tudo <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Scroll horizontal */}
          <div className="overflow-x-auto scrollbar-hide -mx-4 px-4">
            <div className="flex gap-4 pb-4">
              {eventosNegocios.map((evento) => (
                <div key={evento.id} className="flex-shrink-0 w-[280px]">
                  <div className="bg-white rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-all cursor-pointer h-full transform hover:-translate-y-1" onClick={onExplore}>
                    <div className="relative h-[180px]">
                      <img 
                        src={evento.image}
                        alt={evento.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="p-4">
                      <h3 className="font-bold text-gray-900 mb-2">{evento.title}</h3>
                      <p className="text-sm text-gray-600 mb-1">{evento.location}</p>
                      <p className="text-xs text-gray-500">{evento.date}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Por que escolher o Cresce.AO */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Por que escolher o Cresce.AO?
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              A plataforma que centraliza todas as oportunidades de crescimento profissional em Angola
            </p>
          </div>

          {/* Estatísticas */}
          <div className="grid md:grid-cols-3 gap-8 mb-16 max-w-4xl mx-auto">
            <div className="bg-gradient-to-br from-orange-50 to-white p-8 rounded-2xl shadow-lg border border-orange-100 text-center hover:scale-105 hover:shadow-xl transition-all">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-100 rounded-full mb-4">
                <Users className="w-8 h-8 text-orange-600" />
              </div>
              <div className="text-4xl font-bold text-gray-900 mb-2">
                <AnimatedCounter end={5247} duration={2500} />+
              </div>
              <p className="text-gray-600 font-medium">Profissionais Cadastrados</p>
            </div>

            <div className="bg-gradient-to-br from-orange-50 to-white p-8 rounded-2xl shadow-lg border border-orange-100 text-center hover:scale-105 hover:shadow-xl transition-all">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-100 rounded-full mb-4">
                <Calendar className="w-8 h-8 text-orange-600" />
              </div>
              <div className="text-4xl font-bold text-gray-900 mb-2">
                <AnimatedCounter end={287} duration={2500} />+
              </div>
              <p className="text-gray-600 font-medium">Eventos Realizados</p>
            </div>

            <div className="bg-gradient-to-br from-orange-50 to-white p-8 rounded-2xl shadow-lg border border-orange-100 text-center hover:scale-105 hover:shadow-xl transition-all">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-100 rounded-full mb-4">
                <Building2 className="w-8 h-8 text-orange-600" />
              </div>
              <div className="text-4xl font-bold text-gray-900 mb-2">
                <AnimatedCounter end={63} duration={2500} />+
              </div>
              <p className="text-gray-600 font-medium">Empresas Parceiras</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {/* Centralização */}
            <div className="text-center hover:scale-105 transition-transform">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-100 rounded-2xl mb-4">
                <Search className="w-8 h-8 text-orange-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Centralização
              </h3>
              <p className="text-gray-600">
                Todos os eventos corporativos e formativos em um só lugar
              </p>
            </div>

            {/* Relevância */}
            <div className="text-center hover:scale-105 transition-transform">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-100 rounded-2xl mb-4">
                <Target className="w-8 h-8 text-orange-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Relevância
              </h3>
              <p className="text-gray-600">
                Filtros inteligentes para encontrar eventos do seu interesse
              </p>
            </div>

            {/* Networking */}
            <div className="text-center hover:scale-105 transition-transform">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-100 rounded-2xl mb-4">
                <Network className="w-8 h-8 text-orange-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Networking
              </h3>
              <p className="text-gray-600">
                Conecte-se com profissionais e empresas de referência
              </p>
            </div>

            {/* Crescimento */}
            <div className="text-center hover:scale-105 transition-transform">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-100 rounded-2xl mb-4">
                <Rocket className="w-8 h-8 text-orange-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Crescimento
              </h3>
              <p className="text-gray-600">
                Desenvolva competências e impulsione a sua carreira
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Como Funciona */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Como Funciona?
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Simples, rápido e eficiente. Comece a crescer em apenas 3 passos
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Passo 1 */}
            <div className="text-center relative">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-orange-600 text-white rounded-full mb-6 text-2xl font-bold shadow-lg">
                1
              </div>
              <h3 className="text-2xl font-semibold text-gray-900 mb-4">
                Pesquise
              </h3>
              <p className="text-gray-600 text-lg">
                Explore eventos por categoria, data ou localização. Use filtros inteligentes para encontrar oportunidades perfeitas para você.
              </p>
              {/* Seta */}
              <div className="hidden md:block absolute top-10 -right-8 text-orange-600">
                <ArrowRight className="w-8 h-8" />
              </div>
            </div>

            {/* Passo 2 */}
            <div className="text-center relative">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-orange-600 text-white rounded-full mb-6 text-2xl font-bold shadow-lg">
                2
              </div>
              <h3 className="text-2xl font-semibold text-gray-900 mb-4">
                Escolha
              </h3>
              <p className="text-gray-600 text-lg">
                Visualize detalhes completos dos eventos, veja informações sobre organizadores e salve seus favoritos.
              </p>
              {/* Seta */}
              <div className="hidden md:block absolute top-10 -right-8 text-orange-600">
                <ArrowRight className="w-8 h-8" />
              </div>
            </div>

            {/* Passo 3 */}
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-orange-600 text-white rounded-full mb-6 text-2xl font-bold shadow-lg">
                3
              </div>
              <h3 className="text-2xl font-semibold text-gray-900 mb-4">
                Participe
              </h3>
              <p className="text-gray-600 text-lg">
                Inscreva-se no evento, prepare-se e aproveite ao máximo essa oportunidade de crescimento profissional.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Categorias */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Categorias de Atividades
            </h2>
            <p className="text-xl text-gray-600">
              Explore diferentes tipos de eventos formativos e corporativos
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {['Palestras', 'Workshops', 'Feiras', 'Masterclasses'].map((category) => (
              <div key={category} className="bg-white p-6 rounded-xl shadow-md hover:shadow-xl transition-all text-center border border-orange-200 hover:border-orange-600 cursor-pointer transform hover:-translate-y-1 h-full">
                <div className="text-3xl mb-3">
                  {category === 'Palestras' && '🎤'}
                  {category === 'Workshops' && '🛠️'}
                  {category === 'Feiras' && '🏢'}
                  {category === 'Masterclasses' && '🎓'}
                </div>
                <h3 className="text-xl font-semibold text-gray-900">{category}</h3>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Depoimentos */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              O que dizem os nossos utilizadores
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Histórias reais de profissionais que transformaram suas carreiras através do Cresce.AO
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Depoimento 1 */}
            <div className="bg-white p-8 rounded-xl relative shadow-md hover:shadow-lg transition-shadow">
              <Quote className="w-10 h-10 text-orange-600 mb-4" />
              <p className="text-gray-700 mb-6 text-lg">
                "O Cresce.AO facilitou muito a minha procura por eventos de qualidade. Consegui participar em workshops que realmente impactaram a minha carreira."
              </p>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-orange-600 rounded-full flex items-center justify-center text-white font-semibold">
                  MC
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Maria Costa</p>
                  <p className="text-gray-600 text-sm">Analista de Marketing</p>
                </div>
              </div>
              <div className="flex gap-1 mt-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 fill-orange-600 text-orange-600" />
                ))}
              </div>
            </div>

            {/* Depoimento 2 */}
            <div className="bg-white p-8 rounded-xl relative shadow-md hover:shadow-lg transition-shadow">
              <Quote className="w-10 h-10 text-orange-600 mb-4" />
              <p className="text-gray-700 mb-6 text-lg">
                "Plataforma incrível! Encontrei várias oportunidades de networking e aprendi com profissionais de referência no mercado angolano."
              </p>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-orange-600 rounded-full flex items-center justify-center text-white font-semibold">
                  JS
                </div>
                <div>
                  <p className="font-semibold text-gray-900">João Silva</p>
                  <p className="text-gray-600 text-sm">Gestor de Projetos</p>
                </div>
              </div>
              <div className="flex gap-1 mt-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 fill-orange-600 text-orange-600" />
                ))}
              </div>
            </div>

            {/* Depoimento 3 */}
            <div className="bg-white p-8 rounded-xl relative shadow-md hover:shadow-lg transition-shadow">
              <Quote className="w-10 h-10 text-orange-600 mb-4" />
              <p className="text-gray-700 mb-6 text-lg">
                "A centralização de eventos numa única plataforma poupou-me muito tempo. Agora consigo planear melhor o meu desenvolvimento profissional."
              </p>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-orange-600 rounded-full flex items-center justify-center text-white font-semibold">
                  AF
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Ana Fernandes</p>
                  <p className="text-gray-600 text-sm">Empreendedora</p>
                </div>
              </div>
              <div className="flex gap-1 mt-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 fill-orange-600 text-orange-600" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Perguntas Frequentes
            </h2>
            <p className="text-xl text-gray-600">
              Tire as suas dúvidas sobre a plataforma
            </p>
          </div>

          <div className="space-y-4">
            {/* FAQ 1 */}
            <div className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-200">
              <button
                onClick={() => toggleFaq(0)}
                className="w-full px-8 py-6 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
              >
                <span className="font-semibold text-lg text-gray-900">
                  A plataforma é gratuita?
                </span>
                <ChevronDown
                  className={`w-6 h-6 text-orange-600 transition-transform ${
                    openFaq === 0 ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {openFaq === 0 && (
                <div className="px-8 pb-6 text-gray-600">
                  Sim! O Cresce.AO é totalmente gratuito para utilizadores que desejam explorar e participar em eventos. 
                  Organizadores também podem publicar eventos gratuitamente na plataforma.
                </div>
              )}
            </div>

            {/* FAQ 2 */}
            <div className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-200">
              <button
                onClick={() => toggleFaq(1)}
                className="w-full px-8 py-6 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
              >
                <span className="font-semibold text-lg text-gray-900">
                  Como me inscrevo num evento?
                </span>
                <ChevronDown
                  className={`w-6 h-6 text-orange-600 transition-transform ${
                    openFaq === 1 ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {openFaq === 1 && (
                <div className="px-8 pb-6 text-gray-600">
                  É muito simples! Navegue pelos eventos disponíveis, clique no evento que lhe interessa para ver os detalhes completos, 
                  e siga as instruções de inscrição fornecidas pelo organizador. Algumas inscrições são feitas diretamente na plataforma, 
                  outras podem redirecionar para o site do organizador.
                </div>
              )}
            </div>

            {/* FAQ 3 */}
            <div className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-200">
              <button
                onClick={() => toggleFaq(2)}
                className="w-full px-8 py-6 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
              >
                <span className="font-semibold text-lg text-gray-900">
                  Como publico um evento?
                </span>
                <ChevronDown
                  className={`w-6 h-6 text-orange-600 transition-transform ${
                    openFaq === 2 ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {openFaq === 2 && (
                <div className="px-8 pb-6 text-gray-600">
                  Para publicar um evento, primeiro faça o cadastro como organizador. Após o login, aceda ao painel do organizador 
                  e clique em "Criar Evento". Preencha as informações do evento (título, descrição, data, local, categoria) e publique. 
                  O seu evento ficará visível para todos os utilizadores da plataforma!
                </div>
              )}
            </div>

            {/* FAQ 4 */}
            <div className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-200">
              <button
                onClick={() => toggleFaq(3)}
                className="w-full px-8 py-6 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
              >
                <span className="font-semibold text-lg text-gray-900">
                  Posso salvar eventos para ver mais tarde?
                </span>
                <ChevronDown
                  className={`w-6 h-6 text-orange-600 transition-transform ${
                    openFaq === 3 ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {openFaq === 3 && (
                <div className="px-8 pb-6 text-gray-600">
                  Sim! Utilize a funcionalidade de "curtidas" para marcar eventos do seu interesse. 
                  Todos os eventos que você curtir ficam salvos no seu perfil para fácil acesso posterior.
                </div>
              )}
            </div>

            {/* FAQ 5 */}
            <div className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-200">
              <button
                onClick={() => toggleFaq(4)}
                className="w-full px-8 py-6 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
              >
                <span className="font-semibold text-lg text-gray-900">
                  Que tipos de eventos posso encontrar?
                </span>
                <ChevronDown
                  className={`w-6 h-6 text-orange-600 transition-transform ${
                    openFaq === 4 ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {openFaq === 4 && (
                <div className="px-8 pb-6 text-gray-600">
                  No Cresce.AO você encontra diversos tipos de eventos: Palestras, Workshops práticos, 
                  Feiras corporativas e Masterclasses. Todos focados em desenvolvimento profissional, 
                  networking e aprendizagem contínua.
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action Final */}
      <section className="py-20 bg-gradient-to-r from-orange-600 to-red-600 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold mb-6">
            Pronto para Crescer?
          </h2>
          <p className="text-xl mb-8 opacity-95">
            Junte-se à comunidade de profissionais angolanos que estão a investir no seu desenvolvimento
          </p>
          <button
            onClick={onExplore}
            className="bg-white text-orange-600 px-8 py-4 rounded-lg font-semibold text-lg hover:bg-gray-100 transition-all transform hover:scale-105 shadow-xl"
          >
            Começar Agora
          </button>
        </div>
      </section>

      {/* Parceiros */}
      <section className="py-16 bg-white border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h3 className="text-2xl font-semibold text-gray-900 mb-2">
              Parceiros e Organizações
            </h3>
            <p className="text-gray-600">
              Empresas e instituições que confiam na nossa plataforma
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 items-center justify-items-center opacity-60">
            {/* Parceiro 1 */}
            <div className="flex items-center justify-center w-full h-20 bg-gray-50 border border-gray-200 rounded-lg px-6 hover:border-orange-600 transition-colors">
              <span className="font-bold text-xl text-gray-700">SONANGOL</span>
            </div>

            {/* Parceiro 2 */}
            <div className="flex items-center justify-center w-full h-20 bg-gray-50 border border-gray-200 rounded-lg px-6 hover:border-orange-600 transition-colors">
              <span className="font-bold text-xl text-gray-700">YAMAL</span>
            </div>

            {/* Parceiro 3 */}
            <div className="flex items-center justify-center w-full h-20 bg-gray-50 border border-gray-200 rounded-lg px-6 hover:border-orange-600 transition-colors">
              <span className="font-bold text-xl text-gray-700">INACOM</span>
            </div>

            {/* Parceiro 4 */}
            <div className="flex items-center justify-center w-full h-20 bg-gray-50 border border-gray-200 rounded-lg px-6 hover:border-orange-600 transition-colors">
              <span className="font-bold text-xl text-gray-700">RAPHINHA</span>
            </div>

            {/* Parceiro 5 */}
            <div className="flex items-center justify-center w-full h-20 bg-gray-50 border border-gray-200 rounded-lg px-6 hover:border-orange-600 transition-colors">
              <span className="font-bold text-xl text-gray-700">TAAG</span>
            </div>

            {/* Parceiro 6 */}
            <div className="flex items-center justify-center w-full h-20 bg-gray-50 border border-gray-200 rounded-lg px-6 hover:border-orange-600 transition-colors">
              <span className="font-bold text-xl text-gray-700">FC BARCELONA</span>
            </div>

            {/* Parceiro 7 */}
            <div className="flex items-center justify-center w-full h-20 bg-gray-50 border border-gray-200 rounded-lg px-6 hover:border-orange-600 transition-colors">
              <span className="font-bold text-xl text-gray-700">UNITEL</span>
            </div>

            {/* Parceiro 8 */}
            <div className="flex items-center justify-center w-full h-20 bg-gray-50 border border-gray-200 rounded-lg px-6 hover:border-orange-600 transition-colors">
              <span className="font-bold text-xl text-gray-700">LEO MESSI</span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer 
        onExplore={onExplore}
        onNavigateToPrivacy={onNavigateToPrivacy}
        onNavigateToTerms={onNavigateToTerms}
      />
    </div>
  );
}