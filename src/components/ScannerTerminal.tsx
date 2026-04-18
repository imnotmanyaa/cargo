import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { offlineStorage } from '../lib/offline-storage';

type ScanResult = {
  type: 'success' | 'error' | 'offline' | 'station-error';
  message: string;
  shipmentId?: string;
  status?: string;
};

type ScanHistoryItem = {
  id: string;
  shipmentId: string;
  type: 'success' | 'error' | 'offline' | 'station-error';
  message: string;
  time: string;
};

const SUCCESS_BEEP_FREQ = 880;
const ERROR_BEEP_FREQ = 220;

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
  } catch {
    // AudioContext not available
  }
}

export function ScannerTerminal() {
  const { user } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [scanValue, setScanValue] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [scanCount, setScanCount] = useState(0);
  const [history, setHistory] = useState<ScanHistoryItem[]>([]);

  // Keep input focused always
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

  // Network status + sync
  useEffect(() => {
    const onOnline = async () => {
      setIsOnline(true);
      const token = localStorage.getItem('token');
      if (!token) return;
      const { synced } = await offlineStorage.syncPending(token);
      if (synced > 0) {
        setResult({ type: 'success', message: `✅ Синхронизировано ${synced} сканов` });
      }
      const count = await offlineStorage.countPending();
      setPendingCount(count);
    };
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);

    offlineStorage.countPending().then(setPendingCount);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  // Clear result after 4 seconds
  useEffect(() => {
    if (!result) return;
    const t = setTimeout(() => setResult(null), 4000);
    return () => clearTimeout(t);
  }, [result]);

  const addToHistory = (item: Omit<ScanHistoryItem, 'id' | 'time'>) => {
    const entry: ScanHistoryItem = {
      ...item,
      id: Math.random().toString(36).slice(2),
      time: new Date().toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    };
    setHistory(prev => [entry, ...prev].slice(0, 5));
  };

  const handleScan = useCallback(async (value: string) => {
    const trimmed = value.trim();
    if (!trimmed || isProcessing) return;

    setIsProcessing(true);
    setScanValue('');

    const token = localStorage.getItem('token');
    const endpoint = `/api/shipments/${trimmed}/transit`;
    const body = {
      current_station: user?.station || '',
      operator_id: user?.id || '',
      operator_name: user?.name || '',
    };

    if (!navigator.onLine) {
      // Queue for later sync
      await offlineStorage.enqueueScan({
        shipmentId: trimmed,
        station: user?.station || '',
        status: 'transit',
        endpoint,
        method: 'POST',
        body,
        timestamp: new Date().toISOString(),
      });
      playBeep(SUCCESS_BEEP_FREQ, 80);
      playBeep(SUCCESS_BEEP_FREQ, 80);
      const count = await offlineStorage.countPending();
      setPendingCount(count);
      const msg = `📦 Сохранено оффлайн: ${trimmed}`;
      setResult({ type: 'offline', message: msg, shipmentId: trimmed });
      addToHistory({ shipmentId: trimmed, type: 'offline', message: msg });
      setIsProcessing(false);
      setScanCount(c => c + 1);
      inputRef.current?.focus();
      return;
    }

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const data = await res.json();
        playBeep(SUCCESS_BEEP_FREQ);
        const msg = `✅ ${trimmed}`;
        setResult({
          type: 'success',
          message: msg,
          shipmentId: trimmed,
          status: data.status || data.shipment_status,
        });
        addToHistory({ shipmentId: trimmed, type: 'success', message: msg });
        setScanCount(c => c + 1);
      } else if (res.status === 403) {
        playBeep(ERROR_BEEP_FREQ, 600);
        const msg = `🚫 ОШИБКА СТАНЦИИ: груз ${trimmed} не предназначен для станции «${user?.station || '?'}»`;
        setResult({ type: 'station-error', message: msg, shipmentId: trimmed });
        addToHistory({ shipmentId: trimmed, type: 'station-error', message: msg });
      } else {
        const err = await res.json().catch(() => ({}));
        playBeep(ERROR_BEEP_FREQ, 400);
        const msg = `❌ ${err.error || 'Ошибка — проверьте груз'}`;
        setResult({
          type: 'error',
          message: msg,
          shipmentId: trimmed,
        });
        addToHistory({ shipmentId: trimmed, type: 'error', message: msg });
      }
    } catch {
      playBeep(ERROR_BEEP_FREQ, 400);
      setResult({ type: 'error', message: '⚠️ Ошибка сети' });
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
    result?.type === 'success' ? '#16a34a' :
    result?.type === 'offline' ? '#d97706' :
    result?.type === 'station-error' ? '#7c3aed' :
    '#dc2626';

  const historyColor = (type: ScanHistoryItem['type']) => {
    if (type === 'success') return '#16a34a';
    if (type === 'offline') return '#d97706';
    if (type === 'station-error') return '#7c3aed';
    return '#dc2626';
  };

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
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{ fontSize: 14, color: '#64748b', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>
          CargoTrans · Терминал сбора данных
        </div>
        <div style={{ fontSize: 13, color: '#475569' }}>
          {user?.name} · <span style={{ color: '#60a5fa', fontWeight: 600 }}>{user?.station || 'Станция не задана'}</span>
        </div>
      </div>

      {/* Status pills */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 32, flexWrap: 'wrap', justifyContent: 'center' }}>
        <div style={{
          padding: '6px 14px',
          borderRadius: 999,
          background: isOnline ? '#14532d' : '#7c2d12',
          color: isOnline ? '#86efac' : '#fca5a5',
          fontSize: 13,
          fontWeight: 600,
        }}>
          {isOnline ? '🟢 Онлайн' : '🔴 Оффлайн'}
        </div>
        {pendingCount > 0 && (
          <div style={{
            padding: '6px 14px',
            borderRadius: 999,
            background: '#78350f',
            color: '#fde68a',
            fontSize: 13,
            fontWeight: 600,
          }}>
            ⏳ Ожидает синхронизации: {pendingCount}
          </div>
        )}
        <div style={{
          padding: '6px 14px',
          borderRadius: 999,
          background: '#1e3a5f',
          color: '#93c5fd',
          fontSize: 13,
        }}>
          Сканов за смену: {scanCount}
        </div>
      </div>

      {/* Result display */}
      <div style={{
        width: '100%',
        maxWidth: 480,
        minHeight: 80,
        borderRadius: 16,
        background: result ? resultBg : '#1e293b',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
        padding: '20px 24px',
        transition: 'background 0.3s ease',
        border: result?.type === 'station-error' ? '2px solid #a855f7' : '1px solid #334155',
      }}>
        {result ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: result.type === 'station-error' ? 16 : 22, fontWeight: 700, color: '#fff', marginBottom: 4 }}>
              {result.message}
            </div>
            {result.status && (
              <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)' }}>
                Статус: {result.status}
              </div>
            )}
          </div>
        ) : (
          <div style={{ fontSize: 16, color: '#475569', textAlign: 'center' }}>
            {isProcessing ? '⏳ Обрабатывается...' : 'Ожидание сканирования...'}
          </div>
        )}
      </div>

      {/* Scan input — hidden but focused */}
      <div style={{ width: '100%', maxWidth: 480, position: 'relative' }}>
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
            borderColor: isProcessing ? '#334155' : '#3b82f6',
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
              position: 'absolute',
              right: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              background: '#3b82f6',
              border: 'none',
              borderRadius: 8,
              color: '#fff',
              padding: '8px 16px',
              fontSize: 14,
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            ↵ OK
          </button>
        )}
      </div>

      <div style={{ marginTop: 12, fontSize: 12, color: '#334155', textAlign: 'center' }}>
        Сканер автоматически отправляет данные после считывания QR
      </div>

      {/* Scan history */}
      {history.length > 0 && (
        <div style={{ width: '100%', maxWidth: 480, marginTop: 24 }}>
          <div style={{ fontSize: 11, color: '#475569', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>
            История сканов
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
              borderLeft: `3px solid ${historyColor(item.type)}`,
            }}>
              <span style={{ fontSize: 13, color: '#94a3b8', fontFamily: 'monospace' }}>{item.shipmentId}</span>
              <span style={{ fontSize: 11, color: '#475569' }}>{item.time}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
