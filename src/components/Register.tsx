import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Building2, User, Mail, Lock, Phone, ArrowLeft } from 'lucide-react';

interface RegisterProps {
  onBackToLogin: () => void;
}

export function Register({ onBackToLogin }: RegisterProps) {
  const { register } = useAuth();
  const [step, setStep] = useState<'choose' | 'form'>('choose');
  const [selectedType, setSelectedType] = useState<'corporate' | 'individual' | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    company: '',
    phone: '',
    bin: ''
  });

  const handleTypeSelect = (type: 'corporate' | 'individual') => {
    setSelectedType(type);
    setStep('form');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      alert('Пароли не совпадают');
      return;
    }

    if (formData.password.length < 6) {
      alert('Пароль должен содержать минимум 6 символов');
      return;
    }

    if (!selectedType) return;

    register({
      name: formData.name,
      email: formData.email,
      password: formData.password,
      role: selectedType,
      company: selectedType === 'corporate' ? formData.company : undefined,
      phone: formData.phone
    });
  };

  if (step === 'choose') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="max-w-4xl w-full">
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
              Регистрация в CargoTrans
            </h1>
            <p className="text-gray-600">Выберите тип аккаунта</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-6">
            {/* Корпоративный клиент */}
            <button
              onClick={() => handleTypeSelect('corporate')}
              className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all border-2 border-transparent hover:border-blue-500 text-left group"
            >
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4 group-hover:bg-blue-500 transition-colors">
                <Building2 className="w-8 h-8 text-blue-600 group-hover:text-white" />
              </div>
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                Корпоративный клиент
              </h2>
              <p className="text-gray-600 mb-4">
                Для компаний и организаций с регулярными перевозками
              </p>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-0.5">✓</span>
                  <span>Депозитная система оплаты</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-0.5">✓</span>
                  <span>Льготные тарифы</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-0.5">✓</span>
                  <span>Персональный менеджер</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-0.5">✓</span>
                  <span>Детальная отчётность</span>
                </li>
              </ul>
            </button>

            {/* Физическое лицо */}
            <button
              onClick={() => handleTypeSelect('individual')}
              className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all border-2 border-transparent hover:border-indigo-500 text-left group"
            >
              <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mb-4 group-hover:bg-indigo-500 transition-colors">
                <User className="w-8 h-8 text-indigo-600 group-hover:text-white" />
              </div>
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                Физическое лицо
              </h2>
              <p className="text-gray-600 mb-4">
                Для частных лиц с разовыми или периодическими отправками
              </p>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-0.5">✓</span>
                  <span>Простая регистрация</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-0.5">✓</span>
                  <span>Оплата по факту</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-0.5">✓</span>
                  <span>Отслеживание отправлений</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-0.5">✓</span>
                  <span>История операций</span>
                </li>
              </ul>
            </button>
          </div>

          <div className="text-center">
            <button
              onClick={onBackToLogin}
              className="text-gray-600 hover:text-gray-900 flex items-center gap-2 mx-auto"
            >
              <ArrowLeft className="w-4 h-4" />
              Вернуться к входу
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8">
        <button
          onClick={() => setStep('choose')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Назад
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
            selectedType === 'corporate' ? 'bg-blue-100' : 'bg-indigo-100'
          }`}>
            {selectedType === 'corporate' ? (
              <Building2 className={`w-6 h-6 ${selectedType === 'corporate' ? 'text-blue-600' : 'text-indigo-600'}`} />
            ) : (
              <User className={`w-6 h-6 ${selectedType === 'corporate' ? 'text-blue-600' : 'text-indigo-600'}`} />
            )}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {selectedType === 'corporate' ? 'Корпоративный аккаунт' : 'Личный аккаунт'}
            </h1>
            <p className="text-sm text-gray-600">Заполните данные для регистрации</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {selectedType === 'corporate' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Название организации
                </label>
                <div className="relative">
                  <Building2 className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                  <input
                    type="text"
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder='ТОО "Название компании"'
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  БИН
                </label>
                <input
                  type="text"
                  value={formData.bin}
                  onChange={(e) => setFormData({ ...formData, bin: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="123456789012"
                  maxLength={12}
                  required
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {selectedType === 'corporate' ? 'Контактное лицо' : 'ФИО'}
            </label>
            <div className="relative">
              <User className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Введите ФИО"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <div className="relative">
              <Mail className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="example@mail.kz"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Телефон
            </label>
            <div className="relative">
              <Phone className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="+7 (___) ___-__-__"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Пароль
            </label>
            <div className="relative">
              <Lock className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Минимум 6 символов"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Подтвердите пароль
            </label>
            <div className="relative">
              <Lock className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
              <input
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Повторите пароль"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className={`w-full py-3 rounded-lg text-white font-medium transition-colors ${
              selectedType === 'corporate'
                ? 'bg-blue-600 hover:bg-blue-700'
                : 'bg-indigo-600 hover:bg-indigo-700'
            }`}
          >
            Зарегистрироваться
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={onBackToLogin}
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            Уже есть аккаунт? <span className="font-medium">Войти</span>
          </button>
        </div>
      </div>
    </div>
  );
}
