import { useEffect, useState, useRef } from 'react';
import { withApiBase } from '../lib/api-base';
import { QrCode, Package } from 'lucide-react';

export function QrLogin() {
  const [message, setMessage] = useState('Наведите сканер на ваш бейдж');
  const [isError, setIsError] = useState(false);
  const [isWaitingForScan, setIsWaitingForScan] = useState(false);
  const [scanValue, setScanValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Keep focus on input for hardware scanner
  useEffect(() => {
    if (isWaitingForScan) {
      const focus = () => inputRef.current?.focus();
      focus();
      document.addEventListener('click', focus);
      document.addEventListener('touchend', focus);
      return () => {
        document.removeEventListener('click', focus);
        document.removeEventListener('touchend', focus);
      };
    }
  }, [isWaitingForScan]);

  const resolveApiUrl = (path: string) => {
    const apiPath = withApiBase(path);
    try {
      if (typeof URL !== 'undefined') return new URL(apiPath, window.location.href).toString();
    } catch {}
    if (/^https?:\/\//i.test(apiPath)) return apiPath;
    const origin = window.location.origin || (window.location.protocol + "//" + window.location.host);
    return origin + (apiPath.startsWith('/') ? '' : '/') + apiPath;
  };

  const performLogin = async (token: string) => {
    setIsWaitingForScan(false);
    setMessage('Выполняется вход...');
    setIsError(false);
    
    // Sometimes the scanner scans the full URL: http://.../qr-login?token=XYZ
    // Let's try to extract token if it's a URL
    let actualToken = token;
    try {
      const url = new URL(token);
      const urlToken = url.searchParams.get('token');
      if (urlToken) actualToken = urlToken;
    } catch {
      // Not a URL, use as is
    }

    try {
      const apiUrl = resolveApiUrl('/api/auth/qr-login');
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: actualToken }),
        cache: 'no-store',
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `Ошибка сервера (${res.status})`);

      if (data.token) localStorage.setItem('token', data.token);
      
      const meRes = await fetch(resolveApiUrl('/api/auth/me'), { 
        cache: 'no-store',
        headers: { 'Authorization': `Bearer ${data.token}` }
      });
      const meData = meRes.ok ? await meRes.json() : data;
      
      const user = {
        ...meData,
        depositBalance: meData.deposit_balance,
        contractNumber: meData.contract_number,
      };
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.removeItem('currentPage');

      setMessage('Вход выполнен! Загрузка...');
      setTimeout(() => window.location.replace('/'), 500);
    } catch (e: any) {
      console.error("QR Login Error:", e);
      const msg = e?.message || 'Ошибка QR-входа';
      setMessage(msg);
      setIsError(true);
      setIsWaitingForScan(true);
      setScanValue('');
    }
  };

  useEffect(() => {
    const extractToken = () => {
      try {
        const fromQuery = new URLSearchParams(window.location.search).get('token');
        if (fromQuery) return fromQuery;
        if (window.location.hash) {
          const hashQuery = window.location.hash.includes('?') ? window.location.hash.slice(window.location.hash.indexOf('?')) : window.location.hash.replace(/^#/, '?');
          const fromHash = new URLSearchParams(hashQuery).get('token');
          if (fromHash) return fromHash;
        }
        return '';
      } catch {
        const match = window.location.href.match(/[?&#]token=([^&#]+)/);
        if (!match) return '';
        try { return decodeURIComponent(match[1]); } catch { return match[1]; }
      }
    };
    
    const token = extractToken().replace(/[\u0000-\u001F\u007F\s]+/g, '').trim();
    if (token) {
      performLogin(token);
    } else {
      setIsWaitingForScan(true);
    }
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && scanValue.trim()) {
      e.preventDefault();
      performLogin(scanValue.trim());
    }
  };

  // Автоотправка при сканировании (если сканер Zebra не настроен на отправку Enter)
  useEffect(() => {
    if (!scanValue.trim() || !isWaitingForScan) return;
    const timeout = setTimeout(() => {
      if (scanValue.length > 30) {
        performLogin(scanValue.trim());
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [scanValue, isWaitingForScan]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-md">
            <Package className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">CargoTrans</h1>
          <p className="text-gray-600">Система управления грузоперевозками</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8 text-center relative overflow-hidden">
          
          <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6">
            {isError ? (
              <svg className="w-10 h-10 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : isWaitingForScan ? (
              <QrCode className="w-10 h-10 text-blue-600" />
            ) : (
              <svg className="w-10 h-10 text-blue-600 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
            )}
          </div>
          
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Авторизация ТСД</h2>
          <p className={`text-sm mb-6 ${isError ? 'text-red-600 font-medium' : 'text-gray-500'}`}>{message}</p>

          {isWaitingForScan && (
            <div className="relative mb-6">
              <input
                ref={inputRef}
                type="text"
                inputMode="none" 
                value={scanValue}
                onChange={(e) => setScanValue(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={!isWaitingForScan}
                className="w-full px-4 py-3 border-2 border-blue-200 rounded-xl text-center text-gray-700 font-mono focus:outline-none focus:border-blue-500 transition-colors"
                placeholder="СКАНИРУЙТЕ БЕЙДЖ..."
                autoFocus
              />
              <p className="mt-4 text-xs text-gray-500">
                Нажмите жёлтую кнопку на терминале Zebra для считывания QR-кода
              </p>
            </div>
          )}

          {(!isWaitingForScan && isError) && (
            <button
              onClick={() => {
                setIsError(false);
                setMessage('Наведите сканер на ваш бейдж');
                setScanValue('');
                setIsWaitingForScan(true);
              }}
              className="mt-2 px-6 py-3 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 w-full transition-colors"
            >
              СКАНИРОВАТЬ СНОВА
            </button>
          )}
          
          <div className="mt-6 pt-6 border-t border-gray-100">
            <button
              onClick={() => window.location.href = '/'}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors"
            >
              Вернуться на главную
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
