
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useChairside } from '../../context/ChairsideContext';
import { 
  ArrowLeft, Save, ShieldCheck, Activity, Clock, Lock, CheckSquare, ArrowRight, FileCheck, Layout, ChevronDown, ChevronRight, FileText, AlertTriangle, Plus, Filter, Search, Info, Check
} from 'lucide-react';

import { SoapSection, AssignedRisk, RiskLibraryItem, SoapSectionType, ToothNumber, ToothRecord } from '../../domain/dentalTypes';
import { SoapSectionBlock } from './SoapSectionBlock';
import { RiskLibraryPanel } from './RiskLibraryPanel';
import { EvidencePanel } from './EvidencePanel';
import { PreflightPanel } from './PreflightPanel';
import { ClinicalSubmissionPreview } from './ClinicalSubmissionPreview';
import { Visit, TreatmentPlanItem } from '../../types';
import { TruthAssertionsBundle, AssertionSlot, createManualAssertion } from '../../domain/TruthAssertions';
import { computeDocumentationReadiness, DocumentationReadinessResult, ReadinessInput, ReadinessEvidence, ReadinessProcedure, DISCLAIMER_TEXT } from '../../domain/ClaimReadinessEngine';

export interface ClinicalNoteEditorProps {
  soapSections: SoapSection[];
  onUpdateSoapSection: (id: string, content: string) => void;
  assignedRisks: AssignedRisk[];
  onAssignRisk: (risk: RiskLibraryItem) => void;
  onRemoveRisk: (id: string) => void;
  onToggleRiskExpand: (id: string) => void;
  onUpdateConsent: (id: string, updates: Partial<AssignedRisk>) => void;
  onReorderRisks: (oldIndex: number, newIndex: number) => void;
  suggestedRiskIds: string[];
  
  isLocked: boolean;
  contextLabel: string;
  contextSubLabel?: React.ReactNode;
  
  onSave?: () => void;
  onSign?: () => void;
  lastSavedAt?: string;
  
  viewMode: 'drawer' | 'page';
  showRiskPanel?: boolean;
  onToggleRiskPanel?: () => void;
  
  undoSnapshotProvider?: (sectionId: string) => { sourceLabel: string } | undefined;
  onUndo?: (sectionId: string) => void;
  onDismissUndo?: (sectionId: string) => void;
  onGenerateAiDraft?: (sectionType: SoapSectionType) => Promise<void>;
  onInsertChartFindings?: (sectionType: SoapSectionType) => void;
  
  currentTenantId: string;

  hpi: string;
  onHpiChange: (val: string) => void;
  radiographicFindings: string;
  onRadiographicFindingsChange: (val: string) => void;
  chiefComplaint: string;
  onChiefComplaintChange: (val: string) => void;
  
  // NOTE: completeness prop is deprecated in favor of internal engine calculation
  completeness: any | null; 
  relevantProcedures?: TreatmentPlanItem[]; 
  recommendedRiskCategories?: string[]; 
  
  truthAssertions?: TruthAssertionsBundle;
  onVerifySecondary?: () => void;
}

export const ClinicalNoteEditor: React.FC<ClinicalNoteEditorProps> = (props) => {
  const {
    soapSections,
    assignedRisks, onAssignRisk, 
    isLocked,
    onSave, onSign, lastSavedAt,
    viewMode,
    relevantProcedures = [],
    recommendedRiskCategories,
    truthAssertions,
    currentTenantId,
  } = props;

  const { setTruthAssertions, toggleFactSection, setCurrentView, factSectionStates, addManualAssertion } = useChairside();
  
  // Refs for scrolling
  const leftRailRef = useRef<HTMLDivElement>(null);
  
  // UI State
  const [activeRightTab, setActiveRightTab] = useState<'EVIDENCE' | 'RISKS' | 'FINDINGS' | 'PREFLIGHT'>('EVIDENCE');
  const [scopeProcedureId, setScopeProcedureId] = useState<string | 'ALL'>('ALL');
  
  // Use "Readiness" not "Approval"
  const [readiness, setReadiness] = useState<DocumentationReadinessResult>({ percent: 0, items: [], status: 'INCOMPLETE' });

  // --- Readiness Engine Integration ---
  useEffect(() => {
      // Map domain models to engine input types
      const procedures: ReadinessProcedure[] = relevantProcedures.map(p => ({
          id: p.id,
          cdtCode: p.procedureCode,
          label: p.procedureName,
          tooth: p.selectedTeeth?.join(','),
          surfaces: p.surfaces,
          quadrant: p.selectedQuadrants?.[0], // Map first quadrant if present
          isCompleted: p.procedureStatus === 'COMPLETED'
      }));

      const diagnoses = relevantProcedures.flatMap(p => 
          (p.diagnosisCodes || []).map(code => ({ procedureId: p.id, icd10: code }))
      );

      // Mock evidence mapping (In real app, map from p.documentation)
      const evidence: ReadinessEvidence[] = [];
      relevantProcedures.forEach(p => {
          if (p.documentation?.hasXray) evidence.push({ procedureId: p.id, type: 'pre_op_xray', attached: true });
          if (p.documentation?.hasPerioChart) evidence.push({ procedureId: p.id, type: 'perio_charting', attached: true });
          if (p.documentation?.hasPhoto) evidence.push({ procedureId: p.id, type: 'intraoral_photo', attached: true });
          if (p.documentation?.hasFmxWithin36Months) evidence.push({ procedureId: p.id, type: 'fmX_pano_recent', attached: true });
      });

      const input: ReadinessInput = {
          truth: truthAssertions,
          procedures,
          diagnoses,
          evidence,
          risksAndConsentComplete: assignedRisks.some(r => r.consentCapturedAt), // simplified check
          // New admin checks (mocked as undefined to trigger blockers for demo)
          patient: undefined,
          provider: undefined,
          serviceDate: undefined
      };

      const result = computeDocumentationReadiness(input);
      setReadiness(result);

  }, [relevantProcedures, assignedRisks, truthAssertions]);


  // V2.0 Inline Facts Toggle Handler
  const handleToggleAssertion = (id: string) => {
      if (!truthAssertions || isLocked) return;
      
      const updatedAssertions = truthAssertions.assertions.map(a => 
          a.id === id ? { ...a, checked: !a.checked } : a
      );
      
      setTruthAssertions({
          ...truthAssertions,
          assertions: updatedAssertions
      });
  };

  // --- Navigation & Sync Logic ---
  
  const scrollToSlot = (section: string, slot: string) => {
      const sectionObj = soapSections.find(s => s.type === section);
      if (sectionObj && !factSectionStates[sectionObj.id]) {
          toggleFactSection(sectionObj.id);
      }

      setTimeout(() => {
          const slotId = `slot-${section}-${slot}`;
          const el = document.getElementById(slotId);
          if (el) {
              el.scrollIntoView({ behavior: 'smooth', block: 'center' });
              el.classList.add('bg-blue-100/50', 'ring-2', 'ring-blue-400');
              setTimeout(() => el.classList.remove('bg-blue-100/50', 'ring-2', 'ring-blue-400'), 1500);
          } else {
              const secId = `section-${section}`;
              const secEl = document.getElementById(secId);
              if (secEl) secEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
      }, 100);
  };

  const handleFixNext = () => {
      const next = readiness.fixNext;
      if (!next) return;

      switch (next.kind) {
          case 'slot':
              scrollToSlot(next.section, next.slot);
              break;
          case 'evidence':
              setActiveRightTab('EVIDENCE');
              break;
          case 'icd10':
              alert(`Action: Add ICD-10 for ${next.label}`); // Stub
              break;
          case 'procedure_status':
              alert(`Action: Confirm procedure completion`); 
              break;
          case 'consent':
              scrollToSlot('PLAN', 'RISK');
              break;
          case 'admin':
          case 'procedure_detail':
              setActiveRightTab('PREFLIGHT');
              break;
      }
  };

  // Filter assertions based on scope
  const filteredAssertions = useMemo(() => {
      if (!truthAssertions) return [];
      if (scopeProcedureId === 'ALL') return truthAssertions.assertions;
      
      const targetProc = relevantProcedures.find(p => p.id === scopeProcedureId);
      const targetCode = targetProc?.procedureCode || 'XXX';

      return truthAssertions.assertions.filter(a => {
          if (a.procedureId === scopeProcedureId) return true;
          if (a.code === targetCode) return true;
          return false;
      });
  }, [truthAssertions, scopeProcedureId, relevantProcedures]);

  const handleAttachEvidence = (type: string, procedureId?: string) => {
      alert(`Attaching ${type} for procedure ${procedureId}... (Mock)`);
  };

  const displayedSections = soapSections.filter(s => {
      return ['SUBJECTIVE', 'OBJECTIVE', 'ASSESSMENT', 'PLAN', 'TREATMENT_PERFORMED'].includes(s.type);
  });

  const activeRiskIds = useMemo(() => assignedRisks.map(r => r.riskLibraryItemId), [assignedRisks]);

  const handleAddFinding = (text: string, section: SoapSectionType, slot: AssertionSlot) => {
      addManualAssertion(section as any, slot, text);
  };

  return (
    <div className="flex flex-col h-full bg-slate-100 overflow-hidden font-sans text-slate-900">
        
        {/* TOP BAR: Documentation Studio Header */}
        <header className="bg-white border-b border-slate-200 px-4 py-2.5 flex items-center justify-between shadow-sm shrink-0 z-40 h-[60px]">
            <div className="flex items-center gap-4">
                {viewMode === 'page' && (
                    <button onClick={() => setCurrentView('DASHBOARD')} className="p-1.5 -ml-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors"><ArrowLeft size={18} /></button>
                )}
                <div>
                    <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                        Documentation Studio 
                        {isLocked && <span className="bg-slate-100 text-slate-500 text-[10px] px-2 py-0.5 rounded border border-slate-200 uppercase tracking-wide">Locked</span>}
                    </h2>
                    {/* Readiness Bar */}
                    <div className="flex items-center gap-2 mt-0.5 group relative cursor-help">
                        <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div 
                                className={`h-full transition-all duration-500 ease-out ${readiness.percent === 100 ? 'bg-green-500' : readiness.percent > 75 ? 'bg-blue-500' : 'bg-amber-500'}`} 
                                style={{ width: `${readiness.percent}%` }} 
                            />
                        </div>
                        <span className={`text-[10px] font-bold ${readiness.percent === 100 ? 'text-green-600' : 'text-slate-500'}`}>
                            {readiness.percent}% Doc. Readiness
                        </span>
                        <span className="text-[9px] text-slate-400">Guidance only. Requirements vary by payer.</span>
                        
                        {/* Compliance Tooltip */}
                        <div className="absolute top-full left-0 mt-2 w-64 p-3 bg-slate-800 text-white text-[10px] rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 leading-relaxed">
                            <div className="flex items-center gap-1.5 mb-1 text-slate-300 font-bold uppercase tracking-wider">
                                <Info size={12} /> Compliance Notice
                            </div>
                            {DISCLAIMER_TEXT}
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-3">
                {!isLocked && readiness.fixNext && (
                    <button 
                        onClick={handleFixNext}
                        className="h-9 px-4 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 shadow-sm flex items-center gap-2 transition-all hover:scale-[1.02] active:scale-95 animate-pulse"
                    >
                        Resolve: {readiness.fixNext.label} <ArrowRight size={14} />
                    </button>
                )}
                {readiness.percent === 100 && !isLocked && (
                    <div className="flex items-center gap-1.5 text-green-600 bg-green-50 px-3 py-1.5 rounded-lg border border-green-100 shadow-sm">
                        <Check size={14} strokeWidth={3} />
                        <span className="text-xs font-bold">Docs Ready</span>
                    </div>
                )}
                
                <div className="h-6 w-px bg-slate-200 mx-2"></div>

                {!isLocked && onSave && (
                    <button onClick={onSave} className="h-9 px-3 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-lg shadow-sm transition-all">
                        Save Draft
                    </button>
                )}
                {!isLocked && onSign && (
                    <button onClick={onSign} className="h-9 px-4 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-2 transition-all">
                        <Save size={14} /> Sign Note
                    </button>
                )}
            </div>
        </header>

        {/* 3-COLUMN LAYOUT */}
        <div className="flex-1 flex overflow-hidden">
            
            {/* LEFT RAIL: Claim Structure (Truth Builder) */}
            <div className="w-[380px] bg-slate-50/50 border-r border-slate-200 flex flex-col shrink-0 z-30 shadow-[4px_0_16px_rgba(0,0,0,0.02)]">
                {/* Scope Selector */}
                <div className="p-3 border-b border-slate-200 bg-white sticky top-0 z-20 flex flex-col gap-2 shrink-0">
                    <div className="flex justify-between items-center">
                        <span className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <CheckSquare size={14} className="text-blue-500" /> Structure
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium bg-slate-100 px-2 py-0.5 rounded-full">
                            {filteredAssertions.filter(a => a.checked).length} Facts
                        </span>
                    </div>
                    {/* Procedure Scope Dropdown */}
                    <div className="relative">
                        <select 
                            value={scopeProcedureId}
                            onChange={(e) => setScopeProcedureId(e.target.value)}
                            className="w-full text-xs p-2 pr-8 bg-slate-50 border border-slate-200 rounded-md font-medium text-slate-700 appearance-none outline-none focus:ring-2 focus:ring-blue-200"
                        >
                            <option value="ALL">All Procedures</option>
                            {relevantProcedures.map(p => (
                                <option key={p.id} value={p.id}>
                                    {p.procedureCode} - {p.procedureName}
                                </option>
                            ))}
                        </select>
                        <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                </div>
                
                <div ref={leftRailRef} className="flex-1 overflow-y-auto p-3 custom-scrollbar">
                    {displayedSections.map(section => {
                        const sectionAssertions = filteredAssertions.filter(a => a.section === section.type);
                        return (
                            <SoapSectionBlock 
                                key={section.id} 
                                section={section}
                                isLocked={isLocked}
                                assertions={sectionAssertions}
                                onToggleAssertion={handleToggleAssertion}
                                isFactsExpanded={true}
                                onToggleFacts={() => toggleFactSection(section.id)}
                            />
                        );
                    })}
                    
                    {/* Spacer */}
                    <div className="h-20"></div>
                </div>
            </div>

            {/* CENTER RAIL: Claim Output (Simulator) */}
            <div className="flex-1 bg-slate-100 overflow-y-auto relative flex justify-center custom-scrollbar">
                <div className="w-full max-w-[850px] py-6 px-6">
                    <ClinicalSubmissionPreview 
                        truth={truthAssertions} 
                        providerName="Dr. Smith"
                        onNavigate={scrollToSlot}
                    />
                    <div className="h-20"></div>
                </div>
            </div>

            {/* RIGHT RAIL: Evidence (Library) */}
            <div className="w-[340px] bg-white border-l border-slate-200 flex flex-col shrink-0 z-30">
                {/* Tab Header */}
                <div className="flex border-b border-slate-200 shrink-0 bg-slate-50/50">
                    <button 
                        onClick={() => setActiveRightTab('EVIDENCE')}
                        className={`flex-1 py-3 text-xs font-bold border-b-2 transition-colors ${activeRightTab === 'EVIDENCE' ? 'border-blue-600 text-blue-600 bg-white' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                    >
                        Evidence
                    </button>
                    <button 
                        onClick={() => setActiveRightTab('RISKS')}
                        className={`flex-1 py-3 text-xs font-bold border-b-2 transition-colors ${activeRightTab === 'RISKS' ? 'border-blue-600 text-blue-600 bg-white' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                    >
                        Risks
                    </button>
                    <button 
                        onClick={() => setActiveRightTab('FINDINGS')}
                        className={`flex-1 py-3 text-xs font-bold border-b-2 transition-colors ${activeRightTab === 'FINDINGS' ? 'border-blue-600 text-blue-600 bg-white' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                    >
                        Findings
                    </button>
                    <button 
                        onClick={() => setActiveRightTab('PREFLIGHT')}
                        className={`flex-1 py-3 text-xs font-bold border-b-2 transition-colors ${activeRightTab === 'PREFLIGHT' ? 'border-blue-600 text-blue-600 bg-white' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                    >
                        Preflight
                    </button>
                </div>
                
                <div className="flex-1 overflow-hidden relative">
                    {activeRightTab === 'EVIDENCE' && (
                        <EvidencePanel 
                            missingEvidence={[...readiness.items].filter(m => m.kind === 'evidence')}
                            onAttach={handleAttachEvidence}
                        />
                    )}

                    {activeRightTab === 'RISKS' && (
                        <RiskLibraryPanel 
                            assignedRiskIds={activeRiskIds}
                            onAssignRisk={onAssignRisk}
                            tenantId={currentTenantId}
                            recommendedCategories={recommendedRiskCategories}
                        />
                    )}
                    
                    {activeRightTab === 'FINDINGS' && (
                        <div className="p-4 flex flex-col gap-3 h-full overflow-y-auto">
                            <div className="text-xs text-slate-400 uppercase font-bold tracking-widest mb-1">Common Findings</div>
                            
                            {[
                                { text: 'Radiographs WNL', sec: 'OBJECTIVE', slot: 'RADIOGRAPHIC' },
                                { text: 'Generalized bone loss 2-3mm', sec: 'OBJECTIVE', slot: 'RADIOGRAPHIC' },
                                { text: 'Periapical radiolucency noted', sec: 'OBJECTIVE', slot: 'RADIOGRAPHIC' },
                                { text: 'Medical History Reviewed - No Changes', sec: 'SUBJECTIVE', slot: 'HPI' },
                                { text: 'Oral Cancer Screening Negative', sec: 'OBJECTIVE', slot: 'CLINICAL_FINDING' },
                            ].map((item, idx) => (
                                <button 
                                    key={idx}
                                    onClick={() => handleAddFinding(item.text, item.sec as any, item.slot as any)}
                                    className="text-left p-3 rounded-lg border border-slate-200 bg-white shadow-sm hover:border-blue-400 hover:shadow-md transition-all text-xs font-medium text-slate-700 flex items-center justify-between group"
                                >
                                    {item.text}
                                    <Plus size={14} className="text-slate-300 group-hover:text-blue-500" />
                                </button>
                            ))}
                            
                            <div className="mt-4 p-4 bg-slate-50 border border-dashed border-slate-300 rounded-lg text-center">
                                <p className="text-xs text-slate-400">Drag or click to add findings to the active note structure.</p>
                            </div>
                        </div>
                    )}

                    {activeRightTab === 'PREFLIGHT' && (
                        <PreflightPanel 
                            items={readiness.items}
                            onResolve={(label) => alert(`Resolve: ${label} (stub)`)}
                        />
                    )}
                </div>
            </div>

        </div>
    </div>
  );
};
