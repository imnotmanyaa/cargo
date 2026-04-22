import { ArrowRight, Users } from "lucide-react";
import { useLanguage } from "../../contexts/LanguageContext";

import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';

interface ClientInfoProps {
  data: any;
  onUpdate: (data: any) => void;
  onNext: () => void;
  theme?: 'light' | 'dark';
}

interface CorporateClient {
  id: string;
  name: string;
  company: string;
  phone?: string;
  contract_number: string;
  deposit_balance: number;
}

interface FrequentClient {
  id: string;
  provider: 'glovo' | 'choko' | 'other';
  company_name?: string;
  client_name: string;
  phone?: string;
  contract_number?: string;
}

export function ClientInfo({
  data,
  onUpdate,
  onNext,
  theme = 'light'
}: ClientInfoProps) {
  const isDark = theme === 'dark';
  const { t } = useLanguage();
  const { user } = useAuth();
  const [isReceiverDifferent, setIsReceiverDifferent] = useState(() => !!data.receiverName || !!data.receiverPhone);
  const [corporateClients, setCorporateClients] = useState<CorporateClient[]>([]);
  const [frequentClients, setFrequentClients] = useState<FrequentClient[]>([]);

  const normalizeStation = (v: string) => v.trim().toLowerCase();
  const sameFromTo =
    Boolean(data.fromStation) &&
    Boolean(data.toStation) &&
    normalizeStation(data.fromStation) === normalizeStation(data.toStation);

  // Update local state if data changes externally (e.g. going back/forward)
  useEffect(() => {
    if (data.receiverName || data.receiverPhone) {
      setIsReceiverDifferent(true);
    }
  }, [data.receiverName, data.receiverPhone]);

  const [searchQuery, setSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    if (user?.role !== 'individual') {
      const fetchClients = async () => {
        try {
          const headers = { 'Authorization': `Bearer ${localStorage.getItem('token')}` };
          const res = await fetch('/api/clients?ts=' + Date.now(), {
            headers,
          });
          if (res.ok) {
            setCorporateClients(await res.json());
          }
          const frequentRes = await fetch('/api/clients/frequent?ts=' + Date.now(), {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
          });
          if (frequentRes.ok) {
            const frequentPayload = await frequentRes.json().catch(() => []);
            setFrequentClients(Array.isArray(frequentPayload) ? frequentPayload : []);
          } else {
            setFrequentClients([]);
          }
        } catch (error) {
          console.error(error);
          setFrequentClients([]);
        }
      };
      fetchClients();
    }
  }, [user]);

  // Автоматически заполняем данные при монтировании или смене пользователя
  useEffect(() => {
    if (!user) return;

    const updates: any = {};

    // Авто-заполнение станции отправления (для операторов и филиалов)
    if (user.station && !data.fromStation) {
      updates.fromStation = user.station;
    }

    // Авто-заполнение данных клиента (для физ. лиц и компаний)
    if (user.role === 'individual' && user.name) {
      updates.clientType = 'individual';
      updates.clientName = user.name;
      updates.clientPhone = user.phone || '';
      updates.clientSource = 'direct';
    } else if (user.role === 'corporate') {
      updates.clientType = 'legal';
      updates.clientName = user.company || user.name;
      updates.contractNumber = user.contractNumber || '';
    }

    if (Object.keys(updates).length > 0) {
      onUpdate(updates);
    }
  }, [user, user?.station]);

  // Автозаполнение при выборе источника агрегатора
  const handleSourceChange = (source: string) => {
    onUpdate({ clientSource: source });

    // Если выбран агрегатор, очищаем данные клиента для нового выбора
    if (source === 'glovo' || source === 'choko' || source === 'other') {
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
    const selectedClient = frequentClients.find(c => c.id === clientId);

    if (selectedClient) {
      onUpdate({
        aggregatorClientId: clientId,
        clientName: selectedClient.client_name,
        clientPhone: selectedClient.phone || '',
        contractNumber: selectedClient.contract_number || ''
      });
    }
  };

  const isAggregatorSource = data.clientSource === 'glovo' || data.clientSource === 'choko' || data.clientSource === 'other';
  const currentAggregatorClients = isAggregatorSource ? frequentClients.filter(c => c.provider === data.clientSource) : [];

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
              <option value="other">Другая компания</option>
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
                Выберите клиента из {data.clientSource === 'glovo' ? 'Glovo' : data.clientSource === 'choko' ? 'Choko' : 'других компаний'}
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
                  {client.client_name}{client.company_name ? ` (${client.company_name})` : ''}{client.phone ? ` - ${client.phone}` : ''}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
            {data.clientType === 'legal' ? t('clientName') : t('fullName')}
          </label>
          
          {data.clientType === 'legal' && user?.role !== 'individual' ? (
            <div className="relative">
              <input
                type="text"
                value={searchQuery || data.clientName}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowSuggestions(true);
                  // Update data.clientName directly so they can type custom names too
                    onUpdate({ clientName: e.target.value, corporateClientId: null, hasDeposit: false, contractNumber: '', clientDepositBalance: 0 });
                }}
                onFocus={() => setShowSuggestions(true)}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDark
                  ? 'bg-gray-700 border-gray-600 text-gray-200 placeholder-gray-400'
                  : 'border-gray-300'
                  }`}
                placeholder="Введите ФИО или название организации..."
              />
              {showSuggestions && searchQuery.length > 0 && (
                <div className={`absolute z-10 w-full mt-1 border rounded-lg shadow-lg max-h-60 overflow-y-auto ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                  {corporateClients
                    .filter(c => 
                      (c.company || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
                      (c.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                      (c.contract_number || '').toLowerCase().includes(searchQuery.toLowerCase())
                    )
                    .map(client => (
                      <div
                        key={client.id}
                        className={`px-4 py-2 cursor-pointer ${isDark ? 'hover:bg-gray-700 text-gray-200' : 'hover:bg-blue-50 text-gray-800'}`}
                        onClick={() => {
                          setSearchQuery(client.company || client.name);
                          setShowSuggestions(false);
                          onUpdate({
                            corporateClientId: client.id,
                            clientName: client.company || client.name,
                            clientPhone: client.phone || '',
                            contractNumber: client.contract_number || '',
                            hasDeposit: (client.deposit_balance || 0) > 0,
                            clientDepositBalance: client.deposit_balance || 0,
                            paymentMethod: (client.deposit_balance || 0) > 0 ? 'deposit' : 'cash',
                          });
                        }}
                      >
                        <div className="font-medium">{client.company || client.name}</div>
                        <div className="text-xs opacity-70">
                          БИН/Договор: {client.contract_number || 'Нет'} | Баланс: {client.deposit_balance} ₸
                        </div>
                      </div>
                    ))}
                  {corporateClients.filter(c => 
                      (c.company || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
                      (c.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                      (c.contract_number || '').toLowerCase().includes(searchQuery.toLowerCase())
                    ).length === 0 && (
                      <div className={`px-4 py-3 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        Клиентов не найдено
                      </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <input
              type="text"
              value={data.clientName}
              onChange={(e) => onUpdate({ clientName: e.target.value, corporateClientId: null })}
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDark
                ? 'bg-gray-700 border-gray-600 text-gray-200 placeholder-gray-400'
                : 'border-gray-300'
                }`}
              placeholder={t('enterClientName')}
              readOnly={isAggregatorSource && data.aggregatorClientId}
            />
          )}
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
          // Only show for Operator/Admin, NOT for individual user
          // AND only if it's NOT a direct contact (or maybe we show it for direct?)
          // Requirement: "remove parameter specify contract in individual cabinet"
          // So we hide it if user.role === 'individual'
          user?.role !== 'individual' && (
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
          )
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

        {/* Separator */}
        <div className={`border-t ${isDark ? 'border-gray-700' : 'border-gray-200'} my-4`}></div>

        {/* Receiver Section */}
        <div>
          <label className="flex items-center mb-4">
            <input
              type="checkbox"
              checked={isReceiverDifferent}
              onChange={(e) => {
                setIsReceiverDifferent(e.target.checked);
                if (!e.target.checked) {
                  onUpdate({ receiverName: '', receiverPhone: '' });
                }
              }}
              className="w-4 h-4 text-blue-600 rounded"
            />
            <span className={`ml-2 text-sm font-medium ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>
              {t('recipientIsAnotherPerson')} <span className="text-gray-400 font-normal text-xs ml-1">(необязательно)</span>
            </span>
          </label>

          {isReceiverDifferent && (
            <div className={`p-4 rounded-lg border ${isDark ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'}`}>
              <div className="grid gap-4">
                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    {t('receiverName')} <span className="text-gray-400 font-normal text-xs ml-1">(необязательно)</span>
                  </label>
                  <input
                    type="text"
                    value={data.receiverName}
                    onChange={(e) => onUpdate({ receiverName: e.target.value })}
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDark
                      ? 'bg-gray-700 border-gray-600 text-gray-200 placeholder-gray-400'
                      : 'border-gray-300'
                      }`}
                    placeholder={t('enterReceiverName')}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    {t('receiverPhone')} <span className="text-gray-400 font-normal text-xs ml-1">(необязательно)</span>
                  </label>
                  <input
                    type="tel"
                    value={data.receiverPhone}
                    onChange={(e) => onUpdate({ receiverPhone: e.target.value })}
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDark
                      ? 'bg-gray-700 border-gray-600 text-gray-200 placeholder-gray-400'
                      : 'border-gray-300'
                      }`}
                    placeholder="+7 ___ ___ ____"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className={`pt-6 border-t ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
          <h3 className={`text-lg font-medium mb-4 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{t('route')}</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
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
                <option value="Атырау">Атырау</option>
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
                <option value="Атырау">Атырау</option>
              </select>
            </div>
          </div>

          {sameFromTo && (
            <div className="mb-4 text-sm text-red-600">
              Пункты отправления и назначения не могут совпадать.
            </div>
          )}

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

          {data.departureDate && (
            <div>
              <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                Время поезда
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className={`flex items-center justify-center p-3 border rounded-lg cursor-pointer transition-colors ${data.trainTime === '15:00'
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : isDark
                    ? 'border-gray-600 hover:bg-gray-700 text-gray-200'
                    : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                  }`}>
                  <input
                    type="radio"
                    name="trainTime"
                    value="15:00"
                    checked={data.trainTime === '15:00'}
                    onChange={(e) => onUpdate({ trainTime: e.target.value })}
                    className="sr-only"
                  />
                  <span>15:00</span>
                </label>

                <label className={`flex items-center justify-center p-3 border rounded-lg cursor-pointer transition-colors ${data.trainTime === '23:00'
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : isDark
                    ? 'border-gray-600 hover:bg-gray-700 text-gray-200'
                    : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                  }`}>
                  <input
                    type="radio"
                    name="trainTime"
                    value="23:00"
                    checked={data.trainTime === '23:00'}
                    onChange={(e) => onUpdate({ trainTime: e.target.value })}
                    className="sr-only"
                  />
                  <span>23:00</span>
                </label>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end pt-4">
          <button
            onClick={onNext}
            disabled={!data.clientName || !data.fromStation || !data.toStation || !data.departureDate || !data.trainTime || sameFromTo}
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