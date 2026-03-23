import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export const usePushNotifications = (userId?: string, userType?: 'user' | 'organizer') => {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const supported = 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
    setIsSupported(supported);
    
    if (supported) {
      setPermission(Notification.permission);
      checkExistingSubscription();
    }
  }, [userId, userType]);

  const checkExistingSubscription = async () => {
    if (!userId || !userType) return;
    
    try {
      const { data } = await supabase
        .from('push_subscriptions')
        .select('id')
        .eq('usuario_id', userId)
        .eq('tipo_usuario', userType)
        .maybeSingle();
      
      setIsSubscribed(!!data);
    } catch (error) {
      // console.error('Erro ao verificar subscription:', error);
    }
  };

  const subscribeToPush = async (registration: ServiceWorkerRegistration): Promise<PushSubscription | null> => {
    try {
      const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
      
      if (!vapidPublicKey) {
        // console.error('❌ VAPID public key não configurada');
        return null;
      }

      // console.log('📡 Solicitando subscription...');
      
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
      });
      
      // console.log('✅ Subscription obtida:', subscription);
      return subscription;
    } catch (error) {
      // console.error('❌ Erro ao inscrever no push:', error);
      return null;
    }
  };

  const saveSubscription = async (subscription: PushSubscription) => {
    if (!userId || !userType) return false;
    
    try {
      // Verificar se subscription tem a estrutura esperada
      if (!subscription || !subscription.endpoint) {
        // console.error('❌ Subscription inválida:', subscription);
        return false;
      }

      // Extrair as chaves corretamente
      const keys = subscription.toJSON?.()?.keys || subscription.keys;
      
      if (!keys || !keys.auth || !keys.p256dh) {
        // console.error('❌ Chaves não encontradas na subscription:', keys);
        return false;
      }

      // console.log('💾 Salvando subscription:', {
      //   endpoint: subscription.endpoint,
      //   auth: keys.auth,
      //   p256dh: keys.p256dh
      // });

      const { error } = await supabase
        .from('push_subscriptions')
        .upsert({
          usuario_id: userId,
          tipo_usuario: userType,
          endpoint: subscription.endpoint,
          auth_key: keys.auth,
          p256dh_key: keys.p256dh,
          user_agent: navigator.userAgent,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'usuario_id, tipo_usuario, endpoint'
        });

      if (error) throw error;
      // console.log('✅ Subscription salva no servidor');
      return true;
    } catch (error) {
      // console.error('❌ Erro ao salvar subscription:', error);
      return false;
    }
  };

  const enablePushNotifications = async () => {
    if (!userId || !userType) {
      // console.warn('Usuário não autenticado');
      return false;
    }

    // Verificar permissão
    if (Notification.permission !== 'granted') {
      const permissionGranted = await Notification.requestPermission();
      if (permissionGranted !== 'granted') {
        setPermission('denied');
        // console.log('❌ Permissão negada');
        return false;
      }
      setPermission('granted');
    }

    setLoading(true);
    try {
      // Aguardar Service Worker estar pronto
      // console.log('⏳ Aguardando Service Worker...');
      const registration = await navigator.serviceWorker.ready;
      // console.log('✅ Service Worker pronto:', registration);
      
      // Verificar subscription existente
      let subscription = await registration.pushManager.getSubscription();
      // console.log('📡 Subscription existente:', subscription);
      
      if (!subscription) {
        // console.log('🆕 Criando nova subscription...');
        subscription = await subscribeToPush(registration);
        if (!subscription) {
          // console.error('❌ Falha ao criar subscription');
          return false;
        }
      }
      
      // Salvar no banco
      const saved = await saveSubscription(subscription);
      if (saved) {
        setIsSubscribed(true);
        
        // Notificação de boas-vindas
        try {
          const notification = new Notification('🔔 Notificações ativadas!', {
            body: 'Seja bem-vindo ao Cesce.AO',
            icon: '/icon-192x192.png',
            badge: '/badge-72x72.png'
          });
          
          notification.onclick = () => window.focus();
        } catch (e) {
          // console.warn('Não foi possível mostrar notificação de boas-vindas:', e);
        }
      }
      return saved;
    } catch (error) {
      // console.error('❌ Erro ao ativar push:', error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const disablePushNotifications = async () => {
    if (!userId || !userType) return false;
    
    setLoading(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        await subscription.unsubscribe();
        // console.log('✅ Subscription removida localmente');
      }

      const { error } = await supabase
        .from('push_subscriptions')
        .delete()
        .eq('usuario_id', userId)
        .eq('tipo_usuario', userType);

      if (error) throw error;
      
      setIsSubscribed(false);
      // console.log('✅ Notificações push desativadas');
      return true;
    } catch (error) {
      // console.error('❌ Erro ao desativar push:', error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const requestPermission = async () => {
    const granted = await Notification.requestPermission();
    setPermission(granted);
    return granted === 'granted';
  };

  return {
    isSupported,
    isSubscribed,
    permission,
    loading,
    enablePushNotifications,
    disablePushNotifications,
    requestPermission
  };
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