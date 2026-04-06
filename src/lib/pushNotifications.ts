// src/lib/pushNotifications.ts

export interface PushSubscription {
  endpoint: string;
  keys: {
    auth: string;
    p256dh: string;
  };
}

export const isPushSupported = (): boolean => {
  return (
    'Notification' in window &&
    'serviceWorker' in navigator &&
    'PushManager' in window
  );
};

export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!isPushSupported()) {
    console.warn('⚠️ Push notifications não suportadas');
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    const granted = permission === 'granted';
    
    if (granted) {
      // // console.log('✅ Permissão concedida');
    }
    return granted;
  } catch (error) {
    console.error('Erro ao solicitar permissão:', error);
    return false;
  }
};

export const registerServiceWorker = async (): Promise<ServiceWorkerRegistration | null> => {
  if (!('serviceWorker' in navigator)) return null;

  try {
    const registration = await navigator.serviceWorker.register('/sw.js');
    // console.log('✅ Service Worker registrado');
    return registration;
  } catch (error) {
    console.error('❌ Erro ao registrar Service Worker:', error);
    return null;
  }
};

export const subscribeUser = async (
  userId: string,
  userType: 'user' | 'organizer'
): Promise<boolean> => {
  try {
    if (Notification.permission !== 'granted') {
      const granted = await requestNotificationPermission();
      if (!granted) return false;
    }

    const registration = await registerServiceWorker();
    if (!registration) return false;

    await navigator.serviceWorker.ready;
    let subscription = await registration.pushManager.getSubscription();
    
    if (!subscription) {
      const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) return false;

      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
      });
    }

    const { supabase } = await import('./supabase');
    await supabase.from('push_subscriptions').upsert({
      usuario_id: userId,
      tipo_usuario: userType,
      endpoint: subscription.endpoint,
      auth_key: subscription.keys.auth,
      p256dh_key: subscription.keys.p256dh,
      user_agent: navigator.userAgent,
      updated_at: new Date().toISOString()
    });

    // console.log('✅ Inscrito para push notifications');
    return true;
  } catch (error) {
    console.error('❌ Erro ao inscrever:', error);
    return false;
  }
};

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Função para enviar push notification via API
export const sendPushNotification = async (
  userId: string,
  userType: 'user' | 'organizer',
  title: string,
  body: string,
  url: string = '/'
): Promise<boolean> => {
  try {
    const { supabase } = await import('./supabase');
    
    // Buscar subscriptions do usuário
    const { data: subscriptions } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('usuario_id', userId)
      .eq('tipo_usuario', userType);

    if (!subscriptions || subscriptions.length === 0) {
      // console.log('📱 Usuário não tem push subscriptions');
      return false;
    }

    // Enviar para cada subscription
    for (const sub of subscriptions) {
      try {
        const response = await fetch('/api/send-push', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subscription: {
              endpoint: sub.endpoint,
              keys: {
                auth: sub.auth_key,
                p256dh: sub.p256dh_key
              }
            },
            payload: { title, body, url }
          })
        });
        
        if (!response.ok) {
          console.error('Erro ao enviar push:', await response.text());
        }
      } catch (err) {
        console.error('Erro na subscription:', err);
      }
    }
    
    return true;
  } catch (error) {
    console.error('❌ Erro ao enviar push:', error);
    return false;
  }
};

// Notificação local (apenas para o navegador atual)
export const showLocalNotification = (title: string, body: string, icon?: string): void => {
  if (Notification.permission === 'granted') {
    const notification = new Notification(title, {
      body: body,
      icon: icon || `${window.location.origin}/icon-192x192.png`,
      badge: `${window.location.origin}/badge-72x72.png`,
      silent: false,
      vibrate: [200, 100, 200]
    });
    notification.onclick = () => {
      window.focus();
      notification.close();
    };
  }
};