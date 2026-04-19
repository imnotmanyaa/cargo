import { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { CreditCard, Calendar, CheckCircle2 } from 'lucide-react';

interface Payment {
  id: string;
  shipment_id: string;
  amount: number;
  payment_method: string;
  status: string;
  created_at: string;
  paid_at?: string;
}

export function PaymentLog({ theme }: { theme?: 'light' | 'dark' }) {
  const { t } = useLanguage();
  const isDark = theme === 'dark';
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/payments/user', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setPayments(data || []);
      }
    } catch (e) {
      console.error('Failed to fetch payments', e);
    } finally {
      setIsLoading(false);
    }
  };

  const totalSum = payments.reduce((acc, p) => acc + ((p.status || '').toLowerCase() === 'confirmed' ? p.amount : 0), 0);

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className={`text-2xl font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>{t('paymentLog')}</h1>
          <p className="text-gray-600">{t('paymentLogDesc')}</p>
        </div>
        
        <div className={`px-6 py-4 rounded-xl border flex items-center gap-4 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <div className={`p-3 rounded-lg ${isDark ? 'bg-green-900/50' : 'bg-green-100'}`}>
            <CreditCard className={`w-6 h-6 ${isDark ? 'text-green-400' : 'text-green-600'}`} />
          </div>
          <div>
            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{t('totalSum')}</p>
            <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {totalSum.toLocaleString()} ₸
            </p>
          </div>
        </div>
      </div>

      <div className={`rounded-lg shadow-sm border overflow-hidden ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">Загрузка...</div>
        ) : payments.length === 0 ? (
          <div className="p-8 text-center text-gray-500">Нет записей об оплатах.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className={`text-left border-b ${isDark ? 'border-gray-700 text-gray-400' : 'border-gray-200 text-gray-500'}`}>
                  <th className="px-6 py-4 font-medium">{t('date')}</th>
                  <th className="px-6 py-4 font-medium">Сумма</th>
                  <th className="px-6 py-4 font-medium">Способ оплаты</th>
                  <th className="px-6 py-4 font-medium">{t('status')}</th>
                <tr className={`text-left border-b ${isDark ? 'border-gray-700 text-gray-400' : 'border-gray-200 text-gray-500'}`}>
                  <th className="px-6 py-4 font-medium">{t('date')}</th>
                  <th className="px-6 py-4 font-medium">Сумма</th>
                  <th className="px-6 py-4 font-medium">Способ оплаты</th>
                  <th className="px-6 py-4 font-medium">{t('status')}</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isDark ? 'divide-gray-700' : 'divide-gray-200'}`}>
                {payments.map(payment => (
                  <tr key={payment.id} className={`transition-colors ${isDark ? 'hover:bg-gray-750' : 'hover:bg-gray-50'}`}>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        {new Date(payment.created_at).toLocaleString()}
                      </div>
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {payment.amount.toLocaleString()} ₸
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                      {payment.payment_method === 'deposit' ? 'Депозит' : 'Терминал / Наличные'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                        (payment.status || '').toLowerCase() === 'confirmed' 
                          ? (isDark ? 'bg-green-900/50 text-green-400' : 'bg-green-100 text-green-700')
                          : (isDark ? 'bg-yellow-900/50 text-yellow-400' : 'bg-yellow-100 text-yellow-700')
                      }`}>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {(payment.status || '').toLowerCase() === 'confirmed' ? 'Подтвержден' : 'Ожидает'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
