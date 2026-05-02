import { X, Package, MapPin, Calendar, Weight, User, Phone, Printer } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { QRCodeSVG } from 'qrcode.react';

interface ShipmentDetailsModalProps {
  shipment: {
    id: string;
    shipment_number?: string;
    client: string;
    client_login?: string;
    from: string;
    to: string;
    status: string;
    date: string;
    weight: string;
    quantity_places?: number;
    description?: string;
    value?: string;
    departure_date?: string;
    receiver_name?: string;
    receiver_phone?: string;
    pickup_address?: string;
    delivery_address?: string;
    door_to_door_phone?: string;
  };
  onClose: () => void;
  theme?: 'light' | 'dark';
}

export function ShipmentDetailsModal({ shipment, onClose, theme = 'light' }: ShipmentDetailsModalProps) {
  const { t } = useLanguage();
  const isDark = theme === 'dark';

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    const d = new Date(dateString);
    if (Number.isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const handlePrint = () => {
    const qrContainer = document.getElementById('qr-code-container');
    const qrSvg = qrContainer?.innerHTML || '';
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      const totalPlaces = Math.max(1, Number(shipment.quantity_places) || 1);
      const labelsHtml = Array.from({ length: totalPlaces }).map((_, idx) => {
        const placeNum = idx + 1;
        const stickerCode = `${shipment.shipment_number}-${totalPlaces}`;
        return `
          <section class="label">
            <div class="header">CargoTrans</div>
            <div class="shipment-id">${stickerCode}</div>
            <div class="qr-container">${qrSvg}</div>
            <div class="info" style="text-align:center;border-bottom:2px solid black;padding-bottom:5px;margin-bottom:5px;">
              ${shipment.from} -> ${shipment.to}
            </div>
            <div class="row info"><span>Вес:</span><span>${shipment.weight}</span></div>
            <div class="row info"><span>Место:</span><span>${placeNum} из ${totalPlaces}</span></div>
          </section>`;
      }).join('');
      printWindow.document.write(`<!DOCTYPE html><html><head><title>Печать ${shipment.shipment_number}</title>
        <style>
          body{font-family:'Courier New',monospace;width:58mm;margin:0;padding:5px;color:black;background:white;}
          .label{page-break-after:always;margin-bottom:8px;}.label:last-child{page-break-after:auto;}
          .header{text-align:center;font-weight:bold;font-size:20px;margin-bottom:5px;text-transform:uppercase;}
          .shipment-id{text-align:center;font-size:22px;font-weight:bold;margin:5px 0;}
          .qr-container{display:flex;justify-content:center;margin:10px 0;}
          .qr-container svg{width:45mm!important;height:45mm!important;}
          .info{font-size:14px;font-weight:bold;margin-bottom:5px;}
          .row{display:flex;justify-content:space-between;margin-bottom:4px;}
          @media print{@page{margin:0;size:58mm auto;}body{margin:0;padding:5px;}}
        </style></head><body>${labelsHtml}</body></html>`);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => { printWindow.print(); printWindow.close(); }, 500);
    }
  };

  // Shared card class
  const card = `rounded-lg p-4 ${isDark ? 'bg-gray-700/50 border border-gray-600' : 'bg-gray-50'}`;
  const label = `text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`;
  const value = `text-sm font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'}`;
  const sectionTitle = `text-sm font-semibold mb-3 ${isDark ? 'text-gray-200' : 'text-gray-900'}`;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
      <div className={`rounded-xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
        {/* Header */}
        <div className={`p-6 border-b flex items-center justify-between sticky top-0 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <h2 className={`text-xl font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {t('details')} {shipment.shipment_number}
          </h2>
          <button onClick={onClose} className={`p-2 rounded-lg ${isDark ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Status */}
          <div className="flex items-center justify-between">
            <span className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${
              shipment.status === 'В пути' ? 'bg-blue-100 text-blue-700' :
              shipment.status === 'Погружен' ? 'bg-purple-100 text-purple-700' :
              shipment.status === 'Прибыл' ? 'bg-green-100 text-green-700' :
              shipment.status === 'Выдан' ? 'bg-emerald-100 text-emerald-700' :
              'bg-gray-100 text-gray-700'
            }`}>{shipment.status}</span>
            <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{shipment.date}</span>
          </div>

          {/* Client */}
          <div className={card}>
            <h3 className={sectionTitle}>{t('clientInfo')}</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <User className={`w-4 h-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                <span className={label}>{t('client')}:</span>
                <span className={value}>{shipment.client}</span>
              </div>
              {shipment.client_login && (
                <div className="flex items-center gap-3">
                  <Phone className={`w-4 h-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                  <span className={label}>Login:</span>
                  <span className={value}>{shipment.client_login}</span>
                </div>
              )}
            </div>
          </div>

          {/* Receiver & Door to door */}
          {(shipment.receiver_name || shipment.receiver_phone || shipment.pickup_address || shipment.delivery_address || shipment.door_to_door_phone) && (
            <div className={`rounded-lg border p-4 ${isDark ? 'bg-blue-900/20 border-blue-800/50' : 'bg-blue-50 border-blue-100'}`}>
              <h3 className={`text-sm font-semibold mb-3 ${isDark ? 'text-blue-300' : 'text-blue-800'}`}>Адреса и Получатель</h3>
              <div className="space-y-2">
                {shipment.receiver_name && (
                  <div className="flex items-center gap-3">
                    <User className={`w-4 h-4 shrink-0 ${isDark ? 'text-blue-400' : 'text-blue-500'}`} />
                    <span className={`text-sm shrink-0 ${isDark ? 'text-gray-300' : 'text-blue-700'}`}>ФИО:</span>
                    <span className={`text-sm font-medium ${isDark ? 'text-gray-100' : 'text-blue-900'}`}>{shipment.receiver_name}</span>
                  </div>
                )}
                {shipment.receiver_phone && (
                  <div className="flex items-center gap-3">
                    <Phone className={`w-4 h-4 shrink-0 ${isDark ? 'text-blue-400' : 'text-blue-500'}`} />
                    <span className={`text-sm shrink-0 ${isDark ? 'text-gray-300' : 'text-blue-700'}`}>Телефон:</span>
                    <span className={`text-sm font-medium ${isDark ? 'text-gray-100' : 'text-blue-900'}`}>{shipment.receiver_phone}</span>
                  </div>
                )}
                {shipment.door_to_door_phone && (
                  <div className="flex items-center gap-3">
                    <Phone className={`w-4 h-4 shrink-0 ${isDark ? 'text-blue-400' : 'text-blue-500'}`} />
                    <span className={`text-sm shrink-0 ${isDark ? 'text-gray-300' : 'text-blue-700'}`}>Тел (курьер):</span>
                    <span className={`text-sm font-medium ${isDark ? 'text-gray-100' : 'text-blue-900'}`}>{shipment.door_to_door_phone}</span>
                  </div>
                )}
                {shipment.pickup_address && (
                  <div className="flex items-start gap-3">
                    <MapPin className={`w-4 h-4 shrink-0 mt-0.5 ${isDark ? 'text-blue-400' : 'text-blue-500'}`} />
                    <span className={`text-sm shrink-0 ${isDark ? 'text-gray-300' : 'text-blue-700'}`}>Откуда:</span>
                    <span className={`text-sm font-medium ${isDark ? 'text-gray-100' : 'text-blue-900'}`}>{shipment.pickup_address}</span>
                  </div>
                )}
                {shipment.delivery_address && (
                  <div className="flex items-start gap-3">
                    <MapPin className={`w-4 h-4 shrink-0 mt-0.5 ${isDark ? 'text-blue-400' : 'text-blue-500'}`} />
                    <span className={`text-sm shrink-0 ${isDark ? 'text-gray-300' : 'text-blue-700'}`}>Куда:</span>
                    <span className={`text-sm font-medium ${isDark ? 'text-gray-100' : 'text-blue-900'}`}>{shipment.delivery_address}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Route */}
          <div className={card}>
            <h3 className={sectionTitle}>{t('route')}</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <MapPin className="w-4 h-4 text-green-500" />
                <span className={label}>{t('from')}:</span>
                <span className={value}>{shipment.from}</span>
              </div>
              <div className="flex items-center gap-3">
                <MapPin className="w-4 h-4 text-red-500" />
                <span className={label}>{t('to')}:</span>
                <span className={value}>{shipment.to}</span>
              </div>
              <div className="flex items-center gap-3">
                <Calendar className={`w-4 h-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                <span className={label}>{t('departureDate')}:</span>
                <span className={value}>{formatDate(shipment.departure_date || shipment.date)}</span>
              </div>
            </div>
          </div>

          {/* Cargo */}
          <div className={card}>
            <h3 className={sectionTitle}>{t('cargoDetails')}</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <Weight className={`w-4 h-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                <span className={label}>{t('weight')}:</span>
                <span className={value}>{shipment.weight}</span>
              </div>
              <div className="flex items-center gap-3">
                <Package className={`w-4 h-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                <span className={label}>Количество мест:</span>
                <span className={value}>{Math.max(1, Number(shipment.quantity_places) || 1)}</span>
              </div>
              {shipment.description && (
                <div className="flex items-center gap-3">
                  <Package className={`w-4 h-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                  <span className={label}>{t('description')}:</span>
                  <span className={value}>{shipment.description}</span>
                </div>
              )}
            </div>
          </div>

          {/* Payment */}
          {shipment.value && (
            <div className={card}>
              <h3 className={sectionTitle}>{t('payment')}</h3>
              <div className="flex items-center justify-between">
                <span className={label}>{t('declaredValue')}:</span>
                <span className={value}>{shipment.value} ₸</span>
              </div>
            </div>
          )}

          {/* QR Code */}
          <div className={`${card} flex flex-col items-center`}>
            <h3 className={`${sectionTitle} text-center`}>QR-код отправки</h3>
            <div id="qr-code-container" className={`p-3 rounded-lg border-2 ${isDark ? 'bg-white border-gray-600' : 'bg-white border-gray-200'} shadow-sm`}>
              <QRCodeSVG value={shipment.shipment_number || shipment.id} size={96} level="H" />
            </div>
            <p className={`text-xs mt-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{shipment.shipment_number}</p>
          </div>
        </div>

        {/* Footer */}
        <div className={`p-6 border-t sticky bottom-0 flex gap-3 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
          <button
            onClick={handlePrint}
            className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-lg border transition-colors ${
              isDark ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Printer className="w-4 h-4" />
            Распечатать чек
          </button>
          <button
            onClick={onClose}
            className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            {t('close')}
          </button>
        </div>
      </div>
    </div>
  );
}
