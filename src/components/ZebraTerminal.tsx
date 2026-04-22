/**
 * ZebraTerminal — страница для мобильной группы (Zebra TSD).
 * Дизайн совпадает с остальными страницами сайта.
 * Один input работает и со сканером штрихкода, и с ручным вводом.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Package, CheckCircle, XCircle, AlertTriangle, Scan, MapPin } from 'lucide-react';

type ScanResult = {
  ok: boolean;
  match: boolean;
  shipmentNumber?: string;
  fromStation?: string;
  toStation?: string;
  currentStation?: string;
  status?: string;
  message: string;
};

type HistoryItem = {
  id: string;
  code: string;
  match: boolean;
  ok: boolean;
  time: string;
};

const STATUS_LABELS: Record<string, string> = {
  CREATED: 'Создан', PAYMENT_PENDING: 'Ожидает оплаты', PAID: 'Оплачен',
  READY_FOR_LOADING: 'Готов к погрузке', LOADED: 'Погружен', IN_TRANSIT: 'В пути',
  ARRIVED: 'Прибыл', READY_FOR_ISSUE: 'Готов к выдаче', ISSUED: 'Выдан',
  CLOSED: 'Закрыт', CANCELLED: 'Отменён',
};

interface ZebraTerminalProps {
  theme?: 'light' | 'dark';
}

export function ZebraTerminal({ theme = 'light' }: ZebraTerminalProps) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const inputRef = useRef<HTMLInputElement>(null);
  const [scanValue, setScanValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [stats, setStats] = useState({ total: 0, ok: 0, fail: 0 });

  const isDark = theme === 'dark';
  const cardBg = isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200';
  const textPrimary = isDark ? 'text-gray-100' : 'text-gray-900';
  const textSecondary = isDark ? 'text-gray-400' : 'text-gray-600';
  const inputCls = isDark
    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400';

  // Фокус на input при клике не на кнопку/input (для сканера ШК)
  useEffect(() => {
    inputRef.current?.focus();
    const handler = (e: Event) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag !== 'INPUT' && tag !== 'BUTTON' && tag !== 'TEXTAREA' && tag !== 'SELECT') {
        inputRef.current?.focus();
      }
    };
    document.addEventListener('click', handler);
    document.addEventListener('touchend', handler);
    return () => {
      document.removeEventListener('click', handler);
      document.removeEventListener('touchend', handler);
    };
  }, []);

  const doScan = useCallback(async (code: string) => {
    const trimmed = code.trim();
    if (!trimmed || isLoading) return;

    setIsLoading(true);
    setScanValue('');

    const token = localStorage.getItem('token') || '';
    try {
      const params = new URLSearchParams({ station: user?.station || '' });
      const res = await fetch(`/api/shipments/${encodeURIComponent(trimmed)}/auditor-check?${params}`, {
        headers: { Authorization: 'Bearer ' + token },
      });

      if (res.ok) {
        const data = await res.json();
        const s = data.shipment;
        const match: boolean = data.station_match;
        setResult({
          ok: true, match,
          shipmentNumber: s.shipment_number,
          fromStation: s.from_station,
          toStation: s.to_station,
          currentStation: s.current_station,
          status: s.shipment_status,
          message: match
            ? t('mobileGroupChecked') + ' — ' + s.shipment_number
            : `⚠️ ${s.shipment_number} (${s.current_station})`,
        });
        setHistory(prev => [{
          id: String(Date.now()),
          code: s.shipment_number || trimmed,
          match, ok: true,
          time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
        }, ...prev].slice(0, 12));
        setStats(prev => ({ total: prev.total + 1, ok: match ? prev.ok + 1 : prev.ok, fail: match ? prev.fail : prev.fail + 1 }));
      } else if (res.status === 404) {
        setResult({ ok: false, match: false, message: `❌ ${trimmed} — ${t('mobileGroupRejected')}` });
        setHistory(prev => [{
          id: String(Date.now()), code: trimmed, match: false, ok: false,
          time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
        }, ...prev].slice(0, 12));
        setStats(prev => ({ ...prev, total: prev.total + 1, fail: prev.fail + 1 }));
      } else {
        setResult({ ok: false, match: false, message: `❌ Ошибка сервера (${res.status})` });
      }
    } catch {
      setResult({ ok: false, match: false, message: '❌ Нет связи с сервером' });
    } finally {
      setIsLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isLoading, user, t]);

  const resultBlock = () => {
    if (!result) return null;
    if (!result.ok) return (
      <div className="rounded-lg border-2 border-red-400 bg-red-50 p-4 mb-5 text-center">
        <p className="text-xl font-bold text-red-600 mb-1">{t('mobileGroupError')}</p>
        <p className="text-sm text-red-700">{result.message}</p>
      </div>
    );
    if (result.match) return (
      <div className="rounded-lg border-2 border-green-400 bg-green-50 p-4 mb-5">
        <p className="text-xl font-bold text-green-600 mb-2 text-center">{t('mobileGroupSuccess')}</p>
        <InfoGrid result={result} />
      </div>
    );
    return (
      <div className="rounded-lg border-2 border-yellow-400 bg-yellow-50 p-4 mb-5">
        <p className="text-xl font-bold text-yellow-700 mb-2 text-center">⚠️ {t('mobileGroupMismatch')}</p>
        <InfoGrid result={result} />
      </div>
    );
  };

  return (
    <div>
      {/* Заголовок страницы */}
      <div className="mb-6">
        <h1 className={`text-xl md:text-2xl font-semibold mb-1 ${textPrimary}`}>
          {t('mobileGroupTitle')}
        </h1>
        <div className={`flex items-center gap-2 text-sm ${textSecondary}`}>
          <MapPin className="w-4 h-4 shrink-0" />
          <span>{user?.name} · {user?.station || t('mobileGroupStationNotSet')}</span>
        </div>
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-4 text-white text-center">
          <div className="flex justify-center mb-1">
            <Package className="w-5 h-5 opacity-80" />
          </div>
          <p className="text-2xl font-bold">{stats.total}</p>
          <p className="text-xs opacity-90">{t('mobileGroupChecked')}</p>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-4 text-white text-center">
          <div className="flex justify-center mb-1">
            <CheckCircle className="w-5 h-5 opacity-80" />
          </div>
          <p className="text-2xl font-bold">{stats.ok}</p>
          <p className="text-xs opacity-90">{t('mobileGroupApproved')}</p>
        </div>
        <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-lg p-4 text-white text-center">
          <div className="flex justify-center mb-1">
            <XCircle className="w-5 h-5 opacity-80" />
          </div>
          <p className="text-2xl font-bold">{stats.fail}</p>
          <p className="text-xs opacity-90">{t('mobileGroupRejected')}</p>
        </div>
      </div>

      {/* Результат */}
      {resultBlock()}

      {/* Поле ввода */}
      <div className={`rounded-lg shadow-sm border p-4 mb-5 ${cardBg}`}>
        <div className="flex items-center gap-2 mb-3">
          <Scan className={`w-5 h-5 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
          <h3 className={`font-semibold text-base ${textPrimary}`}>{t('mobileGroupScanTitle')}</h3>
        </div>
        <p className={`text-sm mb-3 ${textSecondary}`}>{t('mobileGroupScanDesc')}</p>

        <input
          ref={inputRef}
          type="text"
          value={scanValue}
          onChange={e => setScanValue(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && scanValue.trim()) {
              doScan(scanValue);
            }
          }}
          placeholder={isLoading ? t('mobileGroupChecking') : t('mobileGroupScanPlaceholder')}
          disabled={isLoading}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          className={`w-full px-4 py-3 text-lg font-mono rounded-lg border-2 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors mb-3 ${
            isLoading ? `${isDark ? 'border-gray-600' : 'border-gray-200'} opacity-60` : `border-blue-500 ${inputCls}`
          }`}
        />

        <button
          onClick={() => { if (scanValue.trim()) doScan(scanValue); }}
          disabled={isLoading || !scanValue.trim()}
          className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 text-base"
        >
          <Package className="w-5 h-5" />
          {isLoading ? t('mobileGroupChecking') : t('mobileGroupCheckButton')}
        </button>

        <p className={`text-xs text-center mt-2 ${textSecondary}`}>{t('mobileGroupReadOnly')}</p>
      </div>

      {/* Журнал */}
      {history.length > 0 && (
        <div className={`rounded-lg shadow-sm border ${cardBg}`}>
          <div className={`px-4 py-3 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
            <h3 className={`font-semibold text-sm ${textPrimary}`}>{t('mobileGroupHistory')}</h3>
          </div>
          <div className={`divide-y ${isDark ? 'divide-gray-700' : 'divide-gray-100'}`}>
            {history.map(item => (
              <div
                key={item.id}
                className={`flex items-center justify-between px-4 py-2.5 border-l-4 ${
                  !item.ok ? 'border-red-500' : item.match ? 'border-green-500' : 'border-yellow-500'
                } ${isDark ? 'hover:bg-gray-750' : 'hover:bg-gray-50'}`}
              >
                <span className={`text-sm font-mono font-semibold ${textPrimary}`}>
                  {!item.ok ? '✗' : item.match ? '✓' : '⚠'} {item.code}
                </span>
                <span className={`text-xs ${textSecondary}`}>{item.time}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function InfoGrid({ result }: { result: ScanResult }) {
  return (
    <div className="text-sm space-y-1 mt-2 text-left">
      {result.shipmentNumber && (
        <div className="flex justify-between">
          <span className="text-gray-600">Номер:</span>
          <span className="font-bold">{result.shipmentNumber}</span>
        </div>
      )}
      {result.fromStation && (
        <div className="flex justify-between">
          <span className="text-gray-600">Маршрут:</span>
          <span className="font-bold">{result.fromStation} → {result.toStation}</span>
        </div>
      )}
      {result.currentStation && (
        <div className="flex justify-between">
          <span className="text-gray-600">Сейчас:</span>
          <span className="font-bold">{result.currentStation}</span>
        </div>
      )}
      {result.status && (
        <div className="flex justify-between">
          <span className="text-gray-600">Статус:</span>
          <span className="font-bold">{STATUS_LABELS[result.status] || result.status}</span>
        </div>
      )}
    </div>
  );
}
