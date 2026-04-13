const API_URL = import.meta.env.PROD 
  ? '/.netlify/functions/api'
  : 'http://localhost:3002';

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
  }
};