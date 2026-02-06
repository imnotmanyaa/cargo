import { useState } from 'react';
import { Package, QrCode, Weight, Ruler, CheckCircle } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

type CellStatus = 'free' | 'occupied' | 'maintenance';

interface StorageCell {
  id: string;
  number: string;
  status: CellStatus;
  shipmentId?: string;
}

type SelfServiceStep = 'scan' | 'place' | 'measure' | 'confirm';

export function WMS({ theme }: { theme?: 'light' | 'dark' }) {
  const { t } = useLanguage();
  const [selfServiceStep, setSelfServiceStep] = useState<SelfServiceStep>('scan');
  const [selectedCell, setSelectedCell] = useState<string | null>(null);
  const [measurements, setMeasurements] = useState({ weight: 0, dimensions: '' });

  const cells: StorageCell[] = [
    { id: '1', number: 'A-01', status: 'free' },
    { id: '2', number: 'A-02', status: 'occupied', shipmentId: 'SH-2024-001' },
    { id: '3', number: 'A-03', status: 'free' },
    { id: '4', number: 'A-04', status: 'free' },
    { id: '5', number: 'A-05', status: 'occupied', shipmentId: 'SH-2024-003' },
    { id: '6', number: 'A-06', status: 'maintenance' },
    { id: '7', number: 'B-01', status: 'free' },
    { id: '8', number: 'B-02', status: 'free' },
    { id: '9', number: 'B-03', status: 'occupied', shipmentId: 'SH-2024-005' },
    { id: '10', number: 'B-04', status: 'free' },
    { id: '11', number: 'B-05', status: 'free' },
    { id: '12', number: 'B-06', status: 'free' },
  ];

  const getCellColor = (status: CellStatus) => {
    switch (status) {
      case 'free':
        return 'bg-green-100 border-green-300 hover:bg-green-200';
      case 'occupied':
        return 'bg-red-100 border-red-300';
      case 'maintenance':
        return 'bg-yellow-100 border-yellow-300';
    }
  };

  const getCellTextColor = (status: CellStatus) => {
    switch (status) {
      case 'free':
        return 'text-green-700';
      case 'occupied':
        return 'text-red-700';
      case 'maintenance':
        return 'text-yellow-700';
    }
  };

  const handleScanComplete = () => {
    setSelfServiceStep('place');
    // Автоматически выбираем свободную ячейку
    const freeCell = cells.find(c => c.status === 'free');
    if (freeCell) {
      setSelectedCell(freeCell.number);
    }
  };

  const handlePlaceInCell = () => {
    setSelfServiceStep('measure');
    // Симулируем автоматическое измерение
    setTimeout(() => {
      setMeasurements({
        weight: Math.round((Math.random() * 30 + 5) * 10) / 10,
        dimensions: `${Math.round(Math.random() * 50 + 30)} × ${Math.round(Math.random() * 40 + 20)} × ${Math.round(Math.random() * 40 + 20)}`
      });
      setSelfServiceStep('confirm');
    }, 2000);
  };

  const handleConfirmShipment = () => {
    // Reset to initial state
    setSelfServiceStep('scan');
    setSelectedCell(null);
    setMeasurements({ weight: 0, dimensions: '' });
  };

  const getStatusLabel = (status: CellStatus) => {
    switch (status) {
      case 'free':
        return t('free');
      case 'occupied':
        return t('occupied');
      case 'maintenance':
        return t('maintenance');
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className={`text-2xl font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{t('wmsTitle')}</h1>
        <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>{t('wmsDesc')}</p>
      </div>

      <div className="grid grid-cols-1 2xl:grid-cols-3 gap-6">
        {/* Storage Cells Grid */}
        <div className={`2xl:col-span-2 rounded-lg shadow-sm border p-6 ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <div className="mb-6">
            <h2 className={`text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{t('storageCells')}</h2>
            
            <div className="flex gap-6 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-100 border border-green-300 rounded"></div>
                <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>{t('free')} ({cells.filter(c => c.status === 'free').length})</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-100 border border-red-300 rounded"></div>
                <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>{t('occupied')} ({cells.filter(c => c.status === 'occupied').length})</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-yellow-100 border border-yellow-300 rounded"></div>
                <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>{t('maintenance')} ({cells.filter(c => c.status === 'maintenance').length})</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-6 gap-3">
            {cells.map((cell) => (
              <div
                key={cell.id}
                className={`aspect-square border-2 rounded-lg flex flex-col items-center justify-center cursor-pointer transition-colors ${getCellColor(cell.status)} ${
                  selectedCell === cell.number ? 'ring-2 ring-blue-500' : ''
                }`}
                onClick={() => cell.status === 'free' && setSelectedCell(cell.number)}
              >
                <Package className={`w-6 h-6 mb-1 ${getCellTextColor(cell.status)}`} />
                <span className={`text-xs font-medium ${getCellTextColor(cell.status)}`}>
                  {cell.number}
                </span>
                {cell.shipmentId && (
                  <span className="text-xs text-gray-500 mt-1">{cell.shipmentId}</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Self-Service Panel */}
        <div className={`rounded-lg shadow-sm border p-6 ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <h2 className={`text-lg font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{t('selfService')}</h2>
          <p className={`text-sm mb-6 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>{t('selfServiceDesc')}</p>

          <div className="space-y-6">
            {/* Step 1: Scan Document */}
            <div className={`p-4 rounded-lg border-2 ${
              selfServiceStep === 'scan' 
                ? 'border-blue-500 bg-blue-50' 
                : selfServiceStep !== 'scan' 
                ? 'border-green-500 bg-green-50' 
                : (theme === 'dark' ? 'border-gray-600 bg-gray-700' : 'border-gray-200 bg-gray-50')
            }`}>
              <div className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  selfServiceStep === 'scan' 
                    ? 'bg-blue-600 text-white' 
                    : selfServiceStep !== 'scan'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-300 text-gray-600'
                }`}>
                  {selfServiceStep !== 'scan' ? <CheckCircle className="w-5 h-5" /> : '1'}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className={`font-medium mb-1 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{t('scanDocument')}</h3>
                  <p className={`text-xs mb-3 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>{t('scanDocumentDesc')}</p>
                  {selfServiceStep === 'scan' && (
                    <div className="mb-3">
                      <div className={`w-full h-32 border-2 border-dashed rounded-lg flex items-center justify-center ${
                        theme === 'dark' ? 'border-gray-600' : 'border-gray-300'
                      }`}>
                        <QrCode className={`w-12 h-12 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`} />
                      </div>
                    </div>
                  )}
                  {selfServiceStep === 'scan' && (
                    <button
                      onClick={handleScanComplete}
                      className="w-full px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
                    >
                      {t('startScanning')}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Step 2: Place in Cell */}
            <div className={`p-4 rounded-lg border-2 ${
              selfServiceStep === 'place' 
                ? 'border-blue-500 bg-blue-50' 
                : selfServiceStep === 'measure' || selfServiceStep === 'confirm'
                ? 'border-green-500 bg-green-50' 
                : (theme === 'dark' ? 'border-gray-600 bg-gray-700' : 'border-gray-200 bg-gray-50')
            }`}>
              <div className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  selfServiceStep === 'place' 
                    ? 'bg-blue-600 text-white' 
                    : selfServiceStep === 'measure' || selfServiceStep === 'confirm'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-300 text-gray-600'
                }`}>
                  {selfServiceStep === 'measure' || selfServiceStep === 'confirm' ? <CheckCircle className="w-5 h-5" /> : '2'}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className={`font-medium mb-1 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{t('placeInCell')}</h3>
                  <p className={`text-xs mb-3 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>{t('placeInCellDesc')}</p>
                  {selfServiceStep === 'place' && selectedCell && (
                    <>
                      <div className={`mb-3 p-3 rounded border ${
                        theme === 'dark' ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'
                      }`}>
                        <div className={`text-sm mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>{t('cellNumber')}:</div>
                        <div className="text-lg font-semibold text-blue-600">{selectedCell}</div>
                      </div>
                      <button
                        onClick={handlePlaceInCell}
                        className="w-full px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
                      >
                        {t('openCell')}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Step 3: Auto Measure */}
            <div className={`p-4 rounded-lg border-2 ${
              selfServiceStep === 'measure' 
                ? 'border-blue-500 bg-blue-50' 
                : selfServiceStep === 'confirm'
                ? 'border-green-500 bg-green-50' 
                : (theme === 'dark' ? 'border-gray-600 bg-gray-700' : 'border-gray-200 bg-gray-50')
            }`}>
              <div className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  selfServiceStep === 'measure' 
                    ? 'bg-blue-600 text-white' 
                    : selfServiceStep === 'confirm'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-300 text-gray-600'
                }`}>
                  {selfServiceStep === 'confirm' ? <CheckCircle className="w-5 h-5" /> : '3'}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className={`font-medium mb-1 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{t('autoMeasure')}</h3>
                  <p className={`text-xs mb-3 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>{t('autoMeasureDesc')}</p>
                  {selfServiceStep === 'measure' && (
                    <div className="flex items-center justify-center py-4">
                      <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
                    </div>
                  )}
                  {selfServiceStep === 'confirm' && (
                    <div className="space-y-2">
                      <div className={`flex items-center gap-2 p-2 rounded border ${
                        theme === 'dark' ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'
                      }`}>
                        <Weight className={`w-4 h-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`} />
                        <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>{t('weight')}:</span>
                        <span className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{measurements.weight} кг</span>
                      </div>
                      <div className={`flex items-center gap-2 p-2 rounded border ${
                        theme === 'dark' ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'
                      }`}>
                        <Ruler className={`w-4 h-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`} />
                        <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>{t('dimensions')}:</span>
                        <span className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{measurements.dimensions} см</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Step 4: Confirm */}
            <div className={`p-4 rounded-lg border-2 ${
              selfServiceStep === 'confirm' 
                ? 'border-blue-500 bg-blue-50' 
                : (theme === 'dark' ? 'border-gray-600 bg-gray-700' : 'border-gray-200 bg-gray-50')
            }`}>
              <div className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  selfServiceStep === 'confirm' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-300 text-gray-600'
                }`}>
                  4
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className={`font-medium mb-1 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{t('confirmShipment')}</h3>
                  <p className={`text-xs mb-3 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>{t('confirmShipmentDesc')}</p>
                  {selfServiceStep === 'confirm' && (
                    <>
                      <div className={`mb-3 p-3 rounded border flex justify-center ${
                        theme === 'dark' ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'
                      }`}>
                        <div className={`w-32 h-32 border-2 rounded flex items-center justify-center ${
                          theme === 'dark' ? 'border-gray-600' : 'border-gray-300'
                        }`}>
                          <QrCode className={`w-24 h-24 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-700'}`} />
                        </div>
                      </div>
                      <button
                        onClick={handleConfirmShipment}
                        className="w-full px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700"
                      >
                        {t('confirm')}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}