import { useState, useEffect } from 'react';
import { LandingPage } from './components/LandingPage';
import { LoginPage } from './components/LoginPage';
import { SignupPage } from './components/SignupPage';
import { OrganizerSignupPage } from './components/OrganizerSignupPage';
import { EventsPage } from './components/EventsPage';
import { CreateEvent } from './components/CreateEvent';
import { EventDetailPage } from './components/EventDetailPage';
import { UserDashboard } from './components/UserDashboard';
import { OrganizerProfile } from './components/OrganizerProfile';
import { OrganizerDashboard } from './components/OrganizerDashboard';
import { FavoritesPage } from './components/FavoritesPage';
import { PrivacyPolicyPage } from './components/PrivacyPolicyPage';
import { TermsOfUsePage } from './components/TermsOfUsePage';
import { CookieBanner } from './components/CookieBanner';
import angoticImage from 'figma:asset/2b98f25257b1238c48d47c9236d12c5ed6e3cffe.png';

export type UserType = 'user' | 'organizer' | null;

export interface User {
  id: string;
  name: string;
  username: string;
  email: string;
  type: UserType;
  company?: string;
}

export interface EventReview {
  id: string;
  userId: string;
  userName: string;
  rating: number;
  comment: string;
  date: string;
  images?: string[]; // Array de URLs de imagens
}

export interface Event {
  id: string;
  name: string;
  date: string;
  time: string;
  location: string;
  eventType: 'presencial' | 'online' | 'híbrido';
  description: string;
  category: 'Palestras' | 'Workshops' | 'Feiras' | 'Masterclasses';
  image: string;
  video?: string;
  status: 'A decorrer' | 'Cancelada';
  organizerId: string;
  organizerName: string;
  likes: number;
  reviews?: EventReview[];
  averageRating?: number;
  eventLicense?: string; // Nome do ficheiro PDF da licença
  price?: number; // Preço da atividade em Kz
}

export default function App() {
  const [currentPage, setCurrentPage] = useState<'landing' | 'login' | 'signup' | 'organizer-signup' | 'events' | 'create-event' | 'event-detail' | 'user-dashboard' | 'organizer-dashboard' | 'organizer-profile' | 'favorites' | 'privacy-policy' | 'terms-of-use'>(() => {
    try { return (localStorage.getItem('cresceao_page') as any) || 'landing'; } catch { return 'landing'; }
  });
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try { const u = localStorage.getItem('cresceao_user'); return u ? JSON.parse(u) : null; } catch { return null; }
  });
  const [selectedEventId, setSelectedEventId] = useState<string | null>(() => {
    try { return localStorage.getItem('cresceao_event_id'); } catch { return null; }
  });
  const [shouldOpenCreateForm, setShouldOpenCreateForm] = useState(false);
  const [likedEvents, setLikedEvents] = useState<string[]>(() => {
    try { const l = localStorage.getItem('cresceao_liked'); return l ? JSON.parse(l) : []; } catch { return []; }
  });

  // Persist state to localStorage whenever it changes
  useEffect(() => {
    try { localStorage.setItem('cresceao_page', currentPage); } catch {}
  }, [currentPage]);

  useEffect(() => {
    try {
      if (currentUser) localStorage.setItem('cresceao_user', JSON.stringify(currentUser));
      else localStorage.removeItem('cresceao_user');
    } catch {}
  }, [currentUser]);

  useEffect(() => {
    try {
      if (selectedEventId) localStorage.setItem('cresceao_event_id', selectedEventId);
      else localStorage.removeItem('cresceao_event_id');
    } catch {}
  }, [selectedEventId]);

  useEffect(() => {
    try { localStorage.setItem('cresceao_liked', JSON.stringify(likedEvents)); } catch {}
  }, [likedEvents]);

  // Mock data de eventos
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
    {
      id: '4',
      name: 'Masterclass de Transformação Digital',
      date: '2026-02-05',
      time: '15:00',
      location: 'Hotel Epic Sana - Luanda | Transmissão Online',
      eventType: 'híbrido',
      description: 'Participe presencialmente ou online nesta masterclass exclusiva sobre transformação digital nas empresas angolanas. Aprenda com especialistas internacionais e cases locais de sucesso. Inclui sessão de networking presencial e Q&A online.',
      category: 'Masterclasses',
      image: 'https://images.unsplash.com/photo-1731087357396-0fbd4fd3ab23?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxoeWJyaWQlMjBtZWV0aW5nJTIwdGVjaG5vbG9neSUyMGNvbmZlcmVuY2V8ZW58MXx8fHwxNzY4MzAwNDMwfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
      status: 'A decorrer',
      organizerId: 'org4',
      organizerName: 'TechAngola',
      likes: 92,
      video: 'https://youtube.com/watch?v=example'
    },
    {
      id: '5',
      name: 'Conferência de Liderança e Gestão',
      date: '2026-02-15',
      time: '09:00',
      location: 'Centro de Convenções de Luanda',
      eventType: 'presencial',
      description: 'Conferência exclusiva com palestrantes internacionais sobre liderança estratégica, gestão de equipas de alto desempenho e inovação organizacional. Inclui certificado de participação e material didático completo.',
      category: 'Palestras',
      image: 'https://images.unsplash.com/photo-1762158007969-eb58e74ee3d3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxsZWFkZXJzaGlwJTIwY29uZmVyZW5jZSUyMHNlbWluYXJ8ZW58MXx8fHwxNzY5MTA2NDI2fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
      status: 'A decorrer',
      organizerId: 'org5',
      organizerName: 'Leadership Academy',
      likes: 134,
      price: 50000
    },
    {
      id: '6',
      name: 'Workshop de Inovação Tecnológica',
      date: '2026-02-20',
      time: '14:30',
      location: 'https://meet.google.com/workshop-tech',
      eventType: 'online',
      description: 'Workshop gratuito sobre as últimas tendências em tecnologia e inovação. Aprenda sobre inteligência artificial, blockchain e desenvolvimento de produtos digitais com especialistas da indústria tech angolana.',
      category: 'Workshops',
      image: 'https://images.unsplash.com/photo-1726220230389-cd363f6a52eb?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0ZWNobm9sb2d5JTIwaW5ub3ZhdGlvbiUyMHdvcmtzaG9wfGVufDF8fHx8MTc2OTEwNjQyN3ww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
      status: 'A decorrer',
      organizerId: 'org6',
      organizerName: 'Tech Innovators Angola',
      likes: 203
    },
    {
      id: '7',
      name: 'Conferência Angola Business Summit 2026',
      date: '2026-01-31',
      time: '09:00',
      location: 'Hotel Presidente - Luanda',
      eventType: 'presencial',
      description: 'O maior evento de negócios de Angola. Conecte-se com líderes empresariais, investidores e empreendedores. Palestras sobre crescimento económico, investimentos e oportunidades de negócios em Angola.',
      category: 'Palestras',
      image: 'https://images.unsplash.com/photo-1762968269894-1d7e1ce8894e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxidXNpbmVzcyUyMGNvbmZlcmVuY2UlMjBwcmVzZW50YXRpb258ZW58MXx8fHwxNzY5MDkzMTAwfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
      status: 'A decorrer',
      organizerId: 'org7',
      organizerName: 'Angola Business Forum',
      likes: 287,
      price: 35000
    },
    {
      id: '8',
      name: 'Workshop de Gestão Corporativa',
      date: '2026-02-04',
      time: '14:00',
      location: 'CESE - Centro de Estudos Sociais e Empresariais',
      eventType: 'presencial',
      description: 'Workshop intensivo sobre gestão corporativa moderna, estratégias de crescimento empresarial e liderança eficaz. Casos práticos de empresas angolanas de sucesso.',
      category: 'Workshops',
      image: 'https://images.unsplash.com/photo-1765438863717-49fca900f861?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb3Jwb3JhdGUlMjB0cmFpbmluZyUyMHdvcmtzaG9wfGVufDF8fHx8MTc2OTA1NzEzNHww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
      status: 'A decorrer',
      organizerId: 'org8',
      organizerName: 'CESE Angola',
      likes: 145,
      price: 25000
    },
    {
      id: '9',
      name: 'Feira de Tecnologia e Inovação Angola Tech',
      date: '2026-02-18',
      time: '10:00',
      location: 'Centro de Convenções Talatona',
      eventType: 'presencial',
      description: 'A maior feira de tecnologia de Angola. Exposição de startups, produtos tecnológicos, palestras sobre inovação digital e oportunidades de networking com o ecossistema tech angolano.',
      category: 'Feiras',
      image: 'https://images.unsplash.com/photo-1700936655679-83f4b37d7d74?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0ZWNobm9sb2d5JTIwY29uZmVyZW5jZSUyMHRlY2h8ZW58MXx8fHwxNzY5MTEyNDE3fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
      status: 'A decorrer',
      organizerId: 'org9',
      organizerName: 'Angola Tech Hub',
      likes: 312,
      price: 18000
    },
    {
      id: '10',
      name: 'Seminário de Finanças Empresariais',
      date: '2026-02-25',
      time: '09:00',
      location: 'Banco BFA - Auditório Principal',
      eventType: 'presencial',
      description: 'Seminário especializado em gestão financeira, investimentos corporativos e planeamento fiscal para empresas angolanas. Palestrantes do setor financeiro nacional e internacional.',
      category: 'Palestras',
      image: 'https://images.unsplash.com/photo-1768839720849-fef976b3ffff?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmaW5hbmNpYWwlMjBwbGFubmluZyUyMGJ1c2luZXNzfGVufDF8fHx8MTc2OTExMjQxOHww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
      status: 'A decorrer',
      organizerId: 'org10',
      organizerName: 'BFA Business School',
      likes: 198,
      price: 28000
    },
    {
      id: '11',
      name: 'Workshop de Marketing Digital e Redes Sociais',
      date: '2026-02-12',
      time: '14:00',
      location: 'Centro Empresarial Luanda Business Center',
      eventType: 'híbrido',
      description: 'Aprenda estratégias de marketing digital, gestão de redes sociais e criação de conteúdo para impulsionar o seu negócio. Workshop prático com cases do mercado angolano.',
      category: 'Workshops',
      image: 'https://images.unsplash.com/photo-1620326079720-500ba364af6a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtYXJrZXRpbmclMjBzdHJhdGVneSUyMHdvcmtzaG9wfGVufDF8fHx8MTc2OTExMjQxOHww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
      status: 'A decorrer',
      organizerId: 'org11',
      organizerName: 'Digital Marketing Angola',
      likes: 176,
      price: 22000
    },
    {
      id: '12',
      name: 'Bootcamp de Programação Full-Stack',
      date: '2026-03-01',
      time: '09:00',
      location: 'ETIC - Escola de Tecnologias Inovação e Criação',
      eventType: 'presencial',
      description: 'Bootcamp intensivo de programação full-stack. Aprenda JavaScript, React, Node.js, bases de dados e desenvolvimento web moderno. Certificado reconhecido nacionalmente.',
      category: 'Workshops',
      image: 'https://images.unsplash.com/photo-1763568258445-70fecf4e78af?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb2RpbmclMjBib290Y2FtcCUyMHByb2dyYW1taW5nfGVufDF8fHx8MTc2OTEwNzY1MHww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
      status: 'A decorrer',
      organizerId: 'org12',
      organizerName: 'ETIC Angola',
      likes: 289,
      price: 85000
    },
    {
      id: '13',
      name: 'Conferência de Liderança Executiva',
      date: '2026-03-08',
      time: '08:30',
      location: 'Hotel Skyna - Luanda',
      eventType: 'presencial',
      description: 'Conferência exclusiva para líderes e executivos. Temas sobre liderança transformacional, gestão de mudanças e desenvolvimento organizacional com palestrantes de renome internacional.',
      category: 'Palestras',
      image: 'https://images.unsplash.com/photo-1745970649957-b4b1f7fde4ea?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxleGVjdXRpdmUlMjBsZWFkZXJzaGlwJTIwY29uZmVyZW5jZXxlbnwxfHx8fDE3NjkxMTI0MTh8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
      status: 'A decorrer',
      organizerId: 'org13',
      organizerName: 'Executive Leadership Angola',
      likes: 234,
      price: 55000
    },
    {
      id: '14',
      name: 'Feira de Empreendedorismo e Startups',
      date: '2026-03-15',
      time: '09:00',
      location: 'CINE - Centro de Incubação de Negócios e Empresas',
      eventType: 'presencial',
      description: 'Feira dedicada a empreendedores e startups angolanas. Competição de pitch, networking com investidores, mentorias e workshops sobre empreendedorismo e inovação.',
      category: 'Feiras',
      image: 'https://images.unsplash.com/photo-1590097520505-416422f07ad1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxlbnRyZXByZW5ldXIlMjBzdGFydHVwJTIwcGl0Y2h8ZW58MXx8fHwxNzY5MTEyNDE3fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
      status: 'A decorrer',
      organizerId: 'org14',
      organizerName: 'CINE Angola',
      likes: 267
    },
    {
      id: '15',
      name: 'Summit de Inovação e Tecnologia',
      date: '2026-03-22',
      time: '10:00',
      location: 'Universidade Católica de Angola - Auditório',
      eventType: 'híbrido',
      description: 'Summit sobre inovação tecnológica, transformação digital e futuro dos negócios em Angola. Palestrantes nacionais e internacionais partilham tendências e oportunidades.',
      category: 'Palestras',
      image: 'https://images.unsplash.com/photo-1758523935714-b6549f20641e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxpbm5vdmF0aW9uJTIwdGVjaG5vbG9neSUyMHN1bW1pdHxlbnwxfHx8fDE3NjkxMTI0MTl8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
      status: 'A decorrer',
      organizerId: 'org15',
      organizerName: 'UCAN Innovation Lab',
      likes: 198,
      price: 30000
    },
    {
      id: '16',
      name: 'Workshop de Desenvolvimento Pessoal e Profissional',
      date: '2026-03-28',
      time: '14:00',
      location: 'Centro de Formação Profissional - Viana',
      eventType: 'presencial',
      description: 'Workshop sobre desenvolvimento de competências profissionais, comunicação eficaz, gestão de tempo e estratégias de carreira. Ideal para jovens profissionais angolanos.',
      category: 'Workshops',
      image: 'https://images.unsplash.com/photo-1765438863789-1396d28db24b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxsZWFkZXJzaGlwJTIwdHJhaW5pbmclMjBzZW1pbmFyfGVufDF8fHx8MTc2OTA3ODAwMXww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
      status: 'A decorrer',
      organizerId: 'org16',
      organizerName: 'Centro de Formação Angola',
      likes: 154,
      price: 12000
    },
    {
      id: '17',
      name: 'Masterclass de Estratégia Empresarial',
      date: '2026-04-05',
      time: '09:00',
      location: 'ISCEE - Instituto Superior de Ciências da Educação',
      eventType: 'presencial',
      description: 'Masterclass sobre planeamento estratégico, análise de mercado e competitividade empresarial. Aprenda com consultores especializados em estratégia de negócios.',
      category: 'Masterclasses',
      image: 'https://images.unsplash.com/photo-1654608996535-068c6bbff7f5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxidXNpbmVzcyUyMHN1bW1pdCUyMG1lZXRpbmd8ZW58MXx8fHwxNzY5MTEyNDE2fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
      status: 'A decorrer',
      organizerId: 'org17',
      organizerName: 'Business Strategy Angola',
      likes: 187,
      price: 40000
    },
    {
      id: '18',
      name: 'Networking Profissional - Encontro de Negócios',
      date: '2026-04-12',
      time: '18:00',
      location: 'Espaço Luanda Corporate',
      eventType: 'presencial',
      description: 'Evento de networking para profissionais e empresários angolanos. Oportunidade única para expandir a sua rede de contactos, partilhar experiências e criar parcerias estratégicas.',
      category: 'Feiras',
      image: 'https://images.unsplash.com/photo-1768508665663-fa483a0cb208?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9mZXNzaW9uYWwlMjBuZXR3b3JraW5nJTIwZXZlbnR8ZW58MXx8fHwxNzY5MTEyNDE2fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
      status: 'A decorrer',
      organizerId: 'org18',
      organizerName: 'Luanda Business Network',
      likes: 321
    },
    {
      id: '19',
      name: 'ANGOTIC 2026 - Congresso de Tecnologias de Informação',
      date: '2026-05-15',
      time: '08:30',
      location: 'Centro de Convenções de Talatona - Luanda',
      eventType: 'híbrido',
      description: 'O maior congresso de tecnologias de informação e comunicação de Angola. O ANGOTIC reúne especialistas nacionais e internacionais, empresas tech, startups e profissionais para discutir inovação, cibersegurança, inteligência artificial e transformação digital. Inclui exposição tecnológica, workshops práticos e certificação.',
      category: 'Feiras',
      image: angoticImage,
      status: 'A decorrer',
      organizerId: 'org19',
      organizerName: 'ANGOTIC - Ministério das Telecomunicações',
      likes: 542,
      price: 45000,
      video: 'https://youtu.be/WACx0LQyzI4?si=r1ORVCLJ_ElmUaFF'
    },
    {
      id: '20',
      name: 'Luanda Business Forum - Oportunidades de Investimento',
      date: '2026-05-08',
      time: '09:00',
      location: 'Hotel Epic Sana Luanda',
      eventType: 'presencial',
      description: 'Fórum de negócios focado em oportunidades de investimento em Angola. Participação de investidores internacionais, empresários locais, representantes governamentais e entidades financeiras. Sessões sobre setores estratégicos: energia, agricultura, turismo e tecnologia.',
      category: 'Palestras',
      image: 'https://images.unsplash.com/photo-1768508948485-a7adc1f3427f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxidXNpbmVzcyUyMG5ldHdvcmtpbmclMjBldmVudCUyMHByb2Zlc3Npb25hbHxlbnwxfHx8fDE3NzEzOTIxNjV8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
      status: 'A decorrer',
      organizerId: 'org20',
      organizerName: 'Luanda Business Forum',
      likes: 398,
      price: 65000
    },
    {
      id: '21',
      name: 'Workshop de Design Thinking e Inovação Criativa',
      date: '2026-05-20',
      time: '14:00',
      location: 'Impact Hub Luanda',
      eventType: 'presencial',
      description: 'Workshop prático sobre metodologias de Design Thinking aplicadas ao contexto angolano. Aprenda a desenvolver soluções inovadoras para problemas reais, criar protótipos e validar ideias de negócio. Facilitadores especializados em inovação e criatividade.',
      category: 'Workshops',
      image: 'https://images.unsplash.com/photo-1688818228656-cccc0a933b30?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjcmVhdGl2ZSUyMGRlc2lnbiUyMHdvcmtzaG9wJTIwYXJ0c3xlbnwxfHx8fDE3NzE0NDI1NTB8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
      status: 'A decorrer',
      organizerId: 'org21',
      organizerName: 'Impact Hub Angola',
      likes: 167,
      price: 18000
    },
    {
      id: '22',
      name: 'Conferência Agro-Negócios Angola: Futuro da Agricultura',
      date: '2026-06-02',
      time: '08:00',
      location: 'Centro de Convenções de Benguela',
      eventType: 'presencial',
      description: 'Conferência dedicada ao desenvolvimento do setor agrícola em Angola. Discussões sobre tecnologias agrícolas, financiamento, cadeias de valor, agro-processamento e oportunidades de exportação. Participação de agricultores, empresários do agronegócio e especialistas internacionais.',
      category: 'Palestras',
      image: 'https://images.unsplash.com/photo-1708794666324-85ad91989d20?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhZ3JpY3VsdHVyZSUyMGZhcm1pbmclMjBidXNpbmVzcyUyMGNvbmZlcmVuY2V8ZW58MXx8fHwxNzcxNDQyNTU3fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
      status: 'A decorrer',
      organizerId: 'org22',
      organizerName: 'Associação Agro-Negócios Angola',
      likes: 234,
      price: 28000
    },
    {
      id: '23',
      name: 'Summit Juventude Empreendedora Angola',
      date: '2026-06-10',
      time: '09:30',
      location: 'Universidade Agostinho Neto - Campus Camama',
      eventType: 'híbrido',
      description: 'Summit dedicado ao empreendedorismo jovem em Angola. Palestras motivacionais, painéis de discussão sobre desafios e oportunidades para jovens empreendedores, competição de ideias de negócio, mentorias e networking. Evento gratuito para estudantes universitários.',
      category: 'Palestras',
      image: 'https://images.unsplash.com/photo-1660795468878-d9d8d75967b9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx5b3V0aCUyMGVkdWNhdGlvbiUyMHN1bW1pdCUyMHNlbWluYXJ8ZW58MXx8fHwxNzcxNDQyNTYxfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
      status: 'A decorrer',
      organizerId: 'org23',
      organizerName: 'Instituto Nacional da Juventude',
      likes: 476
    }
  ]);

  const handleLogin = (email: string, password: string, userType: UserType) => {
    // Mock login
    const mockUser: User = {
      id: '1',
      name: userType === 'organizer' ? 'StartHub Angola' : 'João Silva',
      username: userType === 'organizer' ? '' : 'joaosilva',
      email: email,
      type: userType,
      company: userType === 'organizer' ? 'StartHub Angola' : undefined
    };
    setCurrentUser(mockUser);
    setCurrentPage('events');
  };

  const handleSignup = (name: string, username: string, email: string, password: string) => {
    // Mock signup
    const mockUser: User = {
      id: '2',
      name,
      username,
      email,
      type: 'user'
    };
    setCurrentUser(mockUser);
    setCurrentPage('events');
  };

  const handleOrganizerSignup = (email: string, password: string, company: string) => {
    // Mock organizer signup
    const mockUser: User = {
      id: '3',
      name: company,
      username: '',
      email,
      type: 'organizer',
      company
    };
    setCurrentUser(mockUser);
    setCurrentPage('events');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setCurrentPage('landing');
    try { localStorage.removeItem('cresceao_user'); localStorage.removeItem('cresceao_page'); } catch {}
  };

  const handleEventClick = (eventId: string) => {
    setSelectedEventId(eventId);
    setCurrentPage('event-detail');
  };

  const handleLikeToggle = (eventId: string) => {
    const newLikedEvents = likedEvents.includes(eventId) ? likedEvents.filter(id => id !== eventId) : [...likedEvents, eventId];
    setLikedEvents(newLikedEvents);
    setEvents(events.map(e => e.id === eventId ? { ...e, likes: e.likes + (likedEvents.includes(eventId) ? -1 : 1) } : e));
  };

  const handleAddEvent = (newEvent: Omit<Event, 'id' | 'organizerId' | 'organizerName' | 'likes'>) => {
    const event: Event = {
      ...newEvent,
      id: Date.now().toString(),
      organizerId: currentUser?.id || '',
      organizerName: currentUser?.company || currentUser?.name || '',
      likes: 0
    };
    setEvents([...events, event]);
  };

  const handleUpdateEvent = (eventId: string, updates: Partial<Event>) => {
    setEvents(events.map(e => e.id === eventId ? { ...e, ...updates } : e));
  };

  const handleAddReview = (eventId: string, rating: number, comment: string, images?: string[]) => {
    if (!currentUser) return;

    const newReview: EventReview = {
      id: Date.now().toString(),
      userId: currentUser.id,
      userName: currentUser.name,
      rating,
      comment,
      date: new Date().toISOString(),
      images: images
    };

    setEvents(events.map(e => {
      if (e.id === eventId) {
        const reviews = [...(e.reviews || []), newReview];
        const averageRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
        return { ...e, reviews, averageRating };
      }
      return e;
    }));
  };

  const handleUpdateReview = (eventId: string, reviewId: string, rating: number, comment: string, images?: string[]) => {
    if (!currentUser) return;

    setEvents(events.map(e => {
      if (e.id === eventId) {
        const reviews = (e.reviews || []).map(r => {
          if (r.id === reviewId && r.userId === currentUser.id) {
            return {
              ...r,
              rating,
              comment,
              images: images,
              date: new Date().toISOString() // Update the date to show it was edited
            };
          }
          return r;
        });
        const averageRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
        return { ...e, reviews, averageRating };
      }
      return e;
    }));
  };

  const handleDeleteReview = (eventId: string, reviewId: string) => {
    if (!currentUser) return;

    setEvents(events.map(e => {
      if (e.id === eventId) {
        const reviews = (e.reviews || []).filter(r => !(r.id === reviewId && r.userId === currentUser.id));
        const averageRating = reviews.length > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : undefined;
        return { ...e, reviews, averageRating };
      }
      return e;
    }));
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'landing':
        return <LandingPage 
          onExplore={() => setCurrentPage('signup')} 
          onNavigateToPrivacy={() => setCurrentPage('privacy-policy')}
          onNavigateToTerms={() => setCurrentPage('terms-of-use')}
        />;
      case 'login':
        return <LoginPage 
          onLogin={handleLogin}
          onNavigateToSignup={() => setCurrentPage('signup')}
          onNavigateToOrganizerSignup={() => setCurrentPage('organizer-signup')}
          onBack={() => setCurrentPage('landing')}
        />;
      case 'signup':
        return <SignupPage 
          onSignup={handleSignup}
          onNavigateToLogin={() => setCurrentPage('login')}
          onBack={() => setCurrentPage('landing')}
        />;
      case 'organizer-signup':
        return <OrganizerSignupPage 
          onSignup={handleOrganizerSignup}
          onLogin={(email, password) => handleLogin(email, password, 'organizer')}
          onBack={() => setCurrentPage('login')}
        />;
      case 'events':
        return <EventsPage 
          events={events}
          currentUser={currentUser}
          onEventClick={handleEventClick}
          onNavigateToProfile={() => setCurrentPage(currentUser?.type === 'organizer' ? 'organizer-profile' : 'user-dashboard')}
          onNavigateToDashboard={() => setCurrentPage(currentUser?.type === 'organizer' ? 'organizer-dashboard' : 'user-dashboard')}
          onNavigateToCreateEvent={() => setCurrentPage(currentUser?.type === 'organizer' ? 'create-event' : 'user-dashboard')}
          onLogout={handleLogout}
          likedEvents={likedEvents}
          onOpenCreateForm={() => setShouldOpenCreateForm(true)}
          onNavigateToFavorites={() => setCurrentPage('favorites')}
          onNavigateToPrivacy={() => setCurrentPage('privacy-policy')}
          onNavigateToTerms={() => setCurrentPage('terms-of-use')}
        />;
      case 'create-event':
        return <CreateEvent
          user={currentUser!}
          onAddEvent={handleAddEvent}
          onBack={() => setCurrentPage('events')}
        />;
      case 'event-detail':
        const selectedEvent = events.find(e => e.id === selectedEventId);
        return selectedEvent ? (
          <EventDetailPage
            event={selectedEvent}
            isLiked={likedEvents.includes(selectedEvent.id)}
            onLikeToggle={handleLikeToggle}
            onBack={() => {
              setSelectedEventId(null);
              setCurrentPage('events');
            }}
            currentUser={currentUser}
            onAddReview={handleAddReview}
            onUpdateReview={handleUpdateReview}
            onDeleteReview={handleDeleteReview}
            onNavigateToPrivacy={() => setCurrentPage('privacy-policy')}
            onNavigateToTerms={() => setCurrentPage('terms-of-use')}
          />
        ) : null;
      case 'user-dashboard':
        return <UserDashboard 
          user={currentUser!}
          onUpdateUser={(updates) => setCurrentUser({ ...currentUser!, ...updates })}
          onBack={() => setCurrentPage('events')}
        />;
      case 'organizer-profile':
        const organizerEventsProfile = events.filter(e => e.organizerId === currentUser?.id);
        return <OrganizerProfile 
          user={currentUser!}
          events={organizerEventsProfile}
          onBack={() => setCurrentPage('events')}
        />;
      case 'organizer-dashboard':
        const organizerEvents = events.filter(e => e.organizerId === currentUser?.id);
        return <OrganizerDashboard 
          user={currentUser!}
          events={organizerEvents}
          onAddEvent={handleAddEvent}
          onUpdateEvent={handleUpdateEvent}
          onBack={() => setCurrentPage('events')}
          shouldOpenCreateForm={shouldOpenCreateForm}
          onCloseCreateForm={() => setShouldOpenCreateForm(false)}
        />;
      case 'favorites':
        return <FavoritesPage
          events={events}
          likedEvents={likedEvents}
          currentUser={currentUser}
          onEventClick={handleEventClick}
          onBack={() => setCurrentPage('events')}
          onLikeToggle={handleLikeToggle}
        />;
      case 'privacy-policy':
        return <PrivacyPolicyPage onBack={() => setCurrentPage('events')} />;
      case 'terms-of-use':
        return <TermsOfUsePage onBack={() => setCurrentPage('events')} />;
      default:
        return <LandingPage onExplore={() => setCurrentPage('signup')} />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50">
      <CookieBanner />
      {renderPage()}
    </div>
  );
}