import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Share2, Sparkles, CheckCircle, XCircle, 
  Clock, AlertCircle, Save, Printer
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

export const TreatmentPlanDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [plan, setPlan] = useState<TreatmentPlan | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [generatingAi, setGeneratingAi] = useState(false);
  
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
    const url = `${window.location.origin}/#/p/${link.token}`;
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
    <div className="flex flex-col h-screen bg-gray-50 overflow-hidden">
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
                <button onClick={handleShare} className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
                    <Share2 size={16} /> Share
                </button>
                <button 
                  onClick={() => window.print()}
                  className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                    <Printer size={16} /> Print
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
                    <div className="mt-2 text-xs text-gray-500">
                        Updates "Patient Portion" automatically.
                    </div>
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
    </div>
  );
};
