
import { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { Package, Truck, CheckCircle, RefreshCw } from 'lucide-react';

interface Shipment {
    id: string;
    status: string;
    from_station: string;
    to_station: string;
    current_station: string;
    next_station: string;
    departure_date: string;
    created_at: string;
    weight: string;
    dimensions: string;
    description: string;
}

interface PublicTrackingProps {
    shipmentId: string;
}

export function PublicTracking({ shipmentId }: PublicTrackingProps) {
    const [shipment, setShipment] = useState<Shipment | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchShipment = async () => {
            try {
                // Fetch specific shipment details (public endpoint needed)
                const res = await fetch(`/api/shipments/${shipmentId}`, {
                    headers: {
                        'ngrok-skip-browser-warning': 'true'
                    }
                });
                if (!res.ok) {
                    throw new Error('Отправка не найдена');
                }
                const data = await res.json();
                setShipment(data);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        if (shipmentId) {
            fetchShipment();
        }
    }, [shipmentId]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (error || !shipment) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
                    <div className="text-red-500 text-5xl mb-4">:(</div>
                    <h1 className="text-2xl font-bold text-gray-800 mb-2">Ошибка</h1>
                    <p className="text-gray-600">{error || 'Информация не найдена'}</p>
                </div>
            </div>
        );
    }

    const steps = [
        { status: 'Принят', icon: Package, label: 'Принят' },
        { status: 'Погружен', icon: Package, label: 'Погружен' },
        { status: 'В пути', icon: Truck, label: 'В пути' },
        { status: 'Прибыл', icon: CheckCircle, label: 'Прибыл' },
        { status: 'Выдан', icon: CheckCircle, label: 'Выдан' },
    ];

    // Determine current step index
    // Simplified logic: 'Принят' -> 0, 'Погружен' -> 1, 'В пути' -> 2, 'Прибыл' -> 3, 'Выдан' -> 4
    const getStepIndex = (status: string) => {
        if (status === 'Принят') return 0;
        if (status === 'Погружен') return 1;
        if (status === 'В пути') return 2;
        if (status === 'Прибыл' || status === 'Доставлен') return 3;
        if (status === 'Выдан') return 4;
        return 0;
    };

    const currentStep = getStepIndex(shipment.status);

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto">
                <div className="bg-white shadow-xl rounded-2xl overflow-hidden">
                    {/* Header */}
                    <div className="bg-blue-600 px-6 py-8 text-white">
                        <div className="flex justify-between items-start">
                            <div>
                                <h1 className="text-2xl font-bold">Отслеживание груза</h1>
                                <p className="mt-2 text-blue-100">Номер отслеживания: <span className="font-mono font-bold">{shipment.id}</span></p>
                            </div>
                            <button
                                onClick={() => window.location.reload()}
                                className="bg-white/20 hover:bg-white/30 p-2 rounded-lg backdrop-blur-sm transition-colors text-white"
                                title="Обновить статус"
                            >
                                <RefreshCw className="w-8 h-8" />
                            </button>
                        </div>
                    </div>

                    {/* Status Bar */}
                    <div className="px-6 py-8 border-b bg-gray-50">
                        <div className="flex items-center justify-between">
                            <div className="flex flex-col">
                                <span className="text-sm text-gray-500">Текущий статус</span>
                                <span className="text-xl font-bold text-gray-900">{shipment.status}</span>
                            </div>
                            {shipment.current_station && (
                                <div className="flex flex-col text-right">
                                    <span className="text-sm text-gray-500">Местоположение</span>
                                    <span className="text-lg font-medium text-gray-900">{shipment.current_station}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Progress */}
                    <div className="px-6 py-8">
                        <div className="relative">
                            {/* Line */}
                            <div className="absolute top-1/2 left-0 w-full h-1 bg-gray-200 -translate-y-1/2 rounded-full"></div>
                            <div
                                className="absolute top-1/2 left-0 h-1 bg-blue-600 -translate-y-1/2 rounded-full transition-all duration-500"
                                style={{ width: `${(currentStep / (steps.length - 1)) * 100}%` }}
                            ></div>

                            {/* Steps */}
                            <div className="relative flex justify-between">
                                {steps.map((step, index) => {
                                    const isCompleted = index <= currentStep;
                                    const isCurrent = index === currentStep;
                                    const Icon = step.icon;

                                    return (
                                        <div key={index} className="flex flex-col items-center">
                                            <div className={`
                                                w-10 h-10 rounded-full flex items-center justify-center z-10 
                                                transition-colors duration-300
                                                ${isCompleted ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-400'}
                                                ${isCurrent ? 'ring-4 ring-blue-100' : ''}
                                            `}>
                                                <Icon className="w-5 h-5" />
                                            </div>
                                            <span className={`mt-2 text-xs font-medium ${isCompleted ? 'text-blue-600' : 'text-gray-400'}`}>
                                                {step.label}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Details Grid */}
                    <div className="px-6 py-8 bg-gray-50 border-t">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Детали отправки</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="p-4 bg-white rounded-lg border border-gray-100 shadow-sm">
                                <h4 className="text-sm font-medium text-gray-500 mb-1">Маршрут</h4>
                                <div className="flex items-center gap-2">
                                    <span className="font-semibold">{shipment.from_station}</span>
                                    <span className="text-gray-400">→</span>
                                    <span className="font-semibold">{shipment.to_station}</span>
                                </div>
                            </div>

                            <div className="p-4 bg-white rounded-lg border border-gray-100 shadow-sm">
                                <h4 className="text-sm font-medium text-gray-500 mb-1">Дата отправления</h4>
                                <div className="font-medium">
                                    {new Date(shipment.departure_date).toLocaleDateString()}
                                </div>
                            </div>

                            <div className="p-4 bg-white rounded-lg border border-gray-100 shadow-sm">
                                <h4 className="text-sm font-medium text-gray-500 mb-1">Вес и габариты</h4>
                                <div className="font-medium">{shipment.weight} кг</div>
                                <div className="text-sm text-gray-500">{shipment.dimensions}</div>
                            </div>

                            <div className="p-4 bg-white rounded-lg border border-gray-100 shadow-sm">
                                <h4 className="text-sm font-medium text-gray-500 mb-1">Описание</h4>
                                <div className="font-medium">{shipment.description || 'Не указано'}</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-8 text-center text-gray-500 text-sm">
                    &copy; 2024 Cargo Project. Все права защищены.
                </div>
            </div>
        </div>
    );
}
