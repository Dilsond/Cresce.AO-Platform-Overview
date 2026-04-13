// netlify/functions/api.js
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

// ── Helper: resposta JSON ─────────────────────────────────────────────────────
const json = (statusCode, body) => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Accept, stripe-signature',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  },
  body: JSON.stringify(body),
});

// ── Handler principal ─────────────────────────────────────────────────────────
export const handler = async (event) => {
  const { httpMethod, path, body, headers } = event;

  // CORS preflight
  if (httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type, Accept, stripe-signature', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS' }, body: '' };
  }

  // Normalizar path: remover prefixo /.netlify/functions/api
  const cleanPath = path.replace('/.netlify/functions/api', '') || '/';

  // ── GET /check-availability/:eventoId/:estacaoNome ──────────────────────────
  if (httpMethod === 'GET' && cleanPath.startsWith('/check-availability/')) {
    try {
      const parts = cleanPath.split('/').filter(Boolean);
      // parts = ['check-availability', eventoId, estacaoNome]
      const eventoId    = parts[1];
      const estacaoNome = decodeURIComponent(parts[2] || '');

      const { data: evento, error } = await supabase
        .from('eventos').select('estacoes').eq('id', eventoId).single();

      if (error || !evento) return json(404, { error: 'Evento não encontrado' });

      const estacao = (evento.estacoes || []).find(e => e.nome === estacaoNome);
      if (!estacao) return json(404, { error: 'Estação não encontrada' });

      return json(200, { disponivel: estacao.quantidade > 0, quantidade: estacao.quantidade });
    } catch (err) {
      return json(500, { error: err.message });
    }
  }

  // ── POST /create-checkout-session ───────────────────────────────────────────
  if (httpMethod === 'POST' && cleanPath === '/create-checkout-session') {
    try {
      const data = JSON.parse(body || '{}');
      const { evento_id, estacao_nome, quantidade, usuario_id, usuario_email, usuario_nome, valor_total } = data;

      if (!evento_id || !estacao_nome || !quantidade || !usuario_id) {
        return json(400, { error: 'Dados incompletos' });
      }

      // Verificar disponibilidade
      const { data: evento } = await supabase
        .from('eventos').select('estacoes, nome_evento').eq('id', evento_id).single();

      if (!evento) return json(404, { error: 'Evento não encontrado' });

      const estacao = (evento.estacoes || []).find(e => e.nome === estacao_nome);
      if (!estacao || estacao.quantidade < quantidade) {
        return json(400, { error: `Apenas ${estacao?.quantidade || 0} ingresso(s) disponível(is)` });
      }

      // Criar pedido no Supabase com status pendente
      const pedidoId = crypto.randomUUID();
      const { error: pedidoError } = await supabase.from('pedidos').insert({
        id: pedidoId,
        evento_id,
        usuario_id,
        estacao_nome,
        quantidade,
        valor_total,
        status: 'pendente',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      if (pedidoError) return json(500, { error: pedidoError.message });

      // Criar sessão Stripe
      const baseUrl = process.env.URL || 'https://cresce-ao.netlify.app';
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{
          price_data: {
            currency: 'aoa',
            product_data: { name: `${evento.nome_evento} — ${estacao_nome}` },
            unit_amount: Math.round((estacao.preco * 100)),
          },
          quantity: quantidade,
        }],
        mode: 'payment',
        customer_email: usuario_email,
        success_url: `${baseUrl}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url:  `${baseUrl}/event/${evento_id}`,
        metadata: {
          pedido_id:    pedidoId,
          evento_id,
          estacao_nome,
          quantidade:   String(quantidade),
          usuario_id,
        },
      });

      // Guardar stripe_session_id no pedido
      await supabase.from('pedidos')
        .update({ stripe_session_id: session.id, updated_at: new Date().toISOString() })
        .eq('id', pedidoId);

      return json(200, { url: session.url, session_id: session.id });
    } catch (err) {
      console.error('Erro checkout:', err);
      return json(500, { error: err.message });
    }
  }

  // ── POST /stripe-webhook ────────────────────────────────────────────────────
  if (httpMethod === 'POST' && cleanPath === '/stripe-webhook') {
    const sig           = headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let stripeEvent;
    try {
      stripeEvent = stripe.webhooks.constructEvent(body, sig, webhookSecret);
    } catch (err) {
      return json(400, { error: `Webhook error: ${err.message}` });
    }

    if (stripeEvent.type === 'checkout.session.completed') {
      const session = stripeEvent.data.object;
      const meta    = session.metadata || {};

      // Confirmar pedido
      await supabase.from('pedidos').update({
        status: 'pago',
        stripe_payment_intent_id: session.payment_intent,
        pagamento_confirmado_em:  new Date().toISOString(),
        updated_at:               new Date().toISOString(),
      }).eq('stripe_session_id', session.id);

      // Reduzir ingressos disponíveis
      const { data: ev } = await supabase
        .from('eventos').select('estacoes').eq('id', meta.evento_id).single();

      if (ev?.estacoes) {
        const novasEstacoes = ev.estacoes.map(e =>
          e.nome === meta.estacao_nome
            ? { ...e, quantidade: e.quantidade - parseInt(meta.quantidade) }
            : e
        );
        await supabase.from('eventos')
          .update({ estacoes: novasEstacoes, updated_at: new Date().toISOString() })
          .eq('id', meta.evento_id);
      }

      // Gerar tickets
      const qtd = parseInt(meta.quantidade);
      for (let i = 0; i < qtd; i++) {
        const codigo = `TKT_${meta.evento_id.substring(0, 8)}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`.toUpperCase();
        await supabase.from('tickets').insert({
          pedido_id: meta.pedido_id,
          codigo,
          utilizado: false,
          created_at: new Date().toISOString(),
        });
      }
    }

    return json(200, { received: true });
  }

  // ── POST /validate-ticket ───────────────────────────────────────────────────
  if (httpMethod === 'POST' && cleanPath === '/validate-ticket') {
    try {
      const { codigo } = JSON.parse(body || '{}');
      if (!codigo) return json(400, { error: 'Código obrigatório' });

      const { data: ticket, error } = await supabase
        .from('tickets').select('*').eq('codigo', codigo).single();

      if (error || !ticket) return json(404, { valido: false, mensagem: 'Ticket não encontrado' });
      if (ticket.utilizado)  return json(200, { valido: false, mensagem: 'Ticket já utilizado' });

      await supabase.from('tickets')
        .update({ utilizado: true, utilizado_em: new Date().toISOString() })
        .eq('codigo', codigo);

      return json(200, { valido: true, mensagem: 'Ticket válido e marcado como utilizado' });
    } catch (err) {
      return json(500, { error: err.message });
    }
  }

  return json(404, { error: `Rota não encontrada: ${cleanPath}` });
};