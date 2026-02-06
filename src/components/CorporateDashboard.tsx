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
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">{t('corporateDashboard')}</h1>
        <p className="text-gray-600">{user?.company}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Wallet className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Депозит</p>
              <p className="text-2xl font-bold text-gray-900">{user?.depositBalance?.toLocaleString()} ₸</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Package className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Активные отправки</p>
              <p className="text-2xl font-bold text-gray-900">12</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">За месяц</p>
              <p className="text-2xl font-bold text-gray-900">45</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <FileText className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Документы</p>
              <p className="text-2xl font-bold text-gray-900">8</p>
            </div>
          </div>
        </div>
      </div>

      {/* Active Shipments with GPS */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Активные отправки</h2>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {shipments.map((shipment) => (
              <div key={shipment.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <span className="text-sm font-medium text-blue-600">{shipment.id}</span>
                    <p className="text-sm text-gray-600 mt-1">{shipment.from} → {shipment.to}</p>
                  </div>
                  <span className={`text-xs px-3 py-1 rounded-full ${
                    shipment.status === 'Прибыл' ? 'bg-green-100 text-green-700' :
                    shipment.status === 'В пути' ? 'bg-blue-100 text-blue-700' :
                    'bg-purple-100 text-purple-700'
                  }`}>
                    {shipment.status}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  <div className="flex-1">
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-blue-600 rounded-full transition-all"
                        style={{ width: `${shipment.progress}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-xs text-gray-600">{shipment.progress}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Documents */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Сформировать документы</h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-2 gap-4">
            <button className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-blue-600" />
                <span className="font-medium text-gray-900">Счёт-фактура</span>
              </div>
              <Download className="w-5 h-5 text-gray-400" />
            </button>

            <button className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-green-600" />
                <span className="font-medium text-gray-900">Акт выполненных работ</span>
              </div>
              <Download className="w-5 h-5 text-gray-400" />
            </button>

            <button className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-purple-600" />
                <span className="font-medium text-gray-900">Отчёт по отправкам</span>
              </div>
              <Download className="w-5 h-5 text-gray-400" />
            </button>

            <button className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-orange-600" />
                <span className="font-medium text-gray-900">Реестр накладных</span>
              </div>
              <Download className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}