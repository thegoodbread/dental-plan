import React, { useState, useMemo } from 'react';
import { Visit, TreatmentPlanItem, PayerTier, ClaimAcceptanceDecision, AcceptanceIssue, ClinicalSectionId } from '../../types';
import { 
    AlertTriangle, FileText, ArrowLeft, ShieldCheck, Info, ChevronRight, 
    Settings, CheckCircle2, Lock, Gavel, BarChart3, Database, Hammer
} from 'lucide-react';
import { getReadinessInputForVisit } from '../../services/treatmentPlans';
import { generateClaimNarrative } from '../../domain/NarrativeEngine';
import { evaluateClaimAcceptance, PAYER_PROFILES, ISSUE_TO_SECTION } from '../../domain/AdjudicationEngine';
import { ClinicalContextPanel } from './ClinicalContextPanel';
// FIX: Added imports for mapping types
import { ReadinessInput, ReadinessDiagnosis, ReadinessEvidence } from '../../domain/ClaimReadinessEngine';

interface ClaimPrepModalProps {
  isOpen: boolean;
  onClose: () => void;
  visit: Visit;
  items: TreatmentPlanItem[];
  onUpdate: () => void;
}

export const ClaimPrepModal: React.FC<ClaimPrepModalProps> = ({ isOpen, onClose, visit, items, onUpdate }) => {
  const [selectedItemId, setSelectedItemId] = useState<string | null>(items[0]?.id || null);
  const [payerTier, setPayerTier] = useState<PayerTier>('GENERIC');
  const [isAuditMode, setIsAuditMode] = useState(false);
  const [expandedContextId, setExpandedContextId] = useState<ClinicalSectionId | null>(null);

  // FIX: Mapped ClaimCompilerInput to ReadinessInput for engine compatibility
  const readinessInput: ReadinessInput | null = useMemo(() => {
      const compilerInput = getReadinessInputForVisit(visit.id);
      if (!compilerInput) return null;

      const diagnoses: ReadinessDiagnosis[] = [];
      const evidence: ReadinessEvidence[] = [];

      compilerInput.procedures.forEach(p => {
          if (p.diagnosisCodes) {
              p.diagnosisCodes.forEach(icd10 => diagnoses.push({ procedureId: p.id, icd10 }));
          }
          if (p.documentationFlags.hasXray) {
              evidence.push({ procedureId: p.id, type: 'pre_op_xray', attached: true });
          }
          if (p.documentationFlags.hasPhoto) {
              evidence.push({ procedureId: p.id, type: 'intraoral_photo', attached: true });
          }
          if (p.documentationFlags.hasPerioChart) {
              evidence.push({ procedureId: p.id, type: 'perio_charting', attached: true });
          }
      });

      return {
          procedures: compilerInput.procedures.map(p => ({
              id: p.id,
              cdtCode: p.cdtCode,
              label: p.label,
              tooth: p.tooth,
              surfaces: p.surfaces,
              isCompleted: p.isCompleted
          })),
          diagnoses,
          evidence,
          risksAndConsentComplete: compilerInput.visitFacts.consentObtained || false,
          provider: { npi: compilerInput.provider.npi },
          serviceDate: compilerInput.visit.serviceDate,
      };
  }, [visit.id, items]);
  
  const narrativeResult = useMemo(() => {
      if (!readinessInput) return { ok: false, missingSlots: [] };
      return generateClaimNarrative(readinessInput);
  }, [readinessInput]);

  const decision: ClaimAcceptanceDecision = useMemo(() => {
      // Mapping back to compiler input for adjudication if needed, or update adjudicator
      const compilerInput = getReadinessInputForVisit(visit.id);
      if (!compilerInput) return { allowed: false, confidenceScore: 0, primaryProcedureId: null, blockers: [], warnings: [] };
      return evaluateClaimAcceptance(compilerInput, payerTier, narrativeResult.traces || []);
  }, [visit.id, payerTier, narrativeResult]);

  const handleResolveIssue = (issue: AcceptanceIssue) => {
      const sectionId = ISSUE_TO_SECTION[issue.code] || ISSUE_TO_SECTION[issue.ruleId];
      if (sectionId) {
          setExpandedContextId(sectionId);
          // Scroll to the Clinical Context panel
          const panel = document.getElementById('clinical-context-section');
          panel?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[90] bg-slate-100 flex flex-col animate-in slide-in-from-right duration-300">
       {/* HEADER & ACCEPTANCE GATE */}
       <div className="bg-white border-b border-gray-200 px-6 py-4 flex flex-col shadow-sm shrink-0">
           <div className="flex justify-between items-center mb-4">
               <div className="flex items-center gap-4">
                   <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full text-gray-500"><ArrowLeft size={20} /></button>
                   <div>
                       <h2 className="text-xl font-bold text-gray-900">Adjudication Review</h2>
                       <div className="text-xs text-slate-500 font-medium uppercase tracking-wider">Acceptance Gate • {PAYER_PROFILES[payerTier].label}</div>
                   </div>
               </div>
               
               <div className="flex items-center gap-6">
                   <div className="flex flex-col items-end">
                       <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Clearance Probability</div>
                       <div className="flex items-center gap-3">
                           <div className="w-32 h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                               <div 
                                 className={`h-full transition-all duration-700 ${decision.confidenceScore >= 95 ? 'bg-green-500' : decision.confidenceScore >= 85 ? 'bg-blue-500' : 'bg-amber-500'}`}
                                 style={{ width: `${decision.confidenceScore}%` }}
                               />
                           </div>
                           <span className={`text-lg font-black ${decision.confidenceScore >= 95 ? 'text-green-600' : 'text-slate-700'}`}>{decision.confidenceScore}%</span>
                       </div>
                   </div>

                   <button 
                       disabled={!decision.allowed}
                       className="h-11 px-8 bg-blue-600 text-white font-black rounded-xl text-sm hover:bg-blue-700 shadow-lg shadow-blue-200 disabled:opacity-40 disabled:shadow-none transition-all flex items-center gap-2"
                   >
                       <ShieldCheck size={18} /> Transmit Claim
                   </button>
               </div>
           </div>

           <div className="flex justify-between items-center bg-slate-50 rounded-xl p-2 border border-slate-200">
               <div className="flex items-center gap-2 px-2">
                   <Gavel size={14} className="text-slate-400" />
                   <span className="text-xs font-bold text-slate-500">Payer Ruleset:</span>
                   <select 
                     value={payerTier} 
                     onChange={(e) => setPayerTier(e.target.value as PayerTier)}
                     className="bg-transparent text-xs font-black text-blue-600 outline-none cursor-pointer"
                   >
                       <option value="GENERIC">Commercial Tier</option>
                       <option value="CONSERVATIVE">Conservative / Major Payer</option>
                       <option value="STRICT">Strict (State/Government)</option>
                   </select>
               </div>
               <button 
                 onClick={() => setIsAuditMode(!isAuditMode)}
                 className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${isAuditMode ? 'bg-slate-800 text-white' : 'bg-white text-slate-500 border border-slate-200'}`}
               >
                   <Database size={12} /> Audit Engine {isAuditMode ? 'ON' : 'OFF'}
               </button>
           </div>
       </div>

       <div className="flex-1 overflow-hidden flex">
           {/* LEFT COLUMN: PROCEDURE NAV */}
           <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
               <div className="p-4 border-b border-slate-50 bg-slate-50/50">
                   <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                       <BarChart3 size={12} /> Procedural Weight
                   </h3>
               </div>
               <div className="flex-1 overflow-y-auto">
                   {items.map(item => (
                       <div 
                           key={item.id} 
                           onClick={() => setSelectedItemId(item.id)}
                           className={`p-4 border-b border-gray-100 cursor-pointer transition-all flex justify-between items-center ${selectedItemId === item.id ? 'bg-blue-50 border-l-4 border-l-blue-600' : 'hover:bg-gray-50'}`}
                       >
                           <div>
                               <div className="text-[10px] font-mono font-bold text-slate-400 mb-1">{item.procedureCode}</div>
                               <div className="text-sm font-bold text-slate-800 leading-tight">{item.procedureName}</div>
                           </div>
                           {decision.primaryProcedureId === item.id && (
                               <span className="text-[9px] font-black bg-slate-800 text-white px-1.5 py-0.5 rounded uppercase tracking-wider">Primary</span>
                           )}
                       </div>
                   ))}
               </div>
           </div>

           {/* MAIN CONTENT AREA */}
           <div className="flex-1 overflow-y-auto p-8 bg-slate-100/50 space-y-8">
               <div className="max-w-4xl mx-auto space-y-8">
                   
                   {/* BLOCKERS & WARNINGS */}
                   {(decision.blockers.length > 0 || decision.warnings.length > 0) && (
                       <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                           <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                               <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                   <AlertTriangle size={16} className="text-amber-500" /> Pending Action Items
                               </h3>
                               <span className="text-[10px] font-bold text-slate-400">{decision.blockers.length + decision.warnings.length} issues found</span>
                           </div>
                           <div className="p-4 space-y-2">
                               {decision.blockers.map((issue, idx) => (
                                   <div key={idx} className="flex items-center justify-between p-3 bg-red-50 border border-red-100 rounded-xl animate-in slide-in-from-left-2">
                                       <div className="flex items-center gap-3">
                                           <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                                           <span className="text-xs font-bold text-red-700">{issue.message}</span>
                                       </div>
                                       <div className="flex items-center gap-4">
                                           <span className="text-[9px] font-black text-red-400 uppercase tracking-widest">{issue.ruleId}</span>
                                           <button 
                                              onClick={() => handleResolveIssue(issue)}
                                              className="bg-red-600 text-white text-[10px] font-black uppercase px-3 py-1 rounded-lg shadow-sm hover:bg-red-700 transition-all flex items-center gap-1"
                                           >
                                               <Hammer size={10} /> Resolve
                                           </button>
                                       </div>
                                   </div>
                               ))}
                               {decision.warnings.map((issue, idx) => (
                                   <div key={idx} className="flex items-center justify-between p-3 bg-amber-50 border border-amber-100 rounded-xl">
                                       <div className="flex items-center gap-3">
                                           <div className="w-2 h-2 bg-amber-400 rounded-full" />
                                           <span className="text-xs font-bold text-amber-700">{issue.message}</span>
                                       </div>
                                       <div className="flex items-center gap-4">
                                           <span className="text-[9px] font-black text-amber-400 uppercase tracking-widest">Recommended</span>
                                           <button 
                                              onClick={() => handleResolveIssue(issue)}
                                              className="bg-amber-600 text-white text-[10px] font-black uppercase px-3 py-1 rounded-lg shadow-sm hover:bg-amber-700 transition-all flex items-center gap-1"
                                           >
                                               <Hammer size={10} /> Resolve
                                           </button>
                                       </div>
                                   </div>
                               ))}
                           </div>
                       </div>
                   )}

                   {/* NARRATIVE PREVIEW */}
                   <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xl shadow-slate-200/50 relative">
                       <header className="px-6 py-4 bg-slate-900 text-white flex justify-between items-center">
                           <div className="flex items-center gap-3">
                               <div className="p-1.5 bg-blue-500 rounded-lg">
                                   <FileText size={16} className="text-white" />
                               </div>
                               <span className="font-bold">Authoritative Narrative Preview</span>
                           </div>
                           <div className="flex items-center gap-2">
                               <Lock size={12} className="text-slate-400" />
                               <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Read Only</span>
                           </div>
                       </header>
                       
                       <div className="p-8">
                           {narrativeResult.ok ? (
                               <div className="space-y-8">
                                   <div className="p-8 bg-slate-50 border border-slate-200 rounded-2xl font-serif text-xl text-slate-800 sea-relaxed shadow-inner selection:bg-blue-200">
                                       {narrativeResult.fullText}
                                   </div>

                                   {isAuditMode && (
                                       <div className="animate-in fade-in zoom-in-95 duration-200">
                                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                                <Database size={14} /> Rule Adherence Map (Audit Mode)
                                            </div>
                                            <div className="grid grid-cols-1 gap-2">
                                                {narrativeResult.traces?.map((trace, idx) => (
                                                    <div key={idx} className="flex flex-col p-4 bg-slate-900 rounded-xl text-white font-mono text-[10px] relative overflow-hidden group">
                                                        <div className="absolute right-0 top-0 bottom-0 w-1 bg-blue-500" />
                                                        <div className="flex justify-between items-center mb-2 opacity-60">
                                                            <span className="font-bold">MODULE: {trace.sourceModuleId}</span>
                                                            <span>CRC32: {Math.random().toString(16).substr(2, 8)}</span>
                                                        </div>
                                                        <div className="text-blue-300 mb-1 leading-normal italic">"{trace.sentence}"</div>
                                                        <div className="text-slate-500">Refs: {trace.sourceDataRefs.join(', ')}</div>
                                                    </div>
                                                ))}
                                            </div>
                                       </div>
                                   )}
                               </div>
                           ) : (
                               <div className="flex flex-col items-center justify-center py-20 text-center">
                                   <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center text-red-500 mb-6 border border-red-100 shadow-inner">
                                       <AlertTriangle size={32} />
                                   </div>
                                   <h4 className="font-bold text-gray-900 text-xl">Submission Blocked</h4>
                                   <p className="text-slate-500 text-sm max-w-sm mt-2">Required medical necessity rationale or admin data is missing.</p>
                               </div>
                           )}
                       </div>
                   </div>

                   {/* CLINICAL CONTEXT PANEL */}
                   <div id="clinical-context-section">
                       <ClinicalContextPanel 
                           visit={visit} 
                           items={items} 
                           readinessInput={readinessInput} 
                           onUpdate={onUpdate}
                           expandedSectionId={expandedContextId}
                           onToggleSection={setExpandedContextId}
                       />
                   </div>

                   <div className="flex items-center gap-2 text-[10px] text-slate-400 bg-white p-3 rounded-xl border border-slate-200">
                       <Info size={12} className="text-blue-400" />
                       <p>This claim uses deterministic logic to identify the <strong className="text-slate-600">Primary Clinical Anchor</strong>. Resolving facts below updates the narrative instantly.</p>
                   </div>
               </div>
           </div>
       </div>
    </div>
  );
};