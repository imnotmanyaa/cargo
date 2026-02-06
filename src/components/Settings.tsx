import { useLanguage } from '../contexts/LanguageContext';
import { Save } from 'lucide-react';

export function Settings({ theme }: { theme?: 'light' | 'dark' }) {
  const { t, language, setLanguage } = useLanguage();
  const isDark = theme === 'dark';

  return (
    <div>
      <div className="mb-8">
        <h1 className={`text-2xl font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>{t('settingsTitle')}</h1>
        <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>{t('settingsDesc')}</p>
      </div>

      <div className={`rounded-lg shadow-sm border p-8 max-w-2xl ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <div className="space-y-6">
          {/* Language Settings */}
          <div>
            <label className={`block text-sm font-medium mb-3 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              {t('languageSettings')}
            </label>
            <div className="space-y-2">
              <label className={`flex items-center p-3 border rounded-lg cursor-pointer ${
                isDark 
                  ? 'border-gray-600 hover:bg-gray-700' 
                  : 'border-gray-200 hover:bg-gray-50'
              }`}>
                <input
                  type="radio"
                  name="language"
                  value="ru"
                  checked={language === 'ru'}
                  onChange={(e) => setLanguage(e.target.value as 'ru' | 'en' | 'kk')}
                  className="w-4 h-4 text-blue-600"
                />
                <span className={`ml-3 text-sm ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>Русский</span>
              </label>
              <label className={`flex items-center p-3 border rounded-lg cursor-pointer ${
                isDark 
                  ? 'border-gray-600 hover:bg-gray-700' 
                  : 'border-gray-200 hover:bg-gray-50'
              }`}>
                <input
                  type="radio"
                  name="language"
                  value="en"
                  checked={language === 'en'}
                  onChange={(e) => setLanguage(e.target.value as 'ru' | 'en' | 'kk')}
                  className="w-4 h-4 text-blue-600"
                />
                <span className={`ml-3 text-sm ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>English</span>
              </label>
              <label className={`flex items-center p-3 border rounded-lg cursor-pointer ${
                isDark 
                  ? 'border-gray-600 hover:bg-gray-700' 
                  : 'border-gray-200 hover:bg-gray-50'
              }`}>
                <input
                  type="radio"
                  name="language"
                  value="kk"
                  checked={language === 'kk'}
                  onChange={(e) => setLanguage(e.target.value as 'ru' | 'en' | 'kk')}
                  className="w-4 h-4 text-blue-600"
                />
                <span className={`ml-3 text-sm ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>Қазақша</span>
              </label>
            </div>
          </div>

          {/* Theme Settings */}
          <div className={`pt-6 border-t ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
            <label className={`block text-sm font-medium mb-3 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              {t('themeSettings')}
            </label>
            <div className="space-y-2">
              <label className={`flex items-center p-3 border rounded-lg cursor-pointer ${
                isDark 
                  ? 'border-gray-600 hover:bg-gray-700' 
                  : 'border-gray-200 hover:bg-gray-50'
              }`}>
                <input
                  type="radio"
                  name="theme"
                  value="light"
                  defaultChecked={!isDark}
                  className="w-4 h-4 text-blue-600"
                />
                <span className={`ml-3 text-sm ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>{t('light')}</span>
              </label>
              <label className={`flex items-center p-3 border rounded-lg cursor-pointer ${
                isDark 
                  ? 'border-gray-600 hover:bg-gray-700' 
                  : 'border-gray-200 hover:bg-gray-50'
              }`}>
                <input
                  type="radio"
                  name="theme"
                  value="dark"
                  defaultChecked={isDark}
                  className="w-4 h-4 text-blue-600"
                />
                <span className={`ml-3 text-sm ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>{t('dark')}</span>
              </label>
            </div>
          </div>

          {/* Notification Settings */}
          <div className={`pt-6 border-t ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
            <label className={`block text-sm font-medium mb-3 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              {t('notificationSettings')}
            </label>
            <div className="space-y-3">
              <label className={`flex items-center justify-between p-3 border rounded-lg ${
                isDark ? 'border-gray-600' : 'border-gray-200'
              }`}>
                <span className={`text-sm ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>{t('emailNotifications')}</span>
                <input
                  type="checkbox"
                  defaultChecked
                  className="w-4 h-4 text-blue-600 rounded"
                />
              </label>
              <label className={`flex items-center justify-between p-3 border rounded-lg ${
                isDark ? 'border-gray-600' : 'border-gray-200'
              }`}>
                <span className={`text-sm ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>{t('smsNotifications')}</span>
                <input
                  type="checkbox"
                  defaultChecked
                  className="w-4 h-4 text-blue-600 rounded"
                />
              </label>
            </div>
          </div>

          {/* Save Button */}
          <div className="pt-6">
            <button className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              <Save className="w-5 h-5" />
              {t('saveSettings')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}