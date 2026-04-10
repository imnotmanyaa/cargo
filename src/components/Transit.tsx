import { useState, useEffect } from 'react';
import { QrCode, Scan, ArrowDown, ArrowUp, RefreshCw } from 'lucide-react';
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
  const [scanInput, setScanInput] = useState('');
  const [processing, setProcessing] = useState(false);
  const [recentScans, setRecentScans] = useState<any[]>([]);

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

  const handleScan = async () => {
    if (!scanInput.trim() || !user) return;

    setProcessing(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/shipments/${scanInput}/transit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          current_station: user.station,
          operator_id: user.id,
          operator_name: user.name
        })
      });

      if (response.ok) {
        const updated = await response.json();

        // Show specific message for arrival
        if (updated.status === 'Прибыл') {
          alert(`Груз ${updated.id} прибыл в пункт назначения! Переместите на склад выдачи.`);
        } else {
          alert(`Shipment ${updated.id} updated! Status: ${updated.status}`);
        }

        setRecentScans(prev => [{
          id: updated.id,
          time: new Date().toLocaleTimeString(),
          location: updated.current_station,
          action: updated.status === 'Прибыл' ? t('arrivalScan') : t('issuance')
        }, ...prev].slice(0, 5));

        setScanInput('');
        fetchShipments();
      } else {
        const err = await response.json();
        alert(err.error || 'Failed to update shipment');
      }
    } catch (error) {
      console.error('Scan error:', error);
      alert('Network error');
    } finally {
      setProcessing(false);
    }
  };

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

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 md:gap-6 mb-6 md:mb-8">
        {/* QR Scanning */}
        <div className={`rounded-lg shadow-sm border p-6 md:p-8 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <div className="text-center">
            <div className={`w-12 h-12 md:w-16 md:h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${isDark ? 'bg-blue-900' : 'bg-blue-100'}`}>
              <QrCode className={`w-6 h-6 md:w-8 md:h-8 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
            </div>
            <h2 className={`text-lg md:text-xl font-semibold mb-2 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{t('qrScanning')}</h2>
            <p className={`text-sm md:text-base mb-6 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{t('scanQrDesc')}</p>

            <div className="mb-6">
              <input
                type="text"
                value={scanInput}
                onChange={(e) => setScanInput(e.target.value)}
                placeholder="Enter Shipment ID (SH-...)"
                className={`w-full px-4 py-2 border rounded-lg mb-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDark
                  ? 'bg-gray-700 border-gray-600 text-gray-200'
                  : 'bg-white border-gray-300'}`}
              />
              <div className={`w-40 h-40 md:w-48 md:h-48 mx-auto border-4 border-dashed rounded-lg flex items-center justify-center cursor-pointer hover:bg-opacity-50 ${isDark ? 'border-gray-600 hover:bg-gray-700' : 'border-gray-300 hover:bg-gray-50'}`}
                onClick={() => alert("Simulation: Camera would open here. Please enter ID manually.")}>
                <Scan className={`w-12 h-12 md:w-16 md:h-16 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
              </div>
            </div>

            <button
              onClick={handleScan}
              disabled={processing || !scanInput}
              className="w-full px-4 md:px-6 py-2 md:py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm md:text-base disabled:opacity-50 disabled:cursor-not-allowed">
              {processing ? 'Processing...' : t('startScanning')}
            </button>
          </div>
        </div>

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
                    <span className={`text-sm font-medium ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>{shipment.id}</span>
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
                    <span className={`text-sm font-medium ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>{shipment.id}</span>
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

      {/* Recent Scans */}
      <div className={`rounded-lg shadow-sm border p-4 md:p-6 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <h3 className={`text-base md:text-lg font-semibold mb-4 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{t('recentScans')}</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {recentScans.length === 0 ? (
            <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Нет недавних сканирований</p>
          ) : (
            recentScans.map((scan, index) => (
              <div key={index} className={`p-4 border rounded-lg ${isDark ? 'border-gray-700 hover:bg-gray-750' : 'border-gray-200 hover:bg-gray-50'}`}>
                <div className="flex justify-between items-start mb-2">
                  <span className={`text-sm font-medium ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>{scan.id}</span>
                  <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>{scan.time}</span>
                </div>
                <div className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                  <div>{scan.location}</div>
                  <div className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{t('action')}: {scan.action}</div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}