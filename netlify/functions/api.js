// netlify/functions/api.js
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

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

export const handler = async (event) => {
  const { httpMethod, path, body, headers } = event;

  if (httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Accept, stripe-signature',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      },
      body: '',
    };
  }

  const cleanPath = path.replace('/.netlify/functions/api', '') || '/';

  // ── GET /check-availability/:eventoId/:estacaoNome ────────────────────────
  if (httpMethod === 'GET' && cleanPath.startsWith('/check-availability/')) {
    try {
      const parts = cleanPath.split('/').filter(Boolean);
      const eventoId = parts[1];
      const estNome = decodeURIComponent(parts[2] || '');

      const { data: ev, error } = await supabase
        .from('eventos').select('estacoes').eq('id', eventoId).single();
      if (error || !ev) return json(404, { error: 'Evento não encontrado' });

      const est = (ev.estacoes || []).find(e => e.nome === estNome);
      if (!est) return json(404, { error: 'Estação não encontrada' });

      return json(200, { disponivel: est.quantidade > 0, quantidade: est.quantidade });
    } catch (err) {
      return json(500, { error: err.message });
    }
  }

  // ── POST /create-checkout-session ─────────────────────────────────────────
  if (httpMethod === 'POST' && cleanPath === '/create-checkout-session') {
    try {
      const data = JSON.parse(body || '{}');
      const {
        evento_id,
        itens,           // [{ estacao_nome, quantidade, preco }]
        usuario_id,
        usuario_email,
        valor_total,
        // retrocompatibilidade item único
        estacao_nome,
        quantidade: qtdSingle,
      } = data;

      if (!evento_id || !usuario_id) return json(400, { error: 'Dados incompletos' });

      // Normalizar: aceitar array ou item único
      const itemsToProcess = itens?.length
        ? itens
        : [{ estacao_nome, quantidade: qtdSingle, preco: valor_total / (qtdSingle || 1) }];

      if (!itemsToProcess.length) return json(400, { error: 'Nenhum item no pedido' });

      // Verificar disponibilidade
      const { data: ev } = await supabase
        .from('eventos').select('estacoes, nome_evento').eq('id', evento_id).single();
      if (!ev) return json(404, { error: 'Evento não encontrado' });

      for (const item of itemsToProcess) {
        const est = (ev.estacoes || []).find(e => e.nome === item.estacao_nome);
        if (!est || est.quantidade < item.quantidade) {
          return json(400, {
            error: `Apenas ${est?.quantidade || 0} ingresso(s) disponível(is) para "${item.estacao_nome}"`,
          });
        }
      }

      // Criar pedido
      const pedidoId = crypto.randomUUID();
      const totalFinal = valor_total || itemsToProcess.reduce((s, i) => s + i.preco * i.quantidade, 0);

      const { error: pedidoError } = await supabase.from('pedidos').insert({
        id: pedidoId,
        evento_id,
        usuario_id,
        estacao_nome: itemsToProcess.map(i => i.estacao_nome).join(', '),
        quantidade: itemsToProcess.reduce((s, i) => s + i.quantidade, 0),
        valor_total: totalFinal,
        status: 'pendente',
        itens_json: JSON.stringify(itemsToProcess),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      if (pedidoError) return json(500, { error: pedidoError.message });

      // Line items para o Stripe — um por estação
      const lineItems = itemsToProcess.map(item => ({
        price_data: {
          currency: 'aoa',
          product_data: { name: `${ev.nome_evento} — ${item.estacao_nome}` },
          unit_amount: Math.round(item.preco * 100),
        },
        quantity: item.quantidade,
      }));

      const baseUrl = process.env.URL || 'https://cresce-ao.netlify.app';
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: lineItems,
        mode: 'payment',
        customer_email: usuario_email,
        success_url: `${baseUrl}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/event/${evento_id}`,
        metadata: {
          pedido_id: pedidoId,
          evento_id,
          usuario_id,
          itens_json: JSON.stringify(itemsToProcess),
        },
      });

      await supabase.from('pedidos')
        .update({ stripe_session_id: session.id, updated_at: new Date().toISOString() })
        .eq('id', pedidoId);

      return json(200, { url: session.url, session_id: session.id });
    } catch (err) {
      console.error('Erro checkout:', err);
      return json(500, { error: err.message });
    }
  }

  // ── POST /stripe-webhook ──────────────────────────────────────────────────
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

      // Processar itens
      let itemsToProcess = [];
      try {
        itemsToProcess = JSON.parse(meta.itens_json || '[]');
      } catch {
        if (meta.estacao_nome) {
          itemsToProcess = [{ estacao_nome: meta.estacao_nome, quantidade: parseInt(meta.quantidade || '1') }];
        }
      }

      if (itemsToProcess.length > 0) {
        // Reduzir ingressos de cada estação
        const { data: ev } = await supabase
          .from('eventos').select('estacoes').eq('id', meta.evento_id).single();

        if (ev?.estacoes) {
          const novasEstacoes = ev.estacoes.map(e => {
            const item = itemsToProcess.find(i => i.estacao_nome === e.nome);
            return item ? { ...e, quantidade: Math.max(0, e.quantidade - item.quantidade) } : e;
          });
          await supabase.from('eventos')
            .update({ estacoes: novasEstacoes, updated_at: new Date().toISOString() })
            .eq('id', meta.evento_id);
        }

        // Gerar um ticket por ingresso comprado
        for (const item of itemsToProcess) {
          for (let i = 0; i < item.quantidade; i++) {
            const codigo = `TKT_${meta.evento_id.substring(0, 8)}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`.toUpperCase();
            await supabase.from('tickets').insert({
              pedido_id: meta.pedido_id,
              codigo,
              estacao: item.estacao_nome,
              utilizado: false,
              created_at: new Date().toISOString(),
            });
          }
        }
      }
    }

    return json(200, { received: true });
  }

  // ── POST /validate-ticket ─────────────────────────────────────────────────
  if (httpMethod === 'POST' && cleanPath === '/validate-ticket') {
    try {
      const { codigo } = JSON.parse(body || '{}');
      if (!codigo) return json(400, { error: 'Código obrigatório' });

      const { data: ticket, error } = await supabase
        .from('tickets').select('*').eq('codigo', codigo).single();

      if (error || !ticket) return json(404, { valido: false, mensagem: 'Ticket não encontrado' });
      if (ticket.utilizado) return json(200, { valido: false, mensagem: 'Ticket já utilizado' });

      await supabase.from('tickets')
        .update({ utilizado: true, utilizado_em: new Date().toISOString() })
        .eq('codigo', codigo);

      return json(200, { valido: true, mensagem: 'Ticket válido e marcado como utilizado' });
    } catch (err) {
      return json(500, { error: err.message });
    }
  }

  // ── GET /invoice-data ─────────────────────────────────────────────────────
  if (httpMethod === 'GET' && cleanPath.startsWith('/invoice-data')) {
    try {
      const urlParams = new URLSearchParams(cleanPath.split('?')[1] || '');
      const session_id = urlParams.get('session_id');
      const evento_id = urlParams.get('evento_id');

      if (!session_id) return json(400, { error: 'session_id obrigatório' });

      // Buscar pedido pelo stripe_session_id
      const { data: pedido, error: pedidoError } = await supabase
        .from('pedidos')
        .select('*')
        .eq('stripe_session_id', session_id)
        .single();

      if (pedidoError || !pedido) {
        return json(404, { error: 'Pedido não encontrado' });
      }

      // Buscar evento
      const { data: evento } = await supabase
        .from('eventos')
        .select('nome_evento, organizador_id')
        .eq('id', pedido.evento_id)
        .single();

      // Buscar usuário
      const { data: userData } = await supabase.auth.admin.getUserById(pedido.usuario_id);

      // Buscar tickets do pedido
      const { data: tickets } = await supabase
        .from('tickets')
        .select('codigo, estacao')
        .eq('pedido_id', pedido.id);

      // Parsear itens
      let itens = [];
      try { itens = JSON.parse(pedido.itens_json || '[]'); } catch { }

      return json(200, {
        session_id,
        evento_id: pedido.evento_id,
        event_name: evento?.nome_evento || '—',
        user_name: userData?.user?.user_metadata?.name || userData?.user?.email || '—',
        user_email: userData?.user?.email || pedido.usuario_email || '—',
        ticket_type: pedido.estacao_nome || 'Ingresso',
        quantidade: pedido.quantidade,
        valor_total: pedido.valor_total,
        status: pedido.status,
        ticket_code: tickets?.[0]?.codigo || null,
        tickets: tickets || [],
        itens,
        created: Math.floor(new Date(pedido.created_at).getTime() / 1000),
      });
    } catch (err) {
      console.error('Erro invoice-data:', err);
      return json(500, { error: err.message });
    }
  }

  return json(404, { error: `Rota não encontrada: ${cleanPath}` });
};