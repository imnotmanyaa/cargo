import { useState, useEffect } from 'react';
import { withApiBase } from '../lib/api-base';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { QRCodeSVG } from 'qrcode.react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';

import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Package, MapPin, Phone, User, Weight, Navigation, Home, Building2, ArrowRight, Sun, Moon, LogOut } from 'lucide-react';
import { toast } from 'sonner';

interface DeliveryTask {
  id: string;
  type: 'pickup' | 'delivery';
  status: 'pending' | 'in_progress' | 'picked_up' | 'completed' | 'cancelled' | 'delivery_assigned' | 'out_for_delivery';
  parcelCode: string;
  clientName: string;
  clientPhone: string;
  address: string;
  fullAddress: string;
  weight: number;
  numberOfPieces: number;
  contents: string;
  destination?: string;
  scheduledTime: string;
  notes?: string;
  declaredValue?: number;
  rawStatus: string;
  operatorId?: string;
  receiverName?: string;
  receiverPhone?: string;
}

export function CourierDashboard() {
  const { t } = useLanguage();
  const { user, logout } = useAuth();
  
  const [selectedTask, setSelectedTask] = useState<DeliveryTask | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [activeTab, setActiveTab] = useState<'pending' | 'my_tasks'>('pending');
  const [showPinModal, setShowPinModal] = useState<{type: 'pickup'|'delivery', task: DeliveryTask} | null>(null);
  const [pinCode, setPinCode] = useState('');
  const [successShipment, setSuccessShipment] = useState<DeliveryTask | null>(null);

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('theme') as 'light' | 'dark') || 'light';
  });

  useEffect(() => {
    localStorage.setItem('theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const [tasks, setTasks] = useState<DeliveryTask[]>([]);

  const getStatusTranslation = (status: string) => {
    const dict: Record<string, string> = {
      'CREATED_DOOR': 'Оформлено',
      'CREATED': 'Оформлено',
      'PAYMENT_PENDING': 'Ожидает оплаты',
      'PAID': 'Оплачено',
      'PICKUP_ASSIGNED': 'Назначен забор',
      'PICKED_UP': 'Забрано курьером',
      'AT_STATION_INTAKE': 'Сдано на склад — Завершено',
      'READY_FOR_LOADING': 'На складе',
      'READY_FOR_ISSUE': 'Готово к выдаче',
      'DELIVERY_ASSIGNED': 'Ожидает забора из отделения',
      'OUT_FOR_DELIVERY': 'Доставляется',
      'ISSUED': 'Выдано',
      'LOADED': 'В вагоне',
      'IN_TRANSIT': 'В пути',
      'ARRIVED': 'Прибыло',
      'CANCELLED': 'Отменено',
    };
    return dict[status] || status;
  };

  const loadTasks = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      
      const resp = await fetch(withApiBase('/api/courier/tasks'), {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!resp.ok) return;
      const data = await resp.json();
      
      const mapped = (data || []).map((sh: any) => {
        let type: 'pickup' | 'delivery' = 'pickup';
        let status: 'pending' | 'in_progress' | 'picked_up' | 'completed' | 'cancelled' | 'delivery_assigned' = 'pending';
        
        // Determine type based on station matching
        const shToStation = (sh.to_station || '').trim().toLowerCase();
        const userStation = (user?.station || '').trim().toLowerCase();

        if (shToStation === userStation) {
          type = 'delivery';
        } else {
          type = 'pickup';
        }
        
        const rawSt: string = sh.shipment_status || '';
        const myId = user?.id || '';
        const opId: string = sh.operator_id || '';

        // Determine logical status primarily from shipment_status
        if (type === 'pickup') {
          if (rawSt === 'PICKUP_ASSIGNED') {
            if (opId && opId !== myId) {
              status = 'cancelled'; // taken by another courier
            } else {
              status = 'in_progress'; // I'm assigned — show "Забрал у клиента"
            }
          } else if (rawSt === 'PICKED_UP') {
            status = opId === myId || !opId ? 'picked_up' : 'cancelled';
          } else if (rawSt === 'READY_FOR_LOADING' || rawSt === 'AT_STATION_INTAKE') {
            status = 'completed';
          } else {
            // CREATED_DOOR, PAYMENT_PENDING, PAID, CREATED — available to take
            // Only hide if explicitly taken by ANOTHER courier
            status = opId && opId !== myId ? 'cancelled' : 'pending';
          }
        } else {
          // delivery type — полный цикл door-to-door
          if (rawSt === 'READY_FOR_ISSUE') {
            // Задача доступна для взятия (или уже взята мной)
            status = opId && opId !== myId ? 'cancelled' : 'pending';
          } else if (rawSt === 'DELIVERY_ASSIGNED') {
            // Курьер взял задачу, должен забрать из отделения
            status = opId === myId || !opId ? 'delivery_assigned' : 'cancelled';
          } else if (rawSt === 'OUT_FOR_DELIVERY') {
            // Курьер забрал из отделения, везёт клиенту
            status = opId === myId || !opId ? 'in_progress' : 'cancelled';
          } else if (rawSt === 'ISSUED') {
            status = 'completed';
          } else {
            status = opId && opId !== myId ? 'cancelled' : 'pending';
          }
        }

        return {
          id: sh.id,
          type,
          status,
          operatorId: sh.operator_id,
          parcelCode: sh.shipment_number,
          clientName: type === 'pickup' ? sh.client_name : (sh.receiver_name || sh.client_name),
          clientPhone: type === 'pickup' 
            ? (sh.door_to_door_phone || sh.sender_phone || '') 
            : (sh.receiver_phone || sh.door_to_door_phone || ''),
          address: type === 'pickup' ? sh.pickup_address : sh.delivery_address,
          fullAddress: type === 'pickup' ? sh.pickup_address : sh.delivery_address,
          weight: parseFloat(sh.weight) || 0,
          numberOfPieces: sh.quantity_places || 1,
          contents: sh.description || '',
          destination: `${sh.from_station || ''} -> ${sh.to_station || ''}`,
          scheduledTime: t('readyStatus'),
          declaredValue: sh.cost || 0,
          rawStatus: sh.shipment_status,
          receiverName: sh.receiver_name || '',
          receiverPhone: sh.receiver_phone || '',
        };
      });
      // Filter out tasks assigned to OTHER couriers
      setTasks(mapped.filter((t: DeliveryTask) => !t.operatorId || t.operatorId === user?.id));
    } catch (e) {
      console.error(e);
    } finally {
    }
  };

  useEffect(() => {
    loadTasks();
    const interval = setInterval(loadTasks, 10000);
    return () => clearInterval(interval);
  }, [user?.station, user?.id]);

  useEffect(() => {
    const wsBase = (import.meta as any).env?.VITE_WS_BASE;
    const socketUrl = wsBase ? `${wsBase}/ws` : `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`;
    const socket = new WebSocket(socketUrl);

    socket.onopen = () => {
      console.log('WebSocket connected for courier updates');
      if (user?.id) {
        socket.send(JSON.stringify({ action: 'join-user', room: user.id.toString() }));
      }
      if (user?.station) {
        const normalizedStation = user.station.trim().toLowerCase();
        socket.send(JSON.stringify({ action: 'join-station', room: normalizedStation }));
      }
    };

    socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.event === 'shipment-updated' || payload.event === 'courier:new-task') {
          loadTasks();
        }
      } catch (e) {
        console.error('Invalid WebSocket message received', e);
      }
    };

    return () => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.close();
      }
    };
  }, [user?.id, user?.station]);

  const pendingTasks = tasks.filter(t => t.status === 'pending');
  const myTasks = tasks.filter(t => t.status === 'in_progress' || t.status === 'picked_up' || t.status === 'delivery_assigned' || t.status === 'out_for_delivery');


  const handleTaskClick = (task: DeliveryTask) => {
    setSelectedTask(task);
    setShowDetailsDialog(true);
  };

  const handleStartTask = async () => {
    if (!selectedTask) return;
    try {
      let endpoint: string;
      if (selectedTask.type === 'pickup') {
        endpoint = `/api/shipments/${selectedTask.id}/pickup-start`;
      } else {
        // Доставка: берём задачу через новый endpoint
        endpoint = `/api/shipments/${selectedTask.id}/courier-take-delivery`;
      }
        
      const resp = await fetch(withApiBase(endpoint), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token') || ''}` }
      });
      if (resp.ok) {
        await loadTasks();
        toast.success(selectedTask.type === 'delivery' 
          ? 'Задание на доставку взято. Заберите посылку из отделения.' 
          : 'Задание успешно взято');
        setShowDetailsDialog(false);
        setActiveTab('my_tasks');
      } else {
        const err = await resp.json();
        toast.error(err.error || 'Ошибка при взятии задания');
      }
    } catch (e) {
      toast.error('Сетевая ошибка');
    }
  };

  const submitPinCode = async () => {
    if (!showPinModal || !pinCode) return;
    try {
      const url = showPinModal.type === 'pickup' ? '/pickup-confirm' : '/delivery-confirm';
      const payload = showPinModal.type === 'pickup' ? { confirmed_at: new Date().toISOString(), code: pinCode } : { code: pinCode };
      const resp = await fetch(withApiBase(`/api/shipments/${showPinModal.task.id}${url}`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token') || ''}` },
        body: JSON.stringify(payload)
      });
      if (resp.ok) {
        const completedTask = showPinModal.task;
        setShowPinModal(null);
        setPinCode('');
        setShowDetailsDialog(false);
        setSuccessShipment(completedTask);
        toast.success('Доставка успешно завершена! 🎉');
        setTimeout(() => loadTasks(), 500);
      } else {
        const err = await resp.json().catch(() => ({ error: 'Неверный PIN-код' }));
        toast.error(err.error || 'Неверный PIN-код');
      }
    } catch(e) { 
      toast.error('Сетевая ошибка'); 
    }
  };

  const handleCompleteTask = async () => {
    if (!selectedTask) return;
    try {
      if (selectedTask.type === 'pickup') {
        if (selectedTask.status === 'in_progress') {
          // PICKUP_ASSIGNED → PICKED_UP: courier picked up from client
          setShowPinModal({ type: 'pickup', task: selectedTask });
          return;
        } else if (selectedTask.status === 'picked_up') {
          // PICKED_UP → READY_FOR_LOADING: courier delivered to station
          const resp = await fetch(withApiBase(`/api/shipments/${selectedTask.id}/station-intake`), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token') || ''}` }
          });
          if (resp.ok) {
            await loadTasks();
            toast.success('Посылка сдана на склад');
            setShowDetailsDialog(false);
          } else {
            const err = await resp.json().catch(() => ({}));
            toast.error(err.error || 'Ошибка при сдаче на склад');
          }
        }
      } else {
        // delivery type
        setShowPinModal({ type: 'delivery', task: selectedTask });
        return;
      }
    } catch (e) {
      toast.error('Сетевая ошибка');
    }
  };

  const renderTaskList = (taskList: DeliveryTask[]) => {
    if (taskList.length === 0) {
      return (
        <div className="p-8 text-center text-gray-500">
          <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>Нет задач</p>
        </div>
      );
    }
    return taskList.map((task) => (
      <div
        key={task.id}
        onClick={() => handleTaskClick(task)}
        className="p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-750 border-b last:border-b-0 dark:border-gray-700"
      >
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg shrink-0 ${task.type === 'pickup' ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-green-100 dark:bg-green-900/30'}`}>
            {task.type === 'pickup' ? (
              <Home className={`w-5 h-5 text-blue-600`} />
            ) : (
              <Building2 className="w-5 h-5 text-green-600" />
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge className={`text-xs ${task.type === 'pickup' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>
                {task.type === 'pickup' ? 'Забор' : 'Доставка'}
              </Badge>
              <Badge className="bg-gray-100 text-gray-800 text-xs">
                {getStatusTranslation(task.rawStatus)}
              </Badge>
            </div>
            
            <div className="font-medium text-sm mb-1 text-gray-900 dark:text-white">
              {task.clientName}
            </div>
            
            <div className="text-xs space-y-1 text-gray-600 dark:text-gray-400">
              <div className="flex items-center gap-1">
                <MapPin className="w-3 h-3 shrink-0" />
                <span className="truncate">{task.address || t('addressNotSpecified')}</span>
              </div>
              <div className="flex items-center gap-1">
                <Weight className="w-3 h-3 shrink-0" />
                <span>{task.weight} кг • {task.numberOfPieces} мест</span>
              </div>
            </div>
          </div>

          <ArrowRight className="w-5 h-5 shrink-0 text-gray-400" />
        </div>
      </div>
    ));
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-4 px-4 pb-20">
      <div className="max-w-2xl mx-auto space-y-4 pb-6">
        <Card className="bg-white dark:bg-gray-800 dark:border-gray-700">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <CardTitle className="text-lg sm:text-xl text-gray-900 dark:text-white">
                  {user?.name}
                </CardTitle>
                <CardDescription className="text-sm text-gray-600 dark:text-gray-400">
                  Cargo Trans Курьер
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
                  {theme === 'light' ? <Moon className="w-5 h-5 text-gray-600" /> : <Sun className="w-5 h-5 text-yellow-400" />}
                </Button>
                <Button variant="ghost" size="icon" onClick={logout} title="Выйти">
                  <LogOut className="w-5 h-5 text-gray-500" />
                </Button>
                <Badge className="bg-green-100 text-green-800 shrink-0">Активен</Badge>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-2 text-sm text-gray-600 dark:text-gray-400">
              <MapPin className="w-4 h-4 shrink-0" />
              <span className="truncate">{user?.station || t('noStation')}</span>
            </div>
          </CardHeader>
        </Card>

        <Card className="bg-white dark:bg-gray-800 dark:border-gray-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-base sm:text-lg text-gray-900 dark:text-white">
              Задачи
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
              <TabsList className="w-full grid grid-cols-2 bg-gray-100 dark:bg-gray-700">
                <TabsTrigger value="pending" className="text-sm">
                  {t('availableTasks')} ({pendingTasks.length})
                </TabsTrigger>
                <TabsTrigger value="my_tasks" className="text-sm">
                  {t('myTasks')} ({myTasks.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="pending" className="mt-0">
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {renderTaskList(pendingTasks)}
                </div>
              </TabsContent>

              <TabsContent value="my_tasks" className="mt-0">
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {renderTaskList(myTasks)}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {showPinModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-sm p-6 shadow-xl">
            <h3 className="text-xl font-bold mb-4 dark:text-white">Введите PIN-код</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Попросите клиента продиктовать 4-значный код из SMS.</p>
            <input
              type="text"
              value={pinCode}
              onChange={e => setPinCode(e.target.value)}
              className="w-full text-center text-2xl tracking-widest px-4 py-3 border rounded-xl dark:bg-gray-700 dark:border-gray-600 dark:text-white mb-6 focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="0000"
              maxLength={4}
            />
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => {setShowPinModal(null); setPinCode('');}}>Отмена</Button>
              <Button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white" onClick={submitPinCode}>Подтвердить</Button>
            </div>
          </div>
        </div>
      )}

        {showDetailsDialog && selectedTask && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
              <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center">
                <h3 className="font-bold flex items-center gap-2">
                  {selectedTask.type === 'pickup' ? <Home className="w-5 h-5 text-blue-600" /> : <Building2 className="w-5 h-5 text-green-600" />}
                  {selectedTask.type === 'pickup' ? 'Забор' : 'Доставка'}
                </h3>
                <span className="text-sm text-gray-500">{selectedTask.parcelCode}</span>
              </div>
              <div className="p-4 overflow-y-auto space-y-4">
                {/* QR для приемосдатчика — при сдаче посылки на склад (забор) */}
                {selectedTask.status === 'picked_up' && selectedTask.type === 'pickup' && (
                  <div className="bg-white p-6 rounded-xl flex flex-col items-center border shadow-sm dark:border-gray-600 dark:bg-gray-800">
                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-4">Покажите этот QR приемосдатчику</p>
                    <div className="bg-white p-2 rounded-lg">
                      <QRCodeSVG value={selectedTask.parcelCode || selectedTask.id} size={200} level="H" />
                    </div>
                  </div>
                )}
                {/* QR для приемосдатчика — при забирании посылки из отделения (доставка) */}
                {selectedTask.status === 'delivery_assigned' && selectedTask.type === 'delivery' && (
                  <div className="bg-amber-50 dark:bg-amber-900/20 p-6 rounded-xl flex flex-col items-center border border-amber-200 dark:border-amber-800 shadow-sm">
                    <p className="text-sm font-semibold text-amber-800 dark:text-amber-200 mb-2">1. Идите в отделение</p>
                    <p className="text-xs text-amber-600 dark:text-amber-400 mb-4">Покажите QR приемосдатчику для подтверждения</p>
                    <div className="bg-white p-2 rounded-lg">
                      <QRCodeSVG value={selectedTask.parcelCode || selectedTask.id} size={200} level="H" />
                    </div>
                  </div>
                )}
                <div className="bg-gray-50 dark:bg-gray-750 p-4 rounded-lg">
                  <div className="flex items-center gap-2 font-medium mb-2"><User className="w-4 h-4"/> {selectedTask.type === 'delivery' ? 'Получатель' : 'Клиент'}</div>
                  <div className="text-sm font-semibold">{selectedTask.clientName}</div>
                  <div className="text-sm text-gray-600 mt-1">{selectedTask.clientPhone}</div>
                  <Button className="mt-2 w-full" variant="outline" onClick={() => window.location.href = `tel:${selectedTask.clientPhone}`}>
                    <Phone className="w-4 h-4 mr-2" /> Позвонить
                  </Button>
                </div>
                <div className="bg-gray-50 dark:bg-gray-750 p-4 rounded-lg">
                  <div className="flex items-center gap-2 font-medium mb-2"><MapPin className="w-4 h-4"/> Адрес доставки</div>
                  <div className="text-sm">{selectedTask.fullAddress || t('addressNotSpecified')}</div>
                  <Button className="mt-2 w-full bg-blue-600 hover:bg-blue-700" onClick={() => window.open(`https://2gis.kz/search/${encodeURIComponent(selectedTask.fullAddress)}`, '_blank')}>
                    <Navigation className="w-4 h-4 mr-2" /> Открыть в 2ГИС
                  </Button>
                </div>
                <div className="bg-gray-50 dark:bg-gray-750 p-4 rounded-lg text-sm space-y-2">
                  <div className="flex items-center gap-2 font-medium mb-2"><Package className="w-4 h-4"/> Посылка</div>
                  <div>{t('weightColumn')}: {selectedTask.weight} кг</div>
                  <div>{t('quantityPlaces')}: {selectedTask.numberOfPieces} шт</div>
                  <div>{t('cargoDescription')}: {selectedTask.contents || 'Нет'}</div>
                </div>
              </div>
              <div className="p-4 border-t dark:border-gray-700 flex flex-col gap-2">
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => setShowDetailsDialog(false)}>{t('close')}</Button>
                
                  {selectedTask.status === 'pending' && (
                    <Button className="flex-1 bg-blue-600 hover:bg-blue-700" onClick={handleStartTask}>
                      {selectedTask.type === 'delivery' ? 'Взять доставку' : 'Взять задание'}
                    </Button>
                  )}

                  {(selectedTask.status === 'in_progress' || selectedTask.status === 'delivery_assigned' || selectedTask.status === 'out_for_delivery') && (
                    <Button 
                      className="flex-1 bg-green-600 hover:bg-green-700 font-bold" 
                      onClick={handleCompleteTask}
                    >
                      {selectedTask.type === 'pickup' ? 'Забрал у клиента' : 'Доставил получателю'}
                    </Button>
                  )}
                </div>
                {selectedTask.status === 'delivery_assigned' && selectedTask.type === 'delivery' && (
                  <p className="text-xs text-center text-amber-600 dark:text-amber-400">
                    Покажите QR приемосдатчику → заберите посылку → доставьте получателю
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
      {/* Success Modal */}
      {successShipment && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className={`${isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'} border w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300`}>
            <div className="p-8 text-center">
              <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6 text-green-500">
                <Package className="w-10 h-10 animate-bounce" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Доставлено!</h2>
              <p className={`text-sm mb-6 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                Груз <span className="font-mono font-bold text-blue-500">{successShipment.parcelCode}</span> успешно передан получателю
              </p>
              
              <div className={`${isDark ? 'bg-gray-800' : 'bg-gray-50'} rounded-2xl p-4 mb-6 text-left`}>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500">
                    <User className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-semibold">{successShipment.receiverName || successShipment.clientName}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <span className="text-xs text-gray-400 truncate">{successShipment.address}</span>
                </div>
              </div>

              <Button 
                onClick={() => setSuccessShipment(null)}
                className="w-full h-14 rounded-2xl text-lg font-bold bg-green-500 hover:bg-green-600 shadow-lg shadow-green-500/20 transition-all active:scale-95"
              >
                Отлично
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Language Toggle or other footer stuff if needed */}
    </div>
  );
}
