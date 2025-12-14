
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  ArrowLeft, Save, PanelRightClose, PanelRightOpen, ShieldCheck, Lightbulb, Activity, CheckCircle2, Plus, Clock, Lock, AlertCircle, ChevronDown, ChevronRight, FileText, CheckSquare
} from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';

import { ToothNumber, ToothRecord, SoapSection, AssignedRisk, RiskLibraryItem, SoapSectionType, recordRiskEvent } from '../../domain/dentalTypes';
import { RISK_LIBRARY } from '../../domain/riskLibrary';
import { SoapSectionBlock } from './SoapSectionBlock';
import { RiskLibraryPanel } from './RiskLibraryPanel';
import { AssignedRiskRow } from './AssignedRiskRow';
import { generateSoapSectionsForVisit } from '../../domain/NoteComposer';
import { loadTreatmentPlanWithItems } from '../../services/treatmentPlans';
import { Visit, TreatmentPlanItem } from '../../types';
import { evaluateVisitCompleteness, CompletenessResult } from '../../domain/CompletenessEngine';
import { TruthBlocksPanel } from './TruthBlocksPanel';
import { TruthAssertionsBundle } from '../../domain/TruthAssertions';
import { useChairside } from '../../context/ChairsideContext';

// --- SHARED UTILS & TYPES ---

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

// Reusable Pure UI Component
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
  
  // Optional features
  undoSnapshotProvider?: (sectionId: string) => { sourceLabel: string } | undefined;
  onUndo?: (sectionId: string) => void;
  onDismissUndo?: (sectionId: string) => void;
  onGenerateAiDraft?: (sectionType: SoapSectionType) => Promise<void>;
  onInsertChartFindings?: (sectionType: SoapSectionType) => void;
  
  // IDs for context
  currentTenantId: string;

  // Visit Context Inputs
  hpi: string;
  onHpiChange: (val: string) => void;
  radiographicFindings: string;
  onRadiographicFindingsChange: (val: string) => void;
  chiefComplaint: string;
  onChiefComplaintChange: (val: string) => void;
  
  completeness: CompletenessResult | null;
  relevantProcedures?: TreatmentPlanItem[]; 
  recommendedRiskCategories?: string[]; 
  
  // Truth Assertions (V2.0)
  truthAssertions?: TruthAssertionsBundle;
}

export const ClinicalNoteEditor: React.FC<ClinicalNoteEditorProps> = (props) => {
  const {
    soapSections, onUpdateSoapSection,
    assignedRisks, onAssignRisk, onRemoveRisk, onToggleRiskExpand, onUpdateConsent, onReorderRisks, suggestedRiskIds,
    isLocked, contextLabel, contextSubLabel,
    onSave, onSign, lastSavedAt,
    viewMode, showRiskPanel, onToggleRiskPanel,
    undoSnapshotProvider, onUndo, onDismissUndo,
    onGenerateAiDraft, onInsertChartFindings,
    currentTenantId,
    hpi, onHpiChange, radiographicFindings, onRadiographicFindingsChange, chiefComplaint, onChiefComplaintChange,
    completeness,
    relevantProcedures = [],
    recommendedRiskCategories,
    truthAssertions
  } = props;

  // Consume context for V2.0 features
  const { setTruthAssertions, factSectionStates, toggleFactSection } = useChairside();

  const riskSectionRef = useRef<HTMLDivElement>(null);
  const activeRisks = assignedRisks.filter(r => r.isActive).sort((a, b) => a.sortOrder - b.sortOrder);
  const [showProcedures, setShowProcedures] = useState(false);
  
  const [showTruthBlocks, setShowTruthBlocks] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor)
  );

  const displayedSections = soapSections.filter(s => {
      if (viewMode === 'drawer') {
          return ['SUBJECTIVE', 'OBJECTIVE', 'ASSESSMENT', 'PLAN'].includes(s.type);
      }
      return true; 
  });

  const handleDragEnd = (event: DragEndEvent) => {
    if (isLocked) return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = activeRisks.findIndex((r) => r.id === active.id);
    const newIndex = activeRisks.findIndex((r) => r.id === over.id);
    if (oldIndex !== -1 && newIndex !== -1) {
        onReorderRisks(oldIndex, newIndex);
    }
  };

  const getCompletenessColor = (score: number) => {
      if (score >= 90) return 'bg-green-100 text-green-800 border-green-200';
      return 'bg-amber-100 text-amber-800 border-amber-200';
  };

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

  return (
    <div className="flex-1 flex overflow-hidden h-full">
        {/* LEFT COLUMN: SOAP Content */}
        <div className="flex-1 overflow-y-auto relative bg-slate-100 custom-scrollbar">
          {/* HEADER IN PAGE MODE */}
          {viewMode === 'page' && (
            <>
              <div className="bg-white border-b border-slate-300 px-4 py-2.5 shadow-sm z-30 sticky top-0 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                    <h2 className="text-lg font-bold text-slate-800">Clinical Note Editor</h2>
                    {isLocked && (
                        <span className="px-2 py-0.5 bg-slate-100 border border-slate-300 rounded text-xs font-bold text-slate-500 flex items-center gap-1">
                            <Lock size={12} /> SIGNED
                        </span>
                    )}
                    </div>
                    <div className="flex items-center gap-3">
                        {/* Improvement: Completeness Badge */}
                        {completeness && !isLocked && (
                            <div className="group relative">
                                <span className={`px-2 py-1 rounded text-xs font-bold border flex items-center gap-1 cursor-help transition-colors ${getCompletenessColor(completeness.score)}`}>
                                    <Activity size={12} />
                                    {completeness.score}% Complete
                                </span>
                                {completeness.missing.length > 0 && (
                                    <div className="absolute top-full right-0 mt-2 w-72 bg-white border border-slate-200 shadow-xl rounded-lg p-3 z-50 hidden group-hover:block animate-in fade-in slide-in-from-top-1">
                                        <div className="text-xs font-bold text-slate-700 mb-2 border-b pb-1">Missing Requirements</div>
                                        <ul className="list-disc list-inside text-[10px] text-slate-600 space-y-1">
                                            {completeness.missing.map((m, i) => <li key={i}>{m}</li>)}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        )}

                        {lastSavedAt && (
                            <span className="text-[10px] text-slate-400 font-medium mr-2 flex items-center gap-1">
                                <Clock size={10} /> Saved {new Date(lastSavedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        )}
                        {!isLocked && (
                            <button 
                                onClick={() => setShowTruthBlocks(!showTruthBlocks)}
                                className={`h-9 px-3 border border-slate-300 rounded-md shadow-sm transition-all flex items-center gap-2 text-sm font-semibold ${showTruthBlocks ? 'bg-blue-50 text-blue-700 border-blue-300' : 'bg-white text-slate-700 hover:bg-slate-50'}`}
                                title="Toggle Fact Verification Drawer"
                            >
                                <CheckSquare size={16} />
                                <span className="hidden md:inline">Verify (Secondary)</span>
                            </button>
                        )}
                        {!isLocked && onSave && (
                            <button onClick={onSave} className="h-9 px-3 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-semibold rounded-md shadow-sm transition-all">
                                Regenerate
                            </button>
                        )}
                        {!isLocked && onSign && (
                            <button onClick={onSign} className="h-9 px-4 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-md shadow-sm flex items-center gap-2 transition-all">
                                <Save size={16} /> Sign
                            </button>
                        )}
                        {onToggleRiskPanel && (
                            <button onClick={onToggleRiskPanel} className={`p-2 rounded-md border transition-all hidden md:flex ${showRiskPanel ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'}`} title={showRiskPanel ? "Hide Library" : "Show Library"}>
                                {showRiskPanel ? <PanelRightOpen size={18} /> : <PanelRightClose size={18} />}
                            </button>
                        )}
                    </div>
                </div>

                {/* Improvement: Procedure Chips */}
                {relevantProcedures.length > 0 && (
                    <div className="pt-1">
                        <button 
                            onClick={() => setShowProcedures(!showProcedures)} 
                            className="flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors mb-2"
                        >
                            {showProcedures ? <ChevronDown size={14}/> : <ChevronRight size={14}/>}
                            <span>{relevantProcedures.length} Procedures Included</span>
                        </button>
                        
                        {showProcedures && (
                            <div className="flex flex-wrap gap-2 pb-2 animate-in slide-in-from-top-1 fade-in duration-200">
                                {relevantProcedures.map(proc => (
                                    <div key={proc.id} className="inline-flex items-center gap-1.5 px-2 py-1 bg-slate-100 border border-slate-200 rounded text-[11px] text-slate-700 font-medium">
                                        <FileText size={10} className="text-slate-400" />
                                        <span>{proc.procedureCode}</span>
                                        <span className="text-slate-400">|</span>
                                        <span className="truncate max-w-[150px]">{proc.procedureName}</span>
                                        {proc.selectedTeeth && proc.selectedTeeth.length > 0 && (
                                            <span className="bg-white px-1 rounded text-slate-500 border border-slate-100">#{proc.selectedTeeth.join(',')}</span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
              </div>
              
              {/* Visit Context Inputs */}
              <div className="bg-white border-b border-slate-200 px-4 py-3 grid grid-cols-1 md:grid-cols-3 gap-4 shadow-sm">
                  <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Chief Complaint</label>
                      <input 
                        type="text" 
                        value={chiefComplaint} 
                        onChange={e => onChiefComplaintChange(e.target.value)} 
                        placeholder="e.g. Tooth hurts on lower right"
                        className="w-full text-xs p-1.5 border border-slate-300 rounded bg-slate-50 focus:bg-white focus:border-blue-500 outline-none transition-all"
                        disabled={isLocked}
                      />
                  </div>
                  <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">HPI</label>
                      <input 
                        type="text" 
                        value={hpi} 
                        onChange={e => onHpiChange(e.target.value)} 
                        placeholder="Duration, intensity, triggers..."
                        className="w-full text-xs p-1.5 border border-slate-300 rounded bg-slate-50 focus:bg-white focus:border-blue-500 outline-none transition-all"
                        disabled={isLocked}
                      />
                  </div>
                  <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Radiographic Findings</label>
                      <input 
                        type="text" 
                        value={radiographicFindings} 
                        onChange={e => onRadiographicFindingsChange(e.target.value)} 
                        placeholder="e.g. PARL #30, recurrent decay"
                        className="w-full text-xs p-1.5 border border-slate-300 rounded bg-slate-50 focus:bg-white focus:border-blue-500 outline-none transition-all"
                        disabled={isLocked}
                      />
                  </div>
              </div>

              <div className="bg-blue-50/50 border-b border-blue-100 px-4 py-2 flex items-center justify-between text-xs text-blue-800">
                <div className="flex items-center gap-3">
                    <span className="font-bold bg-white px-2 py-0.5 rounded border border-blue-200 shadow-sm">
                        {contextLabel}
                    </span>
                    {contextSubLabel}
                </div>
                <div className="flex items-center gap-1 font-medium">
                    <ShieldCheck size={12} className={activeRisks.length > 0 ? "text-green-600" : "text-slate-400"} />
                    <span>{activeRisks.length} active risks</span>
                </div>
              </div>
            </>
          )}

          <div className={`mx-auto p-4 space-y-4 pb-20 ${viewMode === 'page' ? 'max-w-4xl' : 'max-w-full'}`}>
            {displayedSections.map(section => {
                // Filter assertions for this section
                const sectionAssertions = truthAssertions?.assertions.filter(a => a.section === section.type) || [];
                
                return (
                    <SoapSectionBlock 
                        key={section.id} 
                        section={section}
                        contextLabel={contextLabel}
                        onSave={onUpdateSoapSection}
                        onDictate={isLocked ? undefined : () => alert("Dictation placeholder")}
                        onAiDraft={isLocked || !onGenerateAiDraft ? undefined : () => onGenerateAiDraft(section.type)}
                        onInsertChartFindings={isLocked || !onInsertChartFindings ? undefined : (section.type === 'OBJECTIVE' ? () => onInsertChartFindings('OBJECTIVE') : undefined)}
                        undoSnapshot={undoSnapshotProvider ? undoSnapshotProvider(section.id) : undefined}
                        onUndo={onUndo ? () => onUndo(section.id) : undefined}
                        onDismissUndo={onDismissUndo ? () => onDismissUndo(section.id) : undefined}
                        isLocked={isLocked}
                        // V2.0 Inline Facts
                        assertions={sectionAssertions}
                        onToggleAssertion={handleToggleAssertion}
                        isFactsExpanded={factSectionStates[section.id]}
                        onToggleFacts={() => toggleFactSection(section.id)}
                    />
                );
            })}

            {/* --- IN-FLOW RISKS SECTION --- */}
            <div ref={riskSectionRef} className="pt-2">
                <div className="flex items-center gap-3 mb-2 px-1">
                    <div className="h-px bg-slate-300 flex-1"></div>
                    <div className="flex items-center gap-2 text-slate-500">
                        <ShieldCheck size={14} />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Informed Consent & Risks</span>
                    </div>
                    <div className="h-px bg-slate-300 flex-1"></div>
                </div>

                <div className="bg-slate-50 rounded-lg border border-slate-200 p-3 shadow-inner">
                    {/* SUGGESTED RISKS */}
                    {suggestedRiskIds.length > 0 && !isLocked && (
                        <div className="mb-4">
                            <div className="flex items-center gap-1.5 mb-2 text-[10px] font-bold text-amber-600 uppercase tracking-wider">
                                <Lightbulb size={12} /> Recommended based on procedures
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {suggestedRiskIds.map(riskId => {
                                    const risk = RISK_LIBRARY.find(r => r.id === riskId);
                                    if (!risk) return null;
                                    if (activeRisks.some(ar => ar.riskLibraryItemId === riskId)) return null;
                                    return (
                                        <button
                                            key={risk.id}
                                            onClick={() => onAssignRisk(risk)}
                                            className="flex items-center gap-1 px-3 py-1.5 bg-white border border-amber-200 text-amber-900 text-xs rounded-full shadow-sm hover:bg-amber-50 hover:border-amber-300 transition-colors group"
                                        >
                                            <span className="font-medium">{risk.title}</span>
                                            <span className="text-amber-500 group-hover:text-amber-700 bg-amber-50 group-hover:bg-amber-100 rounded-full w-4 h-4 flex items-center justify-center text-[10px] ml-1">
                                                <Plus size={8} strokeWidth={3} />
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* ASSIGNED RISKS LIST */}
                    {activeRisks.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-4 text-slate-400">
                            <p className="text-xs italic">No risks assigned.</p>
                        </div>
                    ) : (
                        viewMode === 'drawer' || isLocked ? (
                            <div className="space-y-2">
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Assigned</div>
                                {activeRisks.map(risk => (
                                    <AssignedRiskRow 
                                        key={risk.id}
                                        risk={risk}
                                        onToggleExpand={onToggleRiskExpand}
                                        onRemove={isLocked ? () => {} : onRemoveRisk}
                                        onUpdateConsent={isLocked ? () => {} : onUpdateConsent}
                                    />
                                ))}
                            </div>
                        ) : (
                            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                                <SortableContext items={activeRisks.map(r => r.id)} strategy={verticalListSortingStrategy}>
                                    <div className="space-y-1">
                                        {activeRisks.map(risk => (
                                            <AssignedRiskRow 
                                                key={risk.id}
                                                risk={risk}
                                                onToggleExpand={onToggleRiskExpand}
                                                onRemove={onRemoveRisk}
                                                onUpdateConsent={onUpdateConsent}
                                            />
                                        ))}
                                    </div>
                                </SortableContext>
                            </DndContext>
                        )
                    )}
                </div>
            </div>
          </div>
        </div>

        {/* TRUTH BLOCKS PANEL (Conditionally Shown) */}
        {showTruthBlocks && (
            <div className="shrink-0 bg-white border-l border-slate-300 shadow-xl z-20 w-[300px] flex flex-col animate-in slide-in-from-right duration-200">
               <TruthBlocksPanel />
            </div>
        )}

        {/* RIGHT COLUMN: RISK LIBRARY */}
        {viewMode === 'page' && showRiskPanel && !isLocked && !showTruthBlocks && (
          <div className={`shrink-0 bg-white border-l border-slate-300 shadow-xl z-20 w-[320px] md:w-[380px] h-full flex flex-col`}>
             <RiskLibraryPanel 
                assignedRiskIds={activeRisks.map(r => r.riskLibraryItemId)}
                onAssignRisk={onAssignRisk}
                tenantId={currentTenantId}
                recommendedCategories={recommendedRiskCategories}
             />
          </div>
        )}
    </div>
  );
};
