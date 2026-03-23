// src/services/emailService.ts
import emailjs from '@emailjs/browser';

class EmailService {
  private static instance: EmailService;
  private initialized = false;

  static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService();
    }
    return EmailService.instance;
  }

  private checkConfig() {
    const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID;
    const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
    const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

    if (!serviceId || !templateId || !publicKey) {
      console.warn('⚠️ Variáveis de ambiente do EmailJS não configuradas');
      return false;
    }

    if (!this.initialized) {
      emailjs.init(publicKey);
      this.initialized = true;
    }
    
    return true;
  }

  // Método para recuperação de senha
  async sendRecoveryCode(emailData: { 
    to_email: string; 
    to_name: string; 
    codigo: string; 
    userType?: string 
  }): Promise<{ success: boolean; message?: string }> {
    try {
      const isConfigured = this.checkConfig();
      
      if (!isConfigured) {
        console.log('⚠️ EmailJS não configurado. Código gerado:', emailData.codigo);
        if (import.meta.env.DEV) {
          alert(`🔐 CÓDIGO (DEV): ${emailData.codigo}\n\nEmailJS não configurado. Use este código para teste.`);
        }
        return { success: true };
      }

      const templateParams = {
        to_email: emailData.to_email,
        to_name: emailData.to_name,
        codigo: emailData.codigo,
        user_type: emailData.userType === 'organizer' ? 'Organizador' : 
                  emailData.userType === 'admin' ? 'Administrador' : 'Usuário',
        reply_to: 'naoresponder@cresceao.com'
      };

      const response = await emailjs.send(
        import.meta.env.VITE_EMAILJS_SERVICE_ID,
        import.meta.env.VITE_EMAILJS_TEMPLATE_ID,
        templateParams
      );

      console.log('✅ Email enviado com sucesso:', response);
      return { success: true };

    } catch (error: any) {
      console.error('❌ Erro ao enviar email:', error);
      return { success: false, message: error.message };
    }
  }

  // Método para notificações de seguidores e likes
  async sendNotification(data: {
    to_email: string;
    to_name: string;
    assunto: string;
    titulo: string;
    mensagem: string;
  }): Promise<{ success: boolean; message?: string }> {
    try {
      // Usar as mesmas configurações do serviço principal
      const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID;
      const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_NOTIFICATION_ID;
      const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

      if (!serviceId || !templateId || !publicKey) {
        console.warn('⚠️ EmailJS para notificações não configurado');
        
        if (import.meta.env.DEV) {
          console.log('📧 NOTIFICAÇÃO (DEV):', data);
          alert(`🔔 NOTIFICAÇÃO (DEV)\n\nPara: ${data.to_name}\nAssunto: ${data.assunto}\n\n${data.titulo}\n${data.mensagem}`);
        }
        
        return { success: true };
      }

      // Garantir que o EmailJS está inicializado
      if (!this.initialized) {
        emailjs.init(publicKey);
        this.initialized = true;
      }

      const templateParams = {
        to_email: data.to_email,
        to_name: data.to_name,
        subject: data.assunto,
        titulo: data.titulo,
        mensagem: data.mensagem,
        reply_to: 'naoresponder@cresceao.com'
      };

      console.log('📧 Enviando email de notificação:', {
        serviceId,
        templateId,
        to: data.to_email,
        subject: data.assunto
      });

      const response = await emailjs.send(
        serviceId,
        templateId,
        templateParams
      );

      console.log('✅ Notificação enviada com sucesso:', response);
      return { success: true };

    } catch (error: any) {
      console.error('❌ Erro ao enviar notificação:', error);
      
      // Em desenvolvimento, mostrar o erro mas não bloquear
      if (import.meta.env.DEV) {
        console.log('📧 NOTIFICAÇÃO (DEV - fallback):', data);
        alert(`🔔 NOTIFICAÇÃO (DEV)\n\nPara: ${data.to_name}\nAssunto: ${data.assunto}\n\n${data.titulo}\n${data.mensagem}`);
        return { success: true };
      }
      
      return { success: false, message: error.message };
    }
  }
}

export const emailService = EmailService.getInstance();