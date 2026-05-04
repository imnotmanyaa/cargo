import { withApiBase } from "../lib/api-base";

import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Package, MapPin, Ticket } from 'lucide-react';
import { ShipmentDetailsModal } from './ShipmentDetailsModal';

interface Shipment {
  id: string;
  shipment_number?: string;
  client_name?: string;
  client_login?: string;
  from_station: string;
  to_station: string;
  status: string;
  shipment_status?: string;
  created_at: string;
  departure_date?: string;
  weight?: string;
  quantity_places?: number;
  description?: string;
  value?: string;
  receiver_name?: string;
  receiver_phone?: string;
  pickup_address?: string;
  delivery_address?: string;
  door_to_door_phone?: string;
  cost: number;
}

interface IndividualDashboardProps {
  theme?: 'light' | 'dark';
  onCreateShipment?: () => void;
}

export function IndividualDashboard({ theme = 'light', onCreateShipment }: IndividualDashboardProps) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const isDark = theme === 'dark';
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchShipments = async () => {
      if (!user?.id) return;
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(withApiBase(`/api/shipments?client_id=${user.id}`), {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        if (res.ok) {
          const data = await res.json();
          setShipments(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        console.error('Failed to fetch shipments', error);
      } finally {
        setLoading(false);
      }
    };
    fetchShipments();
  }, [user?.id]);

  const prettyStatus = (shipment: Shipment) => {
    const s = String((shipment as any).shipment_status || shipment.status || '').toUpperCase();
    if (s === 'CREATED_DOOR' || s === 'CREATED') return t('statusRegistered');
    if (s === 'PAYMENT_PENDING') return t('paymentPending');
    if (s === 'PAID') return t('statusPaid');
    if (s === 'PICKUP_ASSIGNED') return t('courierStatusAssigned') || 'Курьер назначен';
    if (s === 'PICKED_UP') return t('courierStatusPickedUp') || 'Курьер забрал';
    if (s === 'AT_STATION_INTAKE' || s === 'READY_FOR_LOADING') return t('atStation') || 'На складе';
    if (s === 'LOADED') return t('statusLoaded');
    if (s === 'IN_TRANSIT') return t('statusInTransit');
    if (s === 'ARRIVED') return t('statusArrived');
    if (s === 'READY_FOR_ISSUE') return t('statusReadyForIssue');
    if (s === 'DELIVERY_ASSIGNED') return 'Курьер везёт к вам';
    if (s === 'ISSUED') return t('statusIssued');
    if (s === 'CANCELLED') return t('cancel');
    return shipment.status || t('statusRegistered');
  };

  const statusTone = (status: string) => {
    // Map translated status back to tone or use raw status if needed.
    // Actually it's better to use the status key for tone logic, but let's keep it simple for now.
    if (status === t('statusIssued')) return 'bg-emerald-100 text-emerald-700';
    if (status === t('statusReadyForIssue') || status === t('statusArrived')) return 'bg-green-100 text-green-700';
    if (status === t('statusInTransit')) return 'bg-blue-100 text-blue-700';
    if (status === t('statusLoaded')) return 'bg-purple-100 text-purple-700';
    if (status === t('courierStatusAssigned')) return 'bg-orange-100 text-orange-700';
    if (status === t('courierStatusPickedUp') || status === t('atStation')) return 'bg-teal-100 text-teal-700';
    if (status === t('cancel')) return 'bg-red-100 text-red-700';
    return 'bg-yellow-100 text-yellow-700';
  };

  const filteredShipments = shipments.filter(s =>
    !search ||
    s.shipment_number?.toLowerCase().includes(search.toLowerCase()) ||
    s.from_station?.toLowerCase().includes(search.toLowerCase()) ||
    s.to_station?.toLowerCase().includes(search.toLowerCase())
  );

  const openDetails = (shipment: Shipment) => {
    setSelectedShipment(shipment);
  };

  return (
    <div>
      {selectedShipment && (
        <ShipmentDetailsModal
          theme={theme}
          onClose={() => setSelectedShipment(null)}
          shipment={{
            id: selectedShipment.id,
            shipment_number: selectedShipment.shipment_number,
            client: selectedShipment.client_name || user?.name || 'Клиент',
            client_login: selectedShipment.client_login || user?.login,
            from: selectedShipment.from_station,
            to: selectedShipment.to_station,
            status: prettyStatus(selectedShipment),
            date: selectedShipment.created_at,
            departure_date: selectedShipment.departure_date || selectedShipment.created_at,
            weight: selectedShipment.weight ? `${selectedShipment.weight} кг` : '-',
            quantity_places: selectedShipment.quantity_places || 1,
            description: selectedShipment.description || '',
            value: selectedShipment.value || '',
            receiver_name: selectedShipment.receiver_name,
            receiver_phone: selectedShipment.receiver_phone,
            pickup_address: selectedShipment.pickup_address,
            delivery_address: selectedShipment.delivery_address,
            door_to_door_phone: selectedShipment.door_to_door_phone,
          }}
        />
      )}
      <div className="mb-8">
        <h1 className={`text-2xl font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>{t('individualDashboard')}</h1>
        <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>{user?.name}</p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-lg p-6 text-white">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold mb-1">{t('newShipment')}</h3>
              <p className="text-sm text-blue-100">{t('newShipmentDesc')}</p>
            </div>
            <Package className="w-8 h-8 text-blue-200" />
          </div>
          <button className="w-full px-4 py-2 bg-white text-blue-600 rounded-lg hover:bg-blue-50 font-medium" onClick={onCreateShipment}>
            {t('createNewShipment')}
          </button>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-lg p-6 text-white">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold mb-1">{t('mobiusTicket')}</h3>
              <p className="text-sm text-green-100">{t('ticketDiscount')}</p>
            </div>
            <Ticket className="w-8 h-8 text-green-200" />
          </div>
          <button className="w-full px-4 py-2 bg-white text-green-600 rounded-lg hover:bg-green-50 font-medium">
            {t('track')}
          </button>
        </div>
      </div>

      {/* My Shipments */}
      <div className={`rounded-lg shadow-sm border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <div className={`p-6 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'} flex flex-col sm:flex-row sm:items-center gap-3`}>
          <h2 className={`text-lg font-semibold flex-1 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{t('myShipments')}</h2>
          <input
            type="text"
            placeholder={t('searchPlaceholder')}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className={`px-3 py-2 text-sm border rounded-lg w-full sm:w-64 focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDark ? 'bg-gray-700 border-gray-600 text-gray-200 placeholder-gray-400' : 'border-gray-300 bg-white'}`}
          />
        </div>
        <div className={`divide-y ${isDark ? 'divide-gray-700' : 'divide-gray-200'}`}>
          {loading ? (
            <div className={`p-8 text-center ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{t('processing')}</div>
          ) : filteredShipments.length === 0 ? (
            <div className={`p-8 text-center ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{search ? t('nothingFound') : t('noShipmentsYet')}</div>
          ) : (
            filteredShipments.map((shipment) => (
              <div
                key={shipment.id}
                onClick={() => openDetails(shipment)}
                className={`p-6 cursor-pointer ${isDark ? 'hover:bg-gray-700/30' : 'hover:bg-gray-50'}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex gap-4">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${shipment.status === 'Прибыл' ? 'bg-green-100' : 'bg-blue-100'}`}>
                      <Package className={`w-6 h-6 ${shipment.status === 'Прибыл' ? 'text-green-600' : 'text-blue-600'}`} />
                    </div>

                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-sm font-medium text-blue-600">{shipment.shipment_number}</span>
                        <span className={`text-xs px-2 py-1 rounded-full ${statusTone(prettyStatus(shipment))}`}>
                          {prettyStatus(shipment)}
                        </span>
                      </div>
                      <div className={`flex items-center gap-2 text-sm mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                        <MapPin className="w-4 h-4" />
                        <span>{shipment.from_station} → {shipment.to_station}</span>
                      </div>
                      <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                        <span className="font-medium">{t('date')}:</span> {new Date(shipment.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className={`text-lg font-bold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{shipment.cost?.toLocaleString() || 0} ₸</p>
                    <p className="mt-2 text-sm text-blue-600 font-medium">{t('clickForDetails')}</p>
                  </div>
                </div>
              </div>
            )))}
        </div>
      </div>
    </div>
  );
}