import { useState, useEffect } from 'react';
import { ArrowDown, ArrowUp, RefreshCw } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';

interface TransitProps {
  theme?: 'light' | 'dark';
}

export function Transit({ theme = 'light' }: TransitProps) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const isDark = theme === 'dark';

  const [incomingShipments, setIncomingShipments] = useState<any[]>([]);
  const [outgoingShipments, setOutgoingShipments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchShipments = async () => {
    if (!user?.station) return;

    setLoading(true);
    try {
      // Fetch incoming
      const resIncoming = await fetch(`/api/shipments?type=incoming&station=${user.station}`);
      const dataIncoming = await resIncoming.json();
      setIncomingShipments(Array.isArray(dataIncoming) ? dataIncoming : []);

      // Fetch outgoing
      const resOutgoing = await fetch(`/api/shipments?type=outgoing&station=${user.station}`);
      const dataOutgoing = await resOutgoing.json();
      setOutgoingShipments(Array.isArray(dataOutgoing) ? dataOutgoing : []);
    } catch (error) {
      console.error('Failed to fetch shipments:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShipments();

    // Set up polling or socket listeners here (simplified for now with manual refresh)
    const interval = setInterval(fetchShipments, 30000);
    return () => clearInterval(interval);
  }, [user]);

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6 md:mb-8 flex justify-between items-center">
        <div>
          <h1 className={`text-xl md:text-2xl font-semibold mb-2 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{t('transitTitle')}</h1>
          <p className={`text-sm md:text-base ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{t('transitDesc')}</p>
        </div>
        <button
          onClick={fetchShipments}
          className={`p-2 rounded-full ${isDark ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-600'}`}
          title="Refresh"
        >
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 md:gap-6 mb-6 md:mb-8">
        {/* Incoming Shipments */}
        <div className={`rounded-lg shadow-sm border p-4 md:p-6 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <div className="flex items-center gap-2 mb-4">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isDark ? 'bg-green-900' : 'bg-green-100'}`}>
              <ArrowDown className={`w-5 h-5 ${isDark ? 'text-green-400' : 'text-green-600'}`} />
            </div>
            <h3 className={`text-base md:text-lg font-semibold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>Входящие грузы</h3>
          </div>

          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {incomingShipments.length === 0 ? (
              <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Нет входящих грузов</p>
            ) : (
              incomingShipments.map((shipment) => (
                <div key={shipment.id} className={`p-3 border rounded-lg ${isDark ? 'border-gray-700 hover:bg-gray-750' : 'border-gray-200 hover:bg-gray-50'}`}>
                  <div className="flex justify-between items-start mb-2">
                    <span className={`text-sm font-medium ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>{shipment.shipment_number}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${isDark ? 'bg-blue-900 text-blue-300' : 'bg-blue-100 text-blue-700'
                      }`}>
                      {shipment.status}
                    </span>
                  </div>
                  <div className={`text-xs space-y-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    <div>Откуда: {shipment.from_station}</div>
                    <div>Куда: {shipment.to_station}</div>
                    <div className={`font-medium ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>Дата: {new Date(shipment.departure_date).toLocaleDateString()}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Outgoing Shipments */}
        <div className={`rounded-lg shadow-sm border p-4 md:p-6 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <div className="flex items-center gap-2 mb-4">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isDark ? 'bg-orange-900' : 'bg-orange-100'}`}>
              <ArrowUp className={`w-5 h-5 ${isDark ? 'text-orange-400' : 'text-orange-600'}`} />
            </div>
            <h3 className={`text-base md:text-lg font-semibold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>Исходящие грузы</h3>
          </div>

          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {outgoingShipments.length === 0 ? (
              <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Нет исходящих грузов</p>
            ) : (
              outgoingShipments.map((shipment) => (
                <div key={shipment.id} className={`p-3 border rounded-lg ${isDark ? 'border-gray-700 hover:bg-gray-750' : 'border-gray-200 hover:bg-gray-50'}`}>
                  <div className="flex justify-between items-start mb-2">
                    <span className={`text-sm font-medium ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>{shipment.shipment_number}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${shipment.status === 'Прибыл'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-yellow-100 text-yellow-700'
                      }`}>
                      {shipment.status}
                    </span>
                  </div>
                  <div className={`text-xs space-y-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    <div>Куда: {shipment.to_station}</div>
                    <div>След. станция: {shipment.next_station || 'Конечная'}</div>
                    <div className={`font-medium ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>Отправление: {new Date(shipment.departure_date).toLocaleDateString()}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}