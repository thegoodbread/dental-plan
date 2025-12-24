
import React, { useState } from 'react';
import * as ReactRouterDOM from 'react-router-dom';
import { Visit, TreatmentPlanItem } from '../../types';
import { X, Check, ShieldCheck, Stethoscope, ArrowRight } from 'lucide-react';
import { markProcedureCompleted, updateProcedureDiagnosisCodes } from '../../services/treatmentPlans';

const { useNavigate } = ReactRouterDOM;

interface VisitDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  visit: Visit;
  items: TreatmentPlanItem[];
  onUpdate: () => void;
}

export const VisitDetailModal: React.FC<VisitDetailModalProps> = ({
  isOpen, onClose, visit, items, onUpdate
}) => {
  const navigate = useNavigate();
  const [editingDxItemId, setEditingDxItemId] = useState<string | null>(null);
  const [tempDx, setTempDx] = useState('');

  const visitItems = items.filter(i => i.performedInVisitId === visit.id);

  if (!isOpen) return null;

  const handleToggleComplete = (item: TreatmentPlanItem) => {
    markProcedureCompleted(item.id, new Date().toISOString());
    onUpdate();
  };

  const handleSaveDx = (itemId: string) => {
    updateProcedureDiagnosisCodes(itemId, tempDx.split(',').map(s => s.trim()).filter(Boolean));
    setEditingDxItemId(null);
    onUpdate();
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
       <div className="bg-white w-full max-w-4xl h-[70vh] rounded-[32px] shadow-2xl flex flex-col overflow-hidden">
          <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-white shrink-0">
             <div className="flex items-center gap-4">
                 <div className="p-3 bg-slate-100 text-slate-600 rounded-2xl">
                     <Stethoscope size={28} />
                 </div>
                 <div>
                     <h2 className="text-xl font-black text-slate-900 leading-none">Visit Overview</h2>
                     <div className="flex items-center gap-2 mt-2 text-xs text-slate-400 font-bold uppercase tracking-wider">
                         <span>{new Date(visit.date).toLocaleDateString()}</span>
                         <span>•</span>
                         <span>{visit.provider}</span>
                     </div>
                 </div>
             </div>
             <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors"><X size={26}/></button>
          </div>

          <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
              <table className="w-full text-left border-collapse">
                  <thead>
                      <tr className="border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          <th className="pb-4 px-2 w-12 text-center">Status</th>
                          <th className="pb-4 px-2">Procedure</th>
                          <th className="pb-4 px-2 w-24">Code</th>
                          <th className="pb-4 px-2 w-48">Diagnosis (ICD-10)</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                      {visitItems.map(item => (
                          <tr key={item.id} className="hover:bg-slate-50/50 group transition-colors">
                              <td className="py-5 px-2 text-center">
                                  <button onClick={() => handleToggleComplete(item)} className={`w-7 h-7 rounded-xl border flex items-center justify-center transition-all ${item.procedureStatus === 'COMPLETED' ? 'bg-green-500 border-green-600 text-white shadow-sm' : 'bg-white border-slate-300 hover:border-blue-400'}`}>
                                      {item.procedureStatus === 'COMPLETED' && <Check size={16} strokeWidth={3} />}
                                  </button>
                              </td>
                              <td className="py-5 px-2">
                                  <div className={`font-bold text-sm ${item.procedureStatus === 'COMPLETED' ? 'text-slate-900' : 'text-slate-400'}`}>{item.procedureName}</div>
                              </td>
                              <td className="py-5 px-2 font-mono text-[10px] font-bold text-slate-400">{item.procedureCode}</td>
                              <td className="py-5 px-2">
                                  {editingDxItemId === item.id ? (
                                      <div className="flex gap-1">
                                          <input autoFocus value={tempDx} onChange={e => setTempDx(e.target.value)} className="w-full border border-blue-300 rounded px-2 py-1 text-xs outline-none" />
                                          <button onClick={() => handleSaveDx(item.id)} className="p-1 bg-blue-600 text-white rounded"><Check size={14}/></button>
                                      </div>
                                  ) : (
                                      <div onClick={() => { setEditingDxItemId(item.id); setTempDx((item.diagnosisCodes || []).join(', ')); }} className="min-h-[24px] cursor-pointer text-xs font-bold text-blue-600 hover:underline">
                                          {(item.diagnosisCodes || []).length > 0 ? (item.diagnosisCodes || []).join(', ') : '+ Set Diagnosis'}
                                      </div>
                                  )}
                              </td>
                          </tr>
                      ))}
                  </tbody>
              </table>
          </div>

          <div className="px-10 py-8 border-t border-slate-100 bg-slate-50/50 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                      <ShieldCheck size={20} />
                  </div>
                  <div>
                    <p className="text-xs font-black text-slate-900 uppercase tracking-widest">Submission Ready Flow</p>
                    <p className="text-[10px] text-slate-500 font-medium">Resolution of clinical facts happens in the Compiler.</p>
                  </div>
              </div>
              <button 
                onClick={() => navigate(`/claim-compiler/${visit.id}`)}
                className="px-8 py-3.5 bg-slate-900 text-white font-black rounded-2xl text-sm hover:bg-black shadow-2xl shadow-slate-300 flex items-center gap-2 transition-all active:scale-95"
              >
                  <ShieldCheck size={20} /> Compile Claim & Resolve Logic <ArrowRight size={18} />
              </button>
          </div>
       </div>
    </div>
  );
};
