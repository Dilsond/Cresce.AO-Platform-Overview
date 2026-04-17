// netlify/functions/api.js
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

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
  const { httpMethod, path, body, headers, queryStringParameters } = event;

  // CORS preflight
  if (httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type, Accept, stripe-signature', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS' }, body: '' };
  }

  // Normalizar path
  const cleanPath = path.replace('/.netlify/functions/api', '') || '/';
  console.log('🔍 Path:', cleanPath, 'Method:', httpMethod);

  // ── GET /invoice-data ───────────────────────────────────────────────────────
  if (httpMethod === 'GET' && cleanPath === '/invoice-data') {
    console.log('📊 Buscando dados da fatura');
    try {
      const session_id = queryStringParameters?.session_id;

      if (!session_id) {
        return json(400, { error: 'session_id é obrigatório' });
      }

      const session = await stripe.checkout.sessions.retrieve(session_id, {
        expand: ['line_items', 'customer_details']
      });

      const meta = session.metadata || {};
      const lineItem = session.line_items?.data?.[0];
      const qty = lineItem?.quantity || Number(meta.quantidade) || 1;
      const total = (session.amount_total || 0) / 100;

      let ticketCode = `${(meta.evento_id || 'EVT').substring(0, 8)}-${session.id.substring(3, 11)}`.toUpperCase();

      const { data: pedido } = await supabase
        .from('pedidos')
        .select('id')
        .eq('stripe_session_id', session_id)
        .single();

      if (pedido) {
        const { data: ticket } = await supabase
          .from('tickets')
          .select('codigo')
          .eq('pedido_id', pedido.id)
          .limit(1)
          .single();

        if (ticket) {
          ticketCode = ticket.codigo;
        }
      }

      return json(200, {
        session_id: session.id,
        evento_id: meta.evento_id || '',
        event_name: lineItem?.description || meta.estacao_nome || 'Evento',
        ticket_type: meta.estacao_nome || lineItem?.description || 'Ingresso',
        user_name: session.customer_details?.name || meta.usuario_nome || '',
        user_email: session.customer_details?.email || '',
        quantidade: qty,
        valor_total: total,
        created: session.created,
        ticket_code: ticketCode
      });

    } catch (err) {
      console.error('❌ Erro:', err);
      return json(500, { error: err.message });
    }
  }

  // ── GET /check-availability ─────────────────────────────────────────────────
  if (httpMethod === 'GET' && cleanPath.startsWith('/check-availability/')) {
    try {
      const parts = cleanPath.split('/').filter(Boolean);
      const eventoId = parts[1];
      const estacaoNome = decodeURIComponent(parts[2] || '');

      const { data: evento } = await supabase
        .from('eventos').select('estacoes').eq('id', eventoId).single();

      if (!evento) return json(404, { error: 'Evento não encontrado' });

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
      const { evento_id, itens, usuario_id, usuario_email, usuario_nome, valor_total, line_items } = data;

      if (!evento_id || !itens || !itens.length || !usuario_id) {
        return json(400, { error: 'Dados incompletos' });
      }

      // Verificar disponibilidade para todos os itens
      const { data: evento } = await supabase
        .from('eventos').select('estacoes, nome_evento').eq('id', evento_id).single();

      if (!evento) return json(404, { error: 'Evento não encontrado' });

      for (const item of itens) {
        const estacao = (evento.estacoes || []).find(e => e.nome === item.estacao_nome);
        if (!estacao || estacao.quantidade < item.quantidade) {
          return json(400, { error: `Ingressos insuficientes para ${item.estacao_nome}` });
        }
      }

      const pedidoId = crypto.randomUUID();

      // Criar pedido com todos os itens (como JSON)
      await supabase.from('pedidos').insert({
        id: pedidoId,
        evento_id,
        usuario_id,
        itens: itens, // Array de itens
        quantidade_total: itens.reduce((sum, i) => sum + i.quantidade, 0),
        valor_total,
        status: 'pendente',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      const frontendUrl = process.env.VITE_APP_URL || 'https://cresce-ao.netlify.app';
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: line_items || itens.map(item => ({
          price_data: {
            currency: 'aoa',
            product_data: { name: `${evento.nome_evento} — ${item.estacao_nome}` },
            unit_amount: Math.round((item.preco * 100)),
          },
          quantity: item.quantidade,
        })),
        mode: 'payment',
        customer_email: usuario_email,
        success_url: `${frontendUrl}/fatura.html?session_id={CHECKOUT_SESSION_ID}&evento_id=${evento_id}`,
        cancel_url: `${frontendUrl}/event/${evento_id}?payment_cancelled=true`,
        metadata: {
          pedido_id: pedidoId,
          evento_id,
          itens: JSON.stringify(itens),
          usuario_id,
        },
      });

      await supabase.from('pedidos')
        .update({ stripe_session_id: session.id })
        .eq('id', pedidoId);

      return json(200, { url: session.url, session_id: session.id });
    } catch (err) {
      console.error('Erro checkout:', err);
      return json(500, { error: err.message });
    }
  }

  // ── POST /stripe-webhook ────────────────────────────────────────────────────
  if (httpMethod === 'POST' && cleanPath === '/stripe-webhook') {
    const sig = headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let stripeEvent;
    try {
      stripeEvent = stripe.webhooks.constructEvent(body, sig, webhookSecret);
    } catch (err) {
      return json(400, { error: `Webhook error: ${err.message}` });
    }

    if (stripeEvent.type === 'checkout.session.completed') {
      const session = stripeEvent.data.object;
      const meta = session.metadata || {};

      await supabase.from('pedidos').update({
        status: 'pago',
        stripe_payment_intent_id: session.payment_intent,
        pagamento_confirmado_em: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq('stripe_session_id', session.id);

      const { data: ev } = await supabase
        .from('eventos').select('estacoes').eq('id', meta.evento_id).single();

      if (ev?.estacoes) {
        const novasEstacoes = ev.estacoes.map(e =>
          e.nome === meta.estacao_nome
            ? { ...e, quantidade: e.quantidade - parseInt(meta.quantidade) }
            : e
        );
        await supabase.from('eventos')
          .update({ estacoes: novasEstacoes })
          .eq('id', meta.evento_id);
      }

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

      const { data: ticket } = await supabase
        .from('tickets').select('*').eq('codigo', codigo).single();

      if (!ticket) return json(404, { valido: false, mensagem: 'Ticket não encontrado' });
      if (ticket.utilizado) return json(200, { valido: false, mensagem: 'Ticket já utilizado' });

      await supabase.from('tickets')
        .update({ utilizado: true, utilizado_em: new Date().toISOString() })
        .eq('codigo', codigo);

      return json(200, { valido: true, mensagem: 'Ticket válido' });
    } catch (err) {
      return json(500, { error: err.message });
    }
  }

  return json(404, { error: `Rota não encontrada: ${cleanPath}` });
};