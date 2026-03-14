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

  const login = async (email: string, password: string) => {
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
          console.error("Non-JSON error response from server", await response.text());
          throw new Error(`Server Error: ${response.status} ${response.statusText}`);
        }
      }

      const data = await response.json();
      // Map backend snake_case to frontend camelCase
      const user: User = {
        ...data,
        depositBalance: data.deposit_balance,
        contractNumber: data.contract_number
      };

      if (data.token) {
        localStorage.setItem('token', data.token);
      }

      setUser(user);
      localStorage.setItem('user', JSON.stringify(user));
    } catch (error: any) {
      console.error('Login error details:', error);
      console.error('Error stack:', error.stack);
      alert(`${error.name}: ${error.message}`);
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
          console.error("Non-JSON error response from server", await response.text());
          throw new Error(`Server Error: ${response.status} ${response.statusText}`);
        }
      }

      const userData = await response.json();

      if (userData.token) {
        localStorage.setItem('token', userData.token);
      }

      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
      alert(`Регистрация успешна! Добро пожаловать, ${userData.name}`);
    } catch (error: any) {
      console.error('Registration error:', error);
      alert(error.message);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
  };

  const updateUser = (updates: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...updates };
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
    }
  };

  const isAuthenticated = !!user;

  console.log('Auth context state:', { user, isAuthenticated });

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