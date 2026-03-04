import { useState } from 'react';
import { ArrowLeft, FileText, Upload, CheckCircle2, LayoutDashboard, Image as ImageIcon, Video, X, RefreshCw } from 'lucide-react';
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
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [nif, setNif] = useState('');
    const [formData, setFormData] = useState({
        name: '',
        date: '',
        time: '',
        location: '',
        price: '',
        eventType: 'presencial' as 'presencial' | 'online' | 'híbrido',
        description: '',
        category: 'Palestras' as 'Palestras' | 'Workshops' | 'Feiras' | 'Masterclasses',
        image: null as File | null,
        video: null as File | null,
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

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setFormData({ ...formData, image: file });
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setFormData({ ...formData, video: file });
            const reader = new FileReader();
            reader.onloadend = () => {
                setVideoPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const clearImage = () => {
        setFormData({ ...formData, image: null });
        setImagePreview(null);
        // Reset do input file
        const input = document.getElementById('image-upload') as HTMLInputElement;
        if (input) input.value = '';
    };

    const clearVideo = () => {
        setFormData({ ...formData, video: null });
        setVideoPreview(null);
        // Reset do input file
        const input = document.getElementById('video-upload') as HTMLInputElement;
        if (input) input.value = '';
    };

    const clearLicense = () => {
        setEventLicenseFile(null);
        // Reset do input file
        const input = document.getElementById('license-upload') as HTMLInputElement;
        if (input) input.value = '';
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onAddEvent({ ...formData, eventLicense: eventLicenseFile?.name });
        setFormData({
            name: '', date: '', time: '', location: '', price: '',
            eventType: 'presencial', description: '', category: 'Palestras',
            image: null, video: null, status: 'A decorrer'
        });
        setEventLicenseFile(null);
        setImagePreview(null);
        setVideoPreview(null);
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
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Nome do Evento</label>
                                    <input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                                        placeholder="Workshop de Empreendedorismo" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Categoria</label>
                                    <select value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value as any })}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none">
                                        <option value="Palestras">Palestras</option>
                                        <option value="Workshops">Workshops</option>
                                        <option value="Feiras">Feiras</option>
                                        <option value="Masterclasses">Masterclasses</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Data</label>
                                    <input type="date" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} required
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Hora</label>
                                    <input type="time" value={formData.time} onChange={e => setFormData({ ...formData, time: e.target.value })} required
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Evento</label>
                                    <select value={formData.eventType} onChange={e => setFormData({ ...formData, eventType: e.target.value as any })}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none">
                                        <option value="presencial">Presencial</option>
                                        <option value="online">Online</option>
                                        <option value="híbrido">Híbrido</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Local ou Link</label>
                                    <input type="text" value={formData.location} onChange={e => setFormData({ ...formData, location: e.target.value })} required
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                                        placeholder="Endereço ou URL" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Preço (Kz)</label>
                                    <input type="number" value={formData.price} onChange={(e) => setFormData({ ...formData, price: e.target.value })} required
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none disabled:bg-gray-100"
                                        placeholder="Deixe em branco se for gratuito"
                                        min="0"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Nº de Contacto (WhatsApp)</label>
                                    <input type="text" value={formData.price} onChange={(e) => setFormData({ ...formData, price: e.target.value })} required
                                        onChange={(e) => {
                                            // Remove tudo que não for número
                                            const onlyNumbers = e.target.value.replace(/\D/g, '');
                                            setNif(onlyNumbers);
                                        }}
                                        pattern="[0-9]{9,10}"
                                        maxLength={10}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none disabled:bg-gray-100"
                                        placeholder="Digite o Contacto"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Descrição</label>
                                <textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} required rows={4}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                                    placeholder="Descreva o evento..." />
                            </div>

                            {/* Imagem de Capa com Preview e opção de trocar */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Imagem de Capa</label>
                                <div className="relative">
                                    <input
                                        type="file"
                                        id="image-upload"
                                        accept="image/*"
                                        onChange={handleImageChange}
                                        required={!imagePreview}
                                        className="hidden"
                                    />
                                    {!imagePreview ? (
                                        <label
                                            htmlFor="image-upload"
                                            className="flex items-center justify-center gap-3 w-full px-4 py-6 border-2 border-dashed border-gray-300 bg-gray-50 rounded-lg cursor-pointer hover:border-orange-400 hover:bg-orange-50 transition-all"
                                        >
                                            <ImageIcon className="w-6 h-6 text-gray-400" />
                                            <div className="text-center">
                                                <p className="text-sm font-medium text-gray-900">Clique para fazer upload</p>
                                                <p className="text-xs text-gray-600 mt-1">JPG, PNG, GIF até 5MB</p>
                                            </div>
                                        </label>
                                    ) : (
                                        <div className="relative rounded-lg overflow-hidden border border-gray-200">
                                            <img
                                                src={imagePreview}
                                                alt="Preview"
                                                className="w-full h-48 object-cover"
                                            />
                                            <div className="absolute top-2 right-2 flex gap-2">
                                                <label
                                                    htmlFor="image-upload"
                                                    className="p-1.5 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors cursor-pointer"
                                                    title="Trocar imagem"
                                                >
                                                    <RefreshCw className="w-4 h-4" />
                                                </label>
                                                <button
                                                    type="button"
                                                    onClick={clearImage}
                                                    className="p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                                                    title="Remover imagem"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Vídeo com Preview e opção de trocar */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Vídeo</label>
                                <div className="relative">
                                    <input
                                        type="file"
                                        id="video-upload"
                                        accept="video/*"
                                        onChange={handleVideoChange}
                                        className="hidden"
                                    />
                                    {!videoPreview ? (
                                        <label
                                            htmlFor="video-upload"
                                            className="flex items-center justify-center gap-3 w-full px-4 py-6 border-2 border-dashed border-gray-300 bg-gray-50 rounded-lg cursor-pointer hover:border-orange-400 hover:bg-orange-50 transition-all"
                                        >
                                            <Video className="w-6 h-6 text-gray-400" />
                                            <div className="text-center">
                                                <p className="text-sm font-medium text-gray-900">Clique para fazer upload</p>
                                                <p className="text-xs text-gray-600 mt-1">MP4, WebM, OGG até 10MB</p>
                                            </div>
                                        </label>
                                    ) : (
                                        <div className="relative rounded-lg overflow-hidden border border-gray-200">
                                            <video
                                                src={videoPreview}
                                                controls
                                                className="w-full h-48 object-contain bg-black"
                                            />
                                            <div className="absolute top-2 right-2 flex gap-2">
                                                <label
                                                    htmlFor="video-upload"
                                                    className="p-1.5 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors cursor-pointer"
                                                    title="Trocar vídeo"
                                                >
                                                    <RefreshCw className="w-4 h-4" />
                                                </label>
                                                <button
                                                    type="button"
                                                    onClick={clearVideo}
                                                    className="p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                                                    title="Remover vídeo"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* License Upload com opção de trocar */}
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
                                    <label className="block text-sm font-medium text-gray-700 mb-3">Licença do Evento (PDF)</label>
                                    <div className="relative">
                                        <input type="file" id="license-upload" onChange={handleFileChange} required accept=".pdf,application/pdf" className="hidden" />
                                        {!eventLicenseFile ? (
                                            <label htmlFor="license-upload"
                                                className="flex items-center justify-center gap-3 w-full px-4 py-6 border-2 border-dashed border-gray-300 bg-gray-50 rounded-lg cursor-pointer hover:border-orange-400 hover:bg-orange-50 transition-all"
                                            >
                                                <Upload className="w-6 h-6 text-gray-400" />
                                                <div className="text-center">
                                                    <p className="text-sm font-medium text-gray-900">Clique para fazer upload</p>
                                                    <p className="text-xs text-gray-600 mt-1">PDF até 10MB</p>
                                                </div>
                                            </label>
                                        ) : (
                                            <div className="relative flex items-center justify-between w-full px-4 py-4 border-2 border-green-400 bg-green-50 rounded-lg">
                                                <div className="flex items-center gap-3">
                                                    <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0" />
                                                    <div>
                                                        <p className="text-sm font-medium text-gray-900">{eventLicenseFile.name}</p>
                                                        <p className="text-xs text-gray-600 mt-1">{(eventLicenseFile.size / 1024).toFixed(2)} KB</p>
                                                    </div>
                                                </div>
                                                <div className="flex gap-2">
                                                    <label
                                                        htmlFor="license-upload"
                                                        className="p-1.5 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors cursor-pointer"
                                                        title="Trocar ficheiro"
                                                    >
                                                        <RefreshCw className="w-4 h-4" />
                                                    </label>
                                                    <button
                                                        type="button"
                                                        onClick={clearLicense}
                                                        className="p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                                                        title="Remover ficheiro"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        )}
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