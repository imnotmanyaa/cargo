import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { CheckCircle, QrCode, Package, MapPin, AlertTriangle, Scan } from 'lucide-react';

type AuditResult = {
  type: 'found' | 'not-found' | 'error' | 'station-mismatch';
  shipmentId: string;
  shipmentNumber?: string;
  fromStation?: string;
  toStation?: string;
  currentStation?: string;
  status?: string;
  stationMatch?: boolean;
  message: string;
};

type HistoryItem = {
  id: string;
  shipmentId: string;
  type: AuditResult['type'];
  info: string;
  time: string;
};

function playBeep(frequency: number, duration = 150) {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = frequency;
    osc.type = 'square';
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration / 1000);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration / 1000);
  } catch { /* no AudioContext */ }
}

const STATUS_LABELS: Record<string, string> = {
  CREATED: 'Создан',
  PAYMENT_PENDING: 'Ожидает оплаты',
  PAID: 'Оплачен',
  READY_FOR_LOADING: 'Готов к погрузке',
  LOADED: 'Погружен',
  IN_TRANSIT: 'В пути',
  ARRIVED: 'Прибыл',
  READY_FOR_ISSUE: 'Готов к выдаче',
  ISSUED: 'Выдан',
  CLOSED: 'Закрыт',
  CANCELLED: 'Отменён',
};

interface AuditorTerminalProps {
  embedded?: boolean;
  theme?: 'light' | 'dark';
}

/**
 * AuditorTerminal — терминал проверки для mobile_group.
 * Позволяет сканировать грузы и проверять их данные/маршрут
 * без изменения статуса.
 */
export function AuditorTerminal({ theme = 'light' }: AuditorTerminalProps) {
  const { user } = useAuth();
  const { } = useLanguage();
  const inputRef = useRef<HTMLInputElement>(null);
  const [scanValue, setScanValue] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<AuditResult | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [stats, setStats] = useState({ total: 0, approved: 0, rejected: 0, mismatch: 0 });

  const isDark = theme === 'dark';
  const cardBg = isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200';
  const textPrimary = isDark ? 'text-gray-100' : 'text-gray-900';
  const textSecondary = isDark ? 'text-gray-400' : 'text-gray-600';

  useEffect(() => {
    function isInteractiveEl(el: HTMLElement | null): boolean {
      while (el) {
        const tag = el.tagName;
        if (tag === 'BUTTON' || tag === 'SELECT' || tag === 'INPUT' || tag === 'A') return true;
        el = el.parentElement;
      }
      return false;
    }
    const refocus = (e: Event) => {
      if (isInteractiveEl(e.target as HTMLElement)) return;
      inputRef.current?.focus();
    };
    document.addEventListener('click', refocus);
    document.addEventListener('touchend', refocus);
    inputRef.current?.focus();
    return () => {
      document.removeEventListener('click', refocus);
      document.removeEventListener('touchend', refocus);
    };
  }, []);

  useEffect(() => {
    if (!result) return;
    const t = setTimeout(() => setResult(null), 6000);
    return () => clearTimeout(t);
  }, [result]);

  const addToHistory = (item: Omit<HistoryItem, 'id' | 'time'>) => {
    const entry: HistoryItem = {
      ...item,
      id: Math.random().toString(36).slice(2),
      time: new Date().toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    };
    setHistory(prev => [entry, ...prev].slice(0, 8));
  };

  const handleScan = useCallback(async (value: string) => {
    const trimmed = value.trim();
    if (!trimmed || isProcessing) return;

    setIsProcessing(true);
    setScanValue('');

    const token = localStorage.getItem('token');
    try {
      const params = new URLSearchParams({ station: user?.station || '' });
      const res = await fetch(`/api/shipments/${trimmed}/auditor-check?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        const s = data.shipment;
        const sm: boolean = data.station_match;
        const type: AuditResult['type'] = sm ? 'found' : 'station-mismatch';
        playBeep(sm ? 880 : 440, sm ? 150 : 300);
        const auditResult: AuditResult = {
          type,
          shipmentId: trimmed,
          shipmentNumber: s.shipment_number,
          fromStation: s.from_station,
          toStation: s.to_station,
          currentStation: s.current_station,
          status: s.shipment_status,
          stationMatch: sm,
          message: sm
            ? `✅ Груз найден — ${s.shipment_number}`
            : `⚠️ Груз не на этой станции (сейчас: ${s.current_station})`,
        };
        setResult(auditResult);
        addToHistory({
          shipmentId: trimmed,
          type,
          info: `${s.shipment_number} · ${s.from_station} → ${s.to_station}`,
        });
        setStats(prev => ({
          ...prev,
          total: prev.total + 1,
          approved: sm ? prev.approved + 1 : prev.approved,
          mismatch: sm ? prev.mismatch : prev.mismatch + 1
        }));
      } else if (res.status === 404) {
        playBeep(220, 500);
        setResult({ type: 'not-found', shipmentId: trimmed, message: `❌ Груз ${trimmed} не найден в системе` });
        addToHistory({ shipmentId: trimmed, type: 'not-found', info: 'Не найден' });
        setStats(prev => ({ ...prev, total: prev.total + 1, rejected: prev.rejected + 1 }));
      } else if (res.status === 403) {
        playBeep(220, 400);
        setResult({ type: 'error', shipmentId: trimmed, message: '🚫 Нет доступа — только для мобильной группы' });
        setStats(prev => ({ ...prev, total: prev.total + 1, rejected: prev.rejected + 1 }));
      } else {
        playBeep(220, 400);
        setResult({ type: 'error', shipmentId: trimmed, message: '⚠️ Ошибка сервера' });
      }
    } catch {
      playBeep(220, 400);
      setResult({ type: 'error', shipmentId: trimmed, message: '⚠️ Ошибка сети' });
    } finally {
      setIsProcessing(false);
      inputRef.current?.focus();
    }
  }, [isProcessing, user]);

  const resultOverlayBg =
    result?.type === 'found' ? 'bg-green-600' :
    result?.type === 'station-mismatch' ? 'bg-orange-500' :
    'bg-red-600';

  const historyBorderColor = (type: HistoryItem['type']) =>
    type === 'found' ? 'border-green-500' :
    type === 'station-mismatch' ? 'border-yellow-500' :
    'border-red-500';

  return (
    <div>
      {/* Page Header — matches ManagerDashboard style */}
      <div className="mb-6">
        <h1 className={`text-xl md:text-2xl font-semibold mb-1 ${textPrimary}`}>
          Мобильная группа
        </h1>
        <div className={`flex items-center gap-2 text-sm ${textSecondary}`}>
          <MapPin className="w-4 h-4 shrink-0" />
          <span>{user?.name} · {user?.station || 'Станция не задана'}</span>
        </div>
      </div>

      {/* Stats — matches ManagerDashboard card grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-sm p-5 text-white">
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
              <Package className="w-6 h-6 text-blue-600" />
            </div>
            <span className="text-xs font-medium">Смена</span>
          </div>
          <p className="text-xs opacity-90 mb-1">Проверено</p>
          <p className="text-2xl font-bold">{stats.total}</p>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-sm p-5 text-white">
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <span className="text-xs font-medium">Смена</span>
          </div>
          <p className="text-xs opacity-90 mb-1">Одобрено</p>
          <p className="text-2xl font-bold">{stats.approved}</p>
        </div>

        <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-lg shadow-sm p-5 text-white">
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
              <QrCode className="w-6 h-6 text-red-600" />
            </div>
            <span className="text-xs font-medium">Смена</span>
          </div>
          <p className="text-xs opacity-90 mb-1">Отклонено</p>
          <p className="text-2xl font-bold">{stats.rejected}</p>
        </div>

        <div className="bg-gradient-to-br from-yellow-500 to-orange-500 rounded-lg shadow-sm p-5 text-white">
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-yellow-600" />
            </div>
            <span className="text-xs font-medium">Смена</span>
          </div>
          <p className="text-xs opacity-90 mb-1">Несовп. станции</p>
          <p className="text-2xl font-bold">{stats.mismatch}</p>
        </div>
      </div>

      {/* Scan Input Card */}
      <div className={`rounded-lg shadow-sm border p-5 mb-6 ${cardBg}`}>
        <div className="flex items-center gap-2 mb-4">
          <Scan className={`w-5 h-5 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
          <h3 className={`text-base font-semibold ${textPrimary}`}>Сканирование груза</h3>
        </div>
        <p className={`text-sm mb-4 ${textSecondary}`}>
          Введите номер отправки вручную или используйте сканер штрихкода — нажмите Enter для проверки
        </p>

        {/* Hidden real input for barcode scanners */}
        <input
          ref={inputRef}
          value={scanValue}
          onChange={e => setScanValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleScan(e.currentTarget.value);
            }
          }}
          disabled={isProcessing}
          inputMode="none"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          style={{ position: 'absolute', opacity: 0, width: 1, height: 1, pointerEvents: 'none' }}
          aria-hidden="true"
        />

        {/* Visible input */}
        <input
          value={scanValue}
          onChange={e => setScanValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleScan(e.currentTarget.value);
            }
          }}
          disabled={isProcessing}
          placeholder={isProcessing ? 'Проверка...' : 'Наведите сканер или введите номер...'}
          className={`w-full px-4 py-3 text-base font-mono rounded-lg border-2 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
            isProcessing
              ? isDark ? 'border-gray-600 bg-gray-700 text-gray-400' : 'border-gray-200 bg-gray-50 text-gray-400'
              : isDark ? 'border-blue-500 bg-gray-700 text-gray-100' : 'border-blue-500 bg-white text-gray-900'
          }`}
        />

        <button
          onClick={() => handleScan(scanValue)}
          disabled={isProcessing || !scanValue.trim()}
          className="mt-3 w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          <Package className="w-5 h-5" />
          {isProcessing ? 'Проверяется...' : 'Проверить груз'}
        </button>
        <p className={`text-xs text-center mt-2 ${textSecondary}`}>
          Режим только чтения — статус груза не изменяется
        </p>
      </div>

      {/* Inspection History */}
      {history.length > 0 && (
        <div className={`rounded-lg shadow-sm border ${cardBg}`}>
          <div className={`px-5 py-4 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
            <h3 className={`text-base font-semibold ${textPrimary}`}>Журнал проверок</h3>
          </div>
          <div className={`divide-y ${isDark ? 'divide-gray-700' : 'divide-gray-100'}`}>
            {history.map((item) => (
              <div key={item.id} className={`flex items-center justify-between px-5 py-3 border-l-4 ${historyBorderColor(item.type)} ${isDark ? 'hover:bg-gray-750' : 'hover:bg-gray-50'}`}>
                <div className="min-w-0">
                  <p className={`text-sm font-mono font-semibold ${textPrimary}`}>{item.shipmentId}</p>
                  <p className={`text-xs truncate ${textSecondary}`}>{item.info}</p>
                </div>
                <span className={`text-xs shrink-0 ml-4 ${textSecondary}`}>{item.time}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Full-screen result overlay */}
      {result && (
        <div className={`fixed inset-0 z-50 flex items-center justify-center ${resultOverlayBg} animate-in fade-in zoom-in duration-200`}>
          <div className="text-center p-6 w-full max-w-lg">
            <div className="mb-4 flex justify-center">
              {result.type === 'found' ? (
                <CheckCircle className="w-24 h-24 text-white animate-bounce" />
              ) : (
                <QrCode className="w-24 h-24 text-white animate-pulse" />
              )}
            </div>
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">
              {result.type === 'found' ? 'УСПЕХ' : 'ОШИБКА'}
            </h2>
            <div className="text-xl md:text-2xl font-bold text-white mb-6">
              {result.message}
            </div>
            {result.shipmentNumber && (
              <div className="w-full bg-black bg-opacity-20 p-6 rounded-2xl text-left border border-white border-opacity-20 shadow-xl">
                <div className="flex justify-between text-base text-gray-200 mb-3">
                  <span>Маршрут:</span>
                  <span className="font-bold text-white">{result.fromStation} → {result.toStation}</span>
                </div>
                <div className="flex justify-between text-base text-gray-200 mb-3">
                  <span>Текущая станция:</span>
                  <span className="font-bold text-white">{result.currentStation}</span>
                </div>
                <div className="flex justify-between text-base text-gray-200">
                  <span>Статус:</span>
                  <span className="font-bold text-white">{STATUS_LABELS[result.status || ''] || result.status}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
