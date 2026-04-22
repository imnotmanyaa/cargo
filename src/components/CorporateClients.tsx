import { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { Building2, Plus, Search, Edit, Trash2, Phone, Mail, X, Save } from 'lucide-react';

interface CorporateClient {
  id: string;
  name: string; // Contact Person
  company: string; // Company Name
  contract_number: string; // BIN/Contract
  deposit_balance: number;
  phone: string;
  email: string;
  activeShipments?: number; // Not in DB yet, optional
}

export function CorporateClients({ theme }: { theme?: 'light' | 'dark' }) {
  const { t } = useLanguage();
  const isDark = theme === 'dark';
  const [clients, setClients] = useState<CorporateClient[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingClientId, setEditingClientId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    companyName: '',
    bin: '', // Will be saved as contract_number
    contactPerson: '', // Will be saved as name
    email: '',
    phone: '',
    password: '',
    deposit: ''
  });

  const fetchClients = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/clients?ts=' + Date.now(), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setClients(Array.isArray(data) ? data : []);
      } else {
        console.error('Failed to fetch clients', res.status);
      }
    } catch (error) {
      console.error('Failed to fetch clients', error);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const handleEditClick = (client: CorporateClient) => {
    setFormData({
      companyName: client.company || '',
      bin: client.contract_number || '',
      contactPerson: client.name || '',
      email: client.email || '',
      phone: client.phone || '',
      password: '', // Leave empty for edit
      deposit: client.deposit_balance ? client.deposit_balance.toString() : ''
    });
    setEditingClientId(client.id);
    setShowAddModal(true);
  };

  const handleDeleteClient = async (id: string) => {
    if (!window.confirm(t('confirmDeleteClient'))) return;
    try {
      const res = await fetch(`/api/clients/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (res.ok) {
        fetchClients();
      } else {
        const error = await res.json();
        alert(error.message || 'Error deleting client');
      }
    } catch (error) {
      console.error('Error deleting client', error);
    }
  };

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const url = editingClientId ? `/api/clients/${editingClientId}` : '/api/clients';
      const method = editingClientId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          name: formData.contactPerson,
          email: formData.email,
          ...(formData.password ? { password: formData.password } : {}), // only send if filled
          company: formData.companyName,
          bin: formData.bin,
          phone: formData.phone,
          deposit: formData.deposit ? parseFloat(formData.deposit) : 0
        })
      });

      if (res.ok) {
        setShowAddModal(false);
        setEditingClientId(null);
        setFormData({
          companyName: '',
          bin: '',
          contactPerson: '',
          email: '',
          phone: '',
          password: '',
          deposit: ''
        });
        fetchClients();
        alert('Клиент успешно создан');
      } else {
        const error = await res.json();
        alert(error.message || 'Ошибка при создании клиента');
      }
    } catch (error) {
      console.error('Error creating client', error);
      alert('Ошибка соединения');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className={`text-2xl font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>{t('corporate')}</h1>
          <p className="text-gray-600">{t('corporateClientsDesc')}</p>
        </div>
        <button
          onClick={() => {
            setEditingClientId(null);
            setFormData({ companyName: '', bin: '', contactPerson: '', email: '', phone: '', password: '', deposit: '' });
            setShowAddModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-5 h-5" />
          {t('addClient')}
        </button>
      </div>

      <div className={`rounded-lg shadow-sm border mb-6 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <div className={`p-6 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className={`w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
              <input
                type="text"
                placeholder={t('searchByNameOrContract')}
                className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDark
                  ? 'bg-gray-700 border-gray-600 text-gray-200 placeholder-gray-400'
                  : 'border-gray-300'
                  }`}
              />
            </div>
          </div>
        </div>

        <div className={`divide-y ${isDark ? 'divide-gray-700' : 'divide-gray-200'}`}>
          {clients.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              {t('noCorporateClients')}
            </div>
          ) : (
            clients.map((client) => (
              <div key={client.id} className={`p-6 transition-colors ${isDark ? 'hover:bg-gray-750' : 'hover:bg-gray-50'}`}>
                <div className="flex items-start justify-between">
                  <div className="flex gap-4">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${isDark ? 'bg-blue-900' : 'bg-blue-100'
                      }`}>
                      <Building2 className={`w-6 h-6 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className={`font-semibold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{client.company || t('withoutName')}</h3>
                        {client.activeShipments !== undefined && (
                          <span className={`text-xs px-2 py-1 rounded-full ${isDark
                            ? 'bg-green-900 text-green-400'
                            : 'bg-green-100 text-green-700'
                            }`}>
                            {client.activeShipments} {t('activeCount')}
                          </span>
                        )}
                      </div>

                      <div className={`grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{t('binContract')}</span>
                          <span>{client.contract_number || '-'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{t('deposit')}</span>
                          <span className={`font-semibold ${isDark ? 'text-green-400' : 'text-green-600'}`}>
                            {client.deposit_balance ? client.deposit_balance.toLocaleString() : '0'} ₸
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Phone className={`w-4 h-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                          <span>{client.phone}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Mail className={`w-4 h-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                          <span>{client.email}</span>
                        </div>
                        <div className="flex items-center gap-2 col-span-2">
                          <span className="font-medium">{t('contactPerson')}</span>
                          <span>{client.name}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleEditClick(client)}
                      className={`p-2 rounded-lg transition-colors ${isDark
                      ? 'text-gray-400 hover:bg-gray-700'
                      : 'text-gray-600 hover:bg-gray-100'
                      }`}>
                      <Edit className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={() => handleDeleteClient(client.id)}
                      className={`p-2 rounded-lg transition-colors ${isDark
                      ? 'text-red-400 hover:bg-red-900/20'
                      : 'text-red-600 hover:bg-red-50'
                      }`}>
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            )))}
        </div>
      </div>

      {/* Add Client Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className={`w-full max-w-2xl mx-4 p-6 rounded-lg shadow-xl max-h-[90vh] overflow-y-auto ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
            <div className="flex items-center justify-between mb-6">
              <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {editingClientId ? t('edit') : t('addCorporateClient')}
              </h2>
              <button
                onClick={() => { setShowAddModal(false); setEditingClientId(null); }}
                className={`p-1 rounded-full hover:bg-opacity-10 ${isDark ? 'hover:bg-gray-300 text-gray-400' : 'hover:bg-gray-200 text-gray-500'}`}
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleCreateClient} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{t('companyName')}</label>
                  <input
                    type="text"
                    required
                    value={formData.companyName}
                    onChange={e => setFormData({ ...formData, companyName: e.target.value })}
                    className={`w-full p-2 rounded border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-300'}`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{t('bin')}</label>
                  <input
                    type="text"
                    required
                    value={formData.bin}
                    onChange={e => setFormData({ ...formData, bin: e.target.value })}
                    className={`w-full p-2 rounded border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-300'}`}
                  />
                </div>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{t('fullName')}</label>
                <input
                  type="text"
                  required
                  value={formData.contactPerson}
                  onChange={e => setFormData({ ...formData, contactPerson: e.target.value })}
                  className={`w-full p-2 rounded border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-300'}`}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Email</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    className={`w-full p-2 rounded border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-300'}`}
                    placeholder="email@company.com"
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Телефон</label>
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    className={`w-full p-2 rounded border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-300'}`}
                    placeholder="+7..."
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{t('passwordLabel')}</label>
                  <input
                    type="password"
                    required={!editingClientId}
                    value={formData.password}
                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                    className={`w-full p-2 rounded border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-300'}`}
                    minLength={6}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-green-400' : 'text-green-700'}`}>{t('depositAmount')}</label>
                  <input
                    type="number"
                    value={formData.deposit}
                    onChange={e => setFormData({ ...formData, deposit: e.target.value })}
                    className={`w-full p-2 rounded border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-300'}`}
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className={`px-4 py-2 rounded-lg ${isDark ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-100 text-gray-700'}`}
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  <Save className="w-5 h-5" />
                  {isLoading ? t('processing') : (editingClientId ? t('save') : t('createClient'))}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}