
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useChairside } from '../../context/ChairsideContext';
import { GoogleGenAI } from "@google/genai";
import { 
  ArrowLeft, Save, PanelRightClose, PanelRightOpen, ShieldCheck, AlertTriangle, Wand2, Lightbulb, Activity, CheckCircle2, Plus, X, Trash2
} from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';

import { ToothNumber, ToothRecord, SoapSection, AssignedRisk, RiskLibraryItem, SoapSectionType, recordRiskEvent, VisitType } from '../../domain/dentalTypes';
import { RISK_LIBRARY } from '../../domain/riskLibrary';
import { SoapSectionBlock } from './SoapSectionBlock';
import { RiskLibraryPanel } from './RiskLibraryPanel';
import { AssignedRiskRow } from './AssignedRiskRow';

interface NotesComposerProps {
  activeToothNumber: ToothNumber | null;
  activeToothRecord: ToothRecord | null;
  onToothClick: (tooth: ToothNumber) => void;
  activeTreatmentItemId?: string | null;
  activePhaseId?: string | number | null;
  viewMode: 'drawer' | 'page'; // Strict mode separation
  pendingProcedure?: { label: string; teeth: number[] }; // New prop for active composition context
}

type NoteMode = 'QUICK' | 'FULL';

const SECTION_ORDER: SoapSectionType[] = [
  'SUBJECTIVE',
  'OBJECTIVE',
  'ASSESSMENT',
  'TREATMENT_PERFORMED',
  'PLAN'
];

const SECTION_LABELS: Record<SoapSectionType, string> = {
  'SUBJECTIVE': 'Subjective / Chief Complaint',
  'OBJECTIVE': 'Objective Findings',
  'ASSESSMENT': 'Assessment / Diagnosis',
  'TREATMENT_PERFORMED': 'Treatment Performed',
  'PLAN': 'Plan / Next Steps'
};

const generateId = () => Math.random().toString(36).substr(2, 9);

// Map QuickAction labels to CDT codes for risk lookup
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

async function requestSoapDraftFromBackend(
  sectionType: SoapSectionType,
  promptContext: { toothNumber?: ToothNumber | null; visitType?: VisitType; procedureLabel?: string; }
): Promise<string> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const procedureContext = promptContext.procedureLabel ? ` for a ${promptContext.procedureLabel}` : '';
  const toothContext = promptContext.toothNumber ? ` on tooth #${promptContext.toothNumber}` : '';

  const promptMap: Record<string, string> = {
      'SUBJECTIVE': `Summarize a typical chief complaint${procedureContext}${toothContext}.`,
      'OBJECTIVE': `List standard objective findings${procedureContext}${toothContext}.`,
      'ASSESSMENT': `Write a sample diagnosis${procedureContext}${toothContext}.`,
      'TREATMENT_PERFORMED': `Draft a standard narrative${procedureContext}${toothContext}, including anesthesia and isolation details.`,
      'PLAN': `Draft post-op instructions${procedureContext}.`
  };

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `You are a dental assistant. ${promptMap[sectionType] || "Draft a clinical note section."} Keep it concise, professional, and clinical.`,
    });
    return response.text || "";
  } catch (e) {
    console.error("AI Generation Error", e);
    return "Could not generate draft. Please try again.";
  }
}

export const NotesComposer: React.FC<NotesComposerProps> = ({ 
  activeToothNumber,
  activeToothRecord,
  activeTreatmentItemId,
  activePhaseId,
  viewMode, // 'drawer' | 'page'
  pendingProcedure
}) => {
  const { 
      setCurrentView, 
      addTimelineEvent,
      currentTenantId,
      currentPatientId,
      currentTreatmentPlanId,
      currentNoteId,
      currentUserId 
  } = useChairside();
  
  // -- STATE --
  const [noteMode, setNoteMode] = useState<NoteMode>('QUICK');
  const [soapSections, setSoapSections] = useState<SoapSection[]>([]);
  const [assignedRisks, setAssignedRisks] = useState<AssignedRisk[]>([]);
  
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  
  const riskSectionRef = useRef<HTMLDivElement>(null);

  // DnD Sensors (Only used in Page mode)
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor)
  );

  // Persistence Key
  const buildRiskStorageKey = () => `dental_assigned_risks:${currentPatientId}:${currentNoteId}`;

  // Initialize
  useEffect(() => {
    if (soapSections.length === 0) {
        const initialSections: SoapSection[] = SECTION_ORDER.map(type => ({
            id: `s-${type}`,
            type,
            title: SECTION_LABELS[type],
            content: '',
            lastEditedAt: new Date().toISOString()
        }));
        setSoapSections(initialSections);
    }

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
      const key = buildRiskStorageKey();
      localStorage.setItem(key, JSON.stringify(risks));
  };

  // -- CALCULATE SUGGESTIONS --
  const suggestedRiskIds = useMemo(() => {
    let codes: string[] = [];
    
    // 1. From pending procedure (Composer Selection)
    if (pendingProcedure) {
        const mapped = QUICK_ACTION_TO_CODES[pendingProcedure.label];
        if (mapped) codes.push(...mapped);
    }

    // 2. From existing tooth record (History)
    if (activeToothRecord) {
        codes.push(...activeToothRecord.procedures.map(p => p.code));
    }
    
    return getSuggestedRiskIdsForProcedures(codes);
  }, [activeToothRecord, pendingProcedure]);

  // -- HANDLERS --

  const handleUpdateSoap = (id: string, newContent: string) => {
      setSoapSections(prev => prev.map(s => s.id === id ? { ...s, content: newContent, lastEditedAt: new Date().toISOString() } : s));
  };

  const handleInsertChartFindings = () => {
    let textToInsert = "";
    
    // Build chart string
    let chartSummary = "";
    if (pendingProcedure) {
        chartSummary = `Scheduled: ${pendingProcedure.label} ${pendingProcedure.teeth.length > 0 ? 'on #' + pendingProcedure.teeth.join(',#') : ''}. `;
    }
    
    if (activeToothNumber) {
      if (activeToothRecord) {
          const conditions = (activeToothRecord.conditions ?? []).map(c => c.label).join(", ");
          const procedures = (activeToothRecord.procedures ?? [])
              .filter(p => p.status === 'completed' || p.status === 'planned') 
              .map(p => p.name).join(", ");
          
          const findings = [];
          if (conditions) findings.push(conditions);
          if (procedures) findings.push(`Tx: ${procedures}`);
          
          if (findings.length > 0) {
              chartSummary += `Tooth #${activeToothNumber} History: ${findings.join("; ")}.`;
          }
      }
    } 
    
    textToInsert = chartSummary || "[Describe objective findings for this visit here].";

    setSoapSections(prev => prev.map(s => {
      if (s.type === 'OBJECTIVE') {
        const newContent = s.content ? `${s.content}\n${textToInsert}` : textToInsert;
        return { ...s, content: newContent, lastEditedAt: new Date().toISOString() };
      }
      return s;
    }));
  };

  const handleAssignRisk = (riskItem: RiskLibraryItem) => {
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
      const updatedRisks = assignedRisks.map(r => {
          if (r.id === id) {
              return {
                  ...r,
                  isActive: false,
                  removedAt: new Date().toISOString(),
                  removedByUserId: currentUserId,
                  lastUpdatedAt: new Date().toISOString()
              };
          }
          return r;
      });
      setAssignedRisks(updatedRisks);
      persistRisks(updatedRisks);
  };

  const handleToggleRiskExpand = (id: string) => {
      const updatedRisks = assignedRisks.map(r => 
          r.id === id ? { ...r, isExpanded: !r.isExpanded, lastUpdatedAt: new Date().toISOString() } : r
      );
      setAssignedRisks(updatedRisks);
      persistRisks(updatedRisks);
  };

  const handleUpdateConsent = (id: string, updates: Partial<AssignedRisk>) => {
      const updatedRisks = assignedRisks.map(r => {
          if (r.id === id) {
              return {
                  ...r,
                  ...updates,
                  consentCapturedByUserId: updates.consentCapturedAt ? currentUserId : r.consentCapturedByUserId,
                  lastUpdatedAt: new Date().toISOString(),
                  lastUpdatedByUserId: currentUserId
              };
          }
          return r;
      });
      setAssignedRisks(updatedRisks);
      persistRisks(updatedRisks);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = activeRisks.findIndex((r) => r.id === active.id);
    const newIndex = activeRisks.findIndex((r) => r.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const newOrder = arrayMove(activeRisks, oldIndex, newIndex);
    
    setAssignedRisks((prev) => {
      const updatedActive = newOrder.map((risk, index) => ({
        ...risk,
        sortOrder: index,
        lastUpdatedAt: new Date().toISOString()
      }));
      const activeIds = new Set(updatedActive.map((r) => r.id));
      const others = prev.filter((r) => !activeIds.has(r.id));
      const finalList = [...updatedActive, ...others];
      persistRisks(finalList);
      return finalList;
    });
  };

  const activeRisks = assignedRisks.filter(r => r.isActive).sort((a, b) => a.sortOrder - b.sortOrder);

  // -- AI CALL --
  const generateSoapDraft = async (sectionType: SoapSectionType) => {
      setAiLoading(true);
      try {
          const text = await requestSoapDraftFromBackend(sectionType, {
              toothNumber: activeToothNumber,
              visitType: 'restorative',
              procedureLabel: pendingProcedure?.label
          });
          setSoapSections(prev => prev.map(s => {
              if (s.type === sectionType) {
                  return { ...s, content: s.content ? s.content + '\n' + text : text };
              }
              return s;
          }));
      } catch (e) {
          console.error("Draft failed");
      } finally {
          setAiLoading(false);
      }
  };

  const handleFinalize = () => {
      addTimelineEvent({
        type: 'NOTE',
        title: 'Clinical Note Finalized',
        details: 'Comprehensive SOAP note signed.',
        provider: 'Dr. Smith'
      });
      setCurrentView('DASHBOARD');
  };

  // Determine context label
  let contextLabel = 'General Visit';
  if (pendingProcedure) {
      contextLabel = `${pendingProcedure.label} ${pendingProcedure.teeth.length > 0 ? '#' + pendingProcedure.teeth.join(',') : ''}`;
  } else if (activeToothNumber) {
      contextLabel = `Tooth #${activeToothNumber}`;
  }
  
  // -- MODE LOGIC --
  // In Drawer mode, we only show S, O, A, P. Treatment Performed is optional or part of O.
  const displayedSections = soapSections.filter(s => {
      if (viewMode === 'drawer') return ['SUBJECTIVE', 'OBJECTIVE', 'ASSESSMENT', 'PLAN'].includes(s.type);
      // In page mode, always show all sections regardless of 'noteMode' state
      return true; 
  });

  return (
    <div className={`flex flex-col h-full bg-slate-100 font-sans text-slate-900 overflow-hidden`}>
      
      {/* 1. HEADER (Only in Full Page Mode) */}
      {viewMode === 'page' && (
        <>
          <div className="bg-white border-b border-slate-300 flex items-center justify-between px-4 py-2.5 shadow-sm z-30 shrink-0">
            <div className="flex items-center gap-4">
              <button onClick={() => setCurrentView('DASHBOARD')} className="p-1.5 -ml-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors">
                <ArrowLeft size={18} />
              </button>
              <h2 className="text-lg font-bold text-slate-800">Clinical Note Editor</h2>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => setRightPanelOpen(!rightPanelOpen)} className={`p-2 rounded-md border transition-all hidden md:flex ${rightPanelOpen ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'}`} title={rightPanelOpen ? "Hide Library" : "Show Library"}>
                {rightPanelOpen ? <PanelRightOpen size={18} /> : <PanelRightClose size={18} />}
              </button>
              <button onClick={handleFinalize} className="h-9 px-4 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-md shadow-sm flex items-center gap-2 transition-all">
                <Save size={16} /> Sign
              </button>
            </div>
          </div>
          <div className="bg-blue-50/50 border-b border-blue-100 px-4 py-2 flex items-center justify-between text-xs text-blue-800">
            <div className="flex items-center gap-3">
                <span className="font-bold bg-white px-2 py-0.5 rounded border border-blue-200 shadow-sm">
                    {contextLabel}
                </span>
                {activeToothRecord && (
                    <div className="flex gap-2 text-blue-600">
                        <span className="flex items-center gap-1"><Activity size={12}/> {activeToothRecord.conditions.length} conditions</span>
                        <span className="opacity-50">|</span>
                        <span className="flex items-center gap-1"><CheckCircle2 size={12}/> {activeToothRecord.procedures.length} procedures</span>
                    </div>
                )}
            </div>
            <div className="flex items-center gap-1 font-medium">
                <ShieldCheck size={12} className={activeRisks.length > 0 ? "text-green-600" : "text-slate-400"} />
                <span>{activeRisks.length} active risks</span>
            </div>
          </div>
        </>
      )}

      {/* 2. MAIN CONTENT AREA */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* LEFT COLUMN: SOAP Content */}
        <div className="flex-1 overflow-y-auto relative bg-slate-100 custom-scrollbar">
          <div className={`mx-auto p-4 space-y-4 pb-20 ${viewMode === 'page' ? 'max-w-4xl' : 'max-w-full'}`}>
            
            {/* Render Sections */}
            {displayedSections.map(section => {
                const isObjective = section.type === 'OBJECTIVE';
                
                return (
                    <SoapSectionBlock 
                        key={section.id} 
                        section={section}
                        contextLabel={contextLabel}
                        onSave={handleUpdateSoap}
                        onDictate={() => alert("Dictation placeholder")}
                        onAiDraft={() => generateSoapDraft(section.type)}
                        onInsertChartFindings={isObjective ? handleInsertChartFindings : undefined}
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
                    
                    {/* 1. SUGGESTED RISKS (CHIPS) - Always visible in Drawer */}
                    {suggestedRiskIds.length > 0 && (
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
                                            onClick={() => handleAssignRisk(risk)}
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

                    {/* 2. ASSIGNED RISKS LIST */}
                    {activeRisks.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-4 text-slate-400">
                            <p className="text-xs italic">No risks assigned.</p>
                        </div>
                    ) : (
                        viewMode === 'drawer' ? (
                            // Drawer Mode: Simple List (No Drag, No Heavy Metadata)
                            <div className="space-y-2">
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Assigned</div>
                                {activeRisks.map(risk => (
                                    <div key={risk.id} className="flex justify-between items-center bg-white p-2 rounded border border-slate-200 shadow-sm">
                                        <span className="text-xs font-semibold text-slate-700">{risk.titleSnapshot}</span>
                                        <button 
                                            onClick={() => handleRemoveRisk(risk.id)}
                                            className="text-slate-300 hover:text-red-500 p-1"
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            // Page Mode: Full Draggable List with Consent Controls
                            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                                <SortableContext items={activeRisks.map(r => r.id)} strategy={verticalListSortingStrategy}>
                                    <div className="space-y-1">
                                        {activeRisks.map(risk => (
                                            <AssignedRiskRow 
                                                key={risk.id}
                                                risk={risk}
                                                onToggleExpand={handleToggleRiskExpand}
                                                onRemove={handleRemoveRisk}
                                                onUpdateConsent={handleUpdateConsent}
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

        {/* RIGHT COLUMN: RISK LIBRARY (Only in Full Page Mode) */}
        {viewMode === 'page' && rightPanelOpen && (
          <div className={`shrink-0 bg-white border-l border-slate-300 shadow-xl z-20 w-[320px] md:w-[380px] h-full flex flex-col`}>
             <RiskLibraryPanel 
                assignedRiskIds={activeRisks.map(r => r.riskLibraryItemId)}
                onAssignRisk={handleAssignRisk}
                tenantId={currentTenantId}
             />
          </div>
        )}

      </div>
    </div>
  );
};
