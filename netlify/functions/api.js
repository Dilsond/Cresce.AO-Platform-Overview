// netlify/functions/api.js
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import emailjs from '@emailjs/nodejs';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

// Configuração do EmailJS
const emailjsConfig = {
  publicKey: process.env.VITE_EMAILJS_PUBLIC_KEY,
  privateKey: process.env.EMAILJS_PRIVATE_KEY || process.env.VITE_EMAILJS_PUBLIC_KEY,
  serviceId: process.env.VITE_EMAILJS_SERVICE_ID,
  templateId: 'template_ticket', // Você precisa criar este template
};

// Função para enviar email de ingresso via EmailJS
async function sendTicketEmail(toEmail, toName, eventId, eventName, eventDate, eventTime, eventLocation, ticketCode, ticketEstacao) {
  const formattedDate = new Date(eventDate).toLocaleDateString('pt-PT', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });

  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(ticketCode)}`;
  const appUrl = process.env.VITE_APP_URL || 'https://cresce-ao.netlify.app';

  const templateParams = {
    to_email: toEmail,
    to_name: toName,
    evento_id: eventId,
    evento_nome: eventName,
    evento_data: formattedDate,
    evento_hora: eventTime,
    evento_local: eventLocation,
    ticket_codigo: ticketCode,
    ticket_estacao: ticketEstacao,
    qr_code_url: qrCodeUrl,
    app_url: appUrl,
    subject: `🎫 Seu ingresso para ${eventName} - Cresce.AO`,
  };

  console.log('📧 Enviando email para:', toEmail);
  console.log('📦 Template params:', templateParams);

  try {
    const response = await emailjs.send(
      emailjsConfig.serviceId,
      emailjsConfig.templateId,
      templateParams,
      {
        publicKey: emailjsConfig.publicKey,
        privateKey: emailjsConfig.privateKey,
      }
    );
    console.log('✅ Email enviado com sucesso:', response.status, response.text);
    return { success: true, response };
  } catch (error) {
    console.error('❌ Erro ao enviar email:', error);
    return { success: false, error: error.message };
  }
}

// Função auxiliar para respostas JSON
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
  const { httpMethod, path, body, headers, queryStringParameters } = event;

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

  // ── POST /stripe-webhook (com envio de email via EmailJS) ─────────────────
  if (httpMethod === 'POST' && cleanPath === '/stripe-webhook') {
    const sig = headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let stripeEvent;
    try {
      stripeEvent = stripe.webhooks.constructEvent(body, sig, webhookSecret);
    } catch (err) {
      console.error('Webhook signature error:', err.message);
      return json(400, { error: `Webhook error: ${err.message}` });
    }

    if (stripeEvent.type === 'checkout.session.completed') {
      const session = stripeEvent.data.object;
      const meta = session.metadata || {};

      console.log('💰 Pagamento confirmado para sessão:', session.id);

      // Buscar o pedido
      const { data: pedido, error: findError } = await supabase
        .from('pedidos')
        .select('*')
        .eq('stripe_session_id', session.id)
        .single();

      if (findError || !pedido) {
        console.error('Pedido não encontrado:', findError);
        return json(404, { error: 'Pedido não encontrado' });
      }

      // Atualizar pedido
      await supabase.from('pedidos').update({
        status: 'pago',
        stripe_payment_intent_id: session.payment_intent,
        pagamento_confirmado_em: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        usuario_nome: meta.usuario_nome || session.customer_details?.name || '',
        usuario_email: meta.usuario_email || session.customer_details?.email || '',
      }).eq('id', pedido.id);

      // Buscar evento
      const { data: evento } = await supabase
        .from('eventos')
        .select('id, nome_evento, data_evento, hora_evento, local')
        .eq('id', pedido.evento_id)
        .single();

      if (!evento) {
        console.error('Evento não encontrado:', pedido.evento_id);
        return json(404, { error: 'Evento não encontrado' });
      }

      // Processar itens
      let itemsToProcess = [];
      try {
        itemsToProcess = JSON.parse(pedido.itens_json || meta.itens_json || '[]');
      } catch {
        itemsToProcess = [{ estacao_nome: 'Ingresso', quantidade: pedido.quantidade_total || 1 }];
      }

      // Dados do usuário
      const usuarioEmail = pedido.usuario_email || session.customer_details?.email || meta.usuario_email;
      const usuarioNome = pedido.usuario_nome || session.customer_details?.name || meta.usuario_nome || 'Cliente';

      console.log('📧 Preparando envio de email para:', usuarioEmail);
      console.log('🎫 Itens:', itemsToProcess);

      if (usuarioEmail && evento) {
        // Gerar tickets e enviar emails
        for (const item of itemsToProcess) {
          for (let i = 0; i < item.quantidade; i++) {
            const codigo = `TKT_${pedido.evento_id.substring(0, 8)}_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`.toUpperCase();

            // Salvar ticket
            const { error: ticketError } = await supabase.from('tickets').insert({
              pedido_id: pedido.id,
              codigo,
              estacao: item.estacao_nome,
              utilizado: false,
              created_at: new Date().toISOString(),
            });

            if (ticketError) {
              console.error('Erro ao salvar ticket:', ticketError);
            } else {
              console.log('✅ Ticket salvo:', codigo);
            }

            // Enviar email para o primeiro ticket
            if (i === 0) {
              const emailResult = await sendTicketEmail(
                usuarioEmail,
                usuarioNome,
                evento.id,
                evento.nome_evento,
                evento.data_evento,
                evento.hora_evento,
                evento.local || 'Local a definir',
                codigo,
                item.estacao_nome
              );

              if (emailResult.success) {
                console.log('✅ Email enviado com sucesso para:', usuarioEmail);
              } else {
                console.error('❌ Falha ao enviar email:', emailResult.error);
              }
            }
          }
        }
      } else {
        console.warn('⚠️ Email do usuário não encontrado, não foi possível enviar o ingresso');
      }
    }

    return json(200, { received: true });
  }

  // ── GET /invoice-data ─────────────────────────────────────────────────────
  if (httpMethod === 'GET' && cleanPath === '/invoice-data') {
    try {
      const session_id = queryStringParameters?.session_id;

      if (!session_id) return json(400, { error: 'session_id obrigatório' });

      // Buscar pedido
      const { data: pedido, error: pedidoError } = await supabase
        .from('pedidos')
        .select('*')
        .eq('stripe_session_id', session_id)
        .single();

      if (pedidoError || !pedido) {
        console.error('Pedido não encontrado:', pedidoError);
        return json(404, { error: 'Pedido não encontrado' });
      }

      // Buscar evento
      const { data: evento } = await supabase
        .from('eventos')
        .select('nome_evento')
        .eq('id', pedido.evento_id)
        .single();

      // Buscar tickets
      const { data: tickets } = await supabase
        .from('tickets')
        .select('codigo, estacao')
        .eq('pedido_id', pedido.id);

      // Parsear itens
      let itens = [];
      try {
        itens = JSON.parse(pedido.itens_json || '[]');
      } catch {
        itens = [{ estacao_nome: 'Ingresso', quantidade: pedido.quantidade_total || 1, preco: pedido.valor_total / (pedido.quantidade_total || 1) }];
      }

      return json(200, {
        session_id,
        evento_id: pedido.evento_id,
        event_name: evento?.nome_evento || 'Evento',
        user_name: pedido.usuario_nome || 'Cliente',
        user_email: pedido.usuario_email || '',
        valor_total: pedido.valor_total,
        status: pedido.status,
        tickets: tickets || [],
        itens,
        created: Math.floor(new Date(pedido.created_at).getTime() / 1000),
      });
    } catch (err) {
      console.error('Erro invoice-data:', err);
      return json(500, { error: err.message });
    }
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

  return json(404, { error: `Rota não encontrada: ${cleanPath}` });
};

function getFaturaHTML() {
  return `<!DOCTYPE html>
<html lang="pt">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Fatura - Cresce.AO</title>
    <link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Mono:wght@300;400;500&display=swap" rel="stylesheet">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Syne', sans-serif;
            background: #FAFAF9;
            padding: 40px 20px;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
        }
        .container {
            max-width: 800px;
            width: 100%;
            background: white;
            border-radius: 20px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        .header {
            background: #0F0D0B;
            color: white;
            padding: 30px 40px;
        }
        .header h1 { font-size: 24px; font-weight: 700; }
        .header p { color: #78716C; margin-top: 5px; }
        .content { padding: 40px; }
        .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 1px solid #E7E5E4;
        }
        .info-item .label { font-size: 11px; text-transform: uppercase; color: #78716C; letter-spacing: 1px; margin-bottom: 5px; }
        .info-item .value { font-size: 16px; font-weight: 600; color: #1C1917; }
        .event-box {
            background: #FFF7F4;
            border: 1px solid #FFD5C2;
            border-radius: 16px;
            padding: 20px;
            margin-bottom: 30px;
        }
        .event-name { font-size: 18px; font-weight: 700; color: #1C1917; }
        .event-sub { font-size: 13px; color: #78716C; margin-top: 5px; }
        .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
        }
        .items-table th {
            text-align: left;
            padding: 10px 0;
            color: #78716C;
            font-size: 11px;
            text-transform: uppercase;
            border-bottom: 1px solid #E7E5E4;
        }
        .items-table td {
            padding: 12px 0;
            border-bottom: 1px solid #E7E5E4;
        }
        .items-table td:last-child { text-align: right; }
        .total-row {
            display: flex;
            justify-content: space-between;
            padding: 10px 0;
        }
        .total-final {
            border-top: 2px solid #1C1917;
            margin-top: 10px;
            padding-top: 15px;
            font-size: 20px;
            font-weight: 800;
        }
        .total-final span:last-child { color: #F15A2B; }
        .ticket {
            background: #F9FAFB;
            border-radius: 12px;
            padding: 15px;
            margin-top: 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .ticket-code { font-family: monospace; font-size: 14px; font-weight: bold; color: #F15A2B; }
        .status {
            display: inline-block;
            background: #DCFCE7;
            color: #16A34A;
            padding: 5px 15px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
        }
        .loading {
            text-align: center;
            padding: 60px;
            color: #78716C;
        }
        .error {
            text-align: center;
            padding: 60px;
            color: #DC2626;
        }
        @media (max-width: 600px) {
            .header, .content { padding: 20px; }
            .info-grid { grid-template-columns: 1fr; gap: 15px; }
        }
    </style>
</head>
<body>
    <div class="container" id="container">
        <div class="loading" id="loading">Carregando sua fatura...</div>
    </div>
    <script>
        const API_URL = window.location.origin + '/.netlify/functions/api';
        const params = new URLSearchParams(window.location.search);
        const sessionId = params.get('session_id') || '';
        const eventoId = params.get('evento_id') || '';

        async function loadInvoice() {
            if (!sessionId) {
                document.getElementById('container').innerHTML = '<div class="error">❌ Sessão não encontrada</div>';
                return;
            }
            
            try {
                const res = await fetch(\`\${API_URL}/invoice-data?session_id=\${sessionId}&evento_id=\${eventoId}\`);
                const data = await res.json();
                
                if (!res.ok) throw new Error(data.error);
                
                renderInvoice(data);
            } catch (err) {
                document.getElementById('container').innerHTML = \`<div class="error">❌ Erro: \${err.message}</div>\`;
            }
        }
        
        function renderInvoice(data) {
            const total = data.valor_total || 0;
            const itens = data.itens || [{ estacao_nome: 'Ingresso', quantidade: 1, preco: total }];
            
            let itemsHtml = '';
            itens.forEach(item => {
                const subtotal = (item.preco || 0) * (item.quantidade || 1);
                itemsHtml += \`
                    <tr>
                        <td>\${item.estacao_nome}</td>
                        <td>\${item.quantidade}x</td>
                        <td>\${(item.preco || 0).toLocaleString()} Kz</td>
                        <td>\${subtotal.toLocaleString()} Kz</td>
                    </tr>
                \`;
            });
            
            let ticketsHtml = '';
            if (data.tickets && data.tickets.length > 0) {
                data.tickets.forEach(ticket => {
                    ticketsHtml += \`
                        <div class="ticket">
                            <span>\${ticket.estacao || 'Ingresso'}</span>
                            <span class="ticket-code">\${ticket.codigo}</span>
                        </div>
                    \`;
                });
            }
            
            const html = \`
                <div class="header">
                    <h1>Cresce.AO</h1>
                    <p>Fatura de pagamento</p>
                </div>
                <div class="content">
                    <div class="info-grid">
                        <div class="info-item"><div class="label">Comprador</div><div class="value">\${data.user_name || '—'}</div></div>
                        <div class="info-item"><div class="label">Email</div><div class="value">\${data.user_email || '—'}</div></div>
                        <div class="info-item"><div class="label">Data</div><div class="value">\${new Date(data.created * 1000).toLocaleDateString('pt-PT')}</div></div>
                        <div class="info-item"><div class="label">Status</div><div class="value"><span class="status">PAGO</span></div></div>
                    </div>
                    
                    <div class="event-box">
                        <div class="event-name">\${data.event_name || 'Evento'}</div>
                        <div class="event-sub">ID: \${data.evento_id || '—'}</div>
                    </div>
                    
                    <table class="items-table">
                        <thead><tr><th>Descrição</th><th>Qtd</th><th>Unitário</th><th>Total</th></tr></thead>
                        <tbody>\${itemsHtml}</tbody>
                    </table>
                    
                    <div class="total-row"><span>Subtotal</span><span>\${total.toLocaleString()} Kz</span></div>
                    <div class="total-row total-final"><span>Total Pago</span><span>\${total.toLocaleString()} Kz</span></div>
                    
                    \${ticketsHtml ? \`<div style="margin-top: 30px;"><strong>Seus ingressos:</strong>\${ticketsHtml}</div>\` : ''}
                </div>
            \`;
            
            document.getElementById('container').innerHTML = html;
        }
        
        loadInvoice();
    </script>
</body>
</html>`;
}