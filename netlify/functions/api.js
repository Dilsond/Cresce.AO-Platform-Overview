const express = require('express');
const serverless = require('serverless-http');
const cors = require('cors');
const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');

// Configuração
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

const app = express();

// Middleware
app.use(cors({
    origin: ['https://cresce-ao.netlify.app', 'http://localhost:5173', 'http://localhost:3000'],
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Accept', 'stripe-signature']
}));

// Webhook precisa do raw body ANTES do JSON parser
app.post('/api/stripe-webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    try {
        const event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);

        if (event.type === 'checkout.session.completed') {
            const session = event.data.object;
            const meta = session.metadata || {};
            
            console.log('✅ Pagamento confirmado:', session.id);
            
            // Atualizar pedido
            await supabase
                .from('pedidos')
                .update({
                    status: 'pago',
                    stripe_payment_intent_id: session.payment_intent,
                    pagamento_confirmado_em: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
                .eq('stripe_session_id', session.id);
            
            // Reduzir ingressos
            const { data: evento } = await supabase
                .from('eventos')
                .select('estacoes')
                .eq('id', meta.evento_id)
                .single();
            
            if (evento && evento.estacoes) {
                const estacoes = evento.estacoes.map(e => {
                    if (e.nome === meta.estacao_nome) {
                        return { ...e, quantidade: e.quantidade - parseInt(meta.quantidade) };
                    }
                    return e;
                });
                
                await supabase
                    .from('eventos')
                    .update({ estacoes, updated_at: new Date().toISOString() })
                    .eq('id', meta.evento_id);
            }
        }
        
        res.json({ received: true });
    } catch (err) {
        console.error('Webhook Error:', err.message);
        res.status(400).send(`Webhook Error: ${err.message}`);
    }
});

// JSON parser para outras rotas
app.use(express.json());

// Rotas
app.get('/api/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

app.post('/api/create-checkout-session', async (req, res) => {
    try {
        const { evento_id, estacao_nome, quantidade, usuario_id, usuario_email, usuario_nome, valor_total } = req.body;

        if (!evento_id || !estacao_nome || !quantidade || !valor_total) {
            return res.status(400).json({ error: 'Dados incompletos' });
        }

        // Verificar disponibilidade
        const { data: evento, error: eventoError } = await supabase
            .from('eventos')
            .select('estacoes, nome_evento')
            .eq('id', evento_id)
            .single();

        if (eventoError) {
            return res.status(404).json({ error: 'Evento não encontrado' });
        }

        const estacao = (evento.estacoes || []).find(e => e.nome === estacao_nome);
        if (!estacao) {
            return res.status(400).json({ error: 'Estação não encontrada' });
        }

        if (estacao.quantidade < quantidade) {
            return res.status(400).json({ 
                error: `Apenas ${estacao.quantidade} ingresso(s) disponível(is)`
            });
        }

        const frontendUrl = process.env.FRONTEND_URL || 'https://cresce-ao.netlify.app';
        const apiUrl = process.env.API_URL || `https://${process.env.URL || 'localhost'}/.netlify/functions/api`;

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [{
                price_data: {
                    currency: 'aoa',
                    product_data: {
                        name: `${evento.nome_evento} - ${estacao_nome}`,
                        description: `${quantidade}x ingresso(s)`
                    },
                    unit_amount: Math.round((valor_total / quantidade) * 100)
                },
                quantity: quantidade
            }],
            mode: 'payment',
            success_url: `${frontendUrl}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${frontendUrl}/event/${evento_id}?payment_cancelled=true`,
            customer_email: usuario_email,
            metadata: {
                evento_id,
                usuario_id: usuario_id || '',
                usuario_nome: usuario_nome || '',
                estacao_nome,
                quantidade: String(quantidade),
                valor_total: String(valor_total)
            }
        });

        // Salvar pedido pendente
        const pedidoId = `pedido_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        
        await supabase
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

        res.json({ 
            sessionId: session.id, 
            url: session.url, 
            pedido_id: pedidoId 
        });

    } catch (error) {
        console.error('Erro ao criar sessão:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/check-availability/:eventoId/:estacaoNome', async (req, res) => {
    try {
        const { eventoId, estacaoNome } = req.params;
        const nome = decodeURIComponent(estacaoNome);

        const { data: evento, error } = await supabase
            .from('eventos')
            .select('estacoes')
            .eq('id', eventoId)
            .single();

        if (error) {
            return res.status(404).json({ error: 'Evento não encontrado' });
        }

        const estacao = (evento.estacoes || []).find(e => e.nome === nome);
        if (!estacao) {
            return res.status(404).json({ error: 'Estação não encontrada' });
        }

        res.json({
            disponivel: estacao.quantidade > 0,
            quantidade: estacao.quantidade,
            nome: estacao.nome,
            preco: estacao.preco
        });

    } catch (err) {
        console.error('Erro:', err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/validate-ticket', async (req, res) => {
    try {
        const { codigo } = req.body;
        
        if (!codigo) {
            return res.status(400).json({ error: 'Código do ticket é obrigatório' });
        }

        const { data: ticket, error } = await supabase
            .from('tickets')
            .select('*, pedidos(*)')
            .eq('codigo', codigo.toUpperCase())
            .single();

        if (error || !ticket) {
            return res.status(404).json({ error: 'Ticket não encontrado' });
        }

        if (ticket.utilizado) {
            return res.status(400).json({ 
                error: 'Ticket já utilizado',
                utilizado_em: ticket.utilizado_em
            });
        }

        await supabase
            .from('tickets')
            .update({ utilizado: true, utilizado_em: new Date().toISOString() })
            .eq('id', ticket.id);

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
        console.error('Erro:', err);
        res.status(500).json({ error: err.message });
    }
});

// Exportar a função serverless
exports.handler = serverless(app);