import { useState, useEffect } from 'react';
import { withApiBase } from '../lib/api-base';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from './ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Package, MapPin, Phone, User, Weight, Navigation, CheckCircle2, Clock, Home, Building2, ArrowRight, Sun, Moon } from 'lucide-react';
import { toast } from 'sonner';

interface DeliveryTask {
  id: string;
  type: 'pickup' | 'delivery';
  status: 'pending' | 'in_progress' | 'picked_up' | 'completed' | 'cancelled';
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
}

export function CourierDashboard() {
  const { t } = useLanguage();
  const { user } = useAuth();
  
  const [selectedTask, setSelectedTask] = useState<DeliveryTask | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [activeTab, setActiveTab] = useState<'pending' | 'my_tasks'>('pending');

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
  const [loading, setLoading] = useState(false);

  const getStatusTranslation = (status: string) => {
    const dict: Record<string, string> = {
      'CREATED_DOOR': t('courierStatusWaitingPickup'),
      'PICKUP_ASSIGNED': t('courierStatusAssigned'),
      'PICKED_UP': t('courierStatusPickedUp'),
      'READY_FOR_ISSUE': t('courierStatusWaitingDelivery'),
      'ISSUED': t('courierStatusDelivered'),
      'READY_FOR_LOADING': t('courierStatusLoaded')
    };
    return dict[status] || status;
  };

  const loadTasks = async () => {
    setLoading(true);
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
        let status: 'pending' | 'in_progress' | 'picked_up' | 'completed' | 'cancelled' = 'pending';
        
        // Determine type based on station matching
        if (sh.to_station === user?.station) {
          type = 'delivery';
        } else {
          type = 'pickup';
        }
        
        const rawSt: string = sh.shipment_status || '';
        const myId = user?.id || '';
        const opId: string = sh.operator_id || '';

        // Determine logical status primarily from shipment_status
        if (type === 'pickup') {
          if (rawSt === 'PICKUP_ASSIGNED' || rawSt === 'PAID') {
            // If assigned to me - in progress; if assigned to someone else - hide
            if (opId && opId !== myId) {
              status = 'cancelled'; // another courier took it
            } else if (opId === myId) {
              status = 'in_progress';
            } else {
              // PAID but no operator - still pending for pickup
              status = rawSt === 'PAID' ? 'in_progress' : 'pending';
            }
          } else if (rawSt === 'PICKED_UP') {
            status = opId === myId || !opId ? 'picked_up' : 'cancelled';
          } else if (rawSt === 'READY_FOR_LOADING' || rawSt === 'AT_STATION_INTAKE') {
            status = 'completed';
          } else {
            // CREATED_DOOR, PAYMENT_PENDING, CREATED - available to take
            status = opId && opId !== myId ? 'cancelled' : 'pending';
          }
        } else {
          // delivery type
          if (rawSt === 'READY_FOR_ISSUE') {
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
          clientPhone: sh.door_to_door_phone || sh.receiver_phone || '',
          address: type === 'pickup' ? sh.pickup_address : sh.delivery_address,
          fullAddress: type === 'pickup' ? sh.pickup_address : sh.delivery_address,
          weight: parseFloat(sh.weight) || 0,
          numberOfPieces: sh.quantity_places || 1,
          contents: sh.description || '',
          destination: `${sh.from_station || ''} -> ${sh.to_station || ''}`,
          scheduledTime: t('readyStatus'),
          declaredValue: sh.cost || 0,
          rawStatus: sh.shipment_status
        };
      });
      // Filter out tasks assigned to OTHER couriers
      setTasks(mapped.filter((t: DeliveryTask) => !t.operatorId || t.operatorId === user?.id));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
    const interval = setInterval(loadTasks, 10000);
    return () => clearInterval(interval);
  }, [user?.station, user?.id]);

  useEffect(() => {
    const wsBase = import.meta.env.VITE_WS_BASE;
    const socketUrl = wsBase ? `${wsBase}/ws` : `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`;
    const socket = new WebSocket(socketUrl);

    socket.onopen = () => {
      console.log('WebSocket connected for courier updates');
      if (user?.id) {
        socket.send(JSON.stringify({ action: 'join-user', room: user.id.toString() }));
      }
      if (user?.station) {
        socket.send(JSON.stringify({ action: 'join-station', room: user.station }));
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
  const myTasks = tasks.filter(t => t.status === 'in_progress' || t.status === 'picked_up');

  const stats = {
    todayTasks: myTasks.length,
    completed: tasks.filter(t => t.status === 'completed').length,
    pending: pendingTasks.length,
    inProgress: myTasks.length
  };

  const handleTaskClick = (task: DeliveryTask) => {
    setSelectedTask(task);
    setShowDetailsDialog(true);
  };

  const handleStartTask = async () => {
    if (!selectedTask) return;
    try {
      const endpoint = selectedTask.type === 'pickup' 
        ? `/api/shipments/${selectedTask.id}/pickup-start`
        : `/api/shipments/${selectedTask.id}/courier-take`;
        
      const resp = await fetch(withApiBase(endpoint), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token') || ''}` }
      });
      if (resp.ok) {
        await loadTasks();
        toast.success('Задание успешно взято');
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

  const handleCompleteTask = async () => {
    if (!selectedTask) return;
    try {
      if (selectedTask.type === 'pickup') {
        if (selectedTask.status === 'in_progress') {
          // PICKUP_ASSIGNED → PICKED_UP: courier picked up from client
          const resp = await fetch(withApiBase(`/api/shipments/${selectedTask.id}/pickup-confirm`), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token') || ''}` },
            body: JSON.stringify({ confirmed_at: new Date().toISOString() })
          });
          if (resp.ok) {
            await loadTasks();
            toast.success('Груз забран у клиента');
            setShowDetailsDialog(false);
          } else {
            const err = await resp.json().catch(() => ({}));
            toast.error(err.error || 'Ошибка');
          }
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
        const resp = await fetch(withApiBase(`/api/shipments/${selectedTask.id}/delivery-confirm`), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token') || ''}` }
        });
        if (resp.ok) {
          await loadTasks();
          toast.success('Доставка завершена');
          setShowDetailsDialog(false);
        } else {
          const err = await resp.json().catch(() => ({}));
          toast.error(err.error || 'Ошибка завершения доставки');
        }
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
                <div className="bg-gray-50 dark:bg-gray-750 p-4 rounded-lg">
                  <div className="flex items-center gap-2 font-medium mb-2"><User className="w-4 h-4"/> Клиент</div>
                  <div className="text-sm font-semibold">{selectedTask.clientName}</div>
                  <div className="text-sm text-gray-600 mt-1">{selectedTask.clientPhone}</div>
                  <Button className="mt-2 w-full" variant="outline" onClick={() => window.location.href = `tel:${selectedTask.clientPhone}`}>
                    <Phone className="w-4 h-4 mr-2" /> Позвонить
                  </Button>
                </div>
                <div className="bg-gray-50 dark:bg-gray-750 p-4 rounded-lg">
                  <div className="flex items-center gap-2 font-medium mb-2"><MapPin className="w-4 h-4"/> Адрес</div>
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
              <div className="p-4 border-t dark:border-gray-700 flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setShowDetailsDialog(false)}>{t('close')}</Button>
                
                {selectedTask.status === 'pending' && (
                  <Button className="flex-1 bg-blue-600 hover:bg-blue-700" onClick={handleStartTask}>
                    Взять задание
                  </Button>
                )}

                {selectedTask.status === 'in_progress' && selectedTask.type === 'pickup' && (
                  <Button className="flex-1 bg-green-600 hover:bg-green-700" onClick={handleCompleteTask}>
                    Забрал у клиента
                  </Button>
                )}
                
                {selectedTask.status === 'picked_up' && selectedTask.type === 'pickup' && (
                  <Button className="flex-1 bg-orange-500 hover:bg-orange-600 text-white" onClick={handleCompleteTask}>
                    Сдать на склад
                  </Button>
                )}

                {selectedTask.status === 'in_progress' && selectedTask.type === 'delivery' && (
                  <Button 
                    className="flex-1 bg-green-600 hover:bg-green-700" 
                    onClick={handleCompleteTask}
                    disabled={selectedTask.rawStatus !== 'READY_FOR_ISSUE'}
                  >
                    Доставил получателю
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
