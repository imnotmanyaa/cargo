import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Package, Train, MapPin, CheckCircle, Loader } from 'lucide-react';

interface Shipment {
    id: string;
    client_name: string;
    from_station: string;
    to_station: string;
    status: string;
    weight: string;
    dimensions: string;
    description: string;
    departure_date: string;
    train_time?: string;
    receiver_name?: string;
    receiver_phone?: string;
}

interface ActionContext {
    shipment: Shipment;
    userRole: 'sender' | 'origin-receiver' | 'destination-receiver' | 'none' | 'guest';
    allowedActions: string[];
    requiresAuth: boolean;
}

export function ShipmentActionPage() {
    const { user } = useAuth();
    const { language: _lang } = useLanguage();
    const [context, setContext] = useState<ActionContext | null>(null);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);

    // Extract shipment ID from URL path: /shipment/:id
    const shipmentId = window.location.pathname.split('/shipment/')[1];

    useEffect(() => {
        if (shipmentId) {
            fetchActionContext();
        } else {
            setLoading(false);
        }
    }, [shipmentId, user]);

    const fetchActionContext = async () => {
        if (!shipmentId) return;

        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const headers: Record<string, string> = {
                'Content-Type': 'application/json'
            };

            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            const response = await fetch(`/api/shipments/${shipmentId}/action-context`, {
                headers
            });

            if (response.ok) {
                const data = await response.json();

                // If requires auth and not logged in, redirect to login
                if (data.requiresAuth && !user) {
                    window.location.href = `/login?redirect=/shipment/${shipmentId}`;
                    return;
                }

                setContext(data);
            } else {
                console.error('Failed to fetch action context');
            }
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleMarkLoaded = async () => {
        if (!context || !shipmentId) return;

        setProcessing(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/shipments/${shipmentId}/status`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    status: 'Погружен',
                    operator_id: user?.id,
                    operator_name: user?.name
                })
            });

            if (response.ok) {
                alert('Груз успешно отмечен как погруженный!');
                fetchActionContext(); // Refresh
            } else {
                alert('Ошибка при обновлении статуса');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Ошибка сети');
        } finally {
            setProcessing(false);
        }
    };

    const handleMarkArrived = async () => {
        if (!context || !shipmentId) return;

        setProcessing(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/shipments/${shipmentId}/arrive`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    current_station: context.shipment.to_station
                })
            });

            if (response.ok) {
                alert('Прибытие груза успешно зафиксировано!');
                fetchActionContext(); // Refresh
            } else {
                const err = await response.json().catch(() => ({}));
                alert(err.error || 'Ошибка при фиксировании прибытия');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Ошибка сети');
        } finally {
            setProcessing(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <Loader className="w-12 h-12 mx-auto animate-spin text-blue-600" />
                    <p className="mt-4 text-gray-600">Загрузка...</p>
                </div>
            </div>
        );
    }

    if (!context) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <p className="text-gray-600">Груз не найден</p>
                </div>
            </div>
        );
    }

    const { shipment, userRole } = context;

    // Guest View - Show public shipment details
    if (userRole === 'guest') {
        return (
            <div className="min-h-screen bg-gray-50 py-8 px-4">
                <div className="max-w-2xl mx-auto">
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <Package className="w-8 h-8 text-blue-600" />
                            <div>
                                <h1 className="text-2xl font-semibold text-gray-900">Информация о грузе</h1>
                                <p className="text-sm text-gray-600">{shipment.id}</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="bg-gray-50 rounded-lg p-4">
                                <h3 className="text-sm font-semibold text-gray-900 mb-2">Маршрут</h3>
                                <div className="flex items-center gap-2 text-sm">
                                    <MapPin className="w-4 h-4 text-green-600" />
                                    <span>{shipment.from_station}</span>
                                    <span className="text-gray-400">→</span>
                                    <MapPin className="w-4 h-4 text-red-600" />
                                    <span>{shipment.to_station}</span>
                                </div>
                            </div>

                            <div className="bg-gray-50 rounded-lg p-4">
                                <h3 className="text-sm font-semibold text-gray-900 mb-2">Статус</h3>
                                <span className="inline-flex px-3 py-1 text-sm font-medium rounded-full bg-blue-100 text-blue-700">
                                    {shipment.status}
                                </span>
                            </div>

                            <div className="bg-gray-50 rounded-lg p-4">
                                <h3 className="text-sm font-semibold text-gray-900 mb-2">Детали</h3>
                                <div className="space-y-1 text-sm text-gray-700">
                                    <p><strong>Вес:</strong> {shipment.weight} кг</p>
                                    <p><strong>Размеры:</strong> {shipment.dimensions}</p>
                                    <p><strong>Описание:</strong> {shipment.description}</p>
                                    {shipment.receiver_name && (
                                        <p><strong>Получатель:</strong> {shipment.receiver_name}</p>
                                    )}
                                </div>
                            </div>

                            <div className="pt-4 border-t border-gray-100">
                                <button
                                    onClick={() => window.location.href = `/login?redirect=/shipment/${shipment.id}`}
                                    className="w-full px-4 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors font-medium text-sm"
                                >
                                    Войти как сотрудник
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
    if (userRole === 'sender') {
        return (
            <div className="min-h-screen bg-gray-50 py-8 px-4">
                <div className="max-w-2xl mx-auto">
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <Package className="w-8 h-8 text-blue-600" />
                            <div>
                                <h1 className="text-2xl font-semibold text-gray-900">Информация о грузе</h1>
                                <p className="text-sm text-gray-600">{shipment.id}</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="bg-gray-50 rounded-lg p-4">
                                <h3 className="text-sm font-semibold text-gray-900 mb-2">Маршрут</h3>
                                <div className="flex items-center gap-2 text-sm">
                                    <MapPin className="w-4 h-4 text-green-600" />
                                    <span>{shipment.from_station}</span>
                                    <span className="text-gray-400">→</span>
                                    <MapPin className="w-4 h-4 text-red-600" />
                                    <span>{shipment.to_station}</span>
                                </div>
                            </div>

                            <div className="bg-gray-50 rounded-lg p-4">
                                <h3 className="text-sm font-semibold text-gray-900 mb-2">Статус</h3>
                                <span className="inline-flex px-3 py-1 text-sm font-medium rounded-full bg-blue-100 text-blue-700">
                                    {shipment.status}
                                </span>
                            </div>

                            <div className="bg-gray-50 rounded-lg p-4">
                                <h3 className="text-sm font-semibold text-gray-900 mb-2">Детали</h3>
                                <div className="space-y-1 text-sm text-gray-700">
                                    <p><strong>Вес:</strong> {shipment.weight} кг</p>
                                    <p><strong>Размеры:</strong> {shipment.dimensions}</p>
                                    <p><strong>Описание:</strong> {shipment.description}</p>
                                    {shipment.receiver_name && (
                                        <p><strong>Получатель:</strong> {shipment.receiver_name}</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Origin Receiver View - Show loading interface
    if (userRole === 'origin-receiver') {
        const isLoaded = shipment.status === 'Погружен' || shipment.status === 'В пути';

        return (
            <div className="min-h-screen bg-gray-50 py-8 px-4">
                <div className="max-w-2xl mx-auto">
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <Train className="w-8 h-8 text-green-600" />
                            <div>
                                <h1 className="text-2xl font-semibold text-gray-900">Погрузка груза</h1>
                                <p className="text-sm text-gray-600">{shipment.id}</p>
                            </div>
                        </div>

                        <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
                            <div className="text-center">
                                <Train className="w-16 h-16 mx-auto text-green-600 mb-4" />
                                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                                    Поезд отправления
                                </h2>
                                <div className="text-3xl font-bold text-green-700">
                                    {shipment.train_time || 'Время не указано'}
                                </div>
                                <p className="text-sm text-gray-600 mt-2">
                                    {new Date(shipment.departure_date).toLocaleDateString('ru-RU')}
                                </p>
                            </div>
                        </div>

                        <div className="bg-gray-50 rounded-lg p-4 mb-6">
                            <h3 className="text-sm font-semibold text-gray-900 mb-2">Маршрут</h3>
                            <div className="flex items-center gap-2 text-sm">
                                <MapPin className="w-4 h-4 text-green-600" />
                                <span>{shipment.from_station}</span>
                                <span className="text-gray-400">→</span>
                                <MapPin className="w-4 h-4 text-red-600" />
                                <span>{shipment.to_station}</span>
                            </div>
                        </div>

                        <div className="bg-gray-50 rounded-lg p-4 mb-6">
                            <p className="text-sm text-gray-700"><strong>Вес:</strong> {shipment.weight} кг</p>
                            <p className="text-sm text-gray-700"><strong>Клиент:</strong> {shipment.client_name}</p>
                        </div>

                        {!isLoaded ? (
                            <button
                                onClick={handleMarkLoaded}
                                disabled={processing}
                                className="w-full px-6 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                {processing ? 'Обработка...' : 'Отметить как погруженный'}
                            </button>
                        ) : (
                            <div className="flex items-center justify-center gap-2 text-green-600 py-4">
                                <CheckCircle className="w-6 h-6" />
                                <span className="font-semibold">Груз уже погружен</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // Destination Receiver View - Show arrival interface
    if (userRole === 'destination-receiver') {
        const hasArrived = shipment.status === 'Прибыл' || shipment.status === 'Выдан';

        return (
            <div className="min-h-screen bg-gray-50 py-8 px-4">
                <div className="max-w-2xl mx-auto">
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <MapPin className="w-8 h-8 text-blue-600" />
                            <div>
                                <h1 className="text-2xl font-semibold text-gray-900">Прибытие груза</h1>
                                <p className="text-sm text-gray-600">{shipment.id}</p>
                            </div>
                        </div>

                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
                            <div className="text-center">
                                <MapPin className="w-16 h-16 mx-auto text-blue-600 mb-4" />
                                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                                    Станция назначения
                                </h2>
                                <div className="text-2xl font-bold text-blue-700">
                                    {shipment.to_station}
                                </div>
                            </div>
                        </div>

                        <div className="bg-gray-50 rounded-lg p-4 mb-6">
                            <p className="text-sm text-gray-700"><strong>Отправлено из:</strong> {shipment.from_station}</p>
                            <p className="text-sm text-gray-700"><strong>Вес:</strong> {shipment.weight} кг</p>
                            <p className="text-sm text-gray-700"><strong>Клиент:</strong> {shipment.client_name}</p>
                            {shipment.receiver_name && (
                                <p className="text-sm text-gray-700"><strong>Получатель:</strong> {shipment.receiver_name}</p>
                            )}
                        </div>

                        {!hasArrived ? (
                            <button
                                onClick={handleMarkArrived}
                                disabled={processing}
                                className="w-full px-6 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                {processing ? 'Обработка...' : 'Зафиксировать прибытие'}
                            </button>
                        ) : (
                            <div className="flex items-center justify-center gap-2 text-green-600 py-4">
                                <CheckCircle className="w-6 h-6" />
                                <span className="font-semibold">Прибытие уже зафиксировано</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // No access
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
            <div className="text-center max-w-md w-full bg-white p-8 rounded-lg shadow-sm border border-gray-200">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-8 h-8 text-red-600 rotate-45" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Нет доступа</h2>
                <p className="text-gray-600 mb-6">
                    У вашего аккаунта нет прав для работы с этим грузом на текущей станции.
                </p>

                <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left text-sm">
                    <p className="mb-1"><span className="font-medium">Ваша роль:</span> {user?.role === 'receiver' ? 'Приемосдатчик' : user?.role}</p>
                    <p><span className="font-medium">Ваша станция:</span> {user?.station || 'Не указана'}</p>
                </div>

                <div className="space-y-3">
                    <button
                        onClick={() => window.location.href = '/'}
                        className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                    >
                        На главную
                    </button>
                    <button
                        onClick={() => {
                            // Logout via API logic would be better but simple cleanup works for now
                            localStorage.removeItem('user');
                            window.location.href = `/login?redirect=/shipment/${shipmentId}`;
                        }}
                        className="w-full px-4 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors font-medium"
                    >
                        Сменить аккаунт
                    </button>
                </div>
            </div>
        </div>
    );
}
