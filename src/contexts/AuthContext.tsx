import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { API_URL } from '../config';

type UserRole = 'corporate' | 'individual' | 'receiver' | 'admin' | 'manager' | 'direction_head' | 'chief_head' | 'mobile_group';

interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  company?: string;
  depositBalance?: number;
  contractNumber?: string;
  phone?: string;
  station?: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string, _role?: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  register: (data: RegisterData) => void;
  updateUser: (updates: Partial<User>) => void;
}

interface RegisterData {
  name: string;
  email: string;
  password: string;
  role: 'corporate' | 'individual';
  company?: string;
  phone?: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const savedUser = localStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
  }, []);

  // Global 401 handler: auto-logout on expired/invalid token + API_URL prepender
  useEffect(() => {
    const originalFetch = window.fetch.bind(window);
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      let url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
      
      // If it's a relative API call, prepend the base URL
      if (url.startsWith('/api/')) {
        const base = API_URL.startsWith('http') ? API_URL : `https://${API_URL}`;
        url = base + url;
      }

      const isAuthEndpoint = url.includes('/api/auth/login') || url.includes('/api/auth/register');
      const isApiRequest = url.includes('/api/');
      const token = localStorage.getItem('token');

      let nextInit = init;
      // Auto-attach bearer token for API requests
      if (isApiRequest && token) {
        const headers = new Headers(init?.headers || {});
        if (!headers.has('Authorization')) {
          headers.set('Authorization', `Bearer ${token}`);
        }
        nextInit = { ...init, headers };
      }

      const response = await originalFetch(url, nextInit);

      if (response.status === 401 && !isAuthEndpoint && token) {
        logout();
      }
      return response;
    };
    return () => {
      window.fetch = originalFetch;
    };
  }, [logout]);

  const login = async (email: string, password: string, _role?: string) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      if (!response.ok) {
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.indexOf("application/json") !== -1) {
          const error = await response.json();
          throw new Error(error.error || 'Login failed');
        } else {
          throw new Error(`Server Error: ${response.status}`);
        }
      }

      const data = await response.json();
      const userData: User = {
        ...data,
        depositBalance: data.deposit_balance,
        contractNumber: data.contract_number
      };

      if (data.token) {
        localStorage.setItem('token', data.token);
      }

      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
    } catch (error: any) {
      alert(error.message);
    }
  };

  const register = async (data: RegisterData) => {
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.indexOf("application/json") !== -1) {
          const error = await response.json();
          throw new Error(error.error || 'Registration failed');
        } else {
          throw new Error(`Server Error: ${response.status}`);
        }
      }

      const rawData = await response.json();
      const userData: User = {
        ...rawData,
        depositBalance: rawData.deposit_balance,
        contractNumber: rawData.contract_number
      };

      if (rawData.token) {
        localStorage.setItem('token', rawData.token);
      }

      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
      alert(`Регистрация успешна!`);
    } catch (error: any) {
      alert(error.message);
    }
  };

  const updateUser = (updates: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...updates };
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
    }
  };

  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated, register, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}