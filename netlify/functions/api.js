import express from 'express';
import cors from 'cors';
import serverless from 'serverless-http';

const app = express();

app.use(cors({ origin: '*' }));
app.use(express.json());

app.use((req, res, next) => {
  console.log(`[API] ${req.method} ${req.url}`);
  next();
});

// Rotas simples para teste
app.get('/', (req, res) => {
  res.json({ message: '✅ API funcionando no Netlify!', time: new Date().toISOString() });
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', message: 'Function OK' });
});

app.get('/api/check-availability/:eventoId/:estacaoNome', (req, res) => {
  res.json({
    disponivel: true,
    quantidade: 50,
    nome: decodeURIComponent(req.params.estacaoNome),
    message: 'Esta é uma resposta de teste (Supabase desativado temporariamente)'
  });
});

app.post('/api/create-checkout-session', (req, res) => {
  res.json({
    sessionId: 'test_session_' + Date.now(),
    url: 'https://cresce-ao.netlify.app/fatura?session_id=test',
    message: 'Checkout de teste (Stripe desativado temporariamente)'
  });
});

export const handler = serverless(app);