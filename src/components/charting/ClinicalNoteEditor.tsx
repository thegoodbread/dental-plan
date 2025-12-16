
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useChairside } from '../../context/ChairsideContext';
import { 
  ArrowLeft, Save, ShieldCheck, Activity, Clock, Lock, CheckSquare, ArrowRight, FileCheck, Layout, ChevronDown, Check, FileText, AlertTriangle, Plus
} from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';

import { ToothNumber, ToothRecord, SoapSection, AssignedRisk, RiskLibraryItem, SoapSectionType, recordRiskEvent, RiskCategory } from '../../domain/dentalTypes';
import { RISK_LIBRARY } from '../../domain/riskLibrary';
import { SoapSectionBlock } from './SoapSectionBlock';
import { RiskLibraryPanel } from './RiskLibraryPanel';
import { ClinicalSubmissionPreview } from './ClinicalSubmissionPreview';
import { Visit, TreatmentPlanItem } from '../../types';
import { CompletenessResult } from '../../domain/CompletenessEngine';
import { TruthAssertionsBundle, getNoteCompleteness, getNextMissingSlot, AssertionSlot, createManualAssertion } from '../../domain/TruthAssertions';

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

const QUICK_ACTION_TO_CODES: Record<string, string[]> = {
  'Composite': ['D2391', 'D2392', 'D2393'],
  'Crown': ['D2740', 'D2950'],
  'Extraction': ['D7140', 'D7210'],
  'Root Canal': ['D3310', 'D3320', 'D3330'],
  'Implant': ['D6010'],
  'Exam': ['D0150', 'D0120'],
  'Perio': ['D4341', 'D4910']
};

function getSuggestedRiskIdsForProcedures(codes: string[]): string[] {
  const normalizedCodes = new Set(codes.map(c => c.toUpperCase()));
  const suggestions = new Set<string>();

  RISK_LIBRARY.forEach(risk => {
    if (risk.procedureCodes && risk.procedureCodes.some(code => normalizedCodes.has(code))) {
      suggestions.add(risk.id);
    }
  });

  return Array.from(suggestions);
}

// Improvement: Determine broad risk categories from items
function getRiskCategoriesForProcedures(items: TreatmentPlanItem[]): string[] {
  const categories = new Set<string>();
  items.forEach(i => {
    const code = i.procedureCode.toUpperCase();
    if (i.category === 'RESTORATIVE') categories.add('DIRECT_RESTORATION'); 
    if (code.startsWith('D27') || code.startsWith('D29')) categories.add('INDIRECT_RESTORATION');
    if (i.category === 'ENDODONTIC' || code.startsWith('D3')) categories.add('ENDO');
    if (i.category === 'IMPLANT' || code.startsWith('D60')) categories.add('IMPLANT');
    if (i.category === 'SURGICAL' || code.startsWith('D7')) categories.add('EXTRACTION'); 
    if (i.itemType === 'ADDON' && i.addOnKind === 'SEDATION') categories.add('SEDATION');
    if (code.startsWith('D92')) categories.add('ANESTHESIA'); // Or sedation
  });
  return Array.from(categories);
}

const generateId = () => Math.random().toString(36).substr(2, 9);

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

  const { setTruthAssertions, toggleFactSection, noteCompleteness, setCurrentView, factSectionStates, addManualAssertion } = useChairside();
  
  // Refs for scrolling
  const leftRailRef = useRef<HTMLDivElement>(null);
  
  // UI State
  const [activeRightTab, setActiveRightTab] = useState<'RISKS' | 'FINDINGS' | 'TEMPLATES'>('RISKS');

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
      const sectionObj = soapSections.find(s => s.type === section);
      if (sectionObj && !factSectionStates[sectionObj.id]) {
          toggleFactSection(sectionObj.id);
      }

      // 2. Scroll Logic
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

  const activeRiskIds = useMemo(() => assignedRisks.map(r => r.riskLibraryItemId), [assignedRisks]);

  // -- Mock Findings Logic (since actual findings provider is missing in prompt) --
  const handleAddFinding = (text: string, section: SoapSectionType, slot: AssertionSlot) => {
      // Directly inject a manual assertion
      addManualAssertion(section as any, slot, text);
  };

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
                                className={`h-full transition-all duration-500 ease-out ${noteCompletenessPercent === 100 ? 'bg-green-500' : noteCompletenessPercent > 80 ? 'bg-amber-500' : 'bg-blue-500'}`} 
                                style={{ width: `${noteCompletenessPercent}%` }} 
                            />
                        </div>
                        <span className={`text-[10px] font-bold ${noteCompletenessPercent === 100 ? 'text-green-600' : noteCompletenessPercent > 80 ? 'text-amber-600' : 'text-slate-500'}`}>
                            {noteCompletenessPercent}% Ready
                        </span>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-3">
                {!isLocked && noteCompletenessPercent < 100 && (
                    <button 
                        onClick={handleFixNext}
                        className="h-9 px-4 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 shadow-sm flex items-center gap-2 transition-all hover:scale-[1.02] active:scale-95 animate-pulse"
                    >
                        Fix Next <ArrowRight size={14} />
                    </button>
                )}
                {noteCompletenessPercent === 100 && !isLocked && (
                    <div className="flex items-center gap-1.5 text-green-600 bg-green-50 px-3 py-1.5 rounded-lg border border-green-100 shadow-sm">
                        <Check size={14} strokeWidth={3} />
                        <span className="text-xs font-bold">Claim Ready</span>
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
                <div className="p-3 border-b border-slate-200 bg-white sticky top-0 z-20 flex justify-between items-center shrink-0">
                    <span className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <CheckSquare size={14} className="text-blue-500" /> Claim Structure
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium bg-slate-100 px-2 py-0.5 rounded-full">
                        {truthAssertions?.assertions.filter(a => a.checked).length || 0} Facts
                    </span>
                </div>
                
                <div ref={leftRailRef} className="flex-1 overflow-y-auto p-3 custom-scrollbar">
                    {displayedSections.map(section => {
                        const sectionAssertions = truthAssertions?.assertions.filter(a => a.section === section.type) || [];
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
                        onClick={() => setActiveRightTab('TEMPLATES')}
                        className={`flex-1 py-3 text-xs font-bold border-b-2 transition-colors ${activeRightTab === 'TEMPLATES' ? 'border-blue-600 text-blue-600 bg-white' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                    >
                        Templates
                    </button>
                </div>
                
                <div className="flex-1 overflow-hidden relative">
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

                    {activeRightTab === 'TEMPLATES' && (
                        <div className="flex flex-col items-center justify-center h-full p-8 text-slate-400">
                            <FileText size={48} className="mb-4 opacity-20" />
                            <p className="text-xs text-center">Templates are managed in Settings.</p>
                        </div>
                    )}
                </div>
            </div>

        </div>
    </div>
  );
};
