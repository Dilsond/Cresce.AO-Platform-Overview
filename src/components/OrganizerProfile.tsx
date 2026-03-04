import { useState } from 'react';
import { ArrowLeft, Calendar, MapPin, CheckCircle2, Users, Mail, Phone, Globe, Briefcase, Star, Award, UserCircle } from 'lucide-react';
import type { User, Event } from '../App';

interface OrganizerProfileProps {
  user: User;
  events: Event[];
  onBack: () => void;
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-9 h-9 rounded-xl bg-orange-50 flex items-center justify-center flex-shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-400 font-medium">{label}</p>
        <p className="text-sm text-gray-800 font-semibold truncate">{value}</p>
      </div>
    </div>
  );
}

function StatRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center flex-shrink-0">
          {icon}
        </div>
        <span className="text-sm text-gray-600">{label}</span>
      </div>
      <span className="text-sm font-bold text-gray-900">{value}</span>
    </div>
  );
}

export function OrganizerProfile({ user, events, onBack }: OrganizerProfileProps) {
  const activeEvents = events.filter(e => e.status === 'A decorrer');
  const totalLikes = events.reduce((sum, event) => sum + (event.likes || 0), 0);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'profile'>('dashboard');

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-orange-50/20 to-gray-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md shadow-sm border-b border-gray-200/50 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-gray-600 hover:text-orange-600 transition-all group"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            <span className="font-medium">Voltar aos Eventos</span>
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

        <div className="flex gap-1 bg-white rounded-2xl px-4 shadow-sm border border-gray-100 overflow-x-auto">
          {[
            { key: 'dashboard', label: 'Perfil do Organizador', icon: <UserCircle className="w-4 h-4" /> },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex items-center gap-2 px-5 py-4 text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${activeTab === tab.key
                ? 'border-orange-600 text-orange-600'
                : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300'
                }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Profile Card */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="h-36 bg-gradient-to-br from-orange-500 via-orange-400 to-red-500 relative">
            <div className="absolute inset-0 opacity-20"
              style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)', backgroundSize: '40px 40px' }}
            />
          </div>
          <div className="px-8 pb-8">
            <div className="-mt-12 flex items-end justify-between mb-6">
              <div className="w-24 h-24 bg-white rounded-2xl border-4 border-white shadow-xl flex items-center justify-center text-orange-600 text-4xl font-bold">
                {(user.company || user.name).charAt(0).toUpperCase()}
              </div>
              <span className="px-3 py-1.5 bg-green-100 text-green-700 text-xs font-semibold rounded-full flex items-center gap-1.5 mb-2">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                Verificado
              </span>
            </div>
            <h2 className="text-2xl font-bold text-gray-900">{user.company || user.name}</h2>
            <p className="text-gray-500 mt-1">Organizador de Eventos · Luanda, Angola</p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Contact Info */}
          <div className="bg-white rounded-2xl shadow-lg p-6 space-y-4">
            <h3 className="font-bold text-gray-900 text-lg border-b border-gray-100 pb-3">Informações de Contacto</h3>
            <InfoRow icon={<Mail className="w-5 h-5 text-orange-500" />} label="Email" value={user.email} />
            <InfoRow icon={<Phone className="w-5 h-5 text-orange-500" />} label="Telefone" value="+244 923 000 000" />
            <InfoRow icon={<Globe className="w-5 h-5 text-orange-500" />} label="Website" value="www.cresceao.ao" />
            <InfoRow icon={<MapPin className="w-5 h-5 text-orange-500" />} label="Localização" value="Luanda, Angola" />
            <InfoRow icon={<Briefcase className="w-5 h-5 text-orange-500" />} label="Empresa" value={user.company || user.name} />
          </div>

          {/* Stats */}
          <div className="bg-white rounded-2xl shadow-lg p-6 space-y-3">
            <h3 className="font-bold text-gray-900 text-lg border-b border-gray-100 pb-3">Estatísticas da Conta</h3>
            <StatRow icon={<Calendar className="w-4 h-4 text-blue-500" />} label="Total de Eventos" value={String(events.length)} />
            <StatRow icon={<CheckCircle2 className="w-4 h-4 text-green-500" />} label="Eventos Activos" value={String(activeEvents.length)} />
            <StatRow icon={<Users className="w-4 h-4 text-purple-500" />} label="Total de Interessados" value={String(totalLikes)} />
            <StatRow icon={<Star className="w-4 h-4 text-amber-500" />} label="Avaliação Média" value="4.8 ★" />
            <StatRow icon={<Award className="w-4 h-4 text-orange-500" />} label="Membro desde" value="Janeiro 2025" />
          </div>
        </div>

        {/* About */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h3 className="font-bold text-gray-900 text-lg border-b border-gray-100 pb-3 mb-4">Sobre a Organização</h3>
          <p className="text-gray-600 leading-relaxed">
            Organização dedicada à promoção de eventos de capacitação, networking e desenvolvimento profissional em Angola.
            Comprometidos em criar experiências transformadoras que impulsionam o crescimento pessoal e empresarial dos participantes.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {['Empreendedorismo', 'Tecnologia', 'Liderança', 'Inovação', 'Networking'].map(tag => (
              <span key={tag} className="px-3 py-1 bg-orange-50 text-orange-700 border border-orange-200 rounded-full text-sm font-medium">
                {tag}
              </span>
            ))}
          </div>
        </div>

      </main>
    </div>
  );
}
