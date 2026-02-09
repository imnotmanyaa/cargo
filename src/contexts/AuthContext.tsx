import { createContext, useContext, useState, ReactNode } from 'react';

type UserRole = 'operator' | 'corporate' | 'individual' | 'receiver' | 'admin' | 'manager';

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
  login: (email: string, password: string) => void;
  logout: () => void;
  isAuthenticated: boolean;
  register: (data: RegisterData) => void;
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
  const [user, setUser] = useState<User | null>(null);

  const login = async (email: string, password: string) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Login failed');
      }

      const data = await response.json();
      // Map backend snake_case to frontend camelCase
      const user: User = {
        ...data,
        depositBalance: data.deposit_balance,
        contractNumber: data.contract_number
      };

      setUser(user);
    } catch (error: any) {
      console.error('Login error:', error);
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
        const error = await response.json();
        throw new Error(error.error || 'Registration failed');
      }

      const userData = await response.json();
      setUser(userData);
      alert(`Регистрация успешна! Добро пожаловать, ${userData.name}`);
    } catch (error: any) {
      console.error('Registration error:', error);
      alert(error.message);
    }
  };

  const logout = () => {
    setUser(null);
  };

  const isAuthenticated = !!user;

  console.log('Auth context state:', { user, isAuthenticated });

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated, register }}>
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