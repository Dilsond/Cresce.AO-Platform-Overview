import { ArrowLeft, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface PrivacyPolicyPageProps {
  onBack: () => void;
}

export function PrivacyPolicyPage({ onBack }: PrivacyPolicyPageProps) {

  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 cursor-pointer text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Voltar</span>
            </button>
            <div className="flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-orange-600" />
              <span className="font-bold text-gray-900">Cresce.AO</span>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-2xl shadow-sm p-8 sm:p-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Política de Privacidade</h1>
          <p className="text-gray-600 mb-8">Última atualização: Janeiro de 2026</p>

          <div className="space-y-8 text-gray-700">
            {/* Introdução */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Introdução</h2>
              <p className="leading-relaxed">
                A Cresce.AO valoriza a privacidade dos seus utilizadores. Esta Política de Privacidade descreve como
                recolhemos, usamos, armazenamos e protegemos as suas informações pessoais quando utiliza a nossa plataforma.
              </p>
            </section>

            {/* Informações Recolhidas */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Informações que Recolhemos</h2>
              <p className="leading-relaxed mb-4">Recolhemos as seguintes informações:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Nome completo e nome de utilizador</li>
                <li>Endereço de email</li>
                <li>Informações da empresa (para organizadores)</li>
                <li>Eventos curtidos e preferências</li>
                <li>Dados de navegação e utilização da plataforma</li>
              </ul>
            </section>

            {/* Utilização das Informações */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. Como Utilizamos as Suas Informações</h2>
              <p className="leading-relaxed mb-4">Utilizamos as suas informações para:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Criar e gerir a sua conta na plataforma</li>
                <li>Personalizar a sua experiência de utilizador</li>
                <li>Enviar notificações sobre eventos do seu interesse</li>
                <li>Melhorar os nossos serviços e funcionalidades</li>
                <li>Comunicar atualizações importantes da plataforma</li>
                <li>Garantir a segurança e prevenir fraudes</li>
              </ul>
            </section>

            {/* Partilha de Informações */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Partilha de Informações</h2>
              <p className="leading-relaxed">
                A Cresce.AO não vende, aluga ou partilha as suas informações pessoais com terceiros para fins de marketing.
                Podemos partilhar informações apenas em circunstâncias específicas, como:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4 mt-4">
                <li>Com organizadores de eventos quando você se inscreve num evento</li>
                <li>Quando exigido por lei ou por autoridades governamentais</li>
                <li>Para proteger os direitos e segurança da plataforma e dos utilizadores</li>
              </ul>
            </section>

            {/* Segurança */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Segurança dos Dados</h2>
              <p className="leading-relaxed">
                Implementamos medidas de segurança técnicas e organizacionais para proteger as suas informações contra
                acesso não autorizado, alteração, divulgação ou destruição. No entanto, nenhum método de transmissão pela
                internet é 100% seguro.
              </p>
            </section>

            {/* Cookies */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Cookies</h2>
              <p className="leading-relaxed">
                Utilizamos cookies e tecnologias similares para melhorar a sua experiência na plataforma, analisar o tráfego
                e personalizar conteúdo. Você pode gerir as suas preferências de cookies através das configurações do seu navegador.
              </p>
            </section>

            {/* Direitos do Utilizador */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Os Seus Direitos</h2>
              <p className="leading-relaxed mb-4">Você tem os seguintes direitos em relação aos seus dados pessoais:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Aceder aos seus dados pessoais</li>
                <li>Corrigir dados incorretos ou desatualizados</li>
                <li>Solicitar a eliminação dos seus dados</li>
                <li>Opor-se ao processamento dos seus dados</li>
                <li>Retirar o consentimento a qualquer momento</li>
              </ul>
            </section>

            {/* Menores */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Menores de Idade</h2>
              <p className="leading-relaxed">
                A nossa plataforma não é direcionada a menores de 18 anos. Não recolhemos intencionalmente informações de
                menores de idade. Se tomar conhecimento de que recolhemos dados de um menor, entre em contacto connosco
                imediatamente.
              </p>
            </section>

            {/* Alterações */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. Alterações a Esta Política</h2>
              <p className="leading-relaxed">
                Podemos atualizar esta Política de Privacidade periodicamente. Notificaremos sobre quaisquer alterações
                significativas através da plataforma ou por email. Recomendamos que reveja esta página regularmente.
              </p>
            </section>

            {/* Contacto */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. Contacto</h2>
              <p className="leading-relaxed">
                Se tiver questões sobre esta Política de Privacidade ou sobre como tratamos os seus dados, entre em contacto:
              </p>
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <p className="font-medium">Email: privacidade@cresce.ao</p>
                <p className="mt-2">Tel: +244 923 456 789</p>
                <p className="mt-2">Endereço: Luanda, Angola</p>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
