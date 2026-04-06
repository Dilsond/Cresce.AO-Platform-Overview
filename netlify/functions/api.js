import express from 'express';
import cors from 'cors';
import Stripe from 'stripe';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { join } from 'path';
import { createClient } from '@supabase/supabase-js';
import serverless from 'serverless-http';

dotenv.config();

const app = express();

// Configuração básica
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

// Middlewares
app.use(cors({ origin: '*' }));
app.use(express.json());

// Logging simples para debug
app.use((req, res, next) => {
  console.log(`[API ${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// ====================== ROTAS ======================

// Rota de teste
app.get('/', (req, res) => {
  res.json({ message: 'API Cresce.AO funcionando no Netlify!', status: 'ok' });
});

app.get('/health', (req, res) => res.json({ status: 'healthy' }));

// Verificar disponibilidade (a que estás a chamar no frontend)
app.get('/api/check-availability/:eventoId/:estacaoNome', async (req, res) => {
  try {
    const { eventoId, estacaoNome } = req.params;
    const nome = decodeURIComponent(estacaoNome);

    const { data: evento, error } = await supabase
      .from('eventos')
      .select('estacoes')
      .eq('id', eventoId)
      .single();

    if (error || !evento) {
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
      preco: estacao.preco || 0
    });
  } catch (err) {
    console.error('Erro em check-availability:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Criar sessão Stripe (simplificada para teste)
app.post('/api/create-checkout-session', async (req, res) => {
  try {
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
          product_data: { name: `${estacao_nome}` },
          unit_amount: Math.round((Number(valor_total) / Number(quantidade)) * 100),
        },
        quantity: Number(quantidade),
      }],
      mode: 'payment',
      success_url: `${frontendUrl}/fatura?session_id={CHECKOUT_SESSION_ID}&evento_id=${evento_id}`,
      cancel_url: `${frontendUrl}/event/${evento_id}`,
      customer_email: usuario_email,
      metadata: { ...req.body }
    });

    res.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    console.error('Erro create-checkout-session:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Fatura (usa process.cwd() para evitar problemas com paths)
app.get('/fatura', (req, res) => {
  try {
    const filePath = join(process.cwd(), 'netlify', 'functions', 'fatura.html');
    const html = readFileSync(filePath, 'utf-8');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (err) {
    console.error('Erro ao ler fatura.html:', err.message);
    res.status(500).send('Erro ao carregar a fatura.');
  }
});

// Webhook Stripe (declarado no final)
app.post('/api/stripe-webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  res.json({ received: true }); // placeholder por agora
});

// Export do handler (obrigatório)
export const handler = serverless(app);