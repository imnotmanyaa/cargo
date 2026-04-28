import { useState, useEffect } from 'react';
import { Search, Package, MapPin, Phone, Clock, RefreshCw, Truck } from 'lucide-react';

interface Shipment {
  id: string;
  shipment_number: string;
  client_name: string;
  pickup_address?: string;
  delivery_address?: string;
  door_to_door_phone?: string;
  shipment_status: string;
  created_at: string;
  is_door_to_door: boolean;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  ARRIVED:        { label: 'Прибыл', color: 'bg-green-100 text-green-800' },
  ISSUED:         { label: 'Выдан', color: 'bg-gray-100 text-gray-600' },
  IN_TRANSIT:     { label: 'В пути', color: 'bg-blue-100 text-blue-800' },
  LOADED:         { label: 'Погружен', color: 'bg-indigo-100 text-indigo-800' },
  CREATED:        { label: 'Оформлен', color: 'bg-yellow-100 text-yellow-800' },
  READY_FOR_ISSUE:{ label: 'На складе', color: 'bg-teal-100 text-teal-800' },
};

export default function DoorToDoorShipments({ theme }: { theme?: 'light' | 'dark' }) {
  const isDark = theme === 'dark';
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchShipments = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/shipments', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setShipments(
          (Array.isArray(data) ? data : []).filter((s: Shipment) => s.is_door_to_door)
        );
      }
    } catch (err) {
      console.error('Failed to fetch shipments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchShipments(); }, []);

  const filtered = shipments.filter(s =>
    (s.shipment_number || '').toLowerCase().includes(search.toLowerCase()) ||
    (s.client_name || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className={`text-2xl font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Заявки «До двери»
          </h1>
          <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>
            Управление курьерской доставкой и выездным обслуживанием
          </p>
        </div>
        <button
          onClick={fetchShipments}
          className={`p-2 rounded-full ${isDark ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-600'}`}
        >
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Search */}
      <div className={`rounded-lg shadow-sm border mb-6 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <div className="p-4">
          <div className="relative max-w-md">
            <Search className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-gray-400' : 'text-gray-400'}`} />
            <input
              type="text"
              placeholder="Поиск по номеру или клиенту..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                isDark ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'border-gray-300 text-gray-900'
              }`}
            />
          </div>
        </div>
      </div>

      {/* Cards */}
      <div className={`rounded-lg shadow-sm border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <div className={`p-6 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="flex items-center gap-2">
            <Truck className={`w-5 h-5 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
            <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Активные заявки
              {filtered.length > 0 && (
                <span className="ml-2 text-sm font-normal text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                  {filtered.length}
                </span>
              )}
            </h3>
          </div>
        </div>

        <div className={`divide-y ${isDark ? 'divide-gray-700' : 'divide-gray-200'}`}>
          {loading ? (
            <div className={`p-8 text-center ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Загрузка...</div>
          ) : filtered.length === 0 ? (
            <div className={`p-8 text-center ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              {search ? 'Ничего не найдено' : 'Нет заявок «До двери»'}
            </div>
          ) : (
            filtered.map(s => {
              const status = STATUS_LABELS[s.shipment_status] || { label: s.shipment_status, color: 'bg-gray-100 text-gray-600' };
              return (
                <div key={s.id} className={`p-6 ${isDark ? 'hover:bg-gray-750' : 'hover:bg-gray-50'} transition-colors`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex gap-4 flex-1">
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${isDark ? 'bg-blue-900' : 'bg-blue-50'}`}>
                        <Package className={`w-6 h-6 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-1 flex-wrap">
                          <span className="text-sm font-semibold text-blue-600">{s.shipment_number}</span>
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${status.color}`}>{status.label}</span>
                        </div>
                        <h4 className={`font-medium mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>{s.client_name}</h4>

                        <div className={`space-y-1.5 text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                          {s.door_to_door_phone && (
                            <div className="flex items-center gap-2">
                              <Phone className="w-4 h-4 flex-shrink-0" />
                              <span>{s.door_to_door_phone}</span>
                            </div>
                          )}
                          {s.pickup_address && (
                            <div className="flex items-start gap-2">
                              <MapPin className="w-4 h-4 flex-shrink-0 text-orange-500 mt-0.5" />
                              <div>
                                <span className="text-xs uppercase font-medium text-gray-400 block">Забор:</span>
                                <span>{s.pickup_address}</span>
                              </div>
                            </div>
                          )}
                          {s.delivery_address && (
                            <div className="flex items-start gap-2">
                              <MapPin className="w-4 h-4 flex-shrink-0 text-green-500 mt-0.5" />
                              <div>
                                <span className="text-xs uppercase font-medium text-gray-400 block">Доставка:</span>
                                <span>{s.delivery_address}</span>
                              </div>
                            </div>
                          )}
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 flex-shrink-0" />
                            <span>{new Date(s.created_at).toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
