import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Compass,
  CalendarDays,
  Users,
  MessageSquareWarning,
  UserCircle,
  LogOut,
  ChevronLeft,
  ChevronRight,
  PlusCircle,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import logo from '../assets/logo.png';

const NAV_ITEMS = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/organizer-dashboard' },
  { label: 'Explorar', icon: Compass, path: '/events' },
  { label: 'Meus Eventos', icon: CalendarDays, path: '/my-events' },
  { label: 'Seguidores', icon: Users, path: '/followers' },
  { label: 'Comentários', icon: MessageSquareWarning, path: '/manage-comments' },
  { label: 'Perfil', icon: UserCircle, path: '/organizer-profile' },
];

export function OrganizerLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [organizer, setOrganizer] = useState<{ 
    id: string;
    name: string; 
    email: string; 
    avatarUrl?: string;
    type: string;
  } | null>(null);

  // Buscar dados do organizador do banco
  useEffect(() => {
    const fetchOrganizerData = async () => {
      try {
        const storedUser = localStorage.getItem('user');
        if (!storedUser) {
          setIsLoading(false);
          return;
        }
        
        const parsedUser = JSON.parse(storedUser);
        if (parsedUser.type !== 'organizer') {
          setIsLoading(false);
          return;
        }

        // Buscar dados completos do organizador no banco
        const { data, error } = await supabase
          .from('organizadores')
          .select('id, nome_empresa, email_empresa, avatar_url')
          .eq('id', parsedUser.id)
          .single();

        if (error) {
          console.error('Erro ao buscar dados do organizador:', error);
          // Fallback para os dados do localStorage
          setOrganizer({
            id: parsedUser.id,
            name: parsedUser.name || parsedUser.company,
            email: parsedUser.email,
            avatarUrl: parsedUser.avatarUrl,
            type: 'organizer'
          });
        } else if (data) {
          setOrganizer({
            id: data.id,
            name: data.nome_empresa,
            email: data.email_empresa,
            avatarUrl: data.avatar_url,
            type: 'organizer'
          });
          
          // Atualizar localStorage com a URL do avatar
          if (data.avatar_url) {
            const updatedUser = {
              ...parsedUser,
              name: data.nome_empresa,
              email: data.email_empresa,
              avatarUrl: data.avatar_url
            };
            localStorage.setItem('user', JSON.stringify(updatedUser));
          }
        }
      } catch (err) {
        console.error('Erro:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrganizerData();
  }, []);

  useEffect(() => {
    if (!isLoading && (!organizer || organizer.type !== 'organizer')) {
      navigate('/events', { replace: true });
    }
  }, [organizer, isLoading, navigate]);

  const onLogout = () => {
    localStorage.removeItem('user');
    navigate('/organizer-login', { replace: true });
  };

  const getInitials = (name: string) => {
    if (!name) return 'OG';
    return name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();
  };

  const initials = organizer?.name ? getInitials(organizer.name) : 'OG';

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-orange-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!organizer || organizer.type !== 'organizer') {
    return null;
  }

  return (
    <div className="fixed inset-0 flex bg-gray-50 font-sans overflow-hidden">
      {/* Sidebar */}
      <aside
        className={`
          flex flex-col h-full shrink-0
          bg-white border-r border-gray-100
          transition-[width] duration-300 ease-in-out
          z-30
          ${collapsed ? 'w-[72px]' : 'w-[240px]'}
        `}
      >
        {/* Header com logo */}
        <div className="flex items-center h-16 shrink-0 border-b border-gray-100 px-3 gap-2">
          <div
            onClick={() => navigate('/events')}
            className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer overflow-hidden"
          >
            <img src={logo} alt="Cresce.AO" className="h-8 w-auto object-contain shrink-0" />
            {!collapsed && (
              <span className="text-xl font-bold text-gray-900 tracking-tight whitespace-nowrap select-none">
                Cresce<span className="text-orange-600">.AO</span>
              </span>
            )}
          </div>

          <button
            onClick={() => setCollapsed(!collapsed)}
            className="shrink-0 w-7 h-7 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-center cursor-pointer text-gray-400 hover:text-orange-600 hover:border-orange-300 hover:bg-orange-50 transition-all duration-200"
            aria-label={collapsed ? 'Expandir sidebar' : 'Recolher sidebar'}
          >
            {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
          </button>
        </div>

        {/* Botão criar evento */}
        <div className={`shrink-0 border-b border-gray-100 py-4 ${collapsed ? 'px-2 flex justify-center' : 'px-3'}`}>
          {collapsed ? (
            <button
              onClick={() => navigate('/create-event')}
              title="Criar evento"
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-orange-600 hover:bg-orange-700 active:scale-95 cursor-pointer text-white transition-all duration-200 shadow-sm shadow-orange-200"
            >
              <PlusCircle className="w-5 h-5" />
            </button>
          ) : (
            <button
              onClick={() => navigate('/create-event')}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-orange-600 hover:bg-orange-700 active:scale-95 text-white text-sm font-semibold px-3 py-2.5 cursor-pointer transition-all duration-200 shadow-sm shadow-orange-200"
            >
              <PlusCircle className="w-4 h-4 shrink-0" />
              <span>Criar evento</span>
            </button>
          )}
        </div>

        {/* Navegação */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          {NAV_ITEMS.map(({ label, icon: Icon, path }) => {
            const isActive = location.pathname === path || (path !== '/events' && location.pathname.startsWith(path));

            return (
              <button
                key={path}
                onClick={() => navigate(path)}
                title={collapsed ? label : undefined}
                className={`
                  w-full flex items-center rounded-xl py-2.5 cursor-pointer
                  text-sm font-medium transition-all duration-200 group
                  ${collapsed ? 'justify-center px-0' : 'gap-3 px-3'}
                  ${isActive
                    ? 'bg-orange-50 text-orange-600'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }
                `}
              >
                <Icon
                  className={`
                    shrink-0 transition-colors duration-200
                    ${collapsed ? 'w-5 h-5' : 'w-4 h-4'}
                    ${isActive ? 'text-orange-600' : 'text-gray-400 group-hover:text-gray-600'}
                  `}
                />
                {!collapsed && <span className="whitespace-nowrap flex-1 text-left">{label}</span>}
                {isActive && !collapsed && <span className="w-1.5 h-1.5 rounded-full bg-orange-600 shrink-0" />}
              </button>
            );
          })}
        </nav>

        {/* Rodapé */}
        <div className="shrink-0 border-t border-gray-100 p-3 space-y-1">
          <button
            onClick={onLogout}
            title={collapsed ? 'Sair' : undefined}
            className={`
              w-full flex items-center rounded-xl py-2 cursor-pointer
              text-sm text-gray-400 hover:text-red-600 hover:bg-red-50
              transition-all duration-200
              ${collapsed ? 'justify-center px-0' : 'gap-2 px-3'}
            `}
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {!collapsed && <span>Sair</span>}
          </button>

          <div
            className={`
              flex items-center rounded-xl hover:bg-gray-50 transition-colors duration-200
              ${collapsed ? 'justify-center p-2' : 'gap-3 p-2'}
            `}
            title={collapsed ? organizer.name : undefined}
          >
            <div className="w-8 h-8 rounded-full shrink-0 overflow-hidden bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center text-white text-xs font-bold">
              {organizer.avatarUrl ? (
                <img 
                  src={organizer.avatarUrl} 
                  alt={organizer.name} 
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    // Fallback se a imagem não carregar
                    (e.target as HTMLImageElement).style.display = 'none';
                    (e.target as HTMLImageElement).parentElement!.innerHTML = initials;
                  }}
                />
              ) : (
                initials
              )}
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate leading-tight">{organizer.name}</p>
                <p className="text-xs text-gray-400 truncate">{organizer.email}</p>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Conteúdo principal */}
      <div className="flex-1 min-w-0 overflow-y-auto">
        <Outlet />
      </div>
    </div>
  );
}