import { X, Package, MapPin, Calendar, Weight, User, Phone, Banknote } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface ShipmentDetailsModalProps {
  shipment: {
    id: string;
    client: string;
    client_email?: string;
    from: string;
    to: string;
    status: string;
    date: string;
    weight: string;
    dimensions?: string;
    description?: string;
    value?: string;
    departure_date?: string;
  };
  onClose: () => void;
}

export function ShipmentDetailsModal({ shipment, onClose }: ShipmentDetailsModalProps) {
  const { t } = useLanguage();

  // Format date for display
  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
          <h2 className="text-xl font-semibold text-gray-900">{t('details')} {shipment.id}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Status Badge */}
          <div className="flex items-center justify-between">
            <span className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${shipment.status === 'В пути' || shipment.status === 'In Transit' || shipment.status === 'Жолда'
                ? 'bg-blue-100 text-blue-700'
                : shipment.status === 'Погружен' || shipment.status === 'Loaded' || shipment.status === 'Тиелген'
                  ? 'bg-purple-100 text-purple-700'
                  : 'bg-green-100 text-green-700'
              }`}>
              {shipment.status}
            </span>
            <span className="text-sm text-gray-500">{shipment.date}</span>
          </div>

          {/* Client Information */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">{t('clientInfo')}</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <User className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-600">{t('client')}:</span>
                <span className="text-sm font-medium text-gray-900">{shipment.client}</span>
              </div>
              {shipment.client_email && (
                <div className="flex items-center gap-3">
                  <Phone className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-600">Email:</span>
                  <span className="text-sm font-medium text-gray-900">{shipment.client_email}</span>
                </div>
              )}
            </div>
          </div>

          {/* Route Information */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">{t('route')}</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <MapPin className="w-4 h-4 text-green-600" />
                <span className="text-sm text-gray-600">{t('from')}:</span>
                <span className="text-sm font-medium text-gray-900">{shipment.from}</span>
              </div>
              <div className="flex items-center gap-3">
                <MapPin className="w-4 h-4 text-red-600" />
                <span className="text-sm text-gray-600">{t('to')}:</span>
                <span className="text-sm font-medium text-gray-900">{shipment.to}</span>
              </div>
              <div className="flex items-center gap-3">
                <Calendar className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-600">{t('departureDate')}:</span>
                <span className="text-sm font-medium text-gray-900">
                  {formatDate(shipment.departure_date || shipment.date)}
                </span>
              </div>
            </div>
          </div>

          {/* Cargo Information */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">{t('cargoDetails')}</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <Weight className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-600">{t('weight')}:</span>
                <span className="text-sm font-medium text-gray-900">{shipment.weight}</span>
              </div>
              {shipment.dimensions && (
                <div className="flex items-center gap-3">
                  <Package className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-600">{t('dimensions')}:</span>
                  <span className="text-sm font-medium text-gray-900">{shipment.dimensions}</span>
                </div>
              )}
              {shipment.description && (
                <div className="flex items-center gap-3">
                  <Package className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-600">{t('description')}:</span>
                  <span className="text-sm font-medium text-gray-900">{shipment.description}</span>
                </div>
              )}
            </div>
          </div>

          {/* Payment Information */}
          {shipment.value && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">{t('payment')}</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">{t('declaredValue')}:</span>
                  <span className="text-sm font-medium text-gray-900">{shipment.value} ₸</span>
                </div>
              </div>
            </div>
          )}

          {/* QR Code */}
          <div className="bg-gray-50 rounded-lg p-4 flex flex-col items-center">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">QR-код отправки</h3>
            <div className="w-48 h-48 bg-white border-2 border-gray-300 rounded-lg flex items-center justify-center">
              <svg className="w-40 h-40" viewBox="0 0 100 100">
                <rect x="0" y="0" width="100" height="100" fill="white" />
                <path d="M10,10 h10 v10 h-10 z M25,10 h5 v5 h-5 z M35,10 h5 v5 h-5 z M45,10 h10 v10 h-10 z M60,10 h5 v5 h-5 z M70,10 h10 v10 h-10 z M85,10 h5 v5 h-5 z" fill="black" />
                <path d="M10,25 h5 v5 h-5 z M20,25 h5 v5 h-5 z M30,25 h10 v10 h-10 z M45,25 h5 v5 h-5 z M55,25 h5 v5 h-5 z M65,25 h5 v5 h-5 z M75,25 h5 v5 h-5 z M85,25 h5 v5 h-5 z" fill="black" />
                <path d="M10,40 h10 v10 h-10 z M25,40 h5 v5 h-5 z M35,40 h5 v5 h-5 z M45,40 h10 v10 h-10 z M60,40 h5 v5 h-5 z M70,40 h10 v10 h-10 z M85,40 h5 v5 h-5 z" fill="black" />
              </svg>
            </div>
            <p className="text-xs text-gray-500 mt-2">{shipment.id}</p>
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 bg-gray-50 sticky bottom-0">
          <button
            onClick={onClose}
            className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            {t('close')}
          </button>
        </div>
      </div>
    </div>
  );
}
