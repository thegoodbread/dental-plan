
import React, { useState, useEffect, useRef } from 'react';
import { useChairside } from '../../context/ChairsideContext';
import { GoogleGenAI } from "@google/genai";
import { 
  ArrowLeft, Save, PanelRightClose, PanelRightOpen, ShieldCheck, AlertTriangle, Wand2
} from 'lucide-react';
import { ToothNumber, ToothRecord, SoapSection, AssignedRisk, RiskLibraryItem, SoapSectionType } from '../../domain/dentalTypes';
import { SoapSectionBlock } from './SoapSectionBlock';
import { RiskLibraryPanel } from './RiskLibraryPanel';
import { AssignedRiskRow } from './AssignedRiskRow';

interface NotesComposerProps {
  activeToothNumber: ToothNumber | null;
  activeToothRecord: ToothRecord | null;
  onToothClick: (tooth: ToothNumber) => void;
}

const SECTION_ORDER: SoapSectionType[] = [
  'SUBJECTIVE',
  'OBJECTIVE',
  'ASSESSMENT',
  'TREATMENT_PERFORMED',
  // RISKS inserted here in render
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

export const NotesComposer: React.FC<NotesComposerProps> = ({ activeToothNumber }) => {
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
  const [soapSections, setSoapSections] = useState<SoapSection[]>([]);
  const [assignedRisks, setAssignedRisks] = useState<AssignedRisk[]>([]);
  
  const [isSaving, setIsSaving] = useState(false);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  
  // Ref for auto-scrolling to risks
  const riskSectionRef = useRef<HTMLDivElement>(null);

  // Helper for Scoped Persistence
  const buildRiskStorageKey = () => `dental_assigned_risks:${currentPatientId}:${currentNoteId}`;

  // Initialize SOAP Template & Risks
  useEffect(() => {
    // Load SOAP
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

    // Load Risks from Scoped Storage
    const key = buildRiskStorageKey();
    const storedRisks = localStorage.getItem(key);
    if (storedRisks) {
        try {
            setAssignedRisks(JSON.parse(storedRisks));
        } catch (e) {
            console.error("Failed to load risks", e);
        }
    } else {
        setAssignedRisks([]);
    }
  }, [currentPatientId, currentNoteId]);

  const persistRisks = (risks: AssignedRisk[]) => {
      const key = buildRiskStorageKey();
      localStorage.setItem(key, JSON.stringify(risks));
  };

  // -- HANDLERS --

  const handleUpdateSoap = (id: string, newContent: string) => {
      setIsSaving(true);
      setSoapSections(prev => prev.map(s => s.id === id ? { ...s, content: newContent, lastEditedAt: new Date().toISOString() } : s));
      setTimeout(() => setIsSaving(false), 600);
  };

  // 1. ADDING A RISK (Production Spec)
  const handleAssignRisk = (riskItem: RiskLibraryItem) => {
      // Check if already active to prevent duplicates
      if (assignedRisks.some(r => r.riskLibraryItemId === riskItem.id && r.isActive)) return;

      const activeCount = assignedRisks.filter(r => r.isActive).length;

      const newAssignment: AssignedRisk = {
          id: `ar-${generateId()}`,
          
          // Linkage - Using real context
          tenantId: currentTenantId,
          patientId: currentPatientId,
          treatmentPlanId: currentTreatmentPlanId,
          clinicalNoteId: currentNoteId,
          
          // Library Reference
          riskLibraryItemId: riskItem.id,
          riskLibraryVersion: riskItem.version || 1,

          // Snapshot (Immutable)
          titleSnapshot: riskItem.title,
          bodySnapshot: riskItem.body,
          severitySnapshot: riskItem.severity,
          categorySnapshot: riskItem.category,
          cdtCodesSnapshot: riskItem.procedureCodes || [],

          // Consent Defaults
          consentMethod: 'VERBAL',
          
          // UI + Ordering
          isActive: true,
          sortOrder: activeCount, // Append to end
          isExpanded: false,

          // Audit
          addedAt: new Date().toISOString(),
          addedByUserId: currentUserId,
          lastUpdatedAt: new Date().toISOString(),
      };

      const updatedRisks = [...assignedRisks, newAssignment];
      setAssignedRisks(updatedRisks);
      persistRisks(updatedRisks);
      
      // Auto-scroll to risk section to show feedback
      if (riskSectionRef.current) {
          riskSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
  };

  // 3. REMOVING A RISK (Soft Delete)
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

  // 5. EXPAND/COLLAPSE - Now Persisted
  const handleToggleRiskExpand = (id: string) => {
      const updatedRisks = assignedRisks.map(r => 
          r.id === id ? { ...r, isExpanded: !r.isExpanded, lastUpdatedAt: new Date().toISOString() } : r
      );
      setAssignedRisks(updatedRisks);
      persistRisks(updatedRisks);
  };

  // 6. UPDATE CONSENT (Metadata)
  const handleUpdateConsent = (id: string, updates: Partial<AssignedRisk>) => {
      const updatedRisks = assignedRisks.map(r => {
          if (r.id === id) {
              return {
                  ...r,
                  ...updates,
                  // If we are capturing, ensure we stamp the user
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

  // 4. SORTING (SortOrder updates)
  const handleReorder = (newOrder: AssignedRisk[]) => {
      const updated = newOrder.map((risk, index) => ({
        ...risk,
        sortOrder: index,
        lastUpdatedAt: new Date().toISOString()
      }));
      setAssignedRisks(updated);
      persistRisks(updated);
  };

  // Derived state for display
  const activeRisks = assignedRisks
      .filter(r => r.isActive)
      .sort((a, b) => a.sortOrder - b.sortOrder);

  // -- AI HELPERS --

  const generateSoapDraft = async (sectionType: string) => {
      setAiLoading(true);
      const promptMap: Record<string, string> = {
          'SUBJECTIVE': "Summarize a typical chief complaint for a restorative visit.",
          'OBJECTIVE': "List standard objective findings for a carious lesion on a posterior tooth.",
          'ASSESSMENT': "Write a sample diagnosis for irreversible pulpitis or deep caries.",
          'TREATMENT_PERFORMED': "Draft a standard narrative for a composite filling on a posterior tooth, including anesthesia and isolation details.",
          'PLAN': "Draft post-op instructions for a filling."
      };

      try {
          const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
          const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `You are a dental assistant. ${promptMap[sectionType] || "Draft a clinical note section."} Keep it concise, professional, and clinical.`,
          });
          const text = response.text || "";
          setSoapSections(prev => prev.map(s => {
              if (s.type === sectionType) {
                  return { ...s, content: s.content ? s.content + '\n' + text : text };
              }
              return s;
          }));
      } catch (e) {
          console.error("AI Error", e);
          alert("AI Service unavailable.");
      } finally {
          setAiLoading(false);
      }
  };

  const handleFinalize = () => {
      // Create a copy of what needs to be saved
      const finalNote = {
          sections: soapSections,
          risks: activeRisks
      };
      console.log("Finalizing Note:", finalNote);

      addTimelineEvent({
        type: 'NOTE',
        title: 'Clinical Note Finalized',
        details: 'Comprehensive SOAP note signed.',
        provider: 'Dr. Smith'
      });
      setCurrentView('DASHBOARD');
  };

  return (
    <div className="flex flex-col h-full bg-slate-100 font-sans text-slate-900 overflow-hidden">
      
      {/* 1. COMPACT HEADER */}
      <div className="h-14 bg-white border-b border-slate-300 flex items-center justify-between px-4 shadow-sm z-30 shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={() => setCurrentView('DASHBOARD')} className="p-1.5 -ml-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors">
            <ArrowLeft size={18} />
          </button>
          <div className="flex items-center gap-3 border-l border-slate-200 pl-4 h-8">
            <div>
                <h1 className="text-sm font-bold text-slate-900 leading-none">Clinical Note</h1>
                <div className="flex items-center gap-2 mt-0.5">
                    {activeToothNumber && (
                        <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-1.5 py-px rounded border border-slate-200">
                            Tooth #{activeToothNumber}
                        </span>
                    )}
                    <span className="text-[10px] text-slate-400">
                        {isSaving ? 'Saving...' : 'Saved'}
                    </span>
                </div>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setRightPanelOpen(!rightPanelOpen)}
            className={`p-2 rounded-md border transition-all hidden md:flex ${rightPanelOpen ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'}`}
            title={rightPanelOpen ? "Hide Library" : "Show Library"}
          >
            {rightPanelOpen ? <PanelRightOpen size={18} /> : <PanelRightClose size={18} />}
          </button>
          <button onClick={handleFinalize} className="h-9 px-4 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-md shadow-sm flex items-center gap-2 transition-all">
            <Save size={16} /> Sign & Close
          </button>
        </div>
      </div>

      {/* 2. MAIN WORKSPACE - 2 COLUMN GRID */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* LEFT: SOAP NARRATIVE */}
        <div className="flex-1 overflow-y-auto relative bg-slate-100 custom-scrollbar">
          <div className="max-w-4xl mx-auto p-6 space-y-4 pb-20">
            
            {/* Render Sections in Order */}
            {soapSections.map(section => {
                // RENDER NORMAL SECTIONS
                const sectionBlock = (
                    <SoapSectionBlock 
                        key={section.id} 
                        section={section} 
                        onSave={handleUpdateSoap}
                        onDictate={() => alert("Dictation")}
                        onAiDraft={() => generateSoapDraft(section.type)}
                    />
                );

                // Inject RISKS after Treatment Performed
                if (section.type === 'TREATMENT_PERFORMED') {
                    return (
                        <React.Fragment key={section.id}>
                            {sectionBlock}
                            
                            {/* --- ASSIGNED RISKS CONTAINER --- */}
                            <div ref={riskSectionRef} className="pt-2">
                                <div className="flex items-center gap-3 mb-2 px-1">
                                    <div className="h-px bg-slate-300 flex-1"></div>
                                    <div className="flex items-center gap-2 text-slate-500">
                                        <ShieldCheck size={14} />
                                        <span className="text-[10px] font-bold uppercase tracking-widest">Informed Consent & Risks</span>
                                    </div>
                                    <div className="h-px bg-slate-300 flex-1"></div>
                                </div>

                                <div className="bg-slate-50 rounded-lg border border-slate-200 p-2 shadow-inner min-h-[100px]">
                                    {activeRisks.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-8 text-slate-400">
                                            <AlertTriangle size={20} className="mb-2 opacity-50" />
                                            <p className="text-xs font-medium">No risks assigned.</p>
                                            <p className="text-[10px] text-slate-400 mt-1">Select from the library panel to document consent.</p>
                                        </div>
                                    ) : (
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
                                    )}
                                    
                                    {activeRisks.length > 0 && (
                                        <div className="mt-3 text-center">
                                            <p className="text-[10px] text-slate-400 font-medium bg-white inline-block px-3 py-1 rounded-full border border-slate-100 shadow-sm">
                                                Documented: Patient verbalized understanding of risks.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                            {/* ------------------------------- */}
                        </React.Fragment>
                    );
                }

                return sectionBlock;
            })}
          </div>
        </div>

        {/* RIGHT: RISK LIBRARY PANEL */}
        {rightPanelOpen && (
          <div className="w-[400px] shrink-0 bg-white border-l border-slate-300 shadow-xl z-20 flex flex-col h-full">
             <RiskLibraryPanel 
                assignedRiskIds={activeRisks.map(r => r.riskLibraryItemId)}
                onAssignRisk={handleAssignRisk}
             />
          </div>
        )}

      </div>
    </div>
  );
};
