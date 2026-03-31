import express from 'express';
import cors from 'cors';
import Stripe from 'stripe';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3002;
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
}));

app.use(express.json());

app.use((req, res, next) => {
  console.log(`📡 ${req.method} ${req.url}`);
  next();
});

app.get('/', (req, res) => {
  res.json({ message: 'Servidor Cresce.AO rodando!', status: 'ok' });
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', uptime: process.uptime() });
});

app.post('/api/create-checkout-session', async (req, res) => {
  console.log('📦 Recebido pedido de checkout:', req.body);

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

    // Cria sessão REAL no Stripe
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'aoa', // ✅ minúsculas
            product_data: {
              name: `${estacao_nome}`,
              description: `${quantidade}x ingresso(s) - Evento ID: ${evento_id}`,
            },
            unit_amount: Math.round((valor_total / quantidade) * 100), // centavos
          },
          quantity: quantidade,
        },
      ],
      mode: 'payment',
      success_url: `http://localhost:5173/event/${evento_id}?payment_success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `http://localhost:5173/event/${evento_id}?payment_cancelled=true`,
      customer_email: usuario_email,
      metadata: {
        evento_id,
        usuario_id,
        estacao_nome,
        quantidade: quantidade.toString(),
      },
    });

    console.log('✅ Sessão Stripe criada:', session.id);

    res.json({
      sessionId: session.id,
      url: session.url, // ✅ URL real do Stripe
      pedido_id: `pedido_${Date.now()}`
    });

  } catch (error) {
    console.error('❌ Erro ao criar sessão Stripe:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Webhook do Stripe (precisa do raw body)
app.post('/api/stripe-webhook',
  express.raw({ type: 'application/json' }),
  (req, res) => {
    const sig = req.headers['stripe-signature'];

    try {
      const event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );
      console.log('📨 Webhook recebido:', event.type);
      res.json({ received: true });
    } catch (err) {
      console.error('❌ Webhook error:', err.message);
      res.status(400).send(`Webhook Error: ${err.message}`);
    }
  }
);

app.listen(PORT, () => {
  console.log(`\n🚀 Servidor rodando em http://localhost:${PORT}\n`);
});