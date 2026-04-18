import { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { Package, Train, CheckCircle, MapPin, RefreshCw, QrCode, Scan, Clock, ClipboardList } from 'lucide-react';

interface Shipment {
  id: string;
  shipment_number?: string;
  client_name: string;
  from_station: string;
  to_station: string;
  status: string;
  weight: string;
  dimensions: string;
  description: string;
  departure_date: string;
  train_time?: string;
  loaded?: boolean;
  created_at?: string;
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
  const [activeTab, setActiveTab] = useState<'loading' | 'arrival' | 'audit'>('loading');
  const [auditLogs, setAuditLogs] = useState<{ id: string; time: string; action: string; shipmentId: string }[]>([]);
  const [scanInput, setScanInput] = useState('');
  const [loadingScanInput, setLoadingScanInput] = useState('');
  const [processing, setProcessing] = useState(false);
  const [scanResult, setScanResult] = useState<{ status: 'success' | 'error', message: string } | null>(null);

  const loadingInputRef = useRef<HTMLInputElement>(null);
  const arrivalInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus logic for hardware scanner
  useEffect(() => {
    if (activeTab === 'loading') {
      loadingInputRef.current?.focus();
    } else if (activeTab === 'arrival') {
      arrivalInputRef.current?.focus();
    }
  }, [activeTab, scanResult]);

  // Hardware key listeners (Arrow Keys for Tab Switching)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Allow users to navigate text if they are actively typing an ID
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
        const input = document.activeElement as HTMLInputElement;
        if (input.value.length > 0) return; 
      }

      if (e.key === 'ArrowRight') {
        setActiveTab(prev => {
          if (prev === 'loading') return 'arrival';
          if (prev === 'arrival') return 'audit';
          return 'loading';
        });
      } else if (e.key === 'ArrowLeft') {
        setActiveTab(prev => {
          if (prev === 'loading') return 'audit';
          if (prev === 'arrival') return 'loading';
          return 'arrival';
        });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Show scan result for 1.5 seconds
  useEffect(() => {
    if (scanResult) {
      const timer = setTimeout(() => {
        setScanResult(null);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [scanResult]);

  const fetchShipments = async () => {
    if (!user?.station) return;

    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/shipments/by-station/${encodeURIComponent(user.station)}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
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

    // Poll every 10 seconds for real-time updates
    const interval = setInterval(fetchShipments, 10000);
    return () => clearInterval(interval);
  }, [user?.station]);

  useEffect(() => {
    if (activeTab === 'loading' && loadingInputRef.current) {
      setTimeout(() => loadingInputRef.current?.focus(), 50);
    } else if (activeTab === 'arrival' && arrivalInputRef.current) {
      setTimeout(() => arrivalInputRef.current?.focus(), 50);
    }
  }, [activeTab]);

  const toggleShipmentLoaded = async (idOrNumber: string) => {
    const shipment = shipments.find(s => s.id === idOrNumber || s.shipment_number === idOrNumber);
    if (!shipment) return;
    const shipmentId = shipment.id;

    const newStatus = shipment.loaded ? 'Готов к погрузке' : 'Погружен';

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/shipments/${shipmentId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        setShipments(prev => prev.map(s =>
          s.id === shipmentId
            ? { ...s, loaded: !s.loaded, status: newStatus }
            : s
        ));

        setAuditLogs(prev => [{
          id: Date.now().toString(),
          time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
          action: newStatus === 'Погружен' ? 'Груз погружен' : 'Погрузка отменена',
          shipmentId: shipmentId
        }, ...prev]);
      }
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  const extractId = (input: string) => {
    const trimmed = input.trim();
    
    // Case 1: JSON (from ShipmentLabel.tsx)
    if (trimmed.startsWith('{')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed.id) return parsed.id;
      } catch (e) { /* ignore */ }
    }
    
    // Case 2: URL containing /shipment/ID
    if (trimmed.includes('/shipment/')) {
      const parts = trimmed.split('/shipment/');
      if (parts.length > 1) {
        const potentialId = parts[1].split('?')[0].split('#')[0];
        if (potentialId) return potentialId;
      }
    }

    // Case 3: Just find something that looks like SH-XXXX
    const shMatch = trimmed.match(/SH-[A-Z0-9-]+/i);
    if (shMatch) return shMatch[0].toUpperCase();

    return trimmed;
  };

  const handleArrivalScan = async (forcedValue?: string | React.MouseEvent) => {
    const rawValue = typeof forcedValue === 'string' ? forcedValue : scanInput;
    const shipmentId = extractId(rawValue);
    if (!shipmentId || !user?.station) return;

    setProcessing(true);
    try {
      const token = localStorage.getItem('token');
      // Backend now handles both UUID and ShipmentNumber (SH-XXXXXX)
      const response = await fetch(`/api/shipments/${shipmentId}/transit`, {
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
        if (updated.status === 'Прибыл') {
          showFeedback('success', `Груз ${updated.id} успешно принят!`);
        } else {
          showFeedback('success', `Груз ${updated.id} обновлен.`);
        }

        setAuditLogs(prev => [{
          id: Date.now().toString(),
          time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
          action: 'Прибытие зафиксировано',
          shipmentId: updated.shipment_number || updated.id || shipmentId
        }, ...prev]);

        setScanInput('');
        fetchShipments();
      } else {
        const err = await response.json();
        showFeedback('error', err.error || 'Ошибка при сканировании');
      }
    } catch (error) {
      console.error('Scan error:', error);
      showFeedback('error', 'Ошибка сети');
    } finally {
      setProcessing(false);
      setScanInput(''); // Clear input after processing
    }
  };

  const showFeedback = (status: 'success' | 'error', message: string) => {
    setScanResult({ status, message });
  };

  const handleLoadingScan = async (forcedValue?: string | React.MouseEvent) => {
    const rawValue = typeof forcedValue === 'string' ? forcedValue : loadingScanInput;
    const shipmentId = extractId(rawValue);
    if (!shipmentId) return;
    
    setProcessing(true);
    // Find by either UUID or shipment_number
    const shipment = shipments.find(s => s.id === shipmentId || s.shipment_number === shipmentId);
    if (!shipment) {
      showFeedback('error', `Груз ${shipmentId} не найден в плане`);
      setProcessing(false);
      return;
    }
    
    if (shipment.loaded) {
        showFeedback('error', "Груз уже погружен!");
        setProcessing(false);
        return;
    }
    
    await toggleShipmentLoaded(shipmentId);
    showFeedback('success', `Груз ${shipmentId} погружен`);
    setLoadingScanInput('');
    setProcessing(false);
  };

  // Group shipments by destination, date AND train time for accurate "train" grouping
  const groupedByDestinationAndTime = shipments.reduce((acc, shipment) => {
    // Format date as YYYY-MM-DD for consistent grouping
    const departureDate = shipment.departure_date ? new Date(shipment.departure_date).toISOString().split('T')[0] : 'no-date';
    const key = `${shipment.to_station}|${departureDate}|${shipment.train_time || 'no-time'}`;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(shipment);
    return acc;
  }, {} as Record<string, Shipment[]>);

  // Convert time string (HH:MM) to minutes for comparison
  const timeToMinutes = (timeStr: string) => {
    if (!timeStr || timeStr === 'no-time') return 9999; // Push 'no-time' to end
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const tasks = Object.entries(groupedByDestinationAndTime)
    .map(([key, items], index) => {
      const [destination, departureDate, trainTime] = key.split('|');

      // Sort shipments within train by created_at (FIFO - first in, first out)
      const sortedItems = [...items].sort((a, b) => {
        const dateA = new Date(a.created_at || a.departure_date || 0).getTime();
        const dateB = new Date(b.created_at || b.departure_date || 0).getTime();
        return dateA - dateB;
      });

      // Format date for display
      const formattedDate = departureDate !== 'no-date'
        ? new Date(departureDate).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })
        : '';

      return {
        id: `T-${String(index + 1).padStart(3, '0')}`,
        trainNumber: `№ ${15 + index}`,
        carNumber: String(5 + index),
        shipments: sortedItems,
        route: `${user?.station || ''} → ${destination}`,
        departureTime: trainTime !== 'no-time' ? trainTime : new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
        trainTime: trainTime, // Keep for sorting
        departureDate: departureDate, // Keep for sorting
        formattedDate: formattedDate, // For display
      };
    })
    // Sort trains by departure date first, then by time
    .sort((a, b) => {
      // Compare dates first
      if (a.departureDate !== b.departureDate) {
        return a.departureDate.localeCompare(b.departureDate);
      }
      // If same date, compare times
      return timeToMinutes(a.trainTime) - timeToMinutes(b.trainTime);
    });

  return (
    <div className="max-w-6xl mx-auto px-2 sm:px-4">
      {/* FULL SCREEN SCAN FEEDBACK */}
      {scanResult && (
        <div style={{ backgroundColor: scanResult.status === 'success' ? '#16a34a' : '#dc2626' }} className={`fixed inset-0 z-50 flex items-center justify-center animate-in fade-in zoom-in duration-200`}>
          <div className="text-center p-6">
            <div className="mb-4 flex justify-center">
              {scanResult.status === 'success' ? (
                <CheckCircle className="w-24 h-24 text-white animate-bounce" />
              ) : (
                <QrCode className="w-24 h-24 text-white animate-pulse" />
              )}
            </div>
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-2">
              {scanResult.status === 'success' ? 'УСПЕХ' : 'ОШИБКА'}
            </h2>
            <p className="text-xl md:text-2xl text-white opacity-90">
              {scanResult.message}
            </p>
          </div>
        </div>
      )}

      <div className="mb-4 sm:mb-6 flex flex-col md:flex-row md:items-center justify-between" style={{ marginBottom: '24px' }}>
        <div style={{ marginBottom: '12px' }}>
          <h1 className={`text-xl sm:text-2xl font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>{t('receiverDashboard')}</h1>
          <p className={`text-xs sm:text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            Станция: <span className="font-medium">{user?.station || 'Не указана'}</span>
          </p>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', padding: '4px', margin: '-4px' }}>
          <button
            onClick={() => setActiveTab('loading')}
            style={{ margin: '4px', minWidth: '80px', flex: '1 1 20%', padding: '12px 8px' }}
            className={`rounded-lg font-medium text-sm transition-colors ${activeTab === 'loading'
              ? 'bg-blue-600 text-white'
              : (isDark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-300')
              }`}
          >
            {t('loadingPlan')}
          </button>
          <button
            onClick={() => setActiveTab('arrival')}
            style={{ margin: '4px', minWidth: '80px', flex: '1 1 20%', padding: '12px 8px' }}
            className={`rounded-lg font-medium text-sm transition-colors ${activeTab === 'arrival'
              ? 'bg-blue-600 text-white'
              : (isDark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-300')
              }`}
          >
            {t('arrivalTab')}
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            style={{ margin: '4px', minWidth: '80px', flex: '1 1 20%', padding: '12px 8px' }}
            className={`rounded-lg font-medium text-sm transition-colors ${activeTab === 'audit'
              ? 'bg-blue-600 text-white'
              : (isDark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-300')
              }`}
          >
            {t('auditTab')}
          </button>
          <button
            onClick={fetchShipments}
            style={{ margin: '4px', padding: '12px 16px' }}
            className={`rounded-lg transition-colors border border-gray-300 ${isDark
              ? 'bg-gray-700 text-gray-200 hover:bg-gray-600'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {activeTab === 'loading' ? (
        // LOADING TAB CONTENT
        loading ? (
          <div className="text-center py-12">
            <RefreshCw className={`w-8 h-8 mx-auto animate-spin ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
            <p className={`mt-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{t('processing')}</p>
          </div>
        ) : tasks.length === 0 ? (
          <div className={`text-center py-12 rounded-lg border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <CheckCircle className={`w-12 h-12 mx-auto ${isDark ? 'text-green-500' : 'text-green-400'}`} />
            <p className={`mt-2 font-medium ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
              {t('noCargoToLoad')}
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            <div className={`p-4 rounded-lg border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 relative">
                  <Scan className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                  <input
                    ref={loadingInputRef}
                    autoFocus
                    type="text"
                    inputMode="none"
                    value={loadingScanInput}
                    onChange={(e) => setLoadingScanInput(e.target.value)}
                    placeholder={t('scanQrPlaceholder')}
                    className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base ${isDark
                      ? 'bg-gray-700 border-gray-600 text-gray-200 placeholder-gray-500'
                      : 'bg-white border-gray-300'}`}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleLoadingScan(e.currentTarget.value);
                        e.currentTarget.blur();
                      }
                    }}
                  />
                </div>
                <button
                  onClick={handleLoadingScan}
                  disabled={!loadingScanInput.trim() || processing}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2 whitespace-nowrap"
                >
                  {processing ? t('processing') : t('loadButton')}
                </button>
              </div>
            </div>

            {tasks.map((task) => {
              const loadedCount = task.shipments.filter(s => s.loaded).length;
              const totalCount = task.shipments.length;
              const isComplete = loadedCount === totalCount;

              return (
                <div key={task.id} className={`rounded-lg border overflow-hidden ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                  {/* Task Header */}
                  <div className="bg-green-600 p-4 text-white">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Train className="w-5 h-5" />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">Поезд {task.trainNumber}</span>
                            <span className="text-green-200">•</span>
                            <span className="text-sm">Вагон {task.carNumber}</span>
                          </div>
                          <div className="flex items-center gap-2 mt-1 text-xs text-green-100">
                            <MapPin className="w-3 h-3" />
                            {task.route}
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-xs text-green-100">Отправление</div>
                        <div className="text-lg font-bold">
                          {task.formattedDate && <span className="mr-2">{task.formattedDate}</span>}
                          {task.departureTime}
                        </div>
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

                            <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 items-center">
                              <div>
                                <div className={`text-[10px] uppercase tracking-wider ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>ID</div>
                                <div className={`font-bold text-sm ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>{shipment.shipment_number || shipment.id.substring(0, 8)}</div>
                              </div>
                              <div className="hidden sm:block">
                                <div className={`text-[10px] uppercase tracking-wider ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Клиент</div>
                                <div className={`font-medium text-sm truncate ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>{shipment.client_name || '—'}</div>
                              </div>
                              <div>
                                <div className={`text-[10px] uppercase tracking-wider ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Куда</div>
                                <div className={`font-medium text-sm ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>{shipment.to_station}</div>
                              </div>
                              <div className="hidden sm:block">
                                <div className={`text-[10px] uppercase tracking-wider ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Время</div>
                                <div className={`font-medium text-sm ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>{shipment.train_time}</div>
                              </div>
                            </div>
                          </div>
 
                          <button
                            onClick={() => toggleShipmentLoaded(shipment.id)}
                            className={`ml-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${shipment.loaded
                              ? (isDark
                                ? 'bg-gray-700 text-gray-300'
                                : 'bg-gray-200 text-gray-700')
                              : 'bg-blue-600 text-white'
                              }`}
                          >
                            {shipment.loaded ? 'Отмен' : 'Груз'}
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
      ) : activeTab === 'arrival' ? (
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
                ref={arrivalInputRef}
                autoFocus
                type="text"
                inputMode="none"
                value={scanInput}
                onChange={(e) => setScanInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleArrivalScan(e.currentTarget.value);
                    e.currentTarget.blur();
                  }
                }}
                placeholder="Сканируй штрих-код..."
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base ${isDark
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
      ) : (
        // AUDIT TAB CONTENT
        <div className={`rounded-lg border p-0 overflow-hidden ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <div className={`p-4 border-b ${isDark ? 'bg-gray-750 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
            <h2 className={`font-medium ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>Журнал аудита смены</h2>
          </div>
          {auditLogs.length === 0 ? (
            <div className="text-center py-12">
              <ClipboardList className={`w-12 h-12 mx-auto mb-3 ${isDark ? 'text-gray-600' : 'text-gray-400'}`} />
              <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>Журнал пуст. Начните сканирование или погрузку.</p>
            </div>
          ) : (
            <div className={`divide-y ${isDark ? 'divide-gray-700' : 'divide-gray-100'}`}>
              {auditLogs.map(log => (
                <div key={log.id} className={`p-4 flex items-center justify-between ${isDark ? 'hover:bg-gray-750' : 'hover:bg-gray-50'}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      log.action.includes('отмен') 
                        ? (isDark ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-500') 
                        : (isDark ? 'bg-green-900/40 text-green-400' : 'bg-green-100 text-green-600')
                    }`}>
                      {log.action.includes('отмен') ? <RefreshCw className="w-5 h-5" /> : <CheckCircle className="w-5 h-5" />}
                    </div>
                    <div>
                      <div className={`font-medium text-sm ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>{log.action}</div>
                      <div className={`text-xs mt-0.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Груз: {log.shipmentId}</div>
                    </div>
                  </div>
                  <div className={`text-sm flex items-center gap-1.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    <Clock className="w-3.5 h-3.5" />
                    {log.time}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}