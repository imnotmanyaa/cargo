import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { CheckCircle, QrCode, ArrowLeft, Sun, Moon, Globe } from 'lucide-react';

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
 * AuditorTerminal — терминал проверки для mobile_group.
 * Позволяет сканировать грузы и проверять их данные/маршрут
 * без изменения статуса.
 */
export function AuditorTerminal() {
  const { user, logout } = useAuth();
  const { language, setLanguage } = useLanguage();
  const inputRef = useRef<HTMLInputElement>(null);
  const [scanValue, setScanValue] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<AuditResult | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [stats, setStats] = useState({ total: 0, approved: 0, rejected: 0, mismatch: 0 });
  const [isDark, setIsDark] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const bg = isDark ? '#0f172a' : '#f8fafc';
  const cardBg = isDark ? '#1e293b' : '#ffffff';
  const textPrimary = isDark ? '#f1f5f9' : '#1e293b';


  useEffect(() => {
    // Check if element or any parent is interactive (closest() not supported on old TSD browsers)
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
        setStats(prev => ({ ...prev, total: prev.total + 1, rejected: prev.rejected + 1 }));
      }
    } catch {
      playBeep(220, 400);
      setResult({ type: 'error', shipmentId: trimmed, message: '⚠️ Ошибка сети' });
    } finally {
      setIsProcessing(false);
      inputRef.current?.focus();
    }
  }, [isProcessing, user]);

  const resultBg =
    result?.type === 'found' ? '#16a34a' : // Светло-зеленый
    result?.type === 'station-mismatch' ? '#ea580c' : // Оранжевый
    result?.type === 'not-found' ? '#dc2626' : // Ярко-красный
    '#dc2626';

  const historyDot = (type: HistoryItem['type']) =>
    type === 'found' ? '#22c55e' :
    type === 'station-mismatch' ? '#f59e0b' :
    '#ef4444';

  return (
    <div style={{ minHeight: '100vh', background: bg, display: 'flex', flexDirection: 'column', fontFamily: 'system-ui, sans-serif', userSelect: 'none' }}>

      {/* TOP TOOLBAR */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: cardBg, borderBottom: isDark ? '1px solid #334155' : '1px solid #e2e8f0', position: 'sticky', top: 0, zIndex: 100, gap: 8, minHeight: 52 }}>
        {/* Back Button — icon + text on wide, icon-only on narrow */}
        <button
          onMouseDown={(e) => { e.stopPropagation(); }}
          onClick={(e) => { e.stopPropagation(); logout(); }}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', background: '#ef4444', color: 'white', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap' }}
        >
          <ArrowLeft size={16} />
          <span style={{ display: 'var(--back-text-display, inline)' } as React.CSSProperties}>Назад</span>
        </button>

        {/* Title — truncate on small screens */}
        <div style={{ color: textPrimary, fontWeight: 700, fontSize: 13, textAlign: 'center', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>
          🔍 Моб. группа
        </div>

        {/* Right Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0, position: 'relative' }}>
          {/* Language switcher */}
          <div style={{ position: 'relative' }}>
            <button
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => { e.stopPropagation(); setShowLangMenu(v => !v); }}
              style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '8px 8px', background: isDark ? '#334155' : '#f1f5f9', color: textPrimary, border: 'none', borderRadius: 10, fontWeight: 600, fontSize: 12, cursor: 'pointer' }}
            >
              <Globe size={14} />
              {language === 'ru' ? 'RU' : language === 'en' ? 'EN' : 'ҚЗ'}
            </button>
            {showLangMenu && (
              <div style={{ position: 'absolute', right: 0, top: 44, background: cardBg, border: isDark ? '1px solid #334155' : '1px solid #e2e8f0', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.15)', zIndex: 999, overflow: 'hidden', minWidth: 110 }}>
                {(['ru', 'en', 'kk'] as const).map(lang => (
                  <button
                    key={lang}
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => { e.stopPropagation(); setLanguage(lang); setShowLangMenu(false); }}
                    style={{ display: 'block', width: '100%', padding: '10px 14px', textAlign: 'left', background: language === lang ? '#2563eb' : 'transparent', color: language === lang ? 'white' : textPrimary, border: 'none', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
                  >
                    {lang === 'ru' ? 'Русский' : lang === 'en' ? 'English' : 'Қазақша'}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Theme toggle */}
          <button
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); setIsDark(v => !v); }}
            style={{ display: 'flex', alignItems: 'center', padding: '8px 8px', background: isDark ? '#334155' : '#f1f5f9', color: textPrimary, border: 'none', borderRadius: 10, cursor: 'pointer' }}
          >
            {isDark ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      {/* FULL SCREEN OVERLAY */}
      {result && (
        <div style={{ backgroundColor: resultBg }} className={`fixed inset-0 z-50 flex items-center justify-center animate-in fade-in zoom-in duration-200`}>
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


      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 28, opacity: isProcessing ? 0.5 : 1 }}>
          <div style={{
            display: 'inline-block',
            background: '#2563eb',
            color: '#eff6ff',
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: 2,
            textTransform: 'uppercase',
            padding: '4px 12px',
            borderRadius: 999,
            marginBottom: 12,
          }}>
            🔍 Мобильная группа
          </div>
          <div style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>
            {user?.name} · <span style={{ color: '#2563eb', fontWeight: 600 }}>{user?.station || 'Станция не задана'}</span>
          </div>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
            <div style={{ padding: '6px 14px', borderRadius: 999, background: '#e0e7ff', color: '#3730a3', fontSize: 13, fontWeight: 600 }}>
              Проверено: <span style={{ color: '#312e81' }}>{stats.total}</span>
            </div>
            <div style={{ padding: '6px 14px', borderRadius: 999, background: '#dcfce7', color: '#166534', fontSize: 13, fontWeight: 600 }}>
              Одобрено: <span style={{ color: '#14532d' }}>{stats.approved}</span>
            </div>
            <div style={{ padding: '6px 14px', borderRadius: 999, background: '#fee2e2', color: '#991b1b', fontSize: 13, fontWeight: 600 }}>
              Отклонено: <span style={{ color: '#7f1d1d' }}>{stats.rejected}</span>
            </div>
            <div style={{ padding: '6px 14px', borderRadius: 999, background: '#ffedd5', color: '#9a3412', fontSize: 13, fontWeight: 600 }}>
              Несовп. станции: <span style={{ color: '#7c2d12' }}>{stats.mismatch}</span>
            </div>
          </div>
        </div>

      {/* Result display */}
      <div style={{
        width: '100%',
        maxWidth: 480,
        minHeight: result ? 160 : 80,
        borderRadius: 16,
        background: result ? 'transparent' : '#ffffff',
        boxShadow: result ? 'none' : '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
        padding: '20px 24px',
      }}>
        {result ? (
          <>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#fff', textAlign: 'center', marginBottom: 16 }}>
              {result.message}
            </div>
            {result.shipmentNumber && (
              <div style={{ width: '100%', background: 'rgba(0,0,0,0.2)', padding: 16, borderRadius: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: '#fff', marginBottom: 8 }}>
                  <span>Маршрут:</span>
                  <span style={{ fontWeight: 700 }}>{result.fromStation} → {result.toStation}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: '#fff', marginBottom: 8 }}>
                  <span>Текущая станция:</span>
                  <span style={{ fontWeight: 700 }}>{result.currentStation}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: '#fff' }}>
                  <span>Статус:</span>
                  <span style={{ fontWeight: 700 }}>{STATUS_LABELS[result.status || ''] || result.status}</span>
                </div>
              </div>
            )}
          </>
        ) : (
          <div style={{ fontSize: 16, color: '#334155', textAlign: 'center', fontWeight: 500 }}>
            {isProcessing ? '🔍 Проверка...' : 'Готов к сканированию'}
          </div>
        )}
      </div>

      {/* Scan input */}
      {!result && (
        <div style={{ width: '100%', maxWidth: 480, position: 'relative' }}>
            <input
              ref={inputRef}
              value={scanValue}
              onChange={e => setScanValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleScan(e.currentTarget.value);
                  e.currentTarget.blur();
                }
              }}
              disabled={isProcessing}
              inputMode="none"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              placeholder="Наведите сканер..."
            style={{
              width: '100%',
              padding: '20px 24px',
              fontSize: 20,
              fontFamily: 'monospace',
              letterSpacing: 2,
              borderRadius: 16,
              border: '2px solid',
              borderColor: isProcessing ? '#cbd5e1' : '#3b82f6',
              background: '#ffffff',
              color: '#1e293b',
              outline: 'none',
              textAlign: 'center',
              boxSizing: 'border-box',
              boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)'
            }}
          />
        </div>
      )}

      {/* History */}
      {history.length > 0 && (
        <div style={{ width: '100%', maxWidth: 480, marginTop: 24 }}>
          <div style={{ fontSize: 11, color: '#64748b', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600 }}>
            Журнал
          </div>
          {history.slice(0, 8).map(item => (
            <div key={item.id} style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '10px 14px',
              borderRadius: 12,
              background: '#ffffff',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              marginBottom: 8,
              borderLeft: `4px solid ${historyDot(item.type)}`,
            }}>
              <span style={{ fontSize: 13, color: '#334155', fontFamily: 'monospace', fontWeight: 600 }}>{item.shipmentId}</span>
              <span style={{ fontSize: 11, color: '#94a3b8' }}>{item.time}</span>
            </div>
          ))}
        </div>
      )}
    </div>
    </div>
  );
}
