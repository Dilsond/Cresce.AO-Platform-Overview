import { supabase } from '../lib/supabase';
import emailjs from '@emailjs/browser';

export interface Notification {
  id: string;
  usuario_id: string;
  tipo_usuario: 'user' | 'organizer';
  titulo: string;
  mensagem: string;
  tipo: string;
  lida: boolean;
  created_at: string;
}

export interface NotificationPreferences {
  email_novo_evento: boolean;
  email_novo_seguidor: boolean;
  push_novo_evento: boolean;
  push_novo_seguidor: boolean;
}

class NotificationService {
  private static instance: NotificationService;
  private emailJsInitialized = false;

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  private initEmailJs() {
    if (!this.emailJsInitialized) {
      const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;
      if (publicKey) {
        emailjs.init(publicKey);
        this.emailJsInitialized = true;
        // console.log('✅ EmailJS inicializado com sucesso');
      }
    }
  }

  private checkEmailConfig() {
    const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_NOTIFICATION_ID;
    const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_NOTIFICATION_ID;
    const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_NOTIFICATION_KEY;

    const isConfigured = !!(serviceId && templateId && publicKey);
    
    if (!isConfigured) {
      console.warn('⚠️ Configuração do EmailJS para notificações incompleta');
    }
    
    return isConfigured;
  }

  // Buscar notificações do usuário
  async getUserNotifications(userId: string, userType: 'user' | 'organizer'): Promise<Notification[]> {
    try {
      // console.log(`🔍 Buscando notificações para ${userType}:`, userId);
      
      const { data, error } = await supabase
        .from('notificacoes')
        .select('*')
        .eq('usuario_id', userId)
        .eq('tipo_usuario', userType)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('❌ Erro ao buscar notificações:', error);
      return [];
    }
  }

  // Marcar notificação como lida
  async markAsRead(notificationId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('notificacoes')
        .update({ lida: true })
        .eq('id', notificationId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('❌ Erro ao marcar notificação como lida:', error);
      return false;
    }
  }

  // Marcar todas como lidas
  async markAllAsRead(userId: string, userType: 'user' | 'organizer'): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('notificacoes')
        .update({ lida: true })
        .eq('usuario_id', userId)
        .eq('tipo_usuario', userType)
        .eq('lida', false);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('❌ Erro ao marcar todas notificações como lidas:', error);
      return false;
    }
  }

  // Contar notificações não lidas
  async countUnread(userId: string, userType: 'user' | 'organizer'): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('notificacoes')
        .select('*', { count: 'exact', head: true })
        .eq('usuario_id', userId)
        .eq('tipo_usuario', userType)
        .eq('lida', false);

      if (error) throw error;
      return count || 0;
    } catch (error) {
      console.error('❌ Erro ao contar notificações não lidas:', error);
      return 0;
    }
  }

  // Enviar notificação por email
  async sendEmailNotification(
    notification: Notification, 
    email: string, 
    nome: string
  ): Promise<{ success: boolean; message?: string }> {
    try {
      // Verificar preferências do usuário
      const prefs = await this.getUserPreferences(notification.usuario_id, notification.tipo_usuario);

      let deveEnviar = false;
      let assunto = '';

      if (notification.tipo === 'novo_evento' && prefs?.email_novo_evento !== false) {
        deveEnviar = true;
        assunto = '🎉 Novo Evento de um organizador que você segue!';
      } else if (notification.tipo === 'novo_seguidor' && prefs?.email_novo_seguidor !== false) {
        deveEnviar = true;
        assunto = '👥 Você ganhou um novo seguidor!';
      }

      if (!deveEnviar) {
        // console.log('ℹ️ Usuário optou por não receber este tipo de notificação');
        return { success: true, message: 'Notificação ignorada por preferência do usuário' };
      }

      // Em desenvolvimento, mostrar no console
      if (import.meta.env.DEV) {
        // console.log('📧 [DEV] Notificação:', {
          para: nome,
          email: email,
          assunto: assunto,
          titulo: notification.titulo,
          mensagem: notification.mensagem
        });
        
        // Mostrar alerta em desenvolvimento
        alert(`🔔 NOVA NOTIFICAÇÃO (DEV)\n\nPara: ${nome}\nAssunto: ${assunto}\n\n${notification.titulo}\n${notification.mensagem}`);
        
        return { success: true };
      }

      // Verificar configuração
      const isConfigured = this.checkEmailConfig();
      if (!isConfigured) {
        console.error('❌ EmailJS não configurado para notificações');
        return { success: false, message: 'Serviço de email não configurado' };
      }

      // Inicializar EmailJS
      this.initEmailJs();

      const templateParams = {
        to_email: email,
        to_name: nome,
        subject: assunto,
        titulo: notification.titulo,
        mensagem: notification.mensagem,
        reply_to: 'naoresponder@cresceao.com'
      };

      // // console.log('📧 Enviando email com params:', templateParams);

      const response = await emailjs.send(
        import.meta.env.VITE_EMAILJS_SERVICE_NOTIFICATION_ID,
        import.meta.env.VITE_EMAILJS_TEMPLATE_NOTIFICATION_ID,
        templateParams
      );

      // Log do envio
      await supabase
        .from('notificacoes_email_log')
        .insert({
          notificacao_id: notification.id,
          email_destino: email,
          assunto: assunto,
          enviado: true,
          erro: null
        });

      // console.log('✅ Email enviado com sucesso:', response);
      return { success: true };

    } catch (error: any) {
      console.error('❌ Erro ao enviar notificação por email:', error);
      
      // Log do erro
      await supabase
        .from('notificacoes_email_log')
        .insert({
          notificacao_id: notification.id,
          email_destino: email,
          assunto: notification.tipo === 'novo_evento' ? '🎉 Novo Evento!' : '👥 Novo Seguidor!',
          enviado: false,
          erro: error.message || 'Erro desconhecido'
        });

      return { success: false, message: error.message };
    }
  }

  // Buscar preferências do usuário
  async getUserPreferences(userId: string, userType: 'user' | 'organizer'): Promise<NotificationPreferences | null> {
    try {
      const { data, error } = await supabase
        .from('preferencias_notificacao')
        .select('*')
        .eq('usuario_id', userId)
        .eq('tipo_usuario', userType)
        .maybeSingle();

      if (error) {
        console.error('Erro ao buscar preferências:', error);
        return null;
      }
      
      // Se não existir, criar preferências padrão
      if (!data) {
        return await this.createDefaultPreferences(userId, userType);
      }

      return {
        email_novo_evento: data.email_novo_evento,
        email_novo_seguidor: data.email_novo_seguidor,
        push_novo_evento: data.push_novo_evento,
        push_novo_seguidor: data.push_novo_seguidor
      };
    } catch (error) {
      console.error('Erro ao buscar preferências:', error);
      return null;
    }
  }

  // Criar preferências padrão
  async createDefaultPreferences(userId: string, userType: 'user' | 'organizer'): Promise<NotificationPreferences> {
    const defaults = {
      usuario_id: userId,
      tipo_usuario: userType,
      email_novo_evento: true,
      email_novo_seguidor: true,
      push_novo_evento: true,
      push_novo_seguidor: true
    };

    try {
      const { error } = await supabase
        .from('preferencias_notificacao')
        .insert(defaults);

      if (error) {
        console.error('Erro ao criar preferências padrão:', error);
        return defaults;
      }

      return {
        email_novo_evento: true,
        email_novo_seguidor: true,
        push_novo_evento: true,
        push_novo_seguidor: true
      };
    } catch (error) {
      console.error('Erro ao criar preferências padrão:', error);
      return defaults;
    }
  }

  // Atualizar preferências
  async updatePreferences(
    userId: string, 
    userType: 'user' | 'organizer', 
    preferences: Partial<NotificationPreferences>
  ): Promise<boolean> {
    try {
      // Verificar se já existe
      const { data: existing } = await supabase
        .from('preferencias_notificacao')
        .select('id')
        .eq('usuario_id', userId)
        .eq('tipo_usuario', userType)
        .maybeSingle();

      if (existing) {
        // Atualizar existente
        const { error } = await supabase
          .from('preferencias_notificacao')
          .update({
            ...preferences,
            updated_at: new Date().toISOString()
          })
          .eq('usuario_id', userId)
          .eq('tipo_usuario', userType);

        if (error) throw error;
      } else {
        // Inserir novo
        const { error } = await supabase
          .from('preferencias_notificacao')
          .insert({
            usuario_id: userId,
            tipo_usuario: userType,
            ...preferences,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });

        if (error) throw error;
      }

      return true;
    } catch (error) {
      console.error('Erro ao atualizar preferências:', error);
      return false;
    }
  }
}

export const notificationService = NotificationService.getInstance();