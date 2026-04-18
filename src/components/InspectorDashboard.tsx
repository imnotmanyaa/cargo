import { useState, useEffect, useRef, useCallback, KeyboardEvent } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';
import {
  CheckCircle2, XCircle, QrCode, Package, User, MapPin,
  AlertTriangle, Camera, Scan, AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';

interface ThemeProps {
  theme: 'light' | 'dark';
}

interface Inspection {
  id: string;
  parcelCode: string;
  time: string;
  result: 'approved' | 'rejected' | 'mismatch';
  sender: string;
  route: string;
}

interface ShipmentData {
  code: string;
  shipmentNumber: string;
  sender: string;
  recipient: string;
  route: string;
  fromStation: string;
  toStation: string;
  currentStation: string;
  contents: string;
  weight: string;
  status: string;
  stationMatch: boolean;
}

const STATUS_LABELS: Record<string, string> = {
  CREATED: 'Создан',
  PAYMENT_PENDING: 'Ожидает оплаты',
  PAID: 'Оплачен',
  READY_FOR_LOADING: 'Готов к погрузке',
  LOADED: 'Погружен',
  IN_TRANSIT: 'В пути',
  ARRIVED: 'Прибыл',
  READY_FOR_ISSUE: 'Готов к выдаче',
  ISSUED: 'Выдан',
  CLOSED: 'Закрыт',
  CANCELLED: 'Отменён',
};

function playBeep(frequency: number, duration = 150) {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = frequency;
    osc.type = 'square';
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration / 1000);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration / 1000);
  } catch { /* no AudioContext */ }
}

export function InspectorDashboard({ theme }: ThemeProps) {
  const { user } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);

  const [parcelCode, setParcelCode] = useState('');
  const [showParcelDialog, setShowParcelDialog] = useState(false);
  const [showRejectionDialog, setShowRejectionDialog] = useState(false);
  const [showScannerDialog, setShowScannerDialog] = useState(false);
  const [currentParcel, setCurrentParcel] = useState<ShipmentData | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectionComment, setRejectionComment] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [checkCount, setCheckCount] = useState<number>(0);
  const [approvedCount, setApprovedCount] = useState<number>(0);
  const [mismatchCount, setMismatchCount] = useState<number>(0);
  const [rejectedCount, setRejectedCount] = useState<number>(0);

  const [inspections, setInspections] = useState<Inspection[]>([]);

  // Refocus hidden input on click (for barcode scanners)
  useEffect(() => {
    const refocus = () => inputRef.current?.focus();
    document.addEventListener('click', refocus);
    document.addEventListener('touchend', refocus);
    inputRef.current?.focus();
    return () => {
      document.removeEventListener('click', refocus);
      document.removeEventListener('touchend', refocus);
    };
  }, []);

  const handleCheckParcel = useCallback(async (codeOverride?: string) => {
    const code = (codeOverride ?? parcelCode).trim();
    if (!code) {
      toast.error('Введите код груза');
      return;
    }
    if (isLoading) return;

    setIsLoading(true);
    const token = localStorage.getItem('token');

    try {
      const params = new URLSearchParams({ station: user?.station || '' });
      const res = await fetch(`/api/shipments/${encodeURIComponent(code)}/auditor-check?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        const s = data.shipment;
        const stationMatch: boolean = data.station_match;

        playBeep(stationMatch ? 880 : 440, stationMatch ? 150 : 300);

        const parcelData: ShipmentData = {
          code,
          shipmentNumber: s.shipment_number,
          sender: s.client_name,
          recipient: s.receiver_name || '—',
          route: `${s.from_station} → ${s.to_station}`,
          fromStation: s.from_station,
          toStation: s.to_station,
          currentStation: s.current_station,
          contents: s.description,
          weight: s.weight,
          status: s.shipment_status,
          stationMatch,
        };

        setCurrentParcel(parcelData);
        setShowParcelDialog(true);
        setParcelCode('');
        setCheckCount((c: number) => c + 1);
      } else if (res.status === 404) {
        playBeep(220, 500);
        toast.error(`Груз «${code}» не найден в системе`);
      } else if (res.status === 403) {
        playBeep(220, 400);
        toast.error('Нет доступа — только для ревизора');
      } else if (res.status === 401) {
        toast.error('Необходима авторизация');
      } else {
        playBeep(220, 400);
        toast.error('Ошибка сервера. Попробуйте снова');
      }
    } catch {
      playBeep(220, 400);
      toast.error('Ошибка сети. Проверьте подключение');
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  }, [parcelCode, isLoading, user]);

  const handleApprove = () => {
    if (!currentParcel) return;

    const newInspection: Inspection = {
      id: Date.now().toString(),
      parcelCode: currentParcel.shipmentNumber || currentParcel.code,
      time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
      result: currentParcel.stationMatch ? 'approved' : 'mismatch',
      sender: currentParcel.sender,
      route: currentParcel.route,
    };

    setInspections((prev: Inspection[]) => [newInspection, ...prev]);
    if (currentParcel.stationMatch) {
      setApprovedCount((c: number) => c + 1);
      toast.success('✅ Груз одобрен');
    } else {
      setMismatchCount((c: number) => c + 1);
      toast.warning('⚠️ Принято с отметкой о несовпадении станции');
    }
    setShowParcelDialog(false);
    setCurrentParcel(null);
  };

  const handleReject = () => {
    setShowParcelDialog(false);
    setShowRejectionDialog(true);
  };

  const handleConfirmRejection = () => {
    if (!rejectionReason) {
      toast.error('Выберите причину отклонения');
      return;
    }
    if (!currentParcel) return;

    const newInspection: Inspection = {
      id: Date.now().toString(),
      parcelCode: currentParcel.shipmentNumber || currentParcel.code,
      time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
      result: 'rejected',
      sender: currentParcel.sender,
      route: currentParcel.route,
    };

    setInspections((prev: Inspection[]) => [newInspection, ...prev]);
    setRejectedCount((c: number) => c + 1);
    toast.error('❌ Груз отклонён');
    setShowRejectionDialog(false);
    setCurrentParcel(null);
    setRejectionReason('');
    setRejectionComment('');
  };

  const handleOpenScanner = () => {
    setShowScannerDialog(true);
    setIsScanning(true);

    // Simulate camera scanning (in production use real camera API)
    setTimeout(() => {
      const mockCode = `KZ-ALM-2024-${Math.floor(1000 + Math.random() * 9000)}`;
      setParcelCode(mockCode);
      setIsScanning(false);
      setShowScannerDialog(false);
      toast.success('QR-код успешно отсканирован!');
      setTimeout(() => handleCheckParcel(mockCode), 500);
    }, 2000);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleCheckParcel(e.currentTarget.value);
    }
  };

  const cardBg = theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white';
  const textPrimary = theme === 'dark' ? 'text-white' : 'text-gray-900';
  const textSecondary = theme === 'dark' ? 'text-gray-400' : 'text-gray-600';
  const inputClass = theme === 'dark'
    ? 'bg-gray-700 border-gray-600 text-white placeholder:text-gray-500'
    : 'bg-white border-gray-300';

  return (
    <div className="max-w-2xl mx-auto space-y-4 pb-6">

      {/* Header */}
      <Card className={cardBg}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <CardTitle className={`text-lg sm:text-xl ${textPrimary}`}>
                {user?.name}
              </CardTitle>
              <CardDescription className={`text-sm ${textSecondary}`}>
                Ревизор · Проверка легитимности груза
              </CardDescription>
            </div>
            <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100 shrink-0">
              🔍 Только чтение
            </Badge>
          </div>
          <div className={`flex items-center gap-2 mt-2 text-sm ${textSecondary}`}>
            <MapPin className="w-4 h-4 shrink-0" />
            <span className="truncate">{user?.station || 'Станция не задана'}</span>
          </div>
        </CardHeader>
      </Card>

      {/* Statistics */}
      <div className="grid grid-cols-2 gap-3">
        <Card className={cardBg}>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex flex-col items-center text-center">
              <Package className={`w-6 h-6 mb-2 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`} />
              <div className={`text-2xl font-bold ${textPrimary}`}>{checkCount}</div>
              <div className={`text-xs ${textSecondary}`}>Проверено за смену</div>
            </div>
          </CardContent>
        </Card>

        <Card className={cardBg}>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex flex-col items-center text-center">
              <CheckCircle2 className="w-6 h-6 mb-2 text-green-600" />
              <div className={`text-2xl font-bold ${textPrimary}`}>{approvedCount}</div>
              <div className={`text-xs ${textSecondary}`}>Одобрено</div>
            </div>
          </CardContent>
        </Card>

        <Card className={cardBg}>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex flex-col items-center text-center">
              <XCircle className="w-6 h-6 mb-2 text-red-600" />
              <div className={`text-2xl font-bold ${textPrimary}`}>{rejectedCount}</div>
              <div className={`text-xs ${textSecondary}`}>Отклонено</div>
            </div>
          </CardContent>
        </Card>

        <Card className={cardBg}>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex flex-col items-center text-center">
              <AlertCircle className={`w-6 h-6 mb-2 ${theme === 'dark' ? 'text-yellow-400' : 'text-yellow-600'}`} />
              <div className={`text-2xl font-bold ${textPrimary}`}>{mismatchCount}</div>
              <div className={`text-xs ${textSecondary}`}>Несовп. станции</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Scan / Input Section */}
      <Card className={cardBg}>
        <CardHeader className="pb-3">
          <CardTitle className={`text-base sm:text-lg flex items-center gap-2 ${textPrimary}`}>
            <QrCode className="w-5 h-5" />
            Сканировать или ввести код груза
          </CardTitle>
          <CardDescription className={`text-sm ${textSecondary}`}>
            Введите номер отправки или QR-код вручную, либо используйте сканер
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label htmlFor="parcelCode" className={`text-sm ${textSecondary}`}>
              Код / номер груза
            </Label>
            {/* Hidden input for barcode scanner auto-focus */}
            <input
              ref={inputRef}
              value={parcelCode}
              onChange={e => setParcelCode(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              style={{ position: 'absolute', opacity: 0, width: 1, height: 1, pointerEvents: 'none' }}
              aria-hidden="true"
            />
            <Input
              id="parcelCode"
              value={parcelCode}
              onChange={e => setParcelCode(e.target.value)}
              placeholder="Введите номер отправки..."
              className={`mt-1.5 text-base h-12 ${inputClass}`}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
            />
          </div>
          <Button
            onClick={() => handleCheckParcel()}
            className="w-full h-12 text-base"
            disabled={isLoading}
          >
            <Package className="w-5 h-5 mr-2" />
            {isLoading ? 'Проверяется...' : 'Проверить груз'}
          </Button>
          <Button
            onClick={handleOpenScanner}
            variant="outline"
            className={`w-full h-12 text-base ${theme === 'dark' ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : ''}`}
            disabled={isLoading}
          >
            <Scan className="w-5 h-5 mr-2" />
            Открыть сканер QR
          </Button>
          <p className={`text-xs text-center ${textSecondary}`}>
            Режим только чтения — статус груза не изменяется
          </p>
        </CardContent>
      </Card>

      {/* Inspection History */}
      {inspections.length > 0 && (
        <Card className={cardBg}>
          <CardHeader className="pb-3">
            <CardTitle className={`text-base sm:text-lg ${textPrimary}`}>
              Журнал проверок
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className={`divide-y ${theme === 'dark' ? 'divide-gray-700' : 'divide-gray-200'}`}>
              {inspections.map((inspection) => (
                <div key={inspection.id} className={`p-4 ${theme === 'dark' ? 'hover:bg-gray-750' : 'hover:bg-gray-50'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`font-mono font-medium text-sm ${textPrimary}`}>
                          {inspection.parcelCode}
                        </span>
                        {inspection.result === 'approved' && (
                          <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100 text-xs">
                            ✅ Одобрен
                          </Badge>
                        )}
                        {inspection.result === 'rejected' && (
                          <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100 text-xs">
                            ❌ Отклонён
                          </Badge>
                        )}
                        {inspection.result === 'mismatch' && (
                          <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100 text-xs">
                            ⚠️ Несовпадение
                          </Badge>
                        )}
                      </div>
                      <div className={`text-xs ${textSecondary} space-y-0.5`}>
                        <div className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          <span className="truncate">{inspection.sender}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          <span className="truncate">{inspection.route}</span>
                        </div>
                      </div>
                    </div>
                    <span className={`text-xs shrink-0 ${textSecondary}`}>
                      {inspection.time}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Parcel Info Dialog */}
      <Dialog open={showParcelDialog} onOpenChange={setShowParcelDialog}>
        <DialogContent className={`max-w-md ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white'}`}>
          <DialogHeader>
            <DialogTitle className={textPrimary}>
              Информация о грузе
            </DialogTitle>
            <DialogDescription className={textSecondary}>
              {currentParcel?.shipmentNumber || currentParcel?.code}
            </DialogDescription>
          </DialogHeader>

          {currentParcel && (
            <div className="space-y-4">
              {/* Station match alert */}
              {!currentParcel.stationMatch && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
                  <AlertTriangle className="w-4 h-4 text-yellow-600 dark:text-yellow-400 shrink-0 mt-0.5" />
                  <div className="text-sm text-yellow-800 dark:text-yellow-300">
                    <strong>Груз не на ожидаемой станции!</strong>
                    <br />
                    Текущая станция груза: <strong>{currentParcel.currentStation}</strong>
                  </div>
                </div>
              )}
              {currentParcel.stationMatch && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                  <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
                  <div className="text-sm text-green-800 dark:text-green-300">
                    Груз находится на правильной станции
                  </div>
                </div>
              )}

              <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}`}>
                <div className="space-y-3">
                  <div>
                    <Label className={`text-xs ${textSecondary}`}>Отправитель</Label>
                    <div className={`text-sm font-medium mt-1 ${textPrimary}`}>{currentParcel.sender}</div>
                  </div>
                  <div>
                    <Label className={`text-xs ${textSecondary}`}>Получатель</Label>
                    <div className={`text-sm font-medium mt-1 ${textPrimary}`}>{currentParcel.recipient}</div>
                  </div>
                  <div>
                    <Label className={`text-xs ${textSecondary}`}>Маршрут</Label>
                    <div className={`text-sm font-medium mt-1 ${textPrimary}`}>{currentParcel.route}</div>
                  </div>
                  <div>
                    <Label className={`text-xs ${textSecondary}`}>Текущая станция</Label>
                    <div className={`text-sm font-medium mt-1 ${textPrimary}`}>{currentParcel.currentStation}</div>
                  </div>
                  <div>
                    <Label className={`text-xs ${textSecondary}`}>Описание груза</Label>
                    <div className={`text-sm font-medium mt-1 ${textPrimary}`}>{currentParcel.contents}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className={`text-xs ${textSecondary}`}>Вес</Label>
                      <div className={`text-sm font-medium mt-1 ${textPrimary}`}>{currentParcel.weight}</div>
                    </div>
                    <div>
                      <Label className={`text-xs ${textSecondary}`}>Статус</Label>
                      <div className={`text-sm font-medium mt-1 ${textPrimary}`}>
                        {STATUS_LABELS[currentParcel.status] || currentParcel.status}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={handleReject}
              className={`flex-1 ${
                theme === 'dark'
                  ? 'border-red-800 text-red-400 hover:bg-red-900/20'
                  : 'border-red-200 text-red-600 hover:bg-red-50'
              }`}
            >
              <XCircle className="w-4 h-4 mr-2" />
              Отклонить
            </Button>
            <Button
              onClick={handleApprove}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Одобрить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rejection Dialog */}
      <Dialog open={showRejectionDialog} onOpenChange={setShowRejectionDialog}>
        <DialogContent className={`max-w-md ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white'}`}>
          <DialogHeader>
            <DialogTitle className={`flex items-center gap-2 ${textPrimary}`}>
              <AlertTriangle className="w-5 h-5 text-red-600" />
              Отклонить груз
            </DialogTitle>
            <DialogDescription className={textSecondary}>
              Укажите причину отклонения
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label className={`text-sm ${textSecondary}`}>Причина отклонения</Label>
              <Select value={rejectionReason} onValueChange={setRejectionReason}>
                <SelectTrigger className={`mt-1.5 ${inputClass}`}>
                  <SelectValue placeholder="Выберите причину..." />
                </SelectTrigger>
                <SelectContent className={theme === 'dark' ? 'bg-gray-700 border-gray-600' : 'bg-white'}>
                  <SelectItem value="documents">Несоответствие документов</SelectItem>
                  <SelectItem value="prohibited">Запрещённые предметы</SelectItem>
                  <SelectItem value="damaged">Повреждённая упаковка</SelectItem>
                  <SelectItem value="weight">Несоответствие веса</SelectItem>
                  <SelectItem value="station_mismatch">Несоответствие станции</SelectItem>
                  <SelectItem value="other">Другое</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className={`text-sm ${textSecondary}`}>Комментарий (необязательно)</Label>
              <Textarea
                value={rejectionComment}
                onChange={(e) => setRejectionComment(e.target.value)}
                placeholder="Дополнительные сведения..."
                className={`mt-1.5 ${inputClass}`}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setShowRejectionDialog(false);
                setShowParcelDialog(true);
              }}
              className={theme === 'dark' ? 'border-gray-600 text-gray-300' : ''}
            >
              Назад
            </Button>
            <Button
              onClick={handleConfirmRejection}
              className="bg-red-600 hover:bg-red-700"
            >
              Подтвердить отклонение
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Scanner Dialog */}
      <Dialog open={showScannerDialog} onOpenChange={setShowScannerDialog}>
        <DialogContent className={`max-w-md ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white'}`}>
          <DialogHeader>
            <DialogTitle className={`flex items-center gap-2 ${textPrimary}`}>
              <Camera className="w-5 h-5 text-blue-600" />
              Сканер QR-кода
            </DialogTitle>
            <DialogDescription className={textSecondary}>
              Наведите камеру на QR-код груза
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className={`relative aspect-square rounded-lg overflow-hidden ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-100'}`}>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="relative w-48 h-48">
                  {/* Corner brackets */}
                  <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-blue-500"></div>
                  <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-blue-500"></div>
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-blue-500"></div>
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-blue-500"></div>

                  {/* Scanning line */}
                  {isScanning && (
                    <div className="absolute inset-x-0 top-0 h-1 bg-blue-500 animate-pulse" />
                  )}

                  <div className="absolute inset-0 flex items-center justify-center">
                    <QrCode className={`w-24 h-24 ${isScanning ? 'text-blue-500 animate-pulse' : theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`} />
                  </div>
                </div>
              </div>
            </div>

            {isScanning && (
              <div className={`text-center text-sm ${textSecondary}`}>
                <div className="flex items-center justify-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
                <p className="mt-2">Сканирование...</p>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => { setShowScannerDialog(false); setIsScanning(false); }}
              className={theme === 'dark' ? 'border-gray-600 text-gray-300' : ''}
            >
              Отмена
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
