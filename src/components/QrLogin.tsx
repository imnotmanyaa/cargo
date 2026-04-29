import { useEffect, useState } from 'react';
import { withApiBase } from '../lib/api-base';

export function QrLogin() {
  const [message, setMessage] = useState('Выполняется вход...');
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    const extractToken = () => {
      try {
        return new URLSearchParams(window.location.search).get('token') || '';
      } catch {
        const match = window.location.href.match(/[?&]token=([^&#]+)/);
        if (!match) return '';
        try {
          return decodeURIComponent(match[1]);
        } catch {
          return match[1];
        }
      }
    };
    const token = extractToken();
    if (!token) {
      setMessage('QR-токен не найден. Попросите администратора выдать новый QR-код.');
      setIsError(true);
      return;
    }

    (async () => {
      try {
        const res = await fetch(withApiBase('/api/auth/qr-login'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
          cache: 'no-store',
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          throw new Error(data.error || `Ошибка сервера (${res.status})`);
        }

        if (data.token) {
          localStorage.setItem('token', data.token);
        }
        const meRes = await fetch(withApiBase('/api/auth/me'), { cache: 'no-store' });
        const meData = meRes.ok ? await meRes.json() : data;
        const user = {
          ...meData,
          depositBalance: meData.deposit_balance,
          contractNumber: meData.contract_number,
        };
        localStorage.setItem('user', JSON.stringify(user));
        localStorage.removeItem('currentPage');

        setMessage('Вход выполнен! Переходим...');
        setTimeout(() => {
          window.location.replace('/');
        }, 500);
      } catch (e: any) {
        const msg = e?.message || 'Ошибка QR-входа';
        setMessage(msg.includes('aborted') || msg.includes('Failed to fetch')
          ? 'Ошибка сети. Проверьте подключение к интернету и повторите сканирование.'
          : msg);
        setIsError(true);
      }
    })();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-sm w-full text-center">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          {isError ? (
            <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-8 h-8 text-blue-600 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
          )}
        </div>
        <div className="text-xl font-bold text-gray-900 mb-2">CargoTrans</div>
        <p className={`text-sm ${isError ? 'text-red-600' : 'text-gray-600'}`}>{message}</p>
        {isError && (
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
          >
            Попробовать снова
          </button>
        )}
      </div>
    </div>
  );
}
