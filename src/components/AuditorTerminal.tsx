import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';

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

/**
 * AuditorTerminal — терминал для роли «Ревизор».
 * Позволяет сканировать грузы и проверять их данные/маршрут
 * БЕЗ изменения статуса (ТЗ п.4, п.7).
 */
export function AuditorTerminal() {
  const { user } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [scanValue, setScanValue] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<AuditResult | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [checkCount, setCheckCount] = useState(0);

  useEffect(() => {
    const refocus = () => inputRef.current?.focus();
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
        setCheckCount(c => c + 1);
      } else if (res.status === 404) {
        playBeep(220, 500);
        setResult({ type: 'not-found', shipmentId: trimmed, message: `❌ Груз ${trimmed} не найден в системе` });
        addToHistory({ shipmentId: trimmed, type: 'not-found', info: 'Не найден' });
      } else if (res.status === 403) {
        playBeep(220, 400);
        setResult({ type: 'error', shipmentId: trimmed, message: '🚫 Нет доступа — только для ревизора' });
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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleScan(e.currentTarget.value);
    }
  };

  const resultBg =
    result?.type === 'found' ? '#166534' :
    result?.type === 'station-mismatch' ? '#92400e' :
    result?.type === 'not-found' ? '#991b1b' :
    '#7f1d1d';

  const historyDot = (type: HistoryItem['type']) =>
    type === 'found' ? '#22c55e' :
    type === 'station-mismatch' ? '#f59e0b' :
    '#ef4444';

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0f172a',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'system-ui, sans-serif',
      padding: '16px',
      userSelect: 'none',
    }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <div style={{
          display: 'inline-block',
          background: '#7c3aed',
          color: '#ede9fe',
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: 2,
          textTransform: 'uppercase',
          padding: '4px 12px',
          borderRadius: 999,
          marginBottom: 12,
        }}>
          🔍 Режим ревизии — только чтение
        </div>
        <div style={{ fontSize: 14, color: '#64748b', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 }}>
          CargoTrans · Терминал ревизора
        </div>
        <div style={{ fontSize: 13, color: '#475569' }}>
          {user?.name} · <span style={{ color: '#a78bfa', fontWeight: 600 }}>{user?.station || 'Станция не задана'}</span>
        </div>
      </div>

      {/* Counter */}
      <div style={{ marginBottom: 24 }}>
        <div style={{
          padding: '6px 20px',
          borderRadius: 999,
          background: '#1e1b4b',
          color: '#a5b4fc',
          fontSize: 13,
        }}>
          Проверено за смену: <strong>{checkCount}</strong>
        </div>
      </div>

      {/* Result panel */}
      <div style={{
        width: '100%',
        maxWidth: 520,
        minHeight: 120,
        borderRadius: 20,
        background: result ? resultBg : '#1e293b',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
        padding: '20px 24px',
        transition: 'background 0.3s ease',
        border: '1px solid #334155',
        gap: 8,
      }}>
        {result ? (
          <>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#fff', textAlign: 'center' }}>
              {result.message}
            </div>
            {result.shipmentNumber && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, width: '100%', marginTop: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>
                  <span>Маршрут:</span>
                  <span style={{ fontWeight: 600 }}>{result.fromStation} → {result.toStation}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>
                  <span>Текущая станция:</span>
                  <span style={{ fontWeight: 600 }}>{result.currentStation}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>
                  <span>Статус:</span>
                  <span style={{ fontWeight: 600 }}>{STATUS_LABELS[result.status || ''] || result.status}</span>
                </div>
              </div>
            )}
          </>
        ) : (
          <div style={{ fontSize: 16, color: '#475569', textAlign: 'center' }}>
            {isProcessing ? '🔍 Проверяется...' : 'Ожидание сканирования...'}
          </div>
        )}
      </div>

      {/* Scan input */}
      <div style={{ width: '100%', maxWidth: 520, position: 'relative' }}>
        <input
          ref={inputRef}
          value={scanValue}
          onChange={e => setScanValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isProcessing}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          placeholder="Наведите сканер на QR-код..."
          style={{
            width: '100%',
            padding: '20px 24px',
            fontSize: 20,
            fontFamily: 'monospace',
            letterSpacing: 2,
            borderRadius: 16,
            border: '2px solid',
            borderColor: isProcessing ? '#334155' : '#7c3aed',
            background: '#1e293b',
            color: '#f1f5f9',
            outline: 'none',
            textAlign: 'center',
            boxSizing: 'border-box',
            transition: 'border-color 0.2s',
          }}
        />
        {scanValue && (
          <button
            onClick={() => handleScan(scanValue)}
            style={{
              position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
              background: '#7c3aed', border: 'none', borderRadius: 8, color: '#fff',
              padding: '8px 16px', fontSize: 14, cursor: 'pointer', fontWeight: 600,
            }}
          >
            🔍 Проверить
          </button>
        )}
      </div>

      <div style={{ marginTop: 10, fontSize: 12, color: '#334155', textAlign: 'center' }}>
        Режим только чтения — статус грузов не изменяется
      </div>

      {/* History */}
      {history.length > 0 && (
        <div style={{ width: '100%', maxWidth: 520, marginTop: 24 }}>
          <div style={{ fontSize: 11, color: '#475569', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>
            Журнал проверок
          </div>
          {history.map(item => (
            <div key={item.id} style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '8px 12px',
              borderRadius: 8,
              background: '#1e293b',
              marginBottom: 4,
              borderLeft: `3px solid ${historyDot(item.type)}`,
            }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: 13, color: '#94a3b8', fontFamily: 'monospace' }}>{item.shipmentId}</span>
                {item.info && <span style={{ fontSize: 11, color: '#475569' }}>{item.info}</span>}
              </div>
              <span style={{ fontSize: 11, color: '#475569', flexShrink: 0, marginLeft: 12 }}>{item.time}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
