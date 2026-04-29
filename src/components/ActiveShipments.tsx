import { Search, MapPin, Package, Clock, QrCode, RefreshCw, Download } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useState, useEffect } from 'react';
import { ActiveShipmentDetails } from './ActiveShipmentDetails';
import { useAuth } from '../contexts/AuthContext';

export function ActiveShipments({ theme = 'light' }: { theme?: 'light' | 'dark' }) {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const isDark = theme === 'dark';
  const [shipments, setShipments] = useState<any[]>([]);
  const [selectedShipment, setSelectedShipment] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState('newest');
  const [statusFilter, setStatusFilter] = useState('all');
  const [directionFilter, setDirectionFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 12;

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
    date: formatDate(s.departure_date || s.created_at),
    weight: s.weight + ' кг',
    quantity_places: Number(s.quantity_places) || 1,
    receiver_name: s.receiver_name,
    receiver_phone: s.receiver_phone,
    is_door_to_door: s.is_door_to_door,
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

  const formatDate = (value?: string) => {
    if (!value) return '-';
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? '-' : d.toLocaleDateString();
  };

  useEffect(() => {
    fetchShipments();
    const interval = setInterval(fetchShipments, 10000);
    return () => clearInterval(interval);
  }, [user?.role, user?.station]);

  let filteredShipments = shipments.filter(s => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (s.shipment_number?.toLowerCase().includes(q) ||
            s.client?.toLowerCase().includes(q) ||
            s.from?.toLowerCase().includes(q) ||
            s.to?.toLowerCase().includes(q) ||
            s.status?.toLowerCase().includes(q));
  });

  filteredShipments = filteredShipments.filter((s) => {
    if (statusFilter !== 'all' && s.status !== statusFilter) return false;
    if (directionFilter !== 'all') {
      const route = `${s.from}-${s.to}`;
      if (route !== directionFilter) return false;
    }
    if (dateFilter) {
      const dateValue = new Date(s.created_at || s.departure_date || '');
      if (Number.isNaN(dateValue.getTime())) return false;
      const shipmentDate = dateValue.toISOString().split('T')[0];
      if (shipmentDate !== dateFilter) return false;
    }
    return true;
  });

  // Apply sorting
  filteredShipments = filteredShipments.sort((a, b) => {
    if (sortOrder === 'newest') {
      return new Date(b.created_at || b.departure_date || 0).getTime() - new Date(a.created_at || a.departure_date || 0).getTime();
    }
    if (sortOrder === 'oldest') {
      return new Date(a.created_at || a.departure_date || 0).getTime() - new Date(b.created_at || b.departure_date || 0).getTime();
    }
    if (sortOrder === 'status') {
      return (a.status || '').localeCompare(b.status || '');
    }
    if (sortOrder === 'weight') {
      return (Number(b.weight) || 0) - (Number(a.weight) || 0);
    }
    return 0;
  });

  const totalPages = Math.max(1, Math.ceil(filteredShipments.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginated = filteredShipments.slice((safePage - 1) * pageSize, safePage * pageSize);
  const uniqueRoutes = Array.from(new Set(shipments.map((s) => `${s.from}-${s.to}`)));

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, sortOrder, statusFilter, directionFilter, dateFilter]);

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
      <div className={`rounded-xl shadow-sm border mb-6 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <div className={`p-4 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
            <div className="lg:col-span-4 relative">
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
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className={`lg:col-span-2 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                isDark 
                  ? 'bg-gray-700 border-gray-600 text-white' 
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
            >
              <option value="newest">Сначала новые</option>
              <option value="oldest">Сначала старые</option>
              <option value="status">По статусу</option>
              <option value="weight">По весу</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={`lg:col-span-2 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
              }`}
            >
              <option value="all">Все статусы</option>
              <option value="Оформлен">Оформлен</option>
              <option value="Погружен">Погружен</option>
              <option value="В пути">В пути</option>
              <option value="Прибыл">Прибыл</option>
              <option value="Готов к выдаче">Готов к выдаче</option>
              <option value="Выдан">Выдан</option>
            </select>
            <select
              value={directionFilter}
              onChange={(e) => setDirectionFilter(e.target.value)}
              className={`lg:col-span-2 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
              }`}
            >
              <option value="all">Все направления</option>
              {uniqueRoutes.map((route) => (
                <option key={route} value={route}>{route.replace('-', ' -> ')}</option>
              ))}
            </select>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className={`lg:col-span-2 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
              }`}
            />
          </div>
        </div>

        <div className={`px-4 py-2 text-xs ${isDark ? 'text-gray-400 border-gray-700' : 'text-gray-500 border-gray-200'} border-b`}>
          Найдено: {filteredShipments.length}
        </div>

        {/* Card list */}
        <div className={`divide-y ${isDark ? 'divide-gray-700' : 'divide-gray-200'}`}>
          {loading && paginated.length === 0 ? (
            <div className={`p-8 text-center text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Загрузка...</div>
          ) : paginated.length === 0 ? (
            <div className={`p-8 text-center text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Нет отправок</div>
          ) : paginated.map((shipment) => (
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
                      {shipment.is_door_to_door && (
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider ${isDark ? 'bg-orange-900/30 text-orange-400 border border-orange-800/50' : 'bg-orange-50 text-orange-600 border border-orange-200'}`}>
                          От дома до дома
                        </span>
                      )}
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
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(`/api/shipments/${shipment.id}/waybill`, '_blank');
                    }}
                    className={`p-1.5 rounded-full ${isDark ? 'hover:bg-gray-600 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}
                    title={t('downloadWaybill')}
                  >
                    <Download className="w-4 h-4" />
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
        <div className={`p-4 flex items-center justify-between text-sm ${isDark ? 'text-gray-300 border-gray-700' : 'text-gray-600 border-gray-200'} border-t`}>
          <span>Страница {safePage} из {totalPages}</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={safePage <= 1}
              className={`px-3 py-1.5 rounded-lg border disabled:opacity-50 ${isDark ? 'border-gray-600 hover:bg-gray-700' : 'border-gray-300 hover:bg-gray-50'}`}
            >
              Назад
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage >= totalPages}
              className={`px-3 py-1.5 rounded-lg border disabled:opacity-50 ${isDark ? 'border-gray-600 hover:bg-gray-700' : 'border-gray-300 hover:bg-gray-50'}`}
            >
              Далее
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}