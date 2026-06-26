import { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';
import { Search, Plus, X, Edit, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Customers = () => {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const { user } = useAuth();
  
  const initialForm = {
    name: '', phone: '', address: '', notes: '',
    importantDates: []
  };
  const [formData, setFormData] = useState(initialForm);

  const fetchCustomers = useCallback(async () => {
    try {
      const { data } = await api.get(`/customers?search=${search}`);
      setCustomers(data);
    } catch (error) {
      console.error('Failed to fetch customers', error);
    }
  }, [search]);

  useEffect(() => {
    const init = async () => {
      await fetchCustomers();
    };
    init();
  }, [fetchCustomers]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingCustomer) {
        const cleanedData = {
  ...formData,

  importantDates: formData.importantDates.filter(
    (d) => d.eventName && d.date
  ),
};

await api.put(
  `/customers/${editingCustomer._id}`,
  cleanedData
);
      } else {
        const cleanedData = {
  ...formData,

  importantDates: formData.importantDates.filter(
    (d) => d.eventName && d.date
  ),
};

await api.post('/customers', cleanedData);
      }
      setIsModalOpen(false);
      setEditingCustomer(null);
      setFormData(initialForm);
      fetchCustomers();
    } catch (error) {
      console.error('Failed to save customer', error);
    }
  };

  const editCustomer = (customer) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name,
      phone: customer.phone,
      address: customer.address || '',
      notes: customer.notes || '',
      importantDates: customer.importantDates ? customer.importantDates.map(d => ({...d, date: new Date(d.date).toISOString().split('T')[0]})) : [],
    });
    setIsModalOpen(true);
  };

  const deleteCustomer = async (id) => {
    if(window.confirm('Are you sure you want to delete this customer?')) {
        try {
            await api.delete(`/customers/${id}`);
            fetchCustomers();
        } catch (error) {
            console.error('Failed to delete', error);
        }
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Customers</h1>
          <p className="text-sm text-gray-500">Manage your clients with important dates and notes.</p>
        </div>
        <button 
          onClick={() => { setEditingCustomer(null); setFormData(initialForm); setIsModalOpen(true); }}
          className="bg-[#7C3AED] hover:bg-[#6c2bd9] text-white px-4 py-2 rounded-xl flex items-center gap-2 shadow-md transition-colors"
        >
          <Plus className="w-5 h-5" /> New Customer
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-6 flex items-center gap-3">
        <Search className="text-gray-400 w-5 h-5" />
        <input 
          type="text" 
          placeholder="Search by name or phone..." 
          className="flex-1 bg-transparent focus:outline-none text-gray-700"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Customers List */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex-1 overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-sm border-b border-gray-100">
                <th className="p-4 font-medium">Customer ID</th>
                <th className="p-4 font-medium">Name</th>
                <th className="p-4 font-medium">Contact</th>
                <th className="p-4 font-medium">Added On</th>
                <th className="p-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c._id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                  <td className="p-4 text-sm font-semibold text-[#7C3AED]">{c.customerId}</td>
                  <td className="p-4 text-gray-800 font-medium">{c.name}</td>
                  <td className="p-4 text-gray-600 text-sm">{c.phone}</td>
                  <td className="p-4 text-gray-500 text-sm">{new Date(c.createdAt).toLocaleDateString()}</td>
                  <td className="p-4 text-right flex justify-end gap-2">
                    <button onClick={() => editCustomer(c)} className="p-2 text-indigo-500 hover:bg-indigo-50 rounded-lg transition-colors">
                      <Edit className="w-4 h-4" />
                    </button>
                    {user?.role === 'Owner' && (
                        <button onClick={() => deleteCustomer(c._id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 className="w-4 h-4" />
                        </button>
                    )}
                  </td>
                </tr>
              ))}
              {customers.length === 0 && (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-gray-500">No customers found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white z-10">
              <h2 className="text-xl font-bold text-gray-800">{editingCustomer ? 'Edit Customer' : 'Add New Customer'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 bg-gray-50 p-2 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                  <input required name="name" value={formData.name} onChange={handleInputChange} className="w-full border border-gray-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-[#C4B5FD] transition-all bg-gray-50 focus:bg-white" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                  <input required name="phone" value={formData.phone} onChange={handleInputChange} className="w-full border border-gray-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-[#C4B5FD] transition-all bg-gray-50 focus:bg-white" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                  <input name="address" value={formData.address} onChange={handleInputChange} className="w-full border border-gray-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-[#C4B5FD] transition-all bg-gray-50 focus:bg-white" />
                </div>
              </div>

              {/* Important Dates */}
              <div>
                <div className="flex justify-between items-center mb-3 border-b pb-2">
                  <h3 className="text-lg font-semibold text-gray-800">Important Dates</h3>
                  <button 
                    type="button" 
                    onClick={() => setFormData({...formData, importantDates: [...formData.importantDates, { eventName: '', date: '' }]})}
                    className="text-[#7C3AED] text-sm font-medium hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4" /> Add Date
                  </button>
                </div>
                <div className="space-y-3">
                  {formData.importantDates.map((item, index) => (
                    <div key={index} className="flex items-center gap-3 bg-white border border-gray-100 p-3 rounded-xl shadow-sm">
                      <input 
                        type="text" 
                        placeholder="Event (e.g. Birthday, Anniversary)" 
                        value={item.eventName}
                        required
                        onChange={(e) => {
                          const newDates = [...formData.importantDates];
                          newDates[index].eventName = e.target.value;
                          setFormData({...formData, importantDates: newDates});
                        }}
                        className="flex-1 border border-gray-200 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-[#C4B5FD] text-sm"
                      />
                      <input 
                        type="date" 
                        value={item.date}
                        required
                        onChange={(e) => {
                          const newDates = [...formData.importantDates];
                          newDates[index].date = e.target.value;
                          setFormData({...formData, importantDates: newDates});
                        }}
                        className="w-40 border border-gray-200 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-[#C4B5FD] text-sm"
                      />
                      <button 
                        type="button" 
                        onClick={() => {
                          const newDates = formData.importantDates.filter((_, i) => i !== index);
                          setFormData({...formData, importantDates: newDates});
                        }}
                        className="text-red-400 hover:text-red-600 p-1"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                  {formData.importantDates.length === 0 && (
                    <p className="text-xs text-gray-400 italic">No important dates added.</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes/Preferences</label>
                <textarea name="notes" value={formData.notes} onChange={handleInputChange} rows="3" className="w-full border border-gray-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-[#C4B5FD] transition-all bg-gray-50 focus:bg-white resize-none"></textarea>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 rounded-xl font-medium text-gray-600 hover:bg-gray-100 transition-colors">Cancel</button>
                <button type="submit" className="px-5 py-2.5 rounded-xl font-medium bg-[#7C3AED] hover:bg-[#6c2bd9] text-white shadow-md transition-colors">Save Customer</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Customers;
