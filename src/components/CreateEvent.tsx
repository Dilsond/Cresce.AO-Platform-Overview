import { useState } from 'react';
import { ArrowLeft, FileText, Upload, CheckCircle2, LayoutDashboard } from 'lucide-react';
import type { User, Event } from '../App';
import { motion, AnimatePresence } from 'motion/react';

interface CreateEventProps {
    user: User;
    onAddEvent: (event: Omit<Event, 'id' | 'organizerId' | 'organizerName' | 'likes'>) => void;
    onBack: () => void;
    shouldOpenCreateForm?: boolean;
    onCloseCreateForm?: () => void;
}

export function CreateEvent({ onAddEvent, onBack, shouldOpenCreateForm = false, onCloseCreateForm }: CreateEventProps) {
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
                        { key: 'dashboard', label: 'Criar Eventos', icon: <LayoutDashboard className="w-4 h-4" /> },
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

                <AnimatePresence mode="wait">
                    <div className="bg-white rounded-2xl shadow-lg p-8">
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
                                            className={`flex items-center justify-center gap-3 w-full px-4 py-6 border-2 border-dashed rounded-lg cursor-pointer transition-all ${eventLicenseFile ? 'border-green-400 bg-green-50' : 'border-gray-300 bg-gray-50 hover:border-orange-400 hover:bg-orange-50'
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
                </AnimatePresence>
            </main>
        </div>
    );
}
