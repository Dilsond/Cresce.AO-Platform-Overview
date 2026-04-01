import express from 'express';
import cors from 'cors';
import Stripe from 'stripe';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = 3002;
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// ── CRÍTICO: usar SERVICE ROLE KEY para ignorar RLS ───────────────────────
// No .env adiciona: SUPABASE_SERVICE_ROLE_KEY=eyJ...
// Encontras em: Supabase → Settings → API → service_role
const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

const usandoServiceRole = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
console.log(`🔑 Supabase: ${usandoServiceRole ? 'SERVICE ROLE KEY ✅' : 'ANON KEY ⚠️ — RLS pode bloquear updates!'}`);

const corsOptions = {
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Accept', 'ngrok-skip-browser-warning'],
    credentials: false
};

app.use(cors(corsOptions));

// Webhook ANTES do express.json()
app.post('/api/stripe-webhook', express.raw({ type: 'application/json' }), handleStripeWebhook);

app.use(express.json());

// ── Função central de redução ─────────────────────────────────────────────
async function reduzirIngressos(evento_id, estacao_nome, quantidade) {
    console.log(`\n🔽 reduzirIngressos("${evento_id}", "${estacao_nome}", ${quantidade})`);

    const { data: evento, error: fetchError } = await supabase
        .from('eventos')
        .select('id, estacoes')
        .eq('id', evento_id)
        .single();

    if (fetchError) throw new Error(`Evento não encontrado: ${fetchError.message}`);

    console.log('📦 Estações actuais:', JSON.stringify(evento.estacoes));

    const estacoes = evento.estacoes || [];
    const idx = estacoes.findIndex(e => e.nome === estacao_nome);

    if (idx === -1) throw new Error(`Estação "${estacao_nome}" não encontrada. Disponíveis: ${estacoes.map(e => e.nome).join(', ')}`);

    const antes = estacoes[idx].quantidade;
    if (antes < quantidade) throw new Error(`Ingressos insuficientes: disponível=${antes}, solicitado=${quantidade}`);

    estacoes[idx] = { ...estacoes[idx], quantidade: antes - quantidade };

    const { data: updated, error: updateError } = await supabase
        .from('eventos')
        .update({ estacoes, updated_at: new Date().toISOString() })
        .eq('id', evento_id)
        .select('estacoes');

    if (updateError) throw new Error(`Update falhou: ${updateError.message} (code: ${updateError.code})`);

    console.log(`✅ ${estacao_nome}: ${antes} → ${estacoes[idx].quantidade}`);
    console.log('📦 Estações após update:', JSON.stringify(updated?.[0]?.estacoes));

    return estacoes[idx].quantidade;
}

// ── Rotas básicas ──────────────────────────────────────────────────────────

app.get('/', (req, res) => res.json({ status: 'ok', serviceRole: usandoServiceRole }));
app.get('/health', (req, res) => res.json({ status: 'healthy', uptime: process.uptime(), serviceRole: usandoServiceRole }));

// ── ROTA DE DEBUG (remove em produção) ───────────────────────────────────
app.post('/api/debug-reduzir', async (req, res) => {
    const { evento_id, estacao_nome, quantidade } = req.body;
    if (!evento_id || !estacao_nome || !quantidade) {
        return res.status(400).json({ error: 'evento_id, estacao_nome e quantidade são obrigatórios' });
    }
    try {
        const novaQtd = await reduzirIngressos(evento_id, estacao_nome, Number(quantidade));
        res.json({ success: true, novaQuantidade: novaQtd });
    } catch (err) {
        console.error('❌ debug-reduzir:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// ── Criar sessão de checkout ───────────────────────────────────────────────

app.post('/api/create-checkout-session', async (req, res) => {
    try {
        const { evento_id, estacao_nome, quantidade, usuario_id, usuario_email, usuario_nome, valor_total } = req.body;

        if (!evento_id || !estacao_nome || !quantidade || !valor_total) {
            return res.status(400).json({ error: 'Dados incompletos' });
        }

        const { data: evento, error: eventoError } = await supabase
            .from('eventos')
            .select('estacoes, nome_evento')
            .eq('id', evento_id)
            .single();

        if (eventoError) return res.status(404).json({ error: 'Evento não encontrado' });

        const estacao = (evento.estacoes || []).find(e => e.nome === estacao_nome);
        if (!estacao) return res.status(400).json({ error: 'Estação não encontrada' });
        if (estacao.quantidade < quantidade) {
            return res.status(400).json({ error: `Apenas ${estacao.quantidade} ingresso(s) disponível(is)` });
        }

        const appUrl = process.env.FRONTEND_URL || process.env.VITE_APP_URL || 'http://localhost:3000';
        const apiUrl = process.env.API_URL || `http://localhost:${PORT}`;

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [{
                price_data: {
                    currency: 'aoa',
                    product_data: {
                        name: `${evento.nome_evento || evento_id} — ${estacao_nome}`,
                        description: `${quantidade}x ingresso(s) · ${estacao_nome}`,
                    },
                    unit_amount: Math.round((valor_total / quantidade) * 100),
                },
                quantity: quantidade,
            }],
            mode: 'payment',
            success_url: `${apiUrl}/fatura?session_id={CHECKOUT_SESSION_ID}&evento_id=${evento_id}&estacao_nome=${encodeURIComponent(estacao_nome)}&quantidade=${quantidade}`,
            cancel_url: `${appUrl}/event/${evento_id}?payment_cancelled=true`,
            customer_email: usuario_email,
            metadata: {
                evento_id,
                usuario_id:   usuario_id   || '',
                usuario_nome: usuario_nome || '',
                estacao_nome,
                quantidade:   String(quantidade),
                valor_total:  String(valor_total),
            },
        });

        const pedidoId = `pedido_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        const { error: insertError } = await supabase
            .from('pedidos')
            .insert({
                id: pedidoId,
                evento_id,
                usuario_id: usuario_id || null,
                estacao_nome,
                quantidade,
                valor_total,
                status: 'pendente',
                stripe_session_id: session.id,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            });

        if (insertError) console.error('❌ Erro ao salvar pedido:', insertError);

        res.json({ sessionId: session.id, url: session.url, pedido_id: pedidoId });

    } catch (error) {
        console.error('❌ create-checkout-session:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// ── Fatura ─────────────────────────────────────────────────────────────────

app.get('/fatura', (req, res) => {
    try {
        const filePath = join(__dirname, 'public', 'fatura.html');
        let html = readFileSync(filePath, 'utf-8');
        const apiUrl      = process.env.API_URL      || `http://localhost:${PORT}`;
        const frontendUrl = process.env.FRONTEND_URL || process.env.VITE_APP_URL || 'http://localhost:3000';
        html = html
            .replace("window.CRESCE_API_URL = 'http://localhost:3002';",      `window.CRESCE_API_URL = ${JSON.stringify(apiUrl)};`)
            .replace("window.CRESCE_FRONTEND_URL = 'http://localhost:3000';", `window.CRESCE_FRONTEND_URL = ${JSON.stringify(frontendUrl)};`);
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.send(html);
    } catch (err) {
        res.status(500).send('Erro ao carregar a fatura.');
    }
});

app.get('/api/invoice', async (req, res) => {
    const { session_id, evento_id, estacao_nome, quantidade } = req.query;
    if (!session_id || session_id === '{CHECKOUT_SESSION_ID}') return res.status(400).json({ error: 'session_id inválido' });
    try {
        const session = await stripe.checkout.sessions.retrieve(session_id, { expand: ['line_items', 'customer_details'] });
        const meta     = session.metadata || {};
        const lineItem = session.line_items?.data?.[0];
        const qty      = lineItem?.quantity || Number(meta.quantidade) || Number(quantidade) || 1;
        res.json({
            session_id:  session.id,
            evento_id:   meta.evento_id || evento_id || '',
            ticket_type: meta.estacao_nome || estacao_nome || 'Ingresso',
            user_name:   session.customer_details?.name  || meta.usuario_nome || '',
            user_email:  session.customer_details?.email || '',
            quantidade:  qty,
            valor_total: (session.amount_total || 0) / 100,
            created:     session.created,
            ticket_code: `${(meta.evento_id || 'EVT').substring(0, 8).toUpperCase()}-${session.id.substring(3, 11).toUpperCase()}`,
            status:      session.payment_status,
        });
    } catch (err) {
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
        console.error('❌ Webhook signature inválida:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    console.log('📨 Webhook:', event.type);

    if (event.type === 'checkout.session.completed') {
        const session      = event.data.object;
        const meta         = session.metadata || {};
        const evento_id    = meta.evento_id;
        const estacao_nome = meta.estacao_nome;
        const quantidade   = parseInt(meta.quantidade, 10);
        const usuario_id   = meta.usuario_id || null;

        // 1. Pedido → pago
        const { data: pedido, error: pedidoError } = await supabase
            .from('pedidos')
            .update({
                status:                   'pago',
                stripe_payment_intent_id: session.payment_intent,
                pagamento_confirmado_em:  new Date().toISOString(),
                updated_at:               new Date().toISOString()
            })
            .eq('stripe_session_id', session.id)
            .select()
            .single();

        if (pedidoError) console.error('❌ Actualizar pedido:', pedidoError);

        // 2. Reduzir ingressos
        try {
            await reduzirIngressos(evento_id, estacao_nome, quantidade);
        } catch (err) {
            console.error('❌ Reduzir ingressos:', err.message);
        }

        // 3. Vendas
        await supabase.from('vendas_ingressos').insert({
            evento_id,
            usuario_id,
            ingresso_nome:            estacao_nome,
            quantidade,
            valor_total:              Number(meta.valor_total) || (session.amount_total / 100),
            status:                   'pago',
            stripe_payment_intent_id: session.payment_intent,
            stripe_session_id:        session.id,
            created_at:               new Date().toISOString(),
            updated_at:               new Date().toISOString()
        });

        // 4. Tickets
        if (pedido) {
            const tickets = Array.from({ length: quantidade }, (_, i) => ({
                pedido_id:  pedido.id,
                codigo:     `${evento_id.substring(0, 8)}-${session.id.substring(3, 11)}-${i + 1}`.toUpperCase(),
                utilizado:  false,
                created_at: new Date().toISOString()
            }));
            await supabase.from('tickets').insert(tickets);
        }
    }

    res.json({ received: true });
}

// ── Verificar disponibilidade ──────────────────────────────────────────────

app.get('/api/check-availability/:eventoId/:estacaoNome', async (req, res) => {
    try {
        const nome = decodeURIComponent(req.params.estacaoNome);
        const { data: evento, error } = await supabase
            .from('eventos').select('estacoes').eq('id', req.params.eventoId).single();
        if (error) return res.status(404).json({ error: 'Evento não encontrado' });
        const estacao = (evento.estacoes || []).find(e => e.nome === nome);
        if (!estacao) return res.status(404).json({ error: 'Estação não encontrada' });
        res.json({ disponivel: estacao.quantidade > 0, quantidade: estacao.quantidade, nome: estacao.nome, preco: estacao.preco });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── Validar ticket ─────────────────────────────────────────────────────────

app.post('/api/validate-ticket', async (req, res) => {
    try {
        const { codigo } = req.body;
        if (!codigo) return res.status(400).json({ error: 'Código obrigatório' });
        const { data: ticket, error } = await supabase
            .from('tickets').select('*, pedidos(*)').eq('codigo', codigo.toUpperCase()).single();
        if (error || !ticket) return res.status(404).json({ error: 'Ticket não encontrado' });
        if (ticket.utilizado) return res.status(400).json({ error: 'Ticket já utilizado', utilizado_em: ticket.utilizado_em });
        await supabase.from('tickets').update({ utilizado: true, utilizado_em: new Date().toISOString() }).eq('id', ticket.id);
        res.json({ success: true, ticket: { codigo: ticket.codigo, evento_id: ticket.pedidos?.evento_id, estacao: ticket.pedidos?.estacao_nome } });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── Start ──────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
    console.log(`\n🚀 Servidor Cresce.AO em http://localhost:${PORT}`);
    console.log(`   POST /api/debug-reduzir  ← DEBUG (remove em produção!)`);
    console.log(`   POST /api/create-checkout-session`);
    console.log(`   POST /api/stripe-webhook`);
    console.log(`   GET  /api/check-availability/:id/:estacao`);
    console.log(`   GET  /fatura & /api/invoice\n`);
});