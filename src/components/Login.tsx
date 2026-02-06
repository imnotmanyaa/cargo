import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { LogIn, User, Building2, Package, Shield, BarChart3, UserPlus } from 'lucide-react';
import { Register } from './Register';

type UserRole = 'operator' | 'corporate' | 'individual' | 'receiver' | 'admin' | 'manager';

export function Login() {
  const { login } = useAuth();
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole>('operator');
  const [showRegister, setShowRegister] = useState(false);

  const roles = [
    { id: 'operator' as UserRole, name: 'Оператор', icon: User, demo: 'operator@mail.kz' },
    { id: 'receiver' as UserRole, name: 'Приёмосдатчик', icon: Package, demo: 'receiver@mail.kz' },
    { id: 'admin' as UserRole, name: 'Администратор', icon: Shield, demo: 'admin@mail.kz' },
    { id: 'manager' as UserRole, name: 'Руководитель', icon: BarChart3, demo: 'manager@mail.kz' },
  ];

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Logging in with:', email, password, selectedRole);
    login(email, password, selectedRole);
  };

  const handleDemoLogin = (demoEmail: string, role: UserRole) => {
    console.log('Demo login:', demoEmail, role);
    setEmail(demoEmail);
    setPassword('demo');
    setSelectedRole(role);
    // Немедленно входим
    login(demoEmail, 'demo', role);
  };

  if (showRegister) {
    return <Register onBackToLogin={() => setShowRegister(false)} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Package className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">CargoTrans</h1>
          <p className="text-gray-600">Система управления грузоперевозками</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Вход в систему</h2>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="your@email.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Пароль
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="••••••••"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Выберите роль
              </label>
              <div className="space-y-2">
                {roles.map((role) => {
                  const Icon = role.icon;
                  return (
                    <div key={role.id}>
                      <label className={`flex items-center justify-between p-3 border-2 rounded-lg cursor-pointer transition-all ${
                        selectedRole === role.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}>
                        <div className="flex items-center gap-3">
                          <input
                            type="radio"
                            name="role"
                            value={role.id}
                            checked={selectedRole === role.id}
                            onChange={(e) => setSelectedRole(e.target.value as UserRole)}
                            className="w-4 h-4 text-blue-600"
                          />
                          <Icon className="w-5 h-5 text-gray-600" />
                          <span className="text-sm font-medium text-gray-900">{role.name}</span>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            handleDemoLogin(role.demo, role.id);
                          }}
                          className="text-xs text-blue-600 hover:text-blue-700 font-medium px-2 py-1 hover:bg-blue-100 rounded"
                        >
                          Демо
                        </button>
                      </label>
                    </div>
                  );
                })}
              </div>
            </div>

            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium mt-6"
            >
              <LogIn className="w-5 h-5" />
              Войти
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <button
              onClick={() => setShowRegister(true)}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-lg hover:from-indigo-700 hover:to-blue-700 font-medium transition-all"
            >
              <UserPlus className="w-5 h-5" />
              Регистрация клиента
            </button>
            <p className="text-xs text-center text-gray-500 mt-4">
              Для физических и корпоративных клиентов
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}