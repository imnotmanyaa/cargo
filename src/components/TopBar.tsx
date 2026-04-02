import { Sun, Moon, Menu, Search, Globe, LogOut, Bell } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { useState, useEffect } from 'react';

interface TopBarProps {
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onToggleLeftSidebar: () => void;
  onToggleRightSidebar: () => void;
}

interface Notification {
  id: number;
  message: string;
  read: boolean;
  created_at: string;
}

export function TopBar({ theme, onToggleTheme, onToggleLeftSidebar, onToggleRightSidebar }: TopBarProps) {
  const isDark = theme === 'dark';
  const { t, language, setLanguage } = useLanguage();
  const { user, logout } = useAuth();
  const currentTime = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (user?.id) {
      fetchNotifications();

      // Setup socket listener
      const socketProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const socket = new WebSocket(socketProtocol + '//' + window.location.host + '/ws');
      socket.onopen = () => {
        socket.send(JSON.stringify({ action: 'join-user', room: user.id.toString() }));
      };

      socket.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.event === 'notification:new') {
          const notification = msg.data;
          setNotifications(prev => [notification, ...prev]);
          setUnreadCount(prev => prev + 1);
          // const audio = new Audio('/notification.mp3'); // Optional
          // audio.play().catch(e => console.log('Audio play failed', e));
        }
      };

      return () => {
        socket.close();
      };
    }
  }, [user]);

  const fetchNotifications = async () => {
    try {
      const res = await fetch(`/api/notifications?userId=${user?.id}`);
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : [];
        setNotifications(list);
        setUnreadCount(list.filter((n: Notification) => !n.read).length);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const markAsRead = async (id: number) => {
    try {
      await fetch(`/api/notifications/${id}/read`, { method: 'PATCH' });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (e) {
      console.error(e);
    }
  };

  const getLanguageCode = () => {
    switch (language) {
      case 'ru': return 'RU';
      case 'en': return 'EN';
      case 'kk': return 'ҚЗ';
      default: return 'RU';
    }
  };

  // Проверяем, нужно ли показывать станцию и имя оператора
  const showStationInfo = user?.role === 'operator' || user?.role === 'receiver';

  return (
    <div className={`h-16 border-b ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} flex items-center justify-between px-3 md:px-6`}>
      <div className="flex items-center gap-2 md:gap-4">
        <button
          onClick={onToggleLeftSidebar}
          className={`p-2 rounded-lg ${isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
        >
          <Menu className={`w-5 h-5 ${isDark ? 'text-gray-300' : 'text-gray-600'}`} />
        </button>

        <div className="flex items-center gap-2 md:gap-3">
          <div className={`w-8 h-8 md:w-10 md:h-10 rounded-lg ${isDark ? 'bg-blue-600' : 'bg-blue-600'} flex items-center justify-center`}>
            <span className="text-white font-semibold text-base md:text-lg">CT</span>
          </div>
          {showStationInfo ? (
            <div className="hidden sm:block">
              <div className={`text-sm font-medium ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>
                {user?.station ? `Станция ${user.station}` : t('headerStation')}
              </div>
              <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                {user?.name} • {currentTime}
              </div>
            </div>
          ) : (
            <div className="hidden sm:block">
              <div className={`text-base font-semibold ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>
                CargoTrans
              </div>
              <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                {user?.name}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-4">
        {/* Поиск - скрываем на очень маленьких экранах */}
        <div className={`relative hidden md:block ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
          <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2" />
          <input
            type="text"
            placeholder={t('search')}
            className={`pl-10 pr-4 py-2 rounded-lg border w-32 lg:w-auto ${isDark
              ? 'bg-gray-700 border-gray-600 text-gray-200 placeholder-gray-400'
              : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-500'
              } focus:outline-none focus:ring-2 focus:ring-blue-500`}
          />
        </div>

        <div className="relative group">
          <button
            className={`p-2 rounded-lg relative ${isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
          >
            <Bell className={`w-4 h-4 md:w-5 md:h-5 ${isDark ? 'text-gray-300' : 'text-gray-600'}`} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
            )}
          </button>

          <div className={`absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto rounded-lg shadow-lg border opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <div className={`p-3 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
              <h3 className={`font-semibold ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>{t('notifications')}</h3>
            </div>
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500 text-sm">Нет новых уведомлений</div>
            ) : (
              notifications.map(n => (
                <div
                  key={n.id}
                  className={`p-3 border-b last:border-0 hover:bg-opacity-50 ${!n.read ? (isDark ? 'bg-blue-900/20' : 'bg-blue-50') : ''} ${isDark ? 'border-gray-700 hover:bg-gray-700' : 'border-gray-100 hover:bg-gray-50'}`}
                  onClick={() => markAsRead(n.id)}
                >
                  <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-800'}`}>{n.message}</p>
                  <p className="text-xs text-gray-500 mt-1">{new Date(n.created_at).toLocaleString()}</p>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="relative group">
          <button
            className={`flex items-center gap-1 md:gap-2 px-2 md:px-3 py-2 rounded-lg ${isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
          >
            <Globe className={`w-4 h-4 md:w-5 md:h-5 ${isDark ? 'text-gray-300' : 'text-gray-600'}`} />
            <span className={`text-xs md:text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{getLanguageCode()}</span>
          </button>

          <div className={`absolute right-0 mt-2 w-40 rounded-lg shadow-lg border opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
            }`}>
            <div className="py-1">
              <button
                onClick={() => setLanguage('ru')}
                className={`w-full px-4 py-2 text-left text-sm ${language === 'ru'
                  ? isDark ? 'bg-blue-900 text-blue-300' : 'bg-blue-50 text-blue-700'
                  : isDark ? 'hover:bg-gray-700 text-gray-200' : 'hover:bg-gray-50 text-gray-900'
                  }`}
              >
                Русский
              </button>
              <button
                onClick={() => setLanguage('en')}
                className={`w-full px-4 py-2 text-left text-sm ${language === 'en'
                  ? isDark ? 'bg-blue-900 text-blue-300' : 'bg-blue-50 text-blue-700'
                  : isDark ? 'hover:bg-gray-700 text-gray-200' : 'hover:bg-gray-50 text-gray-900'
                  }`}
              >
                English
              </button>
              <button
                onClick={() => setLanguage('kk')}
                className={`w-full px-4 py-2 text-left text-sm ${language === 'kk'
                  ? isDark ? 'bg-blue-900 text-blue-300' : 'bg-blue-50 text-blue-700'
                  : isDark ? 'hover:bg-gray-700 text-gray-200' : 'hover:bg-gray-50 text-gray-900'
                  }`}
              >
                Қазақша
              </button>
            </div>
          </div>
        </div>

        <button
          onClick={onToggleTheme}
          className={`p-2 rounded-lg ${isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
        >
          {isDark ? (
            <Sun className="w-4 h-4 md:w-5 md:h-5 text-gray-300" />
          ) : (
            <Moon className="w-4 h-4 md:w-5 md:h-5 text-gray-600" />
          )}
        </button>

        <button
          onClick={logout}
          className={`p-2 rounded-lg ${isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
          title="Выход"
        >
          <LogOut className={`w-4 h-4 md:w-5 md:h-5 ${isDark ? 'text-gray-300' : 'text-gray-600'}`} />
        </button>

        <button
          onClick={onToggleRightSidebar}
          className={`p-2 rounded-lg ${isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
        >
          <Menu className={`w-4 h-4 md:w-5 md:h-5 ${isDark ? 'text-gray-300' : 'text-gray-600'}`} />
        </button>
      </div>
    </div>
  );
}