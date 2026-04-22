/**
 * ZebraTerminal — полностью изолированный терминал для Zebra TSD (Android 4, WebView).
 * Никаких Tailwind-классов, никаких современных CSS-фич.
 * Только inline-стили, совместимые с Android 4.x WebView.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';

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
  ok: boolean;
  time: string;
};

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

// Стили — только то, что поддерживает Android 4 WebView
const S = {
  root: {
    margin: 0,
    padding: 0,
    fontFamily: 'Arial, Helvetica, sans-serif',
    fontSize: '16px',
    background: '#f0f0f0',
    minHeight: '100vh',
  } as React.CSSProperties,

  header: {
    background: '#1a56db',
    color: '#fff',
    padding: '10px 14px',
    borderBottom: '2px solid #1340a8',
  } as React.CSSProperties,

  headerTitle: {
    fontSize: '18px',
    fontWeight: 'bold',
    margin: 0,
  } as React.CSSProperties,

  headerSub: {
    fontSize: '12px',
    opacity: 0.85,
    marginTop: '2px',
  } as React.CSSProperties,

  logoutBtn: {
    float: 'right' as const,
    background: '#dc2626',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    padding: '8px 14px',
    fontSize: '13px',
    fontWeight: 'bold',
    cursor: 'pointer',
  } as React.CSSProperties,

  statsRow: {
    background: '#1a56db',
    padding: '0 14px 10px',
    overflow: 'hidden',
  } as React.CSSProperties,

  statBox: {
    display: 'inline-block',
    background: 'rgba(255,255,255,0.18)',
    borderRadius: '6px',
    padding: '6px 12px',
    marginRight: '8px',
    marginBottom: '4px',
    color: '#fff',
    fontSize: '12px',
    fontWeight: 'bold',
    verticalAlign: 'top',
  } as React.CSSProperties,

  statNum: {
    display: 'block',
    fontSize: '20px',
    fontWeight: 'bold',
    lineHeight: '1.2',
  } as React.CSSProperties,

  body: {
    padding: '12px',
  } as React.CSSProperties,

  card: {
    background: '#fff',
    borderRadius: '8px',
    border: '1px solid #ddd',
    padding: '14px',
    marginBottom: '12px',
  } as React.CSSProperties,

  label: {
    display: 'block',
    fontSize: '13px',
    color: '#555',
    marginBottom: '6px',
    fontWeight: 'bold',
  } as React.CSSProperties,

  input: {
    display: 'block',
    width: '100%',
    boxSizing: 'border-box' as const,
    padding: '14px 12px',
    fontSize: '18px',
    fontFamily: 'monospace',
    border: '2px solid #1a56db',
    borderRadius: '6px',
    background: '#f8f8ff',
    color: '#111',
    outline: 'none',
    marginBottom: '10px',
    WebkitAppearance: 'none',
  } as React.CSSProperties,

  btnPrimary: {
    display: 'block',
    width: '100%',
    boxSizing: 'border-box' as const,
    padding: '16px',
    fontSize: '18px',
    fontWeight: 'bold',
    background: '#1a56db',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    marginBottom: '8px',
    WebkitAppearance: 'none',
  } as React.CSSProperties,

  btnDisabled: {
    display: 'block',
    width: '100%',
    boxSizing: 'border-box' as const,
    padding: '16px',
    fontSize: '18px',
    fontWeight: 'bold',
    background: '#aaa',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    cursor: 'default',
    marginBottom: '8px',
    WebkitAppearance: 'none',
  } as React.CSSProperties,

  hint: {
    fontSize: '11px',
    color: '#888',
    textAlign: 'center' as const,
    marginTop: '4px',
  } as React.CSSProperties,

  resultOk: {
    background: '#d1fae5',
    border: '2px solid #059669',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '12px',
    textAlign: 'center' as const,
  } as React.CSSProperties,

  resultFail: {
    background: '#fee2e2',
    border: '2px solid #dc2626',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '12px',
    textAlign: 'center' as const,
  } as React.CSSProperties,

  resultWarn: {
    background: '#fef3c7',
    border: '2px solid #d97706',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '12px',
    textAlign: 'center' as const,
  } as React.CSSProperties,

  resultTitle: {
    fontSize: '24px',
    fontWeight: 'bold',
    margin: '0 0 8px 0',
  } as React.CSSProperties,

  resultMsg: {
    fontSize: '15px',
    margin: '0 0 10px 0',
    wordBreak: 'break-word' as const,
  } as React.CSSProperties,

  infoGrid: {
    borderTop: '1px solid rgba(0,0,0,0.1)',
    paddingTop: '10px',
    marginTop: '4px',
    textAlign: 'left' as const,
  } as React.CSSProperties,

  infoRow: {
    fontSize: '13px',
    marginBottom: '5px',
    overflow: 'hidden',
  } as React.CSSProperties,

  infoKey: {
    color: '#666',
    display: 'inline-block',
    minWidth: '100px',
  } as React.CSSProperties,

  infoVal: {
    fontWeight: 'bold',
    color: '#111',
  } as React.CSSProperties,

  historyTitle: {
    fontSize: '13px',
    fontWeight: 'bold',
    color: '#555',
    marginBottom: '8px',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
  } as React.CSSProperties,

  histItem: {
    padding: '8px 10px',
    borderRadius: '5px',
    marginBottom: '5px',
    fontSize: '13px',
    overflow: 'hidden',
  } as React.CSSProperties,

  histItemOk: {
    background: '#d1fae5',
    borderLeft: '4px solid #059669',
  } as React.CSSProperties,

  histItemFail: {
    background: '#fee2e2',
    borderLeft: '4px solid #dc2626',
  } as React.CSSProperties,
};

export function ZebraTerminal() {
  const { user, logout } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const visibleInputRef = useRef<HTMLInputElement>(null);
  const [scanValue, setScanValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [stats, setStats] = useState({ total: 0, ok: 0, fail: 0 });

  // Авто-фокус на скрытый input для сканера штрихкодов
  useEffect(() => {
    const focus = () => { inputRef.current?.focus(); };
    focus();
    document.addEventListener('click', focus);
    document.addEventListener('touchend', focus);
    return () => {
      document.removeEventListener('click', focus);
      document.removeEventListener('touchend', focus);
    };
  }, []);

  const doScan = useCallback(async (code: string) => {
    const trimmed = code.trim();
    if (!trimmed || isLoading) return;

    setIsLoading(true);
    setScanValue('');
    if (visibleInputRef.current) visibleInputRef.current.value = '';

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
        const r: ScanResult = {
          ok: true,
          match,
          shipmentNumber: s.shipment_number,
          fromStation: s.from_station,
          toStation: s.to_station,
          currentStation: s.current_station,
          status: s.shipment_status,
          message: match
            ? 'Груз на правильной станции'
            : 'Груз НЕ на этой станции',
        };
        setResult(r);
        setHistory(prev => [{ id: Date.now() + '', code: s.shipment_number || trimmed, ok: match, time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) }, ...prev].slice(0, 10));
        setStats(prev => ({ total: prev.total + 1, ok: match ? prev.ok + 1 : prev.ok, fail: match ? prev.fail : prev.fail + 1 }));
      } else if (res.status === 404) {
        setResult({ ok: false, match: false, message: 'Груз не найден: ' + trimmed });
        setHistory(prev => [{ id: Date.now() + '', code: trimmed, ok: false, time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) }, ...prev].slice(0, 10));
        setStats(prev => ({ ...prev, total: prev.total + 1, fail: prev.fail + 1 }));
      } else {
        setResult({ ok: false, match: false, message: 'Ошибка сервера (' + res.status + ')' });
      }
    } catch {
      setResult({ ok: false, match: false, message: 'Нет связи с сервером' });
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  }, [isLoading, user]);

  const getResultStyle = () => {
    if (!result) return null;
    if (!result.ok) return S.resultFail;
    if (result.match) return S.resultOk;
    return S.resultWarn;
  };

  const getResultColor = () => {
    if (!result) return '#111';
    if (!result.ok) return '#dc2626';
    if (result.match) return '#059669';
    return '#d97706';
  };

  return (
    <div style={S.root}>
      {/* HEADER */}
      <div style={S.header}>
        <button style={S.logoutBtn} onClick={logout}>Выход</button>
        <p style={S.headerTitle}>Мобильная группа</p>
        <p style={S.headerSub}>{user?.name || ''} · {user?.station || 'Станция не задана'}</p>
      </div>

      {/* STATS BAR */}
      <div style={S.statsRow}>
        <span style={S.statBox}>
          <span style={S.statNum}>{stats.total}</span>
          Проверено
        </span>
        <span style={S.statBox}>
          <span style={S.statNum}>{stats.ok}</span>
          Верных
        </span>
        <span style={S.statBox}>
          <span style={S.statNum}>{stats.fail}</span>
          Ошибок
        </span>
      </div>

      <div style={S.body}>
        {/* RESULT BLOCK */}
        {result && (
          <div style={getResultStyle()!}>
            <p style={{ ...S.resultTitle, color: getResultColor() }}>
              {!result.ok ? '❌ ОШИБКА' : result.match ? '✅ OK' : '⚠️ НЕСОВПАДЕНИЕ'}
            </p>
            <p style={S.resultMsg}>{result.message}</p>
            {result.shipmentNumber && (
              <div style={S.infoGrid}>
                <div style={S.infoRow}>
                  <span style={S.infoKey}>Номер:</span>
                  <span style={S.infoVal}>{result.shipmentNumber}</span>
                </div>
                <div style={S.infoRow}>
                  <span style={S.infoKey}>Маршрут:</span>
                  <span style={S.infoVal}>{result.fromStation} → {result.toStation}</span>
                </div>
                <div style={S.infoRow}>
                  <span style={S.infoKey}>Сейчас:</span>
                  <span style={S.infoVal}>{result.currentStation}</span>
                </div>
                <div style={S.infoRow}>
                  <span style={S.infoKey}>Статус:</span>
                  <span style={S.infoVal}>{STATUS_LABELS[result.status || ''] || result.status}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* SCAN CARD */}
        <div style={S.card}>
          <label style={S.label}>Код груза</label>

          {/* Скрытый input для физического сканера (без клавиатуры) */}
          <input
            ref={inputRef}
            value={scanValue}
            onChange={e => setScanValue(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                doScan(e.currentTarget.value);
              }
            }}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            style={{ position: 'absolute', opacity: 0, width: 1, height: 1, left: -9999 }}
            aria-hidden="true"
          />

          {/* Видимый input для ручного ввода */}
          <input
            ref={visibleInputRef}
            type="text"
            placeholder="Введите или сканируйте..."
            defaultValue=""
            onChange={e => setScanValue(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                doScan(e.currentTarget.value);
                e.currentTarget.value = '';
              }
            }}
            disabled={isLoading}
            autoComplete="off"
            style={S.input}
          />

          <button
            style={isLoading ? S.btnDisabled : S.btnPrimary}
            disabled={isLoading}
            onClick={() => {
              const val = visibleInputRef.current?.value || scanValue;
              if (val) doScan(val);
            }}
          >
            {isLoading ? 'Проверяется...' : 'Проверить'}
          </button>

          <p style={S.hint}>Нажмите Enter или кнопку после ввода кода</p>
        </div>

        {/* HISTORY */}
        {history.length > 0 && (
          <div style={S.card}>
            <p style={S.historyTitle}>Журнал</p>
            {history.map(item => (
              <div key={item.id} style={{ ...S.histItem, ...(item.ok ? S.histItemOk : S.histItemFail) }}>
                <span style={{ float: 'right', color: '#888', fontSize: '11px' }}>{item.time}</span>
                <span style={{ fontWeight: 'bold', fontSize: '13px' }}>
                  {item.ok ? '✓' : '✗'} {item.code}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
