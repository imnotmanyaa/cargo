import { useState, useEffect } from 'react';
import { Package, MapPin, Clock, Phone, AlertTriangle } from 'lucide-react';
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
  receiver_phone?: string;
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
  const [activeTab, setActiveTab] = useState<'door' | 'waiting' | 'active' | 'transit' | 'arrival'>('door');
  const [selectedShipment, setSelectedShipment] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'date_desc' | 'date_asc' | 'cost_desc' | 'cost_asc'>('date_desc');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const [issueModal, setIssueModal] = useState<{ isOpen: boolean; shipmentId: string | null; error: string | null }>({ isOpen: false, shipmentId: null, error: null });
  const [issuePin, setIssuePin] = useState('');
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

  const applySortAndFilter = (list: any[]) => {
    let result = list;
    if (filterStatus !== 'all') {
      result = result.filter(x => (x.shipment_status || x.status) === filterStatus);
    }
    result = [...result].sort((a, b) => {
      if (sortBy === 'date_desc') return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
      if (sortBy === 'date_asc') return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
      if (sortBy === 'cost_desc') return (b.cost || 0) - (a.cost || 0);
      if (sortBy === 'cost_asc') return (a.cost || 0) - (b.cost || 0);
      return 0;
    });
    return result;
  };

  const translateLifecycleStatus = (status: string) => {
    switch (status) {
      case 'CREATED': case 'CREATED_DOOR': return t('statusRegistered');
      case 'PAYMENT_PENDING': return t('statusPaymentPending');
      case 'PAID': return t('statusPaid');
      case 'PICKUP_ASSIGNED': return t('statusPickupAssigned');
      case 'PICKED_UP': return t('statusPickedUp');
      case 'AT_STATION_INTAKE': return t('statusAtStation');
      case 'READY_FOR_LOADING': return t('readyForLoading');
      case 'LOADED': return t('statusInWagon');
      case 'IN_TRANSIT': return t('statusInTransit');
      case 'ARRIVED': return t('statusArrived');
      case 'READY_FOR_ISSUE': return t('statusReadyForIssue');
      case 'ISSUED': return t('statusIssued');
      default: return status;
    }
  };

  // 1. «До двери»
  const doorShipments = applySortAndFilter(s.filter(x => 
    x.is_door_to_door && 
    x.from_station === myStation &&
    ['CREATED', 'PAYMENT_PENDING', 'PAID', 'CREATED_DOOR', 'PICKUP_ASSIGNED', 'PICKED_UP'].includes(x.shipment_status || x.status) &&
    matchSearch(x)
  ));

  // 2. «Ожидают привоза»
  const waitingShipments = applySortAndFilter(s.filter(x => 
    !x.is_door_to_door && 
    x.from_station === myStation &&
    ['CREATED', 'PAYMENT_PENDING', 'PAID', 'CREATED_DOOR'].includes(x.shipment_status || x.status) &&
    matchSearch(x)
  ));

  // 3. «Активные»
  const activeShipmentsList = applySortAndFilter(s.filter(x => 
    x.from_station === myStation &&
    ['AT_STATION_INTAKE', 'READY_FOR_LOADING', 'LOADED', 'IN_TRANSIT'].includes(x.shipment_status || x.status) &&
    matchSearch(x)
  ));

  const arrivalShipments = applySortAndFilter(s.filter(x => 
    x.to_station === myStation &&
    ['ARRIVED', 'READY_FOR_ISSUE'].includes(x.shipment_status || x.status) &&
    matchSearch(x)
  ));

  const transitShipments = applySortAndFilter(s.filter(x =>
    x.to_station === myStation &&
    ['LOADED', 'IN_TRANSIT'].includes(x.shipment_status || x.status) &&
    matchSearch(x)
  ));

  const formatDate = (d: string) => {
    const dt = new Date(d);
    return Number.isNaN(dt.getTime()) ? '-' : dt.toLocaleString(t('locale') || 'ru-RU', { 
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
    weight: shipment.weight + ' ' + (t('kg') || 'кг'),
    status: translateLifecycleStatus(shipment.shipment_status || shipment.status),
  });

  const handleIssueClick = (shipmentId: string) => {
    setIssueModal({ isOpen: true, shipmentId, error: null });
    setIssuePin('');
  };

  const handleNotifyArrival = async (shipmentId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(withApiBase(`/api/shipments/${shipmentId}/notify-arrival`), {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok) {
        alert('✅ ' + (body.message || 'Уведомление отправлено'));
      } else {
        alert('❌ ' + (body.error || 'Ошибка отправки'));
      }
    } catch {
      alert('Ошибка сети');
    }
  };

  const handleClearPayment = async (shipmentId: string) => {
    if (!window.confirm(t('confirmSurchargePayment') || 'Подтвердить получение доплаты?')) return;
    setProcessing(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(withApiBase(`/api/shipments/${shipmentId}/clear-payment`), {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        fetchShipments();
      } else {
        const err = await res.json();
        alert(err.error || 'Error clearing payment');
      }
    } catch (err) {
      alert(t('errorNetwork'));
    } finally {
      setProcessing(false);
    }
  };

  const handleIssueSubmit = async () => {
    const { shipmentId } = issueModal;
    if (!shipmentId) return;
    if (!issuePin.trim() || issuePin.trim().length !== 4) {
      setIssueModal(prev => ({ ...prev, error: 'Укажите 4-значный PIN-код' }));
      return;
    }
    setProcessing(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(withApiBase(`/api/shipments/${shipmentId}/issue`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ code: issuePin.trim() })
      });
      if (res.ok) {
        setIssueModal({ isOpen: false, shipmentId: null, error: null });
        fetchShipments();
      } else {
        const err = await res.json();
        if (res.status === 402) {
          setIssueModal(prev => ({ ...prev, error: (t('errorSurchargeNeeded') || 'Сначала необходимо получить доплату') + ` ${err.error?.match(/\d+/)?.[0] || ''} тг` }));
        } else {
          setIssueModal(prev => ({ ...prev, error: err.error || 'Ошибка выдачи' }));
        }
      }
    } catch {
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
          <h1 className="text-2xl font-bold mb-2">{t('managerDashboard')}</h1>
          <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>{t('manageShipmentsAtStation')} {myStation}</p>
          <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            {t('totalShipmentsCount').replace('{{count}}', String(
              activeTab === 'door' ? doorShipments.length :
              activeTab === 'waiting' ? waitingShipments.length :
              activeTab === 'active' ? activeShipmentsList.length :
              activeTab === 'arrival' ? arrivalShipments.length :
              activeTab === 'transit' ? transitShipments.length : 0
            ))}
          </span>
        </div>
        <input
          type="text"
          placeholder={t('searchManagerPlaceholder') || "Поиск: номер, клиент, маршрут..."}
          value={search}
          onChange={e => setSearch(e.target.value)}
          className={`px-3 py-2 text-sm border rounded-lg w-full sm:w-72 focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDark ? 'bg-gray-700 border-gray-600 text-gray-200 placeholder-gray-400' : 'border-gray-300 bg-white'}`}
        />
      </div>

      <div className={`mb-4 flex flex-wrap gap-3 items-center`}>
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value as any)}
          className={`px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDark ? 'bg-gray-700 border-gray-600 text-gray-200' : 'border-gray-300 bg-white'}`}
        >
          <option value="date_desc">{t('newestFirst')}</option>
          <option value="date_asc">{t('oldestFirst')}</option>
          <option value="cost_desc">{t('expensiveFirst')}</option>
          <option value="cost_asc">{t('cheapestFirst')}</option>
        </select>

        <select
          value={filterStatus}
          onChange={e => { setFilterStatus(e.target.value); }}
          className={`px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDark ? 'bg-gray-700 border-gray-600 text-gray-200' : 'border-gray-300 bg-white'}`}
        >
          <option value="all">{t('allStatuses')}</option>
          <option value="CREATED_DOOR">{t('statusRegisteredDoor')}</option>
          <option value="CREATED">{t('statusRegistered')}</option>
          <option value="PAYMENT_PENDING">{t('statusPaymentPending')}</option>
          <option value="PAID">{t('statusPaid')}</option>
          <option value="PICKUP_ASSIGNED">{t('statusCourierAssigned')}</option>
          <option value="PICKED_UP">{t('statusCourierPickedUp')}</option>
          <option value="READY_FOR_LOADING">{t('statusAtStation')}</option>
          <option value="LOADED">{t('statusInWagon')}</option>
          <option value="IN_TRANSIT">{t('statusInTransit')}</option>
          <option value="ARRIVED">{t('statusArrived')}</option>
          <option value="READY_FOR_ISSUE">{t('statusReadyForIssue')}</option>
          <option value="ISSUED">{t('statusIssued')}</option>
        </select>

        {(search || filterStatus !== 'all') && (
          <button
            onClick={() => { setSearch(''); setFilterStatus('all'); }}
            className="px-3 py-2 text-sm text-red-500 hover:text-red-700 border border-red-200 rounded-lg hover:bg-red-50"
          >
            {t('resetFilters')}
          </button>
        )}
      </div>

      <div className={`mb-6 flex overflow-x-auto border-b ${isDark ? 'border-gray-800' : 'border-gray-200'}`}>
        {renderTabButton('door', t('tabDoorToDoor'), doorShipments.length)}
        {renderTabButton('waiting', t('tabWaitingPickup'), waitingShipments.length)}
        {renderTabButton('active', t('tabActive'), activeShipmentsList.length)}
        {renderTabButton('arrival', t('tabArrival'), arrivalShipments.length)}
        {renderTabButton('transit', t('tabTransit'), transitShipments.length)}
      </div>



      <div className="space-y-4">
        {loading && shipments.length === 0 ? (
          <div className="p-8 text-center text-gray-500">{t('loading')}</div>
        ) : (
          <>
            {activeTab === 'door' && (
              doorShipments.length === 0 ? <p className="text-gray-500 p-4">{t('noTasks')}</p> : doorShipments.map(s => (
                <div key={s.id} onClick={() => setSelectedShipment(mapForDetails(s))} className={`cursor-pointer p-5 rounded-xl border ${isDark ? 'bg-gray-800 border-gray-700 hover:bg-gray-750' : 'bg-white border-gray-200 hover:bg-gray-50'}`}>
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-bold text-blue-600">{s.shipment_number}</span>
                    <span className="text-xs font-semibold px-2 py-1 rounded bg-orange-100 text-orange-800">
                      {(() => {
                        const st = s.shipment_status || s.status || '';
                        if (st === 'PICKUP_ASSIGNED') return t('statusCourierDriving');
                        if (st === 'PICKED_UP') return t('statusCargoPickedUp');
                        if (st === 'PAYMENT_PENDING') return t('statusPaymentPending');
                        if (st === 'PAID') return t('statusPaid');
                        return t('statusWaitingCourier');
                      })()}
                    </span>
                  </div>
                  <div className="text-sm font-medium mb-1">{s.client_name}</div>
                  <div className="text-xs text-gray-500 mb-2">{s.pickup_address || t('addressNotSpecified')}</div>
                  <div className="text-xs text-gray-400 mt-2 flex items-center gap-1"><Clock className="w-3 h-3"/> {formatDate(s.created_at)}</div>
                </div>
              ))
            )}

            {activeTab === 'waiting' && (
              waitingShipments.length === 0 ? <p className="text-gray-500 p-4">{t('noWaiting')}</p> : waitingShipments.map(s => (
                <div key={s.id} onClick={() => setSelectedShipment(mapForDetails(s))} className={`cursor-pointer p-5 rounded-xl border ${isDark ? 'bg-gray-800 border-gray-700 hover:bg-gray-750' : 'bg-white border-gray-200 hover:bg-gray-50'}`}>
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-bold text-blue-600">{s.shipment_number}</span>
                    <span className="text-xs font-semibold px-2 py-1 rounded bg-yellow-100 text-yellow-800">{t('legalWaitingPickup')}</span>
                  </div>
                  <div className="text-sm font-medium mb-1">{s.client_name}</div>
                  <div className="text-xs text-gray-500 mb-2">{s.quantity_places} {t('pcs')} • {s.weight} {t('kg')}</div>
                  <div className="text-xs text-gray-400 mt-2 flex items-center gap-1"><Clock className="w-3 h-3"/> {formatDate(s.created_at)}</div>
                </div>
              ))
            )}

            {activeTab === 'active' && (
              activeShipmentsList.length === 0 ? <p className="text-gray-500 p-4">{t('noActive')}</p> : activeShipmentsList.map(s => (
                <div key={s.id} onClick={() => setSelectedShipment(mapForDetails(s))} className={`cursor-pointer p-5 rounded-xl border ${isDark ? 'bg-gray-800 border-gray-700 hover:bg-gray-750' : 'bg-white border-gray-200 hover:bg-gray-50'}`}>
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-blue-600">{s.shipment_number}</span>
                      {s.is_door_to_door && <span className="text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">Door-to-Door</span>}
                    </div>
                    <span className="text-xs font-semibold px-2 py-1 rounded bg-purple-100 text-purple-800">
                      {s.shipment_status === 'AT_STATION_INTAKE' ? t('statusAtStation') : s.shipment_status === 'READY_FOR_LOADING' ? t('readyForLoading') : s.shipment_status === 'LOADED' ? t('statusInWagon') : t('statusInTransit')}
                    </span>
                  </div>
                  <div className="text-sm font-medium mb-1">{s.client_name}</div>
                  <div className="text-xs text-gray-500 mb-2">{s.from_station} → {s.to_station}</div>
                </div>
              ))
            )}

            {activeTab === 'arrival' && (
              arrivalShipments.length === 0 ? <p className="text-gray-500 p-4">{t('noArrivals')}</p> : arrivalShipments.map(s => (
                <div key={s.id} onClick={() => setSelectedShipment(mapForDetails(s))} className={`cursor-pointer p-5 rounded-xl border ${isDark ? 'bg-gray-800 border-gray-700 hover:bg-gray-750' : 'bg-white border-gray-200 hover:bg-gray-50'}`}>
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-green-600">{s.shipment_number}</span>
                        {s.is_door_to_door && <span className="text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded uppercase font-bold">Door-to-Door</span>}
                        {s.payment_required && <span className="text-[10px] bg-red-100 text-red-800 px-1.5 py-0.5 rounded font-bold uppercase flex items-center gap-1"><AlertTriangle className="w-3 h-3"/> {t('surchargeRequired')}</span>}
                      </div>
                      <span className="text-sm font-medium">{s.client_name}</span>
                    </div>
                    <span className={`text-xs font-semibold px-2 py-1 rounded ${s.shipment_status === 'READY_FOR_ISSUE' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
                      {s.shipment_status === 'READY_FOR_ISSUE' ? t('statusReadyForIssue') : t('statusArrived')}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mb-3">{s.from_station} → {s.to_station} ({s.quantity_places} {t('pcs')}, {s.weight} {t('kg')})</div>
                  
                  {/* Status for D2D arrival — show courier progress */}
                  {s.is_door_to_door && (() => {
                    const st = s.shipment_status;
                    if (st === 'ARRIVED') return (
                      <div className={`text-xs mb-2 px-2 py-1 rounded-lg ${isDark ? 'bg-yellow-900/40 text-yellow-300' : 'bg-yellow-50 text-yellow-700'}`}>
                        ⏳ Ожидает назначения курьера для доставки
                      </div>
                    );
                    if (st === 'READY_FOR_ISSUE') return (
                      <div className={`text-xs mb-2 px-2 py-1 rounded-lg ${isDark ? 'bg-blue-900/40 text-blue-300' : 'bg-blue-50 text-blue-700'}`}>
                        🚴 Курьер едет к получателю
                      </div>
                    );
                    return null;
                  })()}

                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={(e) => handleNotifyArrival(s.id, e)}
                      className="flex items-center justify-center gap-1 py-2 px-3 rounded-lg text-sm font-medium bg-green-600 hover:bg-green-700 text-white transition-colors"
                    >
                      📱 {t('notifyArrival') || 'Уведомить'}
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); window.location.href = `tel:${s.door_to_door_phone || s.receiver_phone || ''}`; }}
                      className={`flex items-center justify-center gap-1 py-2 px-3 rounded-lg text-sm font-medium border ${isDark ? 'border-gray-600 text-gray-300 hover:bg-gray-750' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                    >
                      <Phone className="w-4 h-4" /> {t('call')}
                    </button>
                    {!s.is_door_to_door && (
                      s.payment_required ? (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleClearPayment(s.id); }}
                          className="flex-1 py-2 rounded-lg text-sm font-medium bg-orange-600 hover:bg-orange-700 text-white transition-colors"
                        >
                          {t('paySurcharge') || 'Оплатить доплату'}
                        </button>
                      ) : (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleIssueClick(s.id); }}
                          className="flex-1 py-2 rounded-lg text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                        >
                          {t('issue') || 'Выдать'}
                        </button>
                      )
                    )}
                  </div>
                </div>
              ))
            )}

            {activeTab === 'transit' && (
              transitShipments.length === 0 ? <p className="text-gray-500 p-4">{t('nothingFound')}</p> : transitShipments.map(s => (
                <div key={s.id} onClick={() => setSelectedShipment(mapForDetails(s))} className={`cursor-pointer p-5 rounded-xl border ${isDark ? 'bg-gray-800 border-gray-700 hover:bg-gray-750' : 'bg-white border-gray-200 hover:bg-gray-50'}`}>
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-blue-600">{s.shipment_number}</span>
                        {s.is_door_to_door && <span className="text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded uppercase font-bold">Door-to-Door</span>}
                      </div>
                      <span className="text-sm font-medium">{s.client_name}</span>
                    </div>
                    <span className="text-xs font-semibold px-2 py-1 rounded bg-orange-100 text-orange-800">
                      {s.shipment_status === 'LOADED' ? t('statusInWagon') : t('statusInTransit')}
                    </span>
                  </div>
                  <div className={`text-sm flex flex-wrap gap-x-4 gap-y-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {s.from_station} → {s.to_station}</span>
                    <span className="flex items-center gap-1"><Package className="w-3 h-3" /> {s.weight} {t('kg')}</span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {formatDate(s.created_at)}</span>
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
              <h3 className="text-lg font-bold">{t('issueCargo')}</h3>
            </div>
            <div className="p-6 space-y-4">
              {issueModal.error && (
                <div className="p-3 bg-red-100 text-red-700 rounded-lg text-sm">
                  {issueModal.error}
                </div>
              )}
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                Укажите 4-значный PIN-код, который был отправлен получателю.
              </p>
              <div>
                <label className="block text-sm font-medium mb-1">PIN-код</label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={4}
                  value={issuePin}
                  onChange={e => setIssuePin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  onKeyDown={e => { if (e.key === 'Enter' && issuePin.length === 4) handleIssueSubmit(); }}
                  autoFocus
                  className={`w-full px-4 py-3 border rounded-lg text-center text-2xl font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                  placeholder="_ _ _ _"
                />
              </div>
            </div>
            <div className={`px-6 py-4 border-t flex justify-end gap-3 ${isDark ? 'border-gray-700 bg-gray-900' : 'border-gray-200 bg-gray-50'}`}>
              <button
                onClick={() => setIssueModal({ isOpen: false, shipmentId: null, error: null })}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${isDark ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-200'}`}
              >
                {t('cancel')}
              </button>
              <button
                onClick={handleIssueSubmit}
                disabled={processing}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {processing ? t('processing') : t('issue')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
