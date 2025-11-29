import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Share2, Sparkles, CheckCircle, XCircle, 
  Clock, AlertCircle, Printer, Eye, X, Menu
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
  const [discount, setDiscount] = useState(0);
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
        // Infer discount from the stored patient portion
        const impliedDiscount = Math.max(0, p.totalFee - (p.estimatedInsurance || 0) - p.patientPortion);
        setDiscount(impliedDiscount);
        setNotes(p.notesInternal || '');
    }
    setLoading(false);
  };

  const handleFinancialUpdate = () => {
    if (!plan) return;
    const insuranceVal = Number(insurance) || 0;
    const discountVal = Number(discount) || 0;
    // Calculate new portion based on discount
    const newPatientPortion = Math.max(0, plan.totalFee - insuranceVal - discountVal);
    
    updateTreatmentPlan(plan.id, { 
        title, 
        estimatedInsurance: insuranceVal,
        patientPortion: newPatientPortion,
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
    <div className="flex flex-col min-h-screen md:h-screen bg-gray-50 overflow-x-hidden relative">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-4 md:px-6 py-3 md:py-4 flex flex-col md:flex-row md:justify-between md:items-center shadow-sm z-10 gap-3 md:gap-0 shrink-0 sticky top-0 md:relative">
            <div className="flex items-center gap-3">
                <button onClick={() => navigate('/')} className="text-gray-500 hover:text-gray-700">
                    <ArrowLeft size={20} />
                </button>
                <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                        <input 
                            value={title} 
                            onChange={(e) => setTitle(e.target.value)}
                            onBlur={handleFinancialUpdate}
                            className="font-bold text-lg md:text-xl text-gray-900 border-b border-transparent hover:border-gray-300 focus:border-blue-500 focus:outline-none bg-transparent max-w-[200px] md:max-w-md"
                        />
                        <StatusBadge status={plan.status} />
                    </div>
                    <div className="text-xs md:text-sm text-gray-500 mt-1">
                        {plan.planNumber} • {plan.patient?.firstName} {plan.patient?.lastName}
                    </div>
                </div>
            </div>
            <div className="flex gap-2 self-end md:self-auto">
                <button 
                  onClick={() => setShowPreview(true)}
                  className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-blue-600 border border-blue-600 rounded-lg hover:bg-blue-700 shadow-sm"
                >
                    <Eye size={16} /> <span className="hidden md:inline">Preview</span>
                </button>
                <button onClick={handleShare} className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
                    <Share2 size={16} /> <span className="hidden md:inline">Share</span>
                </button>
            </div>
        </div>

        {/* 
            Mobile Layout Strategy:
            - flex-col (Mobile): Natural stacking. Main (table) first, Sidebar (finance) second.
            - min-h-screen (Mobile): Allows page to grow if table is long.
            - overflow-hidden (Desktop): Uses the app-like split pane.
        */}
        <div className="flex-1 flex flex-col md:flex-row md:overflow-hidden">
            
            {/* Main Content (Table) - Order 1 on Mobile (Top) */}
            <div className="flex-1 p-4 md:p-6 md:overflow-y-auto flex flex-col gap-4 md:gap-6 order-1">
                
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

                {/* Items Table Container */}
                <div className="flex-1 min-h-[300px] md:min-h-0">
                    <TreatmentPlanItemsTable 
                        plan={plan} 
                        items={plan.items || []} 
                        onAddItem={handleAddItem}
                        onUpdateItem={handleUpdateItem}
                        onDeleteItem={handleDeleteItem}
                    />
                </div>
            </div>

            {/* Sidebar (Right) - Order 2 on Mobile (Bottom) */}
            <div className="w-full md:w-80 bg-white border-t md:border-t-0 md:border-l border-gray-200 md:overflow-y-auto p-4 md:p-6 flex flex-col gap-6 shadow-sm order-2 shrink-0">
                
                {/* Financials Input */}
                <div className="bg-gray-50/50 p-4 rounded-xl border border-gray-200">
                    <div className="grid grid-cols-2 md:grid-cols-1 gap-4">
                      <div>
                          <h3 className="text-xs font-bold text-gray-500 uppercase mb-3">Insurance</h3>
                          <label className="block text-sm text-gray-700 mb-1">Est. Benefit ($)</label>
                          <input 
                              type="number" 
                              value={insurance}
                              onChange={e => setInsurance(parseFloat(e.target.value))}
                              onBlur={handleFinancialUpdate}
                              className="w-full p-2 bg-white text-gray-900 border border-gray-300 rounded text-right font-mono text-sm focus:ring-2 focus:ring-blue-500 outline-none" 
                          />
                      </div>
                      
                      {/* Plan Discount Input */}
                      <div>
                          <h3 className="text-xs font-bold text-gray-500 uppercase mb-3 md:mt-2">Plan Discount</h3>
                          <label className="block text-sm text-gray-700 mb-1">Adjustment ($)</label>
                          <input 
                              type="number" 
                              value={discount}
                              onChange={e => setDiscount(parseFloat(e.target.value))}
                              onBlur={handleFinancialUpdate}
                              className="w-full p-2 bg-white text-gray-900 border border-gray-300 rounded text-right font-mono text-sm focus:ring-2 focus:ring-blue-500 outline-none" 
                          />
                      </div>

                      <div className="md:pt-2">
                        <h3 className="text-xs font-bold text-gray-500 uppercase mb-3 md:mt-2">Patient Portion</h3>
                        <div className="text-2xl font-bold text-blue-600 text-right">${plan.patientPortion.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
                      </div>
                    </div>
                </div>

                {/* Status Actions */}
                <div className="bg-white rounded-lg pt-2 md:pt-0">
                    <h3 className="text-xs font-bold text-gray-500 uppercase mb-3">Change Status</h3>
                    <div className="grid grid-cols-2 gap-2">
                         <button onClick={() => handleStatusChange('PRESENTED')} className="flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded shadow-sm hover:bg-blue-50 hover:text-blue-600 transition-colors"><Clock size={14}/> Presented</button>
                         <button onClick={() => handleStatusChange('ACCEPTED')} className="flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded shadow-sm hover:bg-green-50 hover:text-green-600 transition-colors"><CheckCircle size={14}/> Accepted</button>
                         <button onClick={() => handleStatusChange('DECLINED')} className="flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded shadow-sm hover:bg-red-50 hover:text-red-600 transition-colors"><XCircle size={14}/> Declined</button>
                         <button onClick={() => handleStatusChange('ON_HOLD')} className="flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded shadow-sm hover:bg-yellow-50 hover:text-yellow-600 transition-colors"><AlertCircle size={14}/> On Hold</button>
                    </div>
                </div>

                {/* Internal Notes */}
                <div className="pb-8 md:pb-0">
                    <h3 className="text-xs font-bold text-gray-500 uppercase mb-3">Internal Notes</h3>
                    <textarea 
                        className="w-full h-24 md:h-32 p-2 text-sm bg-white text-gray-900 border border-gray-300 rounded resize-none focus:ring-1 focus:ring-blue-500 outline-none placeholder-gray-400"
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                        onBlur={handleFinancialUpdate}
                        placeholder="Private notes for staff..."
                    />
                </div>
            </div>
        </div>

        {/* PREVIEW MODAL */}
        {showPreview && (
          <div className="fixed inset-0 z-50 bg-gray-900 bg-opacity-75 flex items-center justify-center p-0 md:p-4 backdrop-blur-sm">
            <div className="bg-white w-full h-full md:max-w-6xl md:rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="flex justify-between items-center px-4 md:px-6 py-3 md:py-4 bg-gray-900 text-white shrink-0">
                 <div className="flex items-center gap-3">
                   <div className="bg-blue-600 p-1.5 rounded-lg">
                      <Eye size={18} className="text-white" />
                   </div>
                   <div>
                      <h2 className="font-bold text-base md:text-lg leading-tight">Patient View</h2>
                      <div className="text-xs text-gray-400 hidden md:block">Viewing as: {plan.patient?.firstName} {plan.patient?.lastName}</div>
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