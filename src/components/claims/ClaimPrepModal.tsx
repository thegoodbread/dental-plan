
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Visit, TreatmentPlanItem } from '../../types';
import { CheckCircle2, AlertTriangle, FileText, ArrowLeft, RotateCw, Stethoscope } from 'lucide-react';
import { updateProcedureDocumentationFlags, updateVisitClaimPrepStatus, updateProcedureDiagnosisCodes } from '../../services/treatmentPlans';
import { buildClaimNarrativeDraft, evaluateClaimReadiness, ClaimReadinessResult, PayerId } from '../../services/clinicalLogic';
import { DiagnosisCodePicker } from './DiagnosisCodePicker';
import { VisitNotesPanel } from '../visits/VisitNotesPanel';

interface ClaimPrepModalProps {
  isOpen: boolean;
  onClose: () => void;
  visit: Visit;
  items: TreatmentPlanItem[];
  onUpdate: () => void;
}

type TabMode = 'CLAIM' | 'NOTES';

export const ClaimPrepModal: React.FC<ClaimPrepModalProps> = ({ isOpen, onClose, visit, items, onUpdate }) => {
  const [activeTab, setActiveTab] = useState<TabMode>('CLAIM');
  const [selectedItemId, setSelectedItemId] = useState<string | null>(items[0]?.id || null);
  const [narrative, setNarrative] = useState('');
  
  const selectedItem = items.find(i => i.id === selectedItemId);
  const payerId: PayerId = (visit as any).payerId || 'GENERIC';

  const getReadiness = useCallback((item: TreatmentPlanItem): ClaimReadinessResult => {
      return evaluateClaimReadiness(item, payerId);
  }, [payerId]);

  const isItemReady = useCallback((item: TreatmentPlanItem) => {
      const result = getReadiness(item);
      return result.riskLevel === 'LOW';
  }, [getReadiness]);

  const regenerateNarrative = useCallback((item: TreatmentPlanItem) => {
      const draft = buildClaimNarrativeDraft({
          procedureName: item.procedureName,
          procedureCode: item.procedureCode,
          tooth: item.selectedTeeth?.join(', ') || null,
          diagnosisCodes: item.diagnosisCodes || [],
          visitDate: item.performedDate || visit.date
      });
      setNarrative(draft);
  }, [visit.date]);

  // --- Narrative Sync Logic ---
  useEffect(() => {
      if (!selectedItem) return;

      if (selectedItem.documentation?.narrativeText) {
          setNarrative(selectedItem.documentation.narrativeText);
      } else {
          regenerateNarrative(selectedItem);
      }
  }, [selectedItemId, selectedItem?.id, regenerateNarrative]); 

  const handleManualRegenerate = () => {
      if (selectedItem) regenerateNarrative(selectedItem);
  };

  const handleNarrativeSave = () => {
      if (!selectedItem) return;
      updateProcedureDocumentationFlags(selectedItem.id, { narrativeText: narrative });
      onUpdate();
  };

  const handleUpdateDiagnosisCodes = (itemId: string, codes: string[]) => {
      updateProcedureDiagnosisCodes(itemId, codes);
      onUpdate();
  };

  const toggleFlag = (flag: keyof NonNullable<TreatmentPlanItem['documentation']>) => {
      if (!selectedItem) return;
      const current = selectedItem.documentation || {};
      updateProcedureDocumentationFlags(selectedItem.id, { [flag]: !current[flag] });
      onUpdate();
  };

  const allItemsReady = items.every(isItemReady);

  const handleMarkVisitReady = () => {
      if (allItemsReady) {
          updateVisitClaimPrepStatus(visit.id, 'READY');
          onUpdate();
      }
  };

  const visitRiskSummary = useMemo(() => {
      let low = 0, med = 0, high = 0;
      const missingCounts: Record<string, number> = {};

      items.forEach(item => {
          const r = getReadiness(item);
          if (r.riskLevel === 'LOW') low++;
          else if (r.riskLevel === 'MEDIUM') med++;
          else high++;

          r.missing.forEach(m => {
              missingCounts[m] = (missingCounts[m] || 0) + 1;
          });
      });

      let topMissingLabel: string | null = null;
      let topMissingCount = 0;
      Object.entries(missingCounts).forEach(([label, count]) => {
          if (count > topMissingCount) {
              topMissingLabel = label;
              topMissingCount = count;
          }
      });

      return { low, med, high, topMissingLabel };
  }, [items, getReadiness]);

  const selectedReadiness = useMemo(() => selectedItem ? getReadiness(selectedItem) : null, [selectedItem, getReadiness]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[90] bg-slate-100 flex flex-col animate-in slide-in-from-right duration-300">
       {/* HEADER */}
       <div className="bg-white border-b border-gray-200 px-6 pt-4 pb-0 flex flex-col shadow-sm shrink-0">
           <div className="flex justify-between items-center mb-4">
               <div className="flex items-center gap-4">
                   <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full text-gray-500">
                       <ArrowLeft size={20} />
                   </button>
                   <div>
                       <h2 className="text-xl font-bold text-gray-900">Visit Documentation</h2>
                       <div className="flex items-center gap-2 text-sm text-gray-500">
                           <span>Visit: {new Date(visit.date).toLocaleDateString()}</span>
                           <span>•</span>
                           <span>{visit.provider}</span>
                       </div>
                   </div>
               </div>
               
               {activeTab === 'CLAIM' && (
                   <div className="flex items-center gap-3">
                       {visit.claimPrepStatus === 'READY' && (
                           <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold border border-green-200 flex items-center gap-1">
                               <CheckCircle2 size={14} /> READY FOR SUBMISSION
                           </span>
                       )}
                       <div className="h-8 w-px bg-gray-200 mx-2"></div>
                       <button className="px-4 py-2 bg-white border border-gray-300 text-gray-700 font-bold rounded-lg text-sm hover:bg-gray-50 shadow-sm flex items-center gap-2">
                           <FileText size={16} /> Print Packet
                       </button>
                       <button 
                           onClick={handleMarkVisitReady}
                           disabled={!allItemsReady || visit.claimPrepStatus === 'READY'}
                           className="px-6 py-2 bg-green-600 text-white font-bold rounded-lg text-sm hover:bg-green-700 shadow-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                       >
                           <CheckCircle2 size={16} /> Mark Ready
                       </button>
                   </div>
               )}
           </div>

           {/* TABS */}
           <div className="flex gap-6">
               <button 
                  onClick={() => setActiveTab('CLAIM')}
                  className={`pb-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'CLAIM' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
               >
                   <CheckCircle2 size={16} /> Claim Prep
               </button>
               <button 
                  onClick={() => setActiveTab('NOTES')}
                  className={`pb-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'NOTES' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
               >
                   <Stethoscope size={16} /> Clinical Notes
               </button>
           </div>
       </div>

       {/* MAIN CONTENT AREA */}
       <div className="flex-1 overflow-hidden flex relative">
           
           {activeTab === 'NOTES' ? (
               <div className="absolute inset-0">
                   <VisitNotesPanel visit={visit} items={items} onUpdate={onUpdate} />
               </div>
           ) : (
               <>
                   {/* VISIT RISK OVERVIEW (Only for Claim Tab) */}
                   <div className="absolute top-0 left-0 right-0 z-10 px-8 pt-4 pb-2 bg-slate-50 border-b border-slate-200">
                      <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-4">
                        <div>
                          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                            Visit Risk Overview
                          </p>
                          <p className="text-xs text-slate-600">
                            {visitRiskSummary.high > 0
                              ? 'Some procedures have a high denial risk. Resolve missing items before submitting.'
                              : visitRiskSummary.med > 0
                              ? 'A few procedures have medium denial risk. Check requirements before submission.'
                              : 'All procedures are low risk based on current documentation.'}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-50 text-green-700 font-semibold">
                            LOW&nbsp;{visitRiskSummary.low}
                          </span>
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-50 text-amber-700 font-semibold">
                            MED&nbsp;{visitRiskSummary.med}
                          </span>
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-50 text-red-700 font-semibold">
                            HIGH&nbsp;{visitRiskSummary.high}
                          </span>
                        </div>
                      </div>
                   </div>

                   {/* CLAIM PREP LAYOUT */}
                   <div className="flex-1 flex pt-[72px]"> {/* Padding top to clear risk banner */}
                       {/* LEFT SIDEBAR: LIST */}
                       <div className="w-96 bg-white border-r border-gray-200 overflow-y-auto flex flex-col">
                           <div className="p-4 border-b border-gray-100 bg-gray-50 text-xs font-bold text-gray-500 uppercase tracking-wider">
                               Procedures ({items.length})
                           </div>
                           {items.map(item => {
                               const readiness = getReadiness(item);
                               const isSelected = selectedItemId === item.id;
                               const risk = readiness.riskLevel;

                               const riskBadge =
                                risk === 'LOW' ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-50 text-green-700 text-[10px] font-bold">
                                    <CheckCircle2 size={12} /> LOW
                                  </span>
                                ) : risk === 'MEDIUM' ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[10px] font-bold">
                                    <AlertTriangle size={12} /> MED
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-50 text-red-700 text-[10px] font-bold">
                                    <AlertTriangle size={12} /> HIGH
                                  </span>
                                );
                               
                               return (
                                   <div 
                                       key={item.id}
                                       onClick={() => setSelectedItemId(item.id)}
                                       className={`p-4 border-b border-gray-100 cursor-pointer transition-all hover:bg-blue-50/50 ${isSelected ? 'bg-blue-50 border-l-4 border-l-blue-600' : 'border-l-4 border-l-transparent'}`}
                                   >
                                       <div className="flex justify-between items-start mb-1">
                                           <span className="font-mono text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">{item.procedureCode}</span>
                                           {riskBadge}
                                       </div>
                                       <div className="font-bold text-sm text-gray-900 mb-1 leading-tight">{item.procedureName}</div>
                                       <div className="text-xs text-gray-500 flex justify-between items-center">
                                           <span>Tooth: {item.selectedTeeth?.join(',') || 'N/A'}</span>
                                           <span>${item.netFee}</span>
                                       </div>
                                   </div>
                               );
                           })}
                       </div>

                       {/* RIGHT SIDE: DETAIL EDITOR */}
                       <div className="flex-1 overflow-y-auto p-8 bg-slate-50">
                           {selectedItem ? (
                               <div className="max-w-3xl mx-auto space-y-6">
                                   
                                   {/* Context Card */}
                                   <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                                       <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                           <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-sm">{selectedItem.procedureCode}</span>
                                           {selectedItem.procedureName}
                                       </h3>
                                       
                                       <div className="grid grid-cols-2 gap-6">
                                           <div>
                                               <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Diagnosis (ICD-10)</label>
                                               <DiagnosisCodePicker 
                                                  value={selectedItem.diagnosisCodes || []}
                                                  onChange={(codes) => handleUpdateDiagnosisCodes(selectedItem.id, codes)}
                                                  procedureCode={selectedItem.procedureCode}
                                                  procedureName={selectedItem.procedureName}
                                               />
                                           </div>
                                           <div>
                                               <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Execution Detail</label>
                                               <div className="text-sm text-gray-700 p-3 bg-gray-50 rounded-lg border border-gray-200 space-y-1">
                                                   <div className="flex justify-between">
                                                       <span className="text-gray-500">Date:</span>
                                                       <span className="font-medium">{selectedItem.performedDate ? new Date(selectedItem.performedDate).toLocaleDateString() : 'Not set'}</span>
                                                   </div>
                                                   <div className="flex justify-between">
                                                       <span className="text-gray-500">Fee:</span>
                                                       <span className="font-medium">${selectedItem.netFee}</span>
                                                   </div>
                                                   <div className="flex justify-between">
                                                       <span className="text-gray-500">Tooth:</span>
                                                       <span className="font-medium">{selectedItem.selectedTeeth?.join(', ') || 'N/A'}</span>
                                                   </div>
                                               </div>
                                           </div>
                                       </div>
                                   </div>

                                   {/* Requirements & Missing Items Panel */}
                                   {selectedReadiness && (
                                      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                                        <div className="flex items-center justify-between mb-2">
                                          <h4 className="font-bold text-gray-900 text-sm">Claim Requirements</h4>
                                          <span
                                            className={
                                              selectedReadiness.riskLevel === 'LOW'
                                                ? 'text-xs font-bold text-green-700'
                                                : selectedReadiness.riskLevel === 'MEDIUM'
                                                ? 'text-xs font-bold text-amber-700'
                                                : 'text-xs font-bold text-red-700'
                                            }
                                          >
                                            {selectedReadiness.riskLevel === 'LOW'
                                              ? 'Low denial risk'
                                              : selectedReadiness.riskLevel === 'MEDIUM'
                                              ? 'Medium denial risk'
                                              : 'High denial risk'}
                                          </span>
                                        </div>

                                        {selectedReadiness.ruleApplied?.notesForBiller && (
                                          <p className="text-xs text-gray-500 mb-2">
                                            {selectedReadiness.ruleApplied.notesForBiller}
                                          </p>
                                        )}

                                        {selectedReadiness.missing.length > 0 ? (
                                          <ul className="list-disc list-inside text-xs text-gray-700 space-y-1">
                                            {selectedReadiness.missing.map(m => (
                                              <li key={m}>{m}</li>
                                            ))}
                                          </ul>
                                        ) : (
                                          <p className="text-xs text-green-700">
                                            All key requirements satisfied for this procedure.
                                          </p>
                                        )}
                                      </div>
                                   )}

                                   {/* Documentation Checklist */}
                                   <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                                       <h4 className="font-bold text-gray-900 mb-4 border-b border-gray-100 pb-2">Attachments & Proof</h4>
                                       <div className="grid grid-cols-2 gap-4">
                                           <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${selectedItem.documentation?.hasXray ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200 hover:border-gray-300'}`}>
                                               <input type="checkbox" className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500" checked={!!selectedItem.documentation?.hasXray} onChange={() => toggleFlag('hasXray')} />
                                               <span className="font-medium text-gray-700">Pre-Op X-Ray</span>
                                           </label>
                                           <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${selectedItem.documentation?.hasPhoto ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200 hover:border-gray-300'}`}>
                                               <input type="checkbox" className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500" checked={!!selectedItem.documentation?.hasPhoto} onChange={() => toggleFlag('hasPhoto')} />
                                               <span className="font-medium text-gray-700">Intraoral Photo</span>
                                           </label>
                                           <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${selectedItem.documentation?.hasPerioChart ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200 hover:border-gray-300'}`}>
                                               <input type="checkbox" className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500" checked={!!selectedItem.documentation?.hasPerioChart} onChange={() => toggleFlag('hasPerioChart')} />
                                               <span className="font-medium text-gray-700">Perio Charting</span>
                                           </label>
                                           <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${selectedItem.documentation?.hasFmxWithin36Months ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200 hover:border-gray-300'}`}>
                                               <input type="checkbox" className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500" checked={!!selectedItem.documentation?.hasFmxWithin36Months} onChange={() => toggleFlag('hasFmxWithin36Months')} />
                                               <span className="font-medium text-gray-700">Recent FMX/Pano</span>
                                           </label>
                                       </div>
                                   </div>

                                   {/* Narrative Editor */}
                                   <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col">
                                       <div className="flex justify-between items-center mb-4">
                                           <div>
                                               <h4 className="font-bold text-gray-900">Clinical Narrative</h4>
                                               <span className="text-xs text-gray-400">Required for most major claims</span>
                                           </div>
                                           <button 
                                              onClick={handleManualRegenerate}
                                              className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-2 py-1 rounded flex items-center gap-1 transition-colors"
                                              title="Reset narrative based on current diagnosis and details"
                                           >
                                               <RotateCw size={12} /> Regenerate from current data
                                           </button>
                                       </div>
                                       
                                       {/* Hint Banner if auto-generated */}
                                       {!selectedItem.documentation?.narrativeText && narrative && (
                                           <div className="text-xs text-slate-500 bg-slate-50 p-2 rounded mb-2 border border-slate-100 flex items-start gap-2">
                                               <FileText size={14} className="mt-0.5 text-slate-400" />
                                               Draft generated from procedure and diagnosis codes. Edit as needed.
                                           </div>
                                       )}

                                       <textarea 
                                           className="w-full h-32 p-3 border border-gray-300 rounded-lg text-sm text-gray-800 focus:ring-2 focus:ring-blue-500 outline-none resize-none mb-3"
                                           placeholder="Describe clinical necessity, findings, and procedure details..."
                                           value={narrative}
                                           onChange={e => setNarrative(e.target.value)}
                                           onBlur={handleNarrativeSave}
                                       />
                                       <div className="flex justify-end">
                                           <button onClick={handleNarrativeSave} className="text-blue-600 text-sm font-bold hover:text-blue-800">Save Narrative</button>
                                       </div>
                                   </div>

                               </div>
                           ) : (
                               <div className="flex flex-col items-center justify-center h-full text-gray-400">
                                   <FileText size={48} className="mb-4 opacity-20" />
                                   <p>Select a procedure to edit claim details</p>
                               </div>
                           )}
                       </div>
                   </div>
               </>
           )}
       </div>
    </div>
  );
};
