import { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { Package, Train, CheckCircle, MapPin, RefreshCw, QrCode, Scan } from 'lucide-react';
import { io } from 'socket.io-client';

interface Shipment {
  id: string;
  client_name: string;
  from_station: string;
  to_station: string;
  status: string;
  weight: string;
  dimensions: string;
  description: string;
  departure_date: string;
  loaded?: boolean;
}

interface ReceiverDashboardProps {
  theme?: 'light' | 'dark';
}

export function ReceiverDashboard({ theme = 'light' }: ReceiverDashboardProps) {
  const isDark = theme === 'dark';
  const { t } = useLanguage();
  const { user } = useAuth();
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'loading' | 'arrival'>('loading');
  const [scanInput, setScanInput] = useState('');
  const [processing, setProcessing] = useState(false);

  const fetchShipments = async () => {
    if (!user?.station) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/shipments/by-station/${encodeURIComponent(user.station)}`);
      if (response.ok) {
        const data = await response.json();
        // Add loaded state based on status
        const shipmentsWithLoaded = data.map((s: Shipment) => ({
          ...s,
          loaded: s.status === 'Погружен'
        }));
        setShipments(shipmentsWithLoaded);
      }
    } catch (error) {
      console.error('Failed to fetch shipments:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShipments();

    // Setup Socket.IO connection
    if (!user?.station) return;

    const socket = io();

    socket.on('connect', () => {
      console.log('Connected to WebSocket');
      socket.emit('join-station', user.station);
    });

    socket.on('new-shipment', (shipment: Shipment) => {
      console.log('New shipment received via WebSocket:', shipment);
      setShipments(prev => {
        // Avoid duplicates
        if (prev.find(s => s.id === shipment.id)) return prev;
        return [{ ...shipment, loaded: shipment.status === 'Погружен' }, ...prev];
      });
    });

    socket.on('shipment-updated', (updatedShipment: Shipment) => {
      console.log('Shipment updated via WebSocket:', updatedShipment);
      setShipments(prev => prev.map(s =>
        s.id === updatedShipment.id
          ? { ...updatedShipment, loaded: updatedShipment.status === 'Погружен' }
          : s
      ));
    });

    return () => {
      socket.disconnect();
    };
  }, [user?.station]);

  const toggleShipmentLoaded = async (shipmentId: string) => {
    const shipment = shipments.find(s => s.id === shipmentId);
    if (!shipment) return;

    const newStatus = shipment.loaded ? 'В пути' : 'Погружен';

    try {
      const response = await fetch(`/api/shipments/${shipmentId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        setShipments(prev => prev.map(s =>
          s.id === shipmentId
            ? { ...s, loaded: !s.loaded, status: newStatus }
            : s
        ));
      }
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  const handleArrivalScan = async () => {
    if (!scanInput.trim() || !user?.station) return;

    setProcessing(true);
    try {
      const response = await fetch(`/api/shipments/${scanInput}/transit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          current_station: user.station,
          operator_id: user.id,
          operator_name: user.name
        })
      });

      if (response.ok) {
        const updated = await response.json();
        if (updated.status === 'Прибыл') {
          alert(`Груз ${updated.id} успешно принят! Статус: Прибыл.`);
        } else {
          alert(`Груз ${updated.id} обновлен. Статус: ${updated.status}`);
        }
        setScanInput('');
        fetchShipments();
      } else {
        const err = await response.json();
        alert(err.error || 'Ошибка при сканировании');
      }
    } catch (error) {
      console.error('Scan error:', error);
      alert('Ошибка сети');
    } finally {
      setProcessing(false);
    }
  };

  // Group shipments by destination for "train" grouping
  const groupedByDestination = shipments.reduce((acc, shipment) => {
    const key = shipment.to_station;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(shipment);
    return acc;
  }, {} as Record<string, Shipment[]>);

  const tasks = Object.entries(groupedByDestination).map(([destination, items], index) => ({
    id: `T-${String(index + 1).padStart(3, '0')}`,
    trainNumber: `№ ${15 + index}`,
    carNumber: String(5 + index),
    shipments: items,
    route: `${user?.station || ''} → ${destination}`,
    departureTime: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
  }));

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className={`text-2xl font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>{t('receiverDashboard')}</h1>
          <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            Станция: <span className="font-medium">{user?.station || 'Не указана'}</span>
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('loading')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'loading'
                ? 'bg-blue-600 text-white'
                : (isDark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-white text-gray-600 hover:bg-gray-50')
              }`}
          >
            Погрузка
          </button>
          <button
            onClick={() => setActiveTab('arrival')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'arrival'
                ? 'bg-blue-600 text-white'
                : (isDark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-white text-gray-600 hover:bg-gray-50')
              }`}
          >
            Прибытие
          </button>
          <button
            onClick={fetchShipments}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${isDark
              ? 'bg-gray-700 text-gray-200 hover:bg-gray-600'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {activeTab === 'loading' ? (
        // LOADING TAB CONTENT
        loading ? (
          <div className="text-center py-12">
            <RefreshCw className={`w-8 h-8 mx-auto animate-spin ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
            <p className={`mt-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Загрузка...</p>
          </div>
        ) : tasks.length === 0 ? (
          <div className={`text-center py-12 rounded-lg border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <CheckCircle className={`w-12 h-12 mx-auto ${isDark ? 'text-green-500' : 'text-green-400'}`} />
            <p className={`mt-2 font-medium ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
              Нет грузов для погрузки
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {tasks.map((task) => {
              const loadedCount = task.shipments.filter(s => s.loaded).length;
              const totalCount = task.shipments.length;
              const isComplete = loadedCount === totalCount;

              return (
                <div key={task.id} className={`rounded-lg border overflow-hidden ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                  {/* Task Header */}
                  <div className="bg-blue-600 p-4 text-white">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Train className="w-5 h-5" />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">Поезд {task.trainNumber}</span>
                            <span className="text-blue-200">•</span>
                            <span className="text-sm">Вагон {task.carNumber}</span>
                          </div>
                          <div className="flex items-center gap-2 mt-1 text-xs text-blue-100">
                            <MapPin className="w-3 h-3" />
                            {task.route}
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-xs text-blue-100">Отправление</div>
                        <div className="text-lg font-bold">{task.departureTime}</div>
                      </div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className={`px-4 py-3 border-b ${isDark ? 'bg-gray-750 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                        Прогресс погрузки
                      </span>
                      <span className={`text-sm font-semibold ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>
                        {loadedCount} / {totalCount}
                      </span>
                    </div>
                    <div className={`w-full rounded-full h-2 ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}>
                      <div
                        className={`h-2 rounded-full transition-all ${isComplete ? 'bg-green-500' : 'bg-blue-500'
                          }`}
                        style={{ width: `${(loadedCount / totalCount) * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* Shipments List */}
                  <div className={`divide-y ${isDark ? 'divide-gray-700' : 'divide-gray-100'}`}>
                    {task.shipments.map((shipment) => (
                      <div
                        key={shipment.id}
                        className={`p-4 transition-colors ${shipment.loaded
                          ? (isDark ? 'bg-green-900/20' : 'bg-green-50')
                          : (isDark ? 'hover:bg-gray-750' : 'hover:bg-gray-50')
                          }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 flex-1">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${shipment.loaded
                              ? (isDark ? 'bg-green-900' : 'bg-green-100')
                              : (isDark ? 'bg-blue-900' : 'bg-blue-100')
                              }`}>
                              {shipment.loaded ? (
                                <CheckCircle className={`w-4 h-4 ${isDark ? 'text-green-400' : 'text-green-600'}`} />
                              ) : (
                                <Package className={`w-4 h-4 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
                              )}
                            </div>

                            <div className="flex-1 grid grid-cols-4 gap-4 items-center">
                              <div>
                                <div className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>Груз</div>
                                <div className={`font-medium text-sm ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>{shipment.id}</div>
                              </div>
                              <div>
                                <div className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>Клиент</div>
                                <div className={`font-medium text-sm ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>{shipment.client_name || 'Неизвестный'}</div>
                              </div>
                              <div>
                                <div className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>Назначение</div>
                                <div className={`font-medium text-sm ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>{shipment.to_station}</div>
                              </div>
                              <div>
                                <div className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>Вес</div>
                                <div className={`font-medium text-sm ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>{shipment.weight} кг</div>
                              </div>
                            </div>
                          </div>

                          <button
                            onClick={() => toggleShipmentLoaded(shipment.id)}
                            className={`ml-4 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${shipment.loaded
                              ? (isDark
                                ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300')
                              : 'bg-green-600 text-white hover:bg-green-700'
                              }`}
                          >
                            {shipment.loaded ? 'Отменить' : 'Погружено'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        // ARRIVAL TAB CONTENT
        <div className={`rounded-lg shadow-sm border p-6 md:p-8 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <div className="text-center max-w-md mx-auto">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 ${isDark ? 'bg-blue-900' : 'bg-blue-100'}`}>
              <QrCode className={`w-8 h-8 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
            </div>
            <h2 className={`text-xl font-semibold mb-2 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>Сканирование прибытия</h2>
            <p className={`text-sm mb-8 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Отсканируйте QR-код или введите ID груза для фиксации прибытия на станцию {user?.station}
            </p>

            <div className="mb-6 space-y-4">
              <input
                type="text"
                value={scanInput}
                onChange={(e) => setScanInput(e.target.value)}
                placeholder="Введи ID груза (SH-...)"
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDark
                  ? 'bg-gray-700 border-gray-600 text-gray-200 placeholder-gray-500'
                  : 'bg-white border-gray-300'}`}
              />

              <div
                className={`w-full aspect-square max-w-[300px] mx-auto border-4 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-opacity-50 transition-colors ${isDark
                  ? 'border-gray-600 hover:bg-gray-700'
                  : 'border-gray-300 hover:bg-gray-50'}`}
                onClick={() => alert("Simulation: Camera would open here. Please enter ID manually.")}
              >
                <Scan className={`w-16 h-16 mb-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                <span className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Нажмите для сканирования</span>
              </div>
            </div>

            <button
              onClick={handleArrivalScan}
              disabled={processing || !scanInput}
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
              {processing ? 'Обработка...' : 'Зафиксировать прибытие'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}