import { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { Activity, Clock } from 'lucide-react';

interface AuditLog {
  id: string;
  user_id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  old_value: string;
  new_value: string;
  reason: string;
  created_at: string;
}

export function AuditLog({ theme }: { theme?: 'light' | 'dark' }) {
  const { t } = useLanguage();
  const isDark = theme === 'dark';
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/audit/logs', {
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
  };

  const translateAction = (action: string) => {
    // We can map backend actions to readable UI strings here, or just show raw string if simple.
    // For now returning raw action formatted slightly.
    return action.replace(/_/g, ' ');
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className={`text-2xl font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>{t('auditLog')}</h1>
        <p className="text-gray-600">{t('userActions')}</p>
      </div>

      <div className={`rounded-lg shadow-sm border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">Загрузка...</div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-gray-500">Нет записей в журнале.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className={`text-left border-b ${isDark ? 'border-gray-700 text-gray-400' : 'border-gray-200 text-gray-500'}`}>
                  <th className="px-6 py-4 font-medium">{t('date')}</th>
                  <th className="px-6 py-4 font-medium">{t('action')}</th>
                  <th className="px-6 py-4 font-medium">Сущность</th>
                  <th className="px-6 py-4 font-medium">Подробнее</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isDark ? 'divide-gray-700' : 'divide-gray-200'}`}>
                {logs.map(log => (
                  <tr key={log.id} className={`transition-colors ${isDark ? 'hover:bg-gray-750' : 'hover:bg-gray-50'}`}>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-gray-400" />
                        {new Date(log.created_at).toLocaleString()}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                        isDark ? 'bg-blue-900/50 text-blue-400' : 'bg-blue-100 text-blue-700'
                      }`}>
                        <Activity className="w-3.5 h-3.5" />
                        {translateAction(log.action)}
                      </span>
                    </td>
                    <td className={`px-6 py-4 text-sm font-medium ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>
                      {log.entity_type}
                    </td>
                    <td className={`px-6 py-4 text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                      {log.new_value ? (
                        <span>Новое значение: {log.new_value}</span>
                      ) : (
                        <span>{log.reason || '-'}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
