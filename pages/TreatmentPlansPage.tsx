
import React, { useState, useEffect } from 'react';
import { Plus, Search, MoreHorizontal, X, User } from 'lucide-react';
import * as ReactRouterDOM from 'react-router-dom';
import { getAllTreatmentPlans, createTreatmentPlan, getPatients, upsertPatient } from '../services/treatmentPlans';
import { TreatmentPlan, Patient } from '../types';
import { StatusBadge } from '../components/ui/StatusBadge';

const { useNavigate } = ReactRouterDOM;

export const TreatmentPlansPage: React.FC = () => {
  const navigate = useNavigate();
  const [plans, setPlans] = useState<TreatmentPlan[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  
  // Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPlanTitle, setNewPlanTitle] = useState('');
  
  // Patient Selection State
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [isCreatingNewPatient, setIsCreatingNewPatient] = useState(false);
  const [newPatientData, setNewPatientData] = useState({
      firstName: '',
      lastName: '',
      dob: '',
      memberId: ''
  });

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
    
    // Enhance search to include patient name
    const patient = patients.find(pat => pat.id === p.patientId);
    const patientName = patient ? `${patient.firstName} ${patient.lastName}`.toLowerCase() : '';
    const patientNameRev = patient ? `${patient.lastName}, ${patient.firstName}`.toLowerCase() : '';

    const matchesSearch = 
      p.title.toLowerCase().includes(term) || 
      p.planNumber.toLowerCase().includes(term) ||
      (p.caseAlias && p.caseAlias.toLowerCase().includes(term)) ||
      patientName.includes(term) ||
      patientNameRev.includes(term);
      
    return matchesStatus && matchesSearch;
  });

  const handleCreatePlan = (e: React.FormEvent) => {
    e.preventDefault();
    
    let finalPatientId = selectedPatientId;

    // Handle New Patient Creation Inline
    if (isCreatingNewPatient) {
        if (!newPatientData.firstName || !newPatientData.lastName) {
            alert("First and Last Name are required for new patient.");
            return;
        }
        
        finalPatientId = `pat_${Date.now()}`;
        const newPatient: Patient = {
            id: finalPatientId,
            firstName: newPatientData.firstName,
            lastName: newPatientData.lastName,
            dob: newPatientData.dob,
            memberId: newPatientData.memberId,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        upsertPatient(newPatient);
        // Refresh local list (though navigation happens immediately)
        setPatients(prev => [...prev, newPatient]);
    }

    if (!finalPatientId) {
        alert("Please select or create a patient.");
        return;
    }

    const newPlan = createTreatmentPlan({
      title: newPlanTitle,
      patientId: finalPatientId
    });
    
    navigate(`/plan/${newPlan.id}`);
  };

  const tabs = ['ALL', 'DRAFT', 'PRESENTED', 'ACCEPTED', 'DECLINED', 'ON_HOLD'];

  // Resets for modal open
  const openModal = () => {
      setNewPlanTitle('');
      setSelectedPatientId('');
      setIsCreatingNewPatient(false);
      setNewPatientData({ firstName: '', lastName: '', dob: '', memberId: '' });
      setShowCreateModal(true);
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto w-full relative">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 md:mb-8">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">Treatment Plans</h1>
          <p className="text-gray-500 text-sm mt-1">Create and manage patient case proposals.</p>
        </div>
        <button 
          onClick={openModal}
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
              placeholder="Search plans or patients..."
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
              {filteredPlans.length > 0 && filteredPlans.map((plan) => {
                  const patient = patients.find(p => p.id === plan.patientId);
                  return (
                    <tr 
                        key={plan.id} 
                        className="hover:bg-gray-50 cursor-pointer transition-colors"
                        onClick={() => navigate(`/plan/${plan.id}`)}
                    >
                        <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">{plan.title || 'Untitled Plan'}</div>
                        <div className="text-xs text-gray-500 font-mono">{plan.planNumber}</div>
                        </td>
                        <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">
                            {patient ? `${patient.lastName}, ${patient.firstName}` : (plan.caseAlias || 'Unknown Patient')}
                        </div>
                        {patient && patient.dob && <div className="text-xs text-gray-500">DOB: {patient.dob}</div>}
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
                  );
                })}
            </tbody>
          </table>
        </div>
        
        {/* Mobile Card List */}
        <div className="md:hidden p-2">
            <div className="space-y-2">
              {filteredPlans.length > 0 && filteredPlans.map(plan => {
                const patient = patients.find(p => p.id === plan.patientId);
                return (
                    <div 
                    key={plan.id} 
                    className="p-3 rounded-lg border border-gray-200 bg-white active:bg-gray-50 cursor-pointer"
                    onClick={() => navigate(`/plan/${plan.id}`)}
                    >
                        <div className="flex justify-between items-start">
                            <div>
                                <div className="font-bold text-gray-900 text-sm">{plan.title || plan.planNumber}</div>
                                <div className="text-xs text-gray-600 mt-1">
                                    {patient ? `${patient.lastName}, ${patient.firstName}` : (plan.caseAlias || 'Unknown Patient')}
                                </div>
                            </div>
                            <StatusBadge status={plan.status} />
                        </div>
                        <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-100 text-xs">
                            <span className="font-mono text-gray-400">{plan.planNumber}</span>
                            <span className="font-bold text-gray-800">${plan.totalFee.toLocaleString()}</span>
                        </div>
                    </div>
                );
              })}
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
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-5 border-b border-gray-200 shrink-0">
              <h3 className="font-bold text-lg text-gray-900">New Treatment Plan</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleCreatePlan} className="p-6 space-y-5 overflow-y-auto">
              
              {/* PATIENT SELECTOR SECTION */}
              <div className="space-y-3">
                  <label className="block text-sm font-bold text-gray-700">Patient</label>
                  
                  {!isCreatingNewPatient ? (
                      <div className="space-y-3">
                          <select 
                              className="w-full p-2.5 bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                              value={selectedPatientId}
                              onChange={(e) => setSelectedPatientId(e.target.value)}
                          >
                              <option value="">Select existing patient...</option>
                              {patients.map(p => (
                                  <option key={p.id} value={p.id}>{p.lastName}, {p.firstName} (DOB: {p.dob || 'N/A'})</option>
                              ))}
                          </select>
                          
                          <div className="text-center">
                              <span className="text-xs text-gray-400 uppercase font-bold tracking-wider">OR</span>
                          </div>

                          <button 
                              type="button"
                              onClick={() => { setIsCreatingNewPatient(true); setSelectedPatientId(''); }}
                              className="w-full py-2 bg-blue-50 text-blue-700 font-semibold rounded-lg text-sm hover:bg-blue-100 transition-colors border border-blue-100 flex items-center justify-center gap-2"
                          >
                              <User size={16} /> Create New Patient
                          </button>
                      </div>
                  ) : (
                      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-3 animate-in fade-in slide-in-from-top-2">
                          <div className="flex justify-between items-center mb-1">
                              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">New Patient Details</h4>
                              <button 
                                  type="button" 
                                  onClick={() => setIsCreatingNewPatient(false)}
                                  className="text-xs text-blue-600 hover:underline"
                              >
                                  Cancel
                              </button>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                              <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-1">First Name *</label>
                                  <input 
                                      type="text" 
                                      required={isCreatingNewPatient}
                                      className="w-full p-2 border border-gray-300 rounded text-sm"
                                      value={newPatientData.firstName}
                                      onChange={e => setNewPatientData({...newPatientData, firstName: e.target.value})}
                                  />
                              </div>
                              <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-1">Last Name *</label>
                                  <input 
                                      type="text" 
                                      required={isCreatingNewPatient}
                                      className="w-full p-2 border border-gray-300 rounded text-sm"
                                      value={newPatientData.lastName}
                                      onChange={e => setNewPatientData({...newPatientData, lastName: e.target.value})}
                                  />
                              </div>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                              <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-1">DOB</label>
                                  <input 
                                      type="date" 
                                      className="w-full p-2 border border-gray-300 rounded text-sm"
                                      value={newPatientData.dob}
                                      onChange={e => setNewPatientData({...newPatientData, dob: e.target.value})}
                                  />
                              </div>
                              <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-1">Member ID</label>
                                  <input 
                                      type="text" 
                                      className="w-full p-2 border border-gray-300 rounded text-sm"
                                      placeholder="Optional"
                                      value={newPatientData.memberId}
                                      onChange={e => setNewPatientData({...newPatientData, memberId: e.target.value})}
                                  />
                              </div>
                          </div>
                      </div>
                  )}
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">Case Label (optional)</label>
                <input 
                  type="text" 
                  className="w-full p-2.5 bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors placeholder:text-gray-500"
                  placeholder="e.g. Upper Anterior Crowns, Implant Case"
                  value={newPlanTitle}
                  onChange={(e) => setNewPlanTitle(e.target.value)}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button 
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-2.5 bg-white border border-gray-300 text-gray-800 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-2.5 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
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
