
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Share2, Sparkles, CheckCircle, XCircle, 
  Clock, AlertCircle, Printer, Eye, X
} from 'lucide-react';
import { 
  getTreatmentPlanById, updateTreatmentPlan, createShareLink,
  createTreatmentPlanItem, updateTreatmentPlanItem, deleteTreatmentPlanItem,
  getActivityForPlan
} from '../services/treatmentPlans';
import { explainPlanForPatient } from '../services/geminiExplainPlan';
import { TreatmentPlan, FeeScheduleEntry, TreatmentPlanStatus } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { TreatmentPlanItemsTable } from '../components/TreatmentPlanItemsTable';
import { PremiumPatientLayout } from '../components/patient/PremiumPatientLayout';

export const TreatmentPlanDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [plan, setPlan] = useState<TreatmentPlan | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [generatingAi, setGeneratingAi] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  
  // Local Edit State
  const [title, setTitle] = useState('');
  const [insurance, setInsurance] = useState(0);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    refreshData();
  }, [id]);

  const refreshData = () => {
    if (!id) return;
    const p = getTreatmentPlanById(id);
    setPlan(p);
    if (p) {
        setTitle(p.title);
        setInsurance(p.estimatedInsurance || 0);
        setNotes(p.notesInternal || '');
    }
    setLoading(false);
  };

  const handleSaveHeader = () => {
    if (!plan) return;
    updateTreatmentPlan(plan.id, { 
        title, 
        estimatedInsurance: Number(insurance), 
        notesInternal: notes 
    });
    refreshData();
  };

  const handleStatusChange = (status: TreatmentPlanStatus) => {
    if (!plan) return;
    updateTreatmentPlan(plan.id, { status });
    refreshData();
  };

  const handleAddItem = (fee: FeeScheduleEntry) => {
    if (!plan) return;
    createTreatmentPlanItem(plan.id, { 
      feeScheduleEntryId: fee.id 
    });
    refreshData();
  };

  const handleUpdateItem = (itemId: string, updates: any) => {
    updateTreatmentPlanItem(itemId, updates);
    refreshData();
  };

  const handleDeleteItem = (itemId: string) => {
    if (confirm("Are you sure you want to remove this procedure?")) {
       deleteTreatmentPlanItem(itemId);
       refreshData();
    }
  };

  const handleShare = () => {
    if (!plan) return;
    const link = createShareLink(plan.id);
    
    // Robust URL construction for HashRouter
    const baseUrl = window.location.href.split('#')[0]; 
    const url = `${baseUrl}#/p/${link.token}`;
    
    setShareUrl(url);
    refreshData();
  };

  const handleAiExplanation = async () => {
    if (!plan || !plan.items) return;
    setGeneratingAi(true);
    const explanation = await explainPlanForPatient(plan, plan.items);
    updateTreatmentPlan(plan.id, { explanationForPatient: explanation });
    setGeneratingAi(false);
    refreshData();
  };

  if (loading) return <div className="p-8">Loading...</div>;
  if (!plan) return <div className="p-8 text-red-600">Plan not found</div>;

  return (
    <div className="flex flex-col h-screen bg-gray-50 overflow-hidden relative">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center shadow-sm z-10">
            <div className="flex items-center gap-4">
                <button onClick={() => navigate('/')} className="text-gray-500 hover:text-gray-700">
                    <ArrowLeft size={20} />
                </button>
                <div>
                    <div className="flex items-center gap-3">
                        <input 
                            value={title} 
                            onChange={(e) => setTitle(e.target.value)}
                            onBlur={handleSaveHeader}
                            className="font-bold text-xl text-gray-900 border-b border-transparent hover:border-gray-300 focus:border-blue-500 focus:outline-none bg-transparent"
                        />
                        <StatusBadge status={plan.status} />
                    </div>
                    <div className="text-sm text-gray-500">
                        {plan.planNumber} • {plan.patient?.firstName} {plan.patient?.lastName}
                    </div>
                </div>
            </div>
            <div className="flex gap-2">
                <button 
                  onClick={() => setShowPreview(true)}
                  className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-blue-600 border border-blue-600 rounded-lg hover:bg-blue-700 shadow-sm"
                >
                    <Eye size={16} /> Preview
                </button>
                <button onClick={handleShare} className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
                    <Share2 size={16} /> Share
                </button>
            </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
            {/* Main Content (Table) */}
            <div className="flex-1 p-6 overflow-y-auto flex flex-col gap-6">
                
                {/* Share Alert */}
                {shareUrl && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex flex-col relative animate-in slide-in-from-top-4">
                        <button onClick={() => setShareUrl(null)} className="absolute top-2 right-2 text-blue-400 hover:text-blue-600"><XCircle size={18}/></button>
                        <h4 className="font-bold text-blue-900 flex items-center gap-2"><CheckCircle size={18}/> Share Link Ready</h4>
                        <div className="flex gap-2 mt-2">
                            <input readOnly value={shareUrl} className="flex-1 text-sm p-2 rounded border border-blue-200" />
                            <button onClick={() => navigator.clipboard.writeText(shareUrl)} className="px-4 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700">Copy</button>
                        </div>
                    </div>
                )}

                {/* AI Explanation Section */}
                <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                    <div className="flex justify-between items-center mb-3">
                        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                            <Sparkles size={16} className="text-purple-500" />
                            Patient Explanation
                        </h3>
                        <button 
                            onClick={handleAiExplanation} 
                            disabled={generatingAi}
                            className="text-xs bg-purple-50 text-purple-700 px-3 py-1.5 rounded-lg border border-purple-200 hover:bg-purple-100 transition-colors"
                        >
                            {generatingAi ? 'Generating...' : plan.explanationForPatient ? 'Regenerate' : 'Generate with AI'}
                        </button>
                    </div>
                    {plan.explanationForPatient ? (
                        <p className="text-sm text-gray-600 bg-purple-50/50 p-3 rounded-lg border border-purple-100">
                            {plan.explanationForPatient}
                        </p>
                    ) : (
                        <p className="text-sm text-gray-400 italic">No explanation generated yet. Click above to create one.</p>
                    )}
                </div>

                {/* Items Table */}
                <div className="flex-1 min-h-[400px]">
                    <TreatmentPlanItemsTable 
                        plan={plan} 
                        items={plan.items || []} 
                        onAddItem={handleAddItem}
                        onUpdateItem={handleUpdateItem}
                        onDeleteItem={handleDeleteItem}
                    />
                </div>
            </div>

            {/* Sidebar (Right) */}
            <div className="w-80 bg-white border-l border-gray-200 overflow-y-auto p-6 flex flex-col gap-6 shadow-sm">
                
                {/* Status Actions */}
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <h3 className="text-xs font-bold text-gray-500 uppercase mb-3">Change Status</h3>
                    <div className="grid grid-cols-2 gap-2">
                         <button onClick={() => handleStatusChange('PRESENTED')} className="flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium bg-white border border-gray-300 rounded hover:bg-blue-50 hover:text-blue-600"><Clock size={14}/> Presented</button>
                         <button onClick={() => handleStatusChange('ACCEPTED')} className="flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium bg-white border border-gray-300 rounded hover:bg-green-50 hover:text-green-600"><CheckCircle size={14}/> Accepted</button>
                         <button onClick={() => handleStatusChange('DECLINED')} className="flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium bg-white border border-gray-300 rounded hover:bg-red-50 hover:text-red-600"><XCircle size={14}/> Declined</button>
                         <button onClick={() => handleStatusChange('ON_HOLD')} className="flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium bg-white border border-gray-300 rounded hover:bg-yellow-50 hover:text-yellow-600"><AlertCircle size={14}/> On Hold</button>
                    </div>
                </div>

                {/* Financials Input */}
                <div>
                    <h3 className="text-xs font-bold text-gray-500 uppercase mb-3">Insurance</h3>
                    <label className="block text-sm text-gray-700 mb-1">Estimated Benefit ($)</label>
                    <input 
                        type="number" 
                        value={insurance}
                        onChange={e => setInsurance(parseFloat(e.target.value))}
                        onBlur={handleSaveHeader}
                        className="w-full p-2 border border-gray-300 rounded text-right font-mono" 
                    />
                </div>

                {/* Internal Notes */}
                <div>
                    <h3 className="text-xs font-bold text-gray-500 uppercase mb-3">Internal Notes</h3>
                    <textarea 
                        className="w-full h-32 p-2 text-sm border border-gray-300 rounded resize-none"
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                        onBlur={handleSaveHeader}
                        placeholder="Private notes for staff..."
                    />
                </div>
            </div>
        </div>

        {/* PREVIEW MODAL */}
        {showPreview && (
          <div className="fixed inset-0 z-50 bg-gray-900 bg-opacity-75 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white w-full h-full max-w-6xl rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="flex justify-between items-center px-6 py-4 bg-gray-900 text-white shrink-0">
                 <div className="flex items-center gap-3">
                   <div className="bg-blue-600 p-1.5 rounded-lg">
                      <Eye size={18} className="text-white" />
                   </div>
                   <div>
                      <h2 className="font-bold text-lg leading-tight">Patient Experience Preview</h2>
                      <div className="text-xs text-gray-400">Viewing as: {plan.patient?.firstName} {plan.patient?.lastName}</div>
                   </div>
                 </div>
                 <button 
                   onClick={() => setShowPreview(false)}
                   className="p-2 hover:bg-gray-700 rounded-full transition-colors"
                 >
                   <X size={24} />
                 </button>
              </div>
              <div className="flex-1 overflow-auto bg-gray-50">
                 <PremiumPatientLayout plan={plan} items={plan.items || []} />
              </div>
            </div>
          </div>
        )}
    </div>
  );
};
