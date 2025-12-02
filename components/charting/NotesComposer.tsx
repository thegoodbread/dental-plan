// ... existing imports
import React, { useState, useEffect, useRef } from 'react';
import { useChairside } from '../../context/ChairsideContext';
import { GoogleGenAI } from "@google/genai";
import { 
  ArrowLeft, Save, Wand2, ChevronDown, ChevronUp, 
  Sparkles, FileText, User, Calendar, RefreshCw, CheckCircle2,
  LayoutTemplate, ClipboardList, ChevronRight, Activity, 
  AlertTriangle, Image as ImageIcon, Syringe, BrainCircuit,
  Stethoscope, PanelRightClose, PanelRightOpen,
  Thermometer, Mic, ShieldCheck, History
} from 'lucide-react';
import { ToothNumber, ToothRecord } from '../../domain/dentalTypes';

// --- TYPES & INTERFACES ---

export type ClinicalNote = {
  id: string;
  patientId: string;
  visitId: string;
  visitType: "restorative" | "exam" | "endo" | "emergency" | "other";
  dateTime: string;
  chiefComplaint: string;
  objectiveFindings: {
    oralExam: string;
    radiographicText: string;
    softTissue: string;
    vitality: {
      cold: "pos" | "neg" | null;
      percussion: "pos" | "neg" | null;
      mobility: 0 | 1 | 2 | 3 | null;
    };
  };
  assessmentDiagnosis: string;
  treatmentPerformed: string;
  recommendationsPlan: string;
  consentRefusal: "accepted" | "declined" | "deferred" | null;
  nextVisitPlan: string;
  status: "draft" | "signed";
};

export type Radiograph = {
  id: string;
  type: "BWX" | "PA" | "PANO" | "CBCT" | "Other";
  label: string;   // e.g. "R-BWX", "PA #14"
  teeth: string[]; // ["14"] or ["19","20"]
  fileUrl: string;
};

interface NotesComposerProps {
  activeToothNumber: ToothNumber | null;
  activeToothRecord: ToothRecord | null;
  onToothClick: (tooth: ToothNumber) => void;
}

// --- MOCK DATA ---

const MOCK_RADIOGRAPHS: Radiograph[] = [
  { id: 'bw-r', type: 'BWX', label: 'R-BWX', teeth: ['2','3','4','5','28','29','30','31'], fileUrl: '' },
  { id: 'bw-l', type: 'BWX', label: 'L-BWX', teeth: ['12','13','14','15','18','19','20','21'], fileUrl: '' },
  { id: 'pa-14', type: 'PA', label: 'PA #14', teeth: ['14'], fileUrl: '' },
  { id: 'pa-19', type: 'PA', label: 'PA #19', teeth: ['19'], fileUrl: '' },
  { id: 'pano', type: 'PANO', label: 'PANO', teeth: [], fileUrl: '' },
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

const ToothGrid = ({ 
  onSelectTooth, 
  highlightedTeeth = [],
  activeTooth 
}: { 
  onSelectTooth: (t: ToothNumber) => void, 
  highlightedTeeth?: number[],
  activeTooth?: ToothNumber | null
}) => {
  // 1-32 Universal System
  const teeth: ToothNumber[] = [
    "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14", "15", "16",
    "32", "31", "30", "29", "28", "27", "26", "25", "24", "23", "22", "21", "20", "19", "18", "17"
  ];

  return (
    <div className="grid grid-cols-8 gap-1.5 p-3 bg-slate-50 rounded-xl border border-slate-200">
      {teeth.map(t => {
        const tNum = parseInt(t);
        const isHighlighted = highlightedTeeth.includes(tNum);
        const isActive = activeTooth === t;
        
        // Mocking some clinical status colors for visualization context
        let statusColor = 'bg-white text-slate-500 border-slate-200 hover:border-blue-400 hover:text-blue-600';
        if (t === "14") statusColor = 'bg-purple-50 text-purple-700 border-purple-400';
        else if (t === "19") statusColor = 'bg-red-50 text-red-700 border-red-400';
        else if (t === "3") statusColor = 'bg-blue-50 text-blue-700 border-blue-400';

        if (isActive) {
            statusColor = 'bg-blue-600 text-white border-blue-700 ring-2 ring-blue-200 shadow-md transform scale-110 z-20';
        }

        return (
          <button
            key={t}
            onClick={() => onSelectTooth(t)}
            className={`
              aspect-square rounded-md flex items-center justify-center text-[10px] font-bold border transition-all
              ${isHighlighted && !isActive ? 'ring-1 ring-blue-300' : ''}
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

export const NotesComposer: React.FC<NotesComposerProps> = ({ activeToothNumber, activeToothRecord, onToothClick }) => {
  const { setCurrentView, addTimelineEvent, timeline, selectedTeeth } = useChairside();
  
  // -- STATE --
  const [currentNote, setCurrentNote] = useState<ClinicalNote | null>(null);
  const [selectedRadiographIds, setSelectedRadiographIds] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [aiRadiographDraft, setAiRadiographDraft] = useState<string>("");
  const [soapPreview, setSoapPreview] = useState<string>('');

  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({ plan: false, next: false });
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);

  // Initialize Note
  useEffect(() => {
    if (!currentNote) {
        setCurrentNote({
            id: `note-${Date.now()}`,
            patientId: 'p-demo',
            visitId: 'v-demo',
            visitType: 'restorative',
            dateTime: new Date().toISOString(),
            chiefComplaint: '',
            objectiveFindings: {
                oralExam: '',
                radiographicText: '',
                softTissue: 'WNL',
                vitality: { cold: null, percussion: null, mobility: null }
            },
            assessmentDiagnosis: '',
            treatmentPerformed: '',
            recommendationsPlan: '',
            consentRefusal: null,
            nextVisitPlan: '',
            status: 'draft'
        });
    }
  }, []);

  // -- BINDINGS & UPDATERS --

  const updateField = (field: keyof ClinicalNote, value: any) => {
      setIsSaving(true);
      setCurrentNote(prev => prev ? ({ ...prev, [field]: value }) : null);
      setTimeout(() => setIsSaving(false), 800);
  };

  const updateObjective = (subField: keyof ClinicalNote['objectiveFindings'], value: any) => {
      setIsSaving(true);
      setCurrentNote(prev => prev ? ({ 
          ...prev, 
          objectiveFindings: { ...prev.objectiveFindings, [subField]: value } 
      }) : null);
      setTimeout(() => setIsSaving(false), 800);
  };

  const updateVitality = (field: keyof ClinicalNote['objectiveFindings']['vitality'], value: any) => {
      setIsSaving(true);
      setCurrentNote(prev => prev ? ({ 
          ...prev, 
          objectiveFindings: { 
              ...prev.objectiveFindings, 
              vitality: { ...prev.objectiveFindings.vitality, [field]: value } 
          } 
      }) : null);
      setTimeout(() => setIsSaving(false), 800);
  };

  const toggleCollapse = (section: string) => {
    setCollapsed(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // -- AI LOGIC --

  const buildToothContext = () => {
    if (!activeToothNumber || !activeToothRecord) return '';

    const conditionLabels = activeToothRecord.conditions.map(c => c.label);
    const plannedNames = activeToothRecord.procedures
      .filter(p => p.status === 'planned')
      .map(p => p.name);
    const completedNames = activeToothRecord.procedures
      .filter(p => p.status === 'completed')
      .map(p => p.name);
    const radiographLabels = activeToothRecord.radiographs.map(r => `${r.type} ${r.label}`);

    const parts: string[] = [];

    parts.push(`Tooth #${activeToothNumber}.`);

    if (conditionLabels.length) {
      parts.push(`Noted conditions: ${conditionLabels.join(', ')}.`);
    }
    if (plannedNames.length) {
      parts.push(`Planned procedures: ${plannedNames.join(', ')}.`);
    }
    if (completedNames.length) {
      parts.push(`Completed procedures: ${completedNames.join(', ')}.`);
    }
    if (radiographLabels.length) {
      parts.push(`Related radiographs: ${radiographLabels.join(', ')}.`);
    }

    return parts.join(' ');
  };

  const buildRiskContext = () => {
    if (!currentNote) return '';

    const tooth = activeToothNumber ? `Tooth #${activeToothNumber}` : 'No specific tooth selected';

    const treatmentSummary = currentNote.treatmentPerformed?.trim() || '';
    const chiefComplaint = currentNote.chiefComplaint?.trim() || '';

    const parts: string[] = [];

    parts.push(`Tooth context: ${tooth}.`);

    if (treatmentSummary) {
      parts.push(`Planned or performed treatment narrative: ${treatmentSummary}`);
    }

    if (chiefComplaint) {
      parts.push(`Chief complaint: ${chiefComplaint}`);
    }

    return parts.join(' ');
  };

  const buildSoapContext = () => {
    if (!currentNote) return null;

    const tooth = activeToothNumber ? `Tooth #${activeToothNumber}` : 'No specific tooth selected';

    const cc = currentNote.chiefComplaint?.trim() || '';
    const oralExam = currentNote.objectiveFindings.oralExam?.trim() || '';
    const softTissue = currentNote.objectiveFindings.softTissue?.trim() || '';
    const radText = currentNote.objectiveFindings.radiographicText?.trim() || '';
    const dx = currentNote.assessmentDiagnosis?.trim() || '';
    const tx = currentNote.treatmentPerformed?.trim() || '';
    const rec = currentNote.recommendationsPlan?.trim() || '';

    return {
      tooth,
      cc,
      oralExam,
      softTissue,
      radText,
      dx,
      tx,
      rec,
      visitType: currentNote.visitType,
      dateTime: currentNote.dateTime,
      patientId: currentNote.patientId,
      visitId: currentNote.visitId,
    };
  };

  const fakeDescribeRadiographs = async (payload: any) => {
    await new Promise(r => setTimeout(r, 1500));

    const { toothNumber, radiographs, chiefComplaint } = payload;
    const uniqueTypes = Array.from(new Set(radiographs.map((r: any) => r.type))).join('/');
    const count = radiographs.length;

    let narrative = `Analysis of ${count} ${uniqueTypes} view${count > 1 ? 's' : ''}`;
    narrative += toothNumber ? ` focusing on Tooth #${toothNumber}: ` : `: `;

    if (toothNumber) {
        narrative += `A radiolucent region is visible near the coronal aspect which may represent an area of interest requiring provider review. `;
        narrative += `The periapical area of #${toothNumber} shows patterns that should be evaluated for continuity and integrity. `;
    } else {
        narrative += `Selected images show regions of varying density consistent with common anatomical patterns. No definitive disruptions are automatically ruled out. `;
    }

    if (chiefComplaint) {
        narrative += `Clinical correlation with patient's report of "${chiefComplaint}" is recommended. `;
    }

    narrative += `\n\nThese observations are assistive only and must be reviewed and confirmed by the provider.`;
    
    return narrative;
  };

  const describeRadiographs = async () => {
    if (!currentNote) return;
    if (selectedRadiographIds.length === 0) return;
    
    setAiLoading(true);
    
    try {
      // Filter selected radiographs from the mock list
      const selected = MOCK_RADIOGRAPHS.filter(r => selectedRadiographIds.includes(r.id));

      // FDA-safe context payload for AI assistance (non-diagnostic)
      const payload = {
          toothNumber: activeToothNumber || null,
          chiefComplaint: currentNote.chiefComplaint,
          visitType: currentNote.visitType,
          radiographs: selected.map(r => ({
              type: r.type,
              label: r.label,
              teeth: r.teeth
          }))
      };

      // Simulate API call
      const aiText = await fakeDescribeRadiographs(payload);

      setAiRadiographDraft(aiText);
      setCurrentNote(prev => prev ? ({
          ...prev,
          objectiveFindings: {
              ...prev.objectiveFindings,
              radiographicText: prev.objectiveFindings.radiographicText 
                  ? prev.objectiveFindings.radiographicText + '\n' + aiText 
                  : aiText
          }
      }) : prev);
    } finally {
      setAiLoading(false);
    }
  };

  // Standard Generative AI Hook (for other text sections)
  const generateWithGemini = async (prompt: string, targetField: 'chiefComplaint' | 'treatmentPerformed' | 'recommendationsPlan' | 'assessmentDiagnosis') => {
    setAiLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });
      const text = response.text || '';
      
      setCurrentNote(prev => prev ? ({
          ...prev,
          [targetField]: prev[targetField as keyof ClinicalNote] ? (prev[targetField as keyof ClinicalNote] as string) + '\n' + text : text
      }) : null);

    } catch (e) {
      console.error("AI Error", e);
      alert("AI Service Unavailable.");
    } finally {
      setAiLoading(false);
    }
  };

  const handleSuggestAssessment = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!activeToothNumber || !activeToothRecord || !currentNote) return;

    const toothContext = buildToothContext();
    const baseNoteContext = {
      chiefComplaint: currentNote.chiefComplaint,
      visitType: currentNote.visitType,
      radiographicText: currentNote.objectiveFindings.radiographicText,
      oralExam: currentNote.objectiveFindings.oralExam,
    };

    const prompt = `
You are assisting a dentist in drafting assessment/diagnosis language for the clinical note. 
Do NOT provide a definitive diagnosis or treatment plan. 
Instead, suggest cautious, descriptive assessment language that the provider can edit.

Patient visit context:
- Visit type: ${baseNoteContext.visitType}
- Chief complaint: ${baseNoteContext.chiefComplaint || 'Not documented'}
- Oral exam findings: ${baseNoteContext.oralExam || 'Not documented'}
- Radiographic text (descriptive): ${baseNoteContext.radiographicText || 'Not documented'}

Tooth context:
${toothContext || 'No specific tooth context available.'}

Task:
- Suggest 2–4 concise sentences of assessment language focused on Tooth #${activeToothNumber}.
- Use neutral, descriptive phrasing (e.g., "findings are consistent with...", "may represent...", "requires clinical correlation").
- Clearly treat the text as a draft for provider review, not a final diagnosis.
- Do NOT mention AI or automation.

Return only the suggested assessment text.
    `.trim();

    await generateWithGemini(prompt, 'assessmentDiagnosis');
  };

  const handleSuggestRisks = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentNote) return;

    const riskContext = buildRiskContext();

    const prompt = `
You are assisting a dentist in drafting language about risks, benefits, and possible complications to document an informed consent discussion.

Safety requirements:
- Do NOT provide guarantees or promises of outcomes.
- Do NOT present this as a final or complete list of risks.
- Do NOT make a definitive diagnosis or prescribe specific treatment.
- Treat this as draft language that must be reviewed and edited by the provider.

Clinical visit snapshot:
${riskContext || 'No specific tooth or treatment context is available. Use generic, non-specific language.'}

Task:
- Suggest 3–6 concise bullet points the provider could use when discussing risks and possible complications with the patient.
- Focus on typical procedural risks (e.g., pain, swelling, sensitivity, need for further treatment, rare complications).
- Use neutral, descriptive language (e.g., "there is a risk of", "in some cases", "may require", "rarely").
- End with a sentence noting that the patient had an opportunity to ask questions and that alternative options were discussed.
- Do NOT mention AI or automation in the text.

Return only the bullet points and closing sentence, formatted as plain text that can be pasted into a clinical note.
    `.trim();

    await generateWithGemini(prompt, 'recommendationsPlan');
  };

  const handleDraftSoapNarrative = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentNote) return;

    const ctx = buildSoapContext();
    if (!ctx) return;

    setAiLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

      const prompt = `
You are assisting a dentist in drafting a concise SOAP note (Subjective, Objective, Assessment, Plan) based on structured chart inputs.

Safety requirements:
- Do NOT invent procedures or findings that are not supported by the inputs.
- If a section is empty or minimal, acknowledge that briefly rather than hallucinating details.
- Use cautious, descriptive language for assessment (e.g., "findings are consistent with", "may represent", "requires clinical correlation").
- Do NOT promise outcomes or guarantees.
- Treat this as a draft that must be reviewed and edited by the provider.

Visit metadata:
- Patient ID: ${ctx.patientId}
- Visit ID: ${ctx.visitId}
- Visit type: ${ctx.visitType}
- Date/time (ISO): ${ctx.dateTime}
- Tooth context: ${ctx.tooth}

Current chart data:
- Chief complaint: ${ctx.cc || 'Not documented'}
- Oral exam: ${ctx.oralExam || 'Not documented'}
- Soft tissue: ${ctx.softTissue || 'Not documented'}
- Radiographic text: ${ctx.radText || 'Not documented'}
- Assessment / Diagnosis: ${ctx.dx || 'Not documented'}
- Treatment performed narrative: ${ctx.tx || 'None documented'}
- Recommendations / plan: ${ctx.rec || 'Not documented'}

Task:
- Produce a SOAP note with clear section headings: S:, O:, A:, P:
- Under each section, write 1–4 concise sentences.
- For Objective, use the oral exam, soft tissue, and radiographic text as the primary sources.
- For Assessment, use the assessmentDiagnosis text and remain cautious (no definitive statements if inputs are vague).
- For Plan, use treatmentPerformed + recommendationsPlan, including any next steps or follow-up.
- Include a short header block at the top with patient ID, visit ID, visit type, and a human-readable date/time.
- Do NOT mention AI or automation.

Return only the formatted SOAP note as plain text.
      `.trim();

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      const text = response.text || '';
      setSoapPreview(text);
    } catch (err) {
      console.error('AI SOAP Error', err);
      alert('Unable to generate SOAP note.');
    } finally {
      setAiLoading(false);
    }
  };

  // -- INTERACTION HANDLERS --

  const toggleRadiographSelection = (id: string) => {
      setSelectedRadiographIds(prev => 
          prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
      );
  };

  const handleNextVisitToggle = (opt: string) => {
      if (!currentNote) return;
      const current = currentNote.nextVisitPlan;
      if (current === opt) updateField('nextVisitPlan', '');
      else updateField('nextVisitPlan', opt);
  };

  const handleSaveNote = () => {
      if (!currentNote) return;
      
      const signedNote = {
          ...currentNote,
          status: 'signed' as const,
          signedAt: new Date().toISOString(),
          signedBy: "Dr. Smith"
      };
      
      console.log("Saving note", signedNote);
      
      addTimelineEvent({
        type: 'NOTE',
        title: 'Clinical Note Finalized',
        details: 'Comprehensive exam and treatment note signed.',
        provider: 'Dr. Smith'
      });
      setCurrentView('DASHBOARD');
  };

  // Loading state
  if (!currentNote) return <div className="p-10 text-center">Loading Note...</div>;

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
               {isSaving && <span className="text-xs text-blue-600 font-medium flex items-center gap-1"><RefreshCw size={10} className="animate-spin"/> Saving...</span>}
               {!isSaving && <span className="text-xs text-green-600 font-medium flex items-center gap-1"><CheckCircle2 size={10}/> Saved</span>}
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
            <ToothGrid 
                onSelectTooth={onToothClick} 
                highlightedTeeth={selectedTeeth} 
                activeTooth={activeToothNumber}
            />
            <p className="text-[10px] text-slate-400 mt-2 text-center bg-slate-50 py-1 rounded">
                {activeToothNumber ? `Tooth #${activeToothNumber} Active` : "Tap to set active tooth context"}
            </p>
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
                    className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm hover:border-blue-400 cursor-pointer group transition-all relative overflow-hidden"
                    onClick={() => {
                        const template = `Tooth ${proc.tooth?.join(',') || 'N/A'} — ${proc.title}\n• Anesthesia: 2% Lidocaine 1:100k epi (1 carp)\n• Isolation: Rubber Dam\n• Procedure: Caries removal, bond, composite placement.\n• Occlusion checked.`;
                        updateField('treatmentPerformed', currentNote.treatmentPerformed + '\n\n' + template);
                    }}
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
                      <span className="text-[10px] font-medium text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">Insert Note</span>
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
                onClick={describeRadiographs}
                disabled={selectedRadiographIds.length === 0 || aiLoading}
                className={`text-[10px] font-bold px-2 py-1 rounded-md flex items-center gap-1 transition-colors ${selectedRadiographIds.length > 0 ? 'text-purple-600 bg-purple-50 hover:bg-purple-100' : 'text-slate-300 bg-slate-50 cursor-not-allowed'}`}
                title="FDA-Safe Assistive Description"
              >
                {aiLoading ? <RefreshCw size={10} className="animate-spin"/> : <Sparkles size={10} />} 
                AI Describe
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {MOCK_RADIOGRAPHS.map(rad => {
                const isSelected = selectedRadiographIds.includes(rad.id);
                return (
                    <div 
                        key={rad.id} 
                        onClick={() => toggleRadiographSelection(rad.id)}
                        className={`aspect-square bg-slate-900 rounded-lg relative overflow-hidden cursor-pointer border-2 transition-all ${isSelected ? 'border-purple-500 ring-2 ring-purple-200' : 'border-slate-200 opacity-80 hover:opacity-100'}`}
                    >
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-[8px] font-bold text-white uppercase tracking-wider">{rad.label}</span>
                            {isSelected && <div className="absolute top-1 right-1 w-2 h-2 bg-purple-500 rounded-full"></div>}
                        </div>
                    </div>
                );
              })}
            </div>
            {aiRadiographDraft && (
                <div className="mt-3 p-2 bg-purple-50 rounded border border-purple-100 text-[10px] text-purple-800 leading-tight">
                    <span className="font-bold">AI Draft:</span> {aiRadiographDraft}
                </div>
            )}
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
            
            {/* DEBUG PANEL */}
            {activeToothNumber && activeToothRecord && (
              <div className="text-xs text-slate-500 border border-blue-200 bg-blue-50/50 rounded p-2 mb-2">
                <div><strong>Active tooth:</strong> #{activeToothNumber}</div>
                <div><strong>Conditions:</strong> {activeToothRecord.conditions.map(c => c.label).join(", ") || "None"}</div>
                <div><strong>Planned procedures:</strong> {activeToothRecord.procedures.filter(p => p.status === "planned").map(p => p.name).join(", ") || "None"}</div>
              </div>
            )}

            {/* SECTION 1: CC */}
            <SectionCard 
              title="Chief Complaint" 
              icon={User}
              isCollapsed={collapsed['cc']}
              onToggle={() => toggleCollapse('cc')}
              aiAction={
                <button 
                    onClick={() => generateWithGemini("Summarize: " + currentNote.chiefComplaint, 'chiefComplaint')}
                    className="text-[10px] font-bold text-purple-600 bg-purple-50 border border-purple-100 hover:bg-purple-100 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors"
                >
                  <Wand2 size={12}/> AI Summarize
                </button>
              }
            >
              <div className="relative">
                <textarea 
                    value={currentNote.chiefComplaint}
                    onChange={e => updateField('chiefComplaint', e.target.value)}
                    placeholder="Patient states..."
                    className="w-full min-h-[80px] p-4 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none placeholder:text-slate-400"
                />
                <button className="absolute right-3 bottom-3 text-slate-400 hover:text-blue-600 p-1 bg-white rounded-md border border-slate-200 shadow-sm"><Mic size={14}/></button>
              </div>
              <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                <button onClick={() => updateField('chiefComplaint', 'Patient presents for scheduled treatment. Reports no specific concerns.')} className="whitespace-nowrap px-3 py-1.5 bg-white border border-slate-200 hover:border-blue-300 text-slate-600 text-xs font-semibold rounded-lg transition-colors">
                  Routine Presentation
                </button>
                <button onClick={() => updateField('chiefComplaint', 'Patient reports sensitivity to cold on UL.')} className="whitespace-nowrap px-3 py-1.5 bg-white border border-slate-200 hover:border-blue-300 text-slate-600 text-xs font-semibold rounded-lg transition-colors">
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
                    <button 
                        onClick={() => updateVitality('cold', currentNote.objectiveFindings.vitality.cold === 'pos' ? null : 'pos')} 
                        className={`px-2 py-1 border rounded-md text-[10px] font-bold transition-colors ${currentNote.objectiveFindings.vitality.cold === 'pos' ? 'bg-red-50 border-red-300 text-red-600' : 'bg-white border-slate-200 text-slate-600'}`}
                    >
                        Cold (+)
                    </button>
                    <button 
                        onClick={() => updateVitality('percussion', currentNote.objectiveFindings.vitality.percussion === 'pos' ? null : 'pos')} 
                        className={`px-2 py-1 border rounded-md text-[10px] font-bold transition-colors ${currentNote.objectiveFindings.vitality.percussion === 'pos' ? 'bg-red-50 border-red-300 text-red-600' : 'bg-white border-slate-200 text-slate-600'}`}
                    >
                        Perc (+)
                    </button>
                    <button 
                        onClick={() => updateVitality('mobility', 1)} 
                        className={`px-2 py-1 border rounded-md text-[10px] font-bold transition-colors ${currentNote.objectiveFindings.vitality.mobility === 1 ? 'bg-orange-50 border-orange-300 text-orange-600' : 'bg-white border-slate-200 text-slate-600'}`}
                    >
                        Mobility 1
                    </button>
                    <button 
                        onClick={() => {
                            updateVitality('cold', 'neg');
                            updateVitality('percussion', 'neg');
                            updateVitality('mobility', 0);
                        }}
                        className="px-2 py-1 bg-white border border-slate-200 rounded-md text-[10px] font-bold text-slate-600 hover:border-green-400 hover:text-green-600"
                    >
                        WNL
                    </button>
                  </div>
                </div>
                {/* Radiographic Box */}
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1"><ImageIcon size={10}/> Radiographic Text</h4>
                  <textarea 
                    value={currentNote.objectiveFindings.radiographicText}
                    onChange={e => updateObjective('radiographicText', e.target.value)}
                    placeholder="Findings..."
                    className="w-full h-16 p-2 text-xs bg-white border border-slate-200 rounded resize-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
              <textarea 
                value={currentNote.objectiveFindings.oralExam}
                onChange={e => updateObjective('oralExam', e.target.value)}
                placeholder="• Oral exam findings&#10;• Soft tissue status"
                className="w-full min-h-[100px] p-4 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none resize-none font-medium text-slate-700 leading-relaxed"
              />
            </SectionCard>

            {/* SECTION 3: ASSESSMENT / DIAGNOSIS (Tooth-Based) */}
            <SectionCard 
              title="Assessment & Diagnosis" 
              icon={Activity}
              isCollapsed={collapsed['diagnosis']}
              onToggle={() => toggleCollapse('diagnosis')}
              aiAction={
                <button
                  onClick={handleSuggestAssessment}
                  disabled={!activeToothNumber || aiLoading}
                  className={`text-[10px] font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 border transition-colors ${
                    activeToothNumber
                      ? 'text-purple-600 bg-purple-50 border-purple-100 hover:bg-purple-100'
                      : 'text-slate-300 bg-slate-50 border-slate-200 cursor-not-allowed'
                  }`}
                  title={activeToothNumber ? 'AI-suggested assessment for provider review' : 'Select a tooth to enable'}
                >
                  <Wand2 size={12} /> Suggest
                </button>
              }
            >
              <div className="mb-4 p-4 bg-blue-50/50 rounded-xl border border-blue-100 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-blue-800 uppercase tracking-wide flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full bg-blue-600 ${activeToothNumber ? 'animate-pulse' : ''}`}></span>
                        {activeToothNumber ? `Diagnosis for Tooth #${activeToothNumber}` : "Select Tooth for Diagnosis"}
                    </label>
                    {activeToothNumber && <button onClick={() => onToothClick(activeToothNumber)} className="text-[10px] font-bold text-blue-500 hover:text-blue-700">CLEAR SELECTION</button>}
                </div>
                
                {/* Simplified Tooth Selector for Diagnosis context */}
                <div className="flex flex-wrap gap-1.5">
                    {["1","2","3","4","5","12","13","14","15","18","19","20","29","30","31"].map(t => (
                        <button 
                            key={t} 
                            onClick={() => onToothClick(t as ToothNumber)}
                            className={`w-9 h-9 rounded-lg font-bold text-xs border transition-all ${activeToothNumber === t ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-200' : 'bg-white border-blue-100 text-blue-600 hover:bg-blue-50'}`}
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
                        onClick={() => {
                            const prefix = activeToothNumber ? `Tooth #${activeToothNumber}: ` : '';
                            const text = `${prefix}${dx}`;
                            updateField('assessmentDiagnosis', currentNote.assessmentDiagnosis ? currentNote.assessmentDiagnosis + '\n' + text : text);
                        }}
                        className={`px-3 py-1.5 border text-xs font-bold rounded-full transition-colors shadow-sm ${activeToothNumber ? 'bg-white border-blue-200 text-blue-700 hover:bg-blue-600 hover:text-white' : 'bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed'}`}
                        disabled={!activeToothNumber}
                      >
                        {dx}
                      </button>
                    ))}
                </div>
              </div>
              <textarea 
                value={currentNote.assessmentDiagnosis}
                onChange={e => updateField('assessmentDiagnosis', e.target.value)}
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
                    value={currentNote.treatmentPerformed}
                    onChange={e => updateField('treatmentPerformed', e.target.value)}
                    placeholder="Select a completed procedure from the left panel to auto-generate a detailed clinical note template..."
                    className="w-full min-h-[180px] p-5 text-sm leading-7 bg-slate-50/50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none resize-none font-medium text-slate-700"
                />
                {!currentNote.treatmentPerformed && (
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
                <button onClick={() => generateWithGemini("Generate post-op instructions for: " + currentNote.treatmentPerformed, 'recommendationsPlan')} className="text-[10px] font-bold text-purple-600 bg-purple-50 border border-purple-100 hover:bg-purple-100 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors">
                  <Wand2 size={12}/> Suggest
                </button>
              }
            >
              <textarea 
                value={currentNote.recommendationsPlan}
                onChange={e => updateField('recommendationsPlan', e.target.value)}
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
                      onClick={() => updateField('consentRefusal', opt as any)}
                      className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${currentNote.consentRefusal?.toLowerCase() === opt.toLowerCase() ? 'bg-white shadow-sm text-blue-600 ring-1 ring-black/5' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
                <div className="mt-3 text-[10px] text-slate-400 italic text-center">
                    {currentNote.consentRefusal === 'accepted' && "Verbal and written consent obtained for all procedures."}
                    {currentNote.consentRefusal === 'declined' && "Patient declined treatment after risks were explained."}
                    {currentNote.consentRefusal === 'deferred' && "Patient opted to delay treatment. Risks of delay explained."}
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
                      onClick={() => handleNextVisitToggle(opt)}
                      className={`px-3 py-1.5 border rounded-lg text-[10px] font-bold transition-all ${currentNote.nextVisitPlan === opt ? 'bg-blue-600 border-blue-600 text-white shadow-md' : 'bg-white border-slate-200 text-slate-600 hover:border-blue-300'}`}
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
                  onClick={handleDraftSoapNarrative}
                  disabled={aiLoading}
                  className={`w-full p-4 bg-white border border-slate-200 hover:border-purple-300 hover:shadow-md rounded-xl text-left shadow-sm group transition-all ${aiLoading ? 'opacity-60 cursor-not-allowed' : ''}`}
                >
                  <div className="flex items-center gap-2 font-bold text-slate-700 group-hover:text-purple-700 text-sm">
                    <FileText size={16} /> Draft Full Narrative
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1 font-medium">Based on current inputs.</p>
                </button>

                <button 
                  onClick={describeRadiographs}
                  disabled={selectedRadiographIds.length === 0}
                  className={`w-full p-4 bg-white border border-slate-200 hover:border-purple-300 hover:shadow-md rounded-xl text-left shadow-sm group transition-all ${selectedRadiographIds.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className="flex items-center gap-2 font-bold text-slate-700 group-hover:text-purple-700 text-sm">
                    <ImageIcon size={16} /> Describe Radiographs
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1 font-medium">Analyze {selectedRadiographIds.length} selected images.</p>
                </button>

                <button 
                  onClick={handleSuggestRisks}
                  disabled={aiLoading}
                  className={`w-full p-4 bg-white border border-slate-200 hover:border-purple-300 hover:shadow-md rounded-xl text-left shadow-sm group transition-all ${aiLoading ? 'opacity-60 cursor-not-allowed' : ''}`}
                >
                  <div className="flex items-center gap-2 font-bold text-slate-700 group-hover:text-purple-700 text-sm">
                    <AlertTriangle size={16} /> Suggest Risks
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1 font-medium">For informed consent documentation.</p>
                </button>
              </div>

              {soapPreview && (
                <div className="pt-4 border-t border-slate-200">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
                    SOAP Preview
                  </p>
                  <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-sm flex flex-col gap-2 max-h-64 overflow-auto">
                    <pre className="whitespace-pre-wrap text-[11px] text-slate-700 leading-relaxed">
                      {soapPreview}
                    </pre>
                    <div className="flex gap-2 mt-2">
                      <button
                        type="button"
                        onClick={() => navigator.clipboard?.writeText(soapPreview)}
                        className="flex-1 py-1.5 text-[10px] font-bold rounded-lg border border-slate-200 text-slate-600 hover:border-blue-400 hover:text-blue-700"
                      >
                        Copy SOAP
                      </button>
                      <button
                        type="button"
                        onClick={() => updateField(
                          'recommendationsPlan',
                          (currentNote?.recommendationsPlan || '') + '\n\n' + soapPreview
                        )}
                        className="flex-1 py-1.5 text-[10px] font-bold rounded-lg bg-blue-600 text-white hover:bg-blue-700 shadow-sm"
                      >
                        Insert into Plan
                      </button>
                    </div>
                  </div>
                </div>
              )}

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
                  <button onClick={() => updateField('recommendationsPlan', currentNote.recommendationsPlan + '\nDiscussed prognosis vs extraction. Checked for swelling/fistula.')} className="mt-3 w-full py-2 bg-purple-600 text-white text-xs font-bold rounded-lg hover:bg-purple-700 transition-colors shadow-sm shadow-purple-200">
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