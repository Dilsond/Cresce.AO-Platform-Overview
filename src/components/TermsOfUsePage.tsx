import { ArrowLeft, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import logo from "../assets/logo.png";

interface TermsOfUsePageProps {
  onBack: () => void;
}

export function TermsOfUsePage({ onBack }: TermsOfUsePageProps) {

  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-600 cursor-pointer hover:text-orange-600 transition-all group"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            <span className="font-medium">Voltar</span>
          </button>
          <div className="flex items-center">
            <img
              src={logo}
              alt="Cresce.AO Logo"
              className="h-10 w-auto object-contain"
            />
            <span className="text-xl font-bold text-gray-900 tracking-tight">
              Cresce<span className="text-orange-600">.AO</span>
            </span>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-2xl shadow-sm p-8 sm:p-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Termos de Uso</h1>
          <p className="text-gray-600 mb-8">Última atualização: Janeiro de 2026</p>

          <div className="space-y-8 text-gray-700">
            {/* Aceitação dos Termos */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Aceitação dos Termos</h2>
              <p className="leading-relaxed">
                Ao aceder e utilizar a plataforma Cresce.AO, você concorda em cumprir e ficar vinculado a estes Termos de Uso.
                Se não concordar com qualquer parte destes termos, não deverá utilizar a plataforma.
              </p>
            </section>

            {/* Descrição do Serviço */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Descrição do Serviço</h2>
              <p className="leading-relaxed">
                A Cresce.AO é uma plataforma digital que centraliza eventos corporativos e formativos em Angola, conectando
                profissionais a oportunidades de aprendizagem, networking e desenvolvimento. A plataforma permite:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4 mt-4">
                <li>Pesquisar e visualizar eventos</li>
                <li>Criar conta como utilizador comum ou organizador</li>
                <li>Para organizadores: publicar e gerir eventos</li>
                <li>Salvar eventos favoritos</li>
                <li>Aceder a informações sobre eventos e organizadores</li>
              </ul>
            </section>

            {/* Contas de Utilizador */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. Contas de Utilizador</h2>
              <h3 className="text-xl font-medium text-gray-800 mb-3">3.1 Registro</h3>
              <p className="leading-relaxed mb-4">
                Para aceder a determinadas funcionalidades, você deve criar uma conta. Ao criar uma conta, você concorda em:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4 mb-4">
                <li>Fornecer informações verdadeiras, precisas e completas</li>
                <li>Manter a confidencialidade da sua password</li>
                <li>Notificar-nos imediatamente sobre qualquer uso não autorizado da sua conta</li>
                <li>Ser responsável por todas as atividades realizadas na sua conta</li>
              </ul>

              <h3 className="text-xl font-medium text-gray-800 mb-3">3.2 Elegibilidade</h3>
              <p className="leading-relaxed">
                Você deve ter pelo menos 18 anos de idade para criar uma conta e utilizar a plataforma.
              </p>
            </section>

            {/* Conduta do Utilizador */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Conduta do Utilizador</h2>
              <p className="leading-relaxed mb-4">Ao utilizar a plataforma, você concorda em NÃO:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Publicar conteúdo falso, enganoso ou fraudulento</li>
                <li>Violar direitos de propriedade intelectual de terceiros</li>
                <li>Assediar, ameaçar ou intimidar outros utilizadores</li>
                <li>Publicar conteúdo ilegal, ofensivo ou inapropriado</li>
                <li>Utilizar a plataforma para spam ou publicidade não autorizada</li>
                <li>Tentar aceder áreas restritas ou comprometer a segurança da plataforma</li>
                <li>Utilizar bots, scripts ou ferramentas automatizadas sem autorização</li>
              </ul>
            </section>

            {/* Conteúdo de Eventos */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Conteúdo de Eventos (Para Organizadores)</h2>
              <p className="leading-relaxed mb-4">
                Os organizadores que publicam eventos na plataforma são responsáveis por:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Garantir que todas as informações do evento são verdadeiras e precisas</li>
                <li>Cumprir todas as leis e regulamentos aplicáveis</li>
                <li>Honrar os compromissos assumidos com os participantes</li>
                <li>Atualizar informações do evento em caso de alterações</li>
                <li>Respeitar a privacidade dos participantes</li>
              </ul>
              <p className="leading-relaxed mt-4">
                A Cresce.AO reserva-se o direito de remover eventos que violem estes termos ou que sejam considerados
                inapropriados.
              </p>
            </section>

            {/* Propriedade Intelectual */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Propriedade Intelectual</h2>
              <p className="leading-relaxed">
                Todo o conteúdo da plataforma Cresce.AO, incluindo design, logotipo, texto, gráficos e software, é propriedade
                da Cresce.AO ou dos seus licenciadores e está protegido por leis de propriedade intelectual. Você não pode
                copiar, modificar, distribuir ou reproduzir qualquer conteúdo sem autorização expressa.
              </p>
            </section>

            {/* Isenção de Responsabilidade */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Isenção de Responsabilidade</h2>
              <p className="leading-relaxed mb-4">
                A plataforma é fornecida "como está" e "conforme disponível". A Cresce.AO não garante que:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>A plataforma estará sempre disponível ou livre de erros</li>
                <li>As informações dos eventos são precisas ou completas</li>
                <li>Os eventos anunciados serão realizados conforme descrito</li>
              </ul>
              <p className="leading-relaxed mt-4">
                A Cresce.AO atua apenas como intermediária, conectando utilizadores a organizadores de eventos. Não somos
                responsáveis pela qualidade, cancelamento ou qualquer aspecto dos eventos publicados por terceiros.
              </p>
            </section>

            {/* Limitação de Responsabilidade */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Limitação de Responsabilidade</h2>
              <p className="leading-relaxed">
                Na máxima extensão permitida por lei, a Cresce.AO não será responsável por quaisquer danos diretos, indiretos,
                incidentais, especiais ou consequenciais resultantes do uso ou incapacidade de usar a plataforma.
              </p>
            </section>

            {/* Suspensão e Rescisão */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. Suspensão e Rescisão</h2>
              <p className="leading-relaxed">
                Reservamo-nos o direito de suspender ou encerrar a sua conta e acesso à plataforma a qualquer momento,
                sem aviso prévio, se violar estes Termos de Uso ou por qualquer outro motivo que consideremos apropriado.
              </p>
            </section>

            {/* Modificações */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. Modificações dos Termos</h2>
              <p className="leading-relaxed">
                Podemos modificar estes Termos de Uso a qualquer momento. As alterações entrarão em vigor assim que publicadas
                na plataforma. A continuação do uso da plataforma após alterações constitui aceitação dos novos termos.
              </p>
            </section>

            {/* Lei Aplicável */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">11. Lei Aplicável</h2>
              <p className="leading-relaxed">
                Estes Termos de Uso são regidos pelas leis da República de Angola. Quaisquer disputas serão resolvidas nos
                tribunais competentes de Angola.
              </p>
            </section>

            {/* Contacto */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">12. Contacto</h2>
              <p className="leading-relaxed">
                Para questões sobre estes Termos de Uso, entre em contacto:
              </p>
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <p className="font-medium">Email: legal@cresce.ao</p>
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
