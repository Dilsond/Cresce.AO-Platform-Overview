// api/webhook.js
import Stripe from 'stripe';
import { supabase } from '../lib/supabase';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    
    // Atualizar status da venda
    const { data: venda } = await supabase
      .from('vendas_ingressos')
      .update({ status: 'pago' })
      .eq('stripe_session_id', session.id)
      .select()
      .single();

    if (venda) {
      // Buscar informações do evento e usuário
      const [evento, usuario] = await Promise.all([
        supabase.from('eventos').select('*').eq('id', venda.evento_id).single(),
        supabase.from('usuarios_normais').select('*').eq('id', venda.usuario_id).single(),
      ]);

      // Enviar email com ingresso para o comprador
      await sendTicketEmail({
        to: usuario.data.email,
        name: usuario.data.nome_completo,
        eventName: evento.data.nome_evento,
        ticketName: venda.ingresso_nome,
        quantidade: venda.quantidade,
        codigo: venda.codigo_ingresso,
        qrCode: generateQRCode(venda.codigo_ingresso),
      });

      // Enviar email para o organizador
      const { data: organizador } = await supabase
        .from('organizadores')
        .select('*')
        .eq('id', evento.data.organizador_id)
        .single();

      await sendNotificationEmail({
        to: organizador.email_empresa,
        name: organizador.nome_empresa,
        userName: usuario.data.nome_completo,
        eventName: evento.data.nome_evento,
        ticketName: venda.ingresso_nome,
        quantidade: venda.quantidade,
      });

      // Atualizar quantidade de ingressos disponíveis
      const ingressosAtuais = evento.data.ingressos;
      const ticketIndex = ingressosAtuais.findIndex((t: any) => t.nome === venda.ingresso_nome);
      if (ticketIndex !== -1) {
        ingressosAtuais[ticketIndex].quantidade -= venda.quantidade;
        await supabase
          .from('eventos')
          .update({ ingressos: ingressosAtuais })
          .eq('id', venda.evento_id);
      }
    }
  }

  res.json({ received: true });
}