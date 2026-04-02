import { useState, useEffect } from 'react';
import { X, Upload, Image, Video, FileText, Loader2, Plus, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Estacao {
    nome: string;
    quantidade: number;
    preco: number;
    vantagens: string[];
}

interface Event {
    id: string;
    name: string;
    date: string;
    time: string;
    location: string;
    eventType: string;
    description: string;
    category: string;
    image: string;
    video?: string;
    pdf?: string;
    price?: number;
    estacoes?: Estacao[];
}

interface EditEventModalProps {
    event: Event;
    onClose: () => void;
    onUpdate: () => void;
}

export function EditEventModal({ event, onClose, onUpdate }: EditEventModalProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    // Form state
    const [formData, setFormData] = useState({
        nome_evento: event.name,
        categoria: event.category,
        data_evento: event.date,
        hora_evento: event.time,
        tipo_evento: event.eventType,
        local: event.location,
        descricao: event.description,
        valor: event.price?.toString() || '',
    });

    // Estações
    const [estacoes, setEstacoes] = useState<Estacao[]>(event.estacoes || []);
    const [vantagemInput, setVantagemInput] = useState<Record<string, string>>({});

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

    // Funções para gerenciar estações
    const adicionarEstacao = () => {
        setEstacoes([
            ...estacoes,
            {
                nome: `Estação ${estacoes.length + 1}`,
                quantidade: 50,
                preco: 0,
                vantagens: []
            }
        ]);
    };

    const removerEstacao = (index: number) => {
        if (estacoes.length === 1) {
            setError('É necessário ter pelo menos uma estação');
            return;
        }
        setEstacoes(estacoes.filter((_, i) => i !== index));
    };

    const atualizarEstacao = (index: number, campo: keyof Estacao, valor: any) => {
        const novasEstacoes = [...estacoes];
        novasEstacoes[index] = { ...novasEstacoes[index], [campo]: valor };
        setEstacoes(novasEstacoes);
    };

    const adicionarVantagem = (index: number) => {
        const vantagem = vantagemInput[index] || '';
        if (!vantagem.trim()) return;

        const novasEstacoes = [...estacoes];
        novasEstacoes[index].vantagens.push(vantagem.trim());
        setEstacoes(novasEstacoes);
        
        const newInput = { ...vantagemInput };
        delete newInput[index];
        setVantagemInput(newInput);
    };

    const removerVantagem = (estacaoIndex: number, vantagemIndex: number) => {
        const novasEstacoes = [...estacoes];
        novasEstacoes[estacaoIndex].vantagens = novasEstacoes[estacaoIndex].vantagens.filter((_, i) => i !== vantagemIndex);
        setEstacoes(novasEstacoes);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        setSuccess(null);

        try {
            // Validar estações
            const estacoesValidas = estacoes.every(e => 
                e.nome.trim() && e.quantidade > 0 && e.preco >= 0
            );

            if (!estacoesValidas) {
                setError('Preencha corretamente todas as informações das estações');
                setIsLoading(false);
                return;
            }

            // Atualizar evento no banco
            const { error: updateError } = await supabase
                .from('eventos')
                .update({
                    nome_evento: formData.nome_evento,
                    categoria: formData.categoria,
                    data_evento: formData.data_evento,
                    hora_evento: formData.hora_evento,
                    tipo_evento: formData.tipo_evento,
                    local: formData.local || null,
                    descricao: formData.descricao || null,
                    valor: formData.valor ? parseFloat(formData.valor) : null,
                    estacoes: estacoes,
                    updated_at: new Date().toISOString()
                })
                .eq('id', event.id);

            if (updateError) {
                throw new Error(updateError.message);
            }

            setSuccess('Evento atualizado com sucesso!');
            
            setTimeout(() => {
                onUpdate();
                onClose();
            }, 1500);

        } catch (err: any) {
            console.error('Erro ao atualizar evento:', err);
            setError(err.message || 'Erro ao atualizar evento');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white rounded-t-2xl">
                    <h2 className="text-xl font-bold text-gray-900">Editar Evento</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Mensagens */}
                    {error && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                            <p className="text-red-600 text-sm">{error}</p>
                        </div>
                    )}
                    {success && (
                        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                            <p className="text-green-600 text-sm">{success}</p>
                        </div>
                    )}

                    {/* Informações Básicas */}
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Informações Básicas</h3>
                        <div className="space-y-4">
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
                                />
                            </div>

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

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Categoria
                                    </label>
                                    <select
                                        name="categoria"
                                        value={formData.categoria}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                                    >
                                        {categories.map(cat => (
                                            <option key={cat.value} value={cat.value}>
                                                {cat.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Tipo de Evento
                                    </label>
                                    <select
                                        name="tipo_evento"
                                        value={formData.tipo_evento}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                                    >
                                        {eventTypes.map(type => (
                                            <option key={type.value} value={type.value}>
                                                {type.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Local
                                </label>
                                <input
                                    type="text"
                                    name="local"
                                    value={formData.local}
                                    onChange={handleInputChange}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                                />
                            </div>

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
                                />
                            </div>
                        </div>
                    </div>

                    {/* Descrição */}
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Descrição</h3>
                        <textarea
                            name="descricao"
                            value={formData.descricao}
                            onChange={handleInputChange}
                            rows={5}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                            placeholder="Descreva os detalhes do evento..."
                        />
                    </div>

                    {/* Estações */}
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-gray-900">Tipos de Ingresso</h3>
                            <button
                                type="button"
                                onClick={adicionarEstacao}
                                className="flex items-center gap-2 px-3 py-1.5 bg-orange-50 text-orange-600 rounded-lg hover:bg-orange-100 transition-colors text-sm"
                            >
                                <Plus className="w-4 h-4" />
                                Adicionar Estação
                            </button>
                        </div>

                        <div className="space-y-4">
                            {estacoes.map((estacao, index) => (
                                <div key={index} className="border border-gray-200 rounded-lg p-4">
                                    <div className="flex items-center justify-between mb-4">
                                        <h4 className="font-semibold text-gray-900">Estação {index + 1}</h4>
                                        {estacoes.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() => removerEstacao(index)}
                                                className="text-red-500 hover:text-red-700"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-3 gap-4 mb-4">
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">
                                                Nome
                                            </label>
                                            <input
                                                type="text"
                                                value={estacao.nome}
                                                onChange={(e) => atualizarEstacao(index, 'nome', e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                                placeholder="Ex: VIP"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">
                                                Quantidade
                                            </label>
                                            <input
                                                type="number"
                                                value={estacao.quantidade}
                                                onChange={(e) => atualizarEstacao(index, 'quantidade', parseInt(e.target.value) || 0)}
                                                min="1"
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">
                                                Preço (Kz)
                                            </label>
                                            <input
                                                type="number"
                                                value={estacao.preco}
                                                onChange={(e) => atualizarEstacao(index, 'preco', parseInt(e.target.value) || 0)}
                                                min="0"
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-2">
                                            Vantagens
                                        </label>
                                        <div className="flex flex-wrap gap-2 mb-2">
                                            {estacao.vantagens.map((vantagem, idx) => (
                                                <span
                                                    key={idx}
                                                    className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 rounded-lg text-xs"
                                                >
                                                    {vantagem}
                                                    <button
                                                        type="button"
                                                        onClick={() => removerVantagem(index, idx)}
                                                        className="text-gray-400 hover:text-red-500"
                                                    >
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                </span>
                                            ))}
                                        </div>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                value={vantagemInput[index] || ''}
                                                onChange={(e) => setVantagemInput({ ...vantagemInput, [index]: e.target.value })}
                                                onKeyPress={(e) => e.key === 'Enter' && adicionarVantagem(index)}
                                                placeholder="Adicionar vantagem..."
                                                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => adicionarVantagem(index)}
                                                className="px-3 py-2 bg-orange-50 text-orange-600 rounded-lg hover:bg-orange-100 transition-colors"
                                            >
                                                <Plus className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Botões */}
                    <div className="flex justify-end gap-4 pt-4 border-t border-gray-200">
                        <button
                            type="button"
                            onClick={onClose}
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
                                    Salvando...
                                </>
                            ) : (
                                'Salvar Alterações'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}