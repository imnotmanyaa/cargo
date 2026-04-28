import { useEffect, useState } from 'react';
import { withApiBase } from '../lib/api-base';

export function QrLogin() {
  const [message, setMessage] = useState('Вход по QR...');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token') || '';
    if (!token) {
      setMessage('QR-токен не найден');
      return;
    }

    (async () => {
      try {
        const res = await fetch(withApiBase('/api/auth/qr-login'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || 'QR login failed');
        }
        const data = await res.json();
        const user = {
          ...data,
          depositBalance: data.deposit_balance,
          contractNumber: data.contract_number,
        };
        if (data.token) localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(user));
        window.location.href = '/';
      } catch (e: any) {
        setMessage(e?.message || 'Ошибка QR-входа');
      }
    })();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
        <div className="text-xl font-semibold mb-2">CargoTrans</div>
        <div className="text-gray-600">{message}</div>
      </div>
    </div>
  );
}

