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
    let basePrice = 5000;
    const weight = parseFloat(shipmentData.weight) || 0;
    if (weight > 20) {
      basePrice += (weight - 20) * 150;
    }
    if (shipmentData.isFragile) basePrice += 1000;
    if (shipmentData.isOversized) basePrice += 2500;
    if (shipmentData.hasTicket) {
      basePrice = basePrice * 0.5;
    }
    return Math.round(basePrice);
  };

  const handleCreateShipment = async () => {
    try {
      const cost = calculateCost();
      const response = await fetch('/api/shipments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: user?.id || '',
          client_name: shipmentData.clientName,
          client_email: user?.email || '',
          from_station: shipmentData.fromStation,
          to_station: shipmentData.toStation,
          departure_date: shipmentData.departureDate,
          weight: shipmentData.weight,
          dimensions: shipmentData.dimensions,
          description: shipmentData.description,
          value: shipmentData.value,
          cost: cost,
          receiver_name: shipmentData.receiverName,
          receiver_phone: shipmentData.receiverPhone,
          train_time: shipmentData.trainTime
        })
      });


      if (response.ok) {
        const data = await response.json();
        setCreatedShipmentId(data.id);
        setCurrentStep('documents');
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to create shipment');
      }
    } catch (error) {
      console.error('Failed to create shipment:', error);
      alert('Failed to connect to server');
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