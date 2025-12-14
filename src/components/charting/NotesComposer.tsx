
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useChairside } from '../../context/ChairsideContext';
import { 
  ArrowLeft, Save, PanelRightClose, PanelRightOpen, ShieldCheck, Lightbulb, Activity, CheckCircle2, Plus, Clock, Lock, AlertCircle, ChevronDown, ChevronRight, FileText, CheckSquare
} from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';

import { ToothNumber, ToothRecord, SoapSection, AssignedRisk, RiskLibraryItem, SoapSectionType, recordRiskEvent, RiskCategory } from '../../domain/dentalTypes';
import { RISK_LIBRARY } from '../../domain/riskLibrary';
import { SoapSectionBlock } from './SoapSectionBlock';
import { RiskLibraryPanel } from './RiskLibraryPanel';
import { AssignedRiskRow } from './AssignedRiskRow';
import { generateSoapSectionsForVisit } from '../../domain/NoteComposer';
import { loadTreatmentPlanWithItems } from '../../services/treatmentPlans';
import { Visit, TreatmentPlanItem } from '../../types';
import { evaluateVisitCompleteness, CompletenessResult } from '../../domain/CompletenessEngine';
import { TruthBlocksPanel } from './TruthBlocksPanel';
import { ClinicalNoteEditor } from './ClinicalNoteEditor';
import { composeSectionsFromAssertions } from '../../domain/TruthAssertions';

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
  procedures?: TreatmentPlanItem[]; // New: Pass relevant procedures
}

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
  seededProcedureIds = [],
  procedures = []
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
      dismissUndo,
      truthAssertions, // Added
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

  // Improvement: Auto-detect risk categories based on procedures
  const recommendedRiskCategories = useMemo(() => {
      if (procedures.length > 0) return getRiskCategoriesForProcedures(procedures);
      return [];
  }, [procedures]);

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
      const { sections: generatedSections, note } = generateSoapSectionsForVisit(
          mockVisit,
          proceduresForNote,
          assignedRisks,
          soapSections
      );

      // V2.5: Apply truth assertions override
      let finalSections = generatedSections;
      if (truthAssertions && truthAssertions.assertions && truthAssertions.assertions.length > 0) {
          finalSections = composeSectionsFromAssertions(generatedSections, truthAssertions);
      }

      // 3. Calculate Completeness
      const completenessResult = evaluateVisitCompleteness(
          mockVisit, 
          proceduresForNote, 
          finalSections, // Use potentially overridden sections
          assignedRisks
      );
      setCompleteness(completenessResult);

      // 4. Apply updates
      // Use bulk update to ensure atomicity and prevent stale closures
      setSoapSections(finalSections);

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
        relevantProcedures={procedures}
        recommendedRiskCategories={recommendedRiskCategories}
        // V2.0 Inline Facts
        truthAssertions={truthAssertions}
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
