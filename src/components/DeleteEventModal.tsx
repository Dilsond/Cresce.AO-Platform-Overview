import { useState } from 'react';
import { X, AlertTriangle, Trash2, Loader2, Calendar, Users, Ticket, Heart, Database, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface DeleteEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  eventName: string;
  onDelete: () => void;
}

export function DeleteEventModal({ isOpen, onClose, eventId, eventName, onDelete }: DeleteEventModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmText, setConfirmText] = useState('');

  const handleDelete = async () => {
    if (confirmText !== 'DELETE') {
      setError('Digite DELETE para confirmar a exclusão');
      return;
    }

    setIsDeleting(true);
    setError(null);

    try {
      console.log('🗑️ Iniciando exclusão do evento:', eventId);

      // 1. Deletar favoritos do evento
      console.log('📌 Deletando favoritos...');
      const { error: favError } = await supabase
        .from('favoritos_eventos')
        .delete()
        .eq('evento_id', eventId);

      if (favError) {
        console.error('Erro ao deletar favoritos:', favError);
      } else {
        console.log('✅ Favoritos deletados');
      }

      // 2. Buscar pedidos do evento
      console.log('📦 Buscando pedidos...');
      const { data: pedidos, error: pedidosError } = await supabase
        .from('pedidos')
        .select('id')
        .eq('evento_id', eventId);

      if (pedidosError) {
        console.error('Erro ao buscar pedidos:', pedidosError);
      }

      // 3. Deletar tickets relacionados aos pedidos
      if (pedidos && pedidos.length > 0) {
        const pedidoIds = pedidos.map(p => p.id);
        console.log(`🎫 Deletando ${pedidoIds.length} tickets...`);
        
        const { error: ticketsError } = await supabase
          .from('tickets')
          .delete()
          .in('pedido_id', pedidoIds);

        if (ticketsError) {
          console.error('Erro ao deletar tickets:', ticketsError);
        } else {
          console.log('✅ Tickets deletados');
        }
      }

      // 4. Deletar pedidos
      console.log('📦 Deletando pedidos...');
      const { error: deletePedidosError } = await supabase
        .from('pedidos')
        .delete()
        .eq('evento_id', eventId);

      if (deletePedidosError) {
        console.error('Erro ao deletar pedidos:', deletePedidosError);
      } else {
        console.log('✅ Pedidos deletados');
      }

      // 5. Deletar comentários do evento
      console.log('💬 Deletando comentários...');
      const { error: commentsError } = await supabase
        .from('comentarios')
        .delete()
        .eq('evento_id', eventId);

      if (commentsError) {
        console.error('Erro ao deletar comentários:', commentsError);
      } else {
        console.log('✅ Comentários deletados');
      }

      // 6. Finalmente, deletar o evento
      console.log('🗑️ Deletando evento...');
      const { error: eventError } = await supabase
        .from('eventos')
        .delete()
        .eq('id', eventId);

      if (eventError) {
        throw new Error(`Erro ao deletar evento: ${eventError.message}`);
      }
      
      console.log('✅ Evento deletado com sucesso!');

      // Chamar callback para atualizar a lista
      await onDelete();
      
      // Fechar modal
      onClose();

    } catch (err: any) {
      console.error('❌ Erro ao deletar evento:', err);
      setError(err.message || 'Erro ao deletar evento. Tente novamente.');
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
              <Trash2 className="w-5 h-5 text-red-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900">Excluir Evento</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={isDeleting}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Conteúdo */}
        <div className="p-6">
          {/* Aviso */}
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-red-800 mb-1">Ação irreversível!</p>
                <p className="text-sm text-red-700">
                  Esta ação não pode ser desfeita. O evento será permanentemente removido.
                </p>
              </div>
            </div>
          </div>

          {/* Informações do evento */}
          <div className="bg-gray-50 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-orange-500" />
              <p className="font-semibold text-gray-900">{eventName}</p>
            </div>
            <p className="text-xs text-gray-500 mt-2">ID: {eventId}</p>
          </div>

          {/* Confirmação */}
          {!isDeleting && (
            <>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Digite <span className="font-bold text-red-600">DELETE</span> para confirmar:
                </label>
                <input
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
                  placeholder="DELETE"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none text-sm uppercase"
                  autoFocus
                />
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-600 text-sm">{error}</p>
                </div>
              )}

              {/* Botões */}
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDelete}
                  disabled={confirmText !== 'DELETE'}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Excluir Permanentemente
                </button>
              </div>
            </>
          )}

          {/* Loading durante exclusão */}
          {isDeleting && (
            <div className="flex flex-col items-center justify-center py-4 gap-3">
              <Loader2 className="w-8 h-8 text-red-600 animate-spin" />
              <p className="text-gray-600 text-sm">Excluindo evento...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}