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
      const res = await fetch(`/api/arrivals/pending?station=${encodeURIComponent(user.station)}`, {
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

  const handleScan = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const code = e.currentTarget.value.trim();
      e.currentTarget.value = '';
      if (!code) return;
      try {
        const token = localStorage.getItem('token');
        const res = await fetch('/api/scan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ shipment_id: code, event_type: 'ISSUE_SCAN', station_id: user?.station })
        });
        if (res.ok) {
           playBeep(880);
           alert(`Груз ${code} успешно просканирован. Теперь вы можете нажать "Выдать".`);
        } else {
           playBeep(220);
           const err = await res.json();
           alert('Ошибка сканирования: ' + (err.error || ''));
        }
      } catch (err) {
        console.error(err);
      }
    }
  };

  const playBeep = (freq: number) => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      osc.type = 'square';
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.1);
    } catch {}
  };

  const handleIssue = async (id: string) => {
    if (!confirm('Выдать этот груз получателю?')) return;

    const receiverName = window.prompt("Введите ФИО получателя (как в документе) для проверки:");
    if (!receiverName) return;

    const receiverPhone = window.prompt("Введите номер телефона получателя для проверки:");
    if (!receiverPhone) return;

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/shipments/${id}/issue`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          receiver_name: receiverName.trim(),
          receiver_phone: receiverPhone.trim()
        })
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

      <div className={`rounded-lg shadow-sm border mb-6 ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <div className="p-4">
          <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
            Сканирование груза для выдачи
          </label>
          <input
            type="text"
            placeholder="Считайте штрих-код сканером..."
            className={`w-full max-w-md px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900'}`}
            onKeyDown={handleScan}
          />
        </div>
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
              <div key={arrival.id} className={`p-4 md:p-6 ${theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}`}>
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div className="flex gap-3 min-w-0">
                    <div className="w-10 h-10 md:w-12 md:h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Package className="w-5 h-5 md:w-6 md:h-6 text-green-600" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-blue-600 truncate">{arrival.shipment_number}</span>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${
                          arrival.shipment_status === 'READY_FOR_ISSUE'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {arrival.shipment_status === 'READY_FOR_ISSUE' ? 'На складе' : 'Прибыл'}
                        </span>
                      </div>
                      <h4 className={`font-medium mb-1 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{arrival.client_name}</h4>
                      <div className={`text-sm space-y-0.5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                        <div>{t('arrivedFrom')} {arrival.from_station}</div>
                        <div>{t('arrivedAt')} {new Date(arrival.updated_at || Date.now()).toLocaleString()}</div>
                        <div>{t('weightColumn')}: {arrival.weight} кг</div>
                        <div>{t('phone')} {arrival.receiver_phone || arrival.client_email}</div>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 flex-shrink-0 sm:flex-col md:flex-row">
                    <button
                      onClick={() => alert(`Сообщение отправлено клиенту: ${arrival.client_name || 'Клиент'}`)}
                      className={`flex-1 sm:flex-none px-3 py-2 text-sm border rounded-lg whitespace-nowrap ${theme === 'dark'
                          ? 'border-blue-500 text-blue-400 hover:bg-gray-700'
                          : 'border-blue-600 text-blue-600 hover:bg-blue-50'
                        }`}>
                      {t('notify')}
                    </button>
                    <button
                      onClick={() => handleIssue(arrival.id)}
                      className="flex-1 sm:flex-none px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 whitespace-nowrap"
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