import { ArrowRight, Users } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';

interface ClientInfoProps {
  data: any;
  onUpdate: (data: any) => void;
  onNext: () => void;
  theme?: 'light' | 'dark';
}

// Моковые данные клиентов от агрегаторов
const aggregatorClients: Record<string, Array<{ id: string; name: string; phone: string; contractNumber: string }>> = {
  glovo: [
    { id: 'GLV-001', name: 'Ермек Асанов', phone: '+7 701 234 5678', contractNumber: 'GLV-2024-001' },
    { id: 'GLV-002', name: 'Айгүл Сейтова', phone: '+7 702 345 6789', contractNumber: 'GLV-2024-002' },
    { id: 'GLV-003', name: 'Нұрлан Қасымов', phone: '+7 705 456 7890', contractNumber: 'GLV-2024-003' },
  ],
  choko: [
    { id: 'CHK-001', name: 'Данияр Әлімов', phone: '+7 707 567 8901', contractNumber: 'CHK-2024-001' },
    { id: 'CHK-002', name: 'Сәуле Жұмабаева', phone: '+7 708 678 9012', contractNumber: 'CHK-2024-002' },
    { id: 'CHK-003', name: 'Бауыржан Төлеуов', phone: '+7 775 789 0123', contractNumber: 'CHK-2024-003' },
  ],
};

export function ClientInfo({
  data,
  onUpdate,
  onNext,
  theme = 'light'
}: ClientInfoProps) {
  const isDark = theme === 'dark';
  const { t } = useLanguage();
  const { user } = useAuth();

  // Автоматически заполняем данные для физического лица при монтировании
  useEffect(() => {
    if (user?.role === 'individual' && user.name) {
      onUpdate({
        clientType: 'individual',
        clientName: user.name,
        clientPhone: user.phone || '',
        clientSource: 'direct'
      });
    }
  }, [user]);

  // Автозаполнение при выборе источника агрегатора
  const handleSourceChange = (source: string) => {
    onUpdate({ clientSource: source });

    // Если выбран агрегатор, очищаем данные клиента для нового выбора
    if (source === 'glovo' || source === 'choko') {
      onUpdate({
        clientSource: source,
        aggregatorClientId: '',
        clientName: '',
        clientPhone: '',
        contractNumber: ''
      });
    } else {
      onUpdate({
        clientSource: source,
        aggregatorClientId: '',
        clientPhone: ''
      });
    }
  };

  // Автозаполнение данных клиента при выборе из списка агрегатора
  const handleAggregatorClientSelect = (clientId: string) => {
    const source = data.clientSource;
    if (source === 'glovo' || source === 'choko') {
      const clients = aggregatorClients[source];
      const selectedClient = clients.find(c => c.id === clientId);

      if (selectedClient) {
        onUpdate({
          aggregatorClientId: clientId,
          clientName: selectedClient.name,
          clientPhone: selectedClient.phone,
          contractNumber: selectedClient.contractNumber
        });
      }
    }
  };

  const isAggregatorSource = data.clientSource === 'glovo' || data.clientSource === 'choko';
  const currentAggregatorClients = isAggregatorSource ? aggregatorClients[data.clientSource] : [];

  return (
    <div className={`rounded-lg shadow-sm border p-8 ${isDark
      ? 'bg-gray-800 border-gray-700'
      : 'bg-white border-gray-200'
      }`}>
      <h2 className={`text-xl font-semibold mb-6 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{t('clientInfo')}</h2>

      <div className="space-y-6">
        {/* Показываем выбор типа клиента только для оператора */}
        {user?.role !== 'individual' && (
          <div>
            <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              {t('clientType')}
            </label>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="individual"
                  checked={data.clientType === 'individual'}
                  onChange={(e) => onUpdate({ clientType: e.target.value })}
                  className="w-4 h-4 text-blue-600"
                />
                <span className={`ml-2 text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{t('individual')}</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="legal"
                  checked={data.clientType === 'legal'}
                  onChange={(e) => onUpdate({ clientType: e.target.value })}
                  className="w-4 h-4 text-blue-600"
                />
                <span className={`ml-2 text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{t('legal')}</span>
              </label>
            </div>
          </div>
        )}

        {/* Показываем выбор источника клиента только для оператора и только для физических лиц */}
        {user?.role !== 'individual' && data.clientType === 'individual' && (
          <div>
            <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              {t('clientSource')}
            </label>
            <select
              value={data.clientSource}
              onChange={(e) => handleSourceChange(e.target.value)}
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDark
                ? 'bg-gray-700 border-gray-600 text-gray-200'
                : 'border-gray-300'
                }`}
            >
              <option value="">{t('selectSource')}</option>
              <option value="glovo">Glovo</option>
              <option value="choko">Choko</option>
              <option value="direct">{t('directContact')}</option>
            </select>
          </div>
        )}

        {/* Выбор клиента из агрегатор */}
        {isAggregatorSource && (
          <div className={`border rounded-lg p-4 ${isDark
            ? 'bg-blue-900 bg-opacity-30 border-blue-700'
            : 'bg-blue-50 border-blue-200'
            }`}>
            <div className="flex items-center gap-2 mb-3">
              <Users className="w-5 h-5 text-blue-600" />
              <span className={`text-sm font-medium ${isDark ? 'text-blue-300' : 'text-blue-900'}`}>
                Выберите клиента из {data.clientSource === 'glovo' ? 'Glovo' : 'Choko'}
              </span>
            </div>
            <select
              value={data.aggregatorClientId || ''}
              onChange={(e) => handleAggregatorClientSelect(e.target.value)}
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDark
                ? 'bg-gray-700 border-gray-600 text-gray-200'
                : 'bg-white border-blue-300'
                }`}
            >
              <option value="">Выберите клиента...</option>
              {currentAggregatorClients.map(client => (
                <option key={client.id} value={client.id}>
                  {client.name} - {client.phone}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
            {t('clientName')}
          </label>
          <input
            type="text"
            value={data.clientName}
            onChange={(e) => onUpdate({ clientName: e.target.value })}
            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDark
              ? 'bg-gray-700 border-gray-600 text-gray-200 placeholder-gray-400'
              : 'border-gray-300'
              }`}
            placeholder={t('enterClientName')}
            readOnly={isAggregatorSource && data.aggregatorClientId}
          />
        </div>

        {/* Телефон клиента */}
        {data.clientType === 'individual' && (
          <div>
            <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              Телефон
            </label>
            <input
              type="tel"
              value={data.clientPhone || ''}
              onChange={(e) => onUpdate({ clientPhone: e.target.value })}
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDark
                ? 'bg-gray-700 border-gray-600 text-gray-200 placeholder-gray-400'
                : 'border-gray-300'
                }`}
              placeholder="+7 ___ ___ ____"
              readOnly={isAggregatorSource && data.aggregatorClientId}
            />
          </div>
        )}

        {data.clientType === 'individual' && data.clientSource && (
          <div>
            <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              {t('contractNumber')}
            </label>
            <input
              type="text"
              value={data.contractNumber}
              onChange={(e) => onUpdate({ contractNumber: e.target.value })}
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDark
                ? 'bg-gray-700 border-gray-600 text-gray-200 placeholder-gray-400'
                : 'border-gray-300'
                }`}
              placeholder="№"
              readOnly={isAggregatorSource && data.aggregatorClientId}
            />
          </div>
        )}

        {data.clientType === 'legal' && (
          <div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={data.hasDeposit}
                onChange={(e) => onUpdate({ hasDeposit: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <span className={`ml-2 text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{t('depositSystem')}</span>
            </label>
          </div>
        )}

        <div className={`pt-6 border-t ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
          <h3 className={`text-lg font-medium mb-4 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{t('route')}</h3>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                {t('from')}
              </label>
              <select
                value={data.fromStation}
                onChange={(e) => onUpdate({ fromStation: e.target.value })}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDark
                  ? 'bg-gray-700 border-gray-600 text-gray-200'
                  : 'border-gray-300'
                  }`}
              >
                <option value="">{t('selectStation')}</option>
                <option value="Алматы-1">Алматы-1</option>
                <option value="Астана Нұрлы Жол">Астана Нұрлы Жол</option>
                <option value="Шымкент">Шымкент</option>
                <option value="Ақтөбе">Ақтөбе</option>
                <option value="Қарағанды">Қарағанды</option>
              </select>
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                {t('to')}
              </label>
              <select
                value={data.toStation}
                onChange={(e) => onUpdate({ toStation: e.target.value })}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDark
                  ? 'bg-gray-700 border-gray-600 text-gray-200'
                  : 'border-gray-300'
                  }`}
              >
                <option value="">{t('selectStation')}</option>
                <option value="Алматы-1">Алматы-1</option>
                <option value="Астана Нұрлы Жол">Астана Нұрлы Жол</option>
                <option value="Шымкент">Шымкент</option>
                <option value="Ақтөбе">Ақтөбе</option>
                <option value="Қарағанды">Қарағанды</option>
              </select>
            </div>
          </div>

          <div>
            <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              {t('departureDate')}
            </label>
            <input
              type="date"
              value={data.departureDate}
              onChange={(e) => onUpdate({ departureDate: e.target.value })}
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDark
                ? 'bg-gray-700 border-gray-600 text-gray-200'
                : 'border-gray-300'
                }`}
            />
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <button
            onClick={onNext}
            disabled={!data.clientName || !data.fromStation || !data.toStation || !data.departureDate}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {t('next')}
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}