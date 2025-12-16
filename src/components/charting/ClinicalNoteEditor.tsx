
import React, { useState, useMemo } from 'react';
import { 
  ArrowLeft, Save, ShieldCheck, Activity, Clock, Lock, CheckSquare, ArrowRight, FileCheck, Layout
} from 'lucide-react';

import { SoapSection, AssignedRisk, RiskLibraryItem, SoapSectionType } from '../../domain/dentalTypes';
import { SoapSectionBlock } from './SoapSectionBlock';
import { RiskLibraryPanel } from './RiskLibraryPanel';
import { ClinicalSubmissionPreview } from './ClinicalSubmissionPreview';
import { Visit, TreatmentPlanItem } from '../../types';
import { CompletenessResult } from '../../domain/CompletenessEngine';
import { TruthAssertionsBundle, getNoteCompleteness, getNextMissingSlot } from '../../domain/TruthAssertions';
import { useChairside } from '../../context/ChairsideContext';

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
  
  completeness: CompletenessResult | null;
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

  const { setTruthAssertions, toggleFactSection, noteCompleteness, setCurrentView } = useChairside();

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

  const noteCompletenessPercent = noteCompleteness?.percent ?? 0;

  // --- Navigation Guidance Logic ---
  const handleFixNext = () => {
      const next = getNextMissingSlot(truthAssertions);
      if (next) {
          const slotId = `slot-${next.section}-${next.slot}`;
          const el = document.getElementById(slotId);
          if (el) {
              el.scrollIntoView({ behavior: 'smooth', block: 'center' });
              // Optional: flash highlight logic here
          } else {
              // Ensure section is expanded if not found?
              // The updated SoapSectionBlock defaults to expanded, but context toggle might be needed.
              // For MVP, we assume expansion or simple scroll.
          }
      }
  };

  const displayedSections = soapSections.filter(s => {
      return ['SUBJECTIVE', 'OBJECTIVE', 'ASSESSMENT', 'PLAN', 'TREATMENT_PERFORMED'].includes(s.type);
  });

  // Calculate top risk categories for context
  const activeRiskIds = useMemo(() => assignedRisks.map(r => r.riskLibraryItemId), [assignedRisks]);

  return (
    <div className="flex flex-col h-full bg-slate-100 overflow-hidden font-sans text-slate-900">
        {/* TOP BAR: Claim Readiness & Actions */}
        <div className="bg-white border-b border-slate-200 px-4 py-2.5 flex items-center justify-between shadow-sm shrink-0 z-40">
            <div className="flex items-center gap-4">
                {viewMode === 'page' && (
                    <button onClick={() => setCurrentView('DASHBOARD')} className="p-1.5 -ml-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors"><ArrowLeft size={18} /></button>
                )}
                <div>
                    <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                        Claim Studio 
                        {isLocked && <span className="bg-slate-100 text-slate-500 text-[10px] px-2 py-0.5 rounded border">LOCKED</span>}
                    </h2>
                    {/* Readiness Bar */}
                    <div className="flex items-center gap-2 mt-0.5">
                        <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div 
                                className={`h-full transition-all duration-500 ${noteCompletenessPercent === 100 ? 'bg-green-500' : 'bg-blue-500'}`} 
                                style={{ width: `${noteCompletenessPercent}%` }} 
                            />
                        </div>
                        <span className={`text-[10px] font-bold ${noteCompletenessPercent === 100 ? 'text-green-600' : 'text-slate-500'}`}>
                            {noteCompletenessPercent}% Ready
                        </span>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-3">
                {!isLocked && noteCompletenessPercent < 100 && (
                    <button 
                        onClick={handleFixNext}
                        className="h-8 px-3 bg-blue-50 text-blue-700 text-xs font-bold rounded-lg border border-blue-200 hover:bg-blue-100 flex items-center gap-1.5 transition-colors"
                    >
                        Fix Next <ArrowRight size={12} />
                    </button>
                )}
                
                <div className="h-6 w-px bg-slate-200 mx-1"></div>

                {!isLocked && onSave && (
                    <button onClick={onSave} className="h-8 px-3 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-lg shadow-sm transition-all">
                        Save Draft
                    </button>
                )}
                {!isLocked && onSign && (
                    <button onClick={onSign} className="h-8 px-4 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-2 transition-all">
                        <Save size={14} /> Sign Note
                    </button>
                )}
            </div>
        </div>

        {/* 3-COLUMN LAYOUT */}
        <div className="flex-1 flex overflow-hidden">
            
            {/* LEFT RAIL: SOAP Truth Builder */}
            <div className="w-[320px] bg-slate-50 border-r border-slate-200 flex flex-col shrink-0 z-30">
                <div className="p-3 border-b border-slate-200 bg-white/50 backdrop-blur-sm sticky top-0 z-10 flex justify-between items-center">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                        <CheckSquare size={12} /> Truth Builder
                    </span>
                </div>
                <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
                    {displayedSections.map(section => {
                        const sectionAssertions = truthAssertions?.assertions.filter(a => a.section === section.type) || [];
                        return (
                            <SoapSectionBlock 
                                key={section.id} 
                                section={section}
                                isLocked={isLocked}
                                assertions={sectionAssertions}
                                onToggleAssertion={handleToggleAssertion}
                                isFactsExpanded={true} // Always expanded in builder mode essentially
                                onToggleFacts={() => toggleFactSection(section.id)}
                            />
                        );
                    })}
                </div>
            </div>

            {/* CENTER RAIL: Submission Preview */}
            <div className="flex-1 bg-slate-200/50 overflow-y-auto p-8 relative flex justify-center">
                {/* PDF Container */}
                <ClinicalSubmissionPreview 
                    truth={truthAssertions} 
                    providerName="Dr. Smith"
                />
            </div>

            {/* RIGHT RAIL: Libraries */}
            <div className="w-[300px] bg-white border-l border-slate-200 flex flex-col shrink-0 z-30">
                {/* Simple Tab Header */}
                <div className="flex border-b border-slate-100">
                    <button className="flex-1 py-3 text-xs font-bold text-blue-600 border-b-2 border-blue-600 bg-blue-50/50">
                        Risk Library
                    </button>
                    <button className="flex-1 py-3 text-xs font-bold text-slate-400 hover:text-slate-600 border-b-2 border-transparent">
                        Findings
                    </button>
                </div>
                
                <div className="flex-1 overflow-hidden relative">
                    <RiskLibraryPanel 
                        assignedRiskIds={activeRiskIds}
                        onAssignRisk={onAssignRisk}
                        tenantId={currentTenantId}
                        recommendedCategories={recommendedRiskCategories}
                    />
                </div>
            </div>

        </div>
    </div>
  );
};
