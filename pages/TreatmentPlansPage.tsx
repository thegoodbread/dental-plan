

import React, { useState, useEffect } from 'react';
import { Plus, Search, MoreHorizontal, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getAllTreatmentPlans, getPatients, createTreatmentPlan } from '../services/treatmentPlans';
import { TreatmentPlan, Patient } from '../types';
import { StatusBadge } from '../components/StatusBadge';

export const TreatmentPlansPage: React.FC = () => {
  const navigate = useNavigate();
  const [plans, setPlans] = useState<TreatmentPlan[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  
  // Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [newPlanPatientId, setNewPlanPatientId] = useState('');
  const [newPlanTitle, setNewPlanTitle] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    setPlans(getAllTreatmentPlans());
    setPatients(getPatients());
  };

  const filteredPlans = plans.filter(p => {
    const matchesStatus = statusFilter === 'ALL' || p.status === statusFilter;
    const term = searchTerm.toLowerCase();
    const matchesSearch = 
      p.title.toLowerCase().includes(term) || 
      p.planNumber.toLowerCase().includes(term) ||
      p.patient?.firstName.toLowerCase().includes(term) ||
      p.patient?.lastName.toLowerCase().includes(term);
    return matchesStatus && matchesSearch;
  });

  const handleCreatePlan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlanPatientId || !newPlanTitle) return;
    
    const newPlan = createTreatmentPlan({
      patientId: newPlanPatientId,
      title: newPlanTitle
    });
    
    navigate(`/plan/${newPlan.id}`);
  };

  const tabs = ['ALL', 'DRAFT', 'PRESENTED', 'ACCEPTED', 'DECLINED', 'ON_HOLD'];

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto w-full relative">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 md:mb-8">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">Treatment Plans</h1>
          <p className="text-gray-500 text-sm mt-1">Create and manage patient case proposals.</p>
        </div>
        <button 
          onClick={() => {
            setShowCreateModal(true);
            if (patients.length > 0) setNewPlanPatientId(patients[0].id);
          }}
          className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg font-medium transition-colors shadow-sm w-full md:w-auto"
        >
          <Plus size={18} />
          New Plan
        </button>
      </header>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6">
        <div className="p-4 border-b border-gray-200 flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="relative w-full md:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
            <input
              type="text"
              placeholder="Search plans..."
              className="w-full pl-10 pr-4 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 -mb-2 md:mb-0">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setStatusFilter(tab)}
                className={`px-3 py-1.5 rounded-md text-xs font-bold whitespace-nowrap transition-colors ${
                  statusFilter === tab
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {tab.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Desktop Table */}
        <div className="overflow-x-auto hidden md:block">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Plan info</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Patient</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Total Fee</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredPlans.length > 0 && filteredPlans.map((plan) => (
                  <tr 
                    key={plan.id} 
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => navigate(`/plan/${plan.id}`)}
                  >
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{plan.title}</div>
                      <div className="text-xs text-gray-500 font-mono">{plan.planNumber}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">
                        {plan.patient?.firstName} {plan.patient?.lastName}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={plan.status} />
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-gray-900">
                      ${plan.totalFee.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-right text-sm text-gray-500">
                      {new Date(plan.updatedAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        
        {/* Mobile Card List */}
        <div className="md:hidden p-2">
            <div className="space-y-2">
              {filteredPlans.length > 0 && filteredPlans.map(plan => (
                <div 
                  key={plan.id} 
                  className="p-3 rounded-lg border border-gray-200 bg-white active:bg-gray-50 cursor-pointer"
                  onClick={() => navigate(`/plan/${plan.id}`)}
                >
                    <div className="flex justify-between items-start">
                        <div>
                            <div className="font-bold text-gray-900 text-sm">{plan.title}</div>
                            <div className="text-xs text-gray-600 mt-1">{plan.patient?.firstName} {plan.patient?.lastName}</div>
                        </div>
                        <StatusBadge status={plan.status} />
                    </div>
                    <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-100 text-xs">
                        <span className="font-mono text-gray-400">{plan.planNumber}</span>
                        <span className="font-bold text-gray-800">${plan.totalFee.toLocaleString()}</span>
                    </div>
                </div>
              ))}
            </div>
        </div>

        {filteredPlans.length === 0 && (
          <div className="px-4 py-12 text-center text-gray-500">
             No plans found matching your criteria.
          </div>
        )}

      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-5 border-b border-gray-200">
              <h3 className="font-bold text-lg text-gray-900">New Treatment Plan</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreatePlan} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Select Patient</label>
                <select 
                  className="w-full p-2.5 bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors placeholder:text-gray-500"
                  value={newPlanPatientId}
                  onChange={(e) => setNewPlanPatientId(e.target.value)}
                  required
                >
                  <option value="" disabled>-- Select Patient --</option>
                  {patients.map(p => (
                    <option key={p.id} value={p.id}>{p.firstName} {p.lastName}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Plan Title</label>
                <input 
                  type="text" 
                  className="w-full p-2.5 bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors placeholder:text-gray-500"
                  placeholder="e.g. Upper Anterior Crowns"
                  value={newPlanTitle}
                  onChange={(e) => setNewPlanTitle(e.target.value)}
                  required
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button 
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-2.5 bg-white border border-gray-300 text-gray-800 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-2.5 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Create Plan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};