// src/lib/pushNotifications.ts

// Gerar VAPID Keys (use uma vez e guarde no .env)
// No terminal: npx web-push generate-vapid-keys
// Copie as chaves para o .env

export interface PushSubscription {
  endpoint: string;
  keys: {
    auth: string;
    p256dh: string;
  };
}

// Verificar se o navegador suporta notificações
export const isPushSupported = (): boolean => {
  return (
    'Notification' in window &&
    'serviceWorker' in navigator &&
    'PushManager' in window
  );
};

// Solicitar permissão para notificações
export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!isPushSupported()) {
    console.warn('⚠️ Push notifications não suportadas neste navegador');
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    const granted = permission === 'granted';
    
    if (granted) {
      console.log('✅ Permissão para notificações concedida');
    } else {
      console.log('❌ Permissão para notificações negada');
    }
    
    return granted;
  } catch (error) {
    console.error('Erro ao solicitar permissão:', error);
    return false;
  }
};

// Registrar Service Worker
export const registerServiceWorker = async (): Promise<ServiceWorkerRegistration | null> => {
  if (!('serviceWorker' in navigator)) {
    console.warn('⚠️ Service Workers não suportados');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js');
    console.log('✅ Service Worker registrado:', registration);
    return registration;
  } catch (error) {
    console.error('❌ Erro ao registrar Service Worker:', error);
    return null;
  }
};

// Salvar subscription no servidor
export const saveSubscription = async (
  subscription: PushSubscription,
  userId: string,
  userType: 'user' | 'organizer'
): Promise<boolean> => {
  try {
    const { supabase } = await import('./supabase');
    
    const { error } = await supabase
      .from('push_subscriptions')
      .upsert({
        usuario_id: userId,
        tipo_usuario: userType,
        endpoint: subscription.endpoint,
        auth_key: subscription.keys.auth,
        p256dh_key: subscription.keys.p256dh,
        user_agent: navigator.userAgent,
        updated_at: new Date().toISOString()
      });

    if (error) throw error;
    console.log('✅ Subscription salva no servidor');
    return true;
  } catch (error) {
    console.error('❌ Erro ao salvar subscription:', error);
    return false;
  }
};

// Cancelar subscription
export const unsubscribe = async (userId: string, userType: 'user' | 'organizer'): Promise<boolean> => {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    
    if (subscription) {
      await subscription.unsubscribe();
      console.log('✅ Subscription removida localmente');
    }

    const { supabase } = await import('./supabase');
    const { error } = await supabase
      .from('push_subscriptions')
      .delete()
      .eq('usuario_id', userId)
      .eq('tipo_usuario', userType);

    if (error) throw error;
    console.log('✅ Subscription removida do servidor');
    return true;
  } catch (error) {
    console.error('❌ Erro ao cancelar subscription:', error);
    return false;
  }
};

// Inscrever usuário para push notifications
export const subscribeUser = async (
  userId: string,
  userType: 'user' | 'organizer'
): Promise<boolean> => {
  try {
    // Verificar se já tem permissão
    if (Notification.permission !== 'granted') {
      const granted = await requestNotificationPermission();
      if (!granted) return false;
    }

    // Registrar Service Worker
    const registration = await registerServiceWorker();
    if (!registration) return false;

    // Obter subscription existente
    let subscription = await registration.pushManager.getSubscription();
    
    if (!subscription) {
      // Criar nova subscription
      const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
      
      if (!vapidPublicKey) {
        console.error('❌ VAPID public key não configurada');
        return false;
      }

      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
      });
    }

    // Salvar no servidor
    await saveSubscription(subscription, userId, userType);
    
    return true;
  } catch (error) {
    console.error('❌ Erro ao inscrever usuário:', error);
    return false;
  }
};

// Função auxiliar para converter base64 URL para Uint8Array
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Mostrar notificação local (quando a aba está aberta)
export const showLocalNotification = (title: string, body: string, icon?: string): void => {
  if (Notification.permission === 'granted') {
    const notification = new Notification(title, {
      body: body,
      icon: icon || '/icon-192x192.png',
      badge: '/badge-72x72.png',
      silent: false,
      vibrate: [200, 100, 200]
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
    };
  }
};