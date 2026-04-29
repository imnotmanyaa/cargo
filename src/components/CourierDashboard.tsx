import { useEffect, useState } from 'react';
import { MapPin, Phone } from 'lucide-react';
import { withApiBase } from '../lib/api-base';

type CourierTask = {
  id: string;
  shipment_number: string;
  shipment_status: string;
  pickup_address?: string;
  door_to_door_phone?: string;
  client_name: string;
};

export function CourierDashboard() {
  const [tasks, setTasks] = useState<CourierTask[]>([]);
  const [loading, setLoading] = useState(false);

  const loadTasks = async () => {
    setLoading(true);
    try {
      const resp = await fetch(withApiBase('/api/courier/tasks'));
      if (!resp.ok) throw new Error('Failed to load tasks');
      const data = await resp.json();
      setTasks(Array.isArray(data) ? data : []);
    } catch {
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  const doAction = async (id: string, action: 'pickup-start' | 'pickup-confirm') => {
    const payload =
      action === 'pickup-confirm'
        ? { confirmed_at: new Date().toISOString() }
        : {};
    const resp = await fetch(withApiBase(`/api/shipments/${id}/${action}`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (resp.ok) loadTasks();
  };

  useEffect(() => {
    loadTasks();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 p-4">
      <div className="max-w-xl mx-auto space-y-3">
        <h1 className="text-xl font-bold text-slate-900">Задачи курьера</h1>
        {loading && <p className="text-sm text-slate-500">Загрузка...</p>}
        {!loading && tasks.length === 0 && (
          <div className="rounded-xl border border-slate-200 bg-white p-4 text-slate-600">Новых задач нет</div>
        )}
        {tasks.map((task) => (
          <div key={task.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-slate-900">{task.shipment_number}</p>
              <span className="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-700">{task.shipment_status}</span>
            </div>
            <p className="text-sm text-slate-700 mt-2">{task.client_name}</p>
            {task.pickup_address && (
              <p className="text-sm text-slate-600 mt-2 flex items-center gap-2"><MapPin className="w-4 h-4" />{task.pickup_address}</p>
            )}
            {task.door_to_door_phone && (
              <a className="text-sm text-blue-700 mt-1 inline-flex items-center gap-2" href={`tel:${task.door_to_door_phone}`}>
                <Phone className="w-4 h-4" />
                {task.door_to_door_phone}
              </a>
            )}
            <div className="grid grid-cols-2 gap-2 mt-4">
              <button onClick={() => doAction(task.id, 'pickup-start')} className="py-2 rounded-xl bg-blue-700 text-white text-sm">
                Принять
              </button>
              <button onClick={() => doAction(task.id, 'pickup-confirm')} className="py-2 rounded-xl bg-amber-500 text-slate-950 text-sm font-medium">
                Забрал груз
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
