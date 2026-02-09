import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Wallet, Package, FileText, MapPin, Download, TrendingUp } from 'lucide-react';

interface CorporateDashboardProps {
  theme?: 'light' | 'dark';
}

export function CorporateDashboard({ theme = 'light' }: CorporateDashboardProps) {
  const isDark = theme === 'dark';
  const { user } = useAuth();
  const { t } = useLanguage();

  const shipments = [
    { id: 'SH-2024-101', from: 'Алматы', to: 'Астана', status: 'В пути', progress: 65, date: '20.01.2026' },
    { id: 'SH-2024-102', from: 'Шымкент', to: 'Қарағанды', status: 'Погружен', progress: 20, date: '20.01.2026' },
    { id: 'SH-2024-103', from: 'Астана', to: 'Алматы', status: 'Прибыл', progress: 100, date: '19.01.2026' },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className={`text-2xl font-semibold mb-2 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{t('corporateDashboard')}</h1>
        <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>{user?.company}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className={`rounded-lg shadow-sm border p-6 ${
          isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
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
        </div>

        <div className={`rounded-lg shadow-sm border p-6 ${
          isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
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

        <div className={`rounded-lg shadow-sm border p-6 ${
          isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        }`}>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <TrendingUp className="w-6 h-6 text-purple-600" />
            </div>
            <div className="min-w-0 flex-1">
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{t('thisMonth')}</p>
              <p className={`text-2xl font-bold truncate ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>45</p>
            </div>
          </div>
        </div>

        <div className={`rounded-lg shadow-sm border p-6 ${
          isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
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
      <div className={`rounded-lg shadow-sm border mb-6 ${
        isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
      }`}>
        <div className={`p-6 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
          <h2 className={`text-lg font-semibold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{t('activeShipments')}</h2>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {shipments.map((shipment) => (
              <div key={shipment.id} className={`border rounded-lg p-4 ${
                isDark ? 'border-gray-700' : 'border-gray-200'
              }`}>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <span className="text-sm font-medium text-blue-600">{shipment.id}</span>
                    <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{shipment.from} → {shipment.to}</p>
                  </div>
                  <span className={`text-xs px-3 py-1 rounded-full ${
                    shipment.status === 'Прибыл' ? 'bg-green-100 text-green-700' :
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
      <div className={`rounded-lg shadow-sm border ${
        isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
      }`}>
        <div className={`p-6 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
          <h2 className={`text-lg font-semibold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{t('generateDocuments')}</h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button className={`flex items-center justify-between p-4 border rounded-lg transition-colors ${
              isDark 
                ? 'border-gray-700 hover:bg-gray-700' 
                : 'border-gray-200 hover:bg-gray-50'
            }`}>
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-blue-600" />
                <span className={`font-medium ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>{t('invoice')}</span>
              </div>
              <Download className={`w-5 h-5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
            </button>

            <button className={`flex items-center justify-between p-4 border rounded-lg transition-colors ${
              isDark 
                ? 'border-gray-700 hover:bg-gray-700' 
                : 'border-gray-200 hover:bg-gray-50'
            }`}>
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-green-600" />
                <span className={`font-medium ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>{t('actOfWork')}</span>
              </div>
              <Download className={`w-5 h-5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
            </button>

            <button className={`flex items-center justify-between p-4 border rounded-lg transition-colors ${
              isDark 
                ? 'border-gray-700 hover:bg-gray-700' 
                : 'border-gray-200 hover:bg-gray-50'
            }`}>
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-purple-600" />
                <span className={`font-medium ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>{t('shipmentsReport')}</span>
              </div>
              <Download className={`w-5 h-5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
            </button>

            <button className={`flex items-center justify-between p-4 border rounded-lg transition-colors ${
              isDark 
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
    </div>
  );
}