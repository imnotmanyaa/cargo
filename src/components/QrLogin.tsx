import { useEffect, useState, useRef } from 'react';
import { withApiBase } from '../lib/api-base';
import { QrCode } from 'lucide-react';

export function QrLogin() {
  const [message, setMessage] = useState('Ожидание сканирования бейджа...');
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

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4 font-sans text-white">
      <div className="w-full max-w-sm text-center">
        
        <div className="w-20 h-20 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg border border-gray-700">
          {isError ? (
            <svg className="w-10 h-10 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : isWaitingForScan ? (
            <QrCode className="w-10 h-10 text-blue-400" />
          ) : (
            <svg className="w-10 h-10 text-blue-500 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
          )}
        </div>
        
        <h1 className="text-2xl font-bold text-gray-100 mb-2">Авторизация ТСД</h1>
        <p className={`text-sm mb-8 ${isError ? 'text-red-400' : 'text-gray-400'}`}>{message}</p>

        {isWaitingForScan && (
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              value={scanValue}
              onChange={(e) => setScanValue(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={!isWaitingForScan}
              className="w-full px-4 py-4 bg-gray-800 border-2 border-blue-500 rounded-xl text-center text-lg text-white font-mono focus:outline-none focus:ring-0 focus:border-blue-400 transition-colors shadow-inner"
              placeholder="СКАНИРУЙТЕ БЕЙДЖ..."
              autoFocus
            />
            {scanValue && (
              <button
                onClick={() => performLogin(scanValue.trim())}
                className="absolute right-3 top-1/2 -translate-y-1/2 bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-lg text-sm font-bold shadow"
              >
                ВХОД
              </button>
            )}
            <p className="mt-4 text-xs text-gray-500">
              Нажмите жёлтую кнопку на терминале Zebra для сканирования QR-кода на вашей ID-карте
            </p>
          </div>
        )}

        {(!isWaitingForScan && isError) && (
          <button
            onClick={() => {
              setIsError(false);
              setMessage('Ожидание сканирования бейджа...');
              setScanValue('');
              setIsWaitingForScan(true);
            }}
            className="mt-6 px-6 py-3 bg-gray-800 border border-gray-600 text-white rounded-xl text-sm font-medium hover:bg-gray-700 w-full transition-colors"
          >
            СКАНИРОВАТЬ СНОВА
          </button>
        )}
        
        <button
          onClick={() => window.location.href = '/'}
          className="mt-6 px-4 py-2 text-gray-500 hover:text-gray-300 text-sm underline underline-offset-4"
        >
          Вернуться на главную
        </button>
      </div>
    </div>
  );
}
