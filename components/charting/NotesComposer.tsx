
import React, { useState, useEffect, useRef } from 'react';
import { useChairside } from '../../context/ChairsideContext';
import { GoogleGenAI } from "@google/genai";
import { 
  ArrowLeft, Save, Wand2, ChevronDown, ChevronUp, 
  Sparkles, FileText, User, Calendar, RefreshCw, CheckCircle2,
  LayoutTemplate, X, ClipboardList, ChevronRight, Activity, 
  AlertTriangle, Image as ImageIcon, Syringe, BrainCircuit,
  Stethoscope, PanelRightClose, PanelRightOpen,
  Thermometer, Mic, ShieldCheck, History
} from 'lucide-react';

// --- TYPES & INTERFACES ---

type NoteSection = 'cc' | 'objective' | 'diagnosis' | 'treatment' | 'plan' | 'next';

interface ClinicalNoteState {
  cc: string;
  objective: string; // Findings
  diagnosis: string; // Assessment
  treatment: string; // Procedure details
  plan: string;      // Recommendations
  nextVisit: string;
  consent: 'Accepted' | 'Declined' | 'Deferred' | null;
}

// --- MOCK DATA ---
const RADIOGRAPHS = [
  { id: 'bw-r', label: 'R-BWX', date: 'Today' },
  { id: 'bw-l', label: 'L-BWX', date: 'Today' },
  { id: 'pa-14', label: 'PA #14', date: 'Today' },
  { id: 'pa-19', label: 'PA #19', date: 'Today' },
  { id: 'pano', label: 'PANO', date: 'Today' },
];

const DIAGNOSIS_CHIPS = [
  "Caries (Dentin)", "Caries (Enamel)", "Symptomatic Irreversible Pulpitis", "Necrotic Pulp", 
  "Acute Apical Abscess", "Cracked Tooth", "Chronic Periodontitis", "Gingivitis", "Healthy"
];

const NEXT_VISIT_OPTIONS = [
  "Crown Delivery (2wks)", "Restorative - Next Quad", "Endo Therapy", 
  "Extraction", "Hygiene/Recare (6mo)", "Post-Op Check (1wk)"
];

const LAST_VISIT_SUMMARY = {
  date: "6 months ago",
  cc: "Routine cleaning",
  dx: "Generalized Gingivitis",
  tx: "Prophylaxis, 4 BWX, Exam"
};

// --- HELPER COMPONENTS ---

const ToothGrid = ({ onSelectTooth, highlightedTeeth = [] }: { onSelectTooth: (t: number) => void, highlightedTeeth?: number[] }) => {
  // 1-32 Universal System
  const teeth = [
    1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16,
    32, 31, 30, 29, 28, 27, 26, 25, 24, 23, 22, 21, 20, 19, 18, 17
  ];

  return (
    <div className="grid grid-cols-8 gap-1.5 p-3 bg-slate-50 rounded-xl border border-slate-200">
      {teeth.map(t => {
        const isHighlighted = highlightedTeeth.includes(t);
        // Mocking some clinical status colors for visualization
        const statusColor = t === 14 ? 'border-purple-400 text-purple-700 bg-purple-50' // Fracture
                          : t === 19 ? 'border-red-400 text-red-700 bg-red-50' // Decay
                          : t === 3 ? 'border-blue-400 text-blue-700 bg-blue-50' // Existing
                          : 'border-slate-200 bg-white text-slate-500 hover:border-blue-400 hover:text-blue-600';
        
        return (
          <button
            key={t}
            onClick={() => onSelectTooth(t)}
            className={`
              aspect-square rounded-md flex items-center justify-center text-[10px] font-bold border transition-all
              ${isHighlighted ? 'ring-2 ring-blue-500 shadow-md transform scale-105 z-10' : ''}
              ${statusColor}
            `}
          >
            {t}
          </button>
        );
      })}
    </div>
  );
};

const SectionCard = ({ 
  title, icon: Icon, children, isCollapsed, onToggle, aiAction 
}: { 
  title: string; icon: any; children: React.ReactNode; isCollapsed?: boolean; onToggle?: () => void; aiAction?: React.ReactNode 
}) => (
  <div className={`bg-white rounded-xl border transition-all duration-300 ${isCollapsed ? 'border-slate-200 shadow-sm' : 'border-blue-200 shadow-lg shadow-blue-50 ring-1 ring-blue-100'}`}>
    <div className="px-4 py-3 flex justify-between items-center bg-gradient-to-r from-white to-slate-50/50 rounded-t-xl cursor-pointer select-none border-b border-transparent" onClick={onToggle}>
      <div className="flex items-center gap-3">
        <div className={`p-1.5 rounded-lg ${isCollapsed ? 'bg-slate-100 text-slate-400' : 'bg-blue-600 text-white shadow-sm'}`}>
          <Icon size={16} strokeWidth={2.5} />
        </div>
        <h3 className={`font-bold text-sm uppercase tracking-wide ${isCollapsed ? 'text-slate-500' : 'text-blue-900'}`}>{title}</h3>
      </div>
      <div className="flex items-center gap-2">
        {aiAction && <div onClick={e => e.stopPropagation()}>{aiAction}</div>}
        <button className="text-slate-400 hover:text-slate-600">
          {isCollapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
        </button>
      </div>
    </div>
    {!isCollapsed && <div className="p-5 border-t border-slate-100">{children}</div>}
  </div>
);

// --- MAIN COMPONENT ---

export const NotesComposer = () => {
  const { setCurrentView, addTimelineEvent, timeline, selectedTeeth } = useChairside();
  
  // State
  const [note, setNote] = useState<ClinicalNoteState>({
    cc: '', objective: '', diagnosis: '', treatment: '', plan: '', nextVisit: '', consent: null
  });
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({ plan: false, next: false });
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle'|'saving'|'saved'>('idle');
  const [activeToothForDx, setActiveToothForDx] = useState<number | null>(null);

  // Focus Refs
  const objectiveRef = useRef<HTMLTextAreaElement>(null);
  const diagnosisRef = useRef<HTMLTextAreaElement>(null);
  const treatmentRef = useRef<HTMLTextAreaElement>(null);

  // Auto-save simulation
  useEffect(() => {
    if (saveStatus === 'saving') {
      const t = setTimeout(() => setSaveStatus('saved'), 800);
      return () => clearTimeout(t);
    }
  }, [saveStatus]);

  const updateSection = (section: keyof ClinicalNoteState, value: any) => {
    setSaveStatus('saving');
    setNote(prev => ({ ...prev, [section]: value }));
  };

  const toggleCollapse = (section: string) => {
    setCollapsed(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const appendText = (section: keyof ClinicalNoteState, text: string) => {
    setSaveStatus('saving');
    setNote(prev => ({ 
      ...prev, 
      [section]: prev[section] ? `${prev[section]}\n${text}` : text 
    }));
  };

  // --- AI ACTIONS ---

  const generateWithGemini = async (prompt: string, targetSection: keyof ClinicalNoteState) => {
    setAiLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });
      
      const text = response.text || '';
      appendText(targetSection, text);
    } catch (e) {
      console.error("AI Error", e);
      alert("AI Service Unavailable. Please try again.");
    } finally {
      setAiLoading(false);
    }
  };

  const aiSummarizeIntake = () => {
    generateWithGemini(
      "Summarize a dental chief complaint for a patient stating: 'My upper right back tooth hurts when I drink cold water and it's been throbbing at night for 3 days.' Use professional clinical terminology.", 
      'cc'
    );
  };

  const aiGenerateRadiographFindings = () => {
    // FDA-Safe phrasing in prompt
    const prompt = `Generate a descriptive observation of a dental radiograph for tooth #14 and #19. 
    Describe visible radiolucencies or opacities. 
    Do NOT diagnose. Use phrases like 'radiolucency visible on distal aspect', 'consistent with', 'suggests need for clinical verification'.
    Format as bullet points.`;
    generateWithGemini(prompt, 'objective');
  };

  const aiGenerateTxNoteTemplate = (procedureTitle: string, toothNumbers: string) => {
    const prompt = `Generate a structured clinical note template for the dental procedure: ${procedureTitle} on Tooth/Teeth: ${toothNumbers}.
    
    Structure:
    Tooth ${toothNumbers} — ${procedureTitle}
    • Anesthesia: (Type/Amount)
    • Isolation: (Rubber Dam/Isolite/Cotton Rolls)
    • Procedure Details: (Step-by-step prep, decay removal, materials used)
    • Patient Tolerance: (Well/Fair/Poor)
    
    Leave placeholders for specific values.`;
    generateWithGemini(prompt, 'treatment');
  };

  const aiSuggestRecommendations = () => {
    generateWithGemini(
      "Suggest standard post-operative instructions for a Crown Prep and Root Canal procedure. Include warning signs to watch for. Use professional but patient-friendly language for the record.",
      'plan'
    );
  };

  // --- INTERACTION HANDLERS ---

  const handleToothTag = (t: number) => {
    // Context-aware insertion
    if (!collapsed['diagnosis'] && diagnosisRef.current) {
        setActiveToothForDx(t);
        // Scroll to DX section if needed
    } else if (!collapsed['objective']) {
        appendText('objective', `Tooth #${t}: `);
    } else {
        // Default fallthrough
        appendText('objective', `Tooth #${t}: `);
    }
  };

  const handleProcedureInsert = (procTitle: string, toothStr?: string) => {
    aiGenerateTxNoteTemplate(procTitle, toothStr || 'N/A');
  };

  const handleAddDiagnosis = (dx: string) => {
    if (activeToothForDx) {
      appendText('diagnosis', `Tooth #${activeToothForDx}: ${dx}`);
    } else {
      appendText('diagnosis', `${dx}`);
    }
  };

  const handleSaveNote = () => {
    addTimelineEvent({
      type: 'NOTE',
      title: 'Clinical Note Finalized',
      details: 'Comprehensive exam and treatment note.',
      provider: 'Dr. Smith'
    });
    setCurrentView('DASHBOARD');
  };

  return (
    <div className="flex flex-col h-full bg-slate-100 overflow-hidden font-sans text-slate-900">
      
      {/* 1. STICKY HEADER */}
      <div className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-6 shadow-sm z-30 shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={() => setCurrentView('DASHBOARD')} className="p-2 -ml-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-lg font-bold text-slate-900 leading-none">Clinical Note</h1>
            <div className="flex items-center gap-2 mt-1">
               <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">Restorative Visit</span>
               {saveStatus === 'saving' && <span className="text-xs text-blue-600 font-medium flex items-center gap-1"><RefreshCw size={10} className="animate-spin"/> Saving...</span>}
               {saveStatus === 'saved' && <span className="text-xs text-green-600 font-medium flex items-center gap-1"><CheckCircle2 size={10}/> Saved</span>}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setRightPanelOpen(!rightPanelOpen)}
            className={`p-2 rounded-lg border transition-all hidden md:flex ${rightPanelOpen ? 'bg-purple-50 border-purple-200 text-purple-700' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}
            title={rightPanelOpen ? "Close AI Copilot" : "Open AI Copilot"}
          >
            {rightPanelOpen ? <PanelRightOpen size={20} /> : <PanelRightClose size={20} />}
          </button>
          <button onClick={handleSaveNote} className="h-10 px-6 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-sm flex items-center gap-2 transition-all active:scale-95 shadow-blue-200">
            <Save size={18} /> <span className="hidden sm:inline">Sign & Save</span>
          </button>
        </div>
      </div>

      {/* 2. MAIN WORKSPACE */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* LEFT PANEL: CONTEXT (Fixed 320px) */}
        <div className="w-[320px] bg-white border-r border-slate-200 flex flex-col shrink-0 z-20 shadow-[4px_0_24px_rgba(0,0,0,0.02)] overflow-y-auto hidden lg:flex">
          
          {/* A. Tooth Chart Snapshot */}
          <div className="p-5 border-b border-slate-100">
            <div className="flex justify-between items-end mb-3">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                <Activity size={12}/> Odontogram
              </h3>
              <div className="flex gap-2 text-[9px] font-bold">
                <span className="text-red-500 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-red-500"></span> Decay</span>
                <span className="text-blue-500 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span> Existing</span>
              </div>
            </div>
            <ToothGrid onSelectTooth={handleToothTag} highlightedTeeth={selectedTeeth} />
            <p className="text-[10px] text-slate-400 mt-2 text-center bg-slate-50 py-1 rounded">Tap to insert #tag into active note section</p>
          </div>

          {/* B. Procedures Today */}
          <div className="p-5 border-b border-slate-100 bg-slate-50/30">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1">
                <ClipboardList size={12}/> Today's Procedures
            </h3>
            <div className="space-y-2">
              {timeline.filter(e => e.type === 'PROCEDURE').length === 0 ? (
                <div className="text-xs text-slate-400 italic text-center py-4 border-2 border-dashed border-slate-100 rounded-xl">No procedures recorded yet.</div>
              ) : (
                timeline.filter(e => e.type === 'PROCEDURE').map((proc, idx) => (
                  <div 
                    key={idx} 
                    onClick={() => handleProcedureInsert(proc.title, proc.tooth?.join(','))}
                    className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm hover:border-blue-400 hover:shadow-md cursor-pointer group transition-all relative overflow-hidden"
                  >
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500"></div>
                    <div className="flex justify-between items-start pl-2">
                      <span className="font-bold text-slate-800 text-xs leading-tight">{proc.title}</span>
                      <ChevronRight size={14} className="text-slate-300 group-hover:text-blue-500" />
                    </div>
                    <div className="flex items-center gap-2 mt-2 pl-2">
                      {proc.tooth && proc.tooth.length > 0 && (
                        <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-1.5 py-0.5 rounded border border-slate-200">
                          #{proc.tooth.join(',')}
                        </span>
                      )}
                      <span className="text-[10px] font-medium text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">Draft Note</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* C. Radiographs */}
          <div className="p-5 border-b border-slate-100">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                  <ImageIcon size={12}/> Radiographs
              </h3>
              <button 
                onClick={aiGenerateRadiographFindings}
                className="text-[10px] font-bold text-purple-600 bg-purple-50 px-2 py-1 rounded-md flex items-center gap-1 hover:bg-purple-100 transition-colors"
                title="FDA-Safe Assistive Description"
              >
                <Sparkles size={10} /> AI Describe
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {RADIOGRAPHS.map(rad => (
                <div key={rad.id} className="aspect-square bg-slate-900 rounded-lg relative overflow-hidden group cursor-pointer border border-slate-200">
                  <div className="absolute inset-0 flex flex-col items-center justify-center opacity-60 group-hover:opacity-100 transition-opacity">
                    <span className="text-[8px] font-bold text-white uppercase tracking-wider">{rad.label}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* D. Last Visit Summary */}
          <div className="p-5">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1">
                <History size={12}/> Last Visit
            </h3>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-600 space-y-1.5">
              <div className="flex justify-between text-[10px] text-slate-400 uppercase font-bold">
                  <span>{LAST_VISIT_SUMMARY.date}</span>
                  <span>Dr. Smith</span>
              </div>
              <p><span className="font-bold text-slate-700">CC:</span> {LAST_VISIT_SUMMARY.cc}</p>
              <p><span className="font-bold text-slate-700">DX:</span> {LAST_VISIT_SUMMARY.dx}</p>
              <p><span className="font-bold text-slate-700">TX:</span> {LAST_VISIT_SUMMARY.tx}</p>
            </div>
          </div>
        </div>

        {/* CENTER PANEL: NOTE COMPOSER (Fluid) */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-100 relative scroll-smooth">
          <div className="max-w-3xl mx-auto space-y-6 pb-32">
            
            {/* SECTION 1: CC */}
            <SectionCard 
              title="Chief Complaint" 
              icon={User}
              isCollapsed={collapsed['cc']}
              onToggle={() => toggleCollapse('cc')}
              aiAction={
                <button onClick={aiSummarizeIntake} className="text-[10px] font-bold text-purple-600 bg-purple-50 border border-purple-100 hover:bg-purple-100 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors">
                  <Wand2 size={12}/> AI Summarize
                </button>
              }
            >
              <div className="relative">
                <textarea 
                    value={note.cc}
                    onChange={e => updateSection('cc', e.target.value)}
                    placeholder="Patient states..."
                    className="w-full min-h-[80px] p-4 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none placeholder:text-slate-400"
                />
                <button className="absolute right-3 bottom-3 text-slate-400 hover:text-blue-600 p-1 bg-white rounded-md border border-slate-200 shadow-sm"><Mic size={14}/></button>
              </div>
              <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                <button onClick={() => updateSection('cc', 'Patient presents for scheduled treatment. Reports no specific concerns.')} className="whitespace-nowrap px-3 py-1.5 bg-white border border-slate-200 hover:border-blue-300 text-slate-600 text-xs font-semibold rounded-lg transition-colors">
                  Routine Presentation
                </button>
                <button onClick={() => updateSection('cc', 'Patient reports sensitivity to cold on UL.')} className="whitespace-nowrap px-3 py-1.5 bg-white border border-slate-200 hover:border-blue-300 text-slate-600 text-xs font-semibold rounded-lg transition-colors">
                  Cold Sensitivity
                </button>
              </div>
            </SectionCard>

            {/* SECTION 2: OBJECTIVE */}
            <SectionCard 
              title="Objective Findings" 
              icon={Stethoscope}
              isCollapsed={collapsed['objective']}
              onToggle={() => toggleCollapse('objective')}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                {/* Vitality Box */}
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1"><Thermometer size={10}/> Vitality & Mobility</h4>
                  <div className="flex flex-wrap gap-2">
                    {['Cold (+)', 'Cold (-)', 'Perc (+)', 'Perc (-)', 'WNL', 'Mobility 1'].map(t => (
                      <button key={t} onClick={() => appendText('objective', `Testing: ${t}`)} className="px-2 py-1 bg-white border border-slate-200 rounded-md text-[10px] font-bold text-slate-600 hover:border-blue-400 hover:text-blue-600 active:bg-blue-50 transition-colors">{t}</button>
                    ))}
                  </div>
                </div>
                {/* Radiographic Box */}
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1"><ImageIcon size={10}/> Radiographic</h4>
                  <button onClick={() => appendText('objective', 'Radiographs confirm caries extending into dentin. No periapical pathology visible.')} className="w-full text-left px-2 py-1.5 bg-white border border-slate-200 rounded-md text-[10px] font-medium hover:border-blue-400 hover:text-blue-600 transition-colors mb-1">
                    + "Caries into Dentin"
                  </button>
                  <button onClick={() => appendText('objective', 'Periapical radiolucency visible.')} className="w-full text-left px-2 py-1.5 bg-white border border-slate-200 rounded-md text-[10px] font-medium hover:border-blue-400 hover:text-blue-600 transition-colors">
                    + "PARL Visible"
                  </button>
                </div>
              </div>
              <textarea 
                ref={objectiveRef}
                value={note.objective}
                onChange={e => updateSection('objective', e.target.value)}
                placeholder="• Oral exam findings&#10;• Radiographic interpretation&#10;• Soft tissue status"
                className="w-full min-h-[120px] p-4 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none resize-none font-medium text-slate-700 leading-relaxed"
              />
            </SectionCard>

            {/* SECTION 3: ASSESSMENT / DIAGNOSIS (Tooth-Based) */}
            <SectionCard 
              title="Assessment & Diagnosis" 
              icon={Activity}
              isCollapsed={collapsed['diagnosis']}
              onToggle={() => toggleCollapse('diagnosis')}
            >
              <div className="mb-4 p-4 bg-blue-50/50 rounded-xl border border-blue-100 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-blue-800 uppercase tracking-wide flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
                        Select Tooth for Diagnosis
                    </label>
                    {activeToothForDx && <button onClick={() => setActiveToothForDx(null)} className="text-[10px] font-bold text-blue-500 hover:text-blue-700">CLEAR SELECTION</button>}
                </div>
                
                {/* Embedded Tooth Selector for Diagnosis */}
                <div className="flex flex-wrap gap-1.5">
                    {[1,2,3,4,5,12,13,14,15,18,19,20,29,30,31].map(t => (
                        <button 
                            key={t} 
                            onClick={() => setActiveToothForDx(t === activeToothForDx ? null : t)}
                            className={`w-9 h-9 rounded-lg font-bold text-xs border transition-all ${activeToothForDx === t ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-200' : 'bg-white border-blue-100 text-blue-600 hover:bg-blue-50'}`}
                        >
                            {t}
                        </button>
                    ))}
                </div>

                <div className="h-px bg-blue-100 w-full"></div>

                <div className="flex flex-wrap gap-2">
                    {DIAGNOSIS_CHIPS.map(dx => (
                      <button 
                        key={dx}
                        onClick={() => handleAddDiagnosis(dx)}
                        className={`px-3 py-1.5 border text-xs font-bold rounded-full transition-colors shadow-sm ${activeToothForDx ? 'bg-white border-blue-200 text-blue-700 hover:bg-blue-600 hover:text-white' : 'bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed'}`}
                        disabled={!activeToothForDx}
                      >
                        {dx}
                      </button>
                    ))}
                </div>
              </div>
              <textarea 
                ref={diagnosisRef}
                value={note.diagnosis}
                onChange={e => updateSection('diagnosis', e.target.value)}
                placeholder="Diagnoses will appear here..."
                className="w-full min-h-[100px] p-4 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none resize-none font-medium text-slate-800"
              />
            </SectionCard>

            {/* SECTION 4: TREATMENT (AUTO) */}
            <SectionCard 
              title="Treatment Performed" 
              icon={Syringe}
              isCollapsed={collapsed['treatment']}
              onToggle={() => toggleCollapse('treatment')}
              aiAction={
                <span className="text-[10px] font-bold text-slate-400 bg-slate-100 border border-slate-200 px-2 py-1 rounded uppercase tracking-wider">Auto-Linked</span>
              }
            >
              <div className="relative">
                <textarea 
                    ref={treatmentRef}
                    value={note.treatment}
                    onChange={e => updateSection('treatment', e.target.value)}
                    placeholder="Select a completed procedure from the left panel to auto-generate a detailed clinical note template..."
                    className="w-full min-h-[180px] p-5 text-sm leading-7 bg-slate-50/50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none resize-none font-medium text-slate-700"
                />
                {!note.treatment && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="text-slate-300 flex flex-col items-center">
                            <Wand2 size={32} className="mb-2 opacity-50"/>
                            <span className="text-sm font-medium">Tap a procedure on the left to generate note</span>
                        </div>
                    </div>
                )}
              </div>
            </SectionCard>

            {/* SECTION 5: RECOMMENDATIONS */}
            <SectionCard 
              title="Plan / Recommendations" 
              icon={LayoutTemplate}
              isCollapsed={collapsed['plan']}
              onToggle={() => toggleCollapse('plan')}
              aiAction={
                <button onClick={aiSuggestRecommendations} className="text-[10px] font-bold text-purple-600 bg-purple-50 border border-purple-100 hover:bg-purple-100 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors">
                  <Wand2 size={12}/> Suggest
                </button>
              }
            >
              <textarea 
                value={note.plan}
                onChange={e => updateSection('plan', e.target.value)}
                placeholder="Post-op instructions, referrals, warnings given to patient..."
                className="w-full min-h-[100px] p-4 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none resize-none"
              />
            </SectionCard>

            {/* SECTIONS 6 & 7: CONSENT & NEXT */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* CONSENT */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                <h3 className="font-bold text-slate-800 text-xs uppercase mb-4 flex items-center gap-2">
                  <ShieldCheck size={16} className="text-slate-400" /> Consent & Refusal
                </h3>
                <div className="flex bg-slate-100 p-1 rounded-lg">
                  {['Accepted', 'Declined', 'Deferred'].map(opt => (
                    <button
                      key={opt}
                      onClick={() => updateSection('consent', opt)}
                      className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${note.consent === opt ? 'bg-white shadow-sm text-blue-600 ring-1 ring-black/5' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
                <div className="mt-3 text-[10px] text-slate-400 italic text-center">
                    {note.consent === 'Accepted' && "Verbal and written consent obtained for all procedures."}
                    {note.consent === 'Declined' && "Patient declined treatment after risks were explained."}
                    {note.consent === 'Deferred' && "Patient opted to delay treatment. Risks of delay explained."}
                </div>
              </div>

              {/* NEXT VISIT */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                <h3 className="font-bold text-slate-800 text-xs uppercase mb-4 flex items-center gap-2">
                  <Calendar size={16} className="text-slate-400" /> Next Visit
                </h3>
                <div className="flex flex-wrap gap-2">
                  {NEXT_VISIT_OPTIONS.slice(0,4).map(opt => (
                    <button
                      key={opt}
                      onClick={() => updateSection('nextVisit', opt)}
                      className={`px-3 py-1.5 border rounded-lg text-[10px] font-bold transition-all ${note.nextVisit === opt ? 'bg-blue-600 border-blue-600 text-white shadow-md' : 'bg-white border-slate-200 text-slate-600 hover:border-blue-300'}`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* RIGHT PANEL: AI ASSIST (Collapsible 300px) */}
        {rightPanelOpen && (
          <div className="w-[300px] bg-white border-l border-slate-200 flex flex-col shrink-0 z-20 shadow-2xl overflow-hidden animate-in slide-in-from-right-12 duration-300">
            <div className="p-5 border-b border-purple-100 bg-gradient-to-r from-purple-50 to-white">
              <h3 className="font-black text-purple-900 flex items-center gap-2 text-sm uppercase tracking-wider">
                <BrainCircuit size={18} /> Dental AI Copilot
              </h3>
              <p className="text-[10px] text-purple-600/70 mt-1 font-medium">FDA-Safe Assistive Tools</p>
            </div>
            
            <div className="flex-1 overflow-y-auto p-5 space-y-5 bg-slate-50/30">
              {aiLoading && (
                <div className="p-4 bg-white rounded-xl border border-purple-100 shadow-sm flex flex-col items-center justify-center text-purple-600 gap-2 animate-pulse">
                  <Sparkles size={24} className="animate-spin text-purple-500" />
                  <span className="text-xs font-bold uppercase tracking-wider">Generating...</span>
                </div>
              )}

              <div className="space-y-3">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Generative Actions</p>
                
                <button 
                  onClick={() => generateWithGemini("Draft a complete narrative SOAP note based on these procedures: #14 DO Composite, #19 MO Composite. Patient tolerated well.", 'treatment')}
                  className="w-full p-4 bg-white border border-slate-200 hover:border-purple-300 hover:shadow-md rounded-xl text-left shadow-sm group transition-all"
                >
                  <div className="flex items-center gap-2 font-bold text-slate-700 group-hover:text-purple-700 text-sm">
                    <FileText size={16} /> Draft Full Narrative
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1 font-medium">Based on today's procedure timeline.</p>
                </button>

                <button 
                  onClick={aiGenerateRadiographFindings}
                  className="w-full p-4 bg-white border border-slate-200 hover:border-purple-300 hover:shadow-md rounded-xl text-left shadow-sm group transition-all"
                >
                  <div className="flex items-center gap-2 font-bold text-slate-700 group-hover:text-purple-700 text-sm">
                    <ImageIcon size={16} /> Describe Radiographs
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1 font-medium">Auto-analyze current thumbnails.</p>
                </button>

                <button 
                  onClick={() => generateWithGemini("List specific risks and complications for extraction of tooth #30 to discuss with patient for informed consent.", 'plan')}
                  className="w-full p-4 bg-white border border-slate-200 hover:border-purple-300 hover:shadow-md rounded-xl text-left shadow-sm group transition-all"
                >
                  <div className="flex items-center gap-2 font-bold text-slate-700 group-hover:text-purple-700 text-sm">
                    <AlertTriangle size={16} /> Suggest Risks
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1 font-medium">For informed consent documentation.</p>
                </button>
              </div>

              <div className="pt-4 border-t border-slate-200">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Context Aware Suggestions</p>
                <div className="bg-white rounded-xl p-4 border border-purple-100 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-purple-400"></div>
                  <p className="text-xs text-slate-600 font-medium leading-relaxed">
                    Diagnosis <span className="font-bold text-purple-700">Necrotic Pulp #14</span> detected. Consider documenting:
                  </p>
                  <ul className="mt-3 space-y-2">
                    <li className="flex items-start gap-2 text-xs text-slate-600 bg-purple-50/50 p-1.5 rounded-lg">
                      <CheckCircle2 size={12} className="text-purple-500 mt-0.5"/>
                      "Prognosis vs Extraction discussed"
                    </li>
                    <li className="flex items-start gap-2 text-xs text-slate-600 bg-purple-50/50 p-1.5 rounded-lg">
                      <CheckCircle2 size={12} className="text-purple-500 mt-0.5"/>
                      "Swelling/Fistula presence noted"
                    </li>
                  </ul>
                  <button onClick={() => appendText('plan', 'Discussed prognosis vs extraction. Checked for swelling/fistula.')} className="mt-3 w-full py-2 bg-purple-600 text-white text-xs font-bold rounded-lg hover:bg-purple-700 transition-colors shadow-sm shadow-purple-200">
                    Insert Suggestions
                  </button>
                </div>
              </div>

              <div className="mt-auto pt-6 text-[10px] text-slate-400 leading-tight text-center">
                  <p className="font-bold mb-1">Provider Verification Required</p>
                  AI suggestions are assistive only and must be reviewed and confirmed by the provider. Not diagnostic.
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
};
