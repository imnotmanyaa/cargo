import { useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { ClientInfo } from './shipment-steps/ClientInfo';
import { CargoDetails } from './shipment-steps/CargoDetails';
import { Payment } from './shipment-steps/Payment';
import { ShipmentLabel } from './ShipmentLabel';
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
  const [createdShipmentId, setCreatedShipmentId] = useState<string | null>(null);
  const [shipmentData, setShipmentData] = useState({
    clientType: 'individual',
    clientName: '',
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
    if (!shipmentData.fromStation || !shipmentData.toStation || !shipmentData.weight) {
      return 0;
    }

    const rates: Record<string, number> = {
      'алматы-1-астана нұрлы жол': 976,
      'астана нұрлы жол-алматы-1': 976,
      'алматы-1-қарағанды': 825,
      'қарағанды-алматы-1': 825,
      'алматы-1-атырау': 1145,
      'атырау-алматы-1': 1145,
      'алматы-1-шымкент': 590,
      'шымкент-алматы-1': 590,
      'алматы-1-ақтөбе': 1114,
      'ақтөбе-алматы-1': 1114,
    };

    const route = `${shipmentData.fromStation.toLowerCase()}-${shipmentData.toStation.toLowerCase()}`;
    const baseRate = rates[route] || 5000; // Default fallback rate

    const weight = parseFloat(shipmentData.weight) || 0;
    // Calculation is exactly proportional: (weight / 10) * baseRate
    let basePrice = (weight / 10) * baseRate;

    if (shipmentData.isFragile) basePrice += 1000;
    if (shipmentData.isOversized) basePrice += 1000;
    
    if (shipmentData.hasTicket) {
      basePrice = basePrice * 0.5;
    }
    return Math.round(basePrice);
  };

  const handleCreateShipment = async () => {
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
          cost: 0, // will be recalculated on backend
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

      // Step 2: Calculate tariff
      const tariffRes = await fetch(`/api/shipments/${shipmentId}/calculate-tariff`, {
        method: 'POST',
        headers
      });
      if (!tariffRes.ok) {
        const err = await tariffRes.json().catch(() => ({}));
        alert(err.error || 'Ошибка при расчёте тарифа');
        return;
      }
      const withTariff = await tariffRes.json();
      const calculatedCost = withTariff.cost || calculateCost();

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

      // Step 6: Generate QR code
      await fetch(`/api/shipments/${shipmentId}/generate-qr`, {
        method: 'POST',
        headers
      });

      setCreatedShipmentId(shipmentId);
      setCurrentStep('documents');
    } catch (error) {
      console.error('Failed to create shipment:', error);
      alert('Ошибка соединения с сервером');
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

              {createdShipmentId && (
                <div className="mb-6 flex flex-col items-center">
                  <p className="text-sm text-gray-500 mb-2">QR-код для отслеживания:</p>
                  <div className="p-2 bg-white border rounded-lg shadow-sm">
                    <QRCodeSVG
                      value={`${window.location.origin}/shipment/${createdShipmentId}`}
                      size={160}
                      level={"H"}
                    />
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <button
                  onClick={() => window.print()}
                  className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {t('printDocuments')}
                </button>
                <button
                  onClick={() => {
                    setCurrentStep('client');
                    setCreatedShipmentId(null);
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

              {/* Hidden label for printing */}
              <div className="print-only">
                <ShipmentLabel
                  data={{
                    ...shipmentData,
                    id: createdShipmentId,
                    date: new Date().toISOString()
                  }}
                  t={t}
                />
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
          <div className="flex items-center justify-between max-w-3xl">
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

            <div className="flex-1 h-px bg-gray-200 mx-4" />

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

            <div className="flex-1 h-px bg-gray-200 mx-4" />

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