import { useState, useEffect } from 'react';
import { X, Heart, User, Mail, Calendar, Loader2, Search, Building2, Crown, Star } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface LikersModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  eventName: string;
}

interface Liker {
  id: string;
  user_id: string;
  name: string;
  username: string;
  email: string;
  liked_at: string;
  type: 'user' | 'organizer';
  isEventOwner?: boolean;
  isCurrentUser?: boolean;
}

export function EventLikersModal({ isOpen, onClose, eventId, eventName }: LikersModalProps) {
  const [likers, setLikers] = useState<Liker[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentUser, setCurrentUser] = useState<{ id: string; type: string; name: string } | null>(null);
  const [eventOwnerId, setEventOwnerId] = useState<string | null>(null);

  useEffect(() => {
    // Buscar usuário logado
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        setCurrentUser(user);
      } catch (err) {
        console.error('Erro ao parsear usuário:', err);
      }
    }
  }, []);

  // Buscar o dono do evento
  useEffect(() => {
    const fetchEventOwner = async () => {
      if (!eventId) return;
      try {
        const { data: evento, error } = await supabase
          .from('eventos')
          .select('organizador_id')
          .eq('id', eventId)
          .single();

        if (!error && evento) {
          setEventOwnerId(evento.organizador_id);
        }
      } catch (err) {
        console.error('Erro ao buscar dono do evento:', err);
      }
    };

    if (isOpen && eventId) {
      fetchEventOwner();
    }
  }, [isOpen, eventId]);

  useEffect(() => {
    if (isOpen && eventId) {
      fetchLikers();
    }
  }, [isOpen, eventId, eventOwnerId]);

  const fetchLikers = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Buscar todos os likes do evento (incluindo de organizadores)
      const { data: favorites, error: favError } = await supabase
        .from('favoritos_eventos')
        .select(`
          id,
          created_at,
          usuario_normal_id,
          organizador_id,
          usuario_normal:usuarios_normais (
            id,
            nome_completo,
            nome_utilizador,
            email
          ),
          organizador:organizadores (
            id,
            nome_empresa,
            email_empresa
          )
        `)
        .eq('evento_id', eventId);

      if (favError) throw favError;

      if (!favorites || favorites.length === 0) {
        setLikers([]);
        return;
      }

      // Processar os dados dos usuários (incluindo organizadores)
      const processedLikers: Liker[] = favorites
        .map(fav => {
          // Verificar se é usuário normal
          if (fav.usuario_normal_id && fav.usuario_normal) {
            const user = fav.usuario_normal;
            return {
              id: fav.id,
              user_id: user.id,
              name: user.nome_completo || 'Usuário',
              username: user.nome_utilizador || 'usuário',
              email: user.email || '',
              liked_at: fav.created_at,
              type: 'user' as const,
              isEventOwner: false,
              isCurrentUser: currentUser?.id === user.id && currentUser?.type === 'user'
            };
          }
          // Verificar se é organizador
          else if (fav.organizador_id && fav.organizador) {
            const org = fav.organizador;
            return {
              id: fav.id,
              user_id: org.id,
              name: org.nome_empresa || 'Organizador',
              username: org.nome_empresa?.toLowerCase().replace(/\s/g, '') || 'organizador',
              email: org.email_empresa || '',
              liked_at: fav.created_at,
              type: 'organizer' as const,
              isEventOwner: eventOwnerId === org.id,
              isCurrentUser: currentUser?.id === org.id && currentUser?.type === 'organizer'
            };
          }
          return null;
        })
        .filter((liker): liker is Liker => liker !== null);

      // Ordenar: primeiro o dono do evento, depois o usuário atual (se não for o dono), depois os mais recentes
      const sortedLikers = [...processedLikers].sort((a, b) => {
        // Dono do evento sempre no topo (se tiver curtido)
        if (a.isEventOwner) return -1;
        if (b.isEventOwner) return 1;
        // Usuário atual em segundo (se não for o dono)
        if (a.isCurrentUser && !a.isEventOwner) return -1;
        if (b.isCurrentUser && !b.isEventOwner) return 1;
        // Depois ordenar por data (mais recente primeiro)
        return new Date(b.liked_at).getTime() - new Date(a.liked_at).getTime();
      });

      setLikers(sortedLikers);

    } catch (err) {
      console.error('Erro ao buscar usuários que curtiram:', err);
      setError('Erro ao carregar lista de interessados');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Agora mesmo';
    if (diffMins < 60) return `${diffMins} min atrás`;
    if (diffHours < 24) return `${diffHours} h atrás`;
    if (diffDays < 7) return `${diffDays} dias atrás`;

    return date.toLocaleDateString('pt-PT', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const filteredLikers = likers.filter(liker =>
    liker.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    liker.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    liker.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col">
        {/* Header - Fixo no topo */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 rounded-t-2xl bg-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
              <Heart className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">Interessados no Evento</h3>
              <p className="text-sm text-gray-500">{eventName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 cursor-pointer transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Estatísticas - Fixo */}
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Heart className="w-5 h-5 text-red-500 fill-red-500" />
              <span className="font-semibold text-gray-900">{likers.length}</span>
              <span className="text-gray-500">
                {likers.length === 1 ? 'pessoa interessada' : 'pessoas interessadas'}
              </span>
            </div>
            <div className="text-xs text-gray-400">
              {likers.some(l => l.type === 'organizer') && (
                <span className="flex items-center gap-1">
                  <Building2 className="w-3 h-3" />
                  Inclui organizadores
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Busca - Fixa */}
        <div className="px-6 py-4 border-b border-gray-200 shrink-0">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Pesquisar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none text-sm"
            />
            <div className="absolute left-3 top-1/2 -translate-y-1/2">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Lista de usuários - Com scroll */}
        <div className="flex-1 overflow-y-auto p-6 min-h-[200px]">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-orange-600 animate-spin mb-4" />
              <p className="text-gray-500">Carregando lista de interessados...</p>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Heart className="w-8 h-8 text-red-500" />
              </div>
              <p className="text-red-600">{error}</p>
              <button
                onClick={fetchLikers}
                className="mt-4 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
              >
                Tentar novamente
              </button>
            </div>
          ) : likers.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Heart className="w-8 h-8 text-gray-400" />
              </div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">Nenhum interessado ainda</h4>
              <p className="text-gray-500">
                Quando alguém demonstrar interesse no evento, aparecerá aqui.
              </p>
            </div>
          ) : filteredLikers.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">
                Nenhum resultado encontrado para "{searchTerm}"
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredLikers.map((liker) => (
                <div
                  key={liker.id}
                  className={`flex items-center justify-between p-4 rounded-xl transition-all ${liker.isEventOwner
                      ? 'bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300 shadow-md'
                      : liker.isCurrentUser
                        ? 'bg-orange-50 border-2 border-orange-200'
                        : 'bg-gray-50 hover:bg-orange-50'
                    }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg ${liker.type === 'organizer'
                        ? 'bg-gradient-to-br from-blue-500 to-blue-600'
                        : 'bg-gradient-to-br from-orange-500 to-red-600'
                      }`}>
                      {liker.type === 'organizer' ? (
                        <Building2 className="w-6 h-6" />
                      ) : (
                        liker.name.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-gray-900">{liker.name}</p>
                        {liker.isEventOwner && (
                          <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Star className="w-3 h-3 fill-amber-500" />
                            Dono do Evento
                          </span>
                        )}
                        {liker.type === 'organizer' && !liker.isEventOwner && (
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Building2 className="w-3 h-3" />
                            Organizador
                          </span>
                        )}
                        {liker.isCurrentUser && !liker.isEventOwner && (
                          <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Crown className="w-3 h-3" />
                            Você
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">@{liker.username}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Mail className="w-3 h-3 text-gray-400" />
                        <span className="text-xs text-gray-500">{liker.email}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-xs text-gray-400">
                      <Calendar className="w-3 h-3" />
                      <span>{formatDate(liker.liked_at)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer - Fixo na parte inferior */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-2xl shrink-0">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Total: {filteredLikers.length} {filteredLikers.length === 1 ? 'resultado' : 'resultados'}
            </p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-700 cursor-pointer rounded-lg hover:bg-gray-300 transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}