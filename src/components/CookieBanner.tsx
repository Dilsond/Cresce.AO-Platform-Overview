import { useState, useEffect } from 'react';
import { X, Cookie } from 'lucide-react';

export function CookieBanner() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Verifica se o usuário já aceitou os cookies
    const cookiesAccepted = localStorage.getItem('cookiesAccepted');
    if (!cookiesAccepted) {
      setIsVisible(true);
    }
  }, []);

  const acceptCookies = () => {
    localStorage.setItem('cookiesAccepted', 'true');
    setIsVisible(false);
  };

  const declineCookies = () => {
    localStorage.setItem('cookiesAccepted', 'false');
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gray-900 text-white p-6 shadow-2xl z-50 border-t-2 border-orange-600">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4 flex-1">
            <Cookie className="w-8 h-8 text-orange-500 flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-semibold text-lg mb-2">Este website utiliza cookies</h3>
              <p className="text-sm text-gray-300 leading-relaxed">
                Utilizamos cookies para melhorar a sua experiência de navegação, analisar o tráfego do site e personalizar conteúdo. 
                Ao clicar em "Aceitar", você concorda com o uso de cookies conforme descrito na nossa{' '}
                <button className="underline hover:text-orange-500 transition-colors">Política de Cookies</button>.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            <button
              onClick={declineCookies}
              className="px-6 py-2 border border-gray-600 rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium"
            >
              Recusar
            </button>
            <button
              onClick={acceptCookies}
              className="px-6 py-2 bg-orange-600 hover:bg-orange-700 rounded-lg transition-colors text-sm font-medium"
            >
              Aceitar
            </button>
            <button
              onClick={declineCookies}
              className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
              aria-label="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
