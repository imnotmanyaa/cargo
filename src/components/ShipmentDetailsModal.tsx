import { X, Package, MapPin, Calendar, Weight, User, Phone, Printer } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { QRCodeSVG } from 'qrcode.react';

interface ShipmentDetailsModalProps {
  shipment: {
    id: string;
    shipment_number?: string;
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
    receiver_name?: string;
    receiver_phone?: string;
    train_time?: string;
  };
  onClose: () => void;
  theme?: 'light' | 'dark';
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

  const handlePrint = () => {
    const qrContainer = document.getElementById('qr-code-container');
    const qrSvg = qrContainer?.innerHTML || '';

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Печать ${shipment.shipment_number}</title>
            <style>
              body {
                font-family: 'Courier New', monospace;
                width: 58mm;
                margin: 0;
                padding: 5px;
                color: black;
                background: white;
              }
              .header {
                text-align: center;
                font-weight: bold;
                font-size: 20px;
                margin-bottom: 5px;
                text-transform: uppercase;
              }
              .shipment-id {
                text-align: center;
                font-size: 22px;
                font-weight: bold;
                margin: 5px 0;
              }
              .qr-container {
                display: flex;
                justify-content: center;
                margin: 10px 0;
              }
              .qr-container svg {
                width: 45mm !important;
                height: 45mm !important;
              }
              .info {
                font-size: 14px;
                font-weight: bold;
                margin-bottom: 5px;
              }
              .row {
                display: flex;
                justify-content: space-between;
                margin-bottom: 4px;
              }
              @media print {
                @page { margin: 0; size: 58mm auto; }
                body { margin: 0; padding: 5px; }
              }
            </style>
          </head>
          <body>
            <div class="header">CargoTrans</div>
            
            <div class="shipment-id">${shipment.shipment_number}</div>
            
            <div class="qr-container">${qrSvg}</div>
            
            <div class="info" style="text-align: center; border-bottom: 2px solid black; padding-bottom: 5px; margin-bottom: 5px;">
              ${shipment.from} -> ${shipment.to}
            </div>
            
            <div class="row info">
              <span>Вес:</span>
              <span>${shipment.weight} кг</span>
            </div>
            
            ${shipment.dimensions ? `
            <div class="row info">
              <span>Габариты:</span>
              <span>${shipment.dimensions}</span>
            </div>` : ''}
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 500);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
          <h2 className="text-xl font-semibold text-gray-900">{t('details')} {shipment.shipment_number}</h2>
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

          {/* Receiver Information */}
          {(shipment.receiver_name || shipment.receiver_phone) && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Информация о получателе</h3>
              <div className="space-y-2">
                {shipment.receiver_name && (
                  <div className="flex items-center gap-3">
                    <User className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-600">Получатель:</span>
                    <span className="text-sm font-medium text-gray-900">{shipment.receiver_name}</span>
                  </div>
                )}
                {shipment.receiver_phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-600">Телефон:</span>
                    <span className="text-sm font-medium text-gray-900">{shipment.receiver_phone}</span>
                  </div>
                )}
              </div>
            </div>
          )}

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
            <div id="qr-code-container" className="p-2 bg-white border-2 border-gray-300 rounded-lg shadow-sm">
              <QRCodeSVG
                value={shipment.shipment_number}
                size={96}
                level={"H"}
              />
            </div>
            <p className="text-xs text-gray-500 mt-2">{shipment.shipment_number}</p>
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 bg-gray-50 sticky bottom-0 flex gap-4">
          <button
            onClick={handlePrint}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 border border-gray-300 bg-white text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Printer className="w-4 h-4" />
            Распечатать чек
          </button>
          <button
            onClick={onClose}
            className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            {t('close')}
          </button>
        </div>
      </div>
    </div>
  );
}
