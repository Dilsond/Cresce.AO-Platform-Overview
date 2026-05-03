import { useState } from 'react';
import { X, CreditCard, Ticket, Check, AlertCircle, Plus, Trash2, Shield } from 'lucide-react';

interface Estacao {
  nome: string;
  quantidade: number;
  preco: number;
  vantagens?: string[];
}

interface ItemCarrinho {
  estacao: Estacao;
  quantidade: number;
}

interface BuyTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventoId: string;
  eventoNome: string;
  estacoes: Estacao[];
  usuario: { id: string; name: string; email: string; role?: string } | null;
  onCompraRealizada?: () => void;
}

// Função para obter a URL correta da API
const getApiUrl = () => {
  if (import.meta.env.PROD) {
    return '/.netlify/functions/api';
  }
  return import.meta.env.VITE_API_URL || 'http://localhost:3002';
};

const API_URL = getApiUrl();

// Função para verificar se o usuário é organizador
const isOrganizador = (usuario: any): boolean => {
  return usuario?.role === 'organizador' || usuario?.role === 'organizer';
};

export function BuyTicketModal({
  isOpen,
  onClose,
  eventoId,
  eventoNome,
  estacoes: estacoesIniciais,
  usuario,
  onCompraRealizada,
}: BuyTicketModalProps) {
  const [carrinho, setCarrinho] = useState<ItemCarrinho[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [estacoes, setEstacoes] = useState<Estacao[]>(estacoesIniciais);

  // Sincronizar quando o pai passar novas estações
  if (!isLoading && !success && JSON.stringify(estacoesIniciais) !== JSON.stringify(estacoes) && carrinho.length === 0) {
    setEstacoes(estacoesIniciais);
  }

  // Adicionar item ao carrinho
  const adicionarAoCarrinho = (estacao: Estacao) => {
    // Verificar se é organizador antes de adicionar
    if (isOrganizador(usuario)) {
      setError('Organizadores não podem comprar ingressos para seus próprios eventos');
      return;
    }

    const itemExistente = carrinho.find(item => item.estacao.nome === estacao.nome);
    
    if (itemExistente) {
      if (itemExistente.quantidade + 1 <= estacao.quantidade) {
        setCarrinho(carrinho.map(item =>
          item.estacao.nome === estacao.nome
            ? { ...item, quantidade: item.quantidade + 1 }
            : item
        ));
      } else {
        setError(`Quantidade máxima para ${estacao.nome} é ${estacao.quantidade}`);
      }
    } else {
      setCarrinho([...carrinho, { estacao, quantidade: 1 }]);
    }
    setError(null);
  };

  // Remover item do carrinho
  const removerDoCarrinho = (nomeEstacao: string) => {
    setCarrinho(carrinho.filter(item => item.estacao.nome !== nomeEstacao));
  };

  // Atualizar quantidade de um item
  const atualizarQuantidade = (nomeEstacao: string, novaQuantidade: number) => {
    // Verificar se é organizador antes de atualizar
    if (isOrganizador(usuario)) {
      setError('Organizadores não podem comprar ingressos para seus próprios eventos');
      return;
    }

    const estacao = estacoes.find(e => e.nome === nomeEstacao);
    if (!estacao) return;

    if (novaQuantidade < 1) {
      removerDoCarrinho(nomeEstacao);
      return;
    }

    if (novaQuantidade > estacao.quantidade) {
      setError(`Quantidade máxima para ${nomeEstacao} é ${estacao.quantidade}`);
      return;
    }

    setCarrinho(carrinho.map(item =>
      item.estacao.nome === nomeEstacao
        ? { ...item, quantidade: novaQuantidade }
        : item
    ));
    setError(null);
  };

  // Calcular total do carrinho
  const calcularTotal = () => {
    return carrinho.reduce((total, item) => total + (item.estacao.preco * item.quantidade), 0);
  };

  // Calcular número total de ingressos
  const totalIngressos = () => {
    return carrinho.reduce((total, item) => total + item.quantidade, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // VERIFICAÇÃO PRINCIPAL PARA ORGANIZADOR
    if (isOrganizador(usuario)) {
      setError('❌ Organizadores não podem comprar ingressos para seus próprios eventos. Esta ação não é permitida.');
      return;
    }

    if (!usuario) {
      setError('Faça login para comprar ingressos');
      setTimeout(() => { window.location.href = '/login'; }, 2000);
      return;
    }

    if (carrinho.length === 0) {
      setError('Adicione pelo menos um tipo de ingresso ao carrinho');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Verificar disponibilidade para todos os itens
      for (const item of carrinho) {
        const checkUrl = `${API_URL}/check-availability/${eventoId}/${encodeURIComponent(item.estacao.nome)}`;
        const availRes = await fetch(checkUrl).catch(() => null);

        if (availRes?.ok) {
          const avail = await availRes.json();
          if (!avail.disponivel || avail.quantidade < item.quantidade) {
            setError(`Apenas ${avail.quantidade} ingresso(s) disponível(is) para ${item.estacao.nome}. Atualize a página.`);
            setEstacoes(prev =>
              prev.map(e => e.nome === item.estacao.nome ? { ...e, quantidade: avail.quantidade } : e)
            );
            setIsLoading(false);
            return;
          }
        }
      }

      // Criar sessão de checkout com múltiplos itens
      const createUrl = `${API_URL}/create-checkout-session`;
      
      // Preparar line items para o Stripe
      const lineItems = carrinho.map(item => ({
        price_data: {
          currency: 'aoa',
          product_data: {
            name: `${eventoNome} — ${item.estacao.nome}`,
            description: `${item.quantidade}x ingresso(s)`,
          },
          unit_amount: Math.round((item.estacao.preco * 100)),
        },
        quantity: item.quantidade,
      }));

      const res = await fetch(createUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({
          evento_id: eventoId,
          itens: carrinho.map(item => ({
            estacao_nome: item.estacao.nome,
            quantidade: item.quantidade,
            preco: item.estacao.preco
          })),
          usuario_id: usuario.id,
          usuario_email: usuario.email,
          usuario_nome: usuario.name,
          valor_total: calcularTotal(),
          line_items: lineItems
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || `Erro ${res.status}`);
      }

      // Atualização otimista local - reduzir quantidades
      setEstacoes(prev =>
        prev.map(estacao => {
          const itemCarrinho = carrinho.find(item => item.estacao.nome === estacao.nome);
          if (itemCarrinho) {
            return { ...estacao, quantidade: estacao.quantidade - itemCarrinho.quantidade };
          }
          return estacao;
        })
      );

      setSuccess(`Pedido criado! Total: ${calcularTotal().toLocaleString()} Kz. Redirecionando para o pagamento...`);

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
    setCarrinho([]);
    setError(null);
    setSuccess(null);
    onClose();
  };

  if (!isOpen) return null;

  const usuarioEhOrganizador = isOrganizador(usuario);

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
              <Ticket className="w-5 h-5 text-orange-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900">Comprar Ingressos</h3>
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

          {/* AVISO DE ORGANIZADOR - BLOQUEIO VISUAL */}
          {usuarioEhOrganizador && (
            <div className="p-4 bg-red-50 border-2 border-red-300 rounded-xl flex items-start gap-3">
              <Shield className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-red-800 font-bold text-base">Acesso Negado</p>
                <p className="text-red-700 text-sm mt-1">
                  Organizadores não podem comprar ingressos para seus próprios eventos.
                </p>
                <p className="text-red-600 text-xs mt-2">
                  Esta restrição existe para garantir a integridade do evento e evitar conflitos de interesse.
                </p>
              </div>
            </div>
          )}

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

          {/* Grid de estações disponíveis - DESABILITADO PARA ORGANIZADOR */}
          {estacoes.length > 0 ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">Tipos de Ingresso</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {estacoes.map((estacao) => {
                  const esgotado = estacao.quantidade <= 0;
                  const noCarrinho = carrinho.find(item => item.estacao.nome === estacao.nome);
                  
                  // Se for organizador, desabilita completamente a interação
                  const desabilitado = usuarioEhOrganizador || esgotado;

                  return (
                    <div
                      key={estacao.nome}
                      className={`border-2 rounded-xl p-4 transition-all
                        ${desabilitado
                          ? 'border-gray-100 bg-gray-50 opacity-60'
                          : noCarrinho
                            ? 'border-green-500 bg-green-50'
                            : 'border-gray-200 hover:border-orange-300'
                        }
                      `}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-semibold text-gray-900">{estacao.nome}</p>
                          <p className={`text-sm ${esgotado ? 'text-red-500 font-medium' : 'text-gray-500'}`}>
                            {esgotado
                              ? 'Esgotado'
                              : `${estacao.quantidade} disponível(is) · ${estacao.preco.toLocaleString()} Kz`}
                          </p>
                        </div>
                        {!desabilitado && (
                          <button
                            onClick={() => adicionarAoCarrinho(estacao)}
                            className="p-1.5 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                            disabled={isLoading}
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      {noCarrinho && !usuarioEhOrganizador && (
                        <div className="mt-2 pt-2 border-t border-green-200">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-green-700">No carrinho:</span>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => atualizarQuantidade(estacao.nome, noCarrinho.quantidade - 1)}
                                className="w-6 h-6 rounded-full bg-gray-200 text-gray-700 hover:bg-gray-300"
                              >
                                -
                              </button>
                              <span className="font-semibold w-8 text-center">{noCarrinho.quantidade}</span>
                              <button
                                onClick={() => atualizarQuantidade(estacao.nome, noCarrinho.quantidade + 1)}
                                className="w-6 h-6 rounded-full bg-gray-200 text-gray-700 hover:bg-gray-300"
                                disabled={noCarrinho.quantidade >= estacao.quantidade}
                              >
                                +
                              </button>
                            </div>
                          </div>
                          <p className="text-xs text-green-600 mt-1">
                            Subtotal: {(estacao.preco * noCarrinho.quantidade).toLocaleString()} Kz
                          </p>
                        </div>
                      )}
                      {estacao.vantagens && estacao.vantagens.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {estacao.vantagens.map((v, i) => (
                            <span key={i} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{v}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Ticket className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>Nenhum tipo de ingresso disponível para este evento.</p>
            </div>
          )}

          {/* Carrinho de compras - OCULTADO PARA ORGANIZADOR */}
          {carrinho.length > 0 && !usuarioEhOrganizador && (
            <div className="border-t border-gray-200 pt-4">
              <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Ticket className="w-4 h-4" />
                Seu Carrinho ({totalIngressos()} {totalIngressos() === 1 ? 'ingresso' : 'ingressos'})
              </h4>
              
              <div className="space-y-2 mb-4">
                {carrinho.map((item) => (
                  <div key={item.estacao.nome} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{item.estacao.nome}</p>
                      <p className="text-sm text-gray-500">{item.quantidade}x · {item.estacao.preco.toLocaleString()} Kz</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <p className="font-semibold text-orange-600">
                        {(item.estacao.preco * item.quantidade).toLocaleString()} Kz
                      </p>
                      <button
                        onClick={() => removerDoCarrinho(item.estacao.nome)}
                        className="p-1 text-red-500 hover:text-red-700 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-orange-50 rounded-xl p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-600">Total:</span>
                  <span className="text-2xl font-bold text-orange-600">
                    {calcularTotal().toLocaleString()} Kz
                  </span>
                </div>
                <p className="text-xs text-gray-500 text-center">
                  {totalIngressos()} {totalIngressos() === 1 ? 'ingresso selecionado' : 'ingressos selecionados'}
                </p>
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

          {/* Botão de finalizar compra - DESABILITADO E COM MENSAGEM PARA ORGANIZADOR */}
          <button
            onClick={handleSubmit}
            disabled={carrinho.length === 0 || isLoading || !usuario || usuarioEhOrganizador}
            className={`w-full py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors
              ${usuarioEhOrganizador
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-orange-600 hover:bg-orange-700 text-white'
              }
              disabled:opacity-50 disabled:cursor-not-allowed
            `}
          >
            {isLoading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Processando...
              </>
            ) : (
              <>
                <CreditCard className="w-5 h-5" />
                {usuarioEhOrganizador
                  ? 'Organizadores não podem comprar ingressos'
                  : usuario 
                    ? `Finalizar Compra (${calcularTotal().toLocaleString()} Kz)` 
                    : 'Faça login para comprar'
                }
              </>
            )}
          </button>

          {/* Mensagem adicional para organizadores */}
          {usuarioEhOrganizador && (
            <p className="text-xs text-center text-gray-500 mt-2">
              Como organizador, você não pode adquirir ingressos para eventos que criou.
              Crie uma conta de participante para comprar ingressos.
            </p>
          )}

        </div>
      </div>
    </div>
  );
}