
import React, { useState } from 'react';
import { Visit, TreatmentPlanItem, VisitStatus } from '../../types';
import { X, Check, FileText, ChevronRight, AlertTriangle, CheckCircle2, ShieldCheck, Stethoscope, Plus } from 'lucide-react';
import { markProcedureCompleted, updateProcedureDiagnosisCodes, updateProcedureDocumentationFlags, updateVisitStatus } from '../../services/treatmentPlans';
import { ClaimPrepModal } from '../claims/ClaimPrepModal';
import { ChairsideProvider } from '../../context/ChairsideContext';

interface VisitDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  visit: Visit;
  items: TreatmentPlanItem[]; // All items in the plan
  onUpdate: () => void; // Trigger refresh
}

export const VisitDetailModal: React.FC<VisitDetailModalProps> = ({
  isOpen, onClose, visit, items, onUpdate
}) => {
  const [isClaimPrepOpen, setIsClaimPrepOpen] = useState(false);
  const [documentationPanelItemId, setDocumentationPanelItemId] = useState<string | null>(null);
  const [editingDxItemId, setEditingDxItemId] = useState<string | null>(null);
  const [tempDx, setTempDx] = useState('');

  // Filter items for this visit
  const visitItems = items.filter(i => i.performedInVisitId === visit.id);

  if (!isOpen) return null;

  const handleToggleComplete = (item: TreatmentPlanItem) => {
      if (item.procedureStatus === 'COMPLETED') {
          // Revert to SCHEDULED if unticked ( MVP simplification)
          // In a real app we might need a more complex state machine
          // For now we just don't allow reverting easily via this UI or toggle back to null/planned
      } else {
          markProcedureCompleted(item.id, new Date().toISOString());
          onUpdate();
      }
  };

  const handleSaveDx = (itemId: string) => {
      const codes = tempDx.split(',').map(s => s.trim()).filter(Boolean);
      updateProcedureDiagnosisCodes(itemId, codes);
      setEditingDxItemId(null);
      onUpdate();
  };

  const handleMarkVisitCompleted = () => {
      if (visit.status !== 'COMPLETED') {
          updateVisitStatus(visit.id, 'COMPLETED');
          onUpdate();
      }
  };

  const getClaimReadinessStatus = (item: TreatmentPlanItem) => {
      if (item.procedureStatus !== 'COMPLETED') return 'gray';
      const hasDx = item.diagnosisCodes && item.diagnosisCodes.length > 0;
      const hasNarrative = !!item.documentation?.narrativeText;
      
      if (hasDx && hasNarrative) return 'green';
      if (hasDx || hasNarrative) return 'yellow';
      return 'gray';
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
       <div className="bg-white w-full max-w-4xl h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
          
          {/* HEADER */}
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center shrink-0">
             <div className="flex items-center gap-4">
                 <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                     <Stethoscope size={24} />
                 </div>
                 <div>
                     <h2 className="text-xl font-bold text-gray-900 leading-none">Visit Detail</h2>
                     <div className="flex items-center gap-2 mt-1.5 text-sm text-gray-500">
                         <span>{new Date(visit.date).toLocaleDateString()}</span>
                         <span>•</span>
                         <span>{visit.provider}</span>
                         <span>•</span>
                         <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${visit.status === 'COMPLETED' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-blue-100 text-blue-700 border-blue-200'}`}>
                             {visit.status?.replace('_', ' ')}
                         </span>
                     </div>
                 </div>
             </div>
             <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full text-gray-500 transition-colors">
                 <X size={20} />
             </button>
          </div>

          {/* CONTENT */}
          <div className="flex-1 overflow-y-auto p-6 bg-white">
              <table className="w-full text-left border-collapse">
                  <thead>
                      <tr className="border-b border-gray-100 text-xs font-bold text-gray-400 uppercase tracking-wider">
                          <th className="py-3 px-2 w-12 text-center">Status</th>
                          <th className="py-3 px-2">Procedure</th>
                          <th className="py-3 px-2 w-24">Code</th>
                          <th className="py-3 px-2 w-16">Tooth</th>
                          <th className="py-3 px-2 w-48">Diagnosis</th>
                          <th className="py-3 px-2 w-24 text-center">Claim</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                      {visitItems.map(item => {
                          const isCompleted = item.procedureStatus === 'COMPLETED';
                          const claimStatus = getClaimReadinessStatus(item);
                          
                          return (
                              <tr key={item.id} className="hover:bg-gray-50 transition-colors group">
                                  <td className="py-3 px-2 text-center">
                                      <button 
                                        onClick={() => handleToggleComplete(item)}
                                        className={`w-6 h-6 rounded border flex items-center justify-center transition-all ${isCompleted ? 'bg-green-500 border-green-600 text-white' : 'bg-white border-gray-300 hover:border-blue-400'}`}
                                      >
                                          {isCompleted && <Check size={14} strokeWidth={3} />}
                                      </button>
                                  </td>
                                  <td className="py-3 px-2">
                                      <div className={`font-medium ${isCompleted ? 'text-gray-900' : 'text-gray-500'}`}>{item.procedureName}</div>
                                  </td>
                                  <td className="py-3 px-2 font-mono text-xs text-gray-500">{item.procedureCode}</td>
                                  <td className="py-3 px-2 font-bold text-gray-700">
                                      {item.selectedTeeth?.join(', ') || '-'}
                                  </td>
                                  <td className="py-3 px-2">
                                      {editingDxItemId === item.id ? (
                                          <div className="flex items-center gap-1">
                                              <input 
                                                autoFocus
                                                className="w-full text-xs p-1 border rounded"
                                                value={tempDx}
                                                onChange={e => setTempDx(e.target.value)}
                                                onBlur={() => handleSaveDx(item.id)}
                                                onKeyDown={e => e.key === 'Enter' && handleSaveDx(item.id)}
                                                placeholder="ICD-10 (e.g. K02.9)"
                                              />
                                          </div>
                                      ) : (
                                          <div 
                                            onClick={() => { setEditingDxItemId(item.id); setTempDx((item.diagnosisCodes || []).join(', ')); }}
                                            className="min-h-[24px] flex items-center cursor-pointer hover:bg-gray-100 px-2 rounded -ml-2 border border-transparent hover:border-gray-200 transition-colors"
                                          >
                                              {item.diagnosisCodes && item.diagnosisCodes.length > 0 ? (
                                                  <div className="flex gap-1 flex-wrap">
                                                      {item.diagnosisCodes.map(code => (
                                                          <span key={code} className="text-[10px] font-bold bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-100">{code}</span>
                                                      ))}
                                                  </div>
                                              ) : (
                                                  <span className="text-xs text-gray-400 italic flex items-center gap-1"><Plus size={10}/> Add Dx</span>
                                              )}
                                          </div>
                                      )}
                                  </td>
                                  <td className="py-3 px-2 text-center">
                                      {claimStatus === 'green' && <div className="inline-block w-3 h-3 rounded-full bg-green-500 shadow-sm" title="Ready" />}
                                      {claimStatus === 'yellow' && <div className="inline-block w-3 h-3 rounded-full bg-yellow-400 shadow-sm" title="Missing Info" />}
                                      {claimStatus === 'gray' && <div className="inline-block w-3 h-3 rounded-full bg-gray-200" title="Not Started" />}
                                  </td>
                              </tr>
                          );
                      })}
                  </tbody>
              </table>
              
              {visitItems.length === 0 && (
                  <div className="text-center py-12 text-gray-400 italic">No procedures linked to this visit.</div>
              )}
          </div>

          {/* FOOTER */}
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-between items-center shrink-0">
              <div className="text-xs text-gray-500">
                  <span className="font-bold text-gray-700">{visitItems.filter(i => i.procedureStatus === 'COMPLETED').length}</span> of {visitItems.length} procedures completed
              </div>
              <div className="flex gap-3">
                  <button 
                    onClick={handleMarkVisitCompleted}
                    disabled={visit.status === 'COMPLETED'}
                    className="px-4 py-2 bg-white border border-gray-300 text-gray-700 font-bold rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                      {visit.status === 'COMPLETED' ? 'Visit Completed' : 'Mark Visit Completed'}
                  </button>
                  <button 
                    onClick={() => setIsClaimPrepOpen(true)}
                    className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg text-sm hover:bg-blue-700 shadow-sm flex items-center gap-2 transition-colors"
                  >
                      <ShieldCheck size={16} /> Open Claim Prep
                  </button>
              </div>
          </div>
       </div>

       {isClaimPrepOpen && (
           <ChairsideProvider>
               <ClaimPrepModal 
                  isOpen={isClaimPrepOpen} 
                  onClose={() => setIsClaimPrepOpen(false)}
                  visit={visit}
                  items={visitItems}
                  onUpdate={onUpdate}
               />
           </ChairsideProvider>
       )}
    </div>
  );
};
