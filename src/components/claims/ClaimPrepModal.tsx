
import React, { useState, useEffect } from 'react';
import { Visit, TreatmentPlanItem } from '../../types';
import { X, CheckCircle2, AlertTriangle, FileText, Camera, Upload, ArrowLeft, Send } from 'lucide-react';
import { updateProcedureDocumentationFlags, updateVisitClaimPrepStatus, updateProcedureDiagnosisCodes, updateTreatmentPlanItem } from '../../services/treatmentPlans';

interface ClaimPrepModalProps {
  isOpen: boolean;
  onClose: () => void;
  visit: Visit;
  items: TreatmentPlanItem[];
  onUpdate: () => void;
}

export const ClaimPrepModal: React.FC<ClaimPrepModalProps> = ({ isOpen, onClose, visit, items, onUpdate }) => {
  const [selectedItemId, setSelectedItemId] = useState<string | null>(items[0]?.id || null);
  const [narrative, setNarrative] = useState('');
  
  const selectedItem = items.find(i => i.id === selectedItemId);

  // Sync narrative when selection changes
  useEffect(() => {
      if (selectedItem) {
          setNarrative(selectedItem.documentation?.narrativeText || '');
      }
  }, [selectedItemId, selectedItem]);

  const handleNarrativeSave = () => {
      if (!selectedItem) return;
      updateProcedureDocumentationFlags(selectedItem.id, { narrativeText: narrative });
      onUpdate();
  };

  const toggleFlag = (flag: keyof NonNullable<TreatmentPlanItem['documentation']>) => {
      if (!selectedItem) return;
      const current = selectedItem.documentation || {};
      updateProcedureDocumentationFlags(selectedItem.id, { [flag]: !current[flag] });
      onUpdate();
  };

  const isItemReady = (item: TreatmentPlanItem) => {
      if (item.procedureStatus !== 'COMPLETED') return false;
      if (!item.diagnosisCodes || item.diagnosisCodes.length === 0) return false;
      if (!item.documentation?.narrativeText) return false;
      return true;
  };

  const allItemsReady = items.every(isItemReady);

  const handleMarkVisitReady = () => {
      if (allItemsReady) {
          updateVisitClaimPrepStatus(visit.id, 'READY');
          onUpdate();
      }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[90] bg-slate-100 flex flex-col animate-in slide-in-from-right duration-300">
       {/* HEADER */}
       <div className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center shadow-sm shrink-0">
           <div className="flex items-center gap-4">
               <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full text-gray-500">
                   <ArrowLeft size={20} />
               </button>
               <div>
                   <h2 className="text-xl font-bold text-gray-900">Claim Preparation</h2>
                   <div className="flex items-center gap-2 text-sm text-gray-500">
                       <span>Visit: {new Date(visit.date).toLocaleDateString()}</span>
                       <span>•</span>
                       <span>{visit.provider}</span>
                   </div>
               </div>
           </div>
           
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
       </div>

       {/* MAIN CONTENT */}
       <div className="flex-1 overflow-hidden flex">
           {/* LEFT SIDEBAR: LIST */}
           <div className="w-96 bg-white border-r border-gray-200 overflow-y-auto flex flex-col">
               <div className="p-4 border-b border-gray-100 bg-gray-50 text-xs font-bold text-gray-500 uppercase tracking-wider">
                   Procedures ({items.length})
               </div>
               {items.map(item => {
                   const ready = isItemReady(item);
                   const isSelected = selectedItemId === item.id;
                   
                   return (
                       <div 
                           key={item.id}
                           onClick={() => setSelectedItemId(item.id)}
                           className={`p-4 border-b border-gray-100 cursor-pointer transition-all hover:bg-blue-50/50 ${isSelected ? 'bg-blue-50 border-l-4 border-l-blue-600' : 'border-l-4 border-l-transparent'}`}
                       >
                           <div className="flex justify-between items-start mb-1">
                               <span className="font-mono text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">{item.procedureCode}</span>
                               {ready ? <CheckCircle2 size={16} className="text-green-500" /> : <AlertTriangle size={16} className="text-amber-500" />}
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
                                   <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Diagnosis (ICD-10)</label>
                                   <div className="flex flex-wrap gap-2 mb-2">
                                       {(selectedItem.diagnosisCodes || []).map(code => (
                                           <span key={code} className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-sm font-medium border border-gray-200">{code}</span>
                                       ))}
                                   </div>
                                   <input 
                                       placeholder="Add code (e.g. K02.9)" 
                                       className="w-full text-sm border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                       onKeyDown={(e) => {
                                           if (e.key === 'Enter') {
                                               const val = (e.target as HTMLInputElement).value;
                                               if (val) {
                                                   const current = selectedItem.diagnosisCodes || [];
                                                   updateProcedureDiagnosisCodes(selectedItem.id, [...current, val]);
                                                   (e.target as HTMLInputElement).value = '';
                                                   onUpdate();
                                               }
                                           }
                                       }}
                                   />
                               </div>
                               <div>
                                   <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Execution Detail</label>
                                   <div className="text-sm text-gray-700 p-2 bg-gray-50 rounded-lg border border-gray-100">
                                       <div>Date: <strong>{selectedItem.performedDate ? new Date(selectedItem.performedDate).toLocaleDateString() : 'Not set'}</strong></div>
                                       <div>Fee: <strong>${selectedItem.netFee}</strong></div>
                                       <div>Tooth: <strong>{selectedItem.selectedTeeth?.join(', ') || 'N/A'}</strong></div>
                                   </div>
                               </div>
                           </div>
                       </div>

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
                               <h4 className="font-bold text-gray-900">Clinical Narrative</h4>
                               <span className="text-xs text-gray-400">Required for most major claims</span>
                           </div>
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
    </div>
  );
};
