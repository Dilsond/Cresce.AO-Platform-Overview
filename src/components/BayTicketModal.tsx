// src/components/BuyTicketModal.tsx
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
  onCompraRealizada?: () => void;
}

// Função para obter a URL correta da API
const getApiUrl = () => {
  // Em produção no Netlify
  if (import.meta.env.PROD) {
    return '/.netlify/functions/api';
  }
  // Em desenvolvimento
  return import.meta.env.VITE_API_URL || 'http://localhost:3002';
};

const API_URL = getApiUrl();

export function BuyTicketModal({
  isOpen,
  onClose,
  eventoId,
  eventoNome,
  estacoes: estacoesIniciais,
  usuario,
  onCompraRealizada,
}: BuyTicketModalProps) {
  const [selectedEstacao, setSelectedEstacao] = useState<Estacao | null>(null);
  const [quantidade, setQuantidade] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [estacoes, setEstacoes] = useState<Estacao[]>(estacoesIniciais);

  // Sincronizar quando o pai passar novas estações
  if (!isLoading && !success && JSON.stringify(estacoesIniciais) !== JSON.stringify(estacoes) && !selectedEstacao) {
    setEstacoes(estacoesIniciais);
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!usuario) {
      setError('Faça login para comprar ingressos');
      setTimeout(() => { window.location.href = '/login'; }, 2000);
      return;
    }
    if (!selectedEstacao) { setError('Selecione uma estação'); return; }
    if (quantidade < 1) { setError('Quantidade mínima é 1'); return; }
    if (quantidade > selectedEstacao.quantidade) {
      setError(`Quantidade máxima disponível: ${selectedEstacao.quantidade}`);
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // ── 1. Verificar disponibilidade real antes de pagar ────────────────
      // CORRIGIDO: Não adicionar /api extra
      const checkUrl = `${API_URL}/check-availability/${eventoId}/${encodeURIComponent(selectedEstacao.nome)}`;
      console.log('🔍 Verificando disponibilidade:', checkUrl);
      
      const availRes = await fetch(checkUrl).catch(() => null);

      if (availRes?.ok) {
        const avail = await availRes.json();
        if (!avail.disponivel || avail.quantidade < quantidade) {
          setError(`Apenas ${avail.quantidade} ingresso(s) disponível(is) agora. Atualize a página.`);
          setEstacoes(prev =>
            prev.map(e => e.nome === selectedEstacao.nome ? { ...e, quantidade: avail.quantidade } : e)
          );
          setIsLoading(false);
          return;
        }
      }

      // ── 2. Criar sessão de checkout ─────────────────────────────────────
      // CORRIGIDO: Não adicionar /api extra
      const createUrl = `${API_URL}/create-checkout-session`;
      console.log('💰 Criando sessão de checkout:', createUrl);
      
      const res = await fetch(createUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({
          evento_id:    eventoId,
          estacao_nome: selectedEstacao.nome,
          quantidade,
          usuario_id:   usuario.id,
          usuario_email: usuario.email,
          usuario_nome:  usuario.name,
          valor_total:   selectedEstacao.preco * quantidade,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || `Erro ${res.status}`);
      }

      // ── 3. Atualização otimista local ───────────────────────────────────
      setEstacoes(prev =>
        prev.map(e =>
          e.nome === selectedEstacao.nome
            ? { ...e, quantidade: e.quantidade - quantidade }
            : e
        )
      );

      setSuccess('Pedido criado! A redirecionar para o pagamento...');

      // ── 4. Abrir Stripe Checkout ────────────────────────────────────────
      if (data.url) {
        setTimeout(() => {
          window.location.href = data.url;
        }, 800);
      }

      onCompraRealizada?.();

    } catch (err: any) {
      console.error('❌ Erro ao criar sessão:', err);

      let msg = err.message || 'Erro ao processar pagamento.';
      if (msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
        msg = `Não foi possível conectar ao servidor (${API_URL}). Verifique se o backend está a correr.`;
      }
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (isLoading) return;
    setSelectedEstacao(null);
    setQuantidade(1);
    setError(null);
    setSuccess(null);
    onClose();
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
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600" disabled={isLoading}>
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">

          {/* Nome do evento */}
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
            <p className="text-sm text-orange-800 font-medium">🎟️ {eventoNome}</p>
          </div>

          {/* Aviso de login */}
          {!usuario && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-yellow-800 text-sm font-medium">Faça login para continuar</p>
                <p className="text-yellow-600 text-xs mt-1">É necessário estar autenticado para comprar ingressos.</p>
              </div>
            </div>
          )}

          {/* Sucesso */}
          {success && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-700 text-sm font-medium">{success}</p>
            </div>
          )}

          {/* Estações */}
          {estacoes.length > 0 ? (
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">Selecione a estação</label>
              {estacoes.map((estacao) => {
                const esgotado = estacao.quantidade <= 0;
                const selecionada = selectedEstacao?.nome === estacao.nome;

                return (
                  <div
                    key={estacao.nome}
                    onClick={() => {
                      if (isLoading || esgotado) return;
                      setSelectedEstacao(estacao);
                      setQuantidade(1);
                      setError(null);
                    }}
                    className={`border-2 rounded-xl p-4 transition-all
                      ${esgotado
                        ? 'border-gray-100 bg-gray-50 opacity-60 cursor-not-allowed'
                        : selecionada
                          ? 'border-orange-500 bg-orange-50 cursor-pointer'
                          : 'border-gray-200 hover:border-orange-300 cursor-pointer'
                      }
                      ${isLoading ? 'pointer-events-none' : ''}
                    `}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-gray-900">{estacao.nome}</p>
                        <p className={`text-sm mt-0.5 ${esgotado ? 'text-red-500 font-medium' : 'text-gray-500'}`}>
                          {esgotado
                            ? 'Esgotado'
                            : `${estacao.quantidade} disponível(is) · ${estacao.preco.toLocaleString()} Kz`}
                        </p>
                        {estacao.vantagens && estacao.vantagens.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {estacao.vantagens.map((v, i) => (
                              <span key={i} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{v}</span>
                            ))}
                          </div>
                        )}
                      </div>
                      {selecionada && <Check className="w-5 h-5 text-orange-600 flex-shrink-0" />}
                      {esgotado && <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded-full">Esgotado</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Ticket className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>Nenhuma estação disponível para este evento.</p>
            </div>
          )}

          {/* Quantidade e resumo */}
          {selectedEstacao && usuario && selectedEstacao.quantidade > 0 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Quantidade</label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setQuantidade(q => Math.max(1, q - 1))}
                    disabled={isLoading || quantidade <= 1}
                    className="w-10 h-10 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50 disabled:opacity-40 text-lg font-bold"
                  >
                    −
                  </button>
                  <span className="text-xl font-semibold w-12 text-center">{quantidade}</span>
                  <button
                    type="button"
                    onClick={() => setQuantidade(q => Math.min(selectedEstacao.quantidade, q + 1))}
                    disabled={isLoading || quantidade >= selectedEstacao.quantidade}
                    className="w-10 h-10 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50 disabled:opacity-40 text-lg font-bold"
                  >
                    +
                  </button>
                  <span className="text-sm text-gray-500">máx. {selectedEstacao.quantidade}</span>
                </div>
              </div>

              {/* Resumo */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Valor unitário</span>
                  <span>{selectedEstacao.preco.toLocaleString()} Kz</span>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Quantidade</span>
                  <span>{quantidade}×</span>
                </div>
                <div className="border-t border-gray-200 pt-2 flex justify-between">
                  <span className="font-semibold text-gray-900">Total</span>
                  <span className="text-xl font-bold text-orange-600">
                    {(selectedEstacao.preco * quantidade).toLocaleString()} Kz
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Erro */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          {/* Botão */}
          <button
            onClick={handleSubmit}
            disabled={!selectedEstacao || isLoading || !usuario || selectedEstacao?.quantidade <= 0}
            className="w-full bg-orange-600 text-white py-3 rounded-xl font-semibold hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                A processar...
              </>
            ) : (
              <>
                <CreditCard className="w-5 h-5" />
                {usuario ? 'Pagar com Stripe' : 'Faça login para comprar'}
              </>
            )}
          </button>

        </div>
      </div>
    </div>
  );
}