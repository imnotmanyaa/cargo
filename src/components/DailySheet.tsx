import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

interface Shipment {
  id: string;
  shipment_number: string;
  client_name: string;
  receiver_name?: string;
  receiver_phone?: string;
  from_station: string;
  to_station: string;
  weight: string;
  quantity_places: number;
  description: string;
  cost: number;
  status: string;
  shipment_status: string;
  departure_date: string;
  train_time?: string;
  transport_unit_id?: string;
}

const STATUS_COLORS: Record<string, string> = {
  CREATED: '#64748b',
  PAYMENT_PENDING: '#f59e0b',
  PAID: '#10b981',
  READY_FOR_LOADING: '#3b82f6',
  LOADED: '#6366f1',
  IN_TRANSIT: '#8b5cf6',
  ARRIVED: '#06b6d4',
  READY_FOR_ISSUE: '#f97316',
  ISSUED: '#22c55e',
  CLOSED: '#6b7280',
  CANCELLED: '#ef4444',
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

export function DailySheet() {
  const { user } = useAuth();
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [filter, setFilter] = useState<'all' | 'outgoing' | 'incoming' | 'arrived' | 'loading'>('all');
  const [search, setSearch] = useState('');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchShipments = async () => {
    if (!user?.station) return;
    try {
      const token = localStorage.getItem('token');
      // 'loading' — клиентский фильтр, API не знает этот тип
      const apiType = filter === 'all' || filter === 'loading' ? '' : filter;
      const params = new URLSearchParams({ station: user.station, type: apiType });
      const res = await fetch(`/api/shipments?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setShipments(Array.isArray(data) ? data : []);
        setLastUpdated(new Date());
      }
    } catch (e) {
      console.error('Failed to fetch daily sheet:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShipments();
    const interval = setInterval(fetchShipments, 30000);
    return () => clearInterval(interval);
  }, [user?.station, filter]);

  // Filter by search, date and status
  const filtered = shipments.filter(s => {
    const matchSearch = !search ||
      s.shipment_number.toLowerCase().includes(search.toLowerCase()) ||
      s.client_name.toLowerCase().includes(search.toLowerCase()) ||
      (s.receiver_name || '').toLowerCase().includes(search.toLowerCase());

    const matchDate = !date || s.departure_date.startsWith(date);
    // Клиентский фильтр «К погрузке»
    const matchLoading = filter !== 'loading' || s.shipment_status === 'READY_FOR_LOADING';
    return matchSearch && matchDate && matchLoading;
  });

  const summary = {
    total: filtered.length,
    readyForLoading: filtered.filter(s => s.shipment_status === 'READY_FOR_LOADING').length,
    loaded: filtered.filter(s => s.shipment_status === 'LOADED').length,
    inTransit: filtered.filter(s => s.shipment_status === 'IN_TRANSIT').length,
    arrived: filtered.filter(s => ['ARRIVED', 'READY_FOR_ISSUE'].includes(s.shipment_status)).length,
    issued: filtered.filter(s => ['ISSUED', 'CLOSED'].includes(s.shipment_status)).length,
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', color: '#f1f5f9', fontFamily: 'system-ui, sans-serif' }}>
      {/* Header */}
      <div style={{ background: '#1e293b', padding: '16px 24px', borderBottom: '1px solid #334155', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#f1f5f9' }}>📋 Ежедневная ведомость</h1>
          <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>
            {user?.station} · {lastUpdated ? `Обновлено: ${lastUpdated.toLocaleTimeString('ru')}` : 'Загрузка...'}
          </div>
        </div>
        <button
          onClick={fetchShipments}
          style={{ background: '#3b82f6', border: 'none', borderRadius: 8, color: '#fff', padding: '8px 16px', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}
        >
          ↻ Обновить
        </button>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'flex', gap: 12, padding: '16px 24px', flexWrap: 'wrap' }}>
        {[
          { label: 'Всего', value: summary.total, color: '#3b82f6' },
          { label: '📦 К погрузке', value: summary.readyForLoading, color: '#f59e0b' },
          { label: 'Погружено', value: summary.loaded, color: '#6366f1' },
          { label: 'В пути', value: summary.inTransit, color: '#8b5cf6' },
          { label: 'Прибыло', value: summary.arrived, color: '#06b6d4' },
          { label: 'Выдано', value: summary.issued, color: '#22c55e' },
        ].map(card => (
          <div key={card.label} style={{
            background: '#1e293b',
            border: `1px solid ${card.color}40`,
            borderRadius: 12,
            padding: '12px 20px',
            minWidth: 100,
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: card.color }}>{card.value}</div>
            <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>{card.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ padding: '0 24px 16px', display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, color: '#f1f5f9', padding: '8px 12px', fontSize: 14 }}
        />
        <input
          type="text"
          placeholder="Поиск по номеру, клиенту..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, color: '#f1f5f9', padding: '8px 12px', fontSize: 14, width: 240 }}
        />
        <div style={{ display: 'flex', gap: 8 }}>
          {([['all', 'Все'], ['loading', '📦 К погрузке'], ['outgoing', 'Отправление'], ['incoming', 'Входящие'], ['arrived', 'Прибыло']] as const).map(([val, label]) => (
            <button
              key={val}
              onClick={() => setFilter(val)}
              style={{
                background: filter === val ? '#3b82f6' : '#1e293b',
                border: '1px solid',
                borderColor: filter === val ? '#3b82f6' : '#334155',
                borderRadius: 8,
                color: '#f1f5f9',
                padding: '8px 14px',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: filter === val ? 600 : 400,
              }}
            >{label}</button>
          ))}
        </div>
      </div>

      {/* Shipment list */}
      <div style={{ padding: '0 24px 24px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', color: '#64748b', padding: 48 }}>Загрузка...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#64748b', padding: 48 }}>
            Грузов не найдено
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filtered.map(s => (
              <div
                key={s.id}
                style={{
                  background: '#1e293b',
                  border: '1px solid #334155',
                  borderRadius: 12,
                  padding: '14px 18px',
                  display: 'grid',
                  gridTemplateColumns: '1fr auto',
                  gap: 12,
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                    <span style={{ fontWeight: 700, fontSize: 16, color: '#f1f5f9', fontFamily: 'monospace' }}>
                      {s.shipment_number}
                    </span>
                    {s.transport_unit_id && (
                      <span style={{ fontSize: 12, background: '#1d4ed8', color: '#bfdbfe', borderRadius: 6, padding: '2px 8px' }}>
                        Вагон: {s.transport_unit_id}
                      </span>
                    )}
                    {s.train_time && (
                      <span style={{ fontSize: 12, color: '#94a3b8' }}>🚂 {s.train_time}</span>
                    )}
                  </div>
                  <div style={{ fontSize: 14, color: '#94a3b8', marginBottom: 4 }}>
                    <strong style={{ color: '#cbd5e1' }}>{s.client_name}</strong>
                    {s.receiver_name && <span> → {s.receiver_name} {s.receiver_phone && `(${s.receiver_phone})`}</span>}
                  </div>
                  <div style={{ fontSize: 13, color: '#64748b' }}>
                    {s.from_station} → {s.to_station} · {s.weight} кг · {s.quantity_places} мест · {s.description}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{
                    padding: '4px 12px',
                    borderRadius: 999,
                    fontSize: 12,
                    fontWeight: 600,
                    background: `${STATUS_COLORS[s.shipment_status] || '#64748b'}20`,
                    color: STATUS_COLORS[s.shipment_status] || '#94a3b8',
                    border: `1px solid ${STATUS_COLORS[s.shipment_status] || '#64748b'}40`,
                    marginBottom: 6,
                    whiteSpace: 'nowrap',
                  }}>
                    {STATUS_LABELS[s.shipment_status] || s.status}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9' }}>
                    {s.cost.toLocaleString('ru')} ₸
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
