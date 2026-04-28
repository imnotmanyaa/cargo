import { Search, MapPin, Package, Clock, QrCode, RefreshCw, Filter } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useState, useEffect } from 'react';
import { ShipmentDetailsModal } from './ShipmentDetailsModal';
import { useAuth } from '../contexts/AuthContext';

export function ActiveShipments({ theme = 'light' }: { theme?: 'light' | 'dark' }) {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const isDark = theme === 'dark';
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
      case 'В пути':       return 'bg-blue-100 text-blue-700';
      case 'Погружен':     return 'bg-purple-100 text-purple-700';
      case 'Прибыл':       return 'bg-green-100 text-green-700';
      case 'Готов к выдаче': return 'bg-yellow-100 text-yellow-700';
      case 'Выдан':        return 'bg-emerald-100 text-emerald-700';
      default:             return 'bg-gray-100 text-gray-700';
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
    quantity_places: Number(s.quantity_places) || 1,
    receiver_name: s.receiver_name,
    receiver_phone: s.receiver_phone,
    train_time: s.train_time,
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
        setShipments((Array.isArray(data) ? data : []).map(mapShipment));
      }
    } catch (error) {
      console.error('Failed to fetch shipments:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShipments();
    const interval = setInterval(fetchShipments, 10000);
    return () => clearInterval(interval);
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
      {/* Header */}
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className={`text-2xl font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>{t('activeShipmentsTitle')}</h1>
          <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>{t('activeShipmentsDesc')}</p>
        </div>
        <button
          onClick={fetchShipments}
          className={`p-2 rounded-lg ${isDark ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}
          title="Обновить"
        >
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Search + filter bar */}
      <div className={`rounded-lg shadow-sm border mb-6 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <div className={`p-4 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-gray-400' : 'text-gray-400'}`} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('searchPlaceholder')}
                className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm ${isDark
                  ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                }`}
              />
            </div>
            <button className={`flex items-center gap-2 px-3 py-2 border rounded-lg text-sm ${isDark
              ? 'border-gray-600 text-gray-300 hover:bg-gray-700'
              : 'border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}>
              <Filter className="w-4 h-4" />
              {t('filters')}
            </button>
          </div>
        </div>

        {/* Card list */}
        <div className={`divide-y ${isDark ? 'divide-gray-700' : 'divide-gray-200'}`}>
          {loading && filteredShipments.length === 0 ? (
            <div className={`p-8 text-center text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Загрузка...</div>
          ) : filteredShipments.length === 0 ? (
            <div className={`p-8 text-center text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Нет отправок</div>
          ) : filteredShipments.map((shipment) => (
            <div
              key={shipment.id}
              onClick={() => setSelectedShipment(shipment)}
              className={`p-5 cursor-pointer transition-colors ${isDark ? 'hover:bg-gray-700/50' : 'hover:bg-gray-50'}`}
            >
              <div className="flex items-start justify-between gap-4">
                {/* Left: icon + main info */}
                <div className="flex gap-4 flex-1 min-w-0">
                  <div className={`w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0 ${isDark ? 'bg-blue-900/40' : 'bg-blue-50'}`}>
                    <Package className={`w-5 h-5 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    {/* Row 1: number + status */}
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className={`text-sm font-semibold ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                        {shipment.shipment_number}
                      </span>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${shipment.statusColor}`}>
                        {getStatus(shipment.status)}
                      </span>
                    </div>
                    {/* Row 2: client name */}
                    <p className={`text-sm font-medium mb-2 truncate ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                      {shipment.client}
                    </p>
                    {/* Row 3: route */}
                    <div className={`flex items-center gap-1 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>{shipment.from}</span>
                      <span className="mx-1">→</span>
                      <MapPin className="w-3.5 h-3.5 flex-shrink-0 text-blue-500" />
                      <span>{shipment.to}</span>
                    </div>
                  </div>
                </div>

                {/* Right: date + weight + qr icon */}
                <div className="flex-shrink-0 text-right flex flex-col items-end gap-2">
                  <div className={`flex items-center gap-1 text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    <Clock className="w-3.5 h-3.5" />
                    <span>{shipment.date}</span>
                  </div>
                  <span className={`text-xs font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    {shipment.weight}
                  </span>
                  <button
                    onClick={(e) => { e.stopPropagation(); setSelectedShipment(shipment); }}
                    className={`p-1.5 rounded-full ${isDark ? 'hover:bg-gray-600 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}
                  >
                    <QrCode className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Receiver block — styled like "другое лицо" panel */}
              {(shipment.receiver_name || shipment.receiver_phone) && (
                <div className={`mt-3 ml-15 rounded-lg border px-4 py-2.5 flex items-center gap-4 flex-wrap ${isDark
                  ? 'bg-blue-900/20 border-blue-800/50'
                  : 'bg-blue-50 border-blue-100'
                }`}>
                  <span className={`text-xs font-semibold uppercase tracking-wide ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                    Получатель
                  </span>
                  {shipment.receiver_name && (
                    <span className={`text-sm ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>{shipment.receiver_name}</span>
                  )}
                  {shipment.receiver_phone && (
                    <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{shipment.receiver_phone}</span>
                  )}
                </div>
              )}
            </div>
          ))}
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