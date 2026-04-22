import { Sun, Moon, Menu, Search, Globe, LogOut, Bell } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { useState, useEffect, useRef } from 'react';

interface TopBarProps {
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onToggleLeftSidebar: () => void;
  onToggleRightSidebar: () => void;
  hideSidebarButtons?: boolean;
}

interface Notification {
  id: number;
  message: string;
  read: boolean;
  type?: string;
  related_id?: string;
  created_at: string;
}

export function TopBar({ theme, onToggleTheme, onToggleLeftSidebar, onToggleRightSidebar, hideSidebarButtons = false }: TopBarProps) {
  const isDark = theme === 'dark';
  const { t, language, setLanguage } = useLanguage();
  const { user, logout } = useAuth();
  const currentTime = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [langOpen, setLangOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const langRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

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

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) setLangOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

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
    <div className={`h-16 border-b ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} flex items-center justify-between px-2 sm:px-3 md:px-6 overflow-x-hidden`}>
      <div className="flex items-center gap-1 sm:gap-2 md:gap-4 min-w-0">
        {!hideSidebarButtons && (
          <button
            onClick={onToggleLeftSidebar}
            className={`p-2 rounded-lg ${isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
          >
            <Menu className={`w-5 h-5 ${isDark ? 'text-gray-300' : 'text-gray-600'}`} />
          </button>
        )}

        <div className="flex items-center gap-2 md:gap-3 min-w-0">
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

      <div className="flex items-center gap-1 sm:gap-2 md:gap-4 flex-shrink-0">
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

        <div ref={notifRef} className="relative">
          <button
            onClick={() => { setNotifOpen(o => !o); setLangOpen(false); }}
            className={`p-2 rounded-lg relative ${isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
          >
            <Bell className={`w-4 h-4 md:w-5 md:h-5 ${isDark ? 'text-gray-300' : 'text-gray-600'}`} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
            )}
          </button>

          {notifOpen && (
            <div
              className={`fixed sm:absolute left-2 right-2 sm:left-auto sm:right-0 top-16 sm:top-auto sm:mt-2 w-auto sm:w-80 max-h-[70vh] sm:max-h-96 overflow-y-auto rounded-lg shadow-lg border z-50 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}
            >
              <div className={`p-3 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                <h3 className={`font-semibold ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>{t('notifications') || 'Уведомления'}</h3>
              </div>
              {notifications.length === 0 ? (
                <div className="p-4 text-center text-gray-500 text-sm">Нет новых уведомлений</div>
              ) : (
                notifications.map(n => (
                  <div
                    key={n.id}
                    className={`p-3 border-b last:border-0 cursor-pointer ${!n.read ? (isDark ? 'bg-blue-900/20' : 'bg-blue-50') : ''} ${isDark ? 'border-gray-700 hover:bg-gray-700' : 'border-gray-100 hover:bg-gray-50'}`}
                    onClick={() => {
                      markAsRead(n.id);
                      setSelectedNotification(n);
                    }}
                  >
                    <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-800'}`}>{n.message}</p>
                    <p className="text-xs text-gray-500 mt-1">{new Date(n.created_at).toLocaleString()}</p>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        <div ref={langRef} className="relative">
          <button
            onClick={() => { setLangOpen(o => !o); setNotifOpen(false); }}
            className={`flex items-center gap-1 md:gap-2 px-2 md:px-3 py-2 rounded-lg ${isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
          >
            <Globe className={`w-4 h-4 md:w-5 md:h-5 ${isDark ? 'text-gray-300' : 'text-gray-600'}`} />
            <span className={`hidden sm:inline text-xs md:text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{getLanguageCode()}</span>
          </button>

          {langOpen && (
            <div className={`fixed sm:absolute left-2 right-2 sm:left-auto sm:right-0 top-16 sm:top-auto sm:mt-2 w-auto sm:w-40 rounded-lg shadow-lg border z-50 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
              <div className="py-1">
                {(['ru', 'en', 'kk'] as const).map((lang) => (
                  <button
                    key={lang}
                    onClick={() => { setLanguage(lang); setLangOpen(false); }}
                    className={`w-full px-4 py-2 text-left text-sm flex items-center gap-2 ${
                      language === lang
                        ? isDark ? 'bg-blue-900 text-blue-300' : 'bg-blue-50 text-blue-700'
                        : isDark ? 'hover:bg-gray-700 text-gray-200' : 'hover:bg-gray-50 text-gray-900'
                    }`}
                  >
                    {language === lang && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />}
                    {lang === 'ru' ? 'Русский' : lang === 'en' ? 'English' : 'Қазақша'}
                  </button>
                ))}
              </div>
            </div>
          )}
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

        {!hideSidebarButtons && (
          <button
            onClick={onToggleRightSidebar}
            className={`hidden lg:inline-flex p-2 rounded-lg ${isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
          >
            <Menu className={`w-4 h-4 md:w-5 md:h-5 ${isDark ? 'text-gray-300' : 'text-gray-600'}`} />
          </button>
        )}
      </div>

      {selectedNotification && (
        <div className="fixed inset-0 z-[70] bg-black/40 flex items-center justify-center p-4" onClick={() => setSelectedNotification(null)}>
          <div
            className={`w-full max-w-lg rounded-lg border shadow-xl ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`px-4 py-3 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
              <div className={`font-semibold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>Детали уведомления</div>
            </div>
            <div className="p-4 space-y-3">
              <p className={`text-sm whitespace-pre-line ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>{selectedNotification.message}</p>
              <p className="text-xs text-gray-500">{new Date(selectedNotification.created_at).toLocaleString()}</p>
              <div className="flex gap-2 justify-end">
                {selectedNotification.related_id && (
                  <button
                    onClick={() => {
                      window.location.href = `/shipment/${selectedNotification.related_id}`;
                    }}
                    className="px-3 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                  >
                    Открыть груз
                  </button>
                )}
                <button
                  onClick={() => setSelectedNotification(null)}
                  className={`px-3 py-2 text-sm rounded-lg ${isDark ? 'bg-gray-700 text-gray-200' : 'bg-gray-100 text-gray-700'}`}
                >
                  Закрыть
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}