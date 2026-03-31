// api/create-checkout-session.js (para Next.js) ou similar
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { eventId, eventName, ticketName, quantidade, price, userId, userEmail, userName } = req.body;

    // Criar sessão de checkout
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'aOA',
            product_data: {
              name: `${eventName} - ${ticketName}`,
              description: `${quantidade}x ingresso(s) para o evento`,
            },
            unit_amount: price * 100, // Stripe trabalha com centavos
          },
          quantity: quantidade,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.FRONTEND_URL}/event/${eventId}?payment_success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/event/${eventId}?payment_cancelled=true`,
      customer_email: userEmail,
      metadata: {
        eventId,
        userId,
        ticketName,
        quantidade: quantidade.toString(),
      },
    });

    // Salvar informações da venda no banco
    const { supabase } = await import('../lib/supabase');
    await supabase.from('vendas_ingressos').insert({
      evento_id: eventId,
      usuario_id: userId,
      tipo_usuario: 'user',
      ingresso_nome: ticketName,
      quantidade,
      valor_total: price * quantidade,
      status: 'pendente',
      stripe_session_id: session.id,
      codigo_ingresso: `${eventId.substring(0, 8)}-${Date.now()}`,
    });

    res.status(200).json({ sessionId: session.id });
  } catch (err) {
    console.error('Erro ao criar sessão:', err);
    res.status(500).json({ error: err.message });
  }
}