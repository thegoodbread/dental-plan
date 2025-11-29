import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, MoreHorizontal, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getPlans, getPatients, createPlan } from '../services/api';
import { TreatmentPlan, TreatmentPlanStatus, Patient } from '../types';
import { StatusBadge } from '../components/ui/StatusBadge';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [plans, setPlans] = useState<TreatmentPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  
  // Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [newPlanPatientId, setNewPlanPatientId] = useState('');
  const [newPlanTitle, setNewPlanTitle] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchPlans();
    fetchPatients();
  }, [searchTerm, statusFilter]);

  const fetchPlans = async () => {
    setLoading(true);
    const data = await getPlans({ search: searchTerm, status: statusFilter });
    setPlans(data);
    setLoading(false);
  };

  const fetchPatients = async () => {
    const data = await getPatients();
    setPatients(data);
    if (data.length > 0) setNewPlanPatientId(data[0].id);
  };

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlanPatientId || !newPlanTitle) return;
    
    setCreating(true);
    try {
      const newPlan = await createPlan(newPlanPatientId, newPlanTitle);
      setShowCreateModal(false);
      setNewPlanTitle('');
      navigate(`/plan/${newPlan.id}`);
    } catch (err) {
      console.error(err);
    } finally {
      setCreating(false);
    }
  };

  const tabs = ['ALL', 'DRAFT', 'PRESENTED', 'ACCEPTED', 'DECLINED', 'ON_HOLD'];

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto w-full relative">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 md:mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Treatment Plans</h1>
          <p className="text-gray-500 text-sm mt-1">Manage and track patient treatment proposals.</p>
        </div>
        <button 
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg font-medium transition-colors shadow-sm w-full md:w-auto"
        >
          <Plus size={18} />
          New Plan
        </button>
      </header>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6">
        <div className="p-4 border-b border-gray-200 flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search patient, plan number..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 scrollbar-hide">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setStatusFilter(tab)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${
                  statusFilter === tab
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {tab === 'ALL' ? 'All Plans' : tab.charAt(0) + tab.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Plan Details</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Patient</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Total Fee</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Last Updated</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    Loading plans...
                  </td>
                </tr>
              ) : plans.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    No plans found matching your criteria.
                  </td>
                </tr>
              ) : (
                plans.map((plan) => (
                  <tr 
                    key={plan.id} 
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => navigate(`/plan/${plan.id}`)}
                  >
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{plan.title}</div>
                      <div className="text-xs text-gray-500">{plan.planNumber}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">
                        {plan.patient?.firstName} {plan.patient?.lastName}
                      </div>
                      <div className="text-xs text-gray-500">DOB: {plan.patient?.dateOfBirth}</div>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={plan.status} />
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-gray-900">
                      ${plan.totalFee.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(plan.updatedAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="text-gray-400 hover:text-gray-600 p-1">
                        <MoreHorizontal size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden divide-y divide-gray-200">
           {loading ? (
              <div className="p-8 text-center text-gray-500">Loading plans...</div>
           ) : plans.length === 0 ? (
              <div className="p-8 text-center text-gray-500">No plans found.</div>
           ) : (
             plans.map((plan) => (
                <div 
                  key={plan.id} 
                  className="p-4 bg-white active:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => navigate(`/plan/${plan.id}`)}
                >
                   <div className="flex justify-between items-start mb-2">
                     <div>
                        <div className="font-bold text-gray-900">{plan.title}</div>
                        <div className="text-xs text-gray-500">{plan.planNumber}</div>
                     </div>
                     <StatusBadge status={plan.status} />
                   </div>
                   
                   <div className="flex justify-between items-center text-sm mb-2">
                      <div className="text-gray-600">
                        {plan.patient?.firstName} {plan.patient?.lastName}
                      </div>
                      <div className="font-bold text-gray-900">
                         ${plan.totalFee.toLocaleString()}
                      </div>
                   </div>
                   
                   <div className="flex justify-between items-center text-xs text-gray-400">
                      <span>Updated {new Date(plan.updatedAt).toLocaleDateString()}</span>
                      <MoreHorizontal size={16} />
                   </div>
                </div>
             ))
           )}
        </div>

      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b border-gray-200">
              <h3 className="font-bold text-lg text-gray-900">New Treatment Plan</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreatePlan} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Select Patient</label>
                <select 
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  value={newPlanPatientId}
                  onChange={(e) => setNewPlanPatientId(e.target.value)}
                  required
                >
                  {patients.map(p => (
                    <option key={p.id} value={p.id}>{p.firstName} {p.lastName}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Plan Title</label>
                <input 
                  type="text" 
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="e.g. Upper Anterior Crowns"
                  value={newPlanTitle}
                  onChange={(e) => setNewPlanTitle(e.target.value)}
                  required
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button 
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-2 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={creating}
                  className="flex-1 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {creating ? 'Creating...' : 'Create Plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};