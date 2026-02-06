import { ArrowLeft, CreditCard } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

interface PaymentProps {
  data: any;
  onUpdate: (data: any) => void;
  onNext: () => void;
  onBack: () => void;
}

export function Payment({ data, onUpdate, onNext, onBack }: PaymentProps) {
  const { t } = useLanguage();

  const calculateTotal = () => {
    let basePrice = 5000;
    
    const weight = parseFloat(data.weight) || 0;
    if (weight > 20) {
      basePrice += (weight - 20) * 150;
    }
    
    if (data.isFragile) basePrice += 1000;
    if (data.isOversized) basePrice += 2500;
    
    if (data.hasTicket) {
      basePrice = basePrice * 0.5;
    }
    
    return Math.round(basePrice);
  };

  const total = calculateTotal();

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
      <h2 className="text-xl font-semibold text-gray-900 mb-6">{t('tariffCalculation')}</h2>

      <div className="space-y-6">
        <div className="bg-gray-50 rounded-lg p-6 space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">{t('baseTransportCost')}</span>
            <span className="font-medium text-gray-900">5 000 ₸</span>
          </div>
          
          {parseFloat(data.weight) > 20 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">{t('weightSurcharge')}</span>
              <span className="font-medium text-gray-900">+ {((parseFloat(data.weight) - 20) * 150).toLocaleString()} ₸</span>
            </div>
          )}
          
          {data.isFragile && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">{t('fragileCargo')}</span>
              <span className="font-medium text-gray-900">+ 1 000 ₸</span>
            </div>
          )}
          
          {data.isOversized && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">{t('oversizedCargo')}</span>
              <span className="font-medium text-gray-900">+ 2 500 ₸</span>
            </div>
          )}
          
          {data.hasTicket && (
            <div className="flex justify-between text-sm">
              <span className="text-green-600">{t('ticketDiscountLabel')}</span>
              <span className="font-medium text-green-600">- 50%</span>
            </div>
          )}
          
          <div className="pt-3 border-t border-gray-200 flex justify-between">
            <span className="font-semibold text-gray-900">{t('totalPayment')}</span>
            <span className="text-2xl font-bold text-gray-900">{total.toLocaleString()} ₸</span>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('emailReceipt')}
          </label>
          <input
            type="email"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="example@mail.com"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            {t('cardInfo')}
          </label>
          
          <div className="space-y-4">
            <div>
              <input
                type="text"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="1234 1234 1234 1234"
                maxLength={19}
              />
              <div className="flex gap-2 mt-2 justify-end">
                <img src="https://upload.wikimedia.org/wikipedia/commons/0/04/Visa.svg" alt="Visa" className="h-6" />
                <img src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" alt="Mastercard" className="h-6" />
                <img src="https://upload.wikimedia.org/wikipedia/commons/4/40/JCB_logo.svg" alt="JCB" className="h-6" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <input
                type="text"
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="MM / YY"
                maxLength={5}
              />
              <input
                type="text"
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="CVC"
                maxLength={3}
              />
            </div>

            <input
              type="text"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={t('cardholderName')}
            />

            <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">{t('countryRegion')}</option>
              <option value="KZ">Казахстан</option>
              <option value="RU">Россия</option>
              <option value="UZ">Узбекистан</option>
            </select>

            <input
              type="text"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={t('postalCode')}
            />
          </div>
        </div>

        <button
          onClick={onNext}
          className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
        >
          <CreditCard className="w-5 h-5" />
          {t('payButton')} {total.toLocaleString()} ₸
        </button>

        <p className="text-xs text-center text-gray-500">
          {t('termsAgree')}{' '}
          <a href="#" className="text-blue-600 hover:underline">{t('termsOfUse')}</a>
          {' '}{t('and')}{' '}
          <a href="#" className="text-blue-600 hover:underline">{t('privacyPolicy')}</a>
        </p>

        <div className="pt-4">
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            <ArrowLeft className="w-5 h-5" />
            {t('back')}
          </button>
        </div>
      </div>
    </div>
  );
}