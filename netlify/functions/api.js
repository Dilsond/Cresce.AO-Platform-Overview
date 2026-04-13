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

// ── Helper: resposta HTML ─────────────────────────────────────────────────────
const html = (statusCode, content) => ({
  statusCode,
  headers: {
    'Content-Type': 'text/html; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
  },
  body: content,
});

// ── Handler principal ─────────────────────────────────────────────────────────
export const handler = async (event) => {
  const { httpMethod, path, body, headers, queryStringParameters } = event;

  // CORS preflight
  if (httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type, Accept, stripe-signature', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS' }, body: '' };
  }

  // Normalizar path: remover prefixo /.netlify/functions/api
  const cleanPath = path.replace('/.netlify/functions/api', '') || '/';
  console.log('🔍 Path:', cleanPath, 'Method:', httpMethod);

  // ── GET /fatura (página HTML) ───────────────────────────────────────────────
  if (httpMethod === 'GET' && cleanPath === '/fatura') {
    console.log('📄 Servindo página de fatura');
    
    const faturaHTML = `<!DOCTYPE html>
<html lang="pt">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Fatura — Cresce.AO</title>
    <link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Mono:wght@300;400;500&display=swap" rel="stylesheet" />
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        :root { --orange: #F15A2B; --orange-light: #FF7A4D; --dark: #0F0D0B; --ink: #1C1917; --muted: #78716C; --line: #E7E5E4; --bg: #FAFAF9; --white: #FFFFFF; --success: #16A34A; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
        body { font-family: 'Syne', sans-serif; background: var(--bg); color: var(--ink); min-height: 100vh; display: flex; flex-direction: column; align-items: center; padding: 40px 16px 80px; }
        .badge-wrap { animation: fadeUp 0.5s ease both; margin-bottom: 32px; }
        .badge { display: inline-flex; align-items: center; gap: 8px; background: #DCFCE7; color: var(--success); border: 1px solid #BBF7D0; border-radius: 999px; padding: 8px 20px; font-size: 13px; font-weight: 600; }
        .badge svg { width: 16px; height: 16px; }
        .card { width: 100%; max-width: 640px; background: var(--white); border: 1px solid var(--line); border-radius: 20px; overflow: hidden; animation: fadeUp 0.5s ease 0.1s both; box-shadow: 0 4px 40px rgba(0,0,0,.06); }
        .card-header { background: var(--dark); padding: 32px 40px; display: flex; align-items: center; justify-content: space-between; }
        .logo-name { color: #fff; font-size: 18px; font-weight: 700; }
        .invoice-num { font-family: 'DM Mono', monospace; color: rgba(255,255,255,.5); font-size: 12px; text-align: right; }
        .invoice-num strong { display: block; color: rgba(255,255,255,.9); font-size: 14px; margin-top: 2px; }
        .card-body { padding: 36px 40px; }
        .label { font-family: 'DM Mono', monospace; font-size: 10px; letter-spacing: .12em; text-transform: uppercase; color: var(--muted); margin-bottom: 6px; }
        .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; padding-bottom: 28px; border-bottom: 1px solid var(--line); margin-bottom: 28px; }
        .meta-item .value { font-size: 15px; font-weight: 600; color: var(--ink); }
        .event-box { background: #FFF7F4; border: 1px solid #FFD5C2; border-radius: 14px; padding: 20px 24px; margin-bottom: 28px; display: flex; align-items: center; gap: 16px; }
        .event-icon { width: 44px; height: 44px; background: var(--orange); border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .event-icon svg { width: 22px; height: 22px; color: #fff; }
        .event-name { font-size: 17px; font-weight: 700; color: var(--ink); }
        .event-sub { font-size: 13px; color: var(--muted); margin-top: 3px; }
        .items-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        .items-table thead th { font-family: 'DM Mono', monospace; font-size: 10px; letter-spacing: .1em; text-transform: uppercase; color: var(--muted); font-weight: 400; padding: 0 0 10px; text-align: left; border-bottom: 1px solid var(--line); }
        .items-table thead th:last-child { text-align: right; }
        .items-table tbody td { padding: 14px 0; border-bottom: 1px solid var(--line); font-size: 14px; vertical-align: middle; }
        .items-table tbody td:last-child { text-align: right; font-weight: 600; }
        .item-name { font-weight: 600; color: var(--ink); }
        .totals { margin-top: 4px; }
        .total-row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 14px; color: var(--muted); }
        .total-row.final { border-top: 2px solid var(--ink); margin-top: 8px; padding-top: 16px; font-size: 20px; font-weight: 800; color: var(--ink); }
        .total-row.final span:last-child { color: var(--orange); }
        .status-row { display: flex; align-items: center; justify-content: space-between; margin-top: 28px; padding: 16px 20px; background: var(--bg); border-radius: 12px; border: 1px solid var(--line); }
        .status-pill { display: inline-flex; align-items: center; gap: 6px; background: #DCFCE7; color: var(--success); border-radius: 999px; padding: 5px 14px; font-size: 12px; font-weight: 700; }
        .status-dot { width: 7px; height: 7px; background: var(--success); border-radius: 50%; }
        .card-footer { background: var(--bg); border-top: 1px solid var(--line); padding: 24px 40px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; }
        .footer-note { font-size: 12px; color: var(--muted); line-height: 1.6; }
        .footer-note strong { color: var(--ink); }
        .actions { max-width: 640px; width: 100%; display: flex; gap: 12px; margin-top: 24px; animation: fadeUp 0.5s ease 0.25s both; }
        .btn { flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 14px 20px; border-radius: 12px; font-family: 'Syne', sans-serif; font-size: 14px; font-weight: 700; cursor: pointer; border: none; transition: all .15s ease; text-decoration: none; }
        .btn-primary { background: var(--orange); color: #fff; }
        .btn-primary:hover { background: var(--orange-light); transform: translateY(-1px); }
        .btn-secondary { background: var(--white); color: var(--ink); border: 1.5px solid var(--line); }
        .qr-section { text-align: center; padding: 20px 0 4px; }
        .qr-box { display: inline-block; padding: 12px; background: #fff; border: 1.5px solid var(--line); border-radius: 12px; margin-bottom: 8px; }
        .qr-code-label { font-size: 11px; color: var(--muted); font-family: 'DM Mono', monospace; }
        @media (max-width: 520px) {
            .card-header, .card-body, .card-footer { padding-left: 24px; padding-right: 24px; }
            .meta-grid { grid-template-columns: 1fr; gap: 16px; }
            .actions { flex-direction: column; }
        }
        @media print { body { padding: 0; background: #fff; } .actions, .badge-wrap { display: none; } .card { box-shadow: none; border: none; } }
    </style>
</head>
<body>
    <div class="badge-wrap"><div class="badge"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>Pagamento confirmado</div></div>
    <div class="card">
        <div class="card-header"><div class="logo-mark"><span class="logo-name">Cresce.AO</span></div><div class="invoice-num">FATURA<strong id="invoiceNumber">—</strong></div></div>
        <div class="card-body">
            <div class="meta-grid">
                <div class="meta-item"><div class="label">Comprador</div><div class="value" id="userName">—</div></div>
                <div class="meta-item"><div class="label">Email</div><div class="value" id="userEmail">—</div></div>
                <div class="meta-item"><div class="label">Data</div><div class="value" id="invoiceDate">—</div></div>
                <div class="meta-item"><div class="label">Método de Pagamento</div><div class="value">Cartão de Crédito</div></div>
            </div>
            <div class="event-box"><div class="event-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg></div><div><div class="event-name" id="eventName">—</div><div class="event-sub" id="eventId">—</div></div></div>
            <table class="items-table"><thead><tr><th>Descrição</th><th>Qtd.</th><th>Unit.</th><th>Total</th></tr></thead><tbody id="lineItems"><tr><td><div class="item-name" id="ticketType">—</div></td><td id="qty">—</td><td id="unitPrice">—</td><td id="lineTotal">—</td></tr></tbody></table>
            <div class="totals"><div class="total-row"><span>Subtotal</span><span id="subtotal">—</span></div><div class="total-row"><span>Taxa de processamento</span><span>0 Kz</span></div><div class="total-row final"><span>Total Pago</span><span id="totalPaid">—</span></div></div>
            <div class="status-row"><span class="status-label">Estado do pagamento</span><span class="status-pill"><span class="status-dot"></span>PAGO</span></div>
            <div class="qr-section" id="qrSection" style="display:none;"><div class="label">Código do Ingresso</div><div class="qr-box"><canvas id="qrCanvas" width="120" height="120"></canvas></div><div class="qr-code-label" id="ticketCode">—</div></div>
        </div>
        <div class="card-footer"><div class="footer-note"><strong>Cresce.AO</strong><br>Este documento serve como comprovativo oficial de compra.<br>Guarda este ingresso para apresentar no evento.</div><div class="footer-note" style="text-align:right;"><strong id="sessionId">—</strong><br>Powered by Stripe</div></div>
    </div>
    <div class="actions"><button class="btn btn-primary" onclick="window.print()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>Imprimir / Salvar PDF</button><a class="btn btn-secondary" id="backBtn" href="/"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>Voltar ao Evento</a></div>
    <script>
        const API_URL = window.location.origin + '/.netlify/functions/api';
        const params = new URLSearchParams(window.location.search);
        const sessionId = params.get('session_id') || '';
        const eventoId = params.get('evento_id') || '';
        
        console.log('🔍 API_URL:', API_URL);
        console.log('🔍 sessionId:', sessionId);
        
        function fmt(value) { return Number(value).toLocaleString('pt-AO') + ' Kz'; }
        function fmtDate(ts) { const d = ts ? new Date(ts * 1000) : new Date(); return d.toLocaleDateString('pt-PT', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }
        function drawSimpleQR(canvas, text) { const img = new Image(); img.src = \`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=\${encodeURIComponent(text)}&bgcolor=ffffff&color=0f0d0b&margin=4\`; img.onload = () => { canvas.getContext('2d').drawImage(img, 0, 0, 120, 120); }; img.onerror = () => { const ctx = canvas.getContext('2d'); ctx.fillStyle = '#f5f5f4'; ctx.fillRect(0, 0, 120, 120); ctx.fillStyle = '#78716c'; ctx.font = '10px monospace'; ctx.textAlign = 'center'; ctx.fillText('QR indisponível', 60, 65); }; }
        
        async function loadInvoice() {
            if (!sessionId) {
                console.error('❌ session_id não encontrado na URL');
                document.getElementById('userName').textContent = 'Erro: sessão não encontrada';
                return;
            }
            
            try {
                const url = \`\${API_URL}/invoice-data?session_id=\${sessionId}&evento_id=\${eventoId}\`;
                console.log('📡 Buscando dados da fatura:', url);
                
                const res = await fetch(url);
                console.log('📡 Status:', res.status);
                
                if (!res.ok) throw new Error('Falha ao buscar dados');
                const data = await res.json();
                console.log('📦 Dados recebidos:', data);
                renderInvoice(data);
            } catch (err) {
                console.error('❌ Erro ao carregar fatura:', err);
                document.getElementById('userName').textContent = 'Erro ao carregar dados';
                document.getElementById('userEmail').textContent = err.message;
            }
        }
        
        function renderInvoice(d) {
            const qty = d.quantidade || 1;
            const total = d.valor_total || 0;
            const unitPrice = qty > 0 ? total / qty : total;
            const code = d.ticket_code || d.session_id?.substring(0, 16) || '—';
            const invNum = 'INV-' + (d.session_id || Date.now()).toString().substring(3, 13).toUpperCase();
            
            document.getElementById('invoiceNumber').textContent = invNum;
            document.getElementById('userName').textContent = d.user_name || '—';
            document.getElementById('userEmail').textContent = d.user_email || '—';
            document.getElementById('invoiceDate').textContent = fmtDate(d.created);
            document.getElementById('eventName').textContent = d.event_name || '—';
            document.getElementById('eventId').textContent = 'ID: ' + (d.evento_id || '—');
            document.getElementById('ticketType').textContent = d.ticket_type || 'Ingresso';
            document.getElementById('qty').textContent = qty + 'x';
            document.getElementById('unitPrice').textContent = fmt(unitPrice);
            document.getElementById('lineTotal').textContent = fmt(total);
            document.getElementById('subtotal').textContent = fmt(total);
            document.getElementById('totalPaid').textContent = fmt(total);
            document.getElementById('sessionId').textContent = (d.session_id || '').substring(0, 28) + '...';
            document.getElementById('ticketCode').textContent = code;
            
            const frontendUrl = window.location.origin;
            document.getElementById('backBtn').href = d.evento_id ? \`\${frontendUrl}/event/\${d.evento_id}\` : frontendUrl;
            
            if (code && code !== '—') {
                document.getElementById('qrSection').style.display = 'block';
                drawSimpleQR(document.getElementById('qrCanvas'), code);
            }
        }
        
        loadInvoice();
    </script>
</body>
</html>`;
    
    return html(200, faturaHTML);
  }

  // ── GET /invoice-data (dados JSON da fatura) ────────────────────────────────
  if (httpMethod === 'GET' && cleanPath === '/invoice-data') {
    console.log('📊 Buscando dados da fatura');
    try {
      const session_id = queryStringParameters?.session_id;
      const evento_id = queryStringParameters?.evento_id;
      
      console.log('📊 session_id:', session_id);
      
      if (!session_id) {
        return json(400, { error: 'session_id é obrigatório' });
      }
      
      // Buscar sessão no Stripe
      const session = await stripe.checkout.sessions.retrieve(session_id, {
        expand: ['line_items', 'customer_details']
      });
      
      console.log('✅ Sessão encontrada:', session.id);
      
      const meta = session.metadata || {};
      const lineItem = session.line_items?.data?.[0];
      const qty = lineItem?.quantity || Number(meta.quantidade) || 1;
      const total = (session.amount_total || 0) / 100;
      
      // Buscar pedido no Supabase para obter o código do ticket
      let ticketCode = `${(meta.evento_id || evento_id || 'EVT').substring(0, 8)}-${session.id.substring(3, 11)}`.toUpperCase();
      
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
        evento_id: meta.evento_id || evento_id || '',
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
      console.error('❌ Erro ao buscar dados da fatura:', err);
      return json(500, { error: err.message });
    }
  }

  // ── GET /check-availability/:eventoId/:estacaoNome ──────────────────────────
  if (httpMethod === 'GET' && cleanPath.startsWith('/check-availability/')) {
    try {
      const parts = cleanPath.split('/').filter(Boolean);
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

      const { data: evento } = await supabase
        .from('eventos').select('estacoes, nome_evento').eq('id', evento_id).single();

      if (!evento) return json(404, { error: 'Evento não encontrado' });

      const estacao = (evento.estacoes || []).find(e => e.nome === estacao_nome);
      if (!estacao || estacao.quantidade < quantidade) {
        return json(400, { error: `Apenas ${estacao?.quantidade || 0} ingresso(s) disponível(is)` });
      }

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

      const frontendUrl = process.env.VITE_APP_URL || 'https://cresce-ao.netlify.app';
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
        success_url: `${frontendUrl}/fatura?session_id={CHECKOUT_SESSION_ID}&evento_id=${evento_id}&estacao_nome=${encodeURIComponent(estacao_nome)}&quantidade=${quantidade}`,
        cancel_url:  `${frontendUrl}/event/${evento_id}?payment_cancelled=true`,
        metadata: {
          pedido_id:    pedidoId,
          evento_id,
          estacao_nome,
          quantidade:   String(quantidade),
          usuario_id,
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

      await supabase.from('pedidos').update({
        status: 'pago',
        stripe_payment_intent_id: session.payment_intent,
        pagamento_confirmado_em:  new Date().toISOString(),
        updated_at:               new Date().toISOString(),
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
          .update({ estacoes: novasEstacoes, updated_at: new Date().toISOString() })
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

  // Rota padrão - 404
  console.log('❌ Rota não encontrada:', cleanPath);
  return json(404, { error: `Rota não encontrada: ${cleanPath}` });
};