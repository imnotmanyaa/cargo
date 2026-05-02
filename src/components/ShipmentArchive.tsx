import { withApiBase } from '../lib/api-base';
import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Archive, Search, Download, Calendar, MapPin, RefreshCw, Filter, Truck } from 'lucide-react';
import { ActiveShipmentDetails } from './ActiveShipmentDetails';

interface ArchivedShipment {
  id: string;
  shipment_number: string;
  client_name: string;
  receiver_name?: string;
  from_station: string;
  to_station: string;
  weight: string;
  quantity_places: number;
  shipment_status: string;
  created_at: string;
  is_door_to_door: boolean;
  cost?: number;
  description?: string;
  pickup_address?: string;
  delivery_address?: string;
  door_to_door_phone?: string;
}

interface Props { theme?: 'light' | 'dark' }

export function ShipmentArchive({ theme = 'light' }: Props) {
  const isDark = theme === 'dark';
  const { user } = useAuth();

  const [shipments, setShipments] = useState<ArchivedShipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStation, setFilterStation] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [selectedShipment, setSelectedShipment] = useState<any>(null);

  const fetchArchive = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams({ type: 'archived' });
      if (user?.station) params.set('station', user.station);

      const res = await fetch(withApiBase(`/api/shipments?${params}`), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const archived = (Array.isArray(data) ? data : []).filter((s: ArchivedShipment) =>
          ['ISSUED', 'CLOSED'].includes(s.shipment_status)
        );
        setShipments(archived);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchArchive(); }, [user?.station]);

  const handleDownloadInvoice = async (s: ArchivedShipment, e: React.MouseEvent) => {
    e.stopPropagation();
    setDownloadingId(s.id);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(withApiBase(`/api/shipments/${s.id}/invoice`), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `invoice-${s.shipment_number}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      } else {
        alert('Не удалось скачать накладную');
      }
    } catch {
      alert('Ошибка сети');
    } finally {
      setDownloadingId(null);
    }
  };

  const filtered = shipments.filter(s => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      s.shipment_number.toLowerCase().includes(q) ||
      s.client_name.toLowerCase().includes(q) ||
      (s.receiver_name || '').toLowerCase().includes(q) ||
      s.from_station.toLowerCase().includes(q) ||
      s.to_station.toLowerCase().includes(q);

    const matchStation = !filterStation ||
      s.from_station === filterStation || s.to_station === filterStation;

    const createdDate = new Date(s.created_at);
    const matchDateFrom = !filterDateFrom || createdDate >= new Date(filterDateFrom);
    const matchDateTo = !filterDateTo || createdDate <= new Date(filterDateTo + 'T23:59:59');

    return matchSearch && matchStation && matchDateFrom && matchDateTo;
  });

  const bg = isDark ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900';
  const card = isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200';
  const inputCls = isDark
    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500'
    : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500';

  const formatDate = (d: string) => {
    const dt = new Date(d);
    return isNaN(dt.getTime()) ? '—' : dt.toLocaleDateString('ru-RU', {
      day: '2-digit', month: '2-digit', year: 'numeric'
    });
  };

  const mapForDetails = (s: ArchivedShipment) => ({
    ...s,
    id: s.id,
    client: s.client_name || 'Неизвестный',
    from: s.from_station,
    to: s.to_station,
    date: formatDate(s.created_at),
    weight: s.weight + ' кг',
    statusColor: isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600',
  });

  if (selectedShipment) {
    return (
      <ActiveShipmentDetails
        shipment={selectedShipment}
        onClose={() => setSelectedShipment(null)}
        theme={theme}
      />
    );
  }

  return (
    <div className={`min-h-screen ${bg}`}>
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Archive className={`w-6 h-6 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
            <h1 className="text-2xl font-bold">Архив посылок</h1>
          </div>
          <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>
            Завершенные заказы · {filtered.length} записей
          </p>
        </div>
        <button
          onClick={fetchArchive}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
            isDark ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'
          }`}
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Обновить
        </button>
      </div>

      {/* Filters */}
      <div className={`rounded-xl border p-4 mb-6 ${card}`}>
        <div className="flex items-center gap-2 mb-3">
          <Filter className={`w-4 h-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
          <span className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Фильтры</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative">
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
            <input
              type="text"
              placeholder="Поиск грузов..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className={`w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${inputCls}`}
            />
          </div>
          <select
            value={filterStation}
            onChange={e => setFilterStation(e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${inputCls}`}
          >
            <option value="">Все направления</option>
            {['Алматы-1', 'Астана Нұрлы Жол', 'Шымкент', 'Ақтөбе', 'Қарағанды', 'Атырау'].map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <input
            type="date"
            value={filterDateFrom}
            onChange={e => setFilterDateFrom(e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${inputCls}`}
            placeholder="От"
          />
          <input
            type="date"
            value={filterDateTo}
            onChange={e => setFilterDateTo(e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${inputCls}`}
            placeholder="До"
          />
        </div>
        {(search || filterStation || filterDateFrom || filterDateTo) && (
          <button
            onClick={() => { setSearch(''); setFilterStation(''); setFilterDateFrom(''); setFilterDateTo(''); }}
            className="mt-3 text-sm text-blue-500 hover:text-blue-700 transition-colors"
          >
            Сбросить фильтры
          </button>
        )}
      </div>

      {/* Cards */}
      {loading && shipments.length === 0 ? (
        <div className="py-16 text-center">
          <RefreshCw className={`w-8 h-8 animate-spin mx-auto mb-3 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
          <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>Загрузка...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className={`rounded-xl border p-12 text-center ${card}`}>
          <Archive className={`w-12 h-12 mx-auto mb-4 opacity-20 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
          <p className={`text-lg font-medium ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Архив пуст</p>
          <p className={`text-sm mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Здесь будут завершенные заказы</p>
        </div>
      ) : (
        <div className={`divide-y ${isDark ? 'divide-gray-700' : 'divide-gray-200'}`}>
          {filtered.map(s => (
            <div
              key={s.id}
              onClick={() => setSelectedShipment(mapForDetails(s))}
              className={`cursor-pointer p-5 transition-colors ${isDark ? 'bg-gray-800 hover:bg-gray-750' : 'bg-white hover:bg-gray-50'}`}
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                  <Truck className={`w-4 h-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                  <span className={`font-semibold ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>{s.shipment_number}</span>
                  {s.is_door_to_door && <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-bold border ${isDark ? 'bg-gray-700 text-gray-300 border-gray-600' : 'bg-gray-100 text-gray-600 border-gray-200'}`}>D2D</span>}
                </div>
                <button
                  onClick={(e) => handleDownloadInvoice(s, e)}
                  disabled={downloadingId === s.id}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border disabled:opacity-50 ${
                    isDark ? 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {downloadingId === s.id ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
                  Накладная
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className={`text-xs uppercase mb-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Отправитель</p>
                  <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{s.client_name}</p>
                </div>
                <div>
                  <p className={`text-xs uppercase mb-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Маршрут</p>
                  <div className={`text-sm flex items-center gap-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    <MapPin className="w-3 h-3 text-gray-400" />
                    {s.from_station} → {s.to_station}
                  </div>
                </div>
                <div>
                  <p className={`text-xs uppercase mb-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Детали груза</p>
                  <div className={`text-sm flex items-center gap-3 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    <span>{s.weight} кг</span>
                    <span>•</span>
                    <span>{s.quantity_places} мест</span>
                    <span>•</span>
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3 text-gray-400" /> {formatDate(s.created_at)}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
