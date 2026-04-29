import { useState, useEffect } from 'react';
import { withApiBase } from '../lib/api-base';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { 
  Package, 
  MapPin, 
  Phone, 
  User, 
  Weight, 
  Navigation, 
  CheckCircle2, 
  Clock, 
  Home,
  Building2,
  ArrowRight,
  XCircle,
  Sun,
  Moon
} from 'lucide-react';
import { toast } from 'sonner';


interface DeliveryTask {
  id: string;
  type: 'pickup' | 'delivery';
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
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
}

export function CourierDashboard() {

  const lang = localStorage.getItem('language') || 'ru';
  const getDict = (key: string) => {
    const dict: Record<string, Record<string, string>> = {
      ru: {
        courierPosition: 'Курьер Cargo Trans',
        active: 'Активен',
        tasksToday: 'Задач сегодня',
        completed: 'Завершено',
        pending: 'Ожидают',
        inProgress: 'В работе',
        deliveryTasks: 'Задачи',
        noActiveTasks: 'Нет активных задач',
        noCompletedTasks: 'Нет завершенных задач',
        pickup: 'Забор',
        delivery: 'Доставка',
        clientInfo: 'Информация о клиенте',
        fullName: 'ФИО',
        phone: 'Телефон',
        call: 'Позвонить',
        address: 'Адрес',
        openNavigation: 'Открыть 2ГИС',
        scheduledTime: 'Время',
        parcelInfo: 'Информация о грузе',
        weight: 'Вес',
        numberOfPieces: 'Кол-во мест',
        pieces: 'шт',
        contents: 'Содержимое',
        declaredValue: 'Объявленная ценность',
        route: 'Маршрут',
        importantNotes: 'Важные примечания',
        startTask: 'Начать задание',
        completeTask: 'Завершить задание',
        close: 'Закрыть',
        taskStarted: 'Задание начато',
        pickupCompleted: 'Забор груза завершен',
        deliveryCompleted: 'Доставка завершена',
        navigationOpened: 'Навигатор открыт',
      },
      kz: {
        courierPosition: 'Cargo Trans курьері',
        active: 'Белсенді',
        tasksToday: 'Бүгінгі тапсырмалар',
        completed: 'Аяқталды',
        pending: 'Күтілуде',
        inProgress: 'Орындалуда',
        deliveryTasks: 'Тапсырмалар',
        noActiveTasks: 'Белсенді тапсырмалар жоқ',
        noCompletedTasks: 'Аяқталған тапсырмалар жоқ',
        pickup: 'Алып кету',
        delivery: 'Жеткізу',
        clientInfo: 'Клиент туралы ақпарат',
        fullName: 'Аты-жөні',
        phone: 'Телефон',
        call: 'Қоңырау шалу',
        address: 'Мекенжай',
        openNavigation: '2ГИС ашу',
        scheduledTime: 'Уақыты',
        parcelInfo: 'Жүк туралы ақпарат',
        weight: 'Салмағы',
        numberOfPieces: 'Орын саны',
        pieces: 'дана',
        contents: 'Ішіндегісі',
        declaredValue: 'Жарияланған құны',
        route: 'Бағыт',
        importantNotes: 'Маңызды ескертпелер',
        startTask: 'Тапсырманы бастау',
        completeTask: 'Тапсырманы аяқтау',
        close: 'Жабу',
        taskStarted: 'Тапсырма басталды',
        pickupCompleted: 'Жүкті алып кету аяқталды',
        deliveryCompleted: 'Жеткізу аяқталды',
        navigationOpened: 'Навигатор ашылды',
      },
      en: {
        courierPosition: 'Cargo Trans Courier',
        active: 'Active',
        tasksToday: 'Tasks Today',
        completed: 'Completed',
        pending: 'Pending',
        inProgress: 'In Progress',
        deliveryTasks: 'Tasks',
        noActiveTasks: 'No active tasks',
        noCompletedTasks: 'No completed tasks',
        pickup: 'Pickup',
        delivery: 'Delivery',
        clientInfo: 'Client Information',
        fullName: 'Full Name',
        phone: 'Phone',
        call: 'Call',
        address: 'Address',
        openNavigation: 'Open 2GIS',
        scheduledTime: 'Time',
        parcelInfo: 'Parcel Information',
        weight: 'Weight',
        numberOfPieces: 'Pieces',
        pieces: 'pcs',
        contents: 'Contents',
        declaredValue: 'Declared Value',
        route: 'Route',
        importantNotes: 'Important Notes',
        startTask: 'Start Task',
        completeTask: 'Complete Task',
        close: 'Close',
        taskStarted: 'Task started',
        pickupCompleted: 'Pickup completed',
        deliveryCompleted: 'Delivery completed',
        navigationOpened: 'Navigation opened',
      }
    };
    return dict[lang]?.[key] || key;
  };

  const { user } = useAuth();
  const [selectedTask, setSelectedTask] = useState<DeliveryTask | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [activeTab, setActiveTab] = useState<'pending' | 'completed'>('pending');

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
    const lang = localStorage.getItem('language') || 'ru';
    const dict: Record<string, any> = {
      ru: {
        'CREATED_DOOR': 'Ожидает курьера',
        'PICKUP_ASSIGNED': 'Назначена курьеру',
        'PICKED_UP': 'Забрана курьером',
        'PAYMENT_PENDING': 'Ожидает оплаты',
        'PAID': 'Оплачена',
      },
      kz: {
        'CREATED_DOOR': 'Курьерді күтуде',
        'PICKUP_ASSIGNED': 'Курьерге тағайындалды',
        'PICKED_UP': 'Курьер алып кетті',
        'PAYMENT_PENDING': 'Төлемді күтуде',
        'PAID': 'Төленді',
      },
      en: {
        'CREATED_DOOR': 'Waiting for Courier',
        'PICKUP_ASSIGNED': 'Assigned to Courier',
        'PICKED_UP': 'Picked Up by Courier',
        'PAYMENT_PENDING': 'Payment Pending',
        'PAID': 'Paid',
      }
    };
    return dict[lang]?.[status] || status;
  };

  const loadTasks = async () => {
    setLoading(true);
    try {
      const resp = await fetch(withApiBase('/api/courier/tasks'), {
        headers: { Authorization: `Bearer ${user?.token || ''}` }
      });
      if (!resp.ok) throw new Error('Failed to load tasks');
      const data = await resp.json();
      
      const mapped = (data || []).map((sh: any) => {
        let type: 'pickup' | 'delivery' = 'pickup';
        let status: 'pending' | 'in_progress' | 'completed' | 'cancelled' = 'pending';
        
        if (sh.shipment_status === 'PICKUP_ASSIGNED') status = 'in_progress';
        if (sh.shipment_status === 'PICKED_UP') status = 'completed';
        if (sh.shipment_status === 'PAYMENT_PENDING' || sh.shipment_status === 'PAID') {
            status = 'pending';
        }

        return {
          id: sh.id,
          type,
          status,
          parcelCode: sh.shipment_number,
          clientName: sh.client_name || 'Неизвестно',
          clientPhone: sh.door_to_door_phone || sh.receiver_phone || '',
          address: sh.pickup_address || '',
          fullAddress: sh.pickup_address || '',
          weight: parseFloagetDict(sh.weight) || 0,
          numberOfPieces: sh.quantity_places || 1,
          contents: sh.description || '',
          destination: `${sh.from_station || ''} -> ${sh.to_station || ''}`,
          scheduledTime: 'По готовности',
          declaredValue: sh.cost || 0,
          rawStatus: sh.shipment_status
        };
      });
      setTasks(mapped);
    } catch {
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect((() => {
    loadTasks();
  }, []);


  const pendingTasks = tasks.filter(t => t.status === 'pending' || t.status === 'in_progress');
  const completedTasks = tasks.filter(t => t.status === 'completed');

  const stats = {
    todayTasks: tasks.filter(t => t.status !== 'cancelled').length,
    completed: completedTasks.length,
    pending: pendingTasks.length,
    inProgress: tasks.filter(t => t.status === 'in_progress').length
  };

  const handleTaskClick = (task: DeliveryTask) => {
    setSelectedTask(task);
    setShowDetailsDialog(true);
  };

  const handleStartTask = async () => {
    if (!selectedTask) return;
    try {
      const resp = await fetch(withApiBase(`/api/shipments/${selectedTask.id}/pickup-start`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user?.token || ''}` }
      });
      if (resp.ok) {
        await loadTasks();
        setSelectedTask({ ...selectedTask, status: 'in_progress' });
        toast.success(getDict('taskStarted') || 'Задача начата');
      }
    } catch (e) {}
  };

  const handleCompleteTask = async () => {
    if (!selectedTask) return;
    try {
      const resp = await fetch(withApiBase(`/api/shipments/${selectedTask.id}/pickup-confirm`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user?.token || ''}` },
        body: JSON.stringify({ confirmed_at: new Date().toISOString() })
      });
      if (resp.ok) {
        await loadTasks();
        toast.success(
          selectedTask.type === 'pickup' 
            ? (getDict('pickupCompleted') || 'Забор завершен')
            : (getDict('deliveryCompleted') || 'Доставка завершена')
        );
        setShowDetailsDialog(false);
        setSelectedTask(null);
      }
    } catch (e) {}
  };

  const handleOpenNavigation = () => {
    if (!selectedTask) return;
    // В реальном приложении здесь будет открытие навигации
    const address = encodeURIComponengetDict(selectedTask.fullAddress);
    window.open(`https://2gis.kz/search/${address}`, '_blank');
    toast.success(getDict('navigationOpened'));
  };

  const handleCallClient = () => {
    if (!selectedTask) return;
    // В реальном приложении здесь будет инициация звонка
    window.location.href = `tel:${selectedTask.clientPhone}`;
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4 pb-6">
      {/* Header with courier info */}
      <Card className="bg-white dark:bg-gray-800 dark:border-gray-700">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg sm:text-xl  text-gray-900 dark:text-white">
                {user?.name}
              </CardTitle>
              <CardDescription className="text-sm  text-gray-600 dark:text-gray-400">
                {getDict('courierPosition')}
              </CardDescription>
            </div>
            <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100 shrink-0">
              {getDict('active')}
            </Badge>
          </div>
          <div className="flex items-center gap-2 mt-2 text-sm  text-gray-600 dark:text-gray-400">
            <MapPin className="w-4 h-4 shrink-0" />
            <span className="truncate">{user?.station || 'Нет станции'}</span>
          </div>
        </CardHeader>
      </Card>

      {/* Statistics */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-white dark:bg-gray-800 dark:border-gray-700">
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex flex-col items-center text-center">
              <Package className="w-6 h-6 mb-2  text-blue-600 dark:text-blue-400" />
              <div className="text-2xl font-bold  text-gray-900 dark:text-white">
                {stats.todayTasks}
              </div>
              <div className="text-xs  text-gray-600 dark:text-gray-400">
                {getDict('tasksToday')}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-gray-800 dark:border-gray-700">
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex flex-col items-center text-center">
              <CheckCircle2 className="w-6 h-6 mb-2 text-green-600" />
              <div className="text-2xl font-bold  text-gray-900 dark:text-white">
                {stats.completed}
              </div>
              <div className="text-xs  text-gray-600 dark:text-gray-400">
                {getDict('completed')}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-gray-800 dark:border-gray-700">
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex flex-col items-center text-center">
              <Clock className="w-6 h-6 mb-2  text-yellow-600 dark:text-yellow-400" />
              <div className="text-2xl font-bold  text-gray-900 dark:text-white">
                {stats.pending}
              </div>
              <div className="text-xs  text-gray-600 dark:text-gray-400">
                {getDict('pending')}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-gray-800 dark:border-gray-700">
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex flex-col items-center text-center">
              <Navigation className="w-6 h-6 mb-2  text-orange-600 dark:text-orange-400" />
              <div className="text-2xl font-bold  text-gray-900 dark:text-white">
                {stats.inProgress}
              </div>
              <div className="text-xs  text-gray-600 dark:text-gray-400">
                {getDict('inProgress')}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tasks List */}
      <Card className="bg-white dark:bg-gray-800 dark:border-gray-700">
        <CardHeader className="pb-3">
          <CardTitle className="text-base sm:text-lg  text-gray-900 dark:text-white">
            {getDict('deliveryTasks')}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'pending' | 'completed')}>
            <TabsList className="w-full grid grid-cols-2  bg-gray-100 dark:bg-gray-700">
              <TabsTrigger value="pending" className="text-sm">
                {getDict('active')} ({pendingTasks.length})
              </TabsTrigger>
              <TabsTrigger value="completed" className="text-sm">
                {getDict('completed')} ({completedTasks.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pending" className="mt-0">
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {pendingTasks.length === 0 ? (
                  <div className="p-8 text-center  text-gray-600 dark:text-gray-400">
                    <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>{getDict('noActiveTasks')}</p>
                  </div>
                ) : (
                  pendingTasks.map((task) => (
                    <div
                      key={task.id}
                      onClick={() => handleTaskClick(task)}
                      className={`p-4 cursor-pointer ${
                        'hover:bg-gray-50 dark:hover:bg-gray-750'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg shrink-0 ${
                          task.type === 'pickup'
                            ? 'bg-blue-100 dark:bg-blue-900/30'
                            : 'bg-green-100 dark:bg-green-900/30'
                        }`}>
                          {task.type === 'pickup' ? (
                            <Home className={`w-5 h-5 ${task.type === 'pickup' ? 'text-blue-600' : 'text-green-600'}`} />
                          ) : (
                            <Building2 className="w-5 h-5 text-green-600" />
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge className={`text-xs ${
                              task.type === 'pickup'
                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100'
                                : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100'
                            }`}>
                              {task.type === 'pickup' ? (getDict('pickup') || 'Забор') : (getDict('delivery') || 'Доставка')} - {getStatusTranslation(task.rawStatus)}
                            </Badge>
                            {task.status === 'in_progress' && (
                              <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100 text-xs">
                                {getDict('inProgress')}
                              </Badge>
                            )}
                          </div>
                          
                          <div className="font-medium text-sm mb-1  text-gray-900 dark:text-white">
                            {task.clientName}
                          </div>
                          
                          <div className="text-xs space-y-1  text-gray-600 dark:text-gray-400">
                            <div className="flex items-center gap-1">
                              <MapPin className="w-3 h-3 shrink-0" />
                              <span className="truncate">{task.address}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3 shrink-0" />
                              <span>{task.scheduledTime}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Weight className="w-3 h-3 shrink-0" />
                              <span>{task.weight} кг</span>
                            </div>
                          </div>
                        </div>

                        <ArrowRight className="w-5 h-5 shrink-0  text-gray-400 dark:text-gray-600" />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="completed" className="mt-0">
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {completedTasks.length === 0 ? (
                  <div className="p-8 text-center  text-gray-600 dark:text-gray-400">
                    <CheckCircle2 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>{getDict('noCompletedTasks')}</p>
                  </div>
                ) : (
                  completedTasks.map((task) => (
                    <div
                      key={task.id}
                      onClick={() => handleTaskClick(task)}
                      className={`p-4 cursor-pointer ${
                        'hover:bg-gray-50 dark:hover:bg-gray-750'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg shrink-0 ${
                          'bg-gray-100 dark:bg-gray-700'
                        }`}>
                          <CheckCircle2 className="w-5 h-5 text-green-600" />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300 text-xs">
                              {task.type === 'pickup' ? (getDict('pickup') || 'Забор') : (getDict('delivery') || 'Доставка')} - {getStatusTranslation(task.rawStatus)}
                            </Badge>
                          </div>
                          
                          <div className="font-medium text-sm mb-1  text-gray-900 dark:text-white">
                            {task.clientName}
                          </div>
                          
                          <div className="text-xs space-y-1  text-gray-600 dark:text-gray-400">
                            <div className="flex items-center gap-1">
                              <MapPin className="w-3 h-3 shrink-0" />
                              <span className="truncate">{task.address}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Weight className="w-3 h-3 shrink-0" />
                              <span>{task.weight} кг</span>
                            </div>
                          </div>
                        </div>

                        <ArrowRight className="w-5 h-5 shrink-0  text-gray-400 dark:text-gray-600" />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Task Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto  bg-white dark:bg-gray-800 dark:border-gray-700">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2  text-gray-900 dark:text-white">
              {selectedTask?.type === 'pickup' ? (
                <Home className="w-5 h-5 text-blue-600" />
              ) : (
                <Building2 className="w-5 h-5 text-green-600" />
              )}
              {selectedTask?.type === 'pickup' ? getDict('pickup') : getDict('delivery')}
            </DialogTitle>
            <DialogDescription className="text-gray-600 dark:text-gray-400">
              {selectedTask?.parcelCode}
            </DialogDescription>
          </DialogHeader>

          {selectedTask && (
            <div className="space-y-4">
              {/* Status Badge */}
              {selectedTask.status === 'in_progress' && (
                <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100 w-full justify-center py-2">
                  {getDict('inProgress')}
                </Badge>
              )}
              
              {selectedTask.status === 'completed' && (
                <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100 w-full justify-center py-2">
                  {getDict('completed')}
                </Badge>
              )}

              {/* Client Information */}
              <div className="p-4 rounded-lg space-y-3  bg-gray-50 dark:bg-gray-750">
                <div className="font-medium flex items-center gap-2  text-gray-900 dark:text-white">
                  <User className="w-4 h-4" />
                  {getDict('clientInfo')}
                </div>
                
                <div className="space-y-2 text-sm">
                  <div>
                    <div className="text-xs mb-1  text-gray-600 dark:text-gray-400">
                      {getDict('fullName')}
                    </div>
                    <div className="font-medium  text-gray-900 dark:text-white">
                      {selectedTask.clientName}
                    </div>
                  </div>
                  
                  <div>
                    <div className="text-xs mb-1  text-gray-600 dark:text-gray-400">
                      {getDict('phone')}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-medium  text-gray-900 dark:text-white">
                        {selectedTask.clientPhone}
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleCallClient}
                        className="h-8   dark:border-gray-600"
                      >
                        <Phone className="w-3 h-3 mr-1" />
                        {getDict('call')}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Address */}
              <div className="p-4 rounded-lg space-y-3  bg-gray-50 dark:bg-gray-750">
                <div className="font-medium flex items-center gap-2  text-gray-900 dark:text-white">
                  <MapPin className="w-4 h-4" />
                  {getDict('address')}
                </div>
                
                <div className="text-sm  text-gray-700 dark:text-gray-300">
                  {selectedTask.fullAddress}
                </div>

                {selectedTask.status !== 'completed' && (
                  <Button
                    onClick={handleOpenNavigation}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    <Navigation className="w-4 h-4 mr-2" />
                    {getDict('openNavigation')}
                  </Button>
                )}
              </div>

              {/* Schedule */}
              <div className="p-4 rounded-lg  bg-gray-50 dark:bg-gray-750">
                <div className="font-medium flex items-center gap-2 mb-2  text-gray-900 dark:text-white">
                  <Clock className="w-4 h-4" />
                  {getDict('scheduledTime')}
                </div>
                <div className="text-sm  text-gray-700 dark:text-gray-300">
                  {selectedTask.scheduledTime}
                </div>
              </div>

              {/* Parcel Information */}
              <div className="p-4 rounded-lg space-y-3  bg-gray-50 dark:bg-gray-750">
                <div className="font-medium flex items-center gap-2  text-gray-900 dark:text-white">
                  <Package className="w-4 h-4" />
                  {getDict('parcelInfo')}
                </div>
                
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="text-xs mb-1  text-gray-600 dark:text-gray-400">
                      {getDict('weight')}
                    </div>
                    <div className="font-medium  text-gray-900 dark:text-white">
                      {selectedTask.weight} кг
                    </div>
                  </div>

                  <div>
                    <div className="text-xs mb-1  text-gray-600 dark:text-gray-400">
                      {getDict('numberOfPieces')}
                    </div>
                    <div className="font-medium  text-gray-900 dark:text-white">
                      {selectedTask.numberOfPieces} {getDict('pieces')}
                    </div>
                  </div>
                </div>

                <div>
                  <div className="text-xs mb-1  text-gray-600 dark:text-gray-400">
                    {getDict('contents')}
                  </div>
                  <div className="text-sm  text-gray-900 dark:text-white">
                    {selectedTask.contents}
                  </div>
                </div>

                {selectedTask.declaredValue && (
                  <div>
                    <div className="text-xs mb-1  text-gray-600 dark:text-gray-400">
                      {getDict('declaredValue')}
                    </div>
                    <div className="text-sm font-medium  text-gray-900 dark:text-white">
                      {selectedTask.declaredValue.toLocaleString()} ₸
                    </div>
                  </div>
                )}

                {selectedTask.destination && (
                  <div>
                    <div className="text-xs mb-1  text-gray-600 dark:text-gray-400">
                      {getDict('route')}
                    </div>
                    <div className="text-sm  text-gray-900 dark:text-white">
                      {selectedTask.destination}
                    </div>
                  </div>
                )}
              </div>

              {/* Notes */}
              {selectedTask.notes && (
                <div className="p-4 rounded-lg  bg-yellow-50 border border-yellow-200 dark:bg-yellow-900/20 dark:border dark:border-yellow-800">
                  <div className="text-xs mb-1 font-medium  text-yellow-800 dark:text-yellow-400">
                    {getDict('importantNotes')}
                  </div>
                  <div className="text-sm  text-yellow-900 dark:text-yellow-300">
                    {selectedTask.notes}
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            {selectedTask?.status === 'pending' && (
              <Button
                onClick={handleStartTask}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                <Navigation className="w-4 h-4 mr-2" />
                {getDict('startTask')}
              </Button>
            )}
            
            {selectedTask?.status === 'in_progress' && (
              <Button
                onClick={handleCompleteTask}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                {getDict('completeTask')}
              </Button>
            )}

            {selectedTask?.status === 'completed' && (
              <Button
                onClick={() => setShowDetailsDialog(false)}
                className="flex-1"
              >
                {getDict('close')}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}