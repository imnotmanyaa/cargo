/**
 * ZebraTerminal — изолированный терминал для Zebra TSD (Android 4, WebView).
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

const S = {
  root: {
    margin: 0,
    padding: 0,
    fontFamily: 'Arial, Helvetica, sans-serif',
    fontSize: '16px',
    background: '#f0f0f0',
    minHeight: '100vh',
  } as React.CSSProperties,

  // ── ТОПБАР ──────────────────────────────────────────────
  topbar: {
    background: '#1a56db',
    color: '#fff',
    padding: '0 12px',
    height: '48px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottom: '2px solid #1340a8',
    position: 'sticky' as const,
    top: 0,
    zIndex: 100,
  } as React.CSSProperties,

  topbarLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    minWidth: 0,
    overflow: 'hidden',
  } as React.CSSProperties,

  logo: {
    background: 'rgba(255,255,255,0.25)',
    borderRadius: '6px',
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 'bold',
    fontSize: '13px',
    flexShrink: 0,
  } as React.CSSProperties,

  topbarName: {
    fontSize: '14px',
    fontWeight: 'bold',
    overflow: 'hidden',
    whiteSpace: 'nowrap' as const,
    textOverflow: 'ellipsis',
  } as React.CSSProperties,

  topbarStation: {
    fontSize: '11px',
    opacity: 0.8,
    overflow: 'hidden',
    whiteSpace: 'nowrap' as const,
    textOverflow: 'ellipsis',
  } as React.CSSProperties,

  logoutBtn: {
    background: 'rgba(255,255,255,0.18)',
    color: '#fff',
    border: '1px solid rgba(255,255,255,0.35)',
    borderRadius: '6px',
    padding: '6px 12px',
    fontSize: '13px',
    fontWeight: 'bold',
    cursor: 'pointer',
    flexShrink: 0,
    WebkitAppearance: 'none' as const,
  } as React.CSSProperties,

  // ── СТАТИСТИКА ──────────────────────────────────────────
  statsRow: {
    background: '#1340a8',
    padding: '8px 12px',
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap' as const,
  } as React.CSSProperties,

  statBox: {
    background: 'rgba(255,255,255,0.15)',
    borderRadius: '6px',
    padding: '4px 12px',
    color: '#fff',
    fontSize: '12px',
    fontWeight: 'bold',
    textAlign: 'center' as const,
    flex: '1 1 auto',
  } as React.CSSProperties,

  statNum: {
    display: 'block',
    fontSize: '20px',
    fontWeight: 'bold',
    lineHeight: '1.2',
  } as React.CSSProperties,

  // ── BODY ────────────────────────────────────────────────
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
    fontSize: '20px',
    fontFamily: 'monospace',
    border: '2px solid #1a56db',
    borderRadius: '6px',
    background: '#f8f8ff',
    color: '#111',
    outline: 'none',
    marginBottom: '10px',
    WebkitAppearance: 'none' as const,
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
    WebkitAppearance: 'none' as const,
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
    WebkitAppearance: 'none' as const,
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
    fontSize: '22px',
    fontWeight: 'bold',
    margin: '0 0 8px 0',
  } as React.CSSProperties,

  resultMsg: {
    fontSize: '14px',
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
    minWidth: '90px',
  } as React.CSSProperties,

  infoVal: {
    fontWeight: 'bold',
    color: '#111',
  } as React.CSSProperties,

  historyTitle: {
    fontSize: '12px',
    fontWeight: 'bold',
    color: '#666',
    marginBottom: '8px',
    textTransform: 'uppercase' as const,
  } as React.CSSProperties,

  histItem: {
    padding: '7px 10px',
    borderRadius: '5px',
    marginBottom: '4px',
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
  // Единственный input — одновременно работает и со сканером и с клавиатурой
  const inputRef = useRef<HTMLInputElement>(null);
  const [scanValue, setScanValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [stats, setStats] = useState({ total: 0, ok: 0, fail: 0 });

  // Фокус только при клике НЕ на input/button,
  // чтобы сканер ШК сразу писал в поле без лишних кликов.
  useEffect(() => {
    inputRef.current?.focus();
    const handler = (e: Event) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag !== 'INPUT' && tag !== 'BUTTON' && tag !== 'TEXTAREA') {
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
          ok: true,
          match,
          shipmentNumber: s.shipment_number,
          fromStation: s.from_station,
          toStation: s.to_station,
          currentStation: s.current_station,
          status: s.shipment_status,
          message: match ? 'Груз на правильной станции' : 'Груз НЕ на этой станции',
        });
        setHistory(prev => [{
          id: String(Date.now()),
          code: s.shipment_number || trimmed,
          ok: match,
          time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
        }, ...prev].slice(0, 10));
        setStats(prev => ({
          total: prev.total + 1,
          ok: match ? prev.ok + 1 : prev.ok,
          fail: match ? prev.fail : prev.fail + 1,
        }));
      } else if (res.status === 404) {
        setResult({ ok: false, match: false, message: 'Груз не найден: ' + trimmed });
        setHistory(prev => [{
          id: String(Date.now()),
          code: trimmed,
          ok: false,
          time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
        }, ...prev].slice(0, 10));
        setStats(prev => ({ ...prev, total: prev.total + 1, fail: prev.fail + 1 }));
      } else {
        setResult({ ok: false, match: false, message: 'Ошибка сервера (' + res.status + ')' });
      }
    } catch {
      setResult({ ok: false, match: false, message: 'Нет связи с сервером' });
    } finally {
      setIsLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isLoading, user]);

  const resultStyle = !result ? null
    : !result.ok ? S.resultFail
    : result.match ? S.resultOk
    : S.resultWarn;

  const resultColor = !result ? '#111'
    : !result.ok ? '#dc2626'
    : result.match ? '#059669'
    : '#d97706';

  return (
    <div style={S.root}>

      {/* ── МИНИМАЛЬНЫЙ ТОПБАР ─────────────────────── */}
      <div style={S.topbar}>
        <div style={S.topbarLeft}>
          <div style={S.logo}>CT</div>
          <div style={{ overflow: 'hidden' }}>
            <div style={S.topbarName}>{user?.name || 'Сотрудник'}</div>
            <div style={S.topbarStation}>{user?.station || 'Станция не задана'}</div>
          </div>
        </div>
        <button style={S.logoutBtn} onClick={logout}>Выход</button>
      </div>

      {/* ── СТАТИСТИКА ─────────────────────────────── */}
      <div style={S.statsRow}>
        <div style={S.statBox}>
          <span style={S.statNum}>{stats.total}</span>
          Проверено
        </div>
        <div style={S.statBox}>
          <span style={{ ...S.statNum, color: '#86efac' }}>{stats.ok}</span>
          Верных
        </div>
        <div style={S.statBox}>
          <span style={{ ...S.statNum, color: '#fca5a5' }}>{stats.fail}</span>
          Ошибок
        </div>
      </div>

      {/* ── КОНТЕНТ ────────────────────────────────── */}
      <div style={S.body}>

        {/* Результат */}
        {result && (
          <div style={resultStyle!}>
            <p style={{ ...S.resultTitle, color: resultColor }}>
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

        {/* Ввод кода */}
        <div style={S.card}>
          <label style={S.label}>Код груза</label>

          {/* Один input — работает и со сканером и с руками */}
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
            placeholder="Сканируйте или введите..."
            disabled={isLoading}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            style={S.input}
          />

          <button
            style={isLoading ? S.btnDisabled : S.btnPrimary}
            disabled={isLoading}
            onClick={() => { if (scanValue.trim()) doScan(scanValue); }}
          >
            {isLoading ? 'Проверяется...' : 'Проверить'}
          </button>

          <p style={S.hint}>Enter или кнопка для проверки</p>
        </div>

        {/* Журнал */}
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
