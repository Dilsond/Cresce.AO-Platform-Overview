// hooks/useAuth.ts
export function useAuth() {
  // Exemplo: pega token ou user do localStorage
  const user = localStorage.getItem('user'); 
  return { isLoggedIn: !!user };
}