import { useEffect, useState } from 'react';

export function QrLogin() {
  const [message, setMessage] = useState('Выполняется вход...');
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token') || '';
    if (!token) {
      setMessage('QR-токен не найден. Попросите администратора выдать новый QR-код.');
      setIsError(true);
      return;
    }

    const origin = window.location.origin;

    (async () => {
      try {
        // Используем абсолютный URL чтобы обойти сервис-воркер PWA
        const res = await fetch(`${origin}/api/auth/qr-login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
          cache: 'no-store',
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          throw new Error(data.error || `Ошибка сервера (${res.status})`);
        }

        const user = {
          ...data,
          depositBalance: data.deposit_balance,
          contractNumber: data.contract_number,
        };

        if (data.token) localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(user));

        setMessage('Вход выполнен! Переходим...');
        setTimeout(() => {
          window.location.href = '/';
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
