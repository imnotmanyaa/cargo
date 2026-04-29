import { useState } from 'react';
import { Bike, LogIn } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export function CourierLogin() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await login(email, password, 'courier');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-amber-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
        <div className="text-center mb-6">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-blue-700 text-white flex items-center justify-center mb-3">
            <Bike className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Cargo Courier</h1>
          <p className="text-sm text-slate-600">Вход для курьеров</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
          <input
            type="password"
            placeholder="Пароль"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold flex items-center justify-center gap-2"
          >
            <LogIn className="w-4 h-4" />
            Войти как курьер
          </button>
        </form>
      </div>
    </div>
  );
}
