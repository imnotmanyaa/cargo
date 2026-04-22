import { useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { calculateShipmentCost } from '../lib/tariff';
import { useAuth } from '../contexts/AuthContext';
import { ClientInfo } from './shipment-steps/ClientInfo';
import { CargoDetails } from './shipment-steps/CargoDetails';
import { Payment } from './shipment-steps/Payment';
import { QRCodeSVG } from 'qrcode.react';

type Step = 'client' | 'cargo' | 'payment' | 'documents';

import { ArrowLeft } from 'lucide-react';

interface NewShipmentProps {
  theme?: 'light' | 'dark';
  onBack?: () => void;
}

export function NewShipment({ theme = 'light', onBack }: NewShipmentProps) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState<Step>('client');

  const [createdShipmentNumber, setCreatedShipmentNumber] = useState<string | null>(null);
  const [shipmentData, setShipmentData] = useState({
    clientType: 'individual',
    clientName: '',
    corporateClientId: '',
    clientSource: '',
    clientPhone: '',
    aggregatorClientId: '',
    contractNumber: '',
    hasDeposit: false,
    fromStation: '',
    toStation: '',
    departureDate: '',
    trainTime: '',
    weight: '',
    dimensions: '',
    isFragile: false,
    isOversized: false,
    packaging: '',
    value: '',
    quantityPlaces: 1,
    description: '',
    hasTicket: false,
    ticketNumber: '',
    receiverName: '',
    receiverPhone: ''
  });

  const updateShipmentData = (data: Partial<typeof shipmentData>) => {
    setShipmentData({ ...shipmentData, ...data });
  };

  const calculateCost = () => {
    return calculateShipmentCost({
      fromStation: shipmentData.fromStation,
      toStation: shipmentData.toStation,
      weight: shipmentData.weight,
      isFragile: shipmentData.value?.toLowerCase().includes('хрупк') || shipmentData.description?.toLowerCase().includes('хрупк'),
      isOversized: shipmentData.value?.toLowerCase().includes('негабарит') || shipmentData.description?.toLowerCase().includes('негабарит'),
      hasTicket: false // Currently not asked on single page form, left default
    }) || 0;
  };

  const normalizeStation = (v: string) => v.trim().toLowerCase();
  const sameFromTo =
    Boolean(shipmentData.fromStation) &&
    Boolean(shipmentData.toStation) &&
    normalizeStation(shipmentData.fromStation) === normalizeStation(shipmentData.toStation);

  const handleCreateShipment = async () => {
    if (sameFromTo) {
      alert('Пункты отправления и назначения не могут совпадать.');
      return;
    }

    const token = localStorage.getItem('token');
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };

    try {
      const createRes = await fetch('/api/shipments', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          client_id: shipmentData.clientType === 'legal' && shipmentData.corporateClientId ? shipmentData.corporateClientId : (user?.id || ''),
          client_name: shipmentData.clientName,
          client_email: user?.email || '',
          from_station: shipmentData.fromStation,
          to_station: shipmentData.toStation,
          departure_date: shipmentData.departureDate ? new Date(shipmentData.departureDate).toISOString() : new Date().toISOString(),
          weight: shipmentData.weight,
          dimensions: shipmentData.dimensions,
          description: shipmentData.description,
          value: shipmentData.value,
          cost: calculateCost(),
          quantity_places: shipmentData.quantityPlaces || 1,
          receiver_name: shipmentData.receiverName || null,
          receiver_phone: shipmentData.receiverPhone || null,
          train_time: shipmentData.trainTime || null
        })
      });

      if (!createRes.ok) {
        const err = await createRes.json().catch(() => ({}));
        alert(err.error || 'Ошибка при создании отправки');
        return;
      }
      const shipment = await createRes.json();
      const shipmentId = shipment.id;

      const calculatedCost = calculateCost();

      // Step 3: Send to payment
      const sendRes = await fetch(`/api/shipments/${shipmentId}/send-to-payment`, {
        method: 'POST',
        headers
      });
      if (!sendRes.ok) {
        const err = await sendRes.json().catch(() => ({}));
        alert(err.error || 'Ошибка при переводе в статус оплаты');
        return;
      }

      // Step 4: Create payment record
      const payRes = await fetch('/api/payments', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          shipment_id: shipmentId,
          amount: calculatedCost,
          payment_method: shipmentData.clientType === 'legal' && shipmentData.hasDeposit ? 'deposit' : 'cash'
        })
      });
      if (!payRes.ok) {
        const err = await payRes.json().catch(() => ({}));
        alert(err.error || 'Ошибка при создании платежа');
        return;
      }
      const payment = await payRes.json();

      // Step 5: Confirm payment
      const confirmRes = await fetch(`/api/payments/${payment.id}/confirm`, {
        method: 'POST',
        headers
      });
      if (!confirmRes.ok) {
        const err = await confirmRes.json().catch(() => ({}));
        alert(err.error || 'Ошибка при подтверждении оплаты');
        return;
      }

      await fetch(`/api/shipments/${shipmentId}/generate-qr`, {
        method: 'POST',
        headers
      });


      setCreatedShipmentNumber(shipment.shipment_number || shipmentId.substring(0, 8));
      setCurrentStep('documents');
    } catch (error) {
      console.error('Failed to create shipment:', error);
      alert('Ошибка соединения с сервером');
    }
  };

  const handlePrint = () => {
    const qrContainer = document.getElementById('qr-code-container');
    const qrSvg = qrContainer?.innerHTML || '';

    const printWindow = window.open('', '_blank');
    if (printWindow && createdShipmentNumber) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Печать ${createdShipmentNumber}</title>
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
            <div class="shipment-id">${createdShipmentNumber}</div>
            <div class="qr-container">${qrSvg}</div>
            
            <div class="info" style="text-align: center; border-bottom: 2px solid black; padding-bottom: 5px; margin-bottom: 5px;">
              ${shipmentData.fromStation} -> ${shipmentData.toStation}
            </div>
            
            <div class="row info">
              <span>Вес:</span>
              <span>${shipmentData.weight} кг</span>
            </div>
            
            ${shipmentData.dimensions ? `
            <div class="row info">
              <span>Габариты:</span>
              <span>${shipmentData.dimensions}</span>
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

  const renderStep = () => {
    switch (currentStep) {
      case 'client':
        return (
          <ClientInfo
            data={shipmentData}
            onUpdate={updateShipmentData}
            onNext={() => setCurrentStep('cargo')}
            theme={theme}
          />
        );
      case 'cargo':
        return (
          <CargoDetails
            data={shipmentData}
            onUpdate={updateShipmentData}
            onNext={() => setCurrentStep('payment')}
            onBack={() => setCurrentStep('client')}
          />
        );
      case 'payment':
        return (
          <Payment
            data={shipmentData}
            onUpdate={updateShipmentData}
            onNext={handleCreateShipment}
            onBack={() => setCurrentStep('cargo')}
          />
        );
      case 'documents':
        return (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
            <div className="max-w-md mx-auto">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">{t('shipmentCreated')}</h2>
              <p className="text-gray-600 mb-6">{t('documentsReady')}</p>

              {createdShipmentNumber && (
                <div className="mb-6 flex flex-col items-center">
                  <p className="text-sm text-gray-500 mb-2">QR-код для отслеживания:</p>
                  <div id="qr-code-container" className="p-2 bg-white border rounded-lg shadow-sm">
                    <QRCodeSVG
                      value={createdShipmentNumber}
                      size={160}
                      level={"H"}
                    />
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <button
                  onClick={handlePrint}
                  className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {t('printDocuments')}
                </button>
                <button
                  onClick={() => {
                    setCurrentStep('client');

                    setShipmentData({
                      clientType: 'individual',
                      clientName: '',
                      clientSource: '',
                      clientPhone: '',
                      aggregatorClientId: '',
                      contractNumber: '',
                      corporateClientId: '',
                      hasDeposit: false,
                      fromStation: '',
                      toStation: '',
                      departureDate: '',
                      trainTime: '',
                      weight: '',
                      dimensions: '',
                      isFragile: false,
                      isOversized: false,
                      packaging: '',
                      value: '',
                      quantityPlaces: 1,
                      description: '',
                      hasTicket: false,
                      ticketNumber: '',
                      receiverName: '',
                      receiverPhone: ''
                    });
                  }}
                  className="w-full px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  {t('newShipmentButton')}
                </button>
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          {currentStep === 'client' && onBack && (
            <button
              onClick={onBack}
              className={`p-2 rounded-full hover:bg-gray-100 ${theme === 'dark' ? 'text-gray-300 hover:bg-gray-800' : 'text-gray-600'}`}
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
          )}
          <div>
            <h1 className={`text-2xl font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{t('newShipmentTitle')}</h1>
            <p className="text-gray-600">{t('newShipmentDesc')}</p>
          </div>
        </div>
      </div>

      {currentStep !== 'documents' && (
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between max-w-3xl gap-3">
            <div className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${currentStep === 'client' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
                }`}>
                1
              </div>
              <span className={`ml-2 text-sm font-medium ${currentStep === 'client'
                ? (theme === 'dark' ? 'text-white' : 'text-gray-900')
                : (theme === 'dark' ? 'text-gray-400' : 'text-gray-500')
                }`}>
                {t('clientInfo')}
              </span>
            </div>

            <div className="hidden sm:block flex-1 h-px bg-gray-200 mx-4" />

            <div className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${currentStep === 'cargo' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
                }`}>
                2
              </div>
              <span className={`ml-2 text-sm font-medium ${currentStep === 'cargo' ? 'text-gray-900' : 'text-gray-500'
                }`}>
                {t('cargoDetails')}
              </span>
            </div>

            <div className="hidden sm:block flex-1 h-px bg-gray-200 mx-4" />

            <div className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${currentStep === 'payment' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
                }`}>
                3
              </div>
              <span className={`ml-2 text-sm font-medium ${currentStep === 'payment' ? 'text-gray-900' : 'text-gray-500'
                }`}>
                {t('payment')}
              </span>
            </div>
          </div>
        </div>
      )}

      {renderStep()}
    </div>
  );
}