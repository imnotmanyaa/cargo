import { withApiBase } from "../lib/api-base";
import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  CheckCircle, XCircle, AlertTriangle, RefreshCw,
  Scan, Clock, MapPin, Package, ArrowRight, ClipboardList
} from 'lucide-react';

interface AuditEntry {
  id: string;
  time: string;
  action: 'LOADED' | 'ARRIVED' | 'ERROR';
  shipmentNumber: string;
  message: string;
}

interface ReceiverDashboardProps {
  theme?: 'light' | 'dark';
}

export function ReceiverDashboard({ theme = 'light' }: ReceiverDashboardProps) {
  const isDark = theme === 'dark';
  const { user } = useAuth();

  const [scanInput, setScanInput] = useState('');
  const [processing, setProcessing] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: 'success-load' | 'success-arrive' | 'warning' | 'error';
    message: string;
  } | null>(null);
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);
  const [showAudit, setShowAudit] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus on mount and after feedback clears
  useEffect(() => {
    if (!processing) {
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [processing, feedback]);

  // Clear feedback after 2 seconds, then refocus
  useEffect(() => {
    if (!feedback) return;
    const t = setTimeout(() => setFeedback(null), 2000);
    return () => clearTimeout(t);
  }, [feedback]);

  const extractId = (raw: string): string => {
    const trimmed = raw.trim();
    if (trimmed.startsWith('{')) {
      try {
        const p = JSON.parse(trimmed);
        if (p.id) return p.id;
      } catch { /* ignore */ }
    }
    if (trimmed.includes('/shipment/')) {
      const part = trimmed.split('/shipment/')[1];
      return part.split('?')[0].split('#')[0] || trimmed;
    }
    const shMatch = trimmed.match(/SH-[A-Z0-9-]+/i);
    if (shMatch) return shMatch[0].toUpperCase();
    return trimmed;
  };

  const handleScan = useCallback(async (raw: string) => {
    const id = extractId(raw);
    if (!id || !user?.station) return;

    setProcessing(true);
    setScanInput('');

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(withApiBase(`/api/shipments/${encodeURIComponent(id)}/smart-scan`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({}),
        cache: 'no-store',
      });

      const body = await res.json().catch(() => ({}));

      if (res.ok) {
        const action = body.action as 'LOADED' | 'ARRIVED';
        const shipmentNum = body.shipment?.shipment_number || id;
        const msg = body.message || (action === 'LOADED'
          ? `Груз ${shipmentNum} погружен ✓`
          : `Груз ${shipmentNum} принят ✓`);

        setFeedback({
          type: action === 'LOADED' ? 'success-load' : 'success-arrive',
          message: msg,
        });
        setAuditLog(prev => [{
          id: Date.now().toString(),
          time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          action,
          shipmentNumber: shipmentNum,
          message: msg,
        }, ...prev]);
      } else {
        const isConflict = res.status === 409;
        const errMsg = body.error || 'Ошибка сканирования';
        setFeedback({ type: isConflict ? 'warning' : 'error', message: errMsg });
        setAuditLog(prev => [{
          id: Date.now().toString(),
          time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          action: 'ERROR',
          shipmentNumber: id,
          message: errMsg,
        }, ...prev]);
      }
    } catch {
      setFeedback({ type: 'error', message: 'Ошибка сети. Проверьте подключение.' });
    } finally {
      setProcessing(false);
    }
  }, [user?.station]);

  const bgColor = isDark ? 'bg-gray-900' : 'bg-slate-50';
  const cardBg = isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200';
  const textPrimary = isDark ? 'text-white' : 'text-gray-900';
  const textSecondary = isDark ? 'text-gray-400' : 'text-gray-500';

  return (
    <div className={`min-h-screen ${bgColor} flex flex-col`}>

      {/* ── FULLSCREEN FEEDBACK OVERLAY ── */}
      {feedback && (
        <div
          className={`fixed inset-0 z-50 flex flex-col items-center justify-center transition-all duration-200 ${
            feedback.type === 'success-load'   ? 'bg-blue-600' :
            feedback.type === 'success-arrive' ? 'bg-green-600' :
            feedback.type === 'warning'        ? 'bg-amber-500' :
                                                  'bg-red-600'
          }`}
        >
          <div className="text-center p-8">
            {feedback.type === 'success-load' || feedback.type === 'success-arrive' ? (
              <CheckCircle className="w-28 h-28 text-white mx-auto mb-6 animate-bounce" />
            ) : feedback.type === 'warning' ? (
              <AlertTriangle className="w-28 h-28 text-white mx-auto mb-6" />
            ) : (
              <XCircle className="w-28 h-28 text-white mx-auto mb-6 animate-pulse" />
            )}
            <p className="text-4xl md:text-6xl font-black text-white mb-4 uppercase tracking-wide">
              {feedback.type === 'success-load'   ? 'ПОГРУЖЕН' :
               feedback.type === 'success-arrive' ? 'ПРИНЯТ'   :
               feedback.type === 'warning'        ? 'УЖЕ ОБРАБОТАН' :
                                                    'ОШИБКА'}
            </p>
            <p className="text-xl md:text-2xl text-white/90 font-medium">{feedback.message}</p>
          </div>
        </div>
      )}

      {/* ── HEADER ── */}
      <div className={`border-b ${isDark ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'} px-4 py-3 flex items-center justify-between`}>
        <div>
          <h1 className={`text-lg font-bold ${textPrimary}`}>Приемосдатчик</h1>
          <p className={`text-xs flex items-center gap-1 mt-0.5 ${textSecondary}`}>
            <MapPin className="w-3 h-3" />
            {user?.station || 'Станция не указана'}
          </p>
        </div>
        <button
          onClick={() => setShowAudit(v => !v)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            showAudit
              ? 'bg-blue-600 text-white'
              : (isDark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')
          }`}
        >
          <ClipboardList className="w-4 h-4" />
          Журнал {auditLog.length > 0 && `(${auditLog.length})`}
        </button>
      </div>

      {showAudit ? (
        /* ── AUDIT LOG VIEW ── */
        <div className="flex-1 overflow-y-auto p-4 max-w-2xl w-full mx-auto">
          <h2 className={`text-base font-semibold mb-3 ${textPrimary}`}>Журнал смены</h2>
          {auditLog.length === 0 ? (
            <div className={`text-center py-16 ${textSecondary}`}>
              <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p>Журнал пуст</p>
            </div>
          ) : (
            <div className="space-y-2">
              {auditLog.map(entry => (
                <div key={entry.id} className={`flex items-center gap-3 p-3 rounded-xl border ${cardBg}`}>
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                    entry.action === 'LOADED'  ? 'bg-blue-100 text-blue-600' :
                    entry.action === 'ARRIVED' ? 'bg-green-100 text-green-600' :
                                                 'bg-red-100 text-red-600'
                  }`}>
                    {entry.action === 'LOADED'  ? <Package className="w-4 h-4" /> :
                     entry.action === 'ARRIVED' ? <CheckCircle className="w-4 h-4" /> :
                                                  <XCircle className="w-4 h-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-semibold text-sm truncate ${textPrimary}`}>{entry.shipmentNumber}</p>
                    <p className={`text-xs truncate ${textSecondary}`}>{entry.message}</p>
                  </div>
                  <div className={`flex items-center gap-1 text-xs flex-shrink-0 ${textSecondary}`}>
                    <Clock className="w-3 h-3" />
                    {entry.time}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* ── MAIN SCAN VIEW ── */
        <div className="flex-1 flex flex-col items-center justify-center p-4 max-w-lg w-full mx-auto">

          {/* Legend */}
          <div className={`w-full rounded-2xl border p-4 mb-6 ${cardBg}`}>
            <p className={`text-xs font-semibold uppercase tracking-widest mb-3 ${textSecondary}`}>Логика сканирования</p>
            <div className="space-y-2.5 text-sm">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
                <span className={textSecondary}>
                  <span className={`font-medium ${isDark ? 'text-blue-400' : 'text-blue-700'}`}>ГОТОВ К ПОГРУЗКЕ</span>
                  {' '}+ ваша станция = отправление
                </span>
                <ArrowRight className="w-3 h-3 text-gray-400 ml-auto flex-shrink-0" />
                <span className="font-bold text-blue-600">ПОГРУЖЕН</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
                <span className={textSecondary}>
                  <span className={`font-medium ${isDark ? 'text-green-400' : 'text-green-700'}`}>В ПУТИ</span>
                  {' '}+ ваша станция = назначение
                </span>
                <ArrowRight className="w-3 h-3 text-gray-400 ml-auto flex-shrink-0" />
                <span className="font-bold text-green-600">ПРИНЯТ</span>
              </div>
            </div>
          </div>

          {/* Scan input */}
          <div className={`w-full rounded-2xl border p-5 ${cardBg}`}>
            <div className={`flex items-center gap-2 mb-4 text-sm font-medium ${textSecondary}`}>
              <Scan className="w-4 h-4" />
              Сканируйте QR или введите номер груза
            </div>
            <input
              ref={inputRef}
              type="text"
              inputMode="none"
              autoFocus
              autoComplete="off"
              value={scanInput}
              disabled={processing}
              onChange={e => setScanInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  const val = e.currentTarget.value.trim();
                  if (val) handleScan(val);
                }
              }}
              placeholder="SH-000123 или отсканируйте QR..."
              className={`w-full px-4 py-4 text-lg border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                processing
                  ? (isDark ? 'bg-gray-700 border-gray-600 text-gray-400' : 'bg-gray-100 border-gray-200 text-gray-400')
                  : (isDark ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-500' : 'bg-white border-gray-300 placeholder-gray-400')
              }`}
            />
            <button
              onClick={() => { const v = scanInput.trim(); if (v) handleScan(v); }}
              disabled={!scanInput.trim() || processing}
              className="mt-3 w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-bold text-base transition-colors"
            >
              {processing ? (
                <span className="flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Обработка...
                </span>
              ) : 'Подтвердить сканирование'}
            </button>
          </div>

          {/* Station hint */}
          <p className={`mt-4 text-xs text-center ${textSecondary}`}>
            Станция: <span className="font-semibold">{user?.station || '—'}</span>
          </p>
        </div>
      )}
    </div>
  );
}