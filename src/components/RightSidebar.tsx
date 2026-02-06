import { useLanguage } from '../contexts/LanguageContext';
import { Settings, HelpCircle, Bell, User } from 'lucide-react';

interface RightSidebarProps {
  currentPage: string;
  theme: 'light' | 'dark';
}

export function RightSidebar({ currentPage, theme }: RightSidebarProps) {
  const isDark = theme === 'dark';
  const { t, language } = useLanguage();

  const getInstructions = () => {
    switch (currentPage) {
      case 'new-shipment':
        return {
          title: language === 'ru' ? 'Назначение шага' : language === 'en' ? 'Step Purpose' : 'Қадамның мақсаты',
          description: language === 'ru' 
            ? 'На этом этапе рассчитывается стоимость перевозки багажа и принимается оплата от клиента.'
            : language === 'en'
            ? 'At this stage, the cost of baggage transportation is calculated and payment is accepted from the client.'
            : 'Бұл кезеңде багажды тасымалдау құны есептеледі және клиенттен төлем қабылданады.',
          steps: [
            {
              number: 1,
              title: language === 'ru' ? 'Система автоматически рассчитывает стоимость' : language === 'en' ? 'System automatically calculates cost' : 'Жүйе құнды автоматты түрде есептейді',
              description: language === 'ru' 
                ? 'Стоимость рассчитывается на основе маршрута, веса/габаритов и не касается посторонних параметров.'
                : language === 'en'
                ? 'Cost is calculated based on route, weight/dimensions and does not involve extraneous parameters.'
                : 'Құн бағыт, салмақ/өлшемдер негізінде есептеледі және бөгде параметрлерге қатысты емес.'
            },
            {
              number: 2,
              title: language === 'ru' ? 'Считать вес с весов' : language === 'en' ? 'Read weight from scales' : 'Таразыдан салмақты оқу',
              description: language === 'ru'
                ? 'Вес ввод автоматически записывается в систему.'
                : language === 'en'
                ? 'Weight input is automatically recorded in the system.'
                : 'Салмақ енгізу жүйеде автоматты түрде жазылады.'
            },
            {
              number: 3,
              title: language === 'ru' ? 'Ручной ввод (при необходимости)' : language === 'en' ? 'Manual input (if necessary)' : 'Қолмен енгізу (қажет болса)',
              description: language === 'ru'
                ? 'Если вес недоступен, введите вручную и внесите в журнал операторов для уточнения.'
                : language === 'en'
                ? 'If weight is unavailable, enter manually and add to operator log for clarification.'
                : 'Егер салмақ қолжетімді болмаса, қолмен енгізіп, нақтылау үшін операторлар журналына енгізіңіз.'
            },
            {
              number: 4,
              title: language === 'ru' ? 'Отметьте характеристики багажа' : language === 'en' ? 'Mark baggage characteristics' : 'Багаж сипаттамаларын белгілеңіз',
              description: language === 'ru'
                ? 'Укажите, является ли багаж хрупким или негабаритным.'
                : language === 'en'
                ? 'Indicate whether baggage is fragile or oversized.'
                : 'Багаж сынғыш немесе габаритсіз екенін көрсетіңіз.'
            },
            {
              number: 5,
              title: language === 'ru' ? 'Добавьте комментарий (при необходимости)' : language === 'en' ? 'Add comment (if necessary)' : 'Түсініктеме қосыңыз (қажет болса)',
              description: language === 'ru'
                ? 'Любые особенности отправки можно зафиксировать в поле комментариев.'
                : language === 'en'
                ? 'Any shipment features can be recorded in the comments field.'
                : 'Жөнелтудің кез келген ерекшеліктерін түсініктемелер өрісінде жазуға болады.'
            }
          ]
        };
      case 'active-shipments':
        return {
          title: t('activeShipmentsTitle'),
          description: language === 'ru'
            ? 'Здесь отображаются все отправки в процессе обработки и транспортировки.'
            : language === 'en'
            ? 'All shipments in progress and transportation are displayed here.'
            : 'Мұнда өңдеу және тасымалдау процесіндегі барлық жөнелтулер көрсетіледі.',
          steps: [
            {
              number: 1,
              title: language === 'ru' ? 'Просмотр статуса' : language === 'en' ? 'View status' : 'Күйді қарау',
              description: language === 'ru'
                ? 'Проверьте текущий статус каждой отправки.'
                : language === 'en'
                ? 'Check the current status of each shipment.'
                : 'Әрбір жөнелтудің ағымдағы күйін тексеріңіз.'
            },
            {
              number: 2,
              title: language === 'ru' ? 'Фильтрация' : language === 'en' ? 'Filtering' : 'Сүзу',
              description: language === 'ru'
                ? 'Используйте фильтры для поиска нужных отправок.'
                : language === 'en'
                ? 'Use filters to search for needed shipments.'
                : 'Қажетті жөнелтулерді іздеу үшін сүзгілерді пайдаланыңыз.'
            },
            {
              number: 3,
              title: language === 'ru' ? 'Обновление статуса' : language === 'en' ? 'Status update' : 'Күйді жаңарту',
              description: language === 'ru'
                ? 'При необходимости обновите статус отправки.'
                : language === 'en'
                ? 'Update shipment status if necessary.'
                : 'Қажет болса жөнелту күйін жаңартыңыз.'
            }
          ]
        };
      case 'transit':
        return {
          title: t('transitTitle'),
          description: language === 'ru'
            ? 'Управление отправками в процессе транспортировки между станциями.'
            : language === 'en'
            ? 'Management of shipments in transit between stations.'
            : 'Станциялар арасында тасымалдау процесіндегі жөнелтулерді басқару.',
          steps: [
            {
              number: 1,
              title: language === 'ru' ? 'Сканирование QR' : language === 'en' ? 'QR Scanning' : 'QR сканерлеу',
              description: language === 'ru'
                ? 'Отсканируйте QR-код для регистрации транзита.'
                : language === 'en'
                ? 'Scan QR code to register transit.'
                : 'Транзитті тіркеу үшін QR-кодты сканерлеңіз.'
            },
            {
              number: 2,
              title: language === 'ru' ? 'Подтверждение маршрута' : language === 'en' ? 'Route confirmation' : 'Бағытты растау',
              description: language === 'ru'
                ? 'Убедитесь в правильности маршрута следования.'
                : language === 'en'
                ? 'Ensure route is correct.'
                : 'Бағыттың дұрыстығына көз жеткізіңіз.'
            }
          ]
        };
      default:
        return {
          title: language === 'ru' ? 'Инструкция' : language === 'en' ? 'Instructions' : 'Нұсқаулық',
          description: language === 'ru'
            ? 'Выберите раздел для просмотра инструкций.'
            : language === 'en'
            ? 'Select a section to view instructions.'
            : 'Нұсқауларды қарау үшін бөлімді таңдаңыз.',
          steps: []
        };
    }
  };

  const instructions = getInstructions();

  return (
    <div className={`w-80 h-full border-l ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} overflow-y-auto p-6`}>
      <h2 className={`text-lg font-semibold mb-2 ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>
        {instructions.title}
      </h2>
      <p className={`text-sm mb-6 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
        {instructions.description}
      </p>

      <div className="space-y-4">
        {instructions.steps.map((step) => (
          <div key={step.number} className="flex gap-3">
            <div className={`flex-shrink-0 w-6 h-6 rounded-full ${isDark ? 'bg-blue-600' : 'bg-blue-600'} text-white text-xs flex items-center justify-center font-medium`}>
              {step.number}
            </div>
            <div>
              <h3 className={`text-sm font-medium mb-1 ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>
                {step.title}
              </h3>
              <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                {step.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}