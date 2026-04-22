import { useState, useEffect } from 'react';
import { Package, CheckCircle, FileText, Train } from 'lucide-react';
import { BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';

interface ManagerDashboardProps {
  theme?: 'light' | 'dark';
}

interface DashboardData {
  monthlyShipments: number;
  completedShipments: number;
  activeContracts: number;
  revenueByRoute: { route: string; revenue: number; percentage: number }[];
  revenueByMonth?: { month: string; revenue: number }[];
  wagonsByStatus?: { status: string; count: number }[];
}

export function ManagerDashboard({ theme = 'light' }: ManagerDashboardProps) {
  const isDark = theme === 'dark';
  const { t } = useLanguage();
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData>({
    monthlyShipments: 0,
    completedShipments: 0,
    activeContracts: 0,
    revenueByRoute: []
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch('/api/reports/dashboard', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (res.ok) {
          const result = await res.json();

          // Calculate percentages for revenue by route
          const totalRev = result.revenueByRoute.reduce((acc: number, item: any) => acc + item.revenue, 0);
          const revenueWithPercent = result.revenueByRoute.map((item: any) => ({
            ...item,
            percentage: totalRev > 0 ? Math.round((item.revenue / totalRev) * 100) : 0
          }));

          setData({
            monthlyShipments: result.monthlyShipments,
            completedShipments: result.completedShipments,
            activeContracts: result.activeContracts,
            revenueByRoute: revenueWithPercent,
            revenueByMonth: Array.isArray(result.revenueByMonth) ? result.revenueByMonth : [],
            wagonsByStatus: Array.isArray(result.wagonsByStatus) ? result.wagonsByStatus : [],
          });
        }
      } catch (error) {
        console.error('Failed to fetch dashboard data', error);
      }
    };
    fetchData();
    // Poll every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const wagonStatus = (data.wagonsByStatus || []).map((w) => ({
    statusKey: w.status,
    count: w.count,
    color:
      w.status === 'EMPTY' ? '#6B7280' :
      w.status === 'LOADING' ? '#3B82F6' :
      w.status === 'LOADED' ? '#10B981' :
      w.status === 'IN_TRANSIT' ? '#F59E0B' :
      w.status === 'ARRIVED' ? '#8B5CF6' :
      w.status === 'UNLOADING' ? '#EF4444' :
      '#64748B'
  }));

  const monthlyRevenue = (data.revenueByMonth || []).map((m) => ({
    month: m.month,
    actual: m.revenue,
  }));

  const totalRevenue = data.revenueByRoute.reduce((sum, item) => sum + item.revenue, 0);
  const totalRouteShipments = data.revenueByRoute.reduce((sum, item) => sum + item.count, 0);
  const averageRoutePrice = totalRouteShipments > 0 ? totalRevenue / totalRouteShipments : 0;
  const totalWagons = wagonStatus.reduce((sum, item) => sum + item.count, 0);
  const wagonsWithCargo = wagonStatus.find(w => w.statusKey === 'LOADED')?.count ?? 0;
  const dashboardTitle =
    user?.role === 'chief_head'
      ? 'Панель главного руководителя'
      : user?.role === 'direction_head'
      ? 'Панель руководителя по направлению'
      : t('managerDashboard');

  return (
    <div>
      <div className="mb-6">
        <h1 className={`text-xl md:text-2xl font-semibold mb-1 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{dashboardTitle}</h1>
        <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{t('managerDashboardDesc')}</p>
      </div>

      {/* Основные показатели */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-sm p-5 text-white">
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
              <Package className="w-6 h-6 text-blue-600" />
            </div>
            <span className="text-xs font-medium">{t('month')}</span>
          </div>
          <p className="text-xs opacity-90 mb-1">{t('monthlyShipments')}</p>
          <p className="text-2xl font-bold">{data.monthlyShipments}</p>
          <p className="text-xs mt-2 opacity-75">+12% {t('vsLastMonth')}</p>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-sm p-5 text-white">
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <span className="text-xs font-medium">{t('month')}</span>
          </div>
          <p className="text-xs opacity-90 mb-1">{t('completedShipments')}</p>
          <p className="text-2xl font-bold">{data.completedShipments}</p>
          <p className="text-xs mt-2 opacity-75">96% {t('planCompletion')}</p>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-sm p-5 text-white">
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
              <FileText className="w-6 h-6 text-purple-600" />
            </div>
            <span className="text-xs font-medium">{user?.role === 'chief_head' ? 'Все направления' : 'Моё направление'}</span>
          </div>
          <p className="text-xs opacity-90 mb-1">Средняя цена по направлению</p>
          <p className="text-2xl font-bold">{Math.round(averageRoutePrice).toLocaleString('ru-RU')} ₸</p>
          <p className="text-xs mt-2 opacity-75">{data.revenueByRoute.length} направлений</p>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg shadow-sm p-5 text-white">
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
              <Train className="w-6 h-6 text-orange-600" />
            </div>
            <span className="text-xs font-medium">{t('total')}</span>
          </div>
          <p className="text-xs opacity-90 mb-1">{t('totalRevenue')}</p>
          <p className="text-2xl font-bold">{(totalRevenue / 1000000).toFixed(2)} млн ₸</p>
          <p className="text-xs mt-2 opacity-75">Грузовых вагонов: {wagonsWithCargo}</p>
        </div>
      </div>

      {/* Графики */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-6">
        {/* Выручка по направлениям */}
        <div className={`rounded-lg shadow-sm border p-5 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className={`text-base font-semibold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{t('revenueByRoute')}</h3>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{t('currentMonth')}</p>
            </div>
            <div className="text-right">
              <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{t('totalRevenue')}</p>
              <p className={`text-xl font-bold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                {(totalRevenue / 1000000).toFixed(1)} млн ₸
              </p>
            </div>
          </div>

          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={data.revenueByRoute}>
              <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#374151' : '#E5E7EB'} />
              <XAxis dataKey="route" tick={{ fontSize: 11, fill: isDark ? '#9CA3AF' : '#6B7280' }} />
              <YAxis tick={{ fontSize: 11, fill: isDark ? '#9CA3AF' : '#6B7280' }} />
              <Tooltip
                formatter={(value: any) => `${(Number(value) / 1000).toFixed(0)} тыс ₸`}
                contentStyle={{
                  borderRadius: '8px',
                  border: '1px solid #E5E7EB',
                  backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
                  color: isDark ? '#F3F4F6' : '#111827'
                }}
              />
              <Bar dataKey="revenue" fill="#3B82F6" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>

          <div className="mt-3 grid grid-cols-2 gap-2">
            {data.revenueByRoute.map((route, index) => (
              <div key={index} className={`flex items-center justify-between p-2 rounded ${isDark ? 'bg-gray-750' : 'bg-gray-50'}`}>
                <span className={`text-xs ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{route.route}</span>
                <span className={`text-xs font-semibold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{route.percentage}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Статус вагонов */}
        <div className={`rounded-lg shadow-sm border p-5 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <div className="mb-4">
            <h3 className={`text-base font-semibold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{t('wagonsByStatus')}</h3>
            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{t('total')}: {totalWagons} {t('wagons')}</p>
          </div>

          <div className="flex items-center justify-center">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={wagonStatus}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry: any) => `${entry.count}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {wagonStatus.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{
                  backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
                  color: isDark ? '#F3F4F6' : '#111827',
                  borderRadius: '8px'
                }} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-4 space-y-1.5">
            {wagonStatus.map((item, index) => (
              <div key={index} className="flex items-center justify-between p-1.5">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className={`text-xs ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{t(item.statusKey)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-semibold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{item.count}</span>
                  <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                    {((item.count / totalWagons) * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Финансовый отчет */}
      <div className={`rounded-lg shadow-sm border p-5 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-3">
          <div>
            <h3 className={`text-base font-semibold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{t('financialReport')}</h3>
            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{t('plannedActual')}</p>
          </div>
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${isDark ? 'bg-blue-900 bg-opacity-30' : 'bg-blue-50'}`}>
            {/* <TrendingUp className={`w-4 h-4 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} /> */}
            <span className={`text-xs font-medium ${isDark ? 'text-blue-300' : 'text-blue-900'}`}>{t('positiveTrend')}</span>
          </div>
        </div>

        {monthlyRevenue.length === 0 ? (
          <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Нет данных по подтвержденным платежам.</div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={monthlyRevenue}>
              <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#374151' : '#E5E7EB'} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: isDark ? '#9CA3AF' : '#6B7280' }} />
              <YAxis tick={{ fontSize: 11, fill: isDark ? '#9CA3AF' : '#6B7280' }} />
              <Tooltip
                formatter={(value: any) => `${(Number(value) / 1000000).toFixed(2)} млн ₸`}
                contentStyle={{
                  borderRadius: '8px',
                  border: '1px solid #E5E7EB',
                  backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
                  color: isDark ? '#F3F4F6' : '#111827'
                }}
              />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Line
                type="monotone"
                dataKey="actual"
                stroke="#10B981"
                strokeWidth={2.5}
                name={t('actualRevenue')}
              />
            </LineChart>
          </ResponsiveContainer>
        )}

        {/* Итоговые показатели */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className={`p-3 rounded-lg ${isDark ? 'bg-gray-750' : 'bg-gray-50'}`}>
            <p className={`text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{t('halfYearPlan')}</p>
            <p className={`text-xl font-bold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>—</p>
          </div>
          <div className={`p-3 rounded-lg ${isDark ? 'bg-green-900 bg-opacity-30' : 'bg-green-50'}`}>
            <p className={`text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{t('actualRevenue')}</p>
            <p className={`text-xl font-bold ${isDark ? 'text-green-400' : 'text-green-700'}`}>
              {(monthlyRevenue.reduce((acc, i) => acc + (i.actual || 0), 0) / 1000000).toFixed(2)} млн ₸
            </p>
          </div>
          <div className={`p-3 rounded-lg ${isDark ? 'bg-blue-900 bg-opacity-30' : 'bg-blue-50'}`}>
            <p className={`text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{t('planExecution')}</p>
            <p className={`text-xl font-bold ${isDark ? 'text-blue-400' : 'text-blue-700'}`}>—</p>
          </div>
        </div>
      </div>
    </div>
  );
}