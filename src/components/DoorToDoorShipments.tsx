import { useState, useEffect } from 'react';
import { Search, MapPin, Phone, Clock, RefreshCw, Truck } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { ActiveShipmentDetails } from './ActiveShipmentDetails';

interface Shipment {
  id: string;
  shipment_number: string;
  client_name: string;
  client_email?: string;
  pickup_address?: string;
  delivery_address?: string;
  door_to_door_phone?: string;
  shipment_status: string;
  status: string;
  created_at: string;
  departure_date?: string;
  weight: string;
  quantity_places: number;
  description?: string;
  value?: string;
  is_door_to_door: boolean;
  from_station: string;
  to_station: string;
  receiver_name?: string;
  receiver_phone?: string;
}

export default function DoorToDoorShipments({ theme = 'light' }: { theme?: 'light' | 'dark' }) {
  const isDark = theme === 'dark';
  const { t } = useLanguage();
  const { user } = useAuth();
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [selectedShipment, setSelectedShipment] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTab, setActiveTab] = useState<'in_progress' | 'at_warehouse'>('in_progress');
  const pageSize = 10;

  const formatDate = (value?: string) => {
    if (!value) return '-';
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? '-' : d.toLocaleDateString();
  };

  const fetchShipments = async () => {
    setLoading(true);
    try {
      const url = (user?.role === 'manager' && user?.station)
        ? `/api/shipments?type=by-station&station=${encodeURIComponent(user.station)}`
        : '/api/shipments';
        
      const res = await fetch(url);
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

  useEffect(() => {
    fetchShipments();
    const interval = setInterval(fetchShipments, 10000);
    return () => clearInterval(interval);
  }, [user?.role, user?.station]);

  const isInProgress = (status: string) => {
    const s = (status || '').toUpperCase();
    return ['CREATED', 'CREATED_DOOR', 'PAYMENT_PENDING', 'PAID', 'PICKUP_ASSIGNED', 'PICKED_UP'].includes(s);
  };

  const filteredShipments = shipments.filter(s => {
    const matchesSearch = (s.shipment_number || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (s.client_name || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTab = activeTab === 'in_progress' 
      ? isInProgress(s.shipment_status || s.status)
      : !isInProgress(s.shipment_status || s.status);
    return matchesSearch && matchesTab;
  });

  const visibleShipments = filteredShipments.filter((s) => {
    if (statusFilter === 'all') return true;
    return (s.shipment_status || s.status) === statusFilter;
  });
  const totalPages = Math.max(1, Math.ceil(visibleShipments.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginated = visibleShipments.slice((safePage - 1) * pageSize, safePage * pageSize);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter]);

  const getDualStatus = (s: Shipment) => {
    let typeLabel = '';
    let typeColor = '';
    
    // For Astana to Almaty: 
    // In Astana (from_station), it's "Забор"
    // In Almaty (to_station), it's "Доставка"
    if (user?.station === s.from_station && s.pickup_address) {
      typeLabel = t('statusPickup');
      typeColor = isDark ? 'bg-orange-900/30 text-orange-400 border border-orange-800/50' : 'bg-orange-50 text-orange-600 border border-orange-200';
    } else if (user?.station === s.to_station && s.delivery_address) {
      typeLabel = t('statusDelivery');
      typeColor = isDark ? 'bg-indigo-900/30 text-indigo-400 border border-indigo-800/50' : 'bg-indigo-50 text-indigo-600 border border-indigo-200';
    } else {
      typeLabel = t('statusDoorToDoor');
      typeColor = isDark ? 'bg-gray-800 text-gray-300 border border-gray-700' : 'bg-gray-100 text-gray-700 border border-gray-200';
    }

    let stateLabel = '';
    let stateColor = '';
    const status = s.shipment_status || s.status;
    switch (status) {
      case 'CREATED':
        stateLabel = 'Оформлен';
        stateColor = 'bg-yellow-100 text-yellow-800';
        break;
      case 'CREATED_DOOR':
        stateLabel = 'Ожидает курьера';
        stateColor = 'bg-orange-100 text-orange-800';
        break;
      case 'PAYMENT_PENDING':
        stateLabel = 'Ожидает оплаты';
        stateColor = 'bg-red-100 text-red-800';
        break;
      case 'PAID':
        stateLabel = 'Оплачен';
        stateColor = 'bg-green-100 text-green-800';
        break;
      case 'PICKUP_ASSIGNED':
        stateLabel = 'Курьер назначен';
        stateColor = 'bg-blue-100 text-blue-800';
        break;
      case 'PICKED_UP':
        stateLabel = 'Забрано курьером';
        stateColor = 'bg-indigo-100 text-indigo-800';
        break;
      case 'READY_FOR_LOADING':
        stateLabel = 'На складе';
        stateColor = 'bg-purple-100 text-purple-800';
        break;
      case 'LOADED':
        stateLabel = 'Погружен';
        stateColor = 'bg-teal-100 text-teal-800';
        break;
      case 'IN_TRANSIT':
        stateLabel = 'В пути';
        stateColor = 'bg-cyan-100 text-cyan-800';
        break;
      case 'ARRIVED':
        stateLabel = 'Прибыл';
        stateColor = 'bg-green-100 text-green-800';
        break;
      case 'DELIVERED':
        stateLabel = 'Доставлен';
        stateColor = 'bg-gray-100 text-gray-800';
        break;
      default:
        stateLabel = status || 'В работе';
        stateColor = 'bg-blue-100 text-blue-800';
    }

    return { typeLabel, typeColor, stateLabel, stateColor };
  };

  const mapShipmentForDetails = (s: Shipment) => ({
    ...s,
    id: s.id,
    client: s.client_name || 'Неизвестный',
    from: s.from_station,
    to: s.to_station,
    date: formatDate(s.created_at),
    weight: s.weight + ' кг',
    statusColor: getDualStatus(s).stateColor,
    pickup_address: s.pickup_address,
    delivery_address: s.delivery_address,
    door_to_door_phone: s.door_to_door_phone,
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
    <div>
      {/* Header */}
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className={`text-2xl font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>{t('doorToDoorTitle')}</h1>
          <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>{t('doorToDoorDesc')}</p>
        </div>
        <button
          onClick={fetchShipments}
          className={`p-2 rounded-lg ${isDark ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}
          title="Обновить"
        >
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Tabs */}
      <div className={`flex space-x-4 mb-6 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
        <button
          onClick={() => { setActiveTab('in_progress'); setStatusFilter('all'); setCurrentPage(1); }}
          className={`pb-2 px-1 text-sm font-medium ${
            activeTab === 'in_progress'
              ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
          }`}
        >
          В работе
        </button>
        <button
          onClick={() => { setActiveTab('at_warehouse'); setStatusFilter('all'); setCurrentPage(1); }}
          className={`pb-2 px-1 text-sm font-medium ${
            activeTab === 'at_warehouse'
              ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
          }`}
        >
          На складе
        </button>
      </div>

      {/* Search + filter bar */}
      <div className={`rounded-xl shadow-sm border mb-6 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <div className={`p-4 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="grid grid-cols-1 lg:grid-cols-8 gap-3">
            <div className="lg:col-span-5 relative">
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
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={`lg:col-span-3 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
              }`}
            >
              <option value="all">Все статусы</option>
              {activeTab === 'in_progress' ? (
                <>
                  <option value="CREATED">Оформлен</option>
                  <option value="CREATED_DOOR">Ожидает курьера</option>
                  <option value="PAYMENT_PENDING">Ожидает оплаты</option>
                  <option value="PAID">Оплачен</option>
                  <option value="PICKUP_ASSIGNED">Курьер назначен</option>
                  <option value="PICKED_UP">Забрано курьером</option>
                </>
              ) : (
                <>
                  <option value="READY_FOR_LOADING">На складе (Готов к погрузке)</option>
                  <option value="LOADED">Погружен</option>
                  <option value="IN_TRANSIT">В пути</option>
                  <option value="ARRIVED">Прибыл</option>
                  <option value="DELIVERED">Доставлен</option>
                </>
              )}
            </select>
          </div>
        </div>
        <div className={`px-4 py-2 text-xs ${isDark ? 'text-gray-400 border-gray-700' : 'text-gray-500 border-gray-200'} border-b`}>
          Найдено: {visibleShipments.length}
        </div>

        {/* Card list */}
        <div className={`divide-y ${isDark ? 'divide-gray-700' : 'divide-gray-200'}`}>
          {loading && paginated.length === 0 ? (
            <div className={`p-8 text-center text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{t('loading')}</div>
          ) : paginated.length === 0 ? (
            <div className={`p-8 text-center text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{t('nothingFound')}</div>
          ) : paginated.map((shipment) => {
            const { typeLabel, typeColor, stateLabel, stateColor } = getDualStatus(shipment);
            
            return (
              <div
                key={shipment.id}
                onClick={() => setSelectedShipment(mapShipmentForDetails(shipment))}
                className={`p-4 cursor-pointer transition-colors ${isDark ? 'hover:bg-gray-700/50' : 'hover:bg-gray-50'}`}
              >
                <div className="hidden lg:grid lg:grid-cols-12 lg:gap-4">
                  <div className="col-span-2">
                    <div className="flex items-center gap-2">
                      <Truck className={`w-4 h-4 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
                      <span className={`text-sm font-semibold ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>{shipment.shipment_number}</span>
                    </div>
                    <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{shipment.client_name}</p>
                  </div>
                  <div className="col-span-4">
                    <p className={`text-[11px] uppercase mb-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Адрес забора</p>
                    <p className={`text-sm leading-5 break-words ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>{shipment.pickup_address || '—'}</p>
                  </div>
                  <div className="col-span-4">
                    <p className={`text-[11px] uppercase mb-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Адрес доставки</p>
                    <p className={`text-sm leading-5 break-words ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>{shipment.delivery_address || '—'}</p>
                  </div>
                  <div className="col-span-2 text-right">
                    <div className="flex justify-end gap-1 flex-wrap mb-2">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider ${typeColor}`}>{typeLabel}</span>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${stateColor}`}>{stateLabel}</span>
                    </div>
                    <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{formatDate(shipment.created_at)}</p>
                    <p className={`text-xs mt-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{shipment.weight} кг</p>
                    {shipment.door_to_door_phone && (
                      <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{shipment.door_to_door_phone}</p>
                    )}
                  </div>
                </div>

                <div className="lg:hidden">
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-sm font-semibold ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>{shipment.shipment_number}</span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${stateColor}`}>{stateLabel}</span>
                  </div>
                  <p className={`text-sm mb-2 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>{shipment.client_name}</p>
                  <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{shipment.pickup_address || '—'}</p>
                  <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{shipment.delivery_address || '—'}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{formatDate(shipment.created_at)}</span>
                    <span className={`text-xs ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{shipment.weight} кг</span>
                  </div>
                </div>
              </div>
            );
          })}
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
