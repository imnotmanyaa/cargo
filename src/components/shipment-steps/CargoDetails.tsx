import { ArrowRight, ArrowLeft, AlertCircle } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

interface CargoDetailsProps {
  data: any;
  onUpdate: (data: any) => void;
  onNext: () => void;
  onBack: () => void;
}

export function CargoDetails({ data, onUpdate, onNext, onBack }: CargoDetailsProps) {
  const { t } = useLanguage();

  const calculatePrice = () => {
    if (!data.fromStation || !data.toStation || !data.weight || !data.dimensions) {
      return null;
    }
    
    let basePrice = 5000; // базовая цена в тенге
    
    // Расчет по весу
    const weight = parseFloat(data.weight);
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

  const price = calculatePrice();

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
      <h2 className="text-xl font-semibold text-gray-900 mb-6">{t('cargoDetailsTitle')}</h2>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('mobiusTicket')}
          </label>
          <div className="flex items-center gap-4 mb-2">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={data.hasTicket}
                onChange={(e) => onUpdate({ hasTicket: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <span className="ml-2 text-sm text-gray-700">{t('hasTicket')}</span>
            </label>
          </div>
          {data.hasTicket && (
            <div className="mt-3">
              <input
                type="text"
                value={data.ticketNumber}
                onChange={(e) => onUpdate({ ticketNumber: e.target.value })}
                placeholder={t('ticketNumber')}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="mt-2 flex items-center gap-2 text-sm text-green-600">
                <AlertCircle className="w-4 h-4" />
                <span>{t('ticketDiscount')}</span>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('weight')}
            </label>
            <input
              type="number"
              value={data.weight}
              onChange={(e) => onUpdate({ weight: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0"
              min="0"
              step="0.1"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('dimensions')}
            </label>
            <input
              type="text"
              value={data.dimensions}
              onChange={(e) => onUpdate({ dimensions: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={t('dimensionsPlaceholder')}
            />
          </div>
        </div>

        {price !== null && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700">{t('transportCost')}:</span>
              <span className="text-2xl font-bold text-blue-600">{price.toLocaleString()} ₸</span>
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('cargoValue')}
          </label>
          <div className="flex gap-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={data.isFragile}
                onChange={(e) => onUpdate({ isFragile: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <span className="ml-2 text-sm text-gray-700">{t('fragile')}</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={data.isOversized}
                onChange={(e) => onUpdate({ isOversized: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <span className="ml-2 text-sm text-gray-700">{t('oversized')}</span>
            </label>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('packaging')}
          </label>
          <select
            value={data.packaging}
            onChange={(e) => onUpdate({ packaging: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">{t('selectPackaging')}</option>
            <option value="wood">{t('woodCrate')}</option>
            <option value="film">{t('stretchFilm')}</option>
            <option value="cardboard">{t('cardboard')}</option>
            <option value="bag">{t('bag')}</option>
            <option value="none">{t('noPackaging')}</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('declaredValue')}
          </label>
          <input
            type="number"
            value={data.value}
            onChange={(e) => onUpdate({ value: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="0"
            min="0"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('cargoDescription')}
          </label>
          <textarea
            value={data.description}
            onChange={(e) => onUpdate({ description: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={3}
            placeholder={t('describeContent')}
          />
        </div>

        <div className="flex justify-between pt-4">
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            <ArrowLeft className="w-5 h-5" />
            {t('back')}
          </button>
          <button
            onClick={onNext}
            disabled={!data.weight || !data.dimensions || !data.packaging}
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