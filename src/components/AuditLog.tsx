import { withApiBase } from "../lib/api-base";
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Activity, Search, Filter, RefreshCw, Package, X } from 'lucide-react';

interface AuditLog {
  id: string;
  user_id?: string;
  user_name?: string;
  user_role?: string;
  entity_type: string;
  entity_id: string;
  action: string;
  old_value?: string;
  new_value?: string;
  reason?: string;
  station_id?: string;
  shipment_number?: string;
  created_at: string;
}

// ─── Словари ──────────────────────────────────────────────────────────────
const ACTION_LABELS: Record<string, string> = {
  CREATE_SHIPMENT:           'Оформление посылки',
  SCAN:                      'Сканирование',
  SCAN_LOADED:               'Сканирование (погрузка)',
  SCAN_TRANSIT:              'Сканирование (транзит)',
  'Shipment created':        'Оформление посылки',
  'Shipment loaded':         'Погружено в вагон',
  'Shipment dispatched':     'Отправлено',
  'Shipment arrived':        'Прибыло',
  'Ready for loading':       'Готово к погрузке',
  'Ready for delivery task': 'Готово к доставке',
  'Courier handover':        'Сдано курьером',
  'Station intake':          'Принято на склад',
  'Courier picked up':       'Курьер забрал',
  ISSUE:                     'Выдача посылки',
  'ISSUED':                  'Выдача посылки',
  POST_PAYMENT_CORRECTION:   'Корректировка после оплаты',
  TRANSIT:                   'Транзит',
  ARRIVED:                   'Прибытие',
  PAYMENT_CONFIRMED:         'Оплата подтверждена',
  CANCEL:                    'Отмена',
  HOLD:                      'Задержка',
  DAMAGE:                    'Повреждение',
  WEIGHT_CONFIRM:            'Взвешивание',
};

const STATUS_LABELS: Record<string, string> = {
  CREATED:            'Создана',
  CREATED_DOOR:       'Создана (дверь-дверь)',
  PAYMENT_PENDING:    'Ожидает оплаты',
  PAID:               'Оплачена',
  PICKUP_ASSIGNED:    'Курьер назначен',
  PICKED_UP:          'Забрана курьером',
  AT_STATION_INTAKE:  'Принята на склад',
  READY_FOR_LOADING:  'Готова к погрузке',
  LOADED:             'В вагоне',
  IN_TRANSIT:         'В транзите',
  ARRIVED:            'Прибыла',
  READY_FOR_ISSUE:    'Готова к выдаче',
  DELIVERY_ASSIGNED:  'Курьер забирает из отделения',
  ISSUED:             'Выдана',
  CLOSED:             'Закрыта',
  CANCELLED:          'Отменена',
  ON_HOLD:            'Задержана',
  DAMAGED:            'Повреждена',
};

const ROLE_LABELS: Record<string, string> = {
  manager:        'Менеджер',
  receiver:       'Приёмосдатчик',
  train_receiver: 'Приёмосдатчик в поезде',
  courier:        'Курьер',
  individual:     'Клиент',
  corporate:      'Компания',
  admin:          'Администратор',
  chief_head:     'Главный руководитель',
  direction_head: 'Руководитель направления',
  loading_operator: 'Оператор погрузки',
  transit_operator: 'Оператор транзита',
  issue_operator:   'Оператор выдачи',
  accounting:       'Бухгалтер',
  mobile_group:     'Мобильная группа',
  system:           'Система',
};

// Группы действий для фильтра
const ACTION_GROUPS: { label: string; actions: string[] }[] = [
  { label: 'Все действия',    actions: [] },
  { label: 'Оформление',      actions: ['CREATE_SHIPMENT', 'Shipment created'] },
  { label: 'Сканирование',    actions: ['SCAN', 'SCAN_LOADED', 'SCAN_TRANSIT'] },
  { label: 'Погрузка/Транзит', actions: ['Shipment loaded', 'Shipment dispatched', 'Ready for loading', 'TRANSIT'] },
  { label: 'Прибытие',        actions: ['Shipment arrived', 'ARRIVED', 'Ready for delivery task'] },
  { label: 'Выдача',          actions: ['ISSUE', 'ISSUED'] },
  { label: 'Курьер',          actions: ['Courier handover', 'Courier picked up', 'Station intake', 'PICKUP_ASSIGNED'] },
  { label: 'Оплата',          actions: ['PAYMENT_CONFIRMED', 'POST_PAYMENT_CORRECTION'] },
  { label: 'Прочее',          actions: ['CANCEL', 'HOLD', 'DAMAGE', 'WEIGHT_CONFIRM'] },
];

function getReadableAction(action: string): string {
  return ACTION_LABELS[action] || action;
}

function getStatusLabel(val?: string): string {
  if (!val) return '';
  return STATUS_LABELS[val] || val;
}

function formatDate(d: string) {
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return d;
  return dt.toLocaleString('ru-RU', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  });
}

function getActionColor(action: string, isDark: boolean) {
  if (action.includes('CREATE') || action === 'Shipment created')
    return isDark ? 'text-blue-400' : 'text-blue-600';
  if (action.includes('ISSUE') || action === 'ISSUED')
    return isDark ? 'text-green-400' : 'text-green-600';
  if (action.includes('CANCEL'))
    return isDark ? 'text-red-400' : 'text-red-600';
  if (action.includes('PAYMENT'))
    return isDark ? 'text-yellow-400' : 'text-yellow-600';
  if (action.includes('DAMAGE'))
    return isDark ? 'text-orange-400' : 'text-orange-600';
  return isDark ? 'text-gray-300' : 'text-gray-700';
}

export function AuditLog({ theme }: { theme?: 'light' | 'dark' }) {
  const isDark = theme === 'dark';
  const { user } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [searchShipment, setSearchShipment] = useState('');
  const [searchShipmentInput, setSearchShipmentInput] = useState('');
  const [searchActor, setSearchActor] = useState('');
  const [actionGroup, setActionGroup] = useState(0);

  const fetchLogs = useCallback(async (shipmentNum?: string) => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (shipmentNum) params.set('shipment', shipmentNum);
      const res = await fetch(withApiBase(`/api/audit/logs?${params}`), {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setLogs(data || []);
      }
    } catch (e) {
      console.error('Failed to fetch audit logs', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const handleShipmentSearch = () => {
    const v = searchShipmentInput.trim();
    setSearchShipment(v);
    fetchLogs(v || undefined);
  };

  const clearShipmentSearch = () => {
    setSearchShipmentInput('');
    setSearchShipment('');
    fetchLogs();
  };

  // Client-side filtering
  const filtered = logs.filter(log => {
    if (searchActor) {
      const actor = (log.user_name || '').toLowerCase();
      if (!actor.includes(searchActor.toLowerCase())) return false;
    }
    if (actionGroup > 0) {
      const group = ACTION_GROUPS[actionGroup];
      if (!group.actions.some(a => log.action.includes(a) || a.includes(log.action))) return false;
    }
    return true;
  });

  // ─── Styles ──────────────────────────────────────────────────────────────
  const bg = isDark ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900';
  const card = isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200';
  const input = isDark
    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500'
    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-blue-500';
  const tabActive = isDark ? 'border-blue-500 text-blue-400' : 'border-blue-500 text-blue-600';
  const tabInactive = isDark ? 'border-transparent text-gray-400 hover:text-gray-300' : 'border-transparent text-gray-500 hover:text-gray-700';

  return (
    <div className={`min-h-screen ${bg}`}>
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Activity className={`w-6 h-6 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
            <h1 className="text-2xl font-bold">Журнал аудита</h1>
          </div>
          <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>
            {filtered.length} записей{searchShipment ? ` по посылке ${searchShipment}` : ''}
          </p>
        </div>
        <button
          onClick={() => fetchLogs(searchShipment || undefined)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
            isDark ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'
          }`}
        >
          <RefreshCw className="w-4 h-4" />
          Обновить
        </button>
      </div>

      {/* Filters */}
      <div className={`rounded-xl border p-4 mb-6 ${card}`}>
        <div className="flex items-center gap-2 mb-3">
          <Filter className={`w-4 h-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
          <span className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Фильтры</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          {/* Поиск по грузу */}
          <div>
            <label className={`text-xs mb-1 block font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              <Package className="w-3 h-3 inline mr-1" />
              Поиск по номеру груза
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                <input
                  type="text"
                  placeholder="SH-123456"
                  value={searchShipmentInput}
                  onChange={e => setSearchShipmentInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleShipmentSearch()}
                  className={`w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${input}`}
                />
              </div>
              <button
                onClick={handleShipmentSearch}
                className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Найти
              </button>
              {searchShipment && (
                <button onClick={clearShipmentSearch} className="px-2 py-2 text-red-500 hover:bg-red-50 rounded-lg">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Поиск по сотруднику */}
          <div>
            <label className={`text-xs mb-1 block font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Поиск по имени сотрудника
            </label>
            <div className="relative">
              <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
              <input
                type="text"
                placeholder="Имя Фамилия..."
                value={searchActor}
                onChange={e => setSearchActor(e.target.value)}
                className={`w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${input}`}
              />
            </div>
          </div>
        </div>

        {/* Action type tabs */}
        <div>
          <label className={`text-xs mb-2 block font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            Тип действия
          </label>
          <div className={`flex flex-wrap gap-4 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
            {ACTION_GROUPS.map((group, idx) => (
              <button
                key={idx}
                onClick={() => setActionGroup(idx)}
                className={`px-1 pb-2 text-sm font-medium border-b-2 transition-colors -mb-[1px] ${
                  actionGroup === idx ? tabActive : tabInactive
                }`}
              >
                {group.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Logs */}
      {isLoading ? (
        <div className="py-16 text-center">
          <RefreshCw className={`w-8 h-8 animate-spin mx-auto mb-3 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
          <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>Загрузка...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className={`rounded-xl border p-12 text-center ${card}`}>
          <Activity className="w-16 h-16 mx-auto mb-4 opacity-30" />
          <p className={`text-lg font-medium ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Записей не найдено</p>
        </div>
      ) : (
        <div className={`rounded-xl border overflow-hidden ${card}`}>
          {/* Desktop table */}
          <table className="hidden md:table w-full">
            <thead className={`border-b text-left text-xs font-medium uppercase tracking-wider ${
              isDark ? 'border-gray-700 text-gray-400 bg-gray-750' : 'border-gray-200 text-gray-500 bg-gray-50'
            }`}>
              <tr>
                <th className="px-5 py-3 w-40">Дата и время</th>
                <th className="px-5 py-3 w-44">Сотрудник</th>
                <th className="px-5 py-3 w-32">Груз</th>
                <th className="px-5 py-3">Действие</th>
                <th className="px-5 py-3 w-48">Изменение статуса</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDark ? 'divide-gray-700' : 'divide-gray-100'}`}>
              {filtered.map(log => (
                <tr key={log.id} className={isDark ? 'hover:bg-gray-750' : 'hover:bg-gray-50'}>
                  <td className={`px-5 py-3 text-xs whitespace-nowrap ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    {formatDate(log.created_at)}
                  </td>
                  <td className="px-5 py-3">
                    <div className={`text-sm font-medium ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>
                      {log.user_name || 'Неизвестно'}
                    </div>
                    {log.user_role && (
                      <div className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                        {ROLE_LABELS[log.user_role] || log.user_role}
                      </div>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    {log.shipment_number ? (
                      <span className={`text-sm font-semibold ${
                        isDark ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        {log.shipment_number}
                      </span>
                    ) : (
                      <span className={`text-sm ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>—</span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <div className={`flex items-center gap-2 text-sm font-medium ${getActionColor(log.action, isDark)}`}>
                      <span>{getReadableAction(log.action)}</span>
                    </div>
                    {log.reason && (
                      <div className={`text-xs mt-0.5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                        Причина: {log.reason}
                      </div>
                    )}
                    {log.station_id && (
                      <div className={`text-xs mt-0.5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                        {log.station_id}
                      </div>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    {(log.old_value || log.new_value) && (
                      <div className="flex items-center gap-2 text-sm">
                        {log.old_value && (
                          <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>
                            {getStatusLabel(log.old_value)}
                          </span>
                        )}
                        {log.old_value && log.new_value && <span className={isDark ? 'text-gray-500' : 'text-gray-400'}>→</span>}
                        {log.new_value && (
                          <span className={`font-medium ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>
                            {getStatusLabel(log.new_value)}
                          </span>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Mobile cards */}
          <div className="md:hidden divide-y divide-gray-100 dark:divide-gray-700">
            {filtered.map(log => (
              <div key={log.id} className={`p-4 ${isDark ? 'hover:bg-gray-750' : 'hover:bg-gray-50'}`}>
                <div className="flex items-start justify-between mb-1">
                  <div className={`text-sm font-medium flex items-center gap-1 ${getActionColor(log.action, isDark)}`}>
                    {getReadableAction(log.action)}
                  </div>
                  {log.shipment_number && (
                    <span className={`text-sm font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      {log.shipment_number}
                    </span>
                  )}
                </div>
                <div className={`text-sm font-medium mb-1 ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>
                  {log.user_name || 'Неизвестно'}
                  {log.user_role && <span className={`ml-1 text-xs font-normal ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>({ROLE_LABELS[log.user_role] || log.user_role})</span>}
                </div>
                {(log.old_value || log.new_value) && (
                  <div className="flex items-center gap-1 text-sm mb-1">
                    {log.old_value && <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>{getStatusLabel(log.old_value)}</span>}
                    {log.old_value && log.new_value && <span className={isDark ? 'text-gray-500' : 'text-gray-400'}>→</span>}
                    {log.new_value && <span className={`font-medium ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>{getStatusLabel(log.new_value)}</span>}
                  </div>
                )}
                <div className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{formatDate(log.created_at)}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
