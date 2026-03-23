import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload, X, Image, Video, FileText, Loader2, Heart } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../lib/supabase';
import logo from "../assets/logo.png";

interface User {
    id: string;
    name: string;
    type: 'user' | 'organizer';
    company?: string;
}

export function CreateEvent() {
    const navigate = useNavigate();
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Form state
    const [formData, setFormData] = useState({
        nome_evento: '',
        categoria: 'palestra' as 'palestra' | 'workshop' | 'feiras' | 'masterclasse',
        data_evento: '',
        hora_evento: '',
        tipo_evento: 'presencial' as 'presencial' | 'online' | 'hibrido',
        local: '',
        descricao: '',
        valor: '',
        contacto_whatsapp: '',
    });

    // File states
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [videoFile, setVideoFile] = useState<File | null>(null);
    const [pdfFile, setPdfFile] = useState<File | null>(null);

    // Verificar usuário logado
    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            try {
                const parsedUser = JSON.parse(storedUser);
                console.log('Usuário carregado:', parsedUser);

                // Verificar se é organizador
                if (parsedUser.type !== 'organizer') {
                    setError('Apenas organizadores podem criar eventos');
                    setTimeout(() => navigate('/events'), 3000);
                    return;
                }

                setUser(parsedUser);
            } catch (err) {
                console.error('Erro ao parsear usuário:', err);
                setError('Erro ao carregar dados do usuário');
                navigate('/login');
            }
        } else {
            console.log('Usuário não encontrado, redirecionando para login');
            navigate('/login');
        }
    }, [navigate]);

    const categories = [
        { value: 'palestra', label: 'Palestra' },
        { value: 'workshop', label: 'Workshop' },
        { value: 'feiras', label: 'Feira' },
        { value: 'masterclasse', label: 'Masterclasse' }
    ];

    const eventTypes = [
        { value: 'presencial', label: 'Presencial' },
        { value: 'online', label: 'Online' },
        { value: 'hibrido', label: 'Híbrido' }
    ];

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (!file.type.startsWith('image/')) {
                setError('Por favor, selecione uma imagem válida');
                return;
            }

            if (file.size > 5 * 1024 * 1024) {
                setError('A imagem deve ter no máximo 5MB');
                return;
            }

            setImageFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
            setError(null);
        }
    };

    const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (!file.type.startsWith('video/')) {
                setError('Por favor, selecione um vídeo válido');
                return;
            }

            if (file.size > 50 * 1024 * 1024) {
                setError('O vídeo deve ter no máximo 50MB');
                return;
            }

            setVideoFile(file);
            setError(null);
        }
    };

    const handlePdfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.type !== 'application/pdf') {
                setError('Por favor, selecione um arquivo PDF válido');
                return;
            }

            if (file.size > 10 * 1024 * 1024) {
                setError('O PDF deve ter no máximo 10MB');
                return;
            }

            setPdfFile(file);
            setError(null);
        }
    };

    const removeImage = () => {
        setImageFile(null);
        setImagePreview(null);
    };

    const removeVideo = () => {
        setVideoFile(null);
    };

    const removePdf = () => {
        setPdfFile(null);
    };

    const uploadFile = async (file: File, bucket: string): Promise<string | null> => {
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
            const filePath = fileName;

            console.log(`📤 Fazendo upload para ${bucket}:`, fileName);

            const { error: uploadError } = await supabase.storage
                .from(bucket)
                .upload(filePath, file, {
                    cacheControl: '3600',
                    upsert: false
                });

            if (uploadError) {
                console.error(`❌ Erro ao fazer upload para ${bucket}:`, uploadError);

                // Mensagem de erro mais amigável
                if (uploadError.message.includes('row-level security')) {
                    throw new Error(`Erro de permissão no bucket "${bucket}". Contacte o administrador.`);
                } else if (uploadError.message.includes('duplicate')) {
                    throw new Error('Arquivo já existe. Tente novamente.');
                }
                throw uploadError;
            }

            const { data: { publicUrl } } = supabase.storage
                .from(bucket)
                .getPublicUrl(filePath);

            console.log(`✅ Upload concluído:`, publicUrl);
            return publicUrl;
        } catch (err) {
            console.error('Erro no upload:', err);
            return null;
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!user) {
            setError('Usuário não autenticado');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            // Validações
            if (!formData.nome_evento) {
                throw new Error('O nome do evento é obrigatório');
            }

            if (!formData.data_evento) {
                throw new Error('A data do evento é obrigatória');
            }

            if (!formData.hora_evento) {
                throw new Error('A hora do evento é obrigatória');
            }

            if (!formData.local && formData.tipo_evento !== 'online') {
                throw new Error('O local do evento é obrigatório para eventos presenciais ou híbridos');
            }

            if (!imageFile) {
                throw new Error('A imagem do evento é obrigatória');
            }

            console.log('Iniciando criação do evento para organizador:', user.id);

            // Upload da imagem (obrigatório)
            console.log('Fazendo upload da imagem...');
            const imageUrl = await uploadFile(imageFile, 'event-images');
            if (!imageUrl) {
                throw new Error('Erro ao fazer upload da imagem');
            }
            console.log('Imagem enviada:', imageUrl);

            // Upload do vídeo (opcional)
            let videoUrl = null;
            if (videoFile) {
                console.log('Fazendo upload do vídeo...');
                videoUrl = await uploadFile(videoFile, 'event-videos');
                if (!videoUrl) {
                    throw new Error('Erro ao fazer upload do vídeo');
                }
                console.log('Vídeo enviado:', videoUrl);
            }

            // Upload do PDF (opcional)
            let pdfUrl = null;
            if (pdfFile) {
                console.log('Fazendo upload do PDF...');
                pdfUrl = await uploadFile(pdfFile, 'event-pdfs');
                if (!pdfUrl) {
                    throw new Error('Erro ao fazer upload do PDF');
                }
                console.log('PDF enviado:', pdfUrl);
            }

            console.log('Inserindo evento no banco de dados...');

            // Inserir evento no banco
            const { data: newEvent, error: insertError } = await supabase
                .from('eventos')
                .insert([
                    {
                        organizador_id: user.id,
                        nome_evento: formData.nome_evento,
                        categoria: formData.categoria,
                        data_evento: formData.data_evento,
                        hora_evento: formData.hora_evento,
                        tipo_evento: formData.tipo_evento,
                        local: formData.local || null,
                        descricao: formData.descricao || null,
                        valor: formData.valor ? parseFloat(formData.valor) : null,
                        contacto_whatsapp: formData.contacto_whatsapp || null,
                        imagem_url: imageUrl,
                        video_url: videoUrl,
                        arquivo_pdf_url: pdfUrl,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    }
                ])
                .select()
                .single();

            if (insertError) {
                console.error('Erro ao inserir evento:', insertError);
                throw new Error('Erro ao salvar evento no banco de dados: ' + insertError.message);
            }

            console.log('Evento criado com sucesso:', newEvent);

            // Redirecionar para a página do evento
            navigate(`/event/${newEvent.id}`);

        } catch (err: any) {
            console.error('Erro ao criar evento:', err);
            setError(err.message || 'Ocorreu um erro ao criar o evento');
        } finally {
            setIsLoading(false);
        }
    };

    // Loading enquanto verifica usuário
    if (!user) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-orange-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-600">Verificando autenticação...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white/80 backdrop-blur-md shadow-sm border-b border-gray-200/50 sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
                    <button
                        onClick={() => navigate(-1)}
                        className="flex items-center gap-2 text-gray-600 cursor-pointer hover:text-orange-600 transition-all group"
                    >
                        <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                        <span className="font-medium">Voltar</span>
                    </button>
                    <div
                        className="flex items-center"
                    >
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

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="relative overflow-hidden bg-gradient-to-br from-orange-600 via-orange-500 to-red-600 rounded-3xl shadow-2xl p-8 text-white"
                >
                    <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-black/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
                    <div className="relative z-10 flex items-center justify-between">
                        <div>
                            <p className="text-orange-100 text-sm font-medium mb-2 uppercase tracking-wider">Área de Eventos</p>
                            <h1 className="text-4xl md:text-5xl font-bold mb-2">Criação de Eventos</h1>
                        </div>
                    </div>
                </motion.div>

                <form onSubmit={handleSubmit} className="space-y-6 py-12">
                    {/* Mensagem de erro */}
                    {error && (
                        <div className="bg-red-50 border border-red-200 rounded-lg">
                            <p className="text-red-600 text-sm">{error}</p>
                        </div>
                    )}

                    {/* Informações Básicas */}
                    <div className="bg-white rounded-xl shadow-md p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Informações Básicas</h2>

                        <div className="space-y-4">
                            {/* Nome do Evento */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Nome do Evento *
                                </label>
                                <input
                                    type="text"
                                    name="nome_evento"
                                    value={formData.nome_evento}
                                    onChange={handleInputChange}
                                    required
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                                    placeholder="Ex: Workshop de Marketing Digital"
                                />
                            </div>

                            {/* Categoria */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Categoria *
                                </label>
                                <select
                                    name="categoria"
                                    value={formData.categoria}
                                    onChange={handleInputChange}
                                    required
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                                >
                                    {categories.map(cat => (
                                        <option key={cat.value} value={cat.value}>
                                            {cat.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Data e Hora */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Data *
                                    </label>
                                    <input
                                        type="date"
                                        name="data_evento"
                                        value={formData.data_evento}
                                        onChange={handleInputChange}
                                        required
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Hora *
                                    </label>
                                    <input
                                        type="time"
                                        name="hora_evento"
                                        value={formData.hora_evento}
                                        onChange={handleInputChange}
                                        required
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                                    />
                                </div>
                            </div>

                            {/* Tipo de Evento */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Tipo de Evento *
                                </label>
                                <select
                                    name="tipo_evento"
                                    value={formData.tipo_evento}
                                    onChange={handleInputChange}
                                    required
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                                >
                                    {eventTypes.map(type => (
                                        <option key={type.value} value={type.value}>
                                            {type.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Local (para eventos presenciais ou híbridos) */}
                            {(formData.tipo_evento === 'presencial' || formData.tipo_evento === 'hibrido') && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Local do Evento *
                                    </label>
                                    <input
                                        type="text"
                                        name="local"
                                        value={formData.local}
                                        onChange={handleInputChange}
                                        required
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                                        placeholder="Ex: Centro de Convenções de Luanda"
                                    />
                                </div>
                            )}

                            {/* Link para eventos online */}
                            {formData.tipo_evento === 'online' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Link do Evento
                                    </label>
                                    <input
                                        type="url"
                                        name="local"
                                        value={formData.local}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                                        placeholder="https://zoom.us/j/..."
                                    />
                                </div>
                            )}

                            {/* Valor */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Valor (Kz) - Deixe em branco se gratuito
                                </label>
                                <input
                                    type="number"
                                    name="valor"
                                    value={formData.valor}
                                    onChange={handleInputChange}
                                    min="0"
                                    step="100"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                                    placeholder="0"
                                />
                            </div>

                            {/* Contacto WhatsApp */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Contacto WhatsApp (com código do país)
                                </label>
                                <input
                                    type="text"
                                    name="contacto_whatsapp"
                                    value={formData.contacto_whatsapp}
                                    onChange={handleInputChange}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                                    placeholder="Ex: 244900000000"
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    Número para contato no WhatsApp (incluindo código do país)
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Descrição */}
                    <div className="bg-white rounded-xl shadow-md p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Descrição</h2>
                        <textarea
                            name="descricao"
                            value={formData.descricao}
                            onChange={handleInputChange}
                            rows={5}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                            placeholder="Descreva os detalhes do evento, programação, palestrantes, etc."
                        />
                    </div>

                    {/* Upload de Arquivos */}
                    <div className="bg-white rounded-xl shadow-md p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Arquivos do Evento</h2>

                        <div className="space-y-6">
                            {/* Imagem (Obrigatória) */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Imagem do Evento * (máx. 5MB)
                                </label>
                                {!imageFile ? (
                                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-orange-500 transition-colors">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleImageChange}
                                            className="hidden"
                                            id="image-upload"
                                            required
                                        />
                                        <label
                                            htmlFor="image-upload"
                                            className="cursor-pointer flex flex-col items-center gap-2"
                                        >
                                            <Image className="w-8 h-8 text-gray-400" />
                                            <span className="text-sm text-gray-600">
                                                Clique para selecionar uma imagem
                                            </span>
                                            <span className="text-xs text-gray-500">
                                                PNG, JPG, JPEG (máx. 5MB)
                                            </span>
                                        </label>
                                    </div>
                                ) : (
                                    <div className="relative">
                                        <img
                                            src={imagePreview!}
                                            alt="Preview"
                                            className="w-full h-48 object-cover rounded-lg"
                                        />
                                        <button
                                            type="button"
                                            onClick={removeImage}
                                            className="absolute top-2 right-2 p-1 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Vídeo (Opcional) */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Vídeo Promocional (opcional, máx. 50MB)
                                </label>
                                {!videoFile ? (
                                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-orange-500 transition-colors">
                                        <input
                                            type="file"
                                            accept="video/*"
                                            onChange={handleVideoChange}
                                            className="hidden"
                                            id="video-upload"
                                        />
                                        <label
                                            htmlFor="video-upload"
                                            className="cursor-pointer flex flex-col items-center gap-2"
                                        >
                                            <Video className="w-8 h-8 text-gray-400" />
                                            <span className="text-sm text-gray-600">
                                                Clique para selecionar um vídeo
                                            </span>
                                            <span className="text-xs text-gray-500">
                                                MP4, WebM, etc. (máx. 50MB)
                                            </span>
                                        </label>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                        <div className="flex items-center gap-2">
                                            <Video className="w-5 h-5 text-orange-600" />
                                            <span className="text-sm text-gray-700">{videoFile.name}</span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={removeVideo}
                                            className="p-1 text-red-600 hover:text-red-700"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* PDF (Opcional) */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Material em PDF (opcional, máx. 10MB)
                                </label>
                                {!pdfFile ? (
                                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-orange-500 transition-colors">
                                        <input
                                            type="file"
                                            accept=".pdf"
                                            onChange={handlePdfChange}
                                            className="hidden"
                                            id="pdf-upload"
                                        />
                                        <label
                                            htmlFor="pdf-upload"
                                            className="cursor-pointer flex flex-col items-center gap-2"
                                        >
                                            <FileText className="w-8 h-8 text-gray-400" />
                                            <span className="text-sm text-gray-600">
                                                Clique para selecionar um PDF
                                            </span>
                                            <span className="text-xs text-gray-500">
                                                Arquivo PDF (máx. 10MB)
                                            </span>
                                        </label>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                        <div className="flex items-center gap-2">
                                            <FileText className="w-5 h-5 text-orange-600" />
                                            <span className="text-sm text-gray-700">{pdfFile.name}</span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={removePdf}
                                            className="p-1 text-red-600 hover:text-red-700"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Botão de Submit */}
                    <div className="flex justify-end gap-4">
                        <button
                            type="button"
                            onClick={() => navigate(-1)}
                            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Criando...
                                </>
                            ) : (
                                'Criar Evento'
                            )}
                        </button>
                    </div>
                </form>
            </main>
        </div>
    );
}