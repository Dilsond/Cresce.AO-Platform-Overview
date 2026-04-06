import { useEffect, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { OrganizerLayout } from './OrganizerLayout';
import { UserLayout } from './UserLayout';
import logo from '../assets/logo.png';

export function AppLayout() {
  const [userType, setUserType] = useState<'user' | 'organizer' | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        setUserType(user.type);
      } catch (err) {
        console.error('Erro ao parsear usuário:', err);
        navigate('/login');
      }
    } else {
      navigate('/login');
    }
    setIsLoading(false);
  }, [navigate]);

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

  // Se for organizador, usa o layout com sidebar
  if (userType === 'organizer') {
    return <OrganizerLayout />;
  }

  // Se for usuário normal, usa o layout sem sidebar
  return <UserLayout />;
}