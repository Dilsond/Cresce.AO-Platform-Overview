import { useState, useEffect } from 'react';
import { Trash2, AlertTriangle, CheckCircle, XCircle, Clock, Eye, EyeOff, MessageSquare, Flag } from 'lucide-react';
import { supabase } from '../lib/supabase';
import logo from '../assets/logo.png';

interface CommentWithDetails {
  id: string;
  userName: string;
  userType: 'user' | 'organizer';
  comment: string;
  rating: number;
  date: string;
  eventName: string;
  eventId: string;
  image?: string;
  denuncias: {
    id: string;
    motivo: string;
    descricao: string;
    status: string;
    created_at: string;
  }[];
}

interface OrganizerCommentManagementProps {
  organizerId: string;
}

export function OrganizerCommentManagement({ organizerId }: OrganizerCommentManagementProps) {
  const [comments, setComments] = useState<CommentWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedComment, setSelectedComment] = useState<CommentWithDetails | null>(null);
  const [showDenuncias, setShowDenuncias] = useState<string | null>(null);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  useEffect(() => {
    fetchCommentsWithDenuncias();
  }, [organizerId]);

  const fetchCommentsWithDenuncias = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Buscar todos os comentários dos eventos do organizador
      const { data: comentarios, error: commentsError } = await supabase
        .from('comentarios')
        .select(`
          id,
          descricao,
          avaliacao,
          imagem_url,
          created_at,
          usuario_normal:usuarios_normais (
            id,
            nome_completo
          ),
          organizador:organizadores (
            id,
            nome_empresa
          ),
          evento:eventos (
            id,
            nome_evento,
            organizador_id
          )
        `)
        .eq('evento.organizador_id', organizerId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (commentsError) {
        console.error('Erro ao buscar comentários:', commentsError);
        setError('Erro ao carregar comentários');
        return;
      }

      // Para cada comentário, buscar as denúncias
      const commentsWithDenuncias = await Promise.all(
        (comentarios || []).map(async (com) => {
          const { data: denuncias, error: denunciasError } = await supabase
            .from('denuncias_comentarios')
            .select('*')
            .eq('comentario_id', com.id)
            .order('created_at', { ascending: false });

          if (denunciasError) {
            console.error('Erro ao buscar denúncias:', denunciasError);
          }

          let userName = 'Usuário';
          let userType: 'user' | 'organizer' = 'user';

          if (com.usuario_normal) {
            userName = com.usuario_normal.nome_completo;
            userType = 'user';
          } else if (com.organizador) {
            userName = com.organizador.nome_empresa;
            userType = 'organizer';
          }

          return {
            id: com.id,
            userName,
            userType,
            comment: com.descricao,
            rating: com.avaliacao,
            date: com.created_at,
            eventName: com.evento?.nome_evento || 'Evento não identificado',
            eventId: com.evento?.id,
            image: com.imagem_url,
            denuncias: denuncias || []
          };
        })
      );

      setComments(commentsWithDenuncias);
    } catch (err) {
      console.error('Erro inesperado:', err);
      setError('Ocorreu um erro ao carregar os dados');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('Tem certeza que deseja eliminar este comentário? Esta ação não pode ser desfeita.')) {
      return;
    }

    setActionInProgress(commentId);

    try {
      const { error } = await supabase
        .from('comentarios')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', commentId);

      if (error) {
        console.error('Erro ao eliminar comentário:', error);
        alert('Erro ao eliminar comentário');
        return;
      }

      // Remover da lista local
      setComments(prev => prev.filter(c => c.id !== commentId));
      setSelectedComment(null);
    } catch (err) {
      console.error('Erro:', err);
      alert('Erro ao eliminar comentário');
    } finally {
      setActionInProgress(null);
    }
  };

  const handleUpdateDenunciaStatus = async (denunciaId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('denuncias_comentarios')
        .update({ status: newStatus })
        .eq('id', denunciaId);

      if (error) {
        console.error('Erro ao atualizar denúncia:', error);
        alert('Erro ao atualizar status da denúncia');
        return;
      }

      // Recarregar dados
      fetchCommentsWithDenuncias();
    } catch (err) {
      console.error('Erro:', err);
      alert('Erro ao atualizar denúncia');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pendente': return 'bg-yellow-100 text-yellow-800';
      case 'em_analise': return 'bg-blue-100 text-blue-800';
      case 'resolvido': return 'bg-green-100 text-green-800';
      case 'rejeitado': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pendente': return <Clock className="w-4 h-4" />;
      case 'em_analise': return <Eye className="w-4 h-4" />;
      case 'resolvido': return <CheckCircle className="w-4 h-4" />;
      case 'rejeitado': return <XCircle className="w-4 h-4" />;
      default: return null;
    }
  };

  const getMotivoLabel = (motivo: string) => {
    const motivos: Record<string, string> = {
      conteudo_ofensivo: 'Conteúdo ofensivo',
      spam: 'Spam',
      discurso_odio: 'Discurso de ódio',
      informacao_falsa: 'Informação falsa',
      conteudo_improprio: 'Conteúdo impróprio',
      assédio: 'Assédio',
      outro: 'Outro'
    };
    return motivos[motivo] || motivo;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-5xl font-bold text-orange-600 mb-4 flex items-center" style={{ animation: 'pulse 1.5s ease-in-out infinite' }}>
            <img src={logo} alt="Cresce.AO Logo" className="h-16 w-auto object-contain" />
            <span className="text-gray-400">Cresce</span>.AO
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-8">
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600">{error}</p>
          <button
            onClick={fetchCommentsWithDenuncias}
            className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 sm:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Gestão de Comentários</h2>
          <p className="text-gray-600 mt-1">
            {comments.length} {comments.length === 1 ? 'comentário encontrado' : 'comentários encontrados'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="px-3 py-1.5 bg-red-100 text-red-700 rounded-full text-sm font-medium flex items-center gap-1">
            <Flag className="w-4 h-4" />
            <span>
              {comments.reduce((acc, c) => acc + c.denuncias.length, 0)} denúncias
            </span>
          </div>
        </div>
      </div>

      {comments.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-xl border border-dashed border-gray-200">
          <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Nenhum comentário</h3>
          <p className="text-gray-500">Ainda não há comentários nos seus eventos.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {comments.map((comment) => (
            <div
              key={comment.id}
              className="border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow"
            >
              {/* Cabeçalho do comentário */}
              <div className="p-4 bg-gray-50 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-orange-600 rounded-full flex items-center justify-center text-white font-semibold">
                      {comment.userName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{comment.userName}</p>
                      <p className="text-sm text-gray-500">
                        {new Date(comment.date).toLocaleDateString('pt-PT')} •
                        Evento: <span className="text-orange-600">{comment.eventName}</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-lg text-sm font-medium">
                      {comment.rating} ★
                    </span>
                    {comment.denuncias.length > 0 && (
                      <button
                        onClick={() => setShowDenuncias(showDenuncias === comment.id ? null : comment.id)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-sm font-medium hover:bg-red-200 transition-colors"
                      >
                        <Flag className="w-4 h-4" />
                        {comment.denuncias.length} denúncia{comment.denuncias.length !== 1 ? 's' : ''}
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteComment(comment.id)}
                      disabled={actionInProgress === comment.id}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                      title="Eliminar comentário"
                    >
                      {actionInProgress === comment.id ? (
                        <div className="w-5 h-5 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Trash2 className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Conteúdo do comentário */}
              <div className="p-4">
                <p className="text-gray-700 mb-3">{comment.comment}</p>
                {comment.image && (
                  <img
                    src={comment.image}
                    alt="Imagem do comentário"
                    className="w-32 h-32 object-cover rounded-lg border border-gray-200"
                  />
                )}
              </div>

              {/* Denúncias do comentário (expansível) */}
              {showDenuncias === comment.id && comment.denuncias.length > 0 && (
                <div className="p-4 bg-gray-50 border-t border-gray-200">
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Flag className="w-4 h-4 text-red-600" />
                    Denúncias recebidas
                  </h4>
                  <div className="space-y-3">
                    {comment.denuncias.map((denuncia) => (
                      <div key={denuncia.id} className="bg-white rounded-lg p-4 border border-gray-200">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-1 bg-red-100 text-red-700 rounded-lg text-xs font-medium">
                              {getMotivoLabel(denuncia.motivo)}
                            </span>
                            <span className={`px-2 py-1 rounded-lg text-xs font-medium flex items-center gap-1 ${getStatusColor(denuncia.status)}`}>
                              {getStatusIcon(denuncia.status)}
                              {denuncia.status === 'pendente' && 'Pendente'}
                              {denuncia.status === 'em_analise' && 'Em análise'}
                              {denuncia.status === 'resolvido' && 'Resolvido'}
                              {denuncia.status === 'rejeitado' && 'Rejeitado'}
                            </span>
                          </div>
                          <span className="text-xs text-gray-500">
                            {new Date(denuncia.created_at).toLocaleDateString('pt-PT')}
                          </span>
                        </div>

                        {denuncia.descricao && (
                          <p className="text-sm text-gray-600 mb-3 bg-gray-50 p-2 rounded">
                            "{denuncia.descricao}"
                          </p>
                        )}

                        {/* Ações para organizador */}
                        <div className="flex gap-2 mt-2">
                          <button
                            onClick={() => handleUpdateDenunciaStatus(denuncia.id, 'em_analise')}
                            className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 transition-colors"
                          >
                            Marcar em análise
                          </button>
                          <button
                            onClick={() => handleUpdateDenunciaStatus(denuncia.id, 'resolvido')}
                            className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 transition-colors"
                          >
                            Resolver
                          </button>
                          <button
                            onClick={() => handleUpdateDenunciaStatus(denuncia.id, 'rejeitado')}
                            className="px-3 py-1.5 bg-gray-600 text-white rounded-lg text-xs font-medium hover:bg-gray-700 transition-colors"
                          >
                            Rejeitar
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}