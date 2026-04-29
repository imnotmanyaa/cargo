import { X, Package, MapPin, User, Printer, Download } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { QRCodeSVG } from 'qrcode.react';

interface ActiveShipmentDetailsProps {
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
    quantity_places?: number;
    description?: string;
    value?: string;
    departure_date?: string;
    receiver_name?: string;
    receiver_phone?: string;
    train_time?: string;
    statusColor?: string;
  };
  onClose: () => void;
  theme?: 'light' | 'dark';
}

export function ActiveShipmentDetails({ shipment, onClose, theme = 'light' }: ActiveShipmentDetailsProps) {
  const { t } = useLanguage();
  const isDark = theme === 'dark';

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    try {
      return new Date(dateString).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch { return dateString; }
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

  const card = `rounded-2xl p-6 ${isDark ? 'bg-gray-800 border-gray-700 shadow-lg border' : 'bg-white shadow-sm border border-gray-100'}`;
  const label = `text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`;
  const value = `text-base font-semibold mt-1 ${isDark ? 'text-gray-100' : 'text-gray-900'}`;
  const sectionTitle = `text-lg font-semibold mb-6 flex items-center gap-2 ${isDark ? 'text-gray-100' : 'text-gray-900'}`;

  return (
    <div className="w-full max-w-6xl mx-auto pb-12 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
          <button 
            onClick={onClose} 
            className={`p-2.5 rounded-xl transition-colors ${isDark ? 'hover:bg-gray-800 text-gray-400 bg-gray-800/50' : 'hover:bg-gray-100 text-gray-600 bg-white shadow-sm border border-gray-100'}`}
          >
            <X className="w-5 h-5" />
          </button>
          <div>
            <h1 className={`text-2xl md:text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {shipment.shipment_number}
            </h1>
            <div className="flex items-center gap-3 mt-1.5">
              <span className={`px-3 py-1 text-xs font-semibold rounded-full ${shipment.statusColor || 'bg-gray-100 text-gray-700'}`}>
                {shipment.status}
              </span>
              <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                Создано: {formatDate(shipment.date)}
              </span>
            </div>
          </div>
        </div>
        <button
          onClick={handlePrint}
          className={`flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-colors ${
            isDark 
              ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/20' 
              : 'bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20'
          }`}
        >
          <Printer className="w-4 h-4" />
          Печать наклеек
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info Column */}
        <div className="lg:col-span-2 space-y-6">
          <div className={card}>
            <h3 className={sectionTitle}>
              <User className={`w-5 h-5 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
              {t('mainInfo')}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <p className={label}>{t('client')}</p>
                <p className={value}>{shipment.client}</p>
              </div>
              {shipment.client_email && (
                <div>
                  <p className={label}>Email</p>
                  <p className={value}>{shipment.client_email}</p>
                </div>
              )}
            </div>
          </div>

          <div className={card}>
            <h3 className={sectionTitle}>
              <MapPin className={`w-5 h-5 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
              {t('routeInfo')}
            </h3>
            <div className={`flex items-center gap-4 p-4 rounded-xl ${isDark ? 'bg-gray-900/50' : 'bg-gray-50'} mb-6`}>
              <div className="flex-1">
                <p className={label}>{t('from')}</p>
                <p className={value}>{shipment.from}</p>
              </div>
              <div className={`w-12 h-[2px] rounded ${isDark ? 'bg-gray-700' : 'bg-gray-300'}`} />
              <div className="flex-1">
                <p className={label}>{t('to')}</p>
                <p className={value}>{shipment.to}</p>
              </div>
            </div>

          </div>

          {(shipment.receiver_name || shipment.receiver_phone) && (
            <div className={card}>
              <h3 className={sectionTitle}>
                <User className={`w-5 h-5 ${isDark ? 'text-purple-400' : 'text-purple-600'}`} />
                {t('receiverOther')}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {shipment.receiver_name && (
                  <div>
                    <p className={label}>{t('fullName')}</p>
                    <p className={value}>{shipment.receiver_name}</p>
                  </div>
                )}
                {shipment.receiver_phone && (
                  <div>
                    <p className={label}>{t('contactPhone')}</p>
                    <p className={value}>{shipment.receiver_phone}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
          <div className={card}>
            <h3 className={sectionTitle}>
              <Package className={`w-5 h-5 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
              {t('cargoParams')}
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700">
                <span className={label}>{t('weight')}</span>
                <span className={value}>{shipment.weight}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700">
                <span className={label}>{t('quantity')}</span>
                <span className={value}>{shipment.quantity_places || 1} шт</span>
              </div>
              {shipment.value && (
                <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700">
                  <span className={label}>{t('declaredValue')}</span>
                  <span className={value}>{shipment.value} ₸</span>
                </div>
              )}
            </div>

            {shipment.description && (
              <div className="mt-6">
                <p className={label}>{t('description')}</p>
                <p className={`mt-2 text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{shipment.description}</p>
              </div>
            )}
          </div>

          <div className={`${card} flex flex-col items-center justify-center py-8`}>
            <p className={`text-sm font-medium mb-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>QR-код для ТСД</p>
            <div id="qr-code-container" className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
              <QRCodeSVG value={shipment.id} size={140} />
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className={`mt-8 flex flex-col sm:flex-row gap-4`}>
        <button className={`flex-1 flex justify-center items-center gap-2 py-4 rounded-xl font-medium transition-all ${
          isDark 
            ? 'bg-blue-900/40 hover:bg-blue-900/60 text-blue-300 border border-blue-800' 
            : 'bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200'
        }`}>
          <Download className="w-5 h-5" />
          {t('downloadWaybill')}
        </button>
        <button className={`flex-1 flex justify-center items-center gap-2 py-4 rounded-xl font-medium transition-all ${
          isDark 
            ? 'bg-indigo-900/40 hover:bg-indigo-900/60 text-indigo-300 border border-indigo-800' 
            : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200'
        }`}>
          <Download className="w-5 h-5" />
          {t('downloadSurrenderList')}
        </button>
      </div>
    </div>
  );
}
