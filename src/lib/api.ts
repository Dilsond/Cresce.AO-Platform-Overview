// Determinar a URL da API baseado no ambiente
const getApiUrl = () => {
  // Em produção no Netlify, usar as functions
  if (import.meta.env.PROD) {
    return '/.netlify/functions/api';
  }
  // Em desenvolvimento, usar o servidor local
  return import.meta.env.VITE_API_URL || 'http://localhost:3002';
};

export const API_URL = getApiUrl();

export const api = {
  createCheckoutSession: async (data: any) => {
    const response = await fetch(`${API_URL}/api/create-checkout-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return response.json();
  },
  
  checkAvailability: async (eventoId: string, estacaoNome: string) => {
    const response = await fetch(`${API_URL}/api/check-availability/${eventoId}/${encodeURIComponent(estacaoNome)}`);
    return response.json();
  },
  
  validateTicket: async (codigo: string) => {
    const response = await fetch(`${API_URL}/api/validate-ticket`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ codigo })
    });
    return response.json();
  },
  
  getHealth: async () => {
    const response = await fetch(`${API_URL}/health`);
    return response.json();
  }
};