import { withApiBase } from '../lib/api-base';
import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import {
  Archive, Search, Download, Package, Calendar, MapPin,
  RefreshCw, Filter, Home, FileText
} from 'lucide-react';

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
}

interface Props { theme?: 'light' | 'dark' }

export function ShipmentArchive({ theme = 'light' }: Props) {
  const isDark = theme === 'dark';
  const { t } = useLanguage();
  const { user } = useAuth();

  const [shipments, setShipments] = useState<ArchivedShipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStation, setFilterStation] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

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
        // Filter to only ISSUED, CLOSED statuses
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

  const handleDownloadInvoice = async (s: ArchivedShipment) => {
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

  return (
    <div className={`min-h-screen ${bg}`}>
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Archive className={`w-6 h-6 ${isDark ? 'text-purple-400' : 'text-purple-600'}`} />
            <h1 className="text-2xl font-bold">Архив посылок</h1>
          </div>
          <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>
            Все выданные и закрытые посылки · {filtered.length} записей
          </p>
        </div>
        <button
          onClick={fetchArchive}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
            isDark ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'
          }`}
        >
          <RefreshCw className="w-4 h-4" />
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
              placeholder="Номер, клиент, маршрут..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className={`w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 ${inputCls}`}
            />
          </div>
          <select
            value={filterStation}
            onChange={e => setFilterStation(e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 ${inputCls}`}
          >
            <option value="">Все станции</option>
            {['Алматы-1', 'Астана Нұрлы Жол', 'Шымкент', 'Ақтөбе', 'Қарағанды', 'Атырау'].map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <input
            type="date"
            value={filterDateFrom}
            onChange={e => setFilterDateFrom(e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 ${inputCls}`}
            placeholder="С даты"
          />
          <input
            type="date"
            value={filterDateTo}
            onChange={e => setFilterDateTo(e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 ${inputCls}`}
            placeholder="По дату"
          />
        </div>
        {(search || filterStation || filterDateFrom || filterDateTo) && (
          <button
            onClick={() => { setSearch(''); setFilterStation(''); setFilterDateFrom(''); setFilterDateTo(''); }}
            className="mt-2 text-sm text-red-500 hover:text-red-700"
          >
            ✕ Сбросить фильтры
          </button>
        )}
      </div>

      {/* Table / Cards */}
      {loading ? (
        <div className="py-16 text-center">
          <RefreshCw className={`w-8 h-8 animate-spin mx-auto mb-3 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
          <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>Загрузка...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className={`rounded-xl border p-12 text-center ${card}`}>
          <Archive className={`w-16 h-16 mx-auto mb-4 opacity-30 ${isDark ? 'text-gray-400' : 'text-gray-400'}`} />
          <p className={`text-lg font-medium ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Архив пуст</p>
          <p className={`text-sm mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
            Выданные посылки появятся здесь
          </p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className={`hidden md:block rounded-xl border overflow-hidden ${card}`}>
            <table className="w-full">
              <thead className={`border-b text-left text-xs font-medium uppercase tracking-wider ${
                isDark ? 'border-gray-700 text-gray-400 bg-gray-750' : 'border-gray-200 text-gray-500 bg-gray-50'
              }`}>
                <tr>
                  <th className="px-5 py-3">Номер</th>
                  <th className="px-5 py-3">Отправитель</th>
                  <th className="px-5 py-3">Маршрут</th>
                  <th className="px-5 py-3">Вес / Мест</th>
                  <th className="px-5 py-3">Дата</th>
                  <th className="px-5 py-3">Статус</th>
                  <th className="px-5 py-3 text-right">Действия</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isDark ? 'divide-gray-700' : 'divide-gray-100'}`}>
                {filtered.map(s => (
                  <tr key={s.id} className={isDark ? 'hover:bg-gray-750' : 'hover:bg-gray-50'}>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <span className={`font-mono font-bold text-sm ${isDark ? 'text-purple-400' : 'text-purple-600'}`}>
                          {s.shipment_number}
                        </span>
                        {s.is_door_to_door && (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${isDark ? 'bg-blue-900 text-blue-300' : 'bg-blue-100 text-blue-700'}`}>
                            D2D
                          </span>
                        )}
                      </div>
                    </td>
                    <td className={`px-5 py-3 text-sm ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>
                      {s.client_name}
                    </td>
                    <td className={`px-5 py-3 text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 flex-shrink-0" />
                        {s.from_station} → {s.to_station}
                      </div>
                    </td>
                    <td className={`px-5 py-3 text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                      {s.weight} кг · {s.quantity_places} м
                    </td>
                    <td className={`px-5 py-3 text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(s.created_at)}
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                        s.shipment_status === 'ISSUED'
                          ? (isDark ? 'bg-green-900 text-green-300' : 'bg-green-100 text-green-700')
                          : (isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600')
                      }`}>
                        {s.shipment_status === 'ISSUED' ? '✅ Выдано' : '📦 Закрыто'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        onClick={() => handleDownloadInvoice(s)}
                        disabled={downloadingId === s.id}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                          isDark
                            ? 'bg-purple-900/50 text-purple-300 hover:bg-purple-800 border border-purple-700'
                            : 'bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200'
                        } disabled:opacity-50`}
                      >
                        {downloadingId === s.id
                          ? <RefreshCw className="w-3 h-3 animate-spin" />
                          : <Download className="w-3 h-3" />}
                        Накладная
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {filtered.map(s => (
              <div key={s.id} className={`rounded-xl border p-4 ${card}`}>
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`font-mono font-bold ${isDark ? 'text-purple-400' : 'text-purple-600'}`}>
                      {s.shipment_number}
                    </span>
                    {s.is_door_to_door && (
                      <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-bold">D2D</span>
                    )}
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    isDark ? 'bg-green-900 text-green-300' : 'bg-green-100 text-green-700'
                  }`}>✅ Выдано</span>
                </div>
                <p className={`text-sm font-medium mb-1 ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>{s.client_name}</p>
                <p className={`text-xs mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  {s.from_station} → {s.to_station} · {s.weight} кг · {formatDate(s.created_at)}
                </p>
                <button
                  onClick={() => handleDownloadInvoice(s)}
                  disabled={downloadingId === s.id}
                  className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium bg-purple-600 hover:bg-purple-700 text-white transition-colors disabled:opacity-50"
                >
                  {downloadingId === s.id ? <RefreshCw className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                  Скачать накладную
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
