import { supabase } from './supabase';

// Função para obter URL pública de forma segura
export const getPublicFileUrl = (bucket: string, path: string): string => {
  if (!path) return '';
  
  // Se já é uma URL completa
  if (path.startsWith('http')) {
    // Se for URL do Supabase com assinatura, converter para pública
    if (path.includes('supabase.co') && path.includes('/sign/')) {
      const publicPath = path.split('/sign/')[1]?.split('?')[0];
      if (publicPath) {
        const { data } = supabase.storage.from(bucket).getPublicUrl(publicPath);
        return data.publicUrl;
      }
    }
    return path;
  }
  
  // Gerar URL pública
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
};

// Funções específicas
export const getEventImageUrl = (imagePath: string): string => {
  if (!imagePath) {
    return 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800';
  }
  return getPublicFileUrl('event-images', imagePath);
};

export const getEventVideoUrl = (videoPath: string): string => {
  if (!videoPath) return '';
  return getPublicFileUrl('event-videos', videoPath);
};

export const getEventPdfUrl = (pdfPath: string): string => {
  if (!pdfPath) return '';
  return getPublicFileUrl('event-pdfs', pdfPath);
};

// Função para fazer upload de arquivos
export const uploadFile = async (
  file: File,
  bucket: string,
  path?: string
): Promise<string | null> => {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = path || `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    
    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });
    
    if (uploadError) {
      console.error(`Erro ao fazer upload para ${bucket}:`, uploadError);
      throw uploadError;
    }
    
    const { data } = supabase.storage.from(bucket).getPublicUrl(fileName);
    return data.publicUrl;
    
  } catch (err) {
    console.error('Erro no upload:', err);
    return null;
  }
};

// Função para deletar arquivo
export const deleteFile = async (bucket: string, path: string): Promise<boolean> => {
  try {
    const { error } = await supabase.storage.from(bucket).remove([path]);
    if (error) throw error;
    return true;
  } catch (err) {
    console.error('Erro ao deletar arquivo:', err);
    return false;
  }
};