import { useState } from 'react';
import { ArrowLeft, Plus, Calendar, MapPin, Edit2, X, FileText, Upload, CheckCircle2, TrendingUp, Users, BarChart3, Building2, LayoutDashboard, UserCircle, Mail, Phone, Globe, Briefcase, Star, Award } from 'lucide-react';
import type { User, Event } from '../App';
import { motion, AnimatePresence } from 'motion/react';

interface OrganizerDashboardProps {
  user: User;
  events: Event[];
  onAddEvent: (event: Omit<Event, 'id' | 'organizerId' | 'organizerName' | 'likes'>) => void;
  onUpdateEvent: (eventId: string, updates: Partial<Event>) => void;
  onBack: () => void;
  shouldOpenCreateForm?: boolean;
  onCloseCreateForm?: () => void;
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

export function OrganizerDashboard({ user, events, onAddEvent, onUpdateEvent, onBack, shouldOpenCreateForm = false, onCloseCreateForm }: OrganizerDashboardProps) {
  const [showAddForm, setShowAddForm] = useState(shouldOpenCreateForm);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'profile'>('dashboard');
  const [eventLicenseFile, setEventLicenseFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    date: '',
    time: '',
    location: '',
    eventType: 'presencial' as 'presencial' | 'online' | 'híbrido',
    description: '',
    category: 'Palestras' as 'Palestras' | 'Workshops' | 'Feiras' | 'Masterclasses',
    image: '',
    video: '',
    status: 'A decorrer' as 'A decorrer' | 'Cancelada'
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type === 'application/pdf') {
        setEventLicenseFile(file);
      } else {
        alert('Por favor, selecione apenas ficheiros PDF.');
        e.target.value = '';
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAddEvent({ ...formData, eventLicense: eventLicenseFile?.name });
    setFormData({
      name: '', date: '', time: '', location: '',
      eventType: 'presencial', description: '', category: 'Palestras',
      image: '', video: '', status: 'A decorrer'
    });
    setEventLicenseFile(null);
    setShowAddForm(false);
    if (onCloseCreateForm) onCloseCreateForm();
  };

  const handleStatusToggle = (eventId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'A decorrer' ? 'Cancelada' : 'A decorrer';
    onUpdateEvent(eventId, { status: newStatus });
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('pt-PT', { day: 'numeric', month: 'long', year: 'numeric' });

  const activeEvents = events.filter(e => e.status === 'A decorrer');
  const cancelledEvents = events.filter(e => e.status === 'Cancelada');
  const totalLikes = events.reduce((sum, event) => sum + (event.likes || 0), 0);

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

        {/* Tabs */}
        <div className="flex gap-1 bg-white rounded-2xl px-4 shadow-sm border border-gray-100 overflow-x-auto">
          {[
            { key: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
            { key: 'profile',   label: 'Perfil do Organizador', icon: <UserCircle className="w-4 h-4" /> },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex items-center gap-2 px-5 py-4 text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${
                activeTab === tab.key
                  ? 'border-orange-600 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">

          {/* ── DASHBOARD TAB ── */}
          {activeTab === 'dashboard' && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="space-y-8"
            >
              {/* Hero */}
              <div className="relative overflow-hidden bg-gradient-to-br from-orange-600 via-orange-500 to-red-600 rounded-3xl shadow-2xl p-8 text-white">
                <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-black/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
                <div className="relative z-10 flex items-center justify-between">
                  <div>
                    <p className="text-orange-100 text-sm font-medium mb-2 uppercase tracking-wider">Painel do Organizador</p>
                    <h1 className="text-4xl md:text-5xl font-bold mb-3">Dashboard</h1>
                    <p className="text-xl text-orange-50 flex items-center gap-2">
                      <Building2 className="w-5 h-5" />
                      {user.company || user.name}
                    </p>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowAddForm(!showAddForm)}
                    className="flex items-center gap-2 px-6 py-3.5 bg-white text-orange-600 rounded-xl hover:bg-orange-50 transition-all shadow-lg font-semibold"
                  >
                    {showAddForm ? <X className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                    {showAddForm ? 'Cancelar' : 'Criar Evento'}
                  </motion.button>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { gradient: 'from-blue-500 to-blue-600', icon: <BarChart3 className="w-6 h-6" />, badge: <TrendingUp className="w-5 h-5 text-blue-200" />, value: events.length, label: 'Total de Eventos', labelColor: 'text-blue-100' },
                  { gradient: 'from-green-500 to-emerald-600', icon: <CheckCircle2 className="w-6 h-6" />, badge: <span className="px-2 py-1 bg-white/20 rounded-full text-xs font-semibold backdrop-blur-sm">Ativos</span>, value: activeEvents.length, label: 'Eventos Activos', labelColor: 'text-green-100' },
                  { gradient: 'from-purple-500 to-purple-600', icon: <Users className="w-6 h-6" />, badge: <TrendingUp className="w-5 h-5 text-purple-200" />, value: totalLikes, label: 'Total de Interessados', labelColor: 'text-purple-100' },
                  { gradient: 'from-rose-500 to-red-600', icon: <X className="w-6 h-6" />, badge: <span className="px-2 py-1 bg-white/20 rounded-full text-xs font-semibold backdrop-blur-sm">Inativos</span>, value: cancelledEvents.length, label: 'Eventos Cancelados', labelColor: 'text-rose-100' },
                ].map((stat, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 + i * 0.1 }}
                    className={`group relative overflow-hidden bg-gradient-to-br ${stat.gradient} rounded-2xl shadow-lg p-6 text-white hover:shadow-2xl transition-all`}
                  >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl translate-x-1/2 -translate-y-1/2" />
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                          {stat.icon}
                        </div>
                        {stat.badge}
                      </div>
                      <p className="text-5xl font-bold mb-2">{stat.value}</p>
                      <p className={`${stat.labelColor} font-medium`}>{stat.label}</p>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Create Event Form */}
              {showAddForm && (
                <div className="bg-white rounded-2xl shadow-lg p-8">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">Criar Novo Evento</h2>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Nome do Evento *</label>
                        <input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                          placeholder="Workshop de Empreendedorismo" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Categoria *</label>
                        <select value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value as any })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none">
                          <option value="Palestras">Palestras</option>
                          <option value="Workshops">Workshops</option>
                          <option value="Feiras">Feiras</option>
                          <option value="Masterclasses">Masterclasses</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Data *</label>
                        <input type="date" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} required
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Hora *</label>
                        <input type="time" value={formData.time} onChange={e => setFormData({ ...formData, time: e.target.value })} required
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Evento *</label>
                        <select value={formData.eventType} onChange={e => setFormData({ ...formData, eventType: e.target.value as any })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none">
                          <option value="presencial">Presencial</option>
                          <option value="online">Online</option>
                          <option value="híbrido">Híbrido</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Local ou Link *</label>
                        <input type="text" value={formData.location} onChange={e => setFormData({ ...formData, location: e.target.value })} required
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                          placeholder="Endereço ou URL" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Descrição *</label>
                      <textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} required rows={4}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                        placeholder="Descreva o evento..." />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">URL da Imagem de Capa *</label>
                      <input type="url" value={formData.image} onChange={e => setFormData({ ...formData, image: e.target.value })} required
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                        placeholder="https://exemplo.com/imagem.jpg" />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">URL do Vídeo Publicitário (opcional)</label>
                      <input type="url" value={formData.video} onChange={e => setFormData({ ...formData, video: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                        placeholder="https://youtube.com/..." />
                    </div>

                    {/* License Upload */}
                    <div className="border-t border-gray-200 pt-6">
                      <div className="mb-4 p-4 bg-orange-50 rounded-lg border border-orange-200">
                        <div className="flex items-start gap-3">
                          <FileText className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-sm font-semibold text-gray-900 mb-1">Licença para Realização de Evento</p>
                            <p className="text-xs text-gray-700">
                              Faça upload da licença oficial emitida pelas autoridades competentes para a realização do evento. Apenas ficheiros PDF são aceites.
                            </p>
                          </div>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-3">Licença do Evento (PDF) *</label>
                        <div className="relative">
                          <input type="file" id="license-upload" onChange={handleFileChange} required accept=".pdf,application/pdf" className="hidden" />
                          <label htmlFor="license-upload"
                            className={`flex items-center justify-center gap-3 w-full px-4 py-6 border-2 border-dashed rounded-lg cursor-pointer transition-all ${
                              eventLicenseFile ? 'border-green-400 bg-green-50' : 'border-gray-300 bg-gray-50 hover:border-orange-400 hover:bg-orange-50'
                            }`}
                          >
                            {eventLicenseFile ? (
                              <>
                                <CheckCircle2 className="w-6 h-6 text-green-600" />
                                <div className="text-center">
                                  <p className="text-sm font-medium text-gray-900">{eventLicenseFile.name}</p>
                                  <p className="text-xs text-gray-600 mt-1">{(eventLicenseFile.size / 1024).toFixed(2)} KB • Clique para alterar</p>
                                </div>
                              </>
                            ) : (
                              <>
                                <Upload className="w-6 h-6 text-gray-400" />
                                <div className="text-center">
                                  <p className="text-sm font-medium text-gray-900">Clique para fazer upload</p>
                                  <p className="text-xs text-gray-600 mt-1">PDF até 10MB</p>
                                </div>
                              </>
                            )}
                          </label>
                        </div>
                      </div>
                    </div>

                    <button type="submit"
                      className="w-full bg-orange-600 text-white py-3 rounded-lg font-semibold hover:bg-orange-700 transition-colors">
                      Criar Evento
                    </button>
                  </form>
                </div>
              )}

              {/* Events List */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="bg-white rounded-2xl shadow-lg p-8"
              >
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h2 className="text-3xl font-bold text-gray-900">Meus Eventos</h2>
                    <p className="text-gray-600 mt-1">Gerencie todos os seus eventos publicados</p>
                  </div>
                  {events.length > 0 && (
                    <div className="px-4 py-2 bg-gradient-to-r from-orange-100 to-red-100 rounded-lg border border-orange-200">
                      <p className="text-sm font-semibold text-orange-700">
                        {events.length} {events.length === 1 ? 'Evento' : 'Eventos'}
                      </p>
                    </div>
                  )}
                </div>

                {events.length === 0 ? (
                  <div className="text-center py-16 px-6">
                    <div className="w-24 h-24 bg-gradient-to-br from-orange-100 to-orange-200 rounded-full flex items-center justify-center mx-auto mb-6">
                      <Calendar className="w-12 h-12 text-orange-600" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-3">Nenhum evento criado</h3>
                    <p className="text-gray-600 mb-6 max-w-md mx-auto">
                      Comece a criar eventos incríveis para alcançar seu público. É rápido e fácil!
                    </p>
                    <button
                      onClick={() => setShowAddForm(true)}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-orange-600 text-white rounded-xl hover:bg-orange-700 transition-all shadow-lg font-semibold"
                    >
                      <Plus className="w-5 h-5" />
                      Criar Primeiro Evento
                    </button>
                  </div>
                ) : (
                  <div className="grid gap-6">
                    {events.map((event, index) => (
                      <motion.div
                        key={event.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className={`group relative overflow-hidden rounded-2xl border-2 transition-all hover:shadow-xl ${
                          event.status === 'Cancelada'
                            ? 'bg-gray-50 border-gray-200'
                            : 'bg-gradient-to-br from-white to-orange-50/30 border-orange-200/50 hover:border-orange-300'
                        }`}
                      >
                        <div className={`absolute top-0 left-0 right-0 h-1.5 ${
                          event.status === 'Cancelada'
                            ? 'bg-gradient-to-r from-gray-400 to-gray-500'
                            : 'bg-gradient-to-r from-orange-500 via-red-500 to-orange-600'
                        }`} />

                        <div className="p-6">
                          <div className="grid md:grid-cols-[200px_1fr_auto] gap-6 items-start">
                            {/* Thumbnail */}
                            <div className="relative overflow-hidden rounded-xl aspect-video bg-gray-200 group-hover:scale-105 transition-transform shadow-md">
                              <img src={event.image} alt={event.name} className="w-full h-full object-cover" />
                              {event.status === 'Cancelada' && (
                                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                  <span className="px-3 py-1.5 bg-red-600 text-white text-xs font-bold rounded-full">CANCELADO</span>
                                </div>
                              )}
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start gap-3 mb-3 flex-wrap">
                                <h3 className="text-2xl font-bold text-gray-900 flex-1 min-w-0">{event.name}</h3>
                              </div>
                              <div className="flex items-center gap-2 mb-4 flex-wrap">
                                <span className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                                  event.status === 'A decorrer'
                                    ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-md'
                                    : 'bg-gray-200 text-gray-700'
                                }`}>
                                  {event.status}
                                </span>
                                <span className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold capitalize">
                                  {event.eventType}
                                </span>
                                <span className="px-3 py-1.5 bg-orange-100 text-orange-700 rounded-lg text-xs font-semibold">
                                  {event.category}
                                </span>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="flex items-center gap-2 text-gray-600">
                                  <div className="w-7 h-7 bg-orange-50 rounded-lg flex items-center justify-center flex-shrink-0">
                                    <Calendar className="w-4 h-4 text-orange-600" />
                                  </div>
                                  <span className="text-sm font-medium">{formatDate(event.date)} às {event.time}</span>
                                </div>
                                <div className="flex items-center gap-2 text-gray-600">
                                  <div className="w-7 h-7 bg-orange-50 rounded-lg flex items-center justify-center flex-shrink-0">
                                    <MapPin className="w-4 h-4 text-orange-600" />
                                  </div>
                                  <span className="text-sm font-medium truncate">{event.location}</span>
                                </div>
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="flex flex-col gap-3 min-w-[140px]">
                              <div className="text-center p-3 bg-gradient-to-br from-orange-50 to-red-50 rounded-xl border border-orange-100">
                                <p className="text-2xl font-bold text-orange-600">{event.likes}</p>
                                <p className="text-xs text-gray-500 font-medium">Interessados</p>
                              </div>
                              <button
                                onClick={() => handleStatusToggle(event.id, event.status)}
                                className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                                  event.status === 'A decorrer'
                                    ? 'bg-red-50 text-red-600 border-2 border-red-200 hover:bg-red-100 hover:border-red-300'
                                    : 'bg-green-50 text-green-600 border-2 border-green-200 hover:bg-green-100 hover:border-green-300'
                                }`}
                              >
                                <Edit2 className="w-4 h-4" />
                                {event.status === 'A decorrer' ? 'Cancelar' : 'Reativar'}
                              </button>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>
            </motion.div>
          )}

          {/* ── PROFILE TAB ── */}
          {activeTab === 'profile' && (
            <motion.div
              key="profile"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="space-y-6"
            >
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
                  <InfoRow icon={<Mail className="w-5 h-5 text-orange-500" />}      label="Email"       value={user.email} />
                  <InfoRow icon={<Phone className="w-5 h-5 text-orange-500" />}     label="Telefone"    value="+244 923 000 000" />
                  <InfoRow icon={<Globe className="w-5 h-5 text-orange-500" />}     label="Website"     value="www.cresceao.ao" />
                  <InfoRow icon={<MapPin className="w-5 h-5 text-orange-500" />}    label="Localização" value="Luanda, Angola" />
                  <InfoRow icon={<Briefcase className="w-5 h-5 text-orange-500" />} label="Empresa"     value={user.company || user.name} />
                </div>

                {/* Stats */}
                <div className="bg-white rounded-2xl shadow-lg p-6 space-y-3">
                  <h3 className="font-bold text-gray-900 text-lg border-b border-gray-100 pb-3">Estatísticas da Conta</h3>
                  <StatRow icon={<Calendar className="w-4 h-4 text-blue-500" />}       label="Total de Eventos"      value={String(events.length)} />
                  <StatRow icon={<CheckCircle2 className="w-4 h-4 text-green-500" />}   label="Eventos Activos"       value={String(activeEvents.length)} />
                  <StatRow icon={<Users className="w-4 h-4 text-purple-500" />}         label="Total de Interessados" value={String(totalLikes)} />
                  <StatRow icon={<Star className="w-4 h-4 text-amber-500" />}           label="Avaliação Média"       value="4.8 ★" />
                  <StatRow icon={<Award className="w-4 h-4 text-orange-500" />}         label="Membro desde"          value="Janeiro 2025" />
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
            </motion.div>
          )}

        </AnimatePresence>
      </main>
    </div>
  );
}
