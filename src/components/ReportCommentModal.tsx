import { useState } from 'react';
import { X, AlertTriangle, Flag, ChevronDown } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface ReportCommentModalProps {
  commentId: string;
  currentUserId: string;
  currentUserType: 'user' | 'organizer';
  onClose: () => void;
  onReportSubmitted: () => void;
}

const reportReasons = [
  { value: 'conteudo_ofensivo', label: 'Conteúdo ofensivo', description: 'Linguagem de ódio, insultos ou discriminação' },
  { value: 'spam', label: 'Spam', description: 'Publicidade não solicitada ou conteúdo repetitivo' },
  { value: 'discurso_odio', label: 'Discurso de ódio', description: 'Promoção de violência ou ódio contra grupos' },
  { value: 'informacao_falsa', label: 'Informação falsa', description: 'Informações enganosas ou fake news' },
  { value: 'conteudo_improprio', label: 'Conteúdo impróprio', description: 'Conteúdo sexual, violento ou chocante' },
  { value: 'assédio', label: 'Assédio', description: 'Assédio ou perseguição a outro usuário' },
  { value: 'outro', label: 'Outro motivo', description: 'Especifique o motivo' },
];

export function ReportCommentModal({ 
  commentId, 
  currentUserId, 
  currentUserType,
  onClose, 
  onReportSubmitted 
}: ReportCommentModalProps) {
  const [selectedReason, setSelectedReason] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showReasons, setShowReasons] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedReason) {
      setError('Por favor, selecione um motivo para a denúncia');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const insertData: any = {
        comentario_id: commentId,
        motivo: selectedReason,
        descricao: description || null,
        status: 'pendente'
      };

      if (currentUserType === 'user') {
        insertData.usuario_normal_id = currentUserId;
      } else {
        insertData.organizador_id = currentUserId;
      }

      const { error: insertError } = await supabase
        .from('denuncias_comentarios')
        .insert([insertData]);

      if (insertError) {
        if (insertError.code === '23505') {
          setError('Você já denunciou este comentário anteriormente');
        } else {
          console.error('Erro ao denunciar:', insertError);
          setError('Erro ao enviar denúncia. Tente novamente.');
        }
        return;
      }

      onReportSubmitted();
      onClose();
    } catch (err) {
      console.error('Erro inesperado:', err);
      setError('Ocorreu um erro inesperado');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div 
        className="bg-white rounded-xl max-w-md w-full shadow-2xl transform transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header mais compacto */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-red-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Denunciar Comentário</h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form mais compacto */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <p className="text-xs text-gray-500 bg-gray-50 p-2 rounded-lg">
            Sua denúncia será analisada pela nossa equipe de moderação.
          </p>

          {/* Motivo - Versão mais compacta com select customizado */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              Motivo da denúncia *
            </label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowReasons(!showReasons)}
                className="w-full px-3 py-2.5 text-left border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all bg-white text-sm flex items-center justify-between"
              >
                <span className={selectedReason ? 'text-gray-900' : 'text-gray-400'}>
                  {selectedReason ? reportReasons.find(r => r.value === selectedReason)?.label : 'Selecione um motivo'}
                </span>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showReasons ? 'rotate-180' : ''}`} />
              </button>
              
              {showReasons && (
                <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {reportReasons.map((reason) => (
                    <button
                      key={reason.value}
                      type="button"
                      onClick={() => {
                        setSelectedReason(reason.value);
                        setShowReasons(false);
                      }}
                      className="w-full px-3 py-2.5 text-left hover:bg-red-50 transition-colors border-b border-gray-100 last:border-0"
                    >
                      <p className="text-sm font-medium text-gray-900">{reason.label}</p>
                      <p className="text-xs text-gray-500">{reason.description}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Descrição adicional - mais compacta */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              Descrição (opcional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Forneça mais detalhes..."
              rows={3}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none resize-none"
            />
          </div>

          {/* Mensagem de erro */}
          {error && (
            <div className="p-2 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-xs text-red-600">{error}</p>
            </div>
          )}

          {/* Aviso de confidencialidade compacto */}
          <div className="p-2 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-500">
              <span className="font-semibold">🔒 Confidencial:</span> Sua identidade não será compartilhada.
            </p>
          </div>

          {/* Botões mais compactos */}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-3 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!selectedReason || isSubmitting}
              className="flex-1 px-3 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Enviando...</span>
                </>
              ) : (
                <>
                  <Flag className="w-3.5 h-3.5" />
                  <span>Denunciar</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}