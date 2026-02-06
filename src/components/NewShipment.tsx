import { useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { ClientInfo } from './shipment-steps/ClientInfo';
import { CargoDetails } from './shipment-steps/CargoDetails';
import { Payment } from './shipment-steps/Payment';

type Step = 'client' | 'cargo' | 'payment' | 'documents';

interface NewShipmentProps {
  theme?: 'light' | 'dark';
}

export function NewShipment({ theme = 'light' }: NewShipmentProps) {
  const { t } = useLanguage();
  const [currentStep, setCurrentStep] = useState<Step>('client');
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
    weight: '',
    dimensions: '',
    isFragile: false,
    isOversized: false,
    packaging: '',
    value: '',
    description: '',
    hasTicket: false,
    ticketNumber: ''
  });

  const updateShipmentData = (data: Partial<typeof shipmentData>) => {
    setShipmentData({ ...shipmentData, ...data });
  };

  // Import useAuth at the top if not present, but for now assuming user context is available or just mocking ID
  const handlePaymentNext = async () => {
    try {
      const response = await fetch('/api/shipments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_id: '1', // TODO: Get from auth context
          from_station: shipmentData.fromStation,
          to_station: shipmentData.toStation,
          weight: shipmentData.weight,
          dimensions: shipmentData.dimensions,
          description: shipmentData.description,
          value: shipmentData.value
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create shipment');
      }

      setCurrentStep('documents');
    } catch (error) {
      console.error('Error creating shipment:', error);
      alert('Ошибка при создании отправления');
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
            onNext={handlePaymentNext}
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
              <div className="space-y-3">
                <button className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
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
                      hasDeposit: false,
                      fromStation: '',
                      toStation: '',
                      departureDate: '',
                      weight: '',
                      dimensions: '',
                      isFragile: false,
                      isOversized: false,
                      packaging: '',
                      value: '',
                      description: '',
                      hasTicket: false,
                      ticketNumber: ''
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
      <div className="mb-8">
        <h1 className={`text-2xl font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{t('newShipmentTitle')}</h1>
        <p className="text-gray-600">{t('newShipmentDesc')}</p>
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