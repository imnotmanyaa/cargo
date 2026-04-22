import { Search, Filter, MapPin, Package, Clock, QrCode, RefreshCw } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useState, useEffect } from 'react';
import { ShipmentDetailsModal } from './ShipmentDetailsModal';
import { useAuth } from '../contexts/AuthContext';

export function ActiveShipments({ theme = 'light' }: { theme?: 'light' | 'dark' }) {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const [shipments, setShipments] = useState<any[]>([]);
  const [selectedShipment, setSelectedShipment] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const getStatus = (status: string) => {
    if (language === 'en') {
      switch (status) {
        case 'В пути': return 'In Transit';
        case 'Погружен': return 'Loaded';
        case 'Прибыл': return 'Arrived';
        case 'Готов к выдаче': return 'Ready for Issue';
        case 'Выдан': return 'Issued';
        default: return status;
      }
    }
    if (language === 'kk') {
      switch (status) {
        case 'В пути': return 'Жолда';
        case 'Погружен': return 'Тиелген';
        case 'Прибыл': return 'Келді';
        case 'Готов к выдаче': return 'Беруге дайын';
        case 'Выдан': return 'Берілді';
        default: return status;
      }
    }
    return status;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'В пути': return 'bg-blue-100 text-blue-700';
      case 'Погружен': return 'bg-purple-100 text-purple-700';
      case 'Прибыл': return 'bg-green-100 text-green-700';
      case 'Готов к выдаче': return 'bg-yellow-100 text-yellow-700';
      case 'Выдан': return 'bg-emerald-100 text-emerald-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const mapShipment = (s: any) => ({
    ...s,
    id: s.id,
    client: s.client_name || 'Неизвестный',
    from: s.from_station,
    to: s.to_station,
    status: s.status,
    statusColor: getStatusColor(s.status),
    date: new Date(s.departure_date).toLocaleDateString(),
    weight: s.weight + ' кг',
    receiver_name: s.receiver_name,
    receiver_phone: s.receiver_phone,
    train_time: s.train_time
  });

  const fetchShipments = async () => {
    try {
      setLoading(true);
      const url = (user?.role === 'manager' && user?.station) 
        ? `/api/shipments?type=by-station&station=${encodeURIComponent(user.station)}`
        : '/api/shipments';
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        const mapped = data.map(mapShipment);
        setShipments(mapped);
      }
    } catch (error) {
      console.error('Failed to fetch shipments:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShipments();

    // Poll every 10 seconds for updates (backend uses Socket.IO, not plain WS)
    const interval = setInterval(() => {
      fetchShipments();
    }, 10000);

    return () => {
      clearInterval(interval);
    };
  }, [user?.role, user?.station]);

  const filteredShipments = shipments.filter(s => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (s.shipment_number?.toLowerCase().includes(q) ||
            s.client?.toLowerCase().includes(q) ||
            s.from?.toLowerCase().includes(q) ||
            s.to?.toLowerCase().includes(q) ||
            s.status?.toLowerCase().includes(q));
  });

  return (
    <div>
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className={`text-2xl font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{t('activeShipmentsTitle')}</h1>
          <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>{t('activeShipmentsDesc')}</p>
        </div>
        <button
          onClick={fetchShipments}
          className={`p-2 rounded-lg ${theme === 'dark' ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}
          title="Обновить"
        >
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className={`rounded-lg shadow-sm border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <div className={`p-6 border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className={`w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('searchPlaceholder')}
                className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${theme === 'dark'
                  ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                  }`}
              />
            </div>
            <button className={`flex items-center gap-2 px-4 py-2 border rounded-lg ${theme === 'dark'
              ? 'border-gray-600 text-gray-300 hover:bg-gray-700'
              : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}>
              <Filter className="w-5 h-5" />
              {t('filters')}
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse responsive-table-card">
            <thead className={theme === 'dark' ? 'bg-gray-900/50' : 'bg-gray-50'}>
              <tr>
                <th className={`px-6 py-4 text-xs font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{t('waybill')}</th>
                <th className={`px-6 py-4 text-xs font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{t('client')}</th>
                <th className={`px-6 py-4 text-xs font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{t('route')}</th>
                <th className={`px-6 py-4 text-xs font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{t('status')}</th>
                <th className={`px-6 py-4 text-xs font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{t('date')}</th>
                <th className={`px-6 py-4 text-xs font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{t('weight')}</th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className={`divide-y ${theme === 'dark' ? 'divide-gray-700' : 'divide-gray-200'}`}>
              {filteredShipments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-gray-500">
                    {loading ? 'Загрузка...' : 'Нет отправок'}
                  </td>
                </tr>
              ) : filteredShipments.map((shipment) => (
                <tr
                  key={shipment.id}
                  onClick={() => setSelectedShipment(shipment)}
                  className={`cursor-pointer transition-colors ${theme === 'dark' ? 'hover:bg-gray-750 dark-row' : 'hover:bg-gray-50'}`}
                >
                  <td data-label="Накладная" className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${theme === 'dark' ? 'bg-blue-900/30' : 'bg-blue-50'}`}>
                        <Package className={`w-5 h-5 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`} />
                      </div>
                      <span className={`font-medium ${theme === 'dark' ? 'text-gray-200' : 'text-gray-900'}`}>{shipment.shipment_number}</span>
                    </div>
                  </td>
                  <td data-label="Клиент" className={`px-6 py-4 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>{shipment.client}</td>
                  <td data-label="Маршрут" className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-gray-400" />
                        <span className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>{shipment.from}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-blue-500" />
                        <span className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>{shipment.to}</span>
                      </div>
                    </div>
                  </td>
                  <td data-label="Статус" className="px-6 py-4">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${shipment.statusColor}`}>
                      {getStatus(shipment.status)}
                    </span>
                  </td>
                  <td data-label="Дата" className="px-6 py-4">
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Clock className="w-4 h-4" />
                      <span className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>{shipment.date}</span>
                    </div>
                  </td>
                  <td data-label="Вес" className={`px-6 py-4 text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>{shipment.weight}</td>
                  <td className="px-6 py-4 text-right">
                    <button className={`p-2 rounded-full ${theme === 'dark' ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}>
                      <QrCode className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedShipment && (
        <ShipmentDetailsModal
          shipment={selectedShipment}
          onClose={() => setSelectedShipment(null)}
          theme={theme}
        />
      )}
    </div>
  );
}