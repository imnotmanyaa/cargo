import { ArrowLeft, CreditCard } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { calculateShipmentCost } from '../../lib/tariff';
import { useAuth } from '../../contexts/AuthContext';

interface PaymentProps {
  data: any;
  onUpdate: (data: any) => void;
  onNext: () => void;
  onBack: () => void;
  theme?: 'light' | 'dark';
}

export function Payment({ data, onUpdate, onNext, onBack, theme = 'light' }: PaymentProps) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const isDark = theme === 'dark';

  const transportCost = calculateShipmentCost({
    fromStation: data.fromStation,
    toStation: data.toStation,
    weight: data.weight,
    isFragile: false,
    isOversized: false,
    hasTicket: false,
  }) || 0;

  const total = calculateShipmentCost(data) || 0;
  const isLegal = data.clientType === 'legal';
  const isManagerFlow = user?.role === 'manager' || user?.role === 'admin';
  const paymentMethod = data.paymentMethod || 'cash';
  const depositBalance = Number(data.clientDepositBalance || 0);
  const depositAvailable = isLegal && depositBalance > 0;
  const canUseDeposit = depositAvailable && depositBalance >= total;

  const input = `w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
    isDark ? 'bg-gray-700 border-gray-600 text-gray-200 placeholder-gray-400' : 'border-gray-300 bg-white'
  }`;
  const label = `block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`;

  return (
    <div className={`rounded-lg shadow-sm border p-8 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
      <h2 className={`text-xl font-semibold mb-6 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{t('tariffCalculation')}</h2>

      <div className="space-y-6">
        {/* Cost breakdown */}
        <div className={`rounded-lg p-6 space-y-3 ${isDark ? 'bg-gray-700/50 border border-gray-600' : 'bg-gray-50'}`}>
          <div className="flex justify-between text-sm">
            <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>{t('baseTransportCost')}</span>
            <span className={`font-medium ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>{transportCost.toLocaleString()} ₸</span>
          </div>

          {data.isFragile && (
            <div className="flex justify-between text-sm">
              <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>{t('fragileCargo')}</span>
              <span className={`font-medium ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>+ 1 000 ₸</span>
            </div>
          )}

          {data.isOversized && (
            <div className="flex justify-between text-sm">
              <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>{t('oversizedCargo')}</span>
              <span className={`font-medium ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>+ 2 500 ₸</span>
            </div>
          )}

          {data.hasTicket && (
            <div className="flex justify-between text-sm">
              <span className="text-green-500">{t('ticketDiscountLabel')}</span>
              <span className="font-medium text-green-500">- 50%</span>
            </div>
          )}

          <div className={`pt-3 border-t flex justify-between ${isDark ? 'border-gray-600' : 'border-gray-200'}`}>
            <span className={`font-semibold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{t('totalPayment')}</span>
            <span className={`text-2xl font-bold ${isDark ? 'text-blue-400' : 'text-gray-900'}`}>{total.toLocaleString()} ₸</span>
          </div>
        </div>

        {/* Email */}
        <div>
          <label className={label}>{t('emailReceipt')}</label>
          <input type="email" className={input} placeholder="example@mail.com" />
        </div>

        {/* Card */}
        <div>
          <label className={label}>{t('cardInfo')}</label>
          <div className="space-y-4">
            <div>
              <input type="text" className={input} placeholder="1234 1234 1234 1234" maxLength={19} />
              <div className="flex gap-2 mt-2 justify-end">
                <img src="https://upload.wikimedia.org/wikipedia/commons/0/04/Visa.svg" alt="Visa" className="h-6" />
                <img src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" alt="Mastercard" className="h-6" />
                <img src="https://upload.wikimedia.org/wikipedia/commons/4/40/JCB_logo.svg" alt="JCB" className="h-6" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <input type="text" className={input} placeholder="MM / YY" maxLength={5} />
              <input type="text" className={input} placeholder="CVC" maxLength={3} />
            </div>

            <input type="text" className={input} placeholder={t('cardholderName')} />

            <select className={input}>
              <option value="">{t('countryRegion')}</option>
              <option value="KZ">Казахстан</option>
              <option value="RU">Россия</option>
              <option value="UZ">Узбекистан</option>
            </select>

            <input type="text" className={input} placeholder={t('postalCode')} />
          </div>
        </div>

        {/* Legal entity deposit */}
        {(isLegal || isManagerFlow) && (
          <div className={`rounded-lg border p-4 ${isDark ? 'border-gray-600 bg-gray-700/30' : 'border-gray-200'}`}>
            <div className={`text-sm font-medium mb-3 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Способ оплаты</div>
            <div className={`grid grid-cols-1 ${isLegal ? 'sm:grid-cols-3' : 'sm:grid-cols-2'} gap-2`}>
              <button
                type="button"
                onClick={() => onUpdate({ paymentMethod: 'cash' })}
                className={`px-4 py-2 rounded-lg border text-sm ${paymentMethod === 'cash'
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : isDark ? 'border-gray-600 text-gray-300' : 'border-gray-300 text-gray-700'
                }`}
              >
                Наличные
              </button>
              <button
                type="button"
                onClick={() => onUpdate({ paymentMethod: 'card' })}
                className={`px-4 py-2 rounded-lg border text-sm ${paymentMethod === 'card'
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : isDark ? 'border-gray-600 text-gray-300' : 'border-gray-300 text-gray-700'
                }`}
              >
                Карта
              </button>
              {isLegal && (
                <button
                  type="button"
                  onClick={() => canUseDeposit && onUpdate({ paymentMethod: 'deposit' })}
                  disabled={!canUseDeposit}
                  className={`px-4 py-2 rounded-lg border text-sm disabled:opacity-50 ${paymentMethod === 'deposit'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : isDark ? 'border-gray-600 text-gray-300' : 'border-gray-300 text-gray-700'
                  }`}
                >
                  Списать с депозита
                </button>
              )}
            </div>
            {isLegal && (
              <div className={`mt-2 text-xs ${canUseDeposit ? 'text-green-500' : 'text-amber-500'}`}>
                {canUseDeposit
                  ? `Депозит доступен: ${depositBalance.toLocaleString()} ₸`
                  : `Списание с депозита недоступно. Баланс: ${depositBalance.toLocaleString()} ₸`}
              </div>
            )}
          </div>
        )}

        {/* Pay button */}
        <button
          onClick={() => {
            if (isLegal && paymentMethod === 'deposit' && !canUseDeposit) {
              alert('Недостаточно средств на депозите для списания');
              return;
            }
            onNext();
          }}
          className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:bg-gray-400"
          disabled={isLegal && paymentMethod === 'deposit' && !canUseDeposit}
        >
          <CreditCard className="w-5 h-5" />
          {paymentMethod === 'deposit' ? 'Списать с депозита' : t('payButton')} {total.toLocaleString()} ₸
        </button>

        <p className={`text-xs text-center ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
          {t('termsAgree')}{' '}
          <a href="#" className="text-blue-500 hover:underline">{t('termsOfUse')}</a>
          {' '}{t('and')}{' '}
          <a href="#" className="text-blue-500 hover:underline">{t('privacyPolicy')}</a>
        </p>

        <div className="pt-4">
          <button
            onClick={onBack}
            className={`flex items-center gap-2 px-6 py-3 border rounded-lg ${
              isDark ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <ArrowLeft className="w-5 h-5" />
            {t('back')}
          </button>
        </div>
      </div>
    </div>
  );
}