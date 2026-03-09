import emailjs from '@emailjs/browser';

// Configuração do EmailJS
const EMAILJS_SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID;
const EMAILJS_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
const EMAILJS_PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

interface EmailData {
  to_email: string;
  to_name: string;
  codigo: string;
  userType?: 'user' | 'organizer';
}

class EmailService {
  private static instance: EmailService;

  static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService();
      emailjs.init(EMAILJS_PUBLIC_KEY);
    }
    return EmailService.instance;
  }

  async sendRecoveryCode(emailData: EmailData): Promise<{ success: boolean; message?: string }> {
    try {
      console.log('📧 Enviando email para:', emailData.to_email);

      const templateParams = {
        to_email: emailData.to_email,
        to_name: emailData.to_name,
        codigo: emailData.codigo,
        user_type: emailData.userType === 'organizer' ? 'Organizador' : 'Usuário',
        subject: `🔐 Código de Recuperação de Senha - ${emailData.userType === 'organizer' ? 'Organizador' : 'Usuário'} - Cresce.AO`,
        reply_to: 'naoresponder@cresceao.com'
      };

      const response = await emailjs.send(
        EMAILJS_SERVICE_ID,
        EMAILJS_TEMPLATE_ID,
        templateParams
      );

      console.log('✅ Email enviado com sucesso:', response);

      return {
        success: true,
        message: 'Código enviado para seu email! Verifique sua caixa de entrada.'
      };

    } catch (error: any) {
      console.error('❌ Erro detalhado ao enviar email:', error);

      // Tratamento específico de erros
      let errorMessage = 'Erro ao enviar email. ';

      if (error?.text) {
        errorMessage += error.text;
      } else if (error?.message) {
        errorMessage += error.message;
      } else {
        errorMessage += 'Tente novamente mais tarde.';
      }

      return {
        success: false,
        message: errorMessage
      };
    }

  }

  // Método para testar a conexão
  async testConnection(): Promise<boolean> {
    try {
      await emailjs.send(
        EMAILJS_SERVICE_ID,
        EMAILJS_TEMPLATE_ID,
        {
          to_email: 'teste@email.com',
          to_name: 'Teste',
          codigo: '000000',
          subject: 'Teste de Conexão'
        }
      );
      return true;
    } catch (error) {
      console.error('❌ Erro na conexão:', error);
      return false;
    }
  }
}

export const emailService = EmailService.getInstance();