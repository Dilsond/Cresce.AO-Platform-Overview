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
import { supabase } from './lib/supabase';

export type UserType = 'user' | 'organizer';

export interface User {
  id: string;
  name: string;
  username?: string;
  email: string;
  userType: UserType;
  company?: string;
  nif?: string;
}

export interface EventReview {
  id: string;
  userId: string;
  userName: string;
  rating: number;
  comment: string;
  date: string;
  images?: string[];
}

export interface Event {
  id: string;
  name: string;
  date: string;
  time: string;
  location: string;
  eventType: 'presencial' | 'online' | 'hibrido';
  description: string;
  category: 'palestra' | 'workshop' | 'feiras' | 'masterclasse';
  image: string;
  video?: string;
  status: 'A decorrer' | 'Cancelada';
  organizerId: string;
  organizerName: string;
  likes: number;
  reviews?: EventReview[];
  averageRating?: number;
  eventLicense?: string;
  price?: number;
  valor?: number;
  arquivo_pdf_url?: string;
  imagem_url?: string;
  video_url?: string;
}

export default function App() {
  console.log('🚀 App inicializando...');

  const [currentPage, setCurrentPage] = useState<'landing' | 'login' | 'signup' | 'organizer-signup' | 'events' | 'create-event' | 'event-detail' | 'user-dashboard' | 'organizer-dashboard' | 'organizer-profile' | 'favorites' | 'privacy-policy' | 'terms-of-use'>(() => {
    try { 
      const saved = localStorage.getItem('cresceao_page');
      console.log('📄 Página salva no localStorage:', saved);
      return (saved as any) || 'landing'; 
    } catch { 
      console.log('⚠️ Erro ao ler localStorage, usando landing');
      return 'landing'; 
    }
  });
  
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(() => {
    try { 
      const saved = localStorage.getItem('cresceao_event_id');
      console.log('🎯 Evento salvo no localStorage:', saved);
      return saved; 
    } catch { return null; }
  });
  
  const [shouldOpenCreateForm, setShouldOpenCreateForm] = useState(false);
  const [likedEvents, setLikedEvents] = useState<string[]>(() => {
    try { 
      const saved = localStorage.getItem('cresceao_liked');
      console.log('❤️ Likes salvos no localStorage:', saved);
      return saved ? JSON.parse(saved) : []; 
    } catch { return []; }
  });
  
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Log do estado atual
  useEffect(() => {
    console.log('📊 Estado atual:', {
      currentPage,
      currentUser: currentUser?.email,
      selectedEventId,
      likedEventsCount: likedEvents.length,
      eventsCount: events.length,
      isLoading,
      error
    });
  }, [currentPage, currentUser, selectedEventId, likedEvents, events, isLoading, error]);

  // Carregar eventos do Supabase ao iniciar
  useEffect(() => {
    console.log('📥 Carregando eventos...');
    loadEvents();
  }, []);

  // Verificar sessão do usuário ao iniciar
  useEffect(() => {
    console.log('🔐 Verificando sessão...');
    checkUser();
    
    // Listener para mudanças na autenticação
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔄 Auth state changed:', event, session?.user?.email);
      
      if (event === 'SIGNED_IN' && session?.user) {
        console.log('✅ Usuário fez login:', session.user.email);
        await loadUserData(session.user);
      } else if (event === 'SIGNED_OUT') {
        console.log('👋 Usuário fez logout');
        setCurrentUser(null);
        localStorage.removeItem('user');
      } else if (event === 'USER_UPDATED') {
        console.log('📝 Usuário atualizado');
        if (session?.user) {
          await loadUserData(session.user);
        }
      }
    });

    return () => {
      console.log('🧹 Cleanup do listener de auth');
      authListener?.subscription.unsubscribe();
    };
  }, []);

  // Persist state to localStorage whenever it changes
  useEffect(() => {
    try { 
      localStorage.setItem('cresceao_page', currentPage);
      console.log('💾 Página salva:', currentPage);
    } catch {}
  }, [currentPage]);

  useEffect(() => {
    try {
      if (currentUser) {
        localStorage.setItem('user', JSON.stringify(currentUser));
        console.log('💾 Usuário salvo:', currentUser.email);
      } else {
        localStorage.removeItem('user');
        console.log('🗑️ Usuário removido do localStorage');
      }
    } catch {}
  }, [currentUser]);

  useEffect(() => {
    try {
      if (selectedEventId) {
        localStorage.setItem('cresceao_event_id', selectedEventId);
        console.log('💾 Evento selecionado salvo:', selectedEventId);
      } else {
        localStorage.removeItem('cresceao_event_id');
      }
    } catch {}
  }, [selectedEventId]);

  useEffect(() => {
    try { 
      localStorage.setItem('cresceao_liked', JSON.stringify(likedEvents));
      console.log('💾 Likes salvos:', likedEvents.length);
    } catch {}
  }, [likedEvents]);

  const checkUser = async () => {
    try {
      console.log('🔍 Verificando usuário atual...');
      setIsLoading(true);
      setError(null);
      
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('❌ Erro ao obter sessão:', sessionError);
        setError('Erro ao verificar sessão');
        return;
      }
      
      console.log('📦 Sessão obtida:', session ? 'Ativa' : 'Inativa');
      
      if (session?.user) {
        console.log('👤 Usuário na sessão:', session.user.email);
        await loadUserData(session.user);
      } else {
        console.log('ℹ️ Nenhum usuário logado');
      }
    } catch (error) {
      console.error('❌ Erro ao verificar sessão:', error);
      setError('Erro ao verificar sessão');
    } finally {
      console.log('✅ Verificação de sessão concluída');
      setIsLoading(false);
    }
  };

  const loadUserData = async (user: any) => {
    try {
      console.log('📂 Carregando dados do usuário:', user.id, user.email);

      // Verificar se é usuário normal
      console.log('🔍 Verificando se é usuário normal...');
      const { data: userData, error: userError } = await supabase
        .from('usuarios_normais')
        .select('*')
        .eq('id', user.id)
        .is('deleted_at', null)
        .maybeSingle();

      if (userError) {
        console.error('❌ Erro ao buscar usuário normal:', userError);
      }

      if (userData) {
        console.log('✅ Usuário normal encontrado:', userData);
        setCurrentUser({
          id: userData.id,
          name: userData.nome_completo,
          username: userData.nome_utilizador,
          email: userData.email,
          userType: 'user'
        });
        return;
      }

      // Verificar se é organizador
      console.log('🔍 Verificando se é organizador...');
      const { data: organizerData, error: organizerError } = await supabase
        .from('organizadores')
        .select('*')
        .eq('id', user.id)
        .is('deleted_at', null)
        .maybeSingle();

      if (organizerError) {
        console.error('❌ Erro ao buscar organizador:', organizerError);
      }

      if (organizerData) {
        console.log('✅ Organizador encontrado:', organizerData);
        setCurrentUser({
          id: organizerData.id,
          name: organizerData.nome_empresa,
          email: organizerData.email_empresa,
          userType: 'organizer',
          company: organizerData.nome_empresa,
          nif: organizerData.nif
        });
        return;
      }

      console.log('⚠️ Usuário não encontrado nas tabelas');
    } catch (error) {
      console.error('❌ Erro ao carregar dados do usuário:', error);
      setError('Erro ao carregar dados do usuário');
    }
  };

  const loadEvents = async () => {
    try {
      console.log('📥 Carregando eventos...');
      const { data, error } = await supabase
        .from('eventos')
        .select(`
          *,
          organizadores (
            nome_empresa
          )
        `)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Erro ao carregar eventos:', error);
        setError('Erro ao carregar eventos');
        return;
      }

      console.log('📦 Eventos carregados:', data?.length || 0);

      if (data) {
        const formattedEvents: Event[] = data.map(event => ({
          id: event.id,
          name: event.nome_evento,
          date: event.data_evento,
          time: event.hora_evento,
          location: event.local || '',
          eventType: event.tipo_evento,
          description: event.descricao || '',
          category: event.categoria,
          image: event.imagem_url || '',
          video: event.video_url,
          status: event.data_evento < new Date().toISOString().split('T')[0] ? 'Cancelada' : 'A decorrer',
          organizerId: event.organizador_id,
          organizerName: event.organizadores?.nome_empresa || '',
          likes: 0,
          price: event.valor,
          valor: event.valor,
          arquivo_pdf_url: event.arquivo_pdf_url,
          imagem_url: event.imagem_url,
          video_url: event.video_url
        }));

        console.log('📝 Eventos formatados:', formattedEvents.length);
        setEvents(formattedEvents);
      }
    } catch (error) {
      console.error('❌ Erro ao carregar eventos:', error);
      setError('Erro ao carregar eventos');
    }
  };

  const handleLogin = (userData: User) => {
    console.log('🔑 Login realizado:', userData.email);
    setCurrentUser(userData);
    setCurrentPage('events');
  };

  const handleLogout = async () => {
    console.log('🚪 Fazendo logout...');
    try {
      await supabase.auth.signOut();
      console.log('✅ Logout realizado');
    } catch (error) {
      console.error('❌ Erro ao fazer logout:', error);
    }
    setCurrentUser(null);
    setCurrentPage('landing');
  };

  const handleSignup = async (name: string, username: string, email: string, password: string) => {
    console.log('📝 Iniciando cadastro:', { name, username, email });
    setError(null);

    try {
      // 1. Criar usuário no Supabase Auth
      console.log('1️⃣ Criando usuário no Auth...');
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password: password,
        options: {
          data: {
            nome_completo: name,
            nome_utilizador: username,
          }
        }
      });

      if (authError) {
        console.error('❌ Erro no signUp:', authError);
        throw new Error(authError.message);
      }

      if (!authData.user) {
        throw new Error('Erro ao criar usuário');
      }

      console.log('✅ Usuário criado no Auth:', authData.user.id);

      // 2. Inserir na tabela usuarios_normais
      console.log('2️⃣ Inserindo na tabela usuarios_normais...');
      const { error: insertError } = await supabase
        .from('usuarios_normais')
        .insert({
          id: authData.user.id,
          nome_completo: name,
          nome_utilizador: username,
          email: email.trim().toLowerCase()
        });

      if (insertError) {
        console.error('❌ Erro ao inserir na tabela:', insertError);
        
        // Tentar fazer cleanup
        console.log('🧹 Tentando cleanup do usuário no Auth...');
        await supabase.auth.admin.deleteUser(authData.user.id);
        
        throw new Error(insertError.message);
      }

      console.log('✅ Usuário inserido na tabela com sucesso');

      const newUser: User = {
        id: authData.user.id,
        name: name,
        username: username,
        email: email.trim().toLowerCase(),
        userType: 'user'
      };

      console.log('👤 Novo usuário criado:', newUser);
      setCurrentUser(newUser);
      setCurrentPage('events');

    } catch (error: any) {
      console.error('❌ Erro no registro:', error);
      setError(error.message);
      throw error;
    }
  };

  const handleOrganizerSignup = async (email: string, password: string, company: string, nif: string) => {
    console.log('📝 Iniciando cadastro de organizador:', { email, company, nif });
    setError(null);

    try {
      // 1. Criar usuário no Supabase Auth
      console.log('1️⃣ Criando organizador no Auth...');
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password: password,
        options: {
          data: {
            nome_empresa: company,
            tipo_usuario: 'organizador'
          }
        }
      });

      if (authError) {
        console.error('❌ Erro no signUp do organizador:', authError);
        throw new Error(authError.message);
      }

      if (!authData.user) {
        throw new Error('Erro ao criar organizador');
      }

      console.log('✅ Organizador criado no Auth:', authData.user.id);

      // 2. Inserir na tabela organizadores
      console.log('2️⃣ Inserindo na tabela organizadores...');
      const { error: insertError } = await supabase
        .from('organizadores')
        .insert({
          id: authData.user.id,
          nome_empresa: company,
          nif: nif,
          email_empresa: email.trim().toLowerCase()
        });

      if (insertError) {
        console.error('❌ Erro ao inserir organizador na tabela:', insertError);
        
        // Tentar fazer cleanup
        console.log('🧹 Tentando cleanup do organizador no Auth...');
        await supabase.auth.admin.deleteUser(authData.user.id);
        
        throw new Error(insertError.message);
      }

      console.log('✅ Organizador inserido na tabela com sucesso');

      const user: User = {
        id: authData.user.id,
        name: company,
        email: email.trim().toLowerCase(),
        userType: 'organizer',
        company,
        nif
      };

      console.log('👤 Novo organizador criado:', user);
      setCurrentUser(user);
      setCurrentPage('events');

    } catch (error: any) {
      console.error('❌ Erro no cadastro de organizador:', error);
      setError(error.message);
      throw error;
    }
  };

  const handleEventClick = (eventId: string) => {
    console.log('🎯 Evento clicado:', eventId);
    setSelectedEventId(eventId);
    setCurrentPage('event-detail');
  };

  const handleLikeToggle = async (eventId: string) => {
    if (!currentUser) {
      console.log('⚠️ Tentativa de like sem usuário logado');
      return;
    }

    console.log('❤️ Toggle like:', eventId);
    const newLikedEvents = likedEvents.includes(eventId) 
      ? likedEvents.filter(id => id !== eventId) 
      : [...likedEvents, eventId];
    
    setLikedEvents(newLikedEvents);
    setEvents(events.map(e => e.id === eventId ? { ...e, likes: e.likes + (likedEvents.includes(eventId) ? -1 : 1) } : e));
  };

  const handleAddEvent = async (newEvent: Omit<Event, 'id' | 'organizerId' | 'organizerName' | 'likes'>) => {
    if (!currentUser) {
      console.log('⚠️ Tentativa de criar evento sem usuário logado');
      return;
    }

    console.log('➕ Criando novo evento:', newEvent.name);

    try {
      const { data, error } = await supabase
        .from('eventos')
        .insert({
          organizador_id: currentUser.id,
          nome_evento: newEvent.name,
          categoria: newEvent.category,
          data_evento: newEvent.date,
          hora_evento: newEvent.time,
          tipo_evento: newEvent.eventType,
          local: newEvent.location,
          descricao: newEvent.description,
          valor: newEvent.price || 0,
          imagem_url: newEvent.image,
          video_url: newEvent.video
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Erro ao criar evento:', error);
        throw error;
      }

      console.log('✅ Evento criado:', data.id);

      const event: Event = {
        ...newEvent,
        id: data.id,
        organizerId: currentUser.id,
        organizerName: currentUser.company || currentUser.name,
        likes: 0
      };

      setEvents([event, ...events]);
      setCurrentPage('events');
    } catch (error) {
      console.error('❌ Erro ao criar evento:', error);
      alert('Erro ao criar evento. Tente novamente.');
    }
  };

  const handleUpdateEvent = async (eventId: string, updates: Partial<Event>) => {
    if (!currentUser) return;

    console.log('✏️ Atualizando evento:', eventId, updates);

    try {
      const { error } = await supabase
        .from('eventos')
        .update({
          nome_evento: updates.name,
          categoria: updates.category,
          data_evento: updates.date,
          hora_evento: updates.time,
          tipo_evento: updates.eventType,
          local: updates.location,
          descricao: updates.description,
          valor: updates.price,
          imagem_url: updates.image,
          video_url: updates.video,
          updated_at: new Date().toISOString()
        })
        .eq('id', eventId)
        .eq('organizador_id', currentUser.id);

      if (error) {
        console.error('❌ Erro ao atualizar evento:', error);
        throw error;
      }

      console.log('✅ Evento atualizado');
      setEvents(events.map(e => e.id === eventId ? { ...e, ...updates } : e));
    } catch (error) {
      console.error('❌ Erro ao atualizar evento:', error);
      alert('Erro ao atualizar evento. Tente novamente.');
    }
  };

  const handleAddReview = async (eventId: string, rating: number, comment: string, images?: string[]) => {
    if (!currentUser) return;

    console.log('📝 Adicionando review:', { eventId, rating, comment });

    try {
      const { data, error } = await supabase
        .from('comentarios')
        .insert({
          evento_id: eventId,
          usuario_normal_id: currentUser.userType === 'user' ? currentUser.id : null,
          organizador_id: currentUser.userType === 'organizer' ? currentUser.id : null,
          descricao: comment,
          imagem_url: images?.[0],
          avaliacao: rating
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Erro ao adicionar review:', error);
        throw error;
      }

      console.log('✅ Review adicionada:', data.id);

      const newReview: EventReview = {
        id: data.id,
        userId: currentUser.id,
        userName: currentUser.name,
        rating,
        comment,
        date: new Date().toISOString(),
        images
      };

      setEvents(events.map(e => {
        if (e.id === eventId) {
          const reviews = [...(e.reviews || []), newReview];
          const averageRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
          return { ...e, reviews, averageRating };
        }
        return e;
      }));
    } catch (error) {
      console.error('❌ Erro ao adicionar review:', error);
      alert('Erro ao adicionar avaliação. Tente novamente.');
    }
  };

  const handleUpdateReview = async (eventId: string, reviewId: string, rating: number, comment: string, images?: string[]) => {
    if (!currentUser) return;

    console.log('✏️ Atualizando review:', reviewId);

    try {
      const { error } = await supabase
        .from('comentarios')
        .update({
          descricao: comment,
          imagem_url: images?.[0],
          avaliacao: rating,
          updated_at: new Date().toISOString()
        })
        .eq('id', reviewId)
        .eq(
          currentUser.userType === 'user' ? 'usuario_normal_id' : 'organizador_id',
          currentUser.id
        );

      if (error) {
        console.error('❌ Erro ao atualizar review:', error);
        throw error;
      }

      console.log('✅ Review atualizada');

      setEvents(events.map(e => {
        if (e.id === eventId) {
          const reviews = (e.reviews || []).map(r => {
            if (r.id === reviewId && r.userId === currentUser.id) {
              return {
                ...r,
                rating,
                comment,
                images,
                date: new Date().toISOString()
              };
            }
            return r;
          });
          const averageRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
          return { ...e, reviews, averageRating };
        }
        return e;
      }));
    } catch (error) {
      console.error('❌ Erro ao atualizar review:', error);
      alert('Erro ao atualizar avaliação. Tente novamente.');
    }
  };

  const handleDeleteReview = async (eventId: string, reviewId: string) => {
    if (!currentUser) return;

    console.log('🗑️ Deletando review:', reviewId);

    try {
      const { error } = await supabase
        .from('comentarios')
        .delete()
        .eq('id', reviewId)
        .eq(
          currentUser.userType === 'user' ? 'usuario_normal_id' : 'organizador_id',
          currentUser.id
        );

      if (error) {
        console.error('❌ Erro ao deletar review:', error);
        throw error;
      }

      console.log('✅ Review deletada');

      setEvents(events.map(e => {
        if (e.id === eventId) {
          const reviews = (e.reviews || []).filter(r => !(r.id === reviewId && r.userId === currentUser.id));
          const averageRating = reviews.length > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : undefined;
          return { ...e, reviews, averageRating };
        }
        return e;
      }));
    } catch (error) {
      console.error('❌ Erro ao deletar review:', error);
      alert('Erro ao deletar avaliação. Tente novamente.');
    }
  };

  const renderPage = () => {
    console.log('🎨 Renderizando página:', currentPage, 'isLoading:', isLoading, 'error:', error);

    if (error) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="bg-red-50 p-8 rounded-xl text-center">
            <h2 className="text-2xl font-bold text-red-600 mb-4">Erro</h2>
            <p className="text-red-500 mb-4">{error}</p>
            <button 
              onClick={() => window.location.reload()}
              className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700"
            >
              Recarregar
            </button>
          </div>
        </div>
      );
    }

    // if (isLoading) {
    //   console.log('⏳ Mostrando loading...');
    //   return (
    //     <div className="min-h-screen flex items-center justify-center">
    //       <div className="text-center">
    //         <div className="animate-spin rounded-full h-12 w-12 border-4 border-orange-600 border-t-transparent mx-auto mb-4"></div>
    //         <p className="text-gray-600">Carregando...</p>
    //       </div>
    //     </div>
    //   );
    // }

    switch (currentPage) {
      case 'landing':
        return <LandingPage 
          onExplore={() => setCurrentPage('login')} 
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
          onBack={() => setCurrentPage('login')}
        />;
      case 'organizer-signup':
        return <OrganizerSignupPage 
          onSignup={handleOrganizerSignup}
          onLogin={() => setCurrentPage('login')}
          onBack={() => setCurrentPage('login')}
        />;
      case 'events':
        return <EventsPage 
          events={events}
          currentUser={currentUser}
          onEventClick={handleEventClick}
          onNavigateToProfile={() => setCurrentPage(currentUser?.userType === 'organizer' ? 'organizer-profile' : 'user-dashboard')}
          onNavigateToDashboard={() => setCurrentPage(currentUser?.userType === 'organizer' ? 'organizer-dashboard' : 'user-dashboard')}
          onNavigateToCreateEvent={() => setCurrentPage(currentUser?.userType === 'organizer' ? 'create-event' : 'user-dashboard')}
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
        if (!selectedEvent) {
          console.log('⚠️ Evento não encontrado:', selectedEventId);
          setCurrentPage('events');
          return null;
        }
        return (
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
        );
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
        return <LandingPage onExplore={() => setCurrentPage('login')} />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50">
      <CookieBanner />
      {renderPage()}
    </div>
  );
}