/**
 * ZebraTerminal — восстановленный дизайн согласно фото.
 * Используются только inline-стили для максимальной совместимости с Android 4 WebView.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Search, MapPin, Package, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

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

export function ZebraTerminal() {
  const { user, logout } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const inputRef = useRef<HTMLInputElement>(null);
  const [scanValue, setScanValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [stats, setStats] = useState({ total: 0, ok: 0, fail: 0, mismatch: 0 });
  const [isDark, setIsDark] = useState(false);

  const cycleLang = () => {
    const order: any[] = ['ru', 'en', 'kk'];
    const idx = order.indexOf(language);
    setLanguage(order[(idx + 1) % order.length]);
  };

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
          ok: true, match,
          shipmentNumber: s.shipment_number,
          fromStation: s.from_station,
          toStation: s.to_station,
          currentStation: s.current_station,
          status: s.shipment_status,
          message: match ? t('mobileGroupChecked') : t('mobileGroupMismatch'),
        });
        setHistory((prev) => [{
          id: Date.now().toString(),
          code: s.shipment_number || trimmed,
          match, ok: true,
          time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
        }, ...prev].slice(0, 5));
        setStats((p) => ({
          total: p.total + 1,
          ok: match ? p.ok + 1 : p.ok,
          fail: p.fail,
          mismatch: match ? p.mismatch : p.mismatch + 1
        }));
      } else if (res.status === 404) {
        setResult({ ok: false, match: false, message: t('mobileGroupRejected') });
        setHistory((prev) => [{
          id: Date.now().toString(),
          code: trimmed,
          match: false, ok: false,
          time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
        }, ...prev].slice(0, 5));
        setStats((p) => ({ ...p, total: p.total + 1, fail: p.fail + 1 }));
      }
    } catch {
      setResult({ ok: false, match: false, message: 'Ошибка сети' });
    } finally {
      setIsLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isLoading, user, t]);

  // Стили из фото
  const s = {
    container: {
      background: isDark ? '#111' : '#f4f7f9',
      minHeight: '100vh',
      fontFamily: 'sans-serif',
      padding: '20px 15px',
      textAlign: 'center' as const,
      color: isDark ? '#fff' : '#333',
    },
    topControls: {
      display: 'flex',
      justifyContent: 'flex-end',
      gap: '8px',
      marginBottom: '10px',
    },
    controlBtn: {
      background: 'rgba(0,0,0,0.05)',
      border: '1px solid rgba(0,0,0,0.1)',
      borderRadius: '4px',
      padding: '4px 8px',
      fontSize: '12px',
      cursor: 'pointer',
      color: isDark ? '#fff' : '#333',
    },
    badge: {
      display: 'inline-flex',
      alignItems: 'center',
      background: '#1a56db',
      color: '#fff',
      padding: '6px 16px',
      borderRadius: '20px',
      fontSize: '14px',
      fontWeight: 'bold',
      textTransform: 'uppercase' as const,
      gap: '8px',
      marginBottom: '15px',
    },
    title: {
      fontSize: '14px',
      color: isDark ? '#ccc' : '#6b7280',
      marginBottom: '20px',
    },
    statsContainer: {
      display: 'flex',
      flexWrap: 'wrap' as const,
      justifyContent: 'center',
      gap: '8px',
      marginBottom: '30px',
    },
    statCapsule: (bg: string, color: string) => ({
      background: bg,
      color: color,
      padding: '4px 12px',
      borderRadius: '15px',
      fontSize: '13px',
      fontWeight: 500,
    }),
    statusCard: {
      background: '#fff',
      borderRadius: '12px',
      padding: '30px 20px',
      boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
      marginBottom: '25px',
      fontSize: '18px',
      color: '#374151',
    },
    inputBox: {
      background: '#fff',
      border: '2px solid #2563eb',
      borderRadius: '12px',
      padding: '20px',
      fontSize: '22px',
      color: '#1f2937',
      width: '100%',
      boxSizing: 'border-box' as const,
      outline: 'none',
      textAlign: 'center' as const,
    },
    resultOverlay: (ok: boolean, match: boolean) => ({
      marginTop: '15px',
      padding: '10px',
      borderRadius: '8px',
      background: !ok ? '#fee2e2' : !match ? '#fef3c7' : '#d1fae5',
      color: !ok ? '#b91c1c' : !match ? '#d97706' : '#065f46',
      fontWeight: 'bold',
      fontSize: '14px',
    })
  };

  return (
    <div style={s.container}>
      {/* Кнопки управления (язык, тема, выход) - аккуратно сверху */}
      <div style={s.topControls}>
        <button style={s.controlBtn} onClick={cycleLang}>{language.toUpperCase()}</button>
        <button style={s.controlBtn} onClick={() => setIsDark(!isDark)}>{isDark ? '☀' : '☾'}</button>
        <button style={{...s.controlBtn, background: '#ef4444', color: '#fff'}} onClick={logout}>Выход</button>
      </div>

      {/* Синий бадж */}
      <div style={s.badge}>
        <Search size={16} />
        МОБИЛЬНАЯ ГРУППА
      </div>

      {/* Заголовок */}
      <div style={s.title}>
        Мобильная Группа {user?.station || 'Караганда'} · {language === 'kk' ? 'Қарағанды' : 'Қарағанды'}
      </div>

      {/* Статистика */}
      <div style={s.statsContainer}>
        <div style={s.statCapsule('#dbeafe', '#1e40af')}>Проверено: {stats.total}</div>
        <div style={s.statCapsule('#dcfce7', '#166534')}>Одобрено: {stats.ok}</div>
        <div style={s.statCapsule('#fee2e2', '#991b1b')}>Отклонено: {stats.fail}</div>
        <div style={s.statCapsule('#fef3c7', '#92400e')}>Несовп. станции: {stats.mismatch}</div>
      </div>

      {/* Карточка статуса */}
      <div style={s.statusCard}>
        {isLoading ? 'Проверка...' : result ? result.message : 'Готов к сканированию'}
        {result?.shipmentNumber && <div style={{fontSize: '12px', marginTop: '5px'}}>№ {result.shipmentNumber}</div>}
      </div>

      {/* Поле ввода (Scanner Input) */}
      <input
        ref={inputRef}
        type="text"
        value={scanValue}
        onChange={(e) => setScanValue(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' && scanValue.trim()) doScan(scanValue); }}
        placeholder="Наведите сканер.."
        disabled={isLoading}
        style={s.inputBox}
        autoFocus
      />

      {/* Последние записи (мини-журнал) */}
      <div style={{marginTop: '20px', fontSize: '12px', color: '#9ca3af'}}>
        {history.map(h => (
          <div key={h.id} style={{marginBottom: '4px'}}>
            {h.ok ? (h.match ? '✅' : '⚠️') : '❌'} {h.code} — {h.time}
          </div>
        ))}
      </div>
    </div>
  );
}
