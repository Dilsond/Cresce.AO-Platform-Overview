import cors from 'cors';
import Stripe from 'stripe';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createClient } from '@supabase/supabase-js';
import serverless from 'serverless-http';

dotenv.config();

const require = createRequire(import.meta.url);

// Solução robusta para __dirname em Netlify Functions (ESM)
let __dirname;
try {
    __dirname = dirname(fileURLToPath(import.meta.url));
} catch (err) {
    // Fallback para Netlify Functions
    __dirname = process.cwd();   // ou dirname(require.resolve('./api.js')) se necessário
    console.warn('⚠️  Usando fallback para __dirname:', __dirname);
}

const app = express();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

const corsOptions = {
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Accept', 'ngrok-skip-browser-warning', 'stripe-signature'],
    credentials: false
};

app.use(cors(corsOptions));

// Webhook Stripe - precisa de raw body (importante!)
app.post('/api/stripe-webhook', express.raw({ type: 'application/json' }), handleStripeWebhook);

app.use(express.json());

// ── Utilitário: reduzir ingressos atomicamente ────────────────────────────

async function reduzirIngressos(evento_id, estacao_nome, quantidade) {
    // Usar RPC para update atómico (evita race conditions)
    // Se não tiveres a função RPC, usamos a abordagem fetch + update
    const { data: evento, error: fetchError } = await supabase
        .from('eventos')
        .select('estacoes, ingressos')
        .eq('id', evento_id)
        .single();

    if (fetchError) throw new Error(`Evento não encontrado: ${fetchError.message}`);

    const estacoes = evento.estacoes || [];
    const idx = estacoes.findIndex(e => e.nome === estacao_nome);

    if (idx === -1) throw new Error(`Estação "${estacao_nome}" não encontrada`);

    const atual = estacoes[idx].quantidade;
    if (atual < quantidade) {
        throw new Error(`Ingressos insuficientes: disponível=${atual}, solicitado=${quantidade}`);
    }

    estacoes[idx].quantidade = atual - quantidade;

    const { error: updateError } = await supabase
        .from('eventos')
        .update({
            estacoes,
            updated_at: new Date().toISOString()
        })
        .eq('id', evento_id);

    if (updateError) throw new Error(`Erro ao atualizar evento: ${updateError.message}`);

    console.log(`✅ Ingressos reduzidos: ${estacao_nome} ${atual} → ${estacoes[idx].quantidade}`);
    return estacoes[idx].quantidade;
}

// ── Rotas básicas ──────────────────────────────────────────────────────────

app.get('/', (req, res) => {
    res.json({ message: 'Servidor Cresce.AO rodando!', status: 'ok' });
});

app.get('/health', (req, res) => {
    res.json({ status: 'healthy', uptime: process.uptime() });
});

// ── Criar sessão de checkout ───────────────────────────────────────────────

app.post('/api/create-checkout-session', async (req, res) => {
    try {
        const {
            evento_id,
            estacao_nome,
            quantidade,
            usuario_id,
            usuario_email,
            usuario_nome,
            valor_total
        } = req.body;

        if (!evento_id || !estacao_nome || !quantidade || !valor_total) {
            return res.status(400).json({ error: 'Dados incompletos' });
        }

        // Verificar disponibilidade
        const { data: evento, error: eventoError } = await supabase
            .from('eventos')
            .select('estacoes, nome_evento')
            .eq('id', evento_id)
            .single();

        if (eventoError) return res.status(404).json({ error: 'Evento não encontrado' });

        const estacoes = evento.estacoes || [];
        const estacao = estacoes.find(e => e.nome === estacao_nome);

        if (!estacao) return res.status(400).json({ error: 'Estação não encontrada' });

        if (estacao.quantidade < quantidade) {
            return res.status(400).json({
                error: `Apenas ${estacao.quantidade} ingresso(s) disponível(is) para "${estacao_nome}"`
            });
        }

        const appUrl = process.env.FRONTEND_URL || process.env.VITE_APP_URL || 'https://cresce-ao.netlify.app';
        const apiUrl = process.env.API_URL || `http://localhost:${PORT}`;

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
                {
                    price_data: {
                        currency: 'aoa',
                        product_data: {
                            name: `${evento.nome_evento || evento_id} — ${estacao_nome}`,
                            description: `${quantidade}x ingresso(s) · ${estacao_nome}`,
                        },
                        unit_amount: Math.round((valor_total / quantidade) * 100),
                    },
                    quantity: quantidade,
                },
            ],
            mode: 'payment',
            success_url: `${process.env.FRONTEND_URL || 'https://cresce-ao.netlify.app'}/fatura?session_id={CHECKOUT_SESSION_ID}&evento_id=${evento_id}&estacao_nome=${encodeURIComponent(estacao_nome)}&quantidade=${quantidade}`,
            cancel_url: `${appUrl}/event/${evento_id}?payment_cancelled=true`,
            customer_email: usuario_email,
            metadata: {
                evento_id,
                usuario_id: usuario_id || '',
                usuario_nome: usuario_nome || '',
                estacao_nome,
                quantidade: String(quantidade),
                valor_total: String(valor_total),
            },
        });

        // Salvar pedido como "pendente"
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

        if (insertError) {
            console.error('❌ Erro ao salvar pedido:', insertError);
        }

        res.json({ sessionId: session.id, url: session.url, pedido_id: pedidoId });

    } catch (error) {
        console.error('❌ Erro ao criar sessão Stripe:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// ── Fatura HTML ────────────────────────────────────────────────────────────

app.get('/fatura', (req, res) => {
    try {
        // Caminho correto dentro da function
        const filePath = join(__dirname, 'fatura.html');   // coloca o fatura.html dentro da pasta netlify/functions/

        let html = readFileSync(filePath, 'utf-8');

        const frontendUrl = process.env.FRONTEND_URL || 'https://cresce-ao.netlify.app';

        html = html
            .replace(/window\.CRESCE_API_URL\s*=\s*['"].*?['"]/i, `window.CRESCE_API_URL = ${JSON.stringify('/api')}`)
            .replace(/window\.CRESCE_FRONTEND_URL\s*=\s*['"].*?['"]/i, `window.CRESCE_FRONTEND_URL = ${JSON.stringify(frontendUrl)}`);

        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.send(html);
    } catch (err) {
        console.error('❌ Erro ao servir fatura:', err.message);
        res.status(500).send('Erro ao carregar a fatura.');
    }
});

// ── Dados JSON da fatura ───────────────────────────────────────────────────

app.get('/api/invoice', async (req, res) => {
    const { session_id, evento_id, estacao_nome, quantidade } = req.query;

    if (!session_id || session_id === '{CHECKOUT_SESSION_ID}') {
        return res.status(400).json({ error: 'session_id inválido' });
    }

    try {
        const session = await stripe.checkout.sessions.retrieve(session_id, {
            expand: ['line_items', 'customer_details'],
        });

        const meta = session.metadata || {};
        const lineItem = session.line_items?.data?.[0];
        const qty = lineItem?.quantity || Number(meta.quantidade) || Number(quantidade) || 1;
        const total = (session.amount_total || 0) / 100;

        res.json({
            session_id: session.id,
            evento_id: meta.evento_id || evento_id || '',
            event_name: lineItem?.description || meta.estacao_nome || 'Evento',
            ticket_type: meta.estacao_nome || estacao_nome || lineItem?.description || 'Ingresso',
            user_name: session.customer_details?.name || meta.usuario_nome || '',
            user_email: session.customer_details?.email || '',
            quantidade: qty,
            valor_total: total,
            created: session.created,
            ticket_code: `${(meta.evento_id || evento_id || 'EVT').substring(0, 8).toUpperCase()}-${session.id.substring(3, 11).toUpperCase()}`,
            status: session.payment_status,
        });

    } catch (err) {
        console.error('❌ Erro ao buscar sessão Stripe:', err.message);
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