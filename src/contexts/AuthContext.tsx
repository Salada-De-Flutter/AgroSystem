import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';

interface Usuario {
  id: string;
  nome: string;
  email: string;
  criado_em: string;
}

interface AuthContextData {
  usuario: Usuario | null;
  token: string | null;
  loading: boolean;
  login: (email: string, senha: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Carregar dados salvos ao iniciar o app
  useEffect(() => {
    loadStoredData();
  }, []);

  async function loadStoredData() {
    try {
      const storedToken = await AsyncStorage.getItem('@AgroSystem:token');
      const storedUsuario = await AsyncStorage.getItem('@AgroSystem:usuario');

      if (storedToken && storedUsuario) {
        setToken(storedToken);
        setUsuario(JSON.parse(storedUsuario));
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  }

  async function login(email: string, senha: string) {
    try {
      const response = await fetch('https://vqdmwevdlmqdtfbfceoc.supabase.co/functions/v1/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, senha }),
      });

      const data = await response.json();

      if (!response.ok || !data.sucesso) {
        throw new Error(data.mensagem || 'Erro ao fazer login');
      }

      // Salvar token e usuário
      const { token: newToken, usuario: newUsuario } = data;
      
      await AsyncStorage.setItem('@AgroSystem:token', newToken);
      await AsyncStorage.setItem('@AgroSystem:usuario', JSON.stringify(newUsuario));

      setToken(newToken);
      setUsuario(newUsuario);
    } catch (error) {
      console.error('Erro no login:', error);
      throw error;
    }
  }

  async function logout() {
    try {
      await AsyncStorage.removeItem('@AgroSystem:token');
      await AsyncStorage.removeItem('@AgroSystem:usuario');

      setToken(null);
      setUsuario(null);
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  }

  return (
    <AuthContext.Provider
      value={{
        usuario,
        token,
        loading,
        login,
        logout,
        isAuthenticated: !!usuario && !!token,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }

  return context;
}
