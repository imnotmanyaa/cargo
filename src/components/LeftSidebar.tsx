import { Package, List, Truck, MapPin, FileText, User, Building2, Warehouse, Settings as SettingsIcon } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface LeftSidebarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  theme: 'light' | 'dark';
}

export function LeftSidebar({ currentPage, onNavigate, theme }: LeftSidebarProps) {
  const isDark = theme === 'dark';
  const { t } = useLanguage();

  const menuItems = [
    { id: 'new-shipment', label: t('newShipment'), icon: Package },
    { id: 'active-shipments', label: t('activeShipments'), icon: List },
    { id: 'transit', label: t('transit'), icon: Truck },
    { id: 'arrival', label: t('arrival'), icon: MapPin },
    { id: 'wms', label: t('wms'), icon: Warehouse },
    { id: 'reports', label: t('reports'), icon: FileText },
  ];

  const pages = [
    { id: 'settings', label: t('settings'), icon: SettingsIcon },
    { id: 'user-profile', label: t('userProfile'), icon: User },
    { id: 'corporate', label: t('corporate'), icon: Building2 },
  ];

  return (
    <div className={`w-64 h-full border-r ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} overflow-y-auto`}>
      <div className="p-4">
        <div className="mb-6">
          <nav className="space-y-1">
            <div className={`text-xs uppercase tracking-wider mb-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
              {t('dashboard')}
            </div>
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                    isActive
                      ? isDark
                        ? 'bg-blue-600 text-white'
                        : 'bg-blue-50 text-blue-700'
                      : isDark
                      ? 'text-gray-300 hover:bg-gray-700'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>

        <div>
          <div className={`text-xs uppercase tracking-wider mb-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
            {t('pages')}
          </div>
          <nav className="space-y-1">
            {pages.map((item) => {
              const Icon = item.icon;
              const isActive = currentPage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                    isActive
                      ? isDark
                        ? 'bg-blue-600 text-white'
                        : 'bg-blue-50 text-blue-700'
                      : isDark
                      ? 'text-gray-300 hover:bg-gray-700'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>
      </div>
    </div>
  );
}