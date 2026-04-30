const fs = require('fs');

const path = 'src/contexts/LanguageContext.tsx';
let content = fs.readFileSync(path, 'utf8');

const ruStrs = `
    // Courier Dashboard
    tasksTitle: 'Задачи',
    availableTasks: 'Доступные задачи',
    myTasks: 'Мои задачи',
    noTasks: 'Нет задач',
    pickupType: 'Забор',
    deliveryType: 'Доставка',
    addressNotSpecified: 'Адрес не указан',
    activeBadge: 'Активен',
    noStation: 'Нет станции',
    takeTask: 'Взять задание',
    deliveredToReceiver: 'Доставил получателю',
    pickedUpFromClient: 'Забрал у клиента',
    handOverToStation: 'Сдайте на станцию',
    callClient: 'Позвонить',
    open2Gis: 'Открыть в 2ГИС',
    courierStatusWaitingPickup: 'Ожидает забора',
    courierStatusAssigned: 'Вы едете к клиенту',
    courierStatusPickedUp: 'У вас (сдать на станцию)',
    courierStatusWaitingDelivery: 'Ожидает доставки',
    courierStatusDelivered: 'Доставлено',
    courierStatusLoaded: 'Сдано на станцию',
`;

const enStrs = `
    // Courier Dashboard
    tasksTitle: 'Tasks',
    availableTasks: 'Available Tasks',
    myTasks: 'My Tasks',
    noTasks: 'No tasks',
    pickupType: 'Pickup',
    deliveryType: 'Delivery',
    addressNotSpecified: 'Address not specified',
    activeBadge: 'Active',
    noStation: 'No station',
    takeTask: 'Take Task',
    deliveredToReceiver: 'Delivered to Receiver',
    pickedUpFromClient: 'Picked up from Client',
    handOverToStation: 'Hand over to station',
    callClient: 'Call',
    open2Gis: 'Open in 2GIS',
    courierStatusWaitingPickup: 'Waiting for pickup',
    courierStatusAssigned: 'Heading to client',
    courierStatusPickedUp: 'With you (hand over to station)',
    courierStatusWaitingDelivery: 'Waiting for delivery',
    courierStatusDelivered: 'Delivered',
    courierStatusLoaded: 'Handed over to station',
`;

const kkStrs = `
    // Courier Dashboard
    tasksTitle: 'Тапсырмалар',
    availableTasks: 'Қолжетімді тапсырмалар',
    myTasks: 'Менің тапсырмаларым',
    noTasks: 'Тапсырмалар жоқ',
    pickupType: 'Алу',
    deliveryType: 'Жеткізу',
    addressNotSpecified: 'Мекенжай көрсетілмеген',
    activeBadge: 'Белсенді',
    noStation: 'Станция жоқ',
    takeTask: 'Тапсырманы алу',
    deliveredToReceiver: 'Алушыға жеткізілді',
    pickedUpFromClient: 'Клиенттен алынды',
    handOverToStation: 'Станцияға тапсырыңыз',
    callClient: 'Қоңырау шалу',
    open2Gis: '2GIS ашу',
    courierStatusWaitingPickup: 'Алуды күтуде',
    courierStatusAssigned: 'Клиентке бара жатырсыз',
    courierStatusPickedUp: 'Сізде (станцияға тапсыру керек)',
    courierStatusWaitingDelivery: 'Жеткізуді күтуде',
    courierStatusDelivered: 'Жеткізілді',
    courierStatusLoaded: 'Станцияға тапсырылды',
`;

content = content.replace("    createButton: 'Создать',", ruStrs + "    createButton: 'Создать',");
content = content.replace("    createButton: 'Create',", enStrs + "    createButton: 'Create',");
content = content.replace("    createButton: 'Жасау',", kkStrs + "    createButton: 'Жасау',");

fs.writeFileSync(path, content);
