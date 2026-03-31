// src/components/BuyTicketModal.tsx (versão atualizada)
import { useState } from 'react';
import { X, CreditCard, Ticket, Check, AlertCircle } from 'lucide-react';

interface Estacao {
  nome: string;
  quantidade: number;
  preco: number;
  vantagens?: string[];
}

interface BuyTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventoId: string;
  eventoNome: string;
  estacoes: Estacao[];
  usuario: { id: string; name: string; email: string } | null;
}

export function BuyTicketModal({ isOpen, onClose, eventoId, eventoNome, estacoes, usuario }: BuyTicketModalProps) {
  const [selectedEstacao, setSelectedEstacao] = useState<Estacao | null>(null);
  const [quantidade, setQuantidade] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!usuario) {
      setError('Faça login para comprar ingressos');
      setTimeout(() => {
        window.location.href = '/login';
      }, 2000);
      return;
    }

    if (!selectedEstacao) {
      setError('Selecione uma estação');
      return;
    }

    if (quantidade < 1) {
      setError('Quantidade mínima é 1');
      return;
    }

    if (quantidade > selectedEstacao.quantidade) {
      setError(`Quantidade máxima é ${selectedEstacao.quantidade}`);
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    const getApiUrl = () => {
      // Se está em ngrok ou produção, usa a variável de ambiente
      if (import.meta.env.VITE_API_URL) {
        return `${import.meta.env.VITE_API_URL}/api/create-checkout-session`;
      }
      return 'http://localhost:3002/api/create-checkout-session';
    };

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      // ... validações ...

      setIsLoading(true);
      setError(null);

      try {
        const url = getApiUrl();
        console.log('📡 Usando URL:', url);

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'ngrok-skip-browser-warning': 'true' // ← importante para o ngrok
          },
          body: JSON.stringify({
            evento_id: eventoId,
            estacao_nome: selectedEstacao.nome,
            quantidade,
            usuario_id: usuario?.id,
            usuario_email: usuario?.email,
            usuario_nome: usuario?.name,
            valor_total: selectedEstacao.preco * quantidade
          })
        });

        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.error || `HTTP ${response.status}`);
        }

        const data = await response.json();
        console.log('✅ Resposta:', data);

        if (data.url) {
          window.open(data.url, '_blank');
        }

        setSuccess(`Pedido criado! ID: ${data.pedido_id}`);
        setTimeout(() => {
          onClose();
          setSelectedEstacao(null);
          setQuantidade(1);
          setSuccess(null);
        }, 2000);

      } catch (err: any) {
        console.error('❌ Erro:', err);
        setError(err.message || 'Erro ao processar. Tente novamente.');
      } finally {
        setIsLoading(false);
      }
    };
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
              <Ticket className="w-5 h-5 text-orange-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900">Comprar Ingresso</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
            <p className="text-sm text-orange-800">
              <strong>🎟️ {eventoNome}</strong>
            </p>
          </div>

          {/* Aviso de login */}
          {!usuario && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-yellow-800 text-sm font-medium">Faça login para continuar</p>
                  <p className="text-yellow-600 text-xs mt-1">Você precisa estar logado para comprar ingressos.</p>
                </div>
              </div>
            </div>
          )}

          {/* Mensagem de sucesso */}
          {success && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-600 text-sm">{success}</p>
              <p className="text-xs text-green-500 mt-1">Redirecionando...</p>
            </div>
          )}

          {estacoes.length > 0 ? (
            <div className="space-y-4">
              <label className="block text-sm font-medium text-gray-700">Selecione a estação</label>
              <div className="space-y-3">
                {estacoes.map((estacao) => (
                  <div
                    key={estacao.nome}
                    onClick={() => !isLoading && setSelectedEstacao(estacao)}
                    className={`border-2 rounded-xl p-4 cursor-pointer transition-all ${selectedEstacao?.nome === estacao.nome
                      ? 'border-orange-500 bg-orange-50'
                      : 'border-gray-200 hover:border-orange-300'
                      } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-gray-900">{estacao.nome}</p>
                        <p className="text-sm text-gray-500">
                          {estacao.quantidade} disponíveis • {estacao.preco.toLocaleString()} Kz
                        </p>
                        {estacao.vantagens && estacao.vantagens.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {estacao.vantagens.map((v, i) => (
                              <span key={i} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                                {v}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      {selectedEstacao?.nome === estacao.nome && (
                        <Check className="w-5 h-5 text-orange-600" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Ticket className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p>Este evento não possui estações disponíveis</p>
            </div>
          )}

          {selectedEstacao && usuario && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Quantidade</label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setQuantidade(Math.max(1, quantidade - 1))}
                    disabled={isLoading}
                    className="w-10 h-10 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50 disabled:opacity-50"
                  >
                    -
                  </button>
                  <span className="text-xl font-semibold w-12 text-center">{quantidade}</span>
                  <button
                    type="button"
                    onClick={() => setQuantidade(Math.min(selectedEstacao.quantidade, quantidade + 1))}
                    disabled={isLoading}
                    className="w-10 h-10 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50 disabled:opacity-50"
                  >
                    +
                  </button>
                  <span className="text-sm text-gray-500">Disponíveis: {selectedEstacao.quantidade}</span>
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-600">Valor unitário:</span>
                  <span className="font-medium">{selectedEstacao.preco.toLocaleString()} Kz</span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-600">Quantidade:</span>
                  <span className="font-medium">{quantidade}x</span>
                </div>
                <div className="border-t border-gray-200 pt-2 mt-2">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-gray-900">Total:</span>
                    <span className="text-xl font-bold text-orange-600">
                      {(selectedEstacao.preco * quantidade).toLocaleString()} Kz
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={!selectedEstacao || isLoading || !usuario}
            className="w-full bg-orange-600 text-white py-3 rounded-xl font-semibold hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Processando...
              </>
            ) : (
              <>
                <CreditCard className="w-5 h-5" />
                {usuario ? 'Confirmar Compra' : 'Faça Login para Comprar'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}