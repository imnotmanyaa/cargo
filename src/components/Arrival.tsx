import { useState, useEffect } from 'react';
import { Package, Bell, RefreshCw } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';

export function Arrival({ theme }: { theme?: 'light' | 'dark' }) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [arrivals, setArrivals] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchArrivals = async () => {
    if (!user?.station) return;

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/shipments?type=arrived&station=${user.station}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setArrivals(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch arrivals:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArrivals();
    // Poll every 30 seconds
    const interval = setInterval(fetchArrivals, 30000);
    return () => clearInterval(interval);
  }, [user]);

  const handleIssue = async (id: string) => {
    if (!confirm(t('confirmIssue'))) return;

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/shipments/${id}/ready-for-issue`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (res.ok) {
        alert(t('shipmentIssued'));
        fetchArrivals();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to mark shipment for issue');
      }
    } catch (error) {
      console.error('Issue error:', error);
      alert('Network error');
    }
  };

  return (
    <div>
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className={`text-2xl font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{t('arrivalTitle')}</h1>
          <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>{t('arrivalDesc')}</p>
        </div>
        <button
          onClick={fetchArrivals}
          className={`p-2 rounded-full ${theme === 'dark' ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-600'}`}
        >
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className={`rounded-lg shadow-sm border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <div className={`p-6 border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="flex justify-between items-center">
            <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{t('arrivedShipments')}</h3>
            <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              <Bell className="w-5 h-5" />
              {t('notifyAll')}
            </button>
          </div>
        </div>

        <div className={`divide-y ${theme === 'dark' ? 'divide-gray-700' : 'divide-gray-200'}`}>
          {arrivals.length === 0 ? (
            <div className={`p-8 text-center ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
              Нет грузов, ожидающих выдачи
            </div>
          ) : (
            arrivals.map((arrival) => (
              <div key={arrival.id} className={`p-6 ${theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}`}>
                <div className="flex items-start justify-between">
                  <div className="flex gap-4">
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Package className="w-6 h-6 text-green-600" />
                    </div>

                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <span className="text-sm font-medium text-blue-600">{arrival.id}</span>
                        {/* Notification status logic would go here if we tracked it per shipment */}
                      </div>
                      <h4 className={`font-medium mb-1 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{arrival.client_name}</h4>
                      <div className={`text-sm space-y-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                        <div>{t('arrivedFrom')} {arrival.from_station}</div>
                        <div>{t('arrivedAt')} {new Date(arrival.updated_at || Date.now()).toLocaleString()}</div>
                        <div>{t('weightColumn')}: {arrival.weight} кг</div>
                        <div>{t('phone')} {arrival.client_email}</div>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => alert(`Сообщение отправлено клиенту: ${arrival.client_name || 'Клиент'}`)}
                      className={`px-4 py-2 border rounded-lg ${theme === 'dark'
                          ? 'border-blue-500 text-blue-400 hover:bg-gray-700'
                          : 'border-blue-600 text-blue-600 hover:bg-blue-50'
                        }`}>
                      {t('notify')}
                    </button>
                    <button
                      onClick={() => handleIssue(arrival.id)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      {t('issue')}
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}