/**
 * Simple ZebraTerminal — минимальный, совместимый с Android 4 WebView.
 * Всё оформлено через inline‑styles, без Tailwind/modern CSS.
 * В верхней строке – кнопки смены языка, темы и выхода.
 * Ошибки/успехи подсвечиваются различными фонами.
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

export function ZebraTerminal() {
  const { user, logout } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const inputRef = useRef<HTMLInputElement>(null);
  const [scanValue, setScanValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [stats, setStats] = useState({ total: 0, ok: 0, fail: 0 });
  const [isDark, setIsDark] = useState(false);

  // переключение языка циклически
  const cycleLang = () => {
    const order: (typeof language)[] = ['ru', 'en', 'kk'];
    const idx = order.indexOf(language as any);
    setLanguage(order[(idx + 1) % order.length]);
  };

  // авто‑фокус для сканера (клик в любом месте, кроме INPUT/BUTTON)
  useEffect(() => {
    const focus = () => inputRef.current?.focus();
    focus();
    const handler = (e: Event) => {
      const tag = (e.target as HTMLElement).tagName;
      if (!['INPUT', 'BUTTON', 'TEXTAREA', 'SELECT'].includes(tag)) focus();
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
          message: match ? t('mobileGroupChecked') + ': ' + s.shipment_number : `⚠️ ${s.shipment_number}`,
        });
        setHistory((prev) => [{ id: Date.now().toString(), code: s.shipment_number || trimmed, match, ok: true, time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) }, ...prev].slice(0, 12));
        setStats((p) => ({ total: p.total + 1, ok: match ? p.ok + 1 : p.ok, fail: match ? p.fail : p.fail + 1 }));
      } else if (res.status === 404) {
        setResult({ ok: false, match: false, message: `❌ ${trimmed} — ${t('mobileGroupRejected')}` });
        setHistory((prev) => [{ id: Date.now().toString(), code: trimmed, match: false, ok: false, time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) }, ...prev].slice(0, 12));
        setStats((p) => ({ ...p, total: p.total + 1, fail: p.fail + 1 }));
      } else {
        setResult({ ok: false, match: false, message: `❌ Ошибка сервера (${res.status})` });
      }
    } catch {
      setResult({ ok: false, match: false, message: '❌ Нет связи с сервером' });
    } finally {
      setIsLoading(false);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [isLoading, user, t]);

  // стили – всё inline, учитывая тему
  const sRoot: React.CSSProperties = {
    margin: 0,
    padding: 0,
    fontFamily: 'Arial,Helvetica,sans-serif',
    background: isDark ? '#111827' : '#f0f0f0',
    minHeight: '100vh',
    color: isDark ? '#f3f4f6' : '#111',
  };
  const sTopBar: React.CSSProperties = {
    background: '#1a56db',
    color: '#fff',
    padding: '8px 12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '8px',
  };
  const sBtn: React.CSSProperties = {
    background: 'rgba(255,255,255,0.15)',
    color: '#fff',
    border: '1px solid rgba(255,255,255,0.3)',
    borderRadius: 4,
    padding: '4px 8px',
    fontSize: 13,
    cursor: 'pointer',
  };
  const sLogout: React.CSSProperties = {
    background: 'rgba(220,38,38,0.75)',
    color: '#fff',
    border: '1px solid rgba(255,255,255,0.3)',
    borderRadius: 4,
    padding: '4px 8px',
    fontSize: 13,
    cursor: 'pointer',
  };
  const sCard: React.CSSProperties = {
    background: isDark ? '#1f2937' : '#fff',
    border: `1px solid ${isDark ? '#374151' : '#ddd'}`,
    borderRadius: 6,
    padding: 12,
    marginBottom: 12,
  };
  const sInput: React.CSSProperties = {
    width: '100%',
    padding: '10px 8px',
    fontSize: 16,
    border: `2px solid ${isDark ? '#4b5563' : '#1a56db'}`,
    borderRadius: 4,
    background: isDark ? '#111827' : '#f8f8ff',
    color: isDark ? '#f3f4f6' : '#111',
  };
  const sBtnPrimary: React.CSSProperties = {
    width: '100%',
    padding: '10px',
    background: '#1a56db',
    color: '#fff',
    border: 'none',
    borderRadius: 4,
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: 16,
  };

  const renderResult = () => {
    if (!result) return null;
    if (!result.ok) {
      return (
        <div style={{ ...sCard, background: '#fee2e2', borderColor: '#dc2626' }}>
          <p style={{ color: '#b91c1c', fontWeight: 'bold', marginBottom: 4 }}>{t('mobileGroupError')}</p>
          <p>{result.message}</p>
        </div>
      );
    }
    if (result.match) {
      return (
        <div style={{ ...sCard, background: '#d1fae5', borderColor: '#059669' }}>
          <p style={{ color: '#059669', fontWeight: 'bold', marginBottom: 4 }}>{t('mobileGroupSuccess')}</p>
          <InfoGrid result={result} />
        </div>
      );
    }
    return (
      <div style={{ ...sCard, background: '#fef3c7', borderColor: '#d97706' }}>
        <p style={{ color: '#d97706', fontWeight: 'bold', marginBottom: 4 }}>⚠️ {t('mobileGroupMismatch')}</p>
        <InfoGrid result={result} />
      </div>
    );
  };

  return (
    <div style={sRoot}>
      {/* Топбар */}
      <div style={sTopBar}>
        <div>{t('appName') || 'CT'}</div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button style={sBtn} onClick={cycleLang}>{language.toUpperCase()}</button>
          <button style={sBtn} onClick={() => setIsDark((d) => !d)}>{isDark ? '☀' : '☾'}</button>
          <button style={sLogout} onClick={logout}>Выход</button>
        </div>
      </div>

      {/* Заголовок */}
      <div style={{ padding: 12 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 'bold', color: isDark ? '#fff' : '#111' }}>{t('mobileGroupTitle')}</h2>
        <p style={{ fontSize: 13, color: isDark ? '#aaa' : '#555' }}>
          <MapPin size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
          {user?.name} · {user?.station || t('mobileGroupStationNotSet')}
        </p>
      </div>

      {/* Статистика */}
      <div style={{ display: 'flex', gap: 8, padding: '0 12px', marginBottom: 12 }}>
        <div style={{ ...sCard, flex: 1, background: '#1e40af', color: '#fff' }}>
          <p style={{ textAlign: 'center', marginBottom: 4 }}>{t('mobileGroupChecked')}</p>
          <p style={{ textAlign: 'center', fontSize: 20, fontWeight: 'bold' }}>{stats.total}</p>
        </div>
        <div style={{ ...sCard, flex: 1, background: '#047857', color: '#fff' }}>
          <p style={{ textAlign: 'center', marginBottom: 4 }}>{t('mobileGroupApproved')}</p>
          <p style={{ textAlign: 'center', fontSize: 20, fontWeight: 'bold' }}>{stats.ok}</p>
        </div>
        <div style={{ ...sCard, flex: 1, background: '#b91c1c', color: '#fff' }}>
          <p style={{ textAlign: 'center', marginBottom: 4 }}>{t('mobileGroupRejected')}</p>
          <p style={{ textAlign: 'center', fontSize: 20, fontWeight: 'bold' }}>{stats.fail}</p>
        </div>
      </div>

      {/* Результат */}
      {renderResult()}

      {/* Поле ввода */}
      <div style={sCard}>
        <p style={{ marginBottom: 4, fontWeight: 'bold', color: isDark ? '#fff' : '#111' }}>{t('mobileGroupScanTitle')}</p>
        <input
          ref={inputRef}
          type="text"
          value={scanValue}
          onChange={(e) => setScanValue(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && scanValue.trim()) doScan(scanValue); }}
          placeholder={isLoading ? t('mobileGroupChecking') : t('mobileGroupScanPlaceholder')}
          disabled={isLoading}
          style={sInput}
        />
        <button
          onClick={() => scanValue.trim() && doScan(scanValue)}
          disabled={isLoading || !scanValue.trim()}
          style={sBtnPrimary}
        >
          {isLoading ? t('mobileGroupChecking') : t('mobileGroupCheckButton')}
        </button>
        <p style={{ fontSize: 12, color: isDark ? '#bbb' : '#777', textAlign: 'center' }}>{t('mobileGroupReadOnly')}</p>
      </div>

      {/* Журнал */}
      {history.length > 0 && (
        <div style={sCard}>
          <p style={{ fontWeight: 'bold', marginBottom: 4 }}>{t('mobileGroupHistory')}</p>
          {history.map((item) => (
            <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderLeft: `4px solid ${!item.ok ? '#dc2626' : item.match ? '#059669' : '#d97706'}` }}>
              <span style={{ fontFamily: 'monospace' }}>{!item.ok ? '✗' : item.match ? '✓' : '⚠'} {item.code}</span>
              <span style={{ fontSize: 12, color: isDark ? '#bbb' : '#777' }}>{item.time}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function InfoGrid({ result }: { result: ScanResult }) {
  return (
    <div style={{ fontSize: 14, lineHeight: 1.5 }}>
      {result.shipmentNumber && (
        <div><strong>Номер:</strong> {result.shipmentNumber}</div>
      )}
      {result.fromStation && (
        <div><strong>Маршрут:</strong> {result.fromStation} → {result.toStation}</div>
      )}
      {result.currentStation && (
        <div><strong>Сейчас:</strong> {result.currentStation}</div>
      )}
      {result.status && (
        <div><strong>Статус:</strong> {STATUS_LABELS[result.status] || result.status}</div>
      )}
    </div>
  );
}
