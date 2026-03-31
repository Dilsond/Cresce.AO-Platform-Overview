// src/components/NotificationSettingsButton.tsx
import { useState } from 'react';
import { Bell, BellOff } from 'lucide-react';
import { requestNotificationPermission, showLocalNotification } from '../lib/pushNotifications';

export function NotificationSettingsButton() {
  const [permission, setPermission] = useState<NotificationPermission>(Notification.permission);

  const handleRequestPermission = async () => {
    const granted = await requestNotificationPermission();
    setPermission(granted ? 'granted' : 'denied');
    
    if (granted) {
      showLocalNotification(
        '🔔 Notificações ativadas!',
        'Você receberá notificações sobre novos eventos e seguidores.'
      );
    }
  };

  if (permission === 'granted') {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-green-100 text-green-700 rounded-full text-sm">
        <Bell className="w-4 h-4" />
        <span>Notificações ativas</span>
      </div>
    );
  }

  if (permission === 'denied') {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 text-gray-500 rounded-full text-sm">
        <BellOff className="w-4 h-4" />
        <span>Notificações bloqueadas</span>
      </div>
    );
  }

  return (
    <button
      onClick={handleRequestPermission}
      className="flex items-center gap-2 px-3 py-1.5 bg-orange-600 text-white rounded-lg text-sm hover:bg-orange-700 transition-colors"
    >
      <Bell className="w-4 h-4" />
      <span>Ativar notificações</span>
    </button>
  );
}