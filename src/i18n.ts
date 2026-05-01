import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

const resources = {
  ru: {
    translation: {
      "nav": {
        "dashboard": "Панель",
        "new_shipment": "Новая посылка",
        "tracking": "Трекинг",
        "logout": "Выйти",
        "login": "Войти",
        "register": "Регистрация"
      },
      "dashboard": {
        "title": "Личный кабинет",
        "active_shipments": "Активные отправления",
        "search_placeholder": "Поиск по номеру или городу...",
        "no_shipments": "У вас пока нет активных отправлений"
      },
      "shipment": {
        "number": "Номер",
        "route": "Маршрут",
        "status": "Статус",
        "date": "Дата",
        "cost": "Стоимость",
        "weight": "Вес"
      },
      "status": {
        "created": "Оформлено",
        "payment_pending": "Ожидает оплаты",
        "paid": "Оплачено",
        "pickup_assigned": "Курьер назначен",
        "picked_up": "Курьер забрал",
        "at_station": "На складе",
        "in_transit": "В пути",
        "arrived": "Прибыло",
        "ready_for_issue": "Готово к выдаче",
        "issued": "Выдано",
        "cancelled": "Отменено"
      }
    }
  },
  kk: {
    translation: {
      "nav": {
        "dashboard": "Панель",
        "new_shipment": "Жаңа сәлемдеме",
        "tracking": "Трекинг",
        "logout": "Шығу",
        "login": "Кіру",
        "register": "Тіркелу"
      },
      "dashboard": {
        "title": "Жеке кабинет",
        "active_shipments": "Белсенді жөнелтілімдер",
        "search_placeholder": "Нөмір немесе қала бойынша іздеу...",
        "no_shipments": "Сізде әзірге белсенді жөнелтілімдер жоқ"
      },
      "shipment": {
        "number": "Нөмір",
        "route": "Маршрут",
        "status": "Мәртебе",
        "date": "Күн",
        "cost": "Құны",
        "weight": "Салмағы"
      },
      "status": {
        "created": "Ресімделді",
        "payment_pending": "Төлем күтілуде",
        "paid": "Төленді",
        "pickup_assigned": "Курьер тағайындалды",
        "picked_up": "Курьер алып кетті",
        "at_station": "Қоймада",
        "in_transit": "Жолда",
        "arrived": "Келді",
        "ready_for_issue": "Беруге дайын",
        "issued": "Берілді",
        "cancelled": "Бас тартылды"
      }
    }
  },
  en: {
    translation: {
      "nav": {
        "dashboard": "Dashboard",
        "new_shipment": "New Shipment",
        "tracking": "Tracking",
        "logout": "Logout",
        "login": "Login",
        "register": "Register"
      },
      "dashboard": {
        "title": "Personal Account",
        "active_shipments": "Active Shipments",
        "search_placeholder": "Search by number or city...",
        "no_shipments": "You have no active shipments yet"
      },
      "shipment": {
        "number": "Number",
        "route": "Route",
        "status": "Status",
        "date": "Date",
        "cost": "Cost",
        "weight": "Weight"
      },
      "status": {
        "created": "Created",
        "payment_pending": "Payment Pending",
        "paid": "Paid",
        "pickup_assigned": "Courier Assigned",
        "picked_up": "Picked Up",
        "at_station": "At Warehouse",
        "in_transit": "In Transit",
        "arrived": "Arrived",
        "ready_for_issue": "Ready for Issue",
        "issued": "Issued",
        "cancelled": "Cancelled"
      }
    }
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'ru',
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;
