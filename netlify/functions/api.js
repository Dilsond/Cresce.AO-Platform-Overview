import express from 'express';
import cors from 'cors';
import Stripe from 'stripe';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { createClient } from '@supabase/supabase-js';
import serverless from 'serverless-http';

dotenv.config();

// Configuração segura de __dirname para Netlify
const __dirname = process.cwd();

console.log('✅ Function API carregada | __dirname:', __dirname);

const app = express();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

app.use(cors({ origin: '*' }));
app.use((req, res, next) => {
  console.log(`[API] ${req.method} ${req.url}`);
  next();
});

// Webhook Stripe (raw body) - deve vir antes do json()
app.post('/api/stripe-webhook', express.raw({ type: 'application/json' }), handleStripeWebhook);

app.use(express.json());

// ==================== ROTAS ====================

app.get('/', (req, res) => res.json({ message: 'API Cresce.AO OK' }));

app.get('/health', (req, res) => res.json({ status: 'healthy' }));

// Rota de disponibilidade (a que estás a chamar)
app.get('/api/check-availability/:eventoId/:estacaoNome', async (req, res) => {
  try {
    const { eventoId, estacaoNome } = req.params;
    const nome = decodeURIComponent(estacaoNome);

    const { data: evento, error } = await supabase
      .from('eventos')
      .select('estacoes')
      .eq('id', eventoId)
      .single();

    if (error || !evento) return res.status(404).json({ error: 'Evento não encontrado' });

    const estacao = (evento.estacoes || []).find(e => e.nome === nome);
    if (!estacao) return res.status(404).json({ error: 'Estação não encontrada' });

    res.json({
      disponivel: estacao.quantidade > 0,
      quantidade: estacao.quantidade,
      nome: estacao.nome,
      preco: estacao.preco
    });
  } catch (err) {
    console.error('Erro check-availability:', err);
    res.status(500).json({ error: err.message });
  }
});

// Rota principal de checkout
app.post('/api/create-checkout-session', async (req, res) => {
  try {
    console.log('Recebido body:', req.body);

    const { evento_id, estacao_nome, quantidade, usuario_email, valor_total } = req.body;

    if (!evento_id || !estacao_nome || !quantidade || !valor_total) {
      return res.status(400).json({ error: 'Dados incompletos' });
    }

    const frontendUrl = process.env.FRONTEND_URL || 'https://cresce-ao.netlify.app';

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'aoa',
          product_data: { name: `${estacao_nome} - Evento` },
          unit_amount: Math.round((valor_total / quantidade) * 100),
        },
        quantity: quantidade,
      }],
      mode: 'payment',
      success_url: `${frontendUrl}/fatura?session_id={CHECKOUT_SESSION_ID}&evento_id=${evento_id}`,
      cancel_url: `${frontendUrl}/event/${evento_id}`,
      customer_email: usuario_email,
      metadata: req.body
    });

    res.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    console.error('Erro create-checkout-session:', error);
    res.status(500).json({ error: error.message });
  }
});

// Fatura (simplificada)
app.get('/fatura', (req, res) => {
  try {
    const filePath = join(__dirname, 'fatura.html');
    let html = readFileSync(filePath, 'utf-8');
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (err) {
    res.status(500).send('Erro ao carregar fatura');
  }
});

// ── Verificar disponibilidade ──────────────────────────────────────────────

app.get('/api/check-availability/:eventoId/:estacaoNome', async (req, res) => {
    try {
        const { eventoId, estacaoNome } = req.params;
        const nome = decodeURIComponent(estacaoNome);

        const { data: evento, error } = await supabase
            .from('eventos')
            .select('estacoes')
            .eq('id', eventoId)
            .single();

        if (error) return res.status(404).json({ error: 'Evento não encontrado' });

        const estacao = (evento.estacoes || []).find(e => e.nome === nome);
        if (!estacao) return res.status(404).json({ error: 'Estação não encontrada' });

        res.json({
            disponivel: estacao.quantidade > 0,
            quantidade: estacao.quantidade,
            nome: estacao.nome,
            preco: estacao.preco
        });

    } catch (err) {
        console.error('❌ Erro ao verificar disponibilidade:', err);
        res.status(500).json({ error: err.message });
    }
});

// ── Validar ticket ─────────────────────────────────────────────────────────

app.post('/api/validate-ticket', async (req, res) => {
    try {
        const { codigo } = req.body;
        if (!codigo) return res.status(400).json({ error: 'Código do ticket é obrigatório' });

        const { data: ticket, error } = await supabase
            .from('tickets')
            .select('*, pedidos(*)')
            .eq('codigo', codigo.toUpperCase())
            .single();

        if (error || !ticket) return res.status(404).json({ error: 'Ticket não encontrado' });

        if (ticket.utilizado) {
            return res.status(400).json({
                error: 'Ticket já utilizado',
                utilizado_em: ticket.utilizado_em
            });
        }

        const { error: updateError } = await supabase
            .from('tickets')
            .update({ utilizado: true, utilizado_em: new Date().toISOString() })
            .eq('id', ticket.id);

        if (updateError) return res.status(500).json({ error: 'Erro ao validar ticket' });

        res.json({
            success: true,
            message: 'Ticket validado com sucesso!',
            ticket: {
                codigo: ticket.codigo,
                evento_id: ticket.pedidos?.evento_id,
                estacao: ticket.pedidos?.estacao_nome
            }
        });

    } catch (err) {
        console.error('❌ Erro ao validar ticket:', err);
        res.status(500).json({ error: err.message });
    }
});

// ── Webhook do Stripe ──────────────────────────────────────────────────────

async function handleStripeWebhook(req, res) {
    const sig = req.headers['stripe-signature'];

    let event;
    try {
        event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
        console.error('❌ Assinatura do webhook inválida:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    console.log('📨 Webhook recebido:', event.type);

    if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        const meta = session.metadata || {};
        const evento_id = meta.evento_id;
        const estacao_nome = meta.estacao_nome;
        const quantidade = parseInt(meta.quantidade, 10);
        const usuario_id = meta.usuario_id || null;

        console.log('✅ Pagamento confirmado:', session.id, { evento_id, estacao_nome, quantidade });

        // ── 1. Atualizar pedido → "pago" ──────────────────────────────────
        const { data: pedido, error: pedidoError } = await supabase
            .from('pedidos')
            .update({
                status: 'pago',
                stripe_payment_intent_id: session.payment_intent,
                pagamento_confirmado_em: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .eq('stripe_session_id', session.id)
            .select()
            .single();

        if (pedidoError) {
            console.error('❌ Erro ao atualizar pedido:', pedidoError);
        } else {
            console.log('✅ Pedido atualizado:', pedido?.id);
        }

        // ── 2. Reduzir quantidade em eventos.estacoes ─────────────────────
        try {
            await reduzirIngressos(evento_id, estacao_nome, quantidade);
        } catch (err) {
            console.error('❌ Erro ao reduzir ingressos:', err.message);
            // Não falha o webhook — o pagamento já foi confirmado
        }

        // ── 3. Inserir em vendas_ingressos ────────────────────────────────
        const { error: vendaError } = await supabase
            .from('vendas_ingressos')
            .insert({
                evento_id,
                usuario_id,
                ingresso_nome: estacao_nome,
                quantidade,
                valor_total: Number(meta.valor_total) || (session.amount_total / 100),
                status: 'pago',
                stripe_payment_intent_id: session.payment_intent,
                stripe_session_id: session.id,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            });

        if (vendaError) {
            console.error('❌ Erro ao inserir venda:', vendaError);
        } else {
            console.log('✅ Venda registada em vendas_ingressos');
        }

        // ── 4. Gerar tickets individuais ──────────────────────────────────
        if (pedido) {
            const tickets = Array.from({ length: quantidade }, (_, i) => ({
                pedido_id: pedido.id,
                codigo: `${evento_id.substring(0, 8)}-${session.id.substring(3, 11)}-${i + 1}`.toUpperCase(),
                utilizado: false,
                created_at: new Date().toISOString()
            }));

            const { error: ticketError } = await supabase
                .from('tickets')
                .insert(tickets);

            if (ticketError) {
                console.error('❌ Erro ao gerar tickets:', ticketError);
            } else {
                console.log(`✅ ${quantidade} ticket(s) gerado(s)`);
            }
        }
    }

    res.json({ received: true });
}

// ── Start ──────────────────────────────────────────────────────────────────

// app.listen(PORT, () => {
//     console.log(`\n🚀 Servidor Cresce.AO em http://localhost:${PORT}`);
//     console.log(`   GET  /fatura?session_id=...`);
//     console.log(`   GET  /api/invoice?session_id=...`);
//     console.log(`   POST /api/create-checkout-session`);
//     console.log(`   POST /api/stripe-webhook`);
//     console.log(`   GET  /api/check-availability/:eventoId/:estacaoNome`);
//     console.log(`   POST /api/validate-ticket\n`);
// });

export const handler = serverless(app);