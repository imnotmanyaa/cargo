import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Package, MapPin, Ticket } from 'lucide-react';

interface Shipment {
  id: string;
  shipment_number?: string;
  from_station: string;
  to_station: string;
  status: string;
  created_at: string;
  cost: number;
}

interface IndividualDashboardProps {
  theme?: 'light' | 'dark';
  onCreateShipment?: () => void;
}

export function IndividualDashboard({ theme: _theme = 'light', onCreateShipment }: IndividualDashboardProps) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchShipments = async () => {
      if (!user?.id) return;
      try {
        const res = await fetch(`/api/shipments?client_id=${user.id}`);
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

  const handleDetails = (id: string) => {
    window.open(`/tracking/${id}`, '_blank');
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">{t('individualDashboard')}</h1>
        <p className="text-gray-600">{user?.name}</p>
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
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">{t('myShipments')}</h2>
        </div>
        <div className="divide-y divide-gray-200">
          {loading ? (
            <div className="p-8 text-center text-gray-500">{t('processing')}</div>
          ) : shipments.length === 0 ? (
            <div className="p-8 text-center text-gray-500">{t('noShipmentsYet')}</div>
          ) : (
            shipments.map((shipment) => (
              <div key={shipment.id} className="p-6 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex gap-4">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${shipment.status === 'Прибыл' ? 'bg-green-100' : 'bg-blue-100'}`}>
                      <Package className={`w-6 h-6 ${shipment.status === 'Прибыл' ? 'text-green-600' : 'text-blue-600'}`} />
                    </div>

                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-sm font-medium text-blue-600">{shipment.shipment_number}</span>
                        <span className={`text-xs px-2 py-1 rounded-full ${shipment.status === 'Прибыл'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-blue-100 text-blue-700'
                          }`}>
                          {shipment.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                        <MapPin className="w-4 h-4" />
                        <span>{shipment.from_station} → {shipment.to_station}</span>
                      </div>
                      <div className="text-sm text-gray-600">
                        <span className="font-medium">{t('date')}:</span> {new Date(shipment.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-lg font-bold text-gray-900">{shipment.cost?.toLocaleString() || 0} ₸</p>
                    <button
                      onClick={() => handleDetails(shipment.id)}
                      className="mt-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                      {t('details')}
                    </button>
                  </div>
                </div>
              </div>
            )))}
        </div>
      </div>
    </div>
  );
}