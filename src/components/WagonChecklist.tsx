import { useState, useEffect } from 'react';

interface WagonShipment {
  id: string;
  wagon_id: string;
  shipment_id: string;
  status: 'PENDING' | 'LOADED' | 'UNLOADED' | 'MISSING';
  scanned_at?: string;
}

interface WagonChecklistResponse {
  wagon: {
    id: string;
    wagon_number: string;
    status: string;
    current_station: string;
    departure_date: string;
  };
  checklist: WagonShipment[];
  total: number;
  done: number;
  complete: boolean;
}

interface Props {
  wagonId: string;
  onClose?: () => void;
}

const STATUS_CONFIG = {
  PENDING: { label: 'Ожидает', color: '#f59e0b', bg: '#78350f' },
  LOADED: { label: 'Погружен', color: '#22c55e', bg: '#14532d' },
  UNLOADED: { label: 'Выгружен', color: '#06b6d4', bg: '#164e63' },
  MISSING: { label: '⚠️ Утерян', color: '#ef4444', bg: '#7f1d1d' },
};

export function WagonChecklist({ wagonId, onClose }: Props) {
  const [data, setData] = useState<WagonChecklistResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [dispatching, setDispatching] = useState(false);
  const [dispatchError, setDispatchError] = useState<string | null>(null);

  const fetchChecklist = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/wagons/${wagonId}/checklist`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.ok) {
        setData(await res.json());
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChecklist();
    const interval = setInterval(fetchChecklist, 10000);
    return () => clearInterval(interval);
  }, [wagonId]);

  const scanShipment = async (shipmentId: string, status: 'LOADED' | 'UNLOADED') => {
    setProcessing(shipmentId);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/wagons/${wagonId}/scan/${shipmentId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        const result = await res.json();
        setData(prev => prev ? { ...prev, ...result, checklist: result.checklist } : null);
        if (result.all_done) {
          alert('✅ Все грузы в вагоне обработаны!');
        }
      }
    } finally {
      setProcessing(null);
    }
  };

  const markMissing = async (shipmentId: string) => {
    if (!confirm('Пометить груз как утерянный?')) return;
    setProcessing(shipmentId);
    try {
      const token = localStorage.getItem('token');
      await fetch(`/api/wagons/${wagonId}/missing/${shipmentId}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      await fetchChecklist();
    } finally {
      setProcessing(null);
    }
  };

  const dispatchWagon = async () => {
    if (!confirm('Отправить вагон в рейс? Это действие необратимо.')) return;
    setDispatching(true);
    setDispatchError(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/wagons/${wagonId}/dispatch`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const result = await res.json();
      if (res.ok) {
        alert(`✅ ${result.message || 'Вагон отправлен в рейс!'}`);
        await fetchChecklist();
      } else {
        const pending = result.pending ?? '';
        setDispatchError(
          `${result.error}${pending ? ` (осталось: ${pending} шт.)` : ''}`
        );
      }
    } catch {
      setDispatchError('Ошибка соединения с сервером');
    } finally {
      setDispatching(false);
    }
  };

  if (loading) {
    return (
      <div style={{ background: '#1e293b', borderRadius: 16, padding: 32, textAlign: 'center', color: '#64748b' }}>
        Загрузка чек-листа...
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ background: '#1e293b', borderRadius: 16, padding: 32, textAlign: 'center', color: '#ef4444' }}>
        Ошибка загрузки
      </div>
    );
  }

  const progress = data.total > 0 ? Math.round((data.done / data.total) * 100) : 0;

  return (
    <div style={{ background: '#1e293b', borderRadius: 16, overflow: 'hidden', fontFamily: 'system-ui, sans-serif' }}>
      {/* Header */}
      <div style={{ background: '#0f172a', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 18, color: '#f1f5f9' }}>
            🚃 Вагон {data.wagon.wagon_number}
          </div>
          <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>
            {data.wagon.current_station} · {new Date(data.wagon.departure_date).toLocaleDateString('ru')}
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#64748b', fontSize: 20, cursor: 'pointer' }}>✕</button>
        )}
      </div>

      {/* Progress bar */}
      <div style={{ padding: '12px 20px', background: '#162032' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontSize: 13, color: '#94a3b8' }}>Прогресс</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: data.complete ? '#22c55e' : '#f1f5f9' }}>
            {data.done}/{data.total} {data.complete && '✅'}
          </span>
        </div>
        <div style={{ background: '#334155', borderRadius: 999, height: 8, overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: `${progress}%`,
            background: data.complete ? '#22c55e' : '#3b82f6',
            borderRadius: 999,
            transition: 'width 0.5s ease',
          }} />
        </div>
        {data.complete && (
          <div style={{ marginTop: 8, color: '#22c55e', fontWeight: 600, fontSize: 14, textAlign: 'center' }}>
            ✅ Все грузы обработаны — вагон готов к отправке
          </div>
        )}
      </div>

      {/* Кнопка отправки вагона (ТЗ п.5) */}
      <div style={{ padding: '12px 20px', borderTop: '1px solid #334155' }}>
        {dispatchError && (
          <div style={{
            background: '#7f1d1d',
            color: '#fca5a5',
            borderRadius: 8,
            padding: '8px 14px',
            fontSize: 13,
            marginBottom: 10,
            fontWeight: 500,
          }}>
            🚫 {dispatchError}
          </div>
        )}
        <button
          onClick={dispatchWagon}
          disabled={dispatching}
          style={{
            width: '100%',
            padding: '12px',
            borderRadius: 10,
            border: 'none',
            background: data.complete ? '#1d4ed8' : '#1e293b',
            color: data.complete ? '#fff' : '#475569',
            fontSize: 15,
            fontWeight: 700,
            cursor: data.complete ? 'pointer' : 'not-allowed',
            opacity: dispatching ? 0.7 : 1,
            transition: 'background 0.2s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          {dispatching ? '⏳ Отправка...' : data.complete ? '🚀 Отправить вагон в рейс' : `🔒 Не готов (${data.total - data.done} не обработано)`}
        </button>
      </div>

      {/* Checklist items */}
      <div style={{ padding: '12px 20px', display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 400, overflowY: 'auto' }}>
        {data.checklist.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#64748b', padding: 24 }}>Нет грузов в чек-листе</div>
        ) : (
          data.checklist.map(ws => {
            const cfg = STATUS_CONFIG[ws.status];
            const isLoading = processing === ws.shipment_id;

            return (
              <div
                key={ws.id}
                style={{
                  background: '#0f172a',
                  borderRadius: 10,
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  border: `1px solid ${cfg.color}30`,
                  opacity: isLoading ? 0.6 : 1,
                }}
              >
                <div>
                  <div style={{ fontFamily: 'monospace', fontWeight: 700, color: '#f1f5f9', fontSize: 15 }}>
                    {ws.shipment_id.slice(0, 8).toUpperCase()}...
                  </div>
                  {ws.scanned_at && (
                    <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                      {new Date(ws.scanned_at).toLocaleTimeString('ru')}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{
                    padding: '3px 10px',
                    borderRadius: 999,
                    fontSize: 12,
                    fontWeight: 600,
                    background: cfg.bg,
                    color: cfg.color,
                  }}>
                    {cfg.label}
                  </span>

                  {ws.status === 'PENDING' && (
                    <>
                      <button
                        onClick={() => scanShipment(ws.shipment_id, 'LOADED')}
                        disabled={isLoading}
                        style={{ background: '#14532d', border: 'none', borderRadius: 8, color: '#86efac', padding: '6px 12px', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
                      >
                        ✓ Погружен
                      </button>
                      <button
                        onClick={() => markMissing(ws.shipment_id)}
                        disabled={isLoading}
                        style={{ background: '#7f1d1d', border: 'none', borderRadius: 8, color: '#fca5a5', padding: '6px 10px', cursor: 'pointer', fontSize: 12 }}
                      >
                        ✕
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
