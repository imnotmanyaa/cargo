import re
import os

with open("CourierDashboard.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# 1. Remove theme prop
content = re.sub(r"interface ThemeProps \{\n\s*theme: 'light' \| 'dark';\n\}\n", "", content)
content = content.replace("export function CourierDashboard({ theme }: ThemeProps) {", "export function CourierDashboard() {")

# 2. Replace theme logic with Tailwind dark: classes
# Examples: 
# className={theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white'} -> className="bg-white dark:bg-gray-800 dark:border-gray-700"
# className={`text-lg sm:text-xl ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`} -> className="text-lg sm:text-xl text-gray-900 dark:text-white"

# Regex replacement for dynamic classes:
def replace_dynamic(m):
    prefix = m.group(1) or ""
    dark_classes = m.group(2).strip()
    light_classes = m.group(3).strip()
    dark_converted = " ".join([f"dark:{c}" for c in dark_classes.split() if c])
    res = f'{prefix} {light_classes} {dark_converted}'.strip()
    return f'className="{res}"'

content = re.sub(r'className=\{`([^`]*)\$\{theme === \'dark\' \? \'([^\']*)\' : \'([^\']*)\'\}`\}', replace_dynamic, content)

def replace_ternary(m):
    dark_classes = m.group(1).strip()
    light_classes = m.group(2).strip()
    dark_converted = " ".join([f"dark:{c}" for c in dark_classes.split() if c])
    res = f'{light_classes} {dark_converted}'.strip()
    return f'className="{res}"'

content = re.sub(r'className=\{theme === \'dark\' \? \'([^\']*)\' : \'([^\']*)\'\}', replace_ternary, content)

# 3. Add API integration
api_imports = """
import { useEffect } from 'react';
import { withApiBase } from '../lib/api-base';
"""
content = content.replace("import { useState } from 'react';", "import { useState, useEffect } from 'react';\nimport { withApiBase } from '../lib/api-base';")

# Replace tasks state with real loading
mock_tasks_regex = r"// Mock delivery tasks\s*const \[tasks, setTasks\] = useState<DeliveryTask\[\]>\(\[.*?\]\);"
real_tasks_logic = """
  const [tasks, setTasks] = useState<DeliveryTask[]>([]);
  const [loading, setLoading] = useState(false);

  const getStatusTranslation = (status: string) => {
    const lang = localStorage.getItem('language') || 'ru';
    const dict: Record<string, any> = {
      ru: {
        'Created (Door-to-door)': 'Ожидает курьера',
        'Pickup Assigned': 'Назначена курьеру',
        'Picked Up': 'Забрана курьером',
        'Payment Pending': 'Ожидает оплаты',
        'Paid': 'Оплачена',
      },
      kz: {
        'Created (Door-to-door)': 'Курьерді күтуде',
        'Pickup Assigned': 'Курьерге тағайындалды',
        'Picked Up': 'Курьер алып кетті',
        'Payment Pending': 'Төлемді күтуде',
        'Paid': 'Төленді',
      },
      en: {
        'Created (Door-to-door)': 'Waiting for Courier',
        'Pickup Assigned': 'Assigned to Courier',
        'Picked Up': 'Picked Up by Courier',
        'Payment Pending': 'Payment Pending',
        'Paid': 'Paid',
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
        
        if (sh.shipment_status === 'Pickup Assigned') status = 'in_progress';
        if (sh.shipment_status === 'Picked Up') status = 'completed';
        if (sh.shipment_status === 'Payment Pending' || sh.shipment_status === 'Paid') {
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
          weight: parseFloat(sh.weight) || 0,
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

  useEffect(() => {
    loadTasks();
  }, []);
"""
content = re.sub(mock_tasks_regex, real_tasks_logic, content, flags=re.DOTALL)

# Replace handleStartTask
content = content.replace("""  const handleStartTask = () => {
    if (!selectedTask) return;

    const updatedTasks = tasks.map(task =>
      task.id === selectedTask.id
        ? { ...task, status: 'in_progress' as const }
        : task
    );
    setTasks(updatedTasks);
    setSelectedTask({ ...selectedTask, status: 'in_progress' });
    toast.success(t('taskStarted'));
  };""", """  const handleStartTask = async () => {
    if (!selectedTask) return;
    try {
      const resp = await fetch(withApiBase(`/api/shipments/${selectedTask.id}/pickup-start`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user?.token || ''}` }
      });
      if (resp.ok) {
        await loadTasks();
        setSelectedTask({ ...selectedTask, status: 'in_progress' });
        toast.success(t('taskStarted') || 'Задача начата');
      }
    } catch (e) {}
  };""")

# Replace handleCompleteTask
content = content.replace("""  const handleCompleteTask = () => {
    if (!selectedTask) return;

    const updatedTasks = tasks.map(task =>
      task.id === selectedTask.id
        ? { ...task, status: 'completed' as const }
        : task
    );
    setTasks(updatedTasks);
    toast.success(
      selectedTask.type === 'pickup' 
        ? t('pickupCompleted') 
        : t('deliveryCompleted')
    );
    setShowDetailsDialog(false);
    setSelectedTask(null);
  };""", """  const handleCompleteTask = async () => {
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
            ? (t('pickupCompleted') || 'Забор завершен')
            : (t('deliveryCompleted') || 'Доставка завершена')
        );
        setShowDetailsDialog(false);
        setSelectedTask(null);
      }
    } catch (e) {}
  };""")

# Replace 2GIS navigation
content = content.replace("window.open(`https://maps.google.com/?q=${address}`, '_blank');", "window.open(`https://2gis.kz/search/${address}`, '_blank');")

# Fix courier position to use User station
content = content.replace("Алматы, зона доставки: Центр", "{user?.station || 'Нет станции'}")

# Use the translated status in badges
content = content.replace("{task.type === 'pickup' ? t('pickup') : t('delivery')}", "{task.type === 'pickup' ? (t('pickup') || 'Забор') : (t('delivery') || 'Доставка')} - {getStatusTranslation(task.rawStatus)}")

with open("src/components/CourierDashboard.tsx", "w", encoding="utf-8") as f:
    f.write(content)

os.remove("CourierDashboard.tsx")
print("Done")
