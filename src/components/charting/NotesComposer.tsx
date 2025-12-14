
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useChairside } from '../../context/ChairsideContext';
import { 
  ArrowLeft, Save, PanelRightClose, PanelRightOpen, ShieldCheck, Lightbulb, Activity, CheckCircle2, Plus, Clock, Lock, AlertCircle
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
import { Visit } from '../../types';
import { evaluateVisitCompleteness, CompletenessResult } from '../../domain/CompletenessEngine';

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
    completeness
  } = props;

  const riskSectionRef = useRef<HTMLDivElement>(null);
  const activeRisks = assignedRisks.filter(r => r.isActive).sort((a, b) => a.sortOrder - b.sortOrder);

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
      if (score >= 95) return 'bg-green-100 text-green-800 border-green-200';
      if (score >= 75) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      return 'bg-red-100 text-red-800 border-red-200';
  };

  return (
    <div className="flex-1 flex overflow-hidden h-full">
        {/* LEFT COLUMN: SOAP Content */}
        <div className="flex-1 overflow-y-auto relative bg-slate-100 custom-scrollbar">
          {/* HEADER IN PAGE MODE */}
          {viewMode === 'page' && (
            <>
              <div className="bg-white border-b border-slate-300 flex items-center justify-between px-4 py-2.5 shadow-sm z-30 sticky top-0">
                <div className="flex items-center gap-4">
                  <h2 className="text-lg font-bold text-slate-800">Clinical Note Editor</h2>
                  {isLocked && (
                      <span className="px-2 py-0.5 bg-slate-100 border border-slate-300 rounded text-xs font-bold text-slate-500 flex items-center gap-1">
                          <Lock size={12} /> SIGNED
                      </span>
                  )}
                  {completeness && !isLocked && (
                      <div className="group relative">
                          <span className={`px-2 py-0.5 rounded text-xs font-bold border flex items-center gap-1 cursor-help ${getCompletenessColor(completeness.score)}`}>
                              Score: {completeness.score}%
                          </span>
                          {completeness.missing.length > 0 && (
                              <div className="absolute top-full left-0 mt-2 w-64 bg-white border border-slate-200 shadow-xl rounded-lg p-3 z-50 hidden group-hover:block">
                                  <div className="text-xs font-bold text-slate-700 mb-2 border-b pb-1">Missing Requirements</div>
                                  <ul className="list-disc list-inside text-[10px] text-slate-600 space-y-1">
                                      {completeness.missing.map((m, i) => <li key={i}>{m}</li>)}
                                  </ul>
                              </div>
                          )}
                      </div>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  {lastSavedAt && (
                      <span className="text-[10px] text-slate-400 font-medium mr-2 flex items-center gap-1">
                          <Clock size={10} /> Saved {new Date(lastSavedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                  )}
                  {!isLocked && onSave && (
                      <button onClick={onSave} className="h-9 px-3 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-semibold rounded-md shadow-sm transition-all">
                          Save & Regenerate
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
            {displayedSections.map(section => (
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
                />
            ))}

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

        {/* RIGHT COLUMN: RISK LIBRARY */}
        {viewMode === 'page' && showRiskPanel && !isLocked && (
          <div className={`shrink-0 bg-white border-l border-slate-300 shadow-xl z-20 w-[320px] md:w-[380px] h-full flex flex-col`}>
             <RiskLibraryPanel 
                assignedRiskIds={activeRisks.map(r => r.riskLibraryItemId)}
                onAssignRisk={onAssignRisk}
                tenantId={currentTenantId}
             />
          </div>
        )}
    </div>
  );
};

// --- WRAPPER FOR CHARTING CONTEXT ---

interface NotesComposerProps {
  activeToothNumber: ToothNumber | null;
  activeToothRecord: ToothRecord | null;
  onToothClick: (tooth: ToothNumber) => void;
  activeTreatmentItemId?: string | null;
  activePhaseId?: string | number | null;
  viewMode: 'drawer' | 'page'; // Strict UI Mode
  pendingProcedure?: { label: string; teeth: ToothNumber[] };
  
  // New props for overrides
  onSave?: () => void;
  onSign?: () => void;
  // NEW: Optional props for specific context injection if available from parent
  visitId?: string;
  chiefComplaint?: string;
  seededProcedureIds?: string[];
}

const generateId = () => Math.random().toString(36).substr(2, 9);

export const NotesComposer: React.FC<NotesComposerProps> = ({ 
  activeToothNumber,
  activeToothRecord,
  activeTreatmentItemId,
  activePhaseId,
  viewMode, 
  pendingProcedure,
  onSave,
  onSign,
  visitId,
  chiefComplaint: propCC,
  seededProcedureIds = []
}) => {
  const { 
      setCurrentView, 
      addTimelineEvent,
      currentTenantId,
      currentPatientId,
      currentTreatmentPlanId,
      currentNoteId,
      currentUserId,
      soapSections,
      updateSoapSection,
      setSoapSections,
      saveCurrentNote,
      signNote,
      lastSavedAt,
      noteStatus,
      undoSnapshots,
      undoAppend,
      dismissUndo
  } = useChairside();
  
  const isLocked = noteStatus === 'signed';
  const [assignedRisks, setAssignedRisks] = useState<AssignedRisk[]>([]);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  
  // Local state for completeness inputs
  const [hpi, setHpi] = useState('');
  const [radiographicFindings, setRadiographicFindings] = useState('');
  const [localChiefComplaint, setLocalChiefComplaint] = useState(propCC || '');
  const [completeness, setCompleteness] = useState<CompletenessResult | null>(null);
  
  // Signing Modal State
  const [showSignModal, setShowSignModal] = useState(false);
  const [signOverrideReason, setSignOverrideReason] = useState('');

  useEffect(() => {
      setLocalChiefComplaint(propCC || '');
  }, [propCC]);

  // Load Risks specific to this context
  const buildRiskStorageKey = () => `dental_assigned_risks:${currentPatientId}:${currentNoteId}`;

  useEffect(() => {
    const key = buildRiskStorageKey();
    const storedRisks = localStorage.getItem(key);
    if (storedRisks) {
        try {
            setAssignedRisks(JSON.parse(storedRisks));
        } catch (e) { console.error("Failed to load risks", e); }
    } else {
        setAssignedRisks([]);
    }
  }, [currentPatientId, currentNoteId]);

  const persistRisks = (risks: AssignedRisk[]) => {
      if (isLocked) return;
      const key = buildRiskStorageKey();
      localStorage.setItem(key, JSON.stringify(risks));
  };

  const suggestedRiskIds = useMemo(() => {
    let codes: string[] = [];
    if (pendingProcedure) {
        const mapped = QUICK_ACTION_TO_CODES[pendingProcedure.label];
        if (mapped) codes.push(...mapped);
    }
    if (activeToothRecord) {
        codes.push(...activeToothRecord.procedures.map(p => p.code));
    }
    return getSuggestedRiskIdsForProcedures(codes);
  }, [activeToothRecord, pendingProcedure]);

  // Risk Handlers
  const handleAssignRisk = (riskItem: RiskLibraryItem) => {
      if (isLocked) return;
      if (assignedRisks.some(r => r.riskLibraryItemId === riskItem.id && r.isActive)) return;

      const activeCount = assignedRisks.filter(r => r.isActive).length;
      const newAssignment: AssignedRisk = {
          id: `ar-${generateId()}`,
          tenantId: currentTenantId,
          patientId: currentPatientId,
          treatmentPlanId: currentTreatmentPlanId,
          clinicalNoteId: currentNoteId,
          treatmentItemId: activeTreatmentItemId ?? undefined,
          phaseId: activePhaseId != null ? String(activePhaseId) : undefined,
          riskLibraryItemId: riskItem.id,
          riskLibraryVersion: riskItem.version || 1,
          titleSnapshot: riskItem.title,
          bodySnapshot: riskItem.body,
          severitySnapshot: riskItem.severity,
          categorySnapshot: riskItem.category,
          cdtCodesSnapshot: riskItem.procedureCodes || [],
          consentMethod: 'VERBAL',
          isActive: true,
          sortOrder: activeCount,
          isExpanded: false,
          addedAt: new Date().toISOString(),
          addedByUserId: currentUserId,
          lastUpdatedAt: new Date().toISOString(),
      };

      const updatedRisks = [...assignedRisks, newAssignment];
      setAssignedRisks(updatedRisks);
      persistRisks(updatedRisks);
      
      recordRiskEvent({
        id: Math.random().toString(36).substring(2, 9),
        tenantId: currentTenantId,
        patientId: currentPatientId,
        clinicalNoteId: currentNoteId,
        treatmentPlanId: currentTreatmentPlanId,
        riskLibraryItemId: riskItem.id,
        eventType: 'RISK_ASSIGNED',
        occurredAt: new Date().toISOString(),
        userId: currentUserId,
        details: 'Risk assigned via suggestion or manual selection'
      });
  };

  const handleRemoveRisk = (id: string) => {
      if (isLocked) return;
      const updatedRisks = assignedRisks.map(r => 
          r.id === id ? { ...r, isActive: false, removedAt: new Date().toISOString() } : r
      );
      setAssignedRisks(updatedRisks);
      persistRisks(updatedRisks);
  };

  const handleToggleRiskExpand = (id: string) => {
      const updatedRisks = assignedRisks.map(r => r.id === id ? { ...r, isExpanded: !r.isExpanded } : r);
      setAssignedRisks(updatedRisks);
      if (!isLocked) persistRisks(updatedRisks);
  };

  const handleUpdateConsent = (id: string, updates: Partial<AssignedRisk>) => {
      if (isLocked) return;
      const updatedRisks = assignedRisks.map(r => 
          r.id === id ? { ...r, ...updates, lastUpdatedAt: new Date().toISOString() } : r
      );
      setAssignedRisks(updatedRisks);
      persistRisks(updatedRisks);
  };

  const handleReorderRisks = (oldIndex: number, newIndex: number) => {
      const activeItems = assignedRisks.filter(r => r.isActive).sort((a, b) => a.sortOrder - b.sortOrder);
      const newOrder = arrayMove(activeItems, oldIndex, newIndex);
      
      const updatedActive = newOrder.map((risk, index) => ({
        ...risk,
        sortOrder: index,
        lastUpdatedAt: new Date().toISOString()
      }));
      
      const activeIds = new Set(updatedActive.map(r => r.id));
      const others = assignedRisks.filter(r => !activeIds.has(r.id));
      const finalList = [...updatedActive, ...others];
      setAssignedRisks(finalList);
      persistRisks(finalList);
  };

  // --- SAVE HANDLER REPLACEMENT (Pure Schema) ---
  const handleSmartSave = (): CompletenessResult => {
      if (isLocked && completeness) return completeness;

      // 1. Gather data
      const { items } = loadTreatmentPlanWithItems(currentTreatmentPlanId) || { items: [] };
      const todayDate = new Date().toISOString().split('T')[0];
      
      // Filter procedures: only explicit visit or completed today
      let proceduresForNote = items;
      if (visitId) {
          proceduresForNote = items.filter(item => 
              item.performedInVisitId === visitId
          );
      } else {
          // Fallback if no visitId available in context
          proceduresForNote = items.filter(item => 
              item.procedureStatus === 'COMPLETED' && item.performedDate && item.performedDate.startsWith(todayDate)
          );
      }

      // Mock visit object for the generator
      const mockVisit: Visit = {
          id: visitId || 'visit-current',
          treatmentPlanId: currentTreatmentPlanId,
          date: new Date().toISOString(),
          provider: 'Dr. Smith',
          visitType: 'restorative',
          attachedProcedureIds: proceduresForNote.map(p => p.id),
          createdAt: new Date().toISOString(),
          chiefComplaint: localChiefComplaint,
          hpi: hpi,
          radiographicFindings: radiographicFindings,
          seededProcedureIds // Pass seed state for context if needed by engine
      };

      // 2. Generate Note using pure function
      const { sections, note } = generateSoapSectionsForVisit(
          mockVisit,
          proceduresForNote,
          assignedRisks,
          soapSections
      );

      // 3. Calculate Completeness
      const completenessResult = evaluateVisitCompleteness(
          mockVisit, 
          proceduresForNote, 
          sections, 
          assignedRisks
      );
      setCompleteness(completenessResult);

      // 4. Apply updates
      // Use bulk update to ensure atomicity and prevent stale closures
      setSoapSections(sections);

      // 5. Persist
      if (onSave) onSave(); // Custom override (e.g. saves to Visit record)
      else saveCurrentNote(); // Context save
      
      return completenessResult;
  };

  const handleFinalize = () => {
      if (isLocked) return;
      // Ensure we have the latest completeness check
      const result = handleSmartSave();
      // Show custom modal instead of window.confirm
      setShowSignModal(true);
  };

  const performSign = () => {
      // Use provided override if available, otherwise default context
      if (onSign) {
          onSign();
      } else {
          signNote();
      }
      
      const isOverride = completeness && completeness.score < 90;
      
      addTimelineEvent({
        type: 'NOTE',
        title: isOverride ? 'Clinical Note Signed with Override' : 'Clinical Note Signed',
        details: isOverride 
            ? `Note signed with completeness score ${completeness?.score}%. Override reason: ${signOverrideReason}`
            : `Note signed with completeness score ${completeness?.score}%.`,
        provider: 'Dr. Smith'
      });
      
      setShowSignModal(false);
      setSignOverrideReason('');
      
      if (viewMode === 'page') setCurrentView('DASHBOARD');
  };

  // --- HELPER LOGIC FOR AI & CHART FINDINGS ---

  const handleRefineWithAi = async (sectionType: SoapSectionType) => {
      // Disabled per request for "No AI Narrative Generation" in this flow
      alert("AI Generation is disabled for this strict schema mode.");
  };

  const handleInsertChartFindings = (sectionType: SoapSectionType) => {
    if (sectionType !== 'OBJECTIVE' || isLocked) return;
    
    let textToInsert = "";
    if (pendingProcedure) {
        textToInsert += `Scheduled: ${pendingProcedure.label} ${pendingProcedure.teeth.length > 0 ? 'on #' + pendingProcedure.teeth.join(',#') : ''}. `;
    }
    if (activeToothRecord) {
        const conditions = activeToothRecord.conditions.map(c => c.label).join(', ');
        const procedures = activeToothRecord.procedures.map(p => p.name).join(', ');
        textToInsert += `Tooth #${activeToothNumber} History: ${conditions || 'None'}; Tx: ${procedures || 'None'}.`;
    }
    
    if (!textToInsert) {
        textToInsert = "No specific chart findings selected.";
    }

    const objectiveSection = soapSections.find(s => s.type === 'OBJECTIVE');
    if (objectiveSection) {
        const newContent = objectiveSection.content ? `${objectiveSection.content}\n${textToInsert}` : textToInsert;
        updateSoapSection(objectiveSection.id, newContent);
    }
  };

  // Context Label Logic
  let contextLabel = 'General Visit';
  if (pendingProcedure) {
      contextLabel = `${pendingProcedure.label} ${pendingProcedure.teeth.length > 0 ? '#' + pendingProcedure.teeth.join(',') : ''}`;
  } else if (activeToothNumber) {
      contextLabel = `Tooth #${activeToothNumber}`;
  }

  const subLabel = activeToothRecord && (
    <div className="flex gap-2 text-blue-600">
        <span className="flex items-center gap-1"><Activity size={12}/> {activeToothRecord.conditions.length} conditions</span>
        <span className="opacity-50">|</span>
        <span className="flex items-center gap-1"><CheckCircle2 size={12}/> {activeToothRecord.procedures.length} procedures</span>
    </div>
  );

  return (
    <div className={`flex flex-col h-full bg-slate-100 font-sans text-slate-900 overflow-hidden`}>
      {viewMode === 'page' && (
        <div className="bg-white border-b border-slate-300 px-4 py-2.5 flex items-center justify-between shadow-sm z-30 shrink-0 sticky top-0">
           <div className="flex items-center gap-4">
              <button onClick={() => setCurrentView('DASHBOARD')} className="p-1.5 -ml-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors"><ArrowLeft size={18} /></button>
              <h2 className="text-lg font-bold text-slate-800">Clinical Note Editor (Chart)</h2>
           </div>
        </div>
      )}
      
      <ClinicalNoteEditor
        soapSections={soapSections}
        onUpdateSoapSection={updateSoapSection}
        assignedRisks={assignedRisks}
        onAssignRisk={handleAssignRisk}
        onRemoveRisk={handleRemoveRisk}
        onToggleRiskExpand={handleToggleRiskExpand}
        onUpdateConsent={handleUpdateConsent}
        onReorderRisks={handleReorderRisks}
        suggestedRiskIds={suggestedRiskIds}
        isLocked={isLocked}
        contextLabel={contextLabel}
        contextSubLabel={subLabel}
        onSave={handleSmartSave}
        onSign={handleFinalize}
        lastSavedAt={lastSavedAt}
        viewMode={viewMode}
        showRiskPanel={rightPanelOpen}
        onToggleRiskPanel={() => setRightPanelOpen(!rightPanelOpen)}
        undoSnapshotProvider={(id) => undoSnapshots[id]}
        onUndo={undoAppend}
        onDismissUndo={dismissUndo}
        onGenerateAiDraft={handleRefineWithAi}
        onInsertChartFindings={handleInsertChartFindings}
        currentTenantId={currentTenantId}
        // Input bindings
        hpi={hpi}
        onHpiChange={setHpi}
        radiographicFindings={radiographicFindings}
        onRadiographicFindingsChange={setRadiographicFindings}
        chiefComplaint={localChiefComplaint}
        onChiefComplaintChange={setLocalChiefComplaint}
        completeness={completeness}
      />

      {/* SIGNING MODAL */}
      {showSignModal && completeness && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden flex flex-col">
                <div className={`px-6 py-4 border-b ${completeness.score < 90 ? 'bg-amber-50 border-amber-100' : 'bg-green-50 border-green-100'}`}>
                    <h3 className={`text-lg font-bold ${completeness.score < 90 ? 'text-amber-800' : 'text-green-800'}`}>
                        {completeness.score < 90 ? 'Completeness Check Failed' : 'Ready to Sign'}
                    </h3>
                    <div className="text-sm font-medium opacity-80">
                        Score: {completeness.score}%
                    </div>
                </div>
                
                <div className="p-6 space-y-4">
                    {completeness.score < 90 ? (
                        <>
                            <p className="text-sm text-gray-600">
                                The following requirements are missing:
                            </p>
                            <ul className="list-disc list-inside text-sm text-red-600 font-medium bg-red-50 p-3 rounded-lg border border-red-100">
                                {completeness.missing.map((m, i) => <li key={i}>{m}</li>)}
                            </ul>
                            {completeness.warnings.length > 0 && (
                                 <div className="text-xs text-amber-600 mt-2 flex items-start gap-1">
                                    <AlertCircle size={12} className="mt-0.5 shrink-0" />
                                    <span>Also noted: {completeness.warnings.join(', ')}</span>
                                 </div>
                            )}
                            
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Override Reason (Required)</label>
                                <textarea 
                                    className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                                    placeholder="Why are you signing incomplete documentation?"
                                    value={signOverrideReason}
                                    onChange={e => setSignOverrideReason(e.target.value)}
                                    rows={2}
                                />
                            </div>
                        </>
                    ) : (
                        <p className="text-gray-600">
                            This note meets all documentation standards. Proceed to sign and lock?
                        </p>
                    )}
                </div>

                <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
                    <button 
                        onClick={() => { setShowSignModal(false); setSignOverrideReason(''); }}
                        className="px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={performSign}
                        disabled={completeness.score < 90 && signOverrideReason.length < 5}
                        className={`px-4 py-2 text-sm font-bold text-white rounded-lg shadow-sm transition-all ${
                            completeness.score < 90 
                            ? 'bg-amber-600 hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed'
                            : 'bg-green-600 hover:bg-green-700'
                        }`}
                    >
                        {completeness.score < 90 ? 'Sign Anyway' : 'Sign & Lock'}
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};
