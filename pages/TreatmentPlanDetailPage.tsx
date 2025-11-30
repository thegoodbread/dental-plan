

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Share2, Sparkles, CheckCircle, XCircle, 
  Clock, AlertCircle, Printer, Eye, X, Menu, ClipboardList, Calculator
} from 'lucide-react';
import { 
  loadTreatmentPlanWithItems, updateTreatmentPlan, createShareLink,
  createTreatmentPlanItem, updateTreatmentPlanItem, deleteTreatmentPlanItem,
  getActivityForPlan, clearAllItemInsuranceForPlan
} from '../services/treatmentPlans';
import { explainPlanForPatient } from '../services/geminiExplainPlan';
import { TreatmentPlan, TreatmentPlanItem, FeeScheduleEntry, TreatmentPlanStatus, InsuranceMode, FeeScheduleType } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { TreatmentPlanItemsTable } from '../components/TreatmentPlanItemsTable';
import { PremiumPatientLayout } from '../components/patient/PremiumPatientLayout';
import { FinancialsTable } from '../components/FinancialsTable';
import { NumberPadModal } from '../components/NumberPadModal';

type ViewMode = 'CLINICAL' | 'FINANCIAL';
type SaveStatus = 'IDLE' | 'SAVED';
type ModalField = 'estBenefit' | 'clinicDiscount';

const NumpadButton = ({ onClick, disabled = false }: { onClick: () => void, disabled?: boolean }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className="p-1.5 text-gray-400 hover:text-blue-600 bg-gray-50 hover:bg-blue-50 rounded-md border border-gray-200 disabled:cursor-not-allowed disabled:opacity-50 shrink-0"
    aria-label="Open number pad"
  >
    <Calculator size={16} />
  </button>
);

export const TreatmentPlanDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  // SINGLE SOURCE OF TRUTH for plan and item data.
  const [plan, setPlan] = useState<TreatmentPlan | null>(null);
  const [items, setItems] = useState<TreatmentPlanItem[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [generatingAi, setGeneratingAi] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('CLINICAL');
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('IDLE');
  const [modalConfig, setModalConfig] = useState<{ isOpen: boolean; field: ModalField | null; title: string; }>({ isOpen: false, field: null, title: '' });


  useEffect(() => {
    if (id) {
      loadData(id);
    }
  }, [id]);

  const loadData = (planId: string) => {
    setLoading(true);
    const result = loadTreatmentPlanWithItems(planId);
    if (result) {
        setPlan(result.plan);
        setItems(result.items);
    } else {
        setPlan(null);
        setItems([]);
    }
    setLoading(false);
  };
  
  // Persists the in-memory plan details (sidebar fields) to localStorage.
  const handleDetailsSave = () => {
    if (!plan) return;
    const updatedPlan = updateTreatmentPlan(plan.id, plan);
    if (updatedPlan) {
        setPlan(updatedPlan);
        setItems(updatedPlan.items || []);
    }
  };
  
  const handleSidebarInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!plan) return;
      const { name, value } = e.target;
      const numericValue = value === '' ? 0 : parseFloat(value);
      if (isNaN(numericValue)) return;

      setPlan(prevPlan => ({
        ...prevPlan!,
        [name]: numericValue,
      }));
    };

    const handleSidebarInputBlur = () => {
      if (!plan) return;
      const updates = {
        estimatedInsurance: plan.estimatedInsurance ?? 0,
        clinicDiscount: plan.clinicDiscount ?? 0,
      };
      const updatedPlan = updateTreatmentPlan(plan.id, updates);
      if (updatedPlan) {
        setPlan(updatedPlan);
        setItems(updatedPlan.items || []);
      }
    };

  const handleModalDone = (newValue: string) => {
    const field = modalConfig.field;
    setModalConfig({ isOpen: false, field: null, title: '' });
    if (!plan) return;

    const numericValue = parseFloat(newValue) || 0;

    let updates: Partial<TreatmentPlan> = {};
    if (field === 'estBenefit') {
      updates.estimatedInsurance = numericValue;
    } else if (field === 'clinicDiscount') {
      updates.clinicDiscount = numericValue;
    }

    if (Object.keys(updates).length > 0) {
      setPlan(prevPlan => ({ ...prevPlan!, ...updates }));
      const updatedPlan = updateTreatmentPlan(plan.id, updates);
      if (updatedPlan) {
        setPlan(updatedPlan);
        setItems(updatedPlan.items || []);
      }
    }
  };
  
  const getModalInitialValue = () => {
    if (!plan) return '';
    if (modalConfig.field === 'estBenefit') return String(plan.estimatedInsurance || '');
    if (modalConfig.field === 'clinicDiscount') return String(plan.clinicDiscount || '');
    return '';
  };

  const handleModeChange = (newMode: InsuranceMode) => {
    if (!plan || plan.insuranceMode === newMode) return;

    if (newMode === 'simple') {
      // SIMPLE MODE:
      // - Do NOT clear item-level insurance.
      // - Just tell the plan to use its plan-level estimate.
      // - Keep whatever estimatedInsurance the plan currently has 
      //   (the recalc service already set it to the advanced sum).
      // This makes the toggle non-destructive.
      const updatedPlan = updateTreatmentPlan(plan.id, { 
        insuranceMode: 'simple',
        estimatedInsurance: plan.estimatedInsurance ?? 0,
      });

      if (updatedPlan) {
        setPlan(updatedPlan);
        setItems(updatedPlan.items || []);
      }

    } else {
      // ADVANCED MODE:
      // - Do NOT clear anything.
      // - The plan will now use the (preserved) line-item estimatedInsurance values
      //   as the source of truth for its totals.
      const updatedPlan = updateTreatmentPlan(plan.id, { insuranceMode: 'advanced' });

      if (updatedPlan) {
        setPlan(updatedPlan);
        setItems(updatedPlan.items || []);
      }
    }
  };
  
  const handlePricingModeChange = (newType: FeeScheduleType) => {
    if (!plan || plan.feeScheduleType === newType) return;
    const updatedPlan = updateTreatmentPlan(plan.id, { feeScheduleType: newType });
    if (updatedPlan) {
      setPlan(updatedPlan);
      setItems(updatedPlan.items || []);
    }
  };

  const handleStatusChange = (status: TreatmentPlanStatus) => {
    if (!plan) return;
    // If clicking the currently active status, revert to DRAFT. Otherwise, set the new status.
    const newStatus = plan.status === status ? 'DRAFT' : status;
    const updatedPlan = updateTreatmentPlan(plan.id, { status: newStatus });
    if (updatedPlan) {
        setPlan(updatedPlan);
    }
  };

  const handleAddItem = (fee: FeeScheduleEntry) => {
    if (!plan) return;
    createTreatmentPlanItem(plan.id, { 
      feeScheduleEntryId: fee.id 
    });
    loadData(plan.id);
  };

  const handleUpdateItem = (itemId: string, updates: Partial<TreatmentPlanItem>) => {
    if (!plan) return;
    
    // Use the updated service that returns the new state directly.
    // This avoids a full `loadData()` call and preserves UI state like input focus.
    const result = updateTreatmentPlanItem(itemId, updates);
    if (result) {
      setPlan(result.plan);
      setItems(result.items);
    }
    
    setSaveStatus('SAVED');
    setTimeout(() => setSaveStatus('IDLE'), 2000);
  };

  const handleDeleteItem = (itemId: string) => {
    if (!plan) return;
    deleteTreatmentPlanItem(itemId);
    // Reload from source of truth after deletion and recalculation.
    loadData(plan.id);
  };

  const handleShare = () => {
    if (!plan) return;
    const link = createShareLink(plan.id);
    const baseUrl = window.location.href.split('#')[0]; 
    const url = `${baseUrl}#/p/${link.token}`;
    setShareUrl(url);
    setCopied(false); // Reset copy status
    const updatedPlan = updateTreatmentPlan(plan.id, { status: 'PRESENTED', presentedAt: new Date().toISOString() });
    if (updatedPlan) setPlan(updatedPlan);
  };

  const handleCopy = () => {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAiExplanation = async () => {
    if (!plan || !items) return;
    setGeneratingAi(true);
    const explanation = await explainPlanForPatient(plan, items);
    const updatedPlan = updateTreatmentPlan(plan.id, { explanationForPatient: explanation });
    setGeneratingAi(false);
    if(updatedPlan) setPlan(updatedPlan);
  };

  if (loading) return <div className="p-8">Loading...</div>;
  if (!plan) return <div className="p-8 text-red-600">Plan not found</div>;

  const getStatusButtonClass = (buttonStatus: TreatmentPlanStatus): string => {
    const base = "flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium bg-white border rounded-lg shadow-sm transition-colors";
    const isActive = plan.status === buttonStatus;
    
    const styles: Record<string, { base: string, active: string }> = {
      PRESENTED: { 
        base: 'text-gray-700 border-gray-300 hover:bg-blue-50 hover:text-blue-600', 
        active: 'bg-blue-50 text-blue-700 border-blue-600 font-bold' 
      },
      ACCEPTED: { 
        base: 'text-gray-700 border-gray-300 hover:bg-green-50 hover:text-green-600', 
        active: 'bg-green-50 text-green-700 border-green-600 font-bold' 
      },
      DECLINED: { 
        base: 'text-gray-700 border-gray-300 hover:bg-red-50 hover:text-red-600', 
        active: 'bg-red-50 text-red-700 border-red-600 font-bold' 
      },
      ON_HOLD: { 
        base: 'text-gray-700 border-gray-300 hover:bg-yellow-50 hover:text-yellow-600', 
        active: 'bg-yellow-50 text-yellow-700 border-yellow-600 font-bold' 
      },
    };

    const specificStyle = styles[buttonStatus];
    if (!specificStyle) return `${base} text-gray-700 border-gray-300`;

    return `${base} ${isActive ? specificStyle.active : specificStyle.base}`;
  };

  return (
    <div className="flex flex-col flex-1 bg-gray-50 overflow-x-hidden">
        <div className="sticky top-0 lg:static z-30 bg-white border-b border-gray-200 px-4 lg:px-6 py-3 flex items-center justify-between shadow-sm shrink-0 gap-4">
            <div className="flex items-center gap-3 flex-1 min-w-0">
                <button onClick={() => navigate('/')} className="text-gray-500 hover:text-gray-700 shrink-0">
                    <ArrowLeft size={20} />
                </button>
                <div className="flex-1 min-w-0">
                    <input 
                        value={plan.title} 
                        onChange={(e) => setPlan({ ...plan, title: e.target.value })}
                        onBlur={handleDetailsSave}
                        className="font-bold text-lg md:text-xl text-gray-900 border-b border-transparent hover:border-gray-300 focus:border-blue-500 focus:outline-none bg-transparent w-full truncate"
                    />
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <div className="hidden md:block">
                          <StatusBadge status={plan.status} />
                        </div>
                        <div className="text-xs md:text-sm text-gray-500 truncate">
                            {plan.planNumber} • {plan.caseAlias}
                        </div>
                    </div>
                </div>
            </div>
            <div className="flex gap-2 items-center">
                 <div className="md:hidden">
                    <StatusBadge status={plan.status} />
                 </div>
                <button 
                  onClick={() => setShowPreview(true)}
                  className="flex items-center justify-center w-10 h-10 md:w-auto md:h-auto md:gap-2 md:px-3 md:py-2 text-sm font-medium text-white bg-blue-600 border border-blue-600 rounded-lg hover:bg-blue-700 shadow-sm"
                >
                    <Eye size={16} /> <span className="hidden md:inline">Preview</span>
                </button>
                <button onClick={handleShare} className="flex items-center justify-center w-10 h-10 md:w-auto md:h-auto md:gap-2 md:px-3 md:py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
                    <Share2 size={16} /> <span className="hidden md:inline">Share</span>
                </button>
            </div>
        </div>
        
        <div className="flex-1 flex flex-col lg:flex-row lg:overflow-hidden">
            <div className="flex-1 p-4 md:p-5 lg:p-6 lg:overflow-y-auto flex flex-col gap-4 md:gap-6 order-1">
                {shareUrl && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex flex-col relative animate-in slide-in-from-top-4">
                        <button onClick={() => setShareUrl(null)} className="absolute top-2 right-2 p-1 text-blue-400 hover:text-blue-600 rounded-full hover:bg-blue-100">
                            <X size={18}/>
                        </button>
                        <h4 className="font-bold text-blue-900 flex items-center gap-2 mb-2">
                            <CheckCircle size={18}/> Share Link Ready
                        </h4>
                        <div className="flex gap-2">
                            <input 
                                readOnly 
                                value={shareUrl} 
                                className="flex-1 text-sm p-2 rounded-md border border-blue-200 bg-white text-blue-800 font-mono" 
                                onClick={(e) => (e.target as HTMLInputElement).select()}
                            />
                            <button 
                                onClick={handleCopy} 
                                className={`px-4 w-24 shrink-0 text-center text-white rounded-md text-sm font-medium transition-all duration-200 ${copied ? 'bg-green-500 hover:bg-green-600' : 'bg-blue-600 hover:bg-blue-700'}`}
                            >
                                {copied ? 'Copied!' : 'Copy'}
                            </button>
                        </div>
                    </div>
                )}

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

                {/* VIEW MODE TOGGLE */}
                <div className="bg-gray-100 rounded-lg p-1 flex w-full md:w-auto self-start">
                    <button 
                        onClick={() => setViewMode('CLINICAL')}
                        className={`flex-1 flex items-center justify-center gap-2 text-xs md:text-sm font-bold px-3 py-1.5 rounded-md transition-colors ${viewMode === 'CLINICAL' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}>
                        <ClipboardList size={14} /> Clinical
                    </button>
                     <button 
                        onClick={() => setViewMode('FINANCIAL')}
                        className={`flex-1 flex items-center justify-center gap-2 text-xs md:text-sm font-bold px-3 py-1.5 rounded-md transition-colors ${viewMode === 'FINANCIAL' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}>
                        <Calculator size={14} /> Financials
                    </button>
                </div>

                <div className="flex-1 min-h-[300px] md:min-h-0">
                    {viewMode === 'CLINICAL' ? (
                      <TreatmentPlanItemsTable 
                          plan={plan} 
                          items={items} 
                          onAddItem={handleAddItem}
                          onUpdateItem={handleUpdateItem}
                          onDeleteItem={handleDeleteItem}
                      />
                    ) : (
                      <FinancialsTable
                          plan={plan}
                          items={items}
                          onUpdateItem={handleUpdateItem}
                          saveStatus={saveStatus}
                          insuranceMode={plan.insuranceMode}
                      />
                    )}
                </div>
            </div>

            <div className="w-full lg:w-80 bg-white border-t lg:border-t-0 lg:border-l border-gray-200 lg:overflow-y-auto p-4 md:p-5 lg:p-6 flex flex-col gap-6 shadow-sm order-2 shrink-0">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-6">
                    <div className="bg-gray-50/50 p-4 rounded-xl border border-gray-200">
                        <div className="grid grid-cols-2 md:grid-cols-1 gap-4">
                           <div>
                              <h3 className="text-xs font-bold text-gray-500 uppercase mb-3">Pricing Model</h3>
                              <div className="flex bg-gray-200 rounded-lg p-1">
                                <button 
                                    onClick={() => handlePricingModeChange('standard')}
                                    className={`flex-1 text-center text-xs font-bold py-1.5 rounded-md transition-all ${plan.feeScheduleType === 'standard' || !plan.feeScheduleType ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}>
                                    Standard
                                </button>
                                <button 
                                    onClick={() => handlePricingModeChange('membership')}
                                    className={`flex-1 text-center text-xs font-bold py-1.5 rounded-md transition-all ${plan.feeScheduleType === 'membership' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}>
                                    Membership
                                </button>
                              </div>
                          </div>
                          <div>
                              <h3 className="text-xs font-bold text-gray-500 uppercase mb-3">Insurance Mode</h3>
                              <div className="flex bg-gray-200 rounded-lg p-1">
                                <button 
                                    onClick={() => handleModeChange('simple')}
                                    className={`flex-1 text-center text-xs font-bold py-1.5 rounded-md transition-all ${plan.insuranceMode === 'simple' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}>
                                    Simple
                                </button>
                                <button 
                                    onClick={() => handleModeChange('advanced')}
                                    className={`flex-1 text-center text-xs font-bold py-1.5 rounded-md transition-all ${plan.insuranceMode === 'advanced' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}>
                                    Advanced
                                </button>
                              </div>
                          </div>
                          <div className="space-y-4">
                              <div>
                                  <label className="block text-sm text-gray-700 mb-1">Est. Benefit ($)</label>
                                   <div className="flex items-center gap-1.5">
                                    <div className="relative grow">
                                       <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">$</span>
                                        <input 
                                            type="number" 
                                            name="estimatedInsurance"
                                            onChange={handleSidebarInputChange}
                                            onBlur={handleSidebarInputBlur}
                                            onFocus={(e) => e.target.select()}
                                            value={plan.estimatedInsurance ?? ''}
                                            disabled={plan.insuranceMode === 'advanced'}
                                            className={`w-full p-2 pl-5 bg-white text-gray-900 border border-gray-300 rounded text-right font-mono text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-colors ${plan.insuranceMode === 'advanced' ? 'bg-gray-100 cursor-not-allowed focus:ring-0' : ''}`} 
                                        />
                                    </div>
                                    <NumpadButton 
                                        disabled={plan.insuranceMode === 'advanced'}
                                        onClick={() => setModalConfig({ isOpen: true, field: 'estBenefit', title: 'Estimated Benefit ($)' })}
                                    />
                                   </div>
                                  {plan.insuranceMode === 'advanced' && (
                                    <p className="text-xs text-gray-500 mt-1.5">
                                        Total is calculated from the itemized list in the Financials tab.
                                    </p>
                                  )}
                              </div>
                              <div>
                                  <label className="block text-sm text-gray-700 mb-1">Clinic Discount ($)</label>
                                    <div className="flex items-center gap-1.5">
                                        <div className="relative grow">
                                           <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">$</span>
                                            <input 
                                                type="number" 
                                                name="clinicDiscount"
                                                onChange={handleSidebarInputChange}
                                                onBlur={handleSidebarInputBlur}
                                                onFocus={(e) => e.target.select()}
                                                value={plan.clinicDiscount ?? ''}
                                                className="w-full p-2 pl-5 bg-white text-gray-900 border border-gray-300 rounded text-right font-mono text-sm focus:ring-2 focus:ring-blue-500 outline-none" 
                                            />
                                        </div>
                                        <NumpadButton 
                                            onClick={() => setModalConfig({ isOpen: true, field: 'clinicDiscount', title: 'Clinic Discount ($)' })}
                                        />
                                    </div>
    
                                   <p className="text-xs text-gray-500 mt-1.5">
                                      Reduces patient’s portion only.
                                   </p>
                              </div>
                          </div>
                          
                          <div className="md:pt-2 col-span-2 md:col-span-1">
                            <h3 className="text-xs font-bold text-gray-500 uppercase mb-3 md:mt-2">Patient Portion</h3>
                            <div className="text-2xl font-bold text-blue-600 text-right">${plan.patientPortion.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
                          </div>
                        </div>
                    </div>
    
                    <div className="flex flex-col gap-6">
                        <div className="bg-white rounded-lg pt-2 md:pt-0">
                            <h3 className="text-xs font-bold text-gray-500 uppercase mb-3">Change Status</h3>
                            <div className="grid grid-cols-2 gap-2">
                                <button onClick={() => handleStatusChange('PRESENTED')} className={getStatusButtonClass('PRESENTED')}><Clock size={14}/> Presented</button>
                                <button onClick={() => handleStatusChange('ACCEPTED')} className={getStatusButtonClass('ACCEPTED')}><CheckCircle size={14}/> Accepted</button>
                                <button onClick={() => handleStatusChange('DECLINED')} className={getStatusButtonClass('DECLINED')}><XCircle size={14}/> Declined</button>
                                <button onClick={() => handleStatusChange('ON_HOLD')} className={getStatusButtonClass('ON_HOLD')}><AlertCircle size={14}/> On Hold</button>
                            </div>
                        </div>
                        <div className="pb-8 md:pb-0">
                            <h3 className="text-xs font-bold text-gray-500 uppercase mb-3">Internal Notes</h3>
                            <textarea 
                                className="w-full h-24 md:h-32 p-2 text-sm bg-white text-gray-900 border border-gray-300 rounded resize-none focus:ring-1 focus:ring-blue-500 outline-none placeholder-gray-400"
                                value={plan.notesInternal || ''}
                                onChange={e => setPlan({ ...plan, notesInternal: e.target.value })}
                                onBlur={handleDetailsSave}
                                placeholder="Private notes for staff..."
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>

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
                      <div className="text-xs text-gray-400 hidden md:block">Viewing as: {plan.caseAlias}</div>
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
                 <PremiumPatientLayout plan={plan} items={items} />
              </div>
            </div>
          </div>
        )}

        <NumberPadModal
            isOpen={modalConfig.isOpen}
            onClose={() => setModalConfig({ isOpen: false, field: null, title: '' })}
            onDone={handleModalDone}
            initialValue={getModalInitialValue()}
            title={modalConfig.title || ''}
            isPercentage={false}
        />
    </div>
  );
};
