import { useState, useRef, useEffect, useCallback } from 'react';
import { Star, Send, Image as ImageIcon, X, Edit2, Check, Trash2, ZoomIn, Plus, ChevronLeft, ChevronRight, AlertTriangle, MoreVertical } from 'lucide-react';
import { ImageEditor } from './ImageEditor';
import { supabase } from '../lib/supabase';
import { ReportCommentModal } from './ReportCommentModal';

export interface EventReview {
  id: string;
  userId: string;
  userName: string;
  rating: number;
  comment: string;
  date: string;
  images?: string[];
}

interface EventReviewsProps {
  eventId?: string;
  onAddReview?: (rating: number, comment: string, images?: string[]) => void;
  onUpdateReview?: (reviewId: string, rating: number, comment: string, images?: string[]) => void;
  onDeleteReview?: (reviewId: string) => void;
  currentUserName?: string;
  currentUserId?: string;
  currentUserType?: 'user' | 'organizer';
}

export function EventReviews({
  eventId: propEventId,
  onAddReview,
  onUpdateReview,
  onDeleteReview,
  currentUserName,
  currentUserId,
  currentUserType
}: EventReviewsProps) {
  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState('');
  const [hoveredStar, setHoveredStar] = useState<number | null>(null);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);
  const [editRating, setEditRating] = useState(5);
  const [editComment, setEditComment] = useState('');
  const [editImages, setEditImages] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reviews, setReviews] = useState<EventReview[]>([]);
  const [selectedReportComment, setSelectedReportComment] = useState<EventReview | null>(null);
  const [averageRating, setAverageRating] = useState<number | undefined>(undefined);
  const [localEventId, setLocalEventId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [openMenuReviewId, setOpenMenuReviewId] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [editingImageIndex, setEditingImageIndex] = useState<number | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [viewerImages, setViewerImages] = useState<string[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Fechar menu ao clicar fora
  useEffect(() => {
    const handleClickOutside = () => setOpenMenuReviewId(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  useEffect(() => {
    if (propEventId) {
      setLocalEventId(propEventId);
    } else {
      const parts = window.location.pathname.split('/');
      const last = parts[parts.length - 1];
      if (last && last !== 'event-detail') setLocalEventId(last);
    }
  }, [propEventId]);

  useEffect(() => {
    if (localEventId) fetchReviews();
  }, [localEventId]);

  const fetchReviews = async () => {
    if (!localEventId) return;
    try {
      setIsLoading(true);
      const { data: comentarios, error } = await supabase
        .from('comentarios')
        .select(`
          id,
          descricao,
          avaliacao,
          imagem_url,
          created_at,
          updated_at,
          usuario_normal:usuarios_normais (id, nome_completo, nome_utilizador),
          organizador:organizadores (id, nome_empresa)
        `)
        .eq('evento_id', localEventId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) { console.error('Erro ao buscar comentários:', error); return; }

      const formatted: EventReview[] = (comentarios ?? []).map((com) => {
        let userName = 'Utilizador';
        let userId = '';
        if (com.usuario_normal) { userName = com.usuario_normal.nome_completo; userId = com.usuario_normal.id; }
        else if (com.organizador) { userName = com.organizador.nome_empresa; userId = com.organizador.id; }
        return {
          id: com.id,
          userId,
          userName,
          rating: com.avaliacao,
          comment: com.descricao,
          date: com.created_at,
          images: com.imagem_url ? [com.imagem_url] : [],
        };
      });

      setReviews((prev) => {
        if (prev.length === formatted.length) {
          const prevIds = new Set(prev.map((r) => r.id));
          const newIds = new Set(formatted.map((r) => r.id));
          const sameIds = [...prevIds].every((id) => newIds.has(id));
          if (sameIds) return prev;
        }
        return formatted;
      });

      if (formatted.length > 0) {
        setAverageRating(formatted.reduce((acc, r) => acc + r.rating, 0) / formatted.length);
      } else {
        setAverageRating(undefined);
      }
    } catch (err) {
      console.error('Erro ao buscar reviews:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const openGallery = useCallback((images: string[], startIndex = 0) => {
    setViewerImages(images); setCurrentImageIndex(startIndex);
  }, []);
  const closeGallery = useCallback(() => { setViewerImages([]); setCurrentImageIndex(0); }, []);
  const prevImage = useCallback(() => setCurrentImageIndex((i) => (i - 1 + viewerImages.length) % viewerImages.length), [viewerImages.length]);
  const nextImage = useCallback(() => setCurrentImageIndex((i) => (i + 1) % viewerImages.length), [viewerImages.length]);

  useEffect(() => {
    if (!viewerImages.length) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeGallery();
      if (e.key === 'ArrowLeft') prevImage();
      if (e.key === 'ArrowRight') nextImage();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [viewerImages.length, closeGallery, prevImage, nextImage]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 140)}px`;
    }
  }, [newComment]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach((file) => {
      if (uploadedImages.length >= 4) return;
      const reader = new FileReader();
      reader.onloadend = () => setUploadedImages((prev) => [...prev, reader.result as string].slice(0, 4));
      reader.readAsDataURL(file);
    });
  };

  const uploadImageToStorage = async (base64: string): Promise<string | null> => {
    try {
      const blob = await fetch(base64).then((r) => r.blob());
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;
      const { error } = await supabase.storage.from('review-images').upload(fileName, blob, { cacheControl: '3600', upsert: false });
      if (error) throw error;
      return supabase.storage.from('review-images').getPublicUrl(fileName).data.publicUrl;
    } catch { return null; }
  };

  const removeImage = (index: number) => setUploadedImages(uploadedImages.filter((_, i) => i !== index));

  const handleSaveEditedImage = (edited: string) => {
    if (editingImageIndex !== null) {
      const imgs = [...uploadedImages];
      imgs[editingImageIndex] = edited;
      setUploadedImages(imgs);
    }
    setEditingImageIndex(null); setIsEditMode(false);
  };

  const submitReview = async () => {
    if (!currentUserId) { alert('Precisa de iniciar sessão para avaliar.'); return; }
    if (!localEventId) { alert('Erro: ID do evento não disponível.'); return; }
    if (!newComment.trim() && !uploadedImages.length) return;

    setIsSubmitting(true);
    try {
      const imageUrls: string[] = [];
      for (const img of uploadedImages) {
        const url = await uploadImageToStorage(img);
        if (url) imageUrls.push(url);
      }

      const insertData: any = {
        evento_id: localEventId,
        descricao: newComment,
        avaliacao: newRating,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      if (currentUserType === 'user') insertData.usuario_normal_id = currentUserId;
      else if (currentUserType === 'organizer') insertData.organizador_id = currentUserId;
      if (imageUrls.length) insertData.imagem_url = imageUrls[0];

      const { error } = await supabase.from('comentarios').insert([insertData]).select().single();
      if (error) { alert('Erro ao publicar avaliação.'); return; }

      setNewComment(''); setNewRating(5); setUploadedImages([]);
      await fetchReviews();
      onAddReview?.(newRating, newComment, imageUrls);

    } catch (err) {
      console.error('Erro ao publicar avaliação:', err);
      alert('Erro ao publicar avaliação.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); submitReview(); };
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitReview(); }
  };

  const startEditReview = (review: EventReview) => {
    setEditingReviewId(review.id); setEditRating(review.rating);
    setEditComment(review.comment); setEditImages(review.images || []);
    setOpenMenuReviewId(null);
  };
  const cancelEdit = () => { setEditingReviewId(null); setEditRating(5); setEditComment(''); setEditImages([]); };

  const saveEdit = async (reviewId: string) => {
    if (!editComment.trim() || !onUpdateReview) return;
    try {
      const { error } = await supabase.from('comentarios').update({
        descricao: editComment, avaliacao: editRating,
        imagem_url: editImages[0] || null, updated_at: new Date().toISOString(),
      }).eq('id', reviewId);
      if (error) { alert('Erro ao actualizar avaliação.'); return; }

      // Atualizar localmente primeiro para feedback instantâneo
      setReviews(prev => prev.map(review =>
        review.id === reviewId
          ? { ...review, rating: editRating, comment: editComment, images: editImages }
          : review
      ));

      onUpdateReview(reviewId, editRating, editComment, editImages);
      cancelEdit();
      await fetchReviews();
    } catch { alert('Erro ao actualizar avaliação.'); }
  };

  const handleDeleteReview = async (reviewId: string) => {
    if (!onDeleteReview) return;
    // if (!confirm('Tem certeza que deseja eliminar esta avaliação?')) return;
    try {
      const { error } = await supabase.from('comentarios')
        .update({ deleted_at: new Date().toISOString() }).eq('id', reviewId);
      if (error) { alert('Erro ao eliminar avaliação.'); return; }

      // Atualizar localmente
      setReviews(prev => prev.filter(review => review.id !== reviewId));

      onDeleteReview(reviewId);
      await fetchReviews();
      setOpenMenuReviewId(null);
    } catch { alert('Erro ao eliminar avaliação.'); }
  };

  const handleEditImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach((file) => {
      if (editImages.length >= 4) return;
      const reader = new FileReader();
      reader.onloadend = () => setEditImages((prev) => [...prev, reader.result as string].slice(0, 4));
      reader.readAsDataURL(file);
    });
  };

  const canEditReview = (review: EventReview) => !!currentUserId && review.userId === currentUserId;

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('pt-PT', { day: 'numeric', month: 'long', year: 'numeric' });

  const StarRating = ({ rating, size = 'sm', interactive = false, onRate }: {
    rating: number; size?: 'sm' | 'md' | 'lg'; interactive?: boolean; onRate?: (r: number) => void;
  }) => {
    const sz = { sm: 'w-4 h-4', md: 'w-5 h-5', lg: 'w-6 h-6' }[size];
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star key={star}
            className={`${sz} ${star <= (interactive ? (hoveredStar || rating) : rating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'} ${interactive ? 'cursor-pointer hover:scale-110 transition-transform' : ''}`}
            onClick={() => interactive && onRate?.(star)}
            onMouseEnter={() => interactive && setHoveredStar(star)}
            onMouseLeave={() => interactive && setHoveredStar(null)}
          />
        ))}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div
            className="text-3xl font-bold text-orange-600 mb-4"
            style={{ animation: 'pulse 1.5s ease-in-out infinite' }}
          >
            <span className="text-gray-400">Cresce</span>.AO
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 sm:p-8">
      {/* Média de avaliações */}
      <div className="mb-8">
        <h3 className="text-2xl font-semibold text-gray-900 mb-4">Avaliações</h3>
        {averageRating !== undefined && reviews.length > 0 && (
          <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
            <div className="text-center">
              <div className="text-4xl font-bold text-gray-900">{averageRating.toFixed(1)}</div>
              <StarRating rating={Math.round(averageRating)} size="md" />
              <p className="text-sm text-gray-600 mt-1">{reviews.length} {reviews.length === 1 ? 'avaliação' : 'avaliações'}</p>
            </div>
            <div className="flex-1">
              {[5, 4, 3, 2, 1].map((stars) => {
                const count = reviews.filter((r) => r.rating === stars).length;
                const pct = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
                return (
                  <div key={stars} className="flex items-center gap-2 mb-1">
                    <span className="text-sm text-gray-600 w-8">{stars}★</span>
                    <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div className="h-full bg-yellow-400 transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-sm text-gray-600 w-8">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Formulário */}
      {currentUserId ? (
        <form onSubmit={handleSubmit} className="mb-8">
          <h4 className="font-semibold text-gray-900 mb-4">Deixe a sua avaliação</h4>
          <div className="flex items-center gap-3 mb-4">
            <span className="text-sm font-medium text-gray-600">Classificação:</span>
            <StarRating rating={newRating} size="lg" interactive onRate={setNewRating} />
          </div>
          <div className="relative rounded-full border border-orange-500/40 bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 shadow-lg shadow-black/30 focus-within:border-orange-500 transition-all duration-200 flex items-center gap-2 px-4 py-2.5">
            <div className="flex-shrink-0">
              <input type="file" accept="image/*" multiple onChange={handleImageUpload} className="hidden" id="image-upload" />
              <label htmlFor="image-upload" className="flex items-center justify-center w-7 h-7 rounded-full text-orange-300 hover:text-white hover:bg-orange-600 transition-all cursor-pointer" title="Adicionar imagem">
                <Plus className="w-5 h-5" />
              </label>
            </div>
            <textarea
              ref={textareaRef}
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Partilhe a sua experiência neste evento…"
              className="flex-1 bg-transparent text-orange-50 placeholder-orange-300/50 resize-none outline-none text-sm leading-relaxed py-0.5 min-h-[24px] max-h-[120px]"
              rows={1}
            />
            <div className="flex items-center flex-shrink-0">
              <button
                type="submit"
                disabled={(!newComment.trim() && !uploadedImages.length) || isSubmitting}
                className={`flex items-center justify-center w-8 h-8 rounded-full transition-all duration-200 ${(newComment.trim() || uploadedImages.length) && !isSubmitting ? 'bg-orange-500 hover:bg-orange-400 text-white shadow-md shadow-orange-900/60 hover:scale-105 active:scale-95' : 'bg-orange-900/60 text-orange-600/50 cursor-not-allowed'}`}
              >
                {isSubmitting ? <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
          {uploadedImages.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3 px-1">
              {uploadedImages.map((image, index) => (
                <div key={index} className="relative group w-14 h-14 flex-shrink-0">
                  <img src={image} alt={`Img ${index + 1}`} className="w-14 h-14 object-cover rounded-xl border-2 border-orange-500/30 cursor-pointer hover:border-orange-500 transition-colors" onClick={() => openGallery(uploadedImages, index)} />
                  <button type="button" className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-10 shadow" onClick={() => removeImage(index)}>
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </form>
      ) : (
        <div className="mb-8 p-4 bg-gray-50 rounded-lg text-center">
          <p className="text-gray-600"><a href="/login" className="text-orange-600 font-semibold hover:underline">Inicie sessão</a> para deixar uma avaliação.</p>
        </div>
      )}

      {/* Lista */}
      <div className="space-y-6">
        {reviews.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p>Ainda não há avaliações para este evento.</p>
            {currentUserId && <p className="mt-2">Seja o primeiro a avaliar!</p>}
          </div>
        ) : (
          reviews.map((review) => (
            <div key={review.id} className="border-b border-gray-200 pb-6 last:border-0 relative">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-3 mb-1">
                  <div className="w-10 h-10 bg-orange-600 rounded-full flex items-center justify-center text-white font-semibold">
                    {review.userName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{review.userName}</p>
                    <p className="text-sm text-gray-500">{formatDate(review.date)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <StarRating rating={review.rating} size="sm" />

                  {/* Botão de 3 pontos - apenas para dono do comentário */}
                  {canEditReview(review) && (
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuReviewId(openMenuReviewId === review.id ? null : review.id);
                        }}
                        className="p-1.5 rounded-full hover:bg-gray-100 transition-colors"
                      >
                        <MoreVertical className="w-4 h-4 text-gray-500" />
                      </button>

                      {openMenuReviewId === review.id && (
                        <div className="absolute right-0 mt-1 w-36 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                          <button
                            onClick={() => startEditReview(review)}
                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-orange-50 transition-colors rounded-t-lg"
                          >
                            <Edit2 className="w-4 h-4" />
                            Editar
                          </button>
                          <button
                            onClick={() => handleDeleteReview(review.id)}
                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors rounded-b-lg"
                          >
                            <Trash2 className="w-4 h-4" />
                            Eliminar
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <p className="text-gray-700 leading-relaxed ml-13">{review.comment}</p>

              {review.images && review.images.length > 0 && (
                <div className="mt-4 ml-13 grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {review.images.map((image, index) => (
                    <div key={index} className="relative group cursor-pointer overflow-hidden rounded-xl border-2 border-transparent hover:border-orange-400 transition-all" onClick={() => openGallery(review.images!, index)}>
                      <img src={image} alt={`Review ${index + 1}`} className="w-full h-24 object-cover group-hover:scale-105 transition-transform duration-200" onError={(e) => { (e.target as HTMLImageElement).src = 'https://via.placeholder.com/150?text=Erro'; }} />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-all flex items-center justify-center">
                        <ZoomIn className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow" />
                      </div>
                      {review.images!.length > 1 && index === 0 && (
                        <div className="absolute bottom-1.5 right-1.5 bg-black/60 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded-full">+{review.images!.length}</div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Botão de denúncia - apenas para usuários que não são donos do comentário */}
              {currentUserId && !canEditReview(review) && (
                <button onClick={() => setSelectedReportComment(review)} className="flex items-center gap-2 mt-4 ml-13 px-3 py-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium">
                  <AlertTriangle className="w-4 h-4" /> Denunciar
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {/* Modal de denúncia */}
      {selectedReportComment && currentUserId && currentUserType && (
        <ReportCommentModal
          commentId={selectedReportComment.id}
          currentUserId={currentUserId}
          currentUserType={currentUserType}
          onClose={() => setSelectedReportComment(null)}
          onReportSubmitted={() => alert('Denúncia enviada com sucesso!')}
        />
      )}

      {/* Gallery viewer */}
      {viewerImages.length > 0 && (
        <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4" onClick={closeGallery}>
          <button className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-all z-10" onClick={closeGallery}><X className="w-5 h-5" /></button>
          {viewerImages.length > 1 && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/50 text-white text-sm px-3 py-1 rounded-full z-10">{currentImageIndex + 1} / {viewerImages.length}</div>
          )}
          {viewerImages.length > 1 && (
            <button className="absolute left-3 sm:left-6 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-orange-600 text-white transition-all z-10" onClick={(e) => { e.stopPropagation(); prevImage(); }}><ChevronLeft className="w-6 h-6" /></button>
          )}
          <img key={currentImageIndex} src={viewerImages[currentImageIndex]} alt={`Imagem ${currentImageIndex + 1}`} className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl" onClick={(e) => e.stopPropagation()} onError={(e) => { (e.target as HTMLImageElement).src = 'https://via.placeholder.com/500?text=Erro'; }} style={{ animation: 'fadeIn .18s ease' }} />
          {viewerImages.length > 1 && (
            <button className="absolute right-3 sm:right-6 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-orange-600 text-white transition-all z-10" onClick={(e) => { e.stopPropagation(); nextImage(); }}><ChevronRight className="w-6 h-6" /></button>
          )}
          {viewerImages.length > 1 && (
            <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex gap-2">
              {viewerImages.map((_, i) => (
                <button key={i} className={`w-2 h-2 rounded-full transition-all ${i === currentImageIndex ? 'bg-orange-500 scale-125' : 'bg-white/40 hover:bg-white/70'}`} onClick={(e) => { e.stopPropagation(); setCurrentImageIndex(i); }} />
              ))}
            </div>
          )}
        </div>
      )}

      <style>{`@keyframes fadeIn { from { opacity:0; transform:scale(.97); } to { opacity:1; transform:scale(1); } }`}</style>

      {/* Edit modal */}
      {editingReviewId && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 sm:p-8 w-full max-w-2xl">
            <h4 className="font-semibold text-gray-900 mb-4">Editar avaliação</h4>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Classificação</label>
              <StarRating rating={editRating} size="lg" interactive onRate={setEditRating} />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Comentário</label>
              <textarea value={editComment} onChange={(e) => setEditComment(e.target.value)} placeholder="Partilhe a sua experiência…" className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none" rows={4} required />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Imagens (opcional)</label>
              <input type="file" accept="image/*" multiple onChange={handleEditImageUpload} className="hidden" id="edit-image-upload" />
              <label htmlFor="edit-image-upload" className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium cursor-pointer text-sm">
                <ImageIcon className="w-4 h-4" /> Adicionar imagens
              </label>
              {editImages.length > 0 && (
                <div className="mt-3 grid grid-cols-4 gap-3">
                  {editImages.map((img, i) => (
                    <div key={i} className="relative">
                      <img src={img} alt={`Edit img ${i + 1}`} className="w-full h-20 object-cover rounded-lg" />
                      <button type="button" className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors" onClick={() => setEditImages(editImages.filter((_, j) => j !== i))}>
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="flex gap-3">
              <button type="button" className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium" onClick={() => saveEdit(editingReviewId)}>
                <Check className="w-4 h-4" /> Guardar
              </button>
              <button type="button" className="flex items-center gap-2 px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium" onClick={cancelEdit}>
                <X className="w-5 h-5" /> Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {isEditMode && editingImageIndex !== null && (
        <ImageEditor image={uploadedImages[editingImageIndex]} onSave={handleSaveEditedImage} onCancel={() => { setEditingImageIndex(null); setIsEditMode(false); }} />
      )}
    </div>
  );
}