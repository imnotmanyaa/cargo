import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { LogIn, Package, UserPlus } from 'lucide-react';
import { Register } from './Register';
import { useLanguage } from '../contexts/LanguageContext';

export function Login() {
  const { login: doLogin } = useAuth();
  const { t } = useLanguage();
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [showRegister, setShowRegister] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotStep, setForgotStep] = useState<1 | 2>(1);
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    await doLogin(login, password);

    const params = new URLSearchParams(window.location.search);
    const redirect = params.get('redirect');
    if (redirect) {
      window.location.href = redirect;
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const res = await fetch('https://cargo-trans-mvp-production.up.railway.app/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Ошибка');
      }
      setForgotStep(2);
      setSuccess('Код отправлен на ваш WhatsApp');
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const res = await fetch('https://cargo-trans-mvp-production.up.railway.app/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login, code: resetCode, new_password: newPassword })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Ошибка');
      }
      setSuccess('Пароль успешно изменен');
      setTimeout(() => {
        setShowForgot(false);
        setForgotStep(1);
        setResetCode('');
        setNewPassword('');
        setSuccess('');
      }, 2000);
    } catch (err: any) {
      setError(err.message);
    }
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
          <p className="text-gray-600">{t('systemNameDesc') || 'Система управления грузоперевозками'}</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          {showForgot ? (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Восстановление пароля</h2>
              {error && <div className="mb-4 text-red-600 bg-red-50 p-3 rounded-lg text-sm">{error}</div>}
              {success && <div className="mb-4 text-green-600 bg-green-50 p-3 rounded-lg text-sm">{success}</div>}
              
              {forgotStep === 1 ? (
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Ваш логин (Номер телефона)
                    </label>
                    <input
                      type="text"
                      value={login}
                      onChange={(e) => setLogin(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="87000000000"
                      required
                    />
                  </div>
                  <button type="submit" className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
                    Получить код
                  </button>
                  <button type="button" onClick={() => setShowForgot(false)} className="w-full py-3 text-gray-600 hover:text-gray-800 font-medium">
                    Назад
                  </button>
                </form>
              ) : (
                <form onSubmit={handleResetPassword} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Код из WhatsApp
                    </label>
                    <input
                      type="text"
                      value={resetCode}
                      onChange={(e) => setResetCode(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0000"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Новый пароль
                    </label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="••••••••"
                      required
                    />
                  </div>
                  <button type="submit" className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
                    Сохранить пароль
                  </button>
                  <button type="button" onClick={() => {setShowForgot(false); setForgotStep(1);}} className="w-full py-3 text-gray-600 hover:text-gray-800 font-medium">
                    Отмена
                  </button>
                </form>
              )}
            </div>
          ) : (
            <>
              <h2 className="text-xl font-semibold text-gray-900 mb-6">{t('login')}</h2>

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Логин или Номер телефона
                  </label>
                  <input
                    type="text"
                    value={login}
                    onChange={(e) => setLogin(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="87000000000 / admin"
                    required
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      {t('password')}
                    </label>
                    <button type="button" onClick={() => setShowForgot(true)} className="text-sm text-blue-600 hover:underline">
                      Забыли пароль?
                    </button>
                  </div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="••••••••"
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium mt-6"
                >
                  <LogIn className="w-5 h-5" />
                  {t('login')}
                </button>
              </form>

              <div className="mt-6 pt-6 border-t border-gray-200">
                <button
                  onClick={() => setShowRegister(true)}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-lg hover:from-indigo-700 hover:to-blue-700 font-medium transition-all"
                >
                  <UserPlus className="w-5 h-5" />
                  {t('clientRegistration') || 'Регистрация клиента'}
                </button>
                <p className="text-xs text-center text-gray-500 mt-4">
                  {t('forIndividualAndCorporate') || 'Для физических и корпоративных клиентов'}
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}