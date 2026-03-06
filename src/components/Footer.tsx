import { Sparkles } from 'lucide-react';

interface FooterProps {
  onExplore?: () => void;
  onNavigateToPrivacy?: () => void;
  onNavigateToTerms?: () => void;
}

export function Footer({ onExplore, onNavigateToPrivacy, onNavigateToTerms }: FooterProps) {
  return (
    <footer className="bg-gray-900 text-gray-300 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          {/* Sobre */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-6 h-6 text-orange-600" />
              <h3 className="font-bold text-white text-lg">Cresce.AO</h3>
            </div>
            <p className="text-sm">
              Plataforma que centraliza oportunidades de aprendizagem e desenvolvimento profissional em Angola.
            </p>
          </div>

          {/* Links Rápidos */}
          <div>
            <h4 className="font-semibold text-white mb-4">Links Rápidos</h4>
            <ul className="space-y-2 text-sm">
              {onExplore && (
                <li>
                  <button onClick={onExplore} className="hover:text-orange-600 transition-colors">
                    Explorar Eventos
                  </button>
                </li>
              )}
              <li>
                <button className="hover:text-orange-600 transition-colors">
                  Sobre Nós
                </button>
              </li>
              <li>
                <button className="hover:text-orange-600 transition-colors">
                  Contacto
                </button>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-semibold text-white mb-4">Legal</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <button 
                  onClick={onNavigateToPrivacy}
                  className="hover:text-orange-600 cursor-pointer transition-colors"
                >
                  Política de Privacidade
                </button>
              </li>
              <li>
                <button 
                  onClick={onNavigateToTerms}
                  className="hover:text-orange-600 cursor-pointer transition-colors"
                >
                  Termos de Uso
                </button>
              </li>
              <li>
                <button className="hover:text-orange-600 transition-colors">
                  Política de Cookies
                </button>
              </li>
            </ul>
          </div>

          {/* Contacto */}
          <div>
            <h4 className="font-semibold text-white mb-4">Contacto</h4>
            <ul className="space-y-2 text-sm">
              <li>Email: info@cresce.ao</li>
              <li>Tel: +244 923 456 789</li>
              <li>Luanda, Angola</li>
            </ul>
          </div>
        </div>

        {/* Linha divisória */}
        <div className="border-t border-gray-700 pt-8 text-center text-sm">
          <p>&copy; 2026 Cresce.AO. Todos os direitos reservados.</p>
          <p className="mt-2">Plataforma de Eventos Corporativos e Formativos em Angola</p>
        </div>
      </div>
    </footer>
  );
}
