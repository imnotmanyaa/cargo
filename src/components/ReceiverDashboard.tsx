import { useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { Package, Train, CheckCircle, Clock, MapPin } from 'lucide-react';

interface Task {
  id: string;
  type: 'load' | 'unload';
  trainNumber: string;
  carNumber: string;
  shipments: Array<{
    id: string;
    cellNumber: string;
    destination: string;
    weight: string;
    loaded?: boolean;
  }>;
  route: string;
  departureTime: string;
  status: 'pending' | 'in-progress' | 'completed';
}

interface ReceiverDashboardProps {
  theme?: 'light' | 'dark';
}

export function ReceiverDashboard({ theme = 'light' }: ReceiverDashboardProps) {
  const isDark = theme === 'dark';
  const { t } = useLanguage();
  const [tasks, setTasks] = useState<Task[]>([
    {
      id: 'T-001',
      type: 'load',
      trainNumber: '№ 15',
      carNumber: '8',
      shipments: [
        { id: 'SH-2024-001', cellNumber: 'A-01', destination: 'Астана', weight: '15 кг', loaded: false },
        { id: 'SH-2024-003', cellNumber: 'A-03', destination: 'Астана', weight: '12 кг', loaded: false },
        { id: 'SH-2024-007', cellNumber: 'B-02', destination: 'Астана', weight: '8 кг', loaded: false },
      ],
      route: 'Алматы → Астана',
      departureTime: '14:30',
      status: 'pending'
    },
    {
      id: 'T-002',
      type: 'load',
      trainNumber: '№ 22',
      carNumber: '5',
      shipments: [
        { id: 'SH-2024-005', cellNumber: 'A-05', destination: 'Шымкент', weight: '25 кг', loaded: true },
        { id: 'SH-2024-009', cellNumber: 'B-03', destination: 'Шымкент', weight: '18 кг', loaded: false },
      ],
      route: 'Алматы → Шымкент',
      departureTime: '16:45',
      status: 'in-progress'
    }
  ]);

  const toggleShipmentLoaded = (taskId: string, shipmentId: string) => {
    setTasks(prevTasks => prevTasks.map(task => {
      if (task.id === taskId) {
        return {
          ...task,
          shipments: task.shipments.map(shipment =>
            shipment.id === shipmentId
              ? { ...shipment, loaded: !shipment.loaded }
              : shipment
          )
        };
      }
      return task;
    }));
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className={`text-2xl font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>{t('receiverDashboard')}</h1>
        <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Погрузка и разгрузка вагонов</p>
      </div>

      <div className="grid gap-4">
        {tasks.map((task) => {
          const loadedCount = task.shipments.filter(s => s.loaded).length;
          const totalCount = task.shipments.length;
          const isComplete = loadedCount === totalCount;

          return (
            <div key={task.id} className={`rounded-lg border overflow-hidden ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
              {/* Компактная шапка задачи */}
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

              {/* Прогресс-бар */}
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
                    className={`h-2 rounded-full transition-all ${
                      isComplete ? 'bg-green-500' : 'bg-blue-500'
                    }`}
                    style={{ width: `${(loadedCount / totalCount) * 100}%` }}
                  />
                </div>
              </div>

              {/* Компактный список грузов */}
              <div className={`divide-y ${isDark ? 'divide-gray-700' : 'divide-gray-100'}`}>
                {task.shipments.map((shipment) => (
                  <div
                    key={shipment.id}
                    className={`p-4 transition-colors ${
                      shipment.loaded 
                        ? (isDark ? 'bg-green-900/20' : 'bg-green-50')
                        : (isDark ? 'hover:bg-gray-750' : 'hover:bg-gray-50')
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                          shipment.loaded 
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
                            <div className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>Ячейка</div>
                            <div className={`font-medium text-sm ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>{shipment.cellNumber}</div>
                          </div>
                          <div>
                            <div className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>Назначение</div>
                            <div className={`font-medium text-sm ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>{shipment.destination}</div>
                          </div>
                          <div>
                            <div className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>Вес</div>
                            <div className={`font-medium text-sm ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>{shipment.weight}</div>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => toggleShipmentLoaded(task.id, shipment.id)}
                        className={`ml-4 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          shipment.loaded
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

              {/* Индикатор завершения */}
              {isComplete && (
                <div className={`border-t p-3 ${
                  isDark 
                    ? 'bg-green-900/20 border-green-800' 
                    : 'bg-green-50 border-green-200'
                }`}>
                  <div className={`flex items-center justify-center gap-2 ${isDark ? 'text-green-400' : 'text-green-700'}`}>
                    <CheckCircle className="w-4 h-4" />
                    <span className="text-sm font-medium">Все грузы погружены</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}