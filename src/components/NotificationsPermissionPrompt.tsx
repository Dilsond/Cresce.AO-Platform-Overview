// src/components/NotificationPermissionPrompt.tsx
import { useState, useEffect } from 'react';
import { Bell, X } from 'lucide-react';
import { requestNotificationPermission, showLocalNotification } from '../lib/pushNotifications';

interface NotificationPermissionPromptProps {
  userId?: string;
  userType?: 'user' | 'organizer';
}

export function NotificationPermissionPrompt({ userId, userType }: NotificationPermissionPromptProps) {
  const [show, setShow] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    // Verificar permissão atual
    setPermission(Notification.permission);
    
    // Mostrar prompt apenas se for 'default' (ainda não perguntou)
    if (Notification.permission === 'default') {
      // Aguardar 3 segundos antes de mostrar
      const timer = setTimeout(() => {
        setShow(true);
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAllow = async () => {
    const granted = await requestNotificationPermission();
    setPermission(granted ? 'granted' : 'denied');
    setShow(false);
    
    if (granted) {
      showLocalNotification(
        '🔔 Notificações ativadas!',
        'Você receberá notificações sobre novos eventos e seguidores.'
      );
    }
  };

  const handleLater = () => {
    setShow(false);
    // Guardar no localStorage que o usuário recusou por enquanto
    localStorage.setItem('notifications_prompt_shown', 'true');
  };

  if (!show || permission !== 'default') {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm animate-in slide-in-from-right-5 fade-in duration-300">
      <div className="bg-white rounded-lg shadow-2xl border border-gray-200 p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
              <Bell className="w-5 h-5 text-orange-600" />
            </div>
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-gray-900">
              Receba notificações
            </h4>
            <p className="text-xs text-gray-500 mt-1">
              Fique por dentro de novos eventos e quando alguém começar a seguir você.
            </p>
            <div className="mt-3 flex gap-2">
              <button
                onClick={handleAllow}
                className="px-3 py-1.5 text-xs font-medium bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
              >
                Ativar
              </button>
              <button
                onClick={handleLater}
                className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-800 transition-colors"
              >
                Agora não
              </button>
            </div>
          </div>
          <button
            onClick={handleLater}
            className="flex-shrink-0 text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}