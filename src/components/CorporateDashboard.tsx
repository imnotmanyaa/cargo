import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Wallet, Package, FileText, MapPin, Download, TrendingUp, Plus, X, CreditCard } from 'lucide-react';

interface CorporateDashboardProps {
  theme?: 'light' | 'dark';
}

export function CorporateDashboard({ theme = 'light' }: CorporateDashboardProps) {
  const isDark = theme === 'dark';
  const { user, updateUser } = useAuth(); // Need login to update user state if possible, or we need a way to refresh user
  // Actually useAuth might not expose a refresh method. 
  // We can manually update the user object in local state or context if we had access.
  // For now, I'll just rely on a page reload or maybe `login` with current creds if I had them?
  // Wait, `useAuth` usually provides `user` and `login`, `logout`. 
  // To update balance in UI, I need to update the `user` context. 
  // If `AuthContext` doesn't support update, I might need to hack it or just show an alert.
  // Let's assume for now I will just show success alert and maybe reload window to refresh data from server if `useAuth` fetches on mount.
  // Best way: add a `refreshUser` to AuthContext, but that is out of scope.
  // I will just reload the page for now as a simple fix.

  const { t } = useLanguage();
  const [showTopUpModal, setShowTopUpModal] = useState(false);
  const [amount, setAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const shipments = [
    { id: 'SH-2024-101', from: 'Алматы', to: 'Астана', status: 'В пути', progress: 65, date: '20.01.2026' },
    { id: 'SH-2024-102', from: 'Шымкент', to: 'Қарағанды', status: 'Погружен', progress: 20, date: '20.01.2026' },
    { id: 'SH-2024-103', from: 'Астана', to: 'Алматы', status: 'Прибыл', progress: 100, date: '19.01.2026' },
  ];

  const handleTopUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/payments/topup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ userId: user.id, amount: parseFloat(amount) })
      });

      if (res.ok) {
        const data = await res.json();
        // Update local user state instantly
        updateUser({ depositBalance: data.newBalance });

        alert('Депозит успешно пополнен!');
        setShowTopUpModal(false);
        setAmount('');
      } else {
        const data = await res.json();
        alert(data.error || 'Ошибка пополнения');
      }
    } catch (error) {
      console.error(error);
      alert('Ошибка соединения');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className={`text-2xl font-semibold mb-2 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{t('corporateDashboard')}</h1>
        <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>{user?.company}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className={`rounded-lg shadow-sm border p-6 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
          }`}>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Wallet className="w-6 h-6 text-green-600" />
            </div>
            <div className="min-w-0 flex-1">
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{t('deposit')}</p>
              <p className={`text-2xl font-bold truncate ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{user?.depositBalance?.toLocaleString()} ₸</p>
            </div>
          </div>
          <button
            onClick={() => setShowTopUpModal(true)}
            className="w-full mt-4 flex items-center justify-center gap-2 py-2 px-4 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            {t('topUp')}
          </button>
        </div>

        <div className={`rounded-lg shadow-sm border p-6 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
          }`}>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Package className="w-6 h-6 text-blue-600" />
            </div>
            <div className="min-w-0 flex-1">
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{t('activeShipments')}</p>
              <p className={`text-2xl font-bold truncate ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>12</p>
            </div>
          </div>
        </div>

        <div className={`rounded-lg shadow-sm border p-6 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
          }`}>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <TrendingUp className="w-6 h-6 text-purple-600" />
            </div>
            <div className="min-w-0 flex-1">
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{t('thisMonthLabel')}</p>
              <p className={`text-2xl font-bold truncate ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>45</p>
            </div>
          </div>
        </div>

        <div className={`rounded-lg shadow-sm border p-6 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
          }`}>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <FileText className="w-6 h-6 text-orange-600" />
            </div>
            <div className="min-w-0 flex-1">
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{t('documents')}</p>
              <p className={`text-2xl font-bold truncate ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>8</p>
            </div>
          </div>
        </div>
      </div>

      {/* Active Shipments with GPS */}
      <div className={`rounded-lg shadow-sm border mb-6 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        }`}>
        <div className={`p-6 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
          <h2 className={`text-lg font-semibold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{t('activeShipments')}</h2>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {shipments.map((shipment) => (
              <div key={shipment.id} className={`border rounded-lg p-4 ${isDark ? 'border-gray-700' : 'border-gray-200'
                }`}>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <span className="text-sm font-medium text-blue-600">{shipment.id}</span>
                    <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{shipment.from} → {shipment.to}</p>
                  </div>
                  <span className={`text-xs px-3 py-1 rounded-full ${shipment.status === 'Прибыл' ? 'bg-green-100 text-green-700' :
                    shipment.status === 'В пути' ? 'bg-blue-100 text-blue-700' :
                      'bg-purple-100 text-purple-700'
                    }`}>
                    {shipment.status === 'Прибыл' ? t('arrived') : shipment.status === 'В пути' ? t('inTransit') : t('loaded')}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <MapPin className={`w-4 h-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                  <div className="flex-1">
                    <div className={`h-2 rounded-full overflow-hidden ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}>
                      <div
                        className="h-full bg-blue-600 rounded-full transition-all"
                        style={{ width: `${shipment.progress}%` }}
                      />
                    </div>
                  </div>
                  <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{shipment.progress}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Documents */}
      <div className={`rounded-lg shadow-sm border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        }`}>
        <div className={`p-6 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
          <h2 className={`text-lg font-semibold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{t('generateDocuments')}</h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button className={`flex items-center justify-between p-4 border rounded-lg transition-colors ${isDark
              ? 'border-gray-700 hover:bg-gray-700'
              : 'border-gray-200 hover:bg-gray-50'
              }`}>
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-blue-600" />
                <span className={`font-medium ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>{t('invoice')}</span>
              </div>
              <Download className={`w-5 h-5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
            </button>

            <button className={`flex items-center justify-between p-4 border rounded-lg transition-colors ${isDark
              ? 'border-gray-700 hover:bg-gray-700'
              : 'border-gray-200 hover:bg-gray-50'
              }`}>
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-green-600" />
                <span className={`font-medium ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>{t('actOfWork')}</span>
              </div>
              <Download className={`w-5 h-5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
            </button>

            <button className={`flex items-center justify-between p-4 border rounded-lg transition-colors ${isDark
              ? 'border-gray-700 hover:bg-gray-700'
              : 'border-gray-200 hover:bg-gray-50'
              }`}>
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-purple-600" />
                <span className={`font-medium ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>{t('shipmentsReport')}</span>
              </div>
              <Download className={`w-5 h-5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
            </button>

            <button className={`flex items-center justify-between p-4 border rounded-lg transition-colors ${isDark
              ? 'border-gray-700 hover:bg-gray-700'
              : 'border-gray-200 hover:bg-gray-50'
              }`}>
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-orange-600" />
                <span className={`font-medium ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>{t('waybillRegistry')}</span>
              </div>
              <Download className={`w-5 h-5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Top Up Modal */}
      {showTopUpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className={`w-full max-w-md p-6 rounded-lg shadow-xl ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
            <div className="flex items-center justify-between mb-6">
              <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {t('topUpDeposit')}
              </h2>
              <button
                onClick={() => setShowTopUpModal(false)}
                className={`p-1 rounded-full hover:bg-opacity-10 ${isDark ? 'hover:bg-gray-300 text-gray-400' : 'hover:bg-gray-200 text-gray-500'}`}
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleTopUp} className="space-y-6">
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  {t('topUpAmount')}
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">₸</span>
                  <input
                    type="number"
                    min="1000"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className={`w-full pl-8 pr-4 py-3 rounded-lg border ${isDark
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                      : 'border-gray-300 text-gray-900'
                      } focus:ring-2 focus:ring-green-500 focus:border-transparent`}
                    placeholder="5000"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {[5000, 10000, 20000].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setAmount(val.toString())}
                    className={`py-2 px-3 rounded-lg text-sm font-medium border transition-colors ${amount === val.toString()
                      ? 'bg-green-50 text-green-700 border-green-500'
                      : isDark
                        ? 'border-gray-600 text-gray-300 hover:bg-gray-700'
                        : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                  >
                    {val.toLocaleString()} ₸
                  </button>
                ))}
              </div>

              <div className={`p-4 rounded-lg flex items-start gap-3 ${isDark ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                <CreditCard className="w-5 h-5 text-gray-400 mt-0.5" />
                <div className="text-sm">
                  <p className={`font-medium mb-1 ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>{t('paymentMethod')}</p>
                  <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>{t('bankCard')}</p>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isLoading ? t('processing') : t('pay')}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}