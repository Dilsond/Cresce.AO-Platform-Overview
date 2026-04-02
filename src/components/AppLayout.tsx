import { useEffect, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { OrganizerLayout } from './OrganizerLayout';
import { UserLayout } from './UserLayout';

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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-orange-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando...</p>
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