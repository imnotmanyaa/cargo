import { useState, useEffect } from 'react';
import { UserPlus, Shield, Users, Edit2, Trash2, Search } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface Employee {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'operator' | 'receiver';
  station: string;
  createdAt: string;
  status: 'active' | 'inactive';
}

interface AdminDashboardProps {
  theme?: 'light' | 'dark';
}

export function AdminDashboard({ theme = 'light' }: AdminDashboardProps) {
  const isDark = theme === 'dark';
  const { t } = useLanguage();

  const [employees, setEmployees] = useState<Employee[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/admin/employees', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        // Map created_at to createdAt
        const mapped = data.map((emp: any) => ({
          ...emp,
          createdAt: emp.created_at
        }));
        setEmployees(mapped);
      }
    } catch (error) {
      console.error('Failed to fetch employees:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'operator' as 'admin' | 'manager' | 'operator' | 'receiver',
    station: ''
  });

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/admin/employees', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        await fetchEmployees();
        setShowCreateForm(false);
        setFormData({
          name: '',
          email: '',
          password: '',
          role: 'operator',
          station: ''
        });
        alert(t('employeeCreatedSuccess'));
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to create employee');
      }
    } catch (error) {
      console.error('Failed to create employee:', error);
      alert('Failed to create employee');
    }
  };

  const handleDeleteEmployee = async (id: string) => {
    if (confirm(t('deleteEmployeeConfirm'))) {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/admin/employees/${id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          setEmployees(employees.filter(emp => emp.id !== id));
        }
      } catch (error) {
        console.error('Failed to delete employee:', error);
      }
    }
  };

  const handleToggleStatus = (id: string) => {
    // Optimistic update for now
    setEmployees(employees.map(emp =>
      emp.id === id
        ? { ...emp, status: emp.status === 'active' ? 'inactive' : 'active' }
        : emp
    ));
  };

  const filteredEmployees = employees.filter(emp =>
    emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.station.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const stations = [
    'Алматы-1',
    'Астана Нұрлы Жол',
    'Шымкент',
    'Ақтөбе',
    'Қарағанды'
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className={`text-xl md:text-2xl font-semibold mb-1 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{t('employeeManagement')}</h1>
        <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{t('employeeManagementDesc')}</p>
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className={`rounded-lg shadow-sm border p-5 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <div className="flex items-center gap-3 mb-2">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isDark ? 'bg-blue-900' : 'bg-blue-100'}`}>
              <Users className={`w-5 h-5 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
            </div>
            <div>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{t('totalEmployees')}</p>
              <p className={`text-2xl font-semibold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{employees.length}</p>
            </div>
          </div>
        </div>

        <div className={`rounded-lg shadow-sm border p-5 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <div className="flex items-center gap-3 mb-2">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isDark ? 'bg-green-900' : 'bg-green-100'}`}>
              <Shield className={`w-5 h-5 ${isDark ? 'text-green-400' : 'text-green-600'}`} />
            </div>
            <div>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{t('operators')}</p>
              <p className={`text-2xl font-semibold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                {employees.filter(e => e.role === 'operator').length}
              </p>
            </div>
          </div>
        </div>

        <div className={`rounded-lg shadow-sm border p-5 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <div className="flex items-center gap-3 mb-2">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isDark ? 'bg-orange-900' : 'bg-orange-100'}`}>
              <Shield className={`w-5 h-5 ${isDark ? 'text-orange-400' : 'text-orange-600'}`} />
            </div>
            <div>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{t('receivers')}</p>
              <p className={`text-2xl font-semibold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                {employees.filter(e => e.role === 'receiver').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Поиск и кнопка создания */}
      <div className={`rounded-lg shadow-sm border p-5 mb-6 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
          <div className="relative flex-1 max-w-md">
            <Search className={`w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('searchByNameEmail')}
              className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDark ? 'bg-gray-700 border-gray-600 text-gray-200 placeholder-gray-400' : 'border-gray-300'
                }`}
            />
          </div>

          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 whitespace-nowrap"
          >
            <UserPlus className="w-5 h-5" />
            {t('createEmployee')}
          </button>
        </div>
      </div>

      {/* Форма создания */}
      {showCreateForm && (
        <div className={`rounded-lg shadow-sm border p-5 mb-6 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <h3 className={`text-base font-semibold mb-4 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{t('newEmployee')}</h3>

          <form onSubmit={handleCreateEmployee} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  {t('fullName')}
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDark ? 'bg-gray-700 border-gray-600 text-gray-200' : 'border-gray-300'
                    }`}
                  placeholder={t('enterFullName')}
                  required
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  {t('email')}
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDark ? 'bg-gray-700 border-gray-600 text-gray-200' : 'border-gray-300'
                    }`}
                  placeholder={t('enterEmail')}
                  required
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  {t('password')}
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDark ? 'bg-gray-700 border-gray-600 text-gray-200' : 'border-gray-300'
                    }`}
                  placeholder={t('enterPassword')}
                  required
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  {t('role')}
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as 'admin' | 'manager' | 'operator' | 'receiver' })}
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDark ? 'bg-gray-700 border-gray-600 text-gray-200' : 'border-gray-300'
                    }`}
                  required
                >
                  <option value="admin">Администратор</option>
                  <option value="manager">Руководитель (Manager)</option>
                  <option value="operator">{t('operator')}</option>
                  <option value="receiver">{t('receiver')}</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  {t('station')}
                </label>
                <select
                  value={formData.station}
                  onChange={(e) => setFormData({ ...formData, station: e.target.value })}
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDark ? 'bg-gray-700 border-gray-600 text-gray-200' : 'border-gray-300'
                    }`}
                  required
                >
                  <option value="">{t('selectStation')}</option>
                  {stations.map(station => (
                    <option key={station} value={station}>{station}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                {t('createButton')}
              </button>
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className={`px-6 py-2 border rounded-lg ${isDark ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
              >
                {t('cancel')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Список сотрудников */}
      <div className={`rounded-lg shadow-sm border overflow-hidden ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className={`border-b ${isDark ? 'bg-gray-750 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
              <tr>
                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  {t('employeeLabel')}
                </th>
                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  {t('email')}
                </th>
                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  {t('role')}
                </th>
                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  {t('station')}
                </th>
                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  {t('statusEmployee')}
                </th>
                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  {t('dateCreated')}
                </th>
                <th className={`px-6 py-3 text-right text-xs font-medium uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  {t('actionsEmployee')}
                </th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDark ? 'divide-gray-700' : 'divide-gray-200'}`}>
              {filteredEmployees.map((employee) => (
                <tr key={employee.id} className={isDark ? 'hover:bg-gray-750' : 'hover:bg-gray-50'}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isDark ? 'bg-blue-900' : 'bg-blue-100'}`}>
                        <span className={`font-medium ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                          {employee.name.charAt(0)}
                        </span>
                      </div>
                      <div className="ml-3">
                        <div className={`text-sm font-medium ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>{employee.name}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-900'}`}>{employee.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${employee.role === 'operator' ? 'bg-blue-100 text-blue-800' :
                        employee.role === 'receiver' ? 'bg-orange-100 text-orange-800' :
                          employee.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                            'bg-green-100 text-green-800'
                      }`}>
                      {employee.role === 'operator' ? t('operator') :
                        employee.role === 'receiver' ? t('receiver') :
                          employee.role === 'admin' ? 'Администратор' :
                            'Руководитель'}
                    </span>
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm ${isDark ? 'text-gray-300' : 'text-gray-900'}`}>
                    {employee.station}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => handleToggleStatus(employee.id)}
                      className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${employee.status === 'active'
                        ? 'bg-green-100 text-green-800 hover:bg-green-200'
                        : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                        }`}
                    >
                      {employee.status === 'active' ? t('activeStatus') : t('inactiveStatus')}
                    </button>
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    {new Date(employee.createdAt).toLocaleDateString('ru-RU')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        className={isDark ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-900'}
                        title="Редактировать"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteEmployee(employee.id)}
                        className={isDark ? 'text-red-400 hover:text-red-300' : 'text-red-600 hover:text-red-900'}
                        title="Удалить"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredEmployees.length === 0 && (
          <div className="text-center py-12">
            <Users className={`w-12 h-12 mx-auto mb-3 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
            <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>{t('noEmployeesFound')}</p>
          </div>
        )}
      </div>
    </div>
  );
}