import { QrCode, Scan, ArrowDown, ArrowUp } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface TransitProps {
  theme?: 'light' | 'dark';
}

export function Transit({ theme = 'light' }: TransitProps) {
  const { t } = useLanguage();
  const isDark = theme === 'dark';

  const incomingShipments = [
    { id: 'SH-2024-101', from: 'Астана Нұрлы Жол', eta: '14:30', train: '№ 15', status: 'В пути' },
    { id: 'SH-2024-105', from: 'Шымкент', eta: '16:20', train: '№ 22', status: 'В пути' },
    { id: 'SH-2024-108', from: 'Қарағанды', eta: '18:45', train: '№ 8', status: 'Задержка' },
  ];

  const outgoingShipments = [
    { id: 'SH-2024-001', to: 'Астана Нұрлы Жол', departure: '14:30', train: '№ 15', status: 'Готов' },
    { id: 'SH-2024-003', to: 'Астана Нұрлы Жол', departure: '14:30', train: '№ 15', status: 'Готов' },
    { id: 'SH-2024-005', to: 'Шымкент', departure: '16:45', train: '№ 22', status: 'Погрузка' },
  ];

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6 md:mb-8">
        <h1 className={`text-xl md:text-2xl font-semibold mb-2 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{t('transitTitle')}</h1>
        <p className={`text-sm md:text-base ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{t('transitDesc')}</p>
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
              <div className={`w-40 h-40 md:w-48 md:h-48 mx-auto border-4 border-dashed rounded-lg flex items-center justify-center ${isDark ? 'border-gray-600' : 'border-gray-300'}`}>
                <Scan className={`w-12 h-12 md:w-16 md:h-16 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
              </div>
            </div>

            <button className="w-full px-4 md:px-6 py-2 md:py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm md:text-base">
              {t('startScanning')}
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
          
          <div className="space-y-3">
            {incomingShipments.map((shipment) => (
              <div key={shipment.id} className={`p-3 border rounded-lg ${isDark ? 'border-gray-700 hover:bg-gray-750' : 'border-gray-200 hover:bg-gray-50'}`}>
                <div className="flex justify-between items-start mb-2">
                  <span className={`text-sm font-medium ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>{shipment.id}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    shipment.status === 'Задержка' 
                      ? 'bg-red-100 text-red-700' 
                      : isDark ? 'bg-blue-900 text-blue-300' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {shipment.status}
                  </span>
                </div>
                <div className={`text-xs space-y-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  <div>Откуда: {shipment.from}</div>
                  <div>Поезд: {shipment.train}</div>
                  <div className={`font-medium ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>Прибытие: {shipment.eta}</div>
                </div>
              </div>
            ))}
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
          
          <div className="space-y-3">
            {outgoingShipments.map((shipment) => (
              <div key={shipment.id} className={`p-3 border rounded-lg ${isDark ? 'border-gray-700 hover:bg-gray-750' : 'border-gray-200 hover:bg-gray-50'}`}>
                <div className="flex justify-between items-start mb-2">
                  <span className={`text-sm font-medium ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>{shipment.id}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    shipment.status === 'Готов' 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {shipment.status}
                  </span>
                </div>
                <div className={`text-xs space-y-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  <div>Куда: {shipment.to}</div>
                  <div>Поезд: {shipment.train}</div>
                  <div className={`font-medium ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>Отправление: {shipment.departure}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Scans */}
      <div className={`rounded-lg shadow-sm border p-4 md:p-6 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <h3 className={`text-base md:text-lg font-semibold mb-4 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{t('recentScans')}</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[
            { id: 'SH-2024-001', time: '14:25', location: 'Алматы-1', action: t('loading') },
            { id: 'SH-2024-003', time: '14:20', location: 'Астана Нұрлы Жол', action: t('arrivalScan') },
            { id: 'SH-2024-005', time: '14:15', location: 'Шымкент', action: t('issuance') }
          ].map((scan, index) => (
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
          ))}
        </div>
      </div>
    </div>
  );
}