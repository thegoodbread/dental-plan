
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  ArrowLeft, Save, ShieldCheck, Activity, Clock, Lock, CheckSquare, ArrowRight, FileCheck, Layout, ChevronDown, Check
} from 'lucide-react';

import { SoapSection, AssignedRisk, RiskLibraryItem, SoapSectionType, ToothNumber, ToothRecord } from '../../domain/dentalTypes';
import { SoapSectionBlock } from './SoapSectionBlock';
import { RiskLibraryPanel } from './RiskLibraryPanel';
import { ClinicalSubmissionPreview } from './ClinicalSubmissionPreview';
import { Visit, TreatmentPlanItem } from '../../types';
import { CompletenessResult } from '../../domain/CompletenessEngine';
import { TruthAssertionsBundle, getNoteCompleteness, getNextMissingSlot, AssertionSlot } from '../../domain/TruthAssertions';
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

  const { setTruthAssertions, toggleFactSection, noteCompleteness, setCurrentView, factSectionStates } = useChairside();
  
  // Refs for scrolling
  const leftRailRef = useRef<HTMLDivElement>(null);

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

  // --- Navigation & Sync Logic ---
  
  const scrollToSlot = (section: string, slot: string) => {
      // 1. Ensure section is expanded in context state if needed
      // (Optimization: Check if already expanded to avoid re-renders)
      const sectionObj = soapSections.find(s => s.type === section);
      if (sectionObj && !factSectionStates[sectionObj.id]) {
          // This might cause a re-render, so we should rely on the DOM being ready
          toggleFactSection(sectionObj.id);
      }

      // 2. Scroll Logic
      // We use a small timeout to allow expansion animation/render if needed
      setTimeout(() => {
          const slotId = `slot-${section}-${slot}`;
          const el = document.getElementById(slotId);
          if (el) {
              el.scrollIntoView({ behavior: 'smooth', block: 'center' });
              
              // Visual Flash
              el.classList.add('bg-blue-100/50', 'ring-2', 'ring-blue-400');
              setTimeout(() => {
                  el.classList.remove('bg-blue-100/50', 'ring-2', 'ring-blue-400');
              }, 1500);
          } else {
              // Fallback: Scroll to section header
              const secId = `section-${section}`;
              const secEl = document.getElementById(secId);
              if (secEl) secEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
      }, 100);
  };

  const handleFixNext = () => {
      const next = getNextMissingSlot(truthAssertions);
      if (next) {
          scrollToSlot(next.section, next.slot);
      }
  };

  const displayedSections = soapSections.filter(s => {
      return ['SUBJECTIVE', 'OBJECTIVE', 'ASSESSMENT', 'PLAN', 'TREATMENT_PERFORMED'].includes(s.type);
  });

  // Calculate top risk categories for context
  const activeRiskIds = useMemo(() => assignedRisks.map(r => r.riskLibraryItemId), [assignedRisks]);

  return (
    <div className="flex flex-col h-full bg-slate-100 overflow-hidden font-sans text-slate-900">
        
        {/* TOP BAR: Claim Studio Header */}
        <header className="bg-white border-b border-slate-200 px-4 py-2.5 flex items-center justify-between shadow-sm shrink-0 z-40 h-[60px]">
            <div className="flex items-center gap-4">
                {viewMode === 'page' && (
                    <button onClick={() => setCurrentView('DASHBOARD')} className="p-1.5 -ml-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors"><ArrowLeft size={18} /></button>
                )}
                <div>
                    <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                        Claim Studio 
                        {isLocked && <span className="bg-slate-100 text-slate-500 text-[10px] px-2 py-0.5 rounded border border-slate-200 uppercase tracking-wide">Locked</span>}
                    </h2>
                    {/* Readiness Bar */}
                    <div className="flex items-center gap-2 mt-0.5">
                        <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div 
                                className={`h-full transition-all duration-500 ease-out ${noteCompletenessPercent === 100 ? 'bg-green-500' : 'bg-blue-500'}`} 
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
                        className="h-9 px-4 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 shadow-sm flex items-center gap-2 transition-all hover:scale-[1.02] active:scale-95"
                    >
                        Fix Next <ArrowRight size={14} />
                    </button>
                )}
                {noteCompletenessPercent === 100 && !isLocked && (
                    <div className="flex items-center gap-1.5 text-green-600 bg-green-50 px-3 py-1.5 rounded-lg border border-green-100">
                        <Check size={14} strokeWidth={3} />
                        <span className="text-xs font-bold">Documentation Complete</span>
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
            
            {/* LEFT RAIL: Truth Builder (Scrollable) */}
            <div className="w-[400px] bg-slate-50 border-r border-slate-200 flex flex-col shrink-0 z-30 shadow-[4px_0_16px_rgba(0,0,0,0.02)]">
                <div className="p-3 border-b border-slate-200 bg-white sticky top-0 z-20 flex justify-between items-center shrink-0">
                    <span className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <CheckSquare size={14} className="text-blue-500" /> Truth Builder
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">
                        {truthAssertions?.assertions.filter(a => a.checked).length || 0} Facts
                    </span>
                </div>
                
                <div ref={leftRailRef} className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                    {displayedSections.map(section => {
                        const sectionAssertions = truthAssertions?.assertions.filter(a => a.section === section.type) || [];
                        return (
                            <SoapSectionBlock 
                                key={section.id} 
                                section={section}
                                isLocked={isLocked}
                                assertions={sectionAssertions}
                                onToggleAssertion={handleToggleAssertion}
                                isFactsExpanded={true} // Always open in builder mode
                                onToggleFacts={() => toggleFactSection(section.id)}
                            />
                        );
                    })}
                    
                    {/* Spacer for scroll comfort */}
                    <div className="h-20"></div>
                </div>
            </div>

            {/* CENTER RAIL: Submission Preview (Scrollable) */}
            <div className="flex-1 bg-slate-100 overflow-y-auto relative flex justify-center custom-scrollbar">
                <div className="w-full max-w-[850px] py-8 px-6">
                    <ClinicalSubmissionPreview 
                        truth={truthAssertions} 
                        providerName="Dr. Smith"
                        onNavigate={scrollToSlot}
                    />
                    <div className="h-20"></div>
                </div>
            </div>

            {/* RIGHT RAIL: Libraries (Scrollable) */}
            <div className="w-[350px] bg-white border-l border-slate-200 flex flex-col shrink-0 z-30">
                {/* Tab Header */}
                <div className="flex border-b border-slate-100 shrink-0">
                    <button className="flex-1 py-3 text-xs font-bold text-blue-600 border-b-2 border-blue-600 bg-blue-50/30">
                        Risk Library
                    </button>
                    <button className="flex-1 py-3 text-xs font-bold text-slate-400 hover:text-slate-600 border-b-2 border-transparent transition-colors">
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
