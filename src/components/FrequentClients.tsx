import { useEffect, useMemo, useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';

type Provider = 'glovo' | 'choko' | 'other';

interface FrequentClient {
  id: string;
  provider: Provider;
  company_name?: string;
  client_name: string;
  phone?: string;
  contract_number?: string;
  notes?: string;
}

export function FrequentClients({ theme = 'light' }: { theme?: 'light' | 'dark' }) {
  const { t } = useLanguage();
  const isDark = theme === 'dark';
  const [items, setItems] = useState<FrequentClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    provider: 'glovo' as Provider,
    company_name: '',
    client_name: '',
    phone: '',
    contract_number: '',
    notes: '',
  });

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/clients/frequent', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (!res.ok) throw new Error('Не удалось загрузить быстрых клиентов');
      setItems(await res.json());
    } catch (e: any) {
      setError(e?.message || 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const grouped = useMemo(() => {
    return {
      glovo: items.filter(i => i.provider === 'glovo'),
      choko: items.filter(i => i.provider === 'choko'),
      other: items.filter(i => i.provider === 'other'),
    };
  }, [items]);

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.client_name.trim()) {
      alert('Укажите имя клиента');
      return;
    }
    if (form.provider === 'other' && !form.company_name.trim()) {
      alert('Для "Другая компания" укажите название компании');
      return;
    }
    try {
      setSaving(true);
      const payload = {
        provider: form.provider,
        company_name: form.company_name.trim() || null,
        client_name: form.client_name.trim(),
        phone: form.phone.trim() || null,
        contract_number: form.contract_number.trim() || null,
        notes: form.notes.trim() || null,
      };
      const res = await fetch('/api/clients/frequent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Не удалось сохранить клиента');
      }
      setForm({
        provider: form.provider,
        company_name: '',
        client_name: '',
        phone: '',
        contract_number: '',
        notes: '',
      });
      await load();
    } catch (e: any) {
      alert(e?.message || 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className={`text-2xl font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>Быстрые клиенты</h1>
        <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>
          {t('clientInfo')} для Glovo, Choko и других компаний.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className={`xl:col-span-1 rounded-lg border p-5 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <h2 className={`text-lg font-medium mb-4 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>Добавить клиента</h2>
          <form onSubmit={onCreate} className="space-y-3">
            <select
              value={form.provider}
              onChange={(e) => setForm({ ...form, provider: e.target.value as Provider })}
              className={`w-full px-3 py-2 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600 text-gray-200' : 'border-gray-300'}`}
            >
              <option value="glovo">Glovo</option>
              <option value="choko">Choko</option>
              <option value="other">Другая компания</option>
            </select>
            {form.provider === 'other' && (
              <input
                value={form.company_name}
                onChange={(e) => setForm({ ...form, company_name: e.target.value })}
                placeholder="Название компании"
                className={`w-full px-3 py-2 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600 text-gray-200 placeholder-gray-400' : 'border-gray-300'}`}
              />
            )}
            <input
              value={form.client_name}
              onChange={(e) => setForm({ ...form, client_name: e.target.value })}
              placeholder="ФИО клиента"
              className={`w-full px-3 py-2 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600 text-gray-200 placeholder-gray-400' : 'border-gray-300'}`}
            />
            <input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="Телефон"
              className={`w-full px-3 py-2 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600 text-gray-200 placeholder-gray-400' : 'border-gray-300'}`}
            />
            <input
              value={form.contract_number}
              onChange={(e) => setForm({ ...form, contract_number: e.target.value })}
              placeholder="Номер договора"
              className={`w-full px-3 py-2 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600 text-gray-200 placeholder-gray-400' : 'border-gray-300'}`}
            />
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Комментарий"
              rows={3}
              className={`w-full px-3 py-2 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600 text-gray-200 placeholder-gray-400' : 'border-gray-300'}`}
            />
            <button
              disabled={saving}
              className="w-full px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-400"
            >
              {saving ? 'Сохраняем...' : 'Добавить'}
            </button>
          </form>
        </div>

        <div className={`xl:col-span-2 rounded-lg border p-5 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <h2 className={`text-lg font-medium mb-4 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>Список клиентов</h2>
          {loading ? (
            <div className="text-sm text-gray-500">Загрузка...</div>
          ) : error ? (
            <div className="text-sm text-red-600">{error}</div>
          ) : (
            <div className="space-y-5">
              {(['glovo', 'choko', 'other'] as Provider[]).map((provider) => {
                const list = grouped[provider];
                return (
                  <div key={provider}>
                    <h3 className={`text-sm font-semibold uppercase tracking-wide mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      {provider === 'glovo' ? 'Glovo' : provider === 'choko' ? 'Choko' : 'Другие компании'}
                    </h3>
                    {list.length === 0 ? (
                      <div className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Нет записей</div>
                    ) : (
                      <div className="space-y-2">
                        {list.map((item) => (
                          <div key={item.id} className={`rounded border p-3 ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                            <div className={`font-medium ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>
                              {item.client_name}
                              {item.company_name ? ` - ${item.company_name}` : ''}
                            </div>
                            <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                              {[item.phone, item.contract_number].filter(Boolean).join(' | ') || 'Без доп. данных'}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
