// src/components/NotificationSettings.tsx
import { useState, useEffect } from 'react';
import { Bell, BellOff, Globe, Mail, Smartphone, AlertCircle } from 'lucide-react';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { notificationService } from '../services/notificationService';

interface NotificationSettingsProps {
  userId: string;
  userType: 'user' | 'organizer';
}

export function NotificationSettings({ userId, userType }: NotificationSettingsProps) {
  const [preferences, setPreferences] = useState({
    email_novo_evento: true,
    email_novo_seguidor: true,
    push_novo_evento: true,
    push_novo_seguidor: true
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const {
    isSupported,
    isSubscribed,
    permission,
    loading: pushLoading,
    enablePushNotifications,
    disablePushNotifications,
    requestPermission
  } = usePushNotifications(userId, userType);

  useEffect(() => {
    loadPreferences();
  }, [userId, userType]);

  const loadPreferences = async () => {
    try {
      const prefs = await notificationService.getUserPreferences(userId, userType);
      if (prefs) {
        setPreferences(prefs);
      }
    } catch (error) {
      console.error('Erro ao carregar preferências:', error);
    } finally {
      setLoading(false);
    }
  };

  const updatePreference = async (key: keyof typeof preferences, value: boolean) => {
    setSaving(true);
    try {
      const newPrefs = { ...preferences, [key]: value };
      const success = await notificationService.updatePreferences(userId, userType, {
        [key]: value
      });
      
      if (success) {
        setPreferences(newPrefs);
      }
    } catch (error) {
      console.error('Erro ao atualizar preferência:', error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Notificações Push do Navegador */}
      {isSupported && (
        <div className="bg-white rounded-xl shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-orange-600" />
            Notificações do Navegador
          </h3>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">Notificações Push</p>
                <p className="text-sm text-gray-500">
                  Receba notificações mesmo quando o site está fechado
                </p>
              </div>
              
              {permission === 'granted' ? (
                <button
                  onClick={isSubscribed ? disablePushNotifications : enablePushNotifications}
                  disabled={pushLoading}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    isSubscribed
                      ? 'bg-red-500 text-white hover:bg-red-600'
                      : 'bg-green-500 text-white hover:bg-green-600'
                  } disabled:opacity-50`}
                >
                  {pushLoading ? 'Carregando...' : (isSubscribed ? 'Desativar' : 'Ativar')}
                </button>
              ) : permission === 'denied' ? (
                <div className="text-right">
                  <p className="text-sm text-red-500">Permissão negada</p>
                  <button
                    onClick={() => alert('Por favor, habilite as notificações nas configurações do seu navegador')}
                    className="text-sm text-orange-600 hover:underline"
                  >
                    Como ativar?
                  </button>
                </div>
              ) : (
                <button
                  onClick={requestPermission}
                  className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
                >
                  Solicitar Permissão
                </button>
              )}
            </div>
            
            <p className="text-xs text-gray-500 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              As notificações push funcionam mesmo com o site fechado. Você pode desativar a qualquer momento.
            </p>
          </div>
        </div>
      )}

      {/* Preferências de Email */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Mail className="w-5 h-5 text-orange-600" />
          Notificações por Email
        </h3>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="font-medium text-gray-900">Novos Eventos</p>
              <p className="text-sm text-gray-500">
                Receba emails quando organizadores que você segue criarem eventos
              </p>
            </div>
            <button
              onClick={() => updatePreference('email_novo_evento', !preferences.email_novo_evento)}
              disabled={saving}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                preferences.email_novo_evento ? 'bg-green-500' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  preferences.email_novo_evento ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
          
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="font-medium text-gray-900">Novos Seguidores</p>
              <p className="text-sm text-gray-500">
                Receba emails quando alguém começar a seguir você
              </p>
            </div>
            <button
              onClick={() => updatePreference('email_novo_seguidor', !preferences.email_novo_seguidor)}
              disabled={saving}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                preferences.email_novo_seguidor ? 'bg-green-500' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  preferences.email_novo_seguidor ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Preferências de Push (in-app) */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Globe className="w-5 h-5 text-orange-600" />
          Notificações no Site
        </h3>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="font-medium text-gray-900">Novos Eventos</p>
              <p className="text-sm text-gray-500">
                Receba notificações no site quando organizadores criarem eventos
              </p>
            </div>
            <button
              onClick={() => updatePreference('push_novo_evento', !preferences.push_novo_evento)}
              disabled={saving}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                preferences.push_novo_evento ? 'bg-green-500' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  preferences.push_novo_evento ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
          
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="font-medium text-gray-900">Novos Seguidores</p>
              <p className="text-sm text-gray-500">
                Receba notificações no site quando alguém começar a seguir você
              </p>
            </div>
            <button
              onClick={() => updatePreference('push_novo_seguidor', !preferences.push_novo_seguidor)}
              disabled={saving}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                preferences.push_novo_seguidor ? 'bg-green-500' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  preferences.push_novo_seguidor ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Info sobre notificações push */}
      {isSupported && permission !== 'granted' && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            🔔 <strong>Notificações Push</strong> - Ative para receber alertas mesmo quando o site estiver fechado.
            Você pode desativar a qualquer momento nas configurações do seu navegador.
          </p>
        </div>
      )}
    </div>
  );
}