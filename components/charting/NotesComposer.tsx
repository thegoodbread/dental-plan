
import React, { useState, useEffect, useRef } from 'react';
import { useChairside } from '../../context/ChairsideContext';
import { GoogleGenAI } from "@google/genai";
import { 
  ArrowLeft, Save, RefreshCw, CheckCircle2,
  PanelRightClose, PanelRightOpen, ShieldCheck, Trash2, Info, FileText, AlertTriangle, Search
} from 'lucide-react';
import { ToothNumber, ToothRecord, SoapSection, AssignedRisk, RiskLibraryItem, SoapSectionType } from '../../domain/dentalTypes';
import { SoapSectionBlock } from './SoapSectionBlock';
import { RiskLibraryPanel } from './RiskLibraryPanel';

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
  // Risks inserted here in render
  'PLAN'
];

const SECTION_LABELS: Record<SoapSectionType, string> = {
  'SUBJECTIVE': 'Subjective / Chief Complaint',
  'OBJECTIVE': 'Objective Findings',
  'ASSESSMENT': 'Assessment / Diagnosis',
  'TREATMENT_PERFORMED': 'Treatment Performed',
  'PLAN': 'Plan / Next Steps'
};

export const NotesComposer: React.FC<NotesComposerProps> = ({ activeToothNumber }) => {
  const { setCurrentView, addTimelineEvent } = useChairside();
  
  // -- STATE --
  const [soapSections, setSoapSections] = useState<SoapSection[]>([]);
  const [assignedRisks, setAssignedRisks] = useState<AssignedRisk[]>([]);
  
  const [isSaving, setIsSaving] = useState(false);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  
  // Ref for auto-scrolling to risks
  const riskSectionRef = useRef<HTMLDivElement>(null);

  // Initialize SOAP Template
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
  }, []);

  // -- HANDLERS --

  const handleUpdateSoap = (id: string, newContent: string) => {
      setIsSaving(true);
      setSoapSections(prev => prev.map(s => s.id === id ? { ...s, content: newContent, lastEditedAt: new Date().toISOString() } : s));
      setTimeout(() => setIsSaving(false), 600);
  };

  const handleAssignRisk = (riskItem: RiskLibraryItem) => {
      // Prevent duplicates
      if (assignedRisks.some(r => r.riskLibraryItemId === riskItem.id)) return;

      const newAssignment: AssignedRisk = {
          id: `ar-${Date.now()}`,
          riskLibraryItemId: riskItem.id,
          riskTitle: riskItem.title,
          riskBody: riskItem.body,
          severity: riskItem.severity,
          assignedAt: new Date().toISOString()
      };
      setAssignedRisks(prev => [...prev, newAssignment]);
      
      // Auto-scroll to risk section to show feedback
      if (riskSectionRef.current) {
          riskSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
  };

  const handleRemoveRisk = (id: string) => {
      setAssignedRisks(prev => prev.filter(r => r.id !== id));
  };

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
      addTimelineEvent({
        type: 'NOTE',
        title: 'Clinical Note Finalized',
        details: 'Comprehensive SOAP note signed.',
        provider: 'Dr. Smith'
      });
      setCurrentView('DASHBOARD');
  };

  // Helper to get severity color for the list
  const getSeverityBadgeClass = (s: string) => {
      switch(s) {
          case 'COMMON': return 'bg-blue-100 text-blue-700 border-blue-200';
          case 'UNCOMMON': return 'bg-amber-100 text-amber-700 border-amber-200';
          case 'RARE': return 'bg-orange-100 text-orange-700 border-orange-200';
          case 'VERY_RARE': return 'bg-red-100 text-red-700 border-red-200';
          default: return 'bg-slate-100 text-slate-600 border-slate-200';
      }
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
                // If we are at the PLAN section, inject the Risks card right BEFORE it
                if (section.type === 'PLAN') {
                    return (
                        <React.Fragment key="risk-insertion">
                            {/* INFORMED CONSENT & RISKS CARD */}
                            <div ref={riskSectionRef} className="bg-white rounded-md border border-slate-300 shadow-sm overflow-hidden">
                                <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                                    <div className="flex items-center gap-2">
                                        <ShieldCheck size={16} className="text-slate-500" />
                                        <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Informed Consent & Risks</h3>
                                    </div>
                                    <span className="text-[10px] font-medium text-slate-400 bg-white px-2 py-0.5 rounded border border-slate-200">
                                        {assignedRisks.length} Assigned
                                    </span>
                                </div>
                                
                                {assignedRisks.length === 0 ? (
                                    <div className="p-8 flex flex-col items-center justify-center text-center">
                                        <div className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center mb-3 border border-slate-100">
                                            <AlertTriangle size={18} className="text-slate-300" />
                                        </div>
                                        <p className="text-sm font-medium text-slate-900">No risks assigned yet.</p>
                                        <p className="text-xs text-slate-500 max-w-[240px] mt-1">
                                            Use the library panel on the right to select relevant informed-consent risks.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="divide-y divide-slate-100">
                                        {assignedRisks.map(risk => (
                                            <div key={risk.id} className="group flex items-start gap-3 p-3 hover:bg-slate-50 transition-colors">
                                                <div className={`mt-0.5 shrink-0 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border ${getSeverityBadgeClass(risk.severity)}`}>
                                                    {risk.severity.charAt(0)}
                                                </div>
                                                <div className="flex-1 min-w-0 cursor-pointer" onClick={(e) => {
                                                    // Toggle expand logic could go here, currently strictly list
                                                    const target = e.currentTarget.nextElementSibling as HTMLElement;
                                                    if(target) target.classList.toggle('hidden');
                                                }}>
                                                    <div className="flex items-baseline gap-2">
                                                        <span className="text-sm font-semibold text-slate-900">{risk.riskTitle}</span>
                                                    </div>
                                                    <p className="text-xs text-slate-500 truncate mt-0.5">{risk.riskBody}</p>
                                                    {/* Expanded View (Hidden by default, shown on click logic implemented via details/summary or simple state if needed, here implies simple list) */}
                                                </div>
                                                <button 
                                                    onClick={() => handleRemoveRisk(risk.id)}
                                                    className="p-1.5 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                                    title="Remove Risk"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                
                                {assignedRisks.length > 0 && (
                                    <div className="bg-slate-50/50 p-2 text-[10px] text-slate-400 text-center border-t border-slate-100">
                                        Documented: Patient verbalized understanding of risks.
                                    </div>
                                )}
                            </div>

                            {/* THEN RENDER THE PLAN SECTION */}
                            <SoapSectionBlock 
                                key={section.id} 
                                section={section} 
                                onSave={handleUpdateSoap}
                                onDictate={() => alert("Dictation")}
                                onAiDraft={() => generateSoapDraft(section.type)}
                            />
                        </React.Fragment>
                    );
                }

                // Render other sections normally
                return (
                    <SoapSectionBlock 
                        key={section.id} 
                        section={section} 
                        onSave={handleUpdateSoap}
                        onDictate={() => alert("Dictation")}
                        onAiDraft={() => generateSoapDraft(section.type)}
                    />
                );
            })}
          </div>
        </div>

        {/* RIGHT: RISK LIBRARY PANEL (Fixed Width, Independent Scroll) */}
        {rightPanelOpen && (
          <div className="w-[400px] shrink-0 bg-white border-l border-slate-300 shadow-xl z-20 flex flex-col h-full">
             <RiskLibraryPanel 
                assignedRiskIds={assignedRisks.map(r => r.riskLibraryItemId)}
                onAssignRisk={handleAssignRisk}
             />
          </div>
        )}

      </div>
    </div>
  );
};
