import React, { useState, useMemo, useEffect, useRef } from 'react';
import * as ReactRouterDOM from 'react-router-dom';
import { 
  ClaimCompilerInput, PayerTier, ClaimAcceptanceDecision, AcceptanceIssue, ClinicalSectionId 
} from '../types';
import { 
    AlertTriangle, FileText, ArrowLeft, ShieldCheck, Info, Check, 
    Lock, Gavel, Database, Hammer, CheckCircle2, ChevronRight, Fingerprint,
    Upload, Calendar, User, Stethoscope, ChevronDown
} from 'lucide-react';
import { 
  getClaimCompilerInputForVisit, updateVisit, 
  updateProcedureDocumentationFlags, markProcedureCompleted,
  updateProviderNpi
} from '../services/treatmentPlans';
import { generateClaimNarrative } from '../domain/NarrativeEngine';
import { evaluateClaimAcceptance, PAYER_PROFILES, ISSUE_TO_SECTION } from '../domain/AdjudicationEngine';

const { useParams, useNavigate } = ReactRouterDOM;

export const ClaimCompilerPage: React.FC = () => {
  const { visitId } = useParams<{ visitId: string }>();
  const navigate = useNavigate();
  const [payerTier, setPayerTier] = useState<PayerTier>('GENERIC');
  const [isAuditMode, setIsAuditMode] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [expandedTraceIdx, setExpandedTraceIdx] = useState<number | null>(null);

  // Authoritative Input Build
  const input = useMemo(() => {
      if (!visitId) return null;
      return getClaimCompilerInputForVisit(visitId);
  }, [visitId, refreshKey, payerTier]);

  // Deterministic Narrative Generation
  const narrativeResult = useMemo(() => {
      if (!input) return { ok: false, fullText: '', traces: [] };
      // Map compiler input to the legacy readiness input for the narrative engine
      const mappedReadiness: any = {
          serviceDate: input.visit.serviceDate,
          provider: input.provider,
          procedures: input.procedures,
          evidence: [], // handled by flags inside the engine usually
          risksAndConsentComplete: input.visitFacts.consentObtained
      };
      return generateClaimNarrative(mappedReadiness);
  }, [input]);

  // Acceptance Gate Decision
  const decision: ClaimAcceptanceDecision = useMemo(() => {
      if (!input) return { allowed: false, confidenceScore: 0, blockers: [], warnings: [] };
      return evaluateClaimAcceptance(input, payerTier, narrativeResult.traces || []);
  }, [input, payerTier, narrativeResult]);

  const onUpdate = () => setRefreshKey(prev => prev + 1);

  if (!input) return <div className="p-12 text-center text-slate-500">Visit data resolution failed. Check Visit ID.</div>;

  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-hidden font-sans">
      {/* 1. ACCEPTANCE GATE / HEADER */}
      <header className="bg-white border-b border-slate-200 px-8 py-6 shrink-0 shadow-sm z-30">
          <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-4">
                  <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors"><ArrowLeft size={22} /></button>
                  <div>
                      <h1 className="text-2xl font-black text-slate-900 tracking-tight">Claim Compiler</h1>
                      <div className="flex items-center gap-2 text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">
                          Universal Flow <ChevronRight size={12}/> {PAYER_PROFILES[payerTier].label}
                      </div>
                  </div>
              </div>

              <div className="flex items-center gap-8">
                  <div className="flex flex-col items-end">
                      <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">First-Pass Assurance</div>
                      <div className="flex items-center gap-3">
                          <div className="w-40 h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200 shadow-inner">
                              <div 
                                className={`h-full transition-all duration-700 ${decision.confidenceScore >= 95 ? 'bg-green-500' : decision.confidenceScore >= 85 ? 'bg-blue-500' : 'bg-amber-500'}`}
                                style={{ width: `${decision.confidenceScore}%` }}
                              />
                          </div>
                          <span className={`text-2xl font-black ${decision.confidenceScore >= 95 ? 'text-green-600' : 'text-slate-800'}`}>{decision.confidenceScore}%</span>
                      </div>
                  </div>

                  <button 
                      disabled={!decision.allowed}
                      className="h-12 px-10 bg-slate-900 text-white font-black rounded-2xl text-sm hover:bg-black shadow-xl shadow-slate-200 disabled:opacity-30 disabled:shadow-none transition-all flex items-center gap-2 active:scale-95"
                  >
                      <ShieldCheck size={20} /> Transmit to Clearinghouse
                  </button>
              </div>
          </div>

          <div className="flex justify-between items-center bg-slate-50 rounded-2xl p-3 border border-slate-200/60">
               <div className="flex items-center gap-3 px-3">
                   <Gavel size={16} className="text-slate-400" />
                   <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Payer Profile:</span>
                   <div className="flex bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
                        {(['GENERIC', 'CONSERVATIVE', 'STRICT'] as PayerTier[]).map(t => (
                            <button 
                                key={t}
                                onClick={() => setPayerTier(t)}
                                className={`px-5 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${payerTier === t ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                {t}
                            </button>
                        ))}
                   </div>
               </div>
               <button 
                   onClick={() => setIsAuditMode(!isAuditMode)}
                   className={`flex items-center gap-2 px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${isAuditMode ? 'bg-slate-800 text-white' : 'bg-white text-slate-500 border border-slate-200 shadow-sm'}`}
               >
                   <Fingerprint size={16} /> Audit Metadata {isAuditMode ? 'ON' : 'OFF'}
               </button>
          </div>
      </header>

      <div className="flex-1 overflow-hidden flex">
          {/* 2. RESOLVER RAIL (LEFT) */}
          <div className="w-[480px] bg-white border-r border-slate-200 flex flex-col shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-20">
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center shrink-0">
                  <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                      <AlertTriangle size={16} className="text-amber-500" /> Fact Resolution
                  </h3>
                  <div className="flex gap-2">
                    <span className="text-[10px] font-black bg-red-100 text-red-600 px-2 py-1 rounded-lg">{decision.blockers.length} Blockers</span>
                    <span className="text-[10px] font-black bg-slate-100 text-slate-500 px-2 py-1 rounded-lg">{decision.warnings.length} Warns</span>
                  </div>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                  {decision.blockers.length === 0 && (
                      <div className="flex flex-col items-center justify-center py-20 text-center animate-in fade-in duration-700">
                          <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center text-green-500 mb-4 border border-green-100 shadow-inner">
                              <Check size={32} strokeWidth={3} />
                          </div>
                          <h4 className="font-bold text-slate-900">Adjudication Pass</h4>
                          <p className="text-slate-400 text-xs mt-1">Schema fully satisfied for this payer tier.</p>
                      </div>
                  )}

                  {decision.blockers.map((issue, idx) => (
                      <div key={idx} id={`issue-${issue.code}`} className="bg-white border border-red-100 rounded-2xl overflow-hidden shadow-sm animate-in slide-in-from-left-2 duration-300 ring-offset-4 focus-within:ring-2 ring-blue-500">
                          <div className="px-5 py-3 bg-red-50/50 flex justify-between items-center border-b border-red-100/50">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                                <span className="text-[10px] font-black text-red-700 uppercase tracking-widest">{issue.message}</span>
                              </div>
                              <span className="text-[9px] font-mono text-red-400 font-bold uppercase">{issue.ruleId}</span>
                          </div>
                          <div className="p-5">
                              <FactResolver issue={issue} visitId={visitId!} onUpdate={onUpdate} input={input} />
                          </div>
                      </div>
                  ))}

                  {decision.warnings.map((issue, idx) => (
                      <div key={`w-${idx}`} className="bg-white border border-amber-100 rounded-2xl overflow-hidden shadow-sm opacity-80 hover:opacity-100 transition-opacity">
                          <div className="px-5 py-3 bg-amber-50/50 flex justify-between items-center">
                              <span className="text-[10px] font-black text-amber-700 uppercase tracking-widest">{issue.message}</span>
                              <span className="text-[9px] font-bold text-amber-400 uppercase">Recommended</span>
                          </div>
                          <div className="p-4">
                              <FactResolver issue={issue} visitId={visitId!} onUpdate={onUpdate} input={input} />
                          </div>
                      </div>
                  ))}
              </div>
          </div>

          {/* 3. SIMULATOR RAIL (RIGHT) */}
          <div className="flex-1 bg-slate-100/50 overflow-y-auto p-12 flex justify-center custom-scrollbar">
              <div className="w-full max-w-4xl space-y-10">
                  <div className="bg-white rounded-[32px] border border-slate-200 shadow-2xl overflow-hidden relative">
                      <header className="px-10 py-6 bg-slate-900 text-white flex justify-between items-center shrink-0">
                          <div className="flex items-center gap-4">
                              <div className="p-2.5 bg-blue-600 rounded-2xl">
                                  <FileText size={22} className="text-white" />
                              </div>
                              <div>
                                  <span className="font-black text-xs uppercase tracking-widest opacity-60">Compiled Submission Narrative</span>
                                  <div className="text-sm font-bold mt-0.5">Authoritative Draft • DETERMINISTIC</div>
                              </div>
                          </div>
                          <div className="flex items-center gap-2 opacity-40">
                              <Lock size={14} />
                              <span className="text-[10px] font-black uppercase tracking-widest">Locked Output</span>
                          </div>
                      </header>
                      
                      <div className="p-16">
                          {narrativeResult.ok ? (
                              <div className="space-y-12 animate-in fade-in duration-500">
                                  <div className="p-12 bg-slate-50/80 border border-slate-200 rounded-[28px] font-serif text-3xl text-slate-800 leading-relaxed shadow-inner selection:bg-blue-100">
                                      {narrativeResult.fullText}
                                  </div>
                                  
                                  <div className="border-t border-slate-100 pt-8">
                                      <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                                          <CheckCircle2 size={16} className="text-green-500" /> Rule Traceability Map
                                      </h4>
                                      <div className="grid grid-cols-1 gap-4">
                                          {narrativeResult.traces?.map((trace, idx) => (
                                              <div 
                                                key={idx} 
                                                className={`p-5 bg-white border rounded-2xl transition-all cursor-pointer group ${expandedTraceIdx === idx ? 'border-blue-500 shadow-md ring-1 ring-blue-50' : 'border-slate-200 hover:border-slate-300'}`}
                                                onClick={() => setExpandedTraceIdx(expandedTraceIdx === idx ? null : idx)}
                                              >
                                                  <div className="flex justify-between items-center mb-1">
                                                    <span className="text-[11px] font-black text-slate-800 uppercase tracking-tight">{trace.sourceModuleId}</span>
                                                    <ChevronDown size={14} className={`text-slate-300 transition-transform ${expandedTraceIdx === idx ? 'rotate-180' : ''}`} />
                                                  </div>
                                                  <p className="text-xs text-slate-600 italic">"{trace.sentence}"</p>
                                                  {expandedTraceIdx === idx && (
                                                    <div className="mt-4 pt-4 border-t border-slate-50 animate-in fade-in slide-in-from-top-1">
                                                        <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                                                            <Database size={10} /> Dependency Graph:
                                                        </div>
                                                        <div className="flex flex-wrap gap-2 mt-2">
                                                            {trace.sourceDataRefs.map(ref => (
                                                                <span key={ref} className="bg-slate-50 text-slate-500 px-2 py-0.5 rounded border border-slate-100 font-mono text-[9px] uppercase">{ref}</span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                  )}
                                              </div>
                                          ))}
                                      </div>
                                  </div>
                              </div>
                          ) : (
                              <div className="flex flex-col items-center justify-center py-20 text-center animate-in zoom-in-95 duration-300">
                                  <div className="w-24 h-24 bg-red-50 rounded-[32px] flex items-center justify-center text-red-500 mb-8 border border-red-100 shadow-inner">
                                      <AlertTriangle size={48} />
                                  </div>
                                  <h4 className="font-black text-slate-900 text-xl uppercase tracking-tight">Compilation Halted</h4>
                                  <p className="text-slate-500 text-sm max-w-sm mt-3 leading-relaxed">
                                      Payer schema requirements not met. Please resolve the <strong>blockers</strong> in the resolution pane to proceed.
                                  </p>
                              </div>
                          )}
                      </div>
                  </div>

                  <div className="flex items-center gap-4 text-[11px] text-slate-400 bg-white p-5 rounded-[24px] border border-slate-200 shadow-sm max-w-2xl mx-auto">
                      <span className="text-blue-500 shrink-0"><Info size={18} /></span>
                      <p className="leading-relaxed">This compiler ensures <strong>determinism</strong>. Every sentence in the submission narrative is traceably linked to schema facts. No generative AI is used for final clinical output.</p>
                  </div>
              </div>
          </div>
      </div>
    </div>
  );
};

// --- SCHEMA-DIRECTED RESOLVER ---

const FactResolver: React.FC<{ issue: AcceptanceIssue, visitId: string, onUpdate: () => void, input: ClaimCompilerInput }> = ({ issue, visitId, onUpdate, input }) => {
    
    const handleVisitUpdate = (patch: any) => {
        updateVisit(visitId, patch);
        onUpdate();
    };

    const handleProcFlagUpdate = (procId: string, flag: string, val: boolean) => {
        updateProcedureDocumentationFlags(procId, { [flag]: val });
        onUpdate();
    };

    const handleMarkComplete = (procId: string) => {
        markProcedureCompleted(procId, new Date().toISOString());
        onUpdate();
    };

    const labelClass = "block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1";
    const inputClass = "w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all";

    const renderContent = () => {
        switch (issue.code) {
            case 'ADMIN_NPI':
                return (
                    <div className="space-y-3">
                        <label className={labelClass}>Provider NPI (10-digits)</label>
                        <input 
                            type="text" maxLength={10} placeholder="e.g. 1234567890"
                            className={`${inputClass} font-mono`}
                            defaultValue={input.provider.npi === '0000000000' ? '' : input.provider.npi}
                            onBlur={(e) => { 
                                const val = e.target.value.trim();
                                if (/^\d{10}$/.test(val)) {
                                    updateProviderNpi(input.provider.id, val);
                                    onUpdate();
                                }
                            }}
                        />
                    </div>
                );
            case 'VISIT_CC':
                return (
                    <div className="space-y-3">
                        <label className={labelClass}>Chief Complaint</label>
                        <input 
                            type="text" placeholder="e.g. Broken tooth upper left"
                            className={inputClass}
                            defaultValue={input.visitFacts.chiefComplaint}
                            onBlur={(e) => handleVisitUpdate({ chiefComplaint: e.target.value })}
                        />
                    </div>
                );
            case 'VISIT_HPI':
                return (
                    <div className="space-y-3">
                        <label className={labelClass}>HPI (Onset, Symptoms, Location)</label>
                        <textarea 
                            placeholder="e.g. Pain started 2 days ago after eating. Sharp pain to cold."
                            className={`${inputClass} h-24 resize-none`}
                            defaultValue={input.visitFacts.hpi}
                            onBlur={(e) => handleVisitUpdate({ hpi: e.target.value })}
                        />
                    </div>
                );
            case 'NAV_NECESSITY':
                return (
                    <div className="space-y-3">
                        <label className={labelClass}>Clinical / Radiographic Findings</label>
                        <textarea 
                            placeholder="e.g. Periapical radiolucency noted on distal of #14. Fracture involving pulp."
                            className={`${inputClass} h-24 resize-none`}
                            defaultValue={input.visitFacts.findings}
                            onBlur={(e) => handleVisitUpdate({ radiographicFindings: e.target.value })}
                        />
                    </div>
                );
            case 'PROC_STATUS': {
                const targetProcId = issue.procedureId;
                const targetProc = input.procedures.find(p => p.id === targetProcId);
                
                if (!targetProcId || !targetProc) {
                    return (
                        <div className="space-y-2">
                            <div className="text-[10px] text-amber-600 font-bold mb-2">⚠ Untargeted Completion Blocker</div>
                            {input.procedures.filter(p => !p.isCompleted).map(p => (
                                <button 
                                    key={p.id}
                                    onClick={() => handleMarkComplete(p.id)}
                                    className="w-full py-3 bg-green-600 text-white text-[10px] font-black rounded-xl hover:bg-green-700 transition-all uppercase tracking-widest flex items-center justify-center gap-2 shadow-sm"
                                >
                                    <span className="shrink-0"><CheckCircle2 size={14} /></span> Confirm {p.cdtCode} Completed
                                </button>
                            ))}
                        </div>
                    );
                }

                return (
                    <div className="space-y-2">
                        <div className="text-[10px] text-slate-500 font-bold mb-1">Target: {targetProc.cdtCode} {targetProc.tooth ? `(#${targetProc.tooth})` : ''}</div>
                        <button 
                            onClick={() => handleMarkComplete(targetProcId)}
                            className="w-full py-3 bg-green-600 text-white text-[10px] font-black rounded-xl hover:bg-green-700 transition-all uppercase tracking-widest flex items-center justify-center gap-2 shadow-sm"
                        >
                            <span className="shrink-0"><CheckCircle2 size={14} /></span> Confirm Completion
                        </button>
                    </div>
                );
            }
            default:
                if (issue.code.startsWith('EVIDENCE_')) {
                    const type = issue.field || (issue.code.includes('XRAY') ? 'hasXray' : 'hasPhoto');
                    const label = issue.code.includes('XRAY') ? 'Pre-Op X-Ray Captured' : 'Intraoral Photo Captured';
                    const targetProcId = issue.procedureId;
                    const targetProc = input.procedures.find(p => p.id === targetProcId);

                    if (!targetProcId || !targetProc) {
                        return <div className="text-[10px] text-amber-600 font-bold italic">⚠ Blocker missing procedure targeting. Logic check required.</div>;
                    }

                    return (
                        <div className="space-y-3">
                            <div className="text-[10px] text-slate-500 font-bold mb-1">Target: {targetProc.cdtCode} {targetProc.tooth ? `(#${targetProc.tooth})` : ''}</div>
                            <label className="flex items-center gap-3 cursor-pointer group bg-slate-50 p-4 rounded-xl border border-slate-200 hover:border-blue-300 transition-all">
                                <input 
                                    type="checkbox" 
                                    className="w-5 h-5 rounded-lg text-blue-600 focus:ring-blue-500" 
                                    checked={!!(targetProc.documentationFlags as any)[type]}
                                    onChange={(e) => {
                                        handleProcFlagUpdate(targetProcId, type, e.target.checked);
                                    }}
                                />
                                <div className="flex flex-col">
                                    <span className="text-xs font-bold text-slate-800 uppercase tracking-tight">{label}</span>
                                    <span className="text-[10px] text-slate-400">Marking this satisfies payer {issue.ruleId} requirement.</span>
                                </div>
                            </label>
                        </div>
                    );
                }
                return <div className="text-[10px] text-slate-400 italic">No automated resolution handler for this rule.</div>;
        }
    };

    return (
        <div className="space-y-6">
            {renderContent()}
        </div>
    );
};