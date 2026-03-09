import { useState, useRef, useEffect, useCallback } from 'react';
import { Star, Send, Image as ImageIcon, X, Edit2, Check, Trash2, ZoomIn, Plus, ChevronLeft, ChevronRight, Flag } from 'lucide-react';
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
  const [selectedImagePreview, setSelectedImagePreview] = useState<string | null>(null);
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Image editing states
  const [editingImageIndex, setEditingImageIndex] = useState<number | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);

  // Published images state
  const [publishedImageIndexes, setPublishedImageIndexes] = useState<Set<number>>(new Set());

  // Image gallery viewer state
  const [viewerImages, setViewerImages] = useState<string[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Tentar obter eventId da URL se não veio por prop
  useEffect(() => {
    if (propEventId) {
      setLocalEventId(propEventId);
    } else {
      // Tentar pegar da URL
      const pathParts = window.location.pathname.split('/');
      const lastPart = pathParts[pathParts.length - 1];
      if (lastPart && lastPart !== 'event-detail') {
        console.log('EventReviews - obtendo eventId da URL:', lastPart);
        setLocalEventId(lastPart);
      }
    }
  }, [propEventId]);

  // Log para debug
  useEffect(() => {
    console.log('EventReviews - currentUserId:', currentUserId);
    console.log('EventReviews - currentUserType:', currentUserType);
    console.log('EventReviews - currentUserName:', currentUserName);
    console.log('EventReviews - propEventId:', propEventId);
    console.log('EventReviews - localEventId:', localEventId);
  }, [currentUserId, currentUserType, currentUserName, propEventId, localEventId]);

  // Carregar reviews do banco
  useEffect(() => {
    if (localEventId) {
      fetchReviews();
    } else {
      console.warn('EventReviews - eventId não disponível para buscar reviews');
    }
  }, [localEventId]);

  const fetchReviews = async () => {
    if (!localEventId) {
      console.error('EventReviews - não é possível buscar reviews sem eventId');
      return;
    }

    try {
      setIsLoading(true);
      console.log('Buscando reviews para evento:', localEventId);

      const { data: comentarios, error } = await supabase
        .from('comentarios')
        .select(`
          id,
          descricao,
          avaliacao,
          imagem_url,
          created_at,
          updated_at,
          usuario_normal:usuarios_normais (
            id,
            nome_completo,
            nome_utilizador
          ),
          organizador:organizadores (
            id,
            nome_empresa
          )
        `)
        .eq('evento_id', localEventId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao buscar comentários:', error);
        return;
      }

      console.log('Comentários encontrados:', comentarios);

      // Formatar reviews
      const formattedReviews: EventReview[] = comentarios.map(com => {
        let userName = 'Usuário';
        let userId = '';

        if (com.usuario_normal) {
          userName = com.usuario_normal.nome_completo;
          userId = com.usuario_normal.id;
        } else if (com.organizador) {
          userName = com.organizador.nome_empresa;
          userId = com.organizador.id;
        }

        return {
          id: com.id,
          userId: userId,
          userName: userName,
          rating: com.avaliacao,
          comment: com.descricao,
          date: com.created_at,
          images: com.imagem_url ? [com.imagem_url] : []
        };
      });

      // Calcular média
      if (formattedReviews.length > 0) {
        const sum = formattedReviews.reduce((acc, r) => acc + r.rating, 0);
        setAverageRating(sum / formattedReviews.length);
      } else {
        setAverageRating(undefined);
      }

      setReviews(formattedReviews);

    } catch (err) {
      console.error('Erro ao buscar reviews:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const openGallery = useCallback((images: string[], startIndex = 0) => {
    setViewerImages(images);
    setCurrentImageIndex(startIndex);
  }, []);

  const closeGallery = useCallback(() => {
    setViewerImages([]);
    setCurrentImageIndex(0);
  }, []);

  const prevImage = useCallback(() => {
    setCurrentImageIndex(i => (i - 1 + viewerImages.length) % viewerImages.length);
  }, [viewerImages.length]);

  const nextImage = useCallback(() => {
    setCurrentImageIndex(i => (i + 1) % viewerImages.length);
  }, [viewerImages.length]);

  useEffect(() => {
    if (viewerImages.length === 0) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeGallery();
      if (e.key === 'ArrowLeft') prevImage();
      if (e.key === 'ArrowRight') nextImage();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [viewerImages.length, closeGallery, prevImage, nextImage]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 140)}px`;
    }
  }, [newComment]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      Array.from(files).forEach(file => {
        if (uploadedImages.length < 4) {
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64String = reader.result as string;
            setUploadedImages(prev => [...prev, base64String].slice(0, 4));
          };
          reader.readAsDataURL(file);
        }
      });
    }
  };

  const uploadImageToStorage = async (base64Image: string): Promise<string | null> => {
    try {
      const response = await fetch(base64Image);
      const blob = await response.blob();

      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;
      const filePath = fileName;

      const { error: uploadError } = await supabase.storage
        .from('review-images')
        .upload(filePath, blob, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('Erro ao fazer upload da imagem:', uploadError);
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('review-images')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (err) {
      console.error('Erro no upload:', err);
      return null;
    }
  };

  const removeImage = (index: number) => {
    setUploadedImages(uploadedImages.filter((_, i) => i !== index));
  };

  const startEditImage = (index: number) => {
    setEditingImageIndex(index);
    setIsEditMode(true);
  };

  const handleSaveEditedImage = (editedImage: string) => {
    if (editingImageIndex !== null) {
      const newImages = [...uploadedImages];
      newImages[editingImageIndex] = editedImage;
      setUploadedImages(newImages);
    }
    setEditingImageIndex(null);
    setIsEditMode(false);
  };

  const handleCancelEditImage = () => {
    setEditingImageIndex(null);
    setIsEditMode(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await submitReview();
  };

  const submitReview = async () => {
    if (!currentUserId) {
      alert('Você precisa estar logado para avaliar');
      return;
    }

    if (!localEventId) {
      alert('Erro: ID do evento não disponível');
      return;
    }

    if (!newComment.trim() && uploadedImages.length === 0) {
      return;
    }

    setIsSubmitting(true);

    try {
      let imageUrls: string[] = [];
      for (const image of uploadedImages) {
        const url = await uploadImageToStorage(image);
        if (url) {
          imageUrls.push(url);
        }
      }

      const insertData: any = {
        evento_id: localEventId,
        descricao: newComment,
        avaliacao: newRating,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      if (currentUserType === 'user') {
        insertData.usuario_normal_id = currentUserId;
      } else if (currentUserType === 'organizer') {
        insertData.organizador_id = currentUserId;
      }

      if (imageUrls.length > 0) {
        insertData.imagem_url = imageUrls[0];
      }

      console.log('Inserindo comentário:', insertData);

      const { data, error } = await supabase
        .from('comentarios')
        .insert([insertData])
        .select()
        .single();

      if (error) {
        console.error('Erro ao adicionar comentário:', error);
        alert('Erro ao publicar avaliação');
        return;
      }

      console.log('Comentário adicionado:', data);

      setNewComment('');
      setNewRating(5);
      setUploadedImages([]);
      setPublishedImageIndexes(new Set());

      await fetchReviews();

      if (onAddReview) {
        onAddReview(newRating, newComment, imageUrls);
      }

    } catch (err) {
      console.error('Erro ao publicar avaliação:', err);
      alert('Erro ao publicar avaliação');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submitReview();
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-PT', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const StarRating = ({ rating, size = 'sm', interactive = false, onRate }: {
    rating: number;
    size?: 'sm' | 'md' | 'lg';
    interactive?: boolean;
    onRate?: (rating: number) => void;
  }) => {
    const sizeClasses = {
      sm: 'w-4 h-4',
      md: 'w-5 h-5',
      lg: 'w-6 h-6'
    };

    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`${sizeClasses[size]} ${star <= (interactive ? (hoveredStar || rating) : rating)
              ? 'fill-yellow-400 text-yellow-400'
              : 'text-gray-300'
              } ${interactive ? 'cursor-pointer hover:scale-110 transition-transform' : ''}`}
            onClick={() => interactive && onRate && onRate(star)}
            onMouseEnter={() => interactive && setHoveredStar(star)}
            onMouseLeave={() => interactive && setHoveredStar(null)}
          />
        ))}
      </div>
    );
  };

  const startEditReview = (review: EventReview) => {
    setEditingReviewId(review.id);
    setEditRating(review.rating);
    setEditComment(review.comment);
    setEditImages(review.images || []);
  };

  const cancelEdit = () => {
    setEditingReviewId(null);
    setEditRating(5);
    setEditComment('');
    setEditImages([]);
  };

  const saveEdit = async (reviewId: string) => {
    if (!editComment.trim() || !onUpdateReview) return;

    try {
      let imageUrls = [...editImages];

      const { error } = await supabase
        .from('comentarios')
        .update({
          descricao: editComment,
          avaliacao: editRating,
          imagem_url: imageUrls[0] || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', reviewId);

      if (error) {
        console.error('Erro ao atualizar comentário:', error);
        alert('Erro ao atualizar avaliação');
        return;
      }

      onUpdateReview(reviewId, editRating, editComment, imageUrls);
      cancelEdit();
      await fetchReviews();

    } catch (err) {
      console.error('Erro ao atualizar avaliação:', err);
      alert('Erro ao atualizar avaliação');
    }
  };

  const handleDeleteReview = async (reviewId: string) => {
    if (!onDeleteReview) return;

    try {
      const { error } = await supabase
        .from('comentarios')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', reviewId);

      if (error) {
        console.error('Erro ao deletar comentário:', error);
        alert('Erro ao eliminar avaliação');
        return;
      }

      onDeleteReview(reviewId);
      await fetchReviews();

    } catch (err) {
      console.error('Erro ao eliminar avaliação:', err);
      alert('Erro ao eliminar avaliação');
    }
  };

  const handleEditImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      Array.from(files).forEach(file => {
        if (editImages.length < 4) {
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64String = reader.result as string;
            setEditImages(prev => [...prev, base64String].slice(0, 4));
          };
          reader.readAsDataURL(file);
        }
      });
    }
  };

  const removeEditImage = (index: number) => {
    setEditImages(editImages.filter((_, i) => i !== index));
  };

  const handlePublishImage = (index: number) => {
    setPublishedImageIndexes(new Set(publishedImageIndexes).add(index));
  };

  const isImagePublished = (index: number) => {
    return publishedImageIndexes.has(index);
  };

  const handleDeletePublishedImage = (index: number) => {
    const newPublishedSet = new Set(publishedImageIndexes);
    newPublishedSet.delete(index);
    setPublishedImageIndexes(newPublishedSet);
    setUploadedImages(uploadedImages.filter((_, i) => i !== index));
  };

  const canEditReview = (review: EventReview) => {
    return currentUserId && review.userId === currentUserId;
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6 sm:p-8">
        <div className="flex justify-center py-8">
          <div className="w-8 h-8 border-4 border-orange-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 sm:p-8">
      {/* Header com média de avaliações */}
      <div className="mb-8">
        <h3 className="text-2xl font-semibold text-gray-900 mb-4">Avaliações</h3>

        {averageRating && reviews.length > 0 && (
          <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
            <div className="text-center">
              <div className="text-4xl font-bold text-gray-900">{averageRating.toFixed(1)}</div>
              <StarRating rating={Math.round(averageRating)} size="md" />
              <p className="text-sm text-gray-600 mt-1">{reviews.length} {reviews.length === 1 ? 'avaliação' : 'avaliações'}</p>
            </div>

            {/* Distribuição de estrelas */}
            <div className="flex-1">
              {[5, 4, 3, 2, 1].map((stars) => {
                const count = reviews.filter(r => r.rating === stars).length;
                const percentage = reviews.length > 0 ? (count / reviews.length) * 100 : 0;

                return (
                  <div key={stars} className="flex items-center gap-2 mb-1">
                    <span className="text-sm text-gray-600 w-8">{stars}★</span>
                    <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-yellow-400 transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="text-sm text-gray-600 w-8">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Formulário para adicionar avaliação */}
      {currentUserId ? (
        <form onSubmit={handleSubmit} className="mb-8">
          <h4 className="font-semibold text-gray-900 mb-4">Deixe a sua avaliação</h4>

          <div className="flex items-center gap-3 mb-4">
            <span className="text-sm font-medium text-gray-600">Classificação:</span>
            <StarRating rating={newRating} size="lg" interactive onRate={setNewRating} />
          </div>

          <div className="relative rounded-full border border-orange-500/40 bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 shadow-lg shadow-black/30 focus-within:border-orange-500 focus-within:shadow-orange-500/10 transition-all duration-200 flex items-center gap-2 px-4 py-2.5">
            <div className="flex-shrink-0">
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageUpload}
                className="hidden"
                id="image-upload"
              />
              <label
                htmlFor="image-upload"
                className="flex items-center justify-center w-7 h-7 rounded-full text-orange-300 hover:text-white hover:bg-orange-600 transition-all cursor-pointer"
                title="Adicionar imagem"
              >
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
                disabled={(!newComment.trim() && uploadedImages.length === 0) || isSubmitting}
                className={`flex items-center justify-center w-8 h-8 rounded-full transition-all duration-200 ${(newComment.trim() || uploadedImages.length > 0) && !isSubmitting
                  ? 'bg-orange-500 hover:bg-orange-400 text-white shadow-md shadow-orange-900/60 hover:scale-105 active:scale-95'
                  : 'bg-orange-900/60 text-orange-600/50 cursor-not-allowed'
                  }`}
                title="Publicar avaliação (Enter)"
              >
                {isSubmitting ? (
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>

          {uploadedImages.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3 px-1">
              {uploadedImages.map((image, index) => (
                <div key={index} className="relative group w-14 h-14 flex-shrink-0">
                  <img
                    src={image}
                    alt={`Img ${index + 1}`}
                    className="w-14 h-14 object-cover rounded-xl border-2 border-orange-500/30 cursor-pointer hover:border-orange-500 transition-colors"
                    onClick={() => openGallery(uploadedImages, index)}
                  />
                  <div className="absolute inset-0 rounded-xl bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center pointer-events-none">
                    <ZoomIn className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <button
                    type="button"
                    className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-10 shadow"
                    onClick={() => removeImage(index)}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </form>
      ) : (
        <div className="mb-8 p-4 bg-gray-50 rounded-lg text-center">
          <p className="text-gray-600">
            <a href="/login" className="text-orange-600 font-semibold hover:underline">Inicie sessão</a> para deixar uma avaliação.
          </p>
        </div>
      )}

      {/* Lista de avaliações */}
      <div className="space-y-6">
        {reviews.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p>Ainda não há avaliações para este evento.</p>
            {currentUserId && <p className="mt-2">Seja o primeiro a avaliar!</p>}
          </div>
        ) : (
          reviews.map((review) => (
            <div key={review.id} className="border-b border-gray-200 pb-6 last:border-0">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <div className="w-10 h-10 bg-orange-600 rounded-full flex items-center justify-center text-white font-semibold">
                      {review.userName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{review.userName}</p>
                      <p className="text-sm text-gray-500">{formatDate(review.date)}</p>
                    </div>
                  </div>
                </div>
                <StarRating rating={review.rating} size="sm" />
              </div>
              <p className="text-gray-700 leading-relaxed ml-13">{review.comment}</p>
              {review.images && review.images.length > 0 && (
                <div className="mt-4 ml-13 grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {review.images.map((image, index) => (
                    <div
                      key={index}
                      className="relative group cursor-pointer overflow-hidden rounded-xl border-2 border-transparent hover:border-orange-400 transition-all"
                      onClick={() => openGallery(review.images!, index)}
                    >
                      <img
                        src={image}
                        alt={`Review ${index + 1}`}
                        className="w-full h-24 object-cover group-hover:scale-105 transition-transform duration-200"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://via.placeholder.com/150?text=Erro+ao+carregar';
                        }}
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-all flex items-center justify-center">
                        <ZoomIn className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow" />
                      </div>
                      {review.images!.length > 1 && index === 0 && (
                        <div className="absolute bottom-1.5 right-1.5 bg-black/60 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded-full">
                          +{review.images!.length}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {canEditReview(review) && (
                <div className="mt-4 ml-13 flex items-center gap-2">
                  <button
                    className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                    onClick={() => startEditReview(review)}
                  >
                    <Edit2 className="w-4 h-4" />
                    Editar Avaliação
                  </button>
                  {onDeleteReview && (
                    <button
                      className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                      onClick={() => handleDeleteReview(review.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                      Eliminar Avaliação
                    </button>
                  )}
                </div>
              )}
              {!canEditReview(review) && currentUserId && (
                <button
                  onClick={() => setSelectedReportComment(review)}
                  className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium"
                >
                  <Flag className="w-4 h-4" />
                  Denunciar
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {/* Image Preview Modal */}
      {selectedImagePreview && (
        <div
          className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedImagePreview(null)}
        >
          <button
            className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors"
            onClick={() => setSelectedImagePreview(null)}
          >
            <X className="w-8 h-8" />
          </button>
          <img
            src={selectedImagePreview}
            alt="Preview"
            className="max-w-full max-h-full object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* Modal de Denúncia */}
      {selectedReportComment && currentUserId && currentUserType && (
        <ReportCommentModal
          commentId={selectedReportComment.id}
          currentUserId={currentUserId}
          currentUserType={currentUserType}
          onClose={() => setSelectedReportComment(null)}
          onReportSubmitted={() => {
            alert('Denúncia enviada com sucesso! Obrigado por ajudar a manter a comunidade segura.');
          }}
        />
      )}

      {/* Gallery Viewer Modal */}
      {viewerImages.length > 0 && (
        <div
          className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4"
          onClick={closeGallery}
        >
          <button
            className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-all z-10"
            onClick={closeGallery}
          >
            <X className="w-5 h-5" />
          </button>

          {viewerImages.length > 1 && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/50 text-white text-sm px-3 py-1 rounded-full z-10">
              {currentImageIndex + 1} / {viewerImages.length}
            </div>
          )}

          {viewerImages.length > 1 && (
            <button
              className="absolute left-3 sm:left-6 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-orange-600 text-white transition-all z-10"
              onClick={(e) => { e.stopPropagation(); prevImage(); }}
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}

          <img
            key={currentImageIndex}
            src={viewerImages[currentImageIndex]}
            alt={`Imagem ${currentImageIndex + 1}`}
            className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'https://via.placeholder.com/500?text=Erro+ao+carregar';
            }}
            style={{ animation: 'fadeIn 0.18s ease' }}
          />

          {viewerImages.length > 1 && (
            <button
              className="absolute right-3 sm:right-6 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-orange-600 text-white transition-all z-10"
              onClick={(e) => { e.stopPropagation(); nextImage(); }}
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          )}

          {viewerImages.length > 1 && (
            <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex gap-2">
              {viewerImages.map((_, i) => (
                <button
                  key={i}
                  className={`w-2 h-2 rounded-full transition-all ${i === currentImageIndex ? 'bg-orange-500 scale-125' : 'bg-white/40 hover:bg-white/70'}`}
                  onClick={(e) => { e.stopPropagation(); setCurrentImageIndex(i); }}
                />
              ))}
            </div>
          )}
        </div>
      )}

      <style>{`@keyframes fadeIn { from { opacity: 0; transform: scale(0.97); } to { opacity: 1; transform: scale(1); } }`}</style>

      {/* Edit Review Form */}
      {editingReviewId && (
        <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-sm p-6 sm:p-8 w-full max-w-2xl">
            <h4 className="font-semibold text-gray-900 mb-4">Editar Avaliação</h4>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Classificação
              </label>
              <StarRating rating={editRating} size="lg" interactive onRate={setEditRating} />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Comentário
              </label>
              <textarea
                value={editComment}
                onChange={(e) => setEditComment(e.target.value)}
                placeholder="Partilhe a sua experiência neste evento..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
                rows={4}
                required
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Adicione imagens (opcional)
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleEditImageUpload}
                  className="hidden"
                  id="edit-image-upload"
                />
                <label
                  htmlFor="edit-image-upload"
                  className="flex items-center gap-2 px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium cursor-pointer"
                >
                  <ImageIcon className="w-4 h-4" />
                  Adicionar Imagens
                </label>
              </div>
              {editImages.length > 0 && (
                <div className="mt-4 grid grid-cols-4 gap-4">
                  {editImages.map((image, index) => (
                    <div key={index} className="relative">
                      <img
                        src={image}
                        alt={`Uploaded ${index + 1}`}
                        className="w-full h-20 object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 cursor-pointer hover:bg-red-600 transition-colors"
                        onClick={() => removeEditImage(index)}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center gap-4">
              <button
                type="button"
                className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                onClick={() => saveEdit(editingReviewId)}
              >
                <Check className="w-4 h-4" />
                Guardar Alterações
              </button>
              <button
                type="button"
                className="flex items-center gap-2 px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
                onClick={cancelEdit}
              >
                <X className="w-5 h-5" />
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Editor Modal */}
      {isEditMode && editingImageIndex !== null && (
        <ImageEditor
          image={uploadedImages[editingImageIndex]}
          onSave={handleSaveEditedImage}
          onCancel={handleCancelEditImage}
        />
      )}
    </div>
  );
}