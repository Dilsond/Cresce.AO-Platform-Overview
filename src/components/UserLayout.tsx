import { Outlet, useNavigate } from 'react-router-dom';
import { Search, Heart, User, LogOut, Menu, X, CalendarDays, MessageSquare, Users } from 'lucide-react';
import { useState } from 'react';
import { Button } from './ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from './ui/dropdown-menu';
import { Separator } from './ui/separator';
import { Footer } from './Footer';
import logo from '../assets/logo.png';

export function UserLayout() {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const currentUser = (() => {
    try {
      const u = localStorage.getItem('user');
      return u ? JSON.parse(u) : null;
    } catch { return null; }
  })();

  const onLogout = () => {
    localStorage.removeItem('user');
    navigate('/login');
  };

  const onNavigateToProfile = () => {
    navigate('/user-dashboard');
  };

  if (!currentUser) return null;

  return (
    <div className="min-h-screen bg-gray-50 font-sans">

      <main>
        <Outlet />
      </main>
    </div>
  );
}