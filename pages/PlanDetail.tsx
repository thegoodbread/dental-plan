import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Calendar, Share2, Printer, CheckCircle, XCircle, 
  Clock, Activity, Sparkles, AlertCircle, Trash2, Edit2, Save, Plus
} from 'lucide-react';
import { 
  getPlanById, updatePlanStatus, createShareLink, getActivityLogs,
  addItemToPlan, deletePlanItem, updatePlan, updatePlanItem 
} from '../services/api';
import { explainPlanForPatient } from '../services/geminiService';
import { TreatmentPlan, TreatmentPlanStatus, ActivityLog, TreatmentPlanItem } from '../types';
import { StatusBadge } from '../components/ui/StatusBadge';

export const PlanDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [plan, setPlan] = useState<TreatmentPlan | null>(null);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [generatingAi, setGeneratingAi] = useState(false);
  
  // Edit State
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState('');
  const [tempNotes, setTempNotes] = useState('');

  // Item Form State
  const [showItemForm, setShowItemForm] = useState(false);
  const [newItemCode, setNewItemCode] = useState('');
  const [newItemName, setNewItemName] = useState('');
  const [newItemTooth, setNewItemTooth] = useState('');
  const [newItemFee, setNewItemFee] = useState<number>(0);

  // Insurance State
  const [tempInsurance, setTempInsurance] = useState<number>(0);

  useEffect(() => {
    if (id) loadData(id);
  }, [id]);

  useEffect(() => {
    if (plan) {
      setTempTitle(plan.title);
      setTempNotes(plan.notesInternal || '');
      setTempInsurance(plan.estimatedInsurance || 0);
    }
  }, [plan]);

  const loadData = async (planId: string) => {
    setLoading(true);
    const [p, acts] = await Promise.all([
      getPlanById(planId),
      getActivityLogs(planId)
    ]);
    setPlan(p);
    setActivities(acts);
    setLoading(false);
  };

  const refreshPlan = async () => {
    if (!id) return;
    const p = await getPlanById(id);
    const acts = await getActivityLogs(id);
    setPlan(p);
    setActivities(acts);
  };

  const handleStatusChange = async (newStatus: TreatmentPlanStatus) => {
    if (!plan) return;
    await updatePlanStatus(plan.id, newStatus);
    refreshPlan();
  };

  const handleShare = async () => {
    if (!plan) return;
    const token = await createShareLink(plan.id);
    const url = `${window.location.origin}/#/p/${token}`;
    setShareUrl(url);
    refreshPlan();
  };

  const handleAiExplanation = async () => {
    if (!plan) return;
    setGeneratingAi(true);
    const explanation = await explainPlanForPatient(plan);
    // Save it to the plan
    await updatePlan(plan.id, { explanationForPatient: explanation });
    setGeneratingAi(false);
    refreshPlan();
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!plan) return;
    
    await addItemToPlan(plan.id, {
        procedureCode: newItemCode || 'MISC',
        procedureName: newItemName,
        selectedTeeth: newItemTooth ? [newItemTooth] : [],
        baseFee: Number(newItemFee),
        sortOrder: (plan.items || []).length + 1
    });

    // Reset form
    setNewItemCode('');
    setNewItemName('');
    setNewItemTooth('');
    setNewItemFee(0);
    setShowItemForm(false);
    refreshPlan();
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!plan) return;
    if (confirm("Remove this item?")) {
      await deletePlanItem(plan.id, itemId);
      refreshPlan();
    }
  };

  const saveDetails = async () => {
    if (!plan) return;
    await updatePlan(plan.id, {
      title: tempTitle,
      notesInternal: tempNotes
    });
    setIsEditingTitle(false);
    refreshPlan();
  };

  const updateInsurance = async () => {
     if (!plan) return;
     // This will trigger a recalc of patient portion in the backend service logic if we wanted,
     // but currently updatePlan just saves fields. 
     // We should manually update patient_portion or let the service handle it.
     // For this simple service, let's update both.
     const newPatientPortion = plan.totalFee - tempInsurance;
     await updatePlan(plan.id, { 
       estimatedInsurance: tempInsurance,
       patientPortion: newPatientPortion 
     });
     refreshPlan();
  };

  if (loading) return <div className="p-8 text-center">Loading details...</div>;
  if (!plan) return <div className="p-8 text-center text-red-500">Plan not found</div>;

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center shadow-sm sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/')} className="text-gray-500 hover:text-gray-700">
            <ArrowLeft size={20} />
          </button>
          <div className="flex flex-col">
            <div className="flex items-center gap-3">
              {isEditingTitle ? (
                  <div className="flex items-center gap-2">
                    <input 
                      className="text-xl font-bold text-gray-900 border border-gray-300 rounded px-2 py-1"
                      value={tempTitle}
                      onChange={e => setTempTitle(e.target.value)}
                    />
                    <button onClick={saveDetails} className="text-green-600 hover:text-green-700"><Save size={20}/></button>
                  </div>
              ) : (
                  <div className="flex items-center gap-2 group">
                    <h1 className="text-xl font-bold text-gray-900">{plan.title}</h1>
                    <button onClick={() => setIsEditingTitle(true)} className="text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100"><Edit2 size={16}/></button>
                    <StatusBadge status={plan.status} />
                  </div>
              )}
            </div>
            <p className="text-sm text-gray-500">{plan.planNumber} • {plan.patient?.firstName} {plan.patient?.lastName}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={handleShare}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <Share2 size={16} />
            Share
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
        {/* Left: Info & Activity */}
        <div className="w-full md:w-80 border-r border-gray-200 bg-white overflow-y-auto p-6 hidden lg:block">
          <div className="mb-8">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Patient Details</h3>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                {plan.patient?.firstName[0]}{plan.patient?.lastName[0]}
              </div>
              <div>
                <div className="font-medium text-gray-900">{plan.patient?.firstName} {plan.patient?.lastName}</div>
                <div className="text-sm text-gray-500">{plan.patient?.email}</div>
              </div>
            </div>
            <div className="text-sm text-gray-600 grid grid-cols-2 gap-y-2 mt-4">
              <span className="text-gray-400">DOB:</span>
              <span>{plan.patient?.dateOfBirth}</span>
              <span className="text-gray-400">Phone:</span>
              <span>{plan.patient?.phone}</span>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Activity Log</h3>
            <div className="space-y-6">
              {activities.map((act) => (
                <div key={act.id} className="relative pl-6 border-l-2 border-gray-200 pb-1">
                  <div className="absolute -left-[5px] top-1 w-2.5 h-2.5 rounded-full bg-gray-300" />
                  <p className="text-sm text-gray-800 font-medium">{act.message}</p>
                  <span className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                    <Calendar size={10} />
                    {new Date(act.createdAt).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Center: Procedures */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8">
          
          {shareUrl && (
            <div className="mb-6 bg-blue-50 border border-blue-200 p-4 rounded-lg flex flex-col gap-2 relative">
              <button onClick={() => setShareUrl(null)} className="absolute top-2 right-2 text-blue-400 hover:text-blue-600"><XCircle size={16}/></button>
              <div className="flex items-center gap-2 text-blue-800 font-medium">
                <CheckCircle size={18} />
                Share Link Generated
              </div>
              <p className="text-sm text-blue-600">Give this URL to the patient:</p>
              <div className="flex gap-2">
                <input readOnly value={shareUrl} className="flex-1 text-sm p-2 border border-gray-300 rounded bg-white text-gray-600" />
                <button 
                   onClick={() => navigator.clipboard.writeText(shareUrl)}
                   className="px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                >
                  Copy
                </button>
              </div>
            </div>
          )}

          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden mb-6">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
              <h2 className="font-semibold text-gray-900">Procedures</h2>
              <button 
                onClick={handleAiExplanation}
                disabled={generatingAi}
                className="text-xs flex items-center gap-1 text-purple-600 bg-purple-50 hover:bg-purple-100 px-3 py-1.5 rounded-lg border border-purple-200 transition-colors"
              >
                <Sparkles size={14} />
                {generatingAi ? 'Generating...' : plan.explanationForPatient ? 'Regenerate AI Explanation' : 'Generate AI Explanation'}
              </button>
            </div>
            
            {plan.explanationForPatient && (
              <div className="px-6 py-4 bg-purple-50 border-b border-purple-100">
                 <h4 className="text-xs font-bold text-purple-800 uppercase mb-1">AI Patient Explanation</h4>
                <p className="text-sm text-purple-900 italic leading-relaxed">
                  "{plan.explanationForPatient}"
                </p>
              </div>
            )}

            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase bg-white">
                  <th className="px-6 py-3">Code</th>
                  <th className="px-6 py-3">Description</th>
                  <th className="px-6 py-3">Tooth</th>
                  <th className="px-6 py-3 text-right">Fee</th>
                  <th className="px-6 py-3 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {(plan.items || []).map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 group">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{item.procedureCode}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      <div>{item.procedureName}</div>
                      {item.notes && <div className="text-xs text-gray-400 mt-0.5">{item.notes}</div>}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{item.selectedTeeth?.join(',') || '-'}</td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 text-right">
                      ${item.netFee.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-right">
                       <button onClick={() => handleDeleteItem(item.id)} className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                         <Trash2 size={16} />
                       </button>
                    </td>
                  </tr>
                ))}
                
                {showItemForm && (
                  <tr className="bg-blue-50">
                    <td className="px-6 py-4">
                      <input placeholder="Code" className="w-20 p-1 border rounded text-sm" value={newItemCode} onChange={e => setNewItemCode(e.target.value)} />
                    </td>
                    <td className="px-6 py-4">
                      <input placeholder="Procedure Name" className="w-full p-1 border rounded text-sm" value={newItemName} onChange={e => setNewItemName(e.target.value)} autoFocus />
                    </td>
                    <td className="px-6 py-4">
                      <input placeholder="T" className="w-12 p-1 border rounded text-sm" value={newItemTooth} onChange={e => setNewItemTooth(e.target.value)} />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <input type="number" placeholder="0.00" className="w-24 p-1 border rounded text-sm text-right" value={newItemFee} onChange={e => setNewItemFee(parseFloat(e.target.value))} />
                    </td>
                    <td className="px-6 py-4 flex gap-2 justify-end">
                      <button onClick={handleAddItem} className="text-green-600 hover:text-green-800"><CheckCircle size={18}/></button>
                      <button onClick={() => setShowItemForm(false)} className="text-gray-400 hover:text-gray-600"><XCircle size={18}/></button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            
            {!showItemForm && (
              <button 
                onClick={() => setShowItemForm(true)}
                className="w-full py-3 bg-gray-50 hover:bg-gray-100 border-t border-gray-200 text-center text-sm font-medium text-blue-600 transition-colors flex items-center justify-center gap-2"
              >
                <Plus size={16} /> Add Procedure
              </button>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div className="p-4 rounded-lg border border-gray-200 bg-white">
               <div className="flex justify-between items-center mb-2">
                 <h3 className="font-semibold text-gray-900">Internal Notes</h3>
                 <button onClick={saveDetails} className="text-xs text-blue-600 hover:underline">Save Notes</button>
               </div>
               <textarea 
                  className="w-full h-24 p-2 text-sm border border-gray-300 rounded resize-none focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  value={tempNotes}
                  onChange={e => setTempNotes(e.target.value)}
                  placeholder="Private notes for office staff..."
               />
             </div>
             <div className="p-4 rounded-lg border border-gray-200 bg-white">
                <h3 className="font-semibold text-gray-900 mb-2">Change Status</h3>
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    onClick={() => handleStatusChange('PRESENTED')}
                    className={`flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${plan.status === 'PRESENTED' ? 'bg-blue-100 text-blue-800 border border-blue-200' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                  >
                    <Clock size={16} /> Presented
                  </button>
                  <button 
                     onClick={() => handleStatusChange('ACCEPTED')}
                     className={`flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${plan.status === 'ACCEPTED' ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                  >
                    <CheckCircle size={16} /> Accepted
                  </button>
                  <button 
                     onClick={() => handleStatusChange('DECLINED')}
                     className={`flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${plan.status === 'DECLINED' ? 'bg-red-100 text-red-800 border border-red-200' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                  >
                    <XCircle size={16} /> Declined
                  </button>
                  <button 
                     onClick={() => handleStatusChange('ON_HOLD')}
                     className={`flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${plan.status === 'ON_HOLD' ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                  >
                    <AlertCircle size={16} /> On Hold
                  </button>
                </div>
             </div>
          </div>

        </div>

        {/* Right: Financials */}
        <div className="w-full md:w-80 bg-white border-l border-gray-200 p-6 flex flex-col gap-6 shadow-sm">
          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-4">Financial Summary</h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center pb-4 border-b border-gray-100">
                <span className="text-gray-500">Total Treatment</span>
                <span className="font-semibold text-gray-900">${plan.totalFee.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center pb-4 border-b border-gray-100">
                <span className="text-gray-500">Est. Insurance</span>
                <div className="flex items-center gap-1">
                  <span className="text-green-600 font-medium">-$</span>
                  <input 
                    type="number" 
                    className="w-20 text-right font-medium text-green-600 border-b border-green-200 focus:outline-none focus:border-green-500"
                    value={tempInsurance}
                    onChange={(e) => setTempInsurance(parseFloat(e.target.value) || 0)}
                    onBlur={updateInsurance}
                  />
                </div>
              </div>
              <div className="flex justify-between items-center pt-2">
                <span className="text-gray-900 font-bold text-lg">Patient Portion</span>
                <span className="text-blue-600 font-bold text-2xl">${plan.patientPortion.toLocaleString()}</span>
              </div>
            </div>
            <div className="mt-8 bg-gray-50 p-4 rounded-lg text-xs text-gray-500">
              * Update insurance amount above and click away to recalculate the patient portion.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};