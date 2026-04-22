import { Package, List, Truck, MapPin, FileText, LayoutDashboard } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface MobileNavProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  theme: 'light' | 'dark';
  userRole?: string;
}

export function MobileNav({ currentPage, onNavigate, theme, userRole }: MobileNavProps) {
  const isDark = theme === 'dark';
  const { t } = useLanguage();

  const items = [
    ...(userRole === 'manager' || userRole === 'admin'
      ? [{ id: 'dashboard', icon: LayoutDashboard, label: t('dashboard') }]
      : []),
    { id: 'new-shipment', icon: Package, label: t('newShipment') },
    { id: 'active-shipments', icon: List, label: t('activeShipments') },
    { id: 'transit', icon: Truck, label: t('transit') },
    { id: 'arrival', icon: MapPin, label: t('arrival') },
    { id: 'reports', icon: FileText, label: t('reports') },
  ].slice(0, 5); // Keep max 5 items on mobile

  return (
    <nav
      className={`fixed bottom-0 left-0 right-0 z-50 pb-safe border-t lg:hidden ${
        isDark ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'
      }`}
      style={{ paddingBottom: 'max(8px, env(safe-area-inset-bottom))' }}
    >
      <div className="flex items-stretch justify-around">
        {items.map(({ id, icon: Icon, label }) => {
          const isActive = currentPage === id;
          return (
            <button
              key={id}
              onClick={() => onNavigate(id)}
              className={`flex flex-col items-center justify-center gap-1 flex-1 py-2 min-w-0 transition-colors ${
                isActive
                  ? isDark
                    ? 'text-blue-400'
                    : 'text-blue-600'
                  : isDark
                  ? 'text-gray-500'
                  : 'text-gray-400'
              }`}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              <span className="text-[10px] leading-tight truncate w-full text-center px-1">
                {label}
              </span>
              {isActive && (
                <span className={`absolute top-0 w-8 h-0.5 rounded-full ${isDark ? 'bg-blue-400' : 'bg-blue-600'}`} />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
