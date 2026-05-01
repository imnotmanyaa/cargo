import { useState, useEffect } from 'react';
import { Package, Truck, MapPin, Clock, Home, Phone, CheckCircle, AlertTriangle } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { withApiBase } from '../lib/api-base';
import { ActiveShipmentDetails } from './ActiveShipmentDetails';

interface Shipment {
  id: string;
  shipment_number: string;
  client_name: string;
  pickup_address?: string;
  delivery_address?: string;
  door_to_door_phone?: string;
  shipment_status: string;
  status: string;
  created_at: string;
  weight: string;
  quantity_places: number;
  is_door_to_door: boolean;
  from_station: string;
  to_station: string;
  payment_required?: boolean;
  extra_charge?: number;
}

export function ManagerDashboard({ theme = 'light' }: { theme?: 'light' | 'dark' }) {
  const isDark = theme === 'dark';
  const { t } = useLanguage();
  const { user } = useAuth();
  
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'door' | 'waiting' | 'active' | 'arrival'>('door');
  const [selectedShipment, setSelectedShipment] = useState<any>(null);
  const [search, setSearch] = useState('');

  // Modal Issue
  const [issueModal, setIssueModal] = useState<{ isOpen: boolean; shipmentId: string | null; error: string | null }>({ isOpen: false, shipmentId: null, error: null });
  const [receiverName, setReceiverName] = useState('');
  const [receiverPhone, setReceiverPhone] = useState('');
  const [processing, setProcessing] = useState(false);

  const fetchShipments = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const url = user?.station 
        ? `/api/shipments?type=by-station&station=${encodeURIComponent(user.station)}`
        : '/api/shipments';
      
      const res = await fetch(withApiBase(url), {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setShipments(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShipments();
    const interval = setInterval(fetchShipments, 10000);
    return () => clearInterval(interval);
  }, [user?.station]);

  const s = shipments;
  const myStation = user?.station || '';

  const matchSearch = (x: any) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (x.shipment_number || '').toLowerCase().includes(q) ||
      (x.client_name || '').toLowerCase().includes(q) ||
      (x.from_station || '').toLowerCase().includes(q) ||
      (x.to_station || '').toLowerCase().includes(q)
    );
  };

  // 1. «До двери»
  const doorShipments = s.filter(x => 
    x.is_door_to_door && 
    x.from_station === myStation &&
    ['CREATED', 'PAYMENT_PENDING', 'PAID', 'CREATED_DOOR', 'PICKUP_ASSIGNED', 'PICKED_UP'].includes(x.shipment_status || x.status) &&
    matchSearch(x)
  );

  // 2. «Ожидают привоза»
  const waitingShipments = s.filter(x => 
    !x.is_door_to_door && 
    x.from_station === myStation &&
    ['CREATED', 'PAYMENT_PENDING', 'PAID', 'CREATED_DOOR'].includes(x.shipment_status || x.status) &&
    matchSearch(x)
  );

  // 3. «Активные»
  const activeShipmentsList = s.filter(x => 
    x.from_station === myStation &&
    ['READY_FOR_LOADING', 'LOADED', 'IN_TRANSIT'].includes(x.shipment_status || x.status) &&
    matchSearch(x)
  );

  // 4. «Прибытие»
  const arrivalShipments = s.filter(x => 
    x.to_station === myStation &&
    (x.shipment_status || x.status) === 'ARRIVED' &&
    matchSearch(x)
  );

  const formatDate = (d: string) => {
    const dt = new Date(d);
    return Number.isNaN(dt.getTime()) ? '-' : dt.toLocaleString('ru-RU', { 
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' 
    });
  };

  const mapForDetails = (shipment: Shipment) => ({
    ...shipment,
    id: shipment.id,
    client: shipment.client_name,
    from: shipment.from_station,
    to: shipment.to_station,
    date: formatDate(shipment.created_at),
    weight: shipment.weight + ' кг',
  });

  const handleIssueSubmit = async () => {
    const { shipmentId } = issueModal;
    if (!shipmentId) return;
    if (!receiverName.trim() || !receiverPhone.trim()) {
      setIssueModal(prev => ({ ...prev, error: "Укажите имя и телефон" }));
      return;
    }
    setProcessing(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(withApiBase(`/api/shipments/${shipmentId}/issue`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ receiver_name: receiverName.trim(), receiver_phone: receiverPhone.trim() })
      });
      if (res.ok) {
        setIssueModal({ isOpen: false, shipmentId: null, error: null });
        fetchShipments();
      } else {
        const err = await res.json();
        if (res.status === 402) {
          setIssueModal(prev => ({ ...prev, error: `Сначала необходимо получить доплату ${err.error?.match(/\d+/)?.[0] || ""} тг` }));
        } else if (res.status === 403) {
          setIssueModal(prev => ({ ...prev, error: "Данные получателя не совпадают. Укажите правильное имя и телефон." }));
        } else {
          setIssueModal(prev => ({ ...prev, error: err.error || 'Ошибка выдачи' }));
        }
      }
    } catch (err) {
      setIssueModal(prev => ({ ...prev, error: 'Ошибка сети' }));
    } finally {
      setProcessing(false);
    }
  };

  if (selectedShipment) {
    return <ActiveShipmentDetails shipment={selectedShipment} onClose={() => setSelectedShipment(null)} theme={theme} />;
  }

  const renderTabButton = (id: typeof activeTab, label: string, count: number) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`relative px-4 py-3 text-sm font-medium transition-colors ${
        activeTab === id 
          ? `text-blue-600 border-b-2 border-blue-600 ${isDark ? 'dark:text-blue-400 dark:border-blue-400' : ''}` 
          : `${isDark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'}`
      }`}
    >
      <div className="flex items-center gap-2">
        {label}
        {count > 0 && (
          <span className={`px-2 py-0.5 rounded-full text-xs ${
            activeTab === id 
              ? 'bg-blue-100 text-blue-700' 
              : isDark ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-600'
          }`}>
            {count}
          </span>
        )}
      </div>
    </button>
  );

  return (
    <div className={`min-h-screen ${isDark ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1">
          <h1 className="text-2xl font-bold mb-2">Дашборд менеджера</h1>
          <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>Управление посылками на станции {myStation}</p>
        </div>
        <input
          type="text"
          placeholder="Поиск: номер, клиент, маршрут..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className={`px-3 py-2 text-sm border rounded-lg w-full sm:w-72 focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDark ? 'bg-gray-700 border-gray-600 text-gray-200 placeholder-gray-400' : 'border-gray-300 bg-white'}`}
        />
      </div>

      <div className={`mb-6 flex overflow-x-auto border-b ${isDark ? 'border-gray-800' : 'border-gray-200'}`}>
        {renderTabButton('door', 'До двери', doorShipments.length)}
        {renderTabButton('waiting', 'Ожидают привоза', waitingShipments.length)}
        {renderTabButton('active', 'Активные', activeShipmentsList.length)}
        {renderTabButton('arrival', 'Прибытие', arrivalShipments.length)}
      </div>

      <div className="space-y-4">
        {loading && shipments.length === 0 ? (
          <div className="p-8 text-center text-gray-500">Загрузка...</div>
        ) : (
          <>
            {activeTab === 'door' && (
              doorShipments.length === 0 ? <p className="text-gray-500 p-4">Нет задач</p> : doorShipments.map(s => (
                <div key={s.id} onClick={() => setSelectedShipment(mapForDetails(s))} className={`cursor-pointer p-5 rounded-xl border ${isDark ? 'bg-gray-800 border-gray-700 hover:bg-gray-750' : 'bg-white border-gray-200 hover:bg-gray-50'}`}>
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-bold text-blue-600">{s.shipment_number}</span>
                    <span className="text-xs font-semibold px-2 py-1 rounded bg-orange-100 text-orange-800">
                      {s.shipment_status === 'CREATED_DOOR' ? 'Ожидает курьера' : s.shipment_status === 'PICKUP_ASSIGNED' ? 'Курьер назначен' : 'У курьера'}
                    </span>
                  </div>
                  <div className="text-sm font-medium mb-1">{s.client_name}</div>
                  <div className="text-xs text-gray-500 mb-2">{s.pickup_address || 'Адрес не указан'}</div>
                  <div className="text-xs text-gray-400 mt-2 flex items-center gap-1"><Clock className="w-3 h-3"/> {formatDate(s.created_at)}</div>
                </div>
              ))
            )}

            {activeTab === 'waiting' && (
              waitingShipments.length === 0 ? <p className="text-gray-500 p-4">Нет ожидающих</p> : waitingShipments.map(s => (
                <div key={s.id} onClick={() => setSelectedShipment(mapForDetails(s))} className={`cursor-pointer p-5 rounded-xl border ${isDark ? 'bg-gray-800 border-gray-700 hover:bg-gray-750' : 'bg-white border-gray-200 hover:bg-gray-50'}`}>
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-bold text-blue-600">{s.shipment_number}</span>
                    <span className="text-xs font-semibold px-2 py-1 rounded bg-yellow-100 text-yellow-800">Юрлицо: ожидаем привоз</span>
                  </div>
                  <div className="text-sm font-medium mb-1">{s.client_name}</div>
                  <div className="text-xs text-gray-500 mb-2">{s.quantity_places} мест • {s.weight} кг</div>
                  <div className="text-xs text-gray-400 mt-2 flex items-center gap-1"><Clock className="w-3 h-3"/> {formatDate(s.created_at)}</div>
                </div>
              ))
            )}

            {activeTab === 'active' && (
              activeShipmentsList.length === 0 ? <p className="text-gray-500 p-4">Нет активных</p> : activeShipmentsList.map(s => (
                <div key={s.id} onClick={() => setSelectedShipment(mapForDetails(s))} className={`cursor-pointer p-5 rounded-xl border ${isDark ? 'bg-gray-800 border-gray-700 hover:bg-gray-750' : 'bg-white border-gray-200 hover:bg-gray-50'}`}>
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-blue-600">{s.shipment_number}</span>
                      {s.is_door_to_door && <span className="text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">Door-to-Door</span>}
                    </div>
                    <span className="text-xs font-semibold px-2 py-1 rounded bg-purple-100 text-purple-800">
                      {s.shipment_status === 'READY_FOR_LOADING' ? 'Готов к погрузке' : s.shipment_status === 'LOADED' ? 'Погружен' : 'В пути'}
                    </span>
                  </div>
                  <div className="text-sm font-medium mb-1">{s.client_name}</div>
                  <div className="text-xs text-gray-500 mb-2">{s.from_station} → {s.to_station}</div>
                </div>
              ))
            )}

            {activeTab === 'arrival' && (
              arrivalShipments.length === 0 ? <p className="text-gray-500 p-4">Нет прибывших</p> : arrivalShipments.map(s => (
                <div key={s.id} className={`p-5 rounded-xl border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-green-600">{s.shipment_number}</span>
                        {s.is_door_to_door && <span className="text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded uppercase font-bold">Door-to-Door</span>}
                        {s.payment_required && <span className="text-[10px] bg-red-100 text-red-800 px-1.5 py-0.5 rounded font-bold uppercase flex items-center gap-1"><AlertTriangle className="w-3 h-3"/> Доплата требуется</span>}
                      </div>
                      <span className="text-sm font-medium">{s.client_name}</span>
                    </div>
                    <span className="text-xs font-semibold px-2 py-1 rounded bg-green-100 text-green-800">Прибыл</span>
                  </div>
                  <div className="text-xs text-gray-500 mb-3">{s.from_station} → {s.to_station} ({s.quantity_places} мест, {s.weight} кг)</div>
                  
                  <div className="flex gap-2 mt-4">
                    <a
                      href={`tel:${s.door_to_door_phone || s.receiver_phone || ''}`}
                      className={`flex items-center justify-center gap-1 flex-1 py-2 rounded-lg text-sm font-medium border ${isDark ? 'border-gray-600 text-gray-300 hover:bg-gray-750' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                    >
                      <Phone className="w-4 h-4" /> Позвонить
                    </a>
                    <button
                      onClick={() => {
                        setIssueModal({ isOpen: true, shipmentId: s.id, error: null });
                        setReceiverName(''); setReceiverPhone('');
                      }}
                      className="flex-1 py-2 rounded-lg text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                    >
                      Выдать
                    </button>
                  </div>
                </div>
              ))
            )}
          </>
        )}
      </div>

      {issueModal.isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className={`rounded-xl shadow-lg w-full max-w-md overflow-hidden ${isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white'}`}>
            <div className={`px-6 py-4 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
              <h3 className="text-lg font-bold">Выдача груза</h3>
            </div>
            <div className="p-6 space-y-4">
              {issueModal.error && (
                <div className="p-3 bg-red-100 text-red-700 rounded-lg text-sm">
                  {issueModal.error}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium mb-1">Имя получателя</label>
                <input
                  type="text"
                  value={receiverName}
                  onChange={e => setReceiverName(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                  placeholder="ФИО по документу"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Телефон получателя</label>
                <input
                  type="text"
                  value={receiverPhone}
                  onChange={e => setReceiverPhone(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                  placeholder="+7 (___) ___-__-__"
                />
              </div>
            </div>
            <div className={`px-6 py-4 border-t flex justify-end gap-3 ${isDark ? 'border-gray-700 bg-gray-900' : 'border-gray-200 bg-gray-50'}`}>
              <button
                onClick={() => setIssueModal({ isOpen: false, shipmentId: null, error: null })}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${isDark ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-200'}`}
              >
                Отмена
              </button>
              <button
                onClick={handleIssueSubmit}
                disabled={processing}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {processing ? 'Обработка...' : 'Выдать'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
