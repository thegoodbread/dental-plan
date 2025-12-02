
import React, { useState, useEffect, useRef } from 'react';
import { useChairside } from '../../context/ChairsideContext';
import { 
  ArrowLeft, Save, Mic, Wand2, ChevronDown, ChevronUp, 
  Sparkles, FileText, User, Calendar, Plus, RefreshCw, CheckCircle2,
  Stethoscope, Activity, ClipboardList, PenTool, LayoutTemplate
} from 'lucide-react';

// --- Types & Templates ---

type NoteSection = 'cc' | 'assessment' | 'treatment' | 'plan';

interface NoteState {
  cc: string;
  assessment: string;
  treatment: string;
  plan: string;
}

const TEMPLATES: Record<string, NoteState> = {
  'Standard Exam': {
    cc: 'Routine check-up and cleaning.',
    assessment: 'Generalized gingival health WNL. No active caries detected.',
    treatment: 'Comprehensive oral evaluation. Prophylaxis. Fluoride varnish applied.',
    plan: 'Recare in 6 months.'
  },
  'Operative – Filling': {
    cc: 'Sensitivity to cold/sweets or localized decay.',
    assessment: 'Caries noted on radiographic and visual exam. Pulpal status vital.',
    treatment: 'Topical anesthetic. LA administered. Caries excavated. Bond, Composite placed, cured, polished. Occlusion checked.',
    plan: 'Monitor for post-op sensitivity. RTC for next phase.'
  },
  'Crown Preparation': {
    cc: 'Patient aware of fracture/decay and presents for crown preparation.',
    assessment: 'Structural compromise due to fracture/decay. Indicated for full coverage crown.',
    treatment: 'LA administered. Tooth prepared for full coverage crown. Margins refined. Impression taken. Temp crown cemented.',
    plan: 'Schedule crown delivery. Avoid sticky/hard foods.'
  },
  'Crown Delivery': {
    cc: 'Presents for crown delivery.',
    assessment: 'Crown fits well with appropriate margins and contacts.',
    treatment: 'Temp removed. Permanent crown tried in, verified. Cemented with permanent cement. Excess removed.',
    plan: 'Monitor at next recall.'
  },
  'Extraction – Simple': {
    cc: 'Pain/discomfort, requests extraction.',
    assessment: 'Diagnosed as non-restorable due to decay/fracture.',
    treatment: 'LA administered. Simple extraction performed. Socket irrigated. Hemostasis achieved.',
    plan: 'Post-op instructions reviewed. OTC pain management.'
  },
  'Extraction – Surgical': {
    cc: 'Pain/swelling around wisdom tooth.',
    assessment: 'Impaction/partial eruption with inflammation.',
    treatment: 'LA administered. Flap raised, bone removed. Tooth sectioned/removed. Sutures placed.',
    plan: 'Ice, soft diet. RTC 7-10 days for suture removal.'
  },
  'Root Canal': {
    cc: 'Spontaneous pain and temperature sensitivity.',
    assessment: 'Pulpal involvement confirmed. Diagnosis: Irreversible Pulpitis.',
    treatment: 'LA administered. Rubber dam. Access made, canals cleaned/shaped/irrigated. Obturation completed. Temp placed.',
    plan: 'Schedule follow-up for permanent restoration.'
  },
  'Scaling & Root Planing': {
    cc: 'Presents for periodontal therapy.',
    assessment: 'Diagnosis: Periodontitis. Calculus and inflammation present.',
    treatment: 'LA administered. SRP performed in indicated quadrants. Irrigation performed. OHI given.',
    plan: 'Schedule follow-up periodontal evaluation in 6-8 weeks.'
  },
  'Emergency Visit': {
    cc: 'Acute pain/swelling.',
    assessment: 'Limited exam. Radiographs taken. Findings consistent with abscess/fracture.',
    treatment: 'Palliative treatment performed. Discussed findings and options.',
    plan: 'Recommend definitive treatment (RCT/Ext). RTC ASAP.'
  },
  'Post-Op Visit': {
    cc: 'Post-operative evaluation.',
    assessment: 'Healing progressing normally. Tissue health adequate. No infection.',
    treatment: 'Site examined and irrigated. Sutures removed if present.',
    plan: 'Resume normal routine. Monitor at next recall.'
  }
};

const QUICK_PHRASES = [
  "WNL",
  "Patient tolerated well.",
  "No complications noted.",
  "Informed consent obtained.",
  "Risks/benefits/alternatives discussed.",
  "Local anesthesia administered.",
  "Hemostasis achieved."
];

const PLAN_PHRASES = [
  "RTC 6 months",
  "RTC 2 weeks",
  "Discussed options",
  "Referred to specialist",
  "Post-op instructions given"
];

// --- Sub-Components ---

const VisitSummaryStrip = ({ timeline }: { timeline: any[] }) => {
  const procedures = timeline.filter(e => e.type === 'PROCEDURE');
  const uniqueTeeth = Array.from(new Set(procedures.flatMap(p => p.tooth || []))).sort((a: any, b: any) => a - b);
  const provider = procedures[0]?.provider || 'Dr. Smith';
  
  // Determine visit type based on procedures
  let visitType = 'Exam / Consult';
  if (procedures.some(p => p.title.toLowerCase().includes('crown'))) visitType = 'Crown Prep/Seat';
  else if (procedures.some(p => p.title.toLowerCase().includes('extract'))) visitType = 'Oral Surgery';
  else if (procedures.length > 0) visitType = 'Restorative';

  return (
    <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between shadow-sm z-20 relative">
      <div className="flex flex-wrap items-center gap-3">
        {/* Patient Pill */}
        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-full text-sm font-semibold text-slate-700 border border-slate-200">
          <User size={14} className="text-slate-400" />
          <span>John Doe</span>
        </div>
        
        {/* Date Pill */}
        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-full text-sm font-semibold text-slate-700 border border-slate-200">
          <Calendar size={14} className="text-slate-400" />
          <span>{new Date().toLocaleDateString()} • {new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
        </div>

        {/* Visit Type */}
        <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 rounded-full text-sm font-bold text-indigo-700 border border-indigo-100 uppercase tracking-wide">
          <span>{visitType}</span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {uniqueTeeth.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wide hidden md:block">Teeth</span>
            <div className="flex gap-1">
              {uniqueTeeth.map((t: any) => (
                <span key={t} className="w-6 h-6 flex items-center justify-center bg-slate-800 text-white text-xs font-bold rounded-full">{t}</span>
              ))}
            </div>
          </div>
        )}
        <div className="h-6 w-px bg-slate-200 hidden md:block"></div>
        <div className="flex items-center gap-2">
          <select className="bg-transparent font-bold text-slate-700 text-sm outline-none cursor-pointer hover:text-blue-600 transition-colors py-1" defaultValue={provider}>
            <option>{provider}</option>
            <option>Dr. Patel</option>
            <option>Sarah (RDH)</option>
          </select>
        </div>
      </div>
    </div>
  );
};

const SectionCard = ({ 
  title, 
  subtext, 
  value, 
  onChange, 
  onFocus,
  placeholder, 
  controls,
  aiAction,
  isCollapsed,
  onToggleCollapse
}: { 
  title: string, 
  subtext: string, 
  value: string, 
  onChange: (val: string) => void,
  onFocus: () => void,
  placeholder: string,
  controls?: React.ReactNode,
  aiAction?: React.ReactNode,
  isCollapsed: boolean,
  onToggleCollapse: () => void
}) => {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md">
      <div 
        className="px-6 py-4 flex justify-between items-center cursor-pointer bg-white hover:bg-slate-50/50 transition-colors select-none"
        onClick={onToggleCollapse}
      >
        <div className="flex items-center gap-4">
          <div className={`p-2 rounded-lg ${isCollapsed ? 'bg-slate-100 text-slate-400' : 'bg-blue-50 text-blue-600'}`}>
             {isCollapsed ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-bold text-slate-900">{title}</h3>
              {aiAction}
            </div>
            {!isCollapsed && <p className="text-sm text-slate-500 mt-0.5">{subtext}</p>}
          </div>
        </div>
      </div>
      
      {!isCollapsed && (
        <div className="px-6 pb-6 pt-0 space-y-4 animate-in slide-in-from-top-2 duration-200">
          {controls && (
            <div className="flex flex-wrap gap-2 pt-2">
              {controls}
            </div>
          )}
          <textarea 
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onFocus={onFocus}
            placeholder={placeholder}
            className="w-full min-h-[140px] text-lg leading-relaxed p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none placeholder:text-slate-400 transition-shadow font-medium text-slate-700"
          />
        </div>
      )}
    </div>
  );
};

export const NotesComposer = () => {
  const { setCurrentView, addTimelineEvent, timeline, activeComposer } = useChairside();
  
  // State
  const [noteState, setNoteState] = useState<NoteState>({
    cc: '',
    assessment: '',
    treatment: '',
    plan: ''
  });
  
  const [activeSection, setActiveSection] = useState<NoteSection | null>(null);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'idle'>('idle');
  const [isDictating, setIsDictating] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [showTemplates, setShowTemplates] = useState(false);

  // Autosave simulation
  useEffect(() => {
    if (saveStatus === 'saving') {
        const timer = setTimeout(() => setSaveStatus('saved'), 800);
        return () => clearTimeout(timer);
    }
  }, [saveStatus]);

  const handleChange = (section: NoteSection, value: string) => {
    setSaveStatus('saving');
    setNoteState(prev => ({ ...prev, [section]: value }));
  };

  const toggleCollapse = (section: NoteSection) => {
    setCollapsedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const handleSave = () => {
    addTimelineEvent({
      type: 'NOTE',
      title: 'Clinical Note Saved',
      details: 'Comprehensive SOAP note.',
      provider: 'Dr. Smith'
    });
    setCurrentView('DASHBOARD');
  };

  const applyTemplate = (name: string) => {
    const t = TEMPLATES[name];
    if (t) {
      setNoteState(t);
      setSelectedTemplate(name);
      setSaveStatus('saving');
      setShowTemplates(false);
    }
  };

  // --- Logic for "Smart" Buttons ---

  const generateFullAINote = () => {
    // Mocking an AI generation based on timeline context
    const procedures = timeline.filter(e => e.type === 'PROCEDURE');
    const teeth = Array.from(new Set(procedures.flatMap(p => p.tooth || []))).join(', ');
    const procedureNames = procedures.map(p => p.title).join(', ');

    setNoteState({
      cc: 'Patient presents for scheduled treatment today.',
      assessment: `Clinical exam confirms need for treatment on ${teeth ? 'teeth #' + teeth : 'selected areas'}. Gingival health adequate.`,
      treatment: `Review of medical history. Informed consent obtained. ${procedureNames} completed as planned. Patient tolerated procedure well.`,
      plan: 'Next visit: Prophy/Exam in 6 months. Post-op instructions given.'
    });
    setSaveStatus('saving');
  };

  const autoFillTx = () => {
    const procedures = timeline.filter(e => e.type === 'PROCEDURE');
    const text = procedures.map(p => `- ${p.title} ${p.tooth ? `(#${p.tooth.join(',')})` : ''} ${p.details ? `(${p.details})` : ''}`).join('\n');
    const current = noteState.treatment;
    handleChange('treatment', current ? current + '\n' + text : text);
  };

  const insertPhrase = (phrase: string) => {
    if (!activeSection) return;
    const currentText = noteState[activeSection];
    // Smart spacing
    const newText = currentText 
        ? currentText.endsWith(' ') ? currentText + phrase : currentText + ' ' + phrase
        : phrase;
    handleChange(activeSection, newText);
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 relative">
      
      {/* 1. Header */}
      <div className="bg-white px-6 py-3 border-b border-slate-200 flex justify-between items-center shadow-sm z-30 sticky top-0 shrink-0">
         <div className="flex items-center gap-4">
            <button onClick={() => setCurrentView('DASHBOARD')} className="p-2 -ml-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
               <ArrowLeft size={24} />
            </button>
            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">Clinical Notes</h2>
              {saveStatus === 'saving' ? (
                 <span className="text-xs font-bold text-blue-600 flex items-center gap-1"><RefreshCw size={10} className="animate-spin"/> Saving...</span>
              ) : saveStatus === 'saved' ? (
                 <span className="text-xs font-bold text-green-600 flex items-center gap-1 animate-in fade-in"><CheckCircle2 size={10}/> Saved just now</span>
              ) : (
                 <span className="text-xs font-medium text-slate-400">All changes saved</span>
              )}
            </div>
         </div>
         <button 
            onClick={handleSave} 
            className="px-8 h-14 bg-blue-600 text-white text-lg font-bold rounded-2xl hover:bg-blue-700 shadow-lg shadow-blue-200 active:scale-95 transition-all flex items-center gap-2"
         >
            <Save size={20} /> Save Note
         </button>
      </div>

      {/* 2. Visit Summary Strip */}
      <VisitSummaryStrip timeline={timeline} />

      {/* 3. Quick Actions Row */}
      <div className="bg-slate-50 px-6 py-4 flex gap-4 overflow-x-auto scrollbar-hide shrink-0 items-center border-b border-slate-200">
          <button 
            onClick={() => setIsDictating(!isDictating)}
            className={`flex items-center gap-2 px-5 h-12 rounded-xl text-sm font-bold shadow-sm border transition-all shrink-0 ${isDictating ? 'bg-red-50 text-red-600 border-red-200 animate-pulse ring-2 ring-red-100' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}`}
          >
            <Mic size={18} /> {isDictating ? 'Listening...' : 'Dictate'}
          </button>
          
          <div className="relative group shrink-0">
            <button 
                onClick={() => setShowTemplates(!showTemplates)}
                className="flex items-center gap-2 px-5 h-12 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-sm font-bold shadow-sm transition-all"
            >
                <LayoutTemplate size={18} /> {selectedTemplate || 'Choose Template'} <ChevronDown size={14} />
            </button>
            {showTemplates && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowTemplates(false)}></div>
                    <div className="absolute top-full left-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-200 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200 max-h-[60vh] overflow-y-auto">
                        <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 text-xs font-bold text-slate-400 uppercase tracking-wider">Select Template</div>
                        {Object.keys(TEMPLATES).map(t => (
                            <button key={t} onClick={() => applyTemplate(t)} className="w-full text-left px-4 py-3 text-sm font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition-colors border-b border-slate-50 last:border-0">
                                {t}
                            </button>
                        ))}
                    </div>
                </>
            )}
          </div>

          <div className="h-8 w-px bg-slate-200 mx-2 hidden md:block"></div>

          <button 
            onClick={generateFullAINote}
            className="flex items-center gap-2 px-6 h-12 bg-purple-600 hover:bg-purple-700 text-white border border-transparent rounded-xl text-sm font-bold shadow-md shadow-purple-200 transition-all active:scale-95 ml-auto md:ml-0 whitespace-nowrap"
          >
            <Wand2 size={18} /> Insert Full AI Note
          </button>
      </div>

      {/* 4. Main Scroll Area (SOAP Cards) */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 pb-32 space-y-6 scroll-smooth bg-slate-50">
        <div className="max-w-4xl mx-auto space-y-6">
          
          {/* 4A. Chief Complaint */}
          <SectionCard 
            title="Chief Complaint"
            subtext="Patient's main concern in their own words."
            value={noteState.cc}
            onChange={(val) => handleChange('cc', val)}
            onFocus={() => setActiveSection('cc')}
            placeholder="Patient states…"
            isCollapsed={!!collapsedSections['cc']}
            onToggleCollapse={() => toggleCollapse('cc')}
            aiAction={
                <button className="text-xs font-bold text-purple-600 bg-purple-50 hover:bg-purple-100 px-2 py-1 rounded-md transition-colors flex items-center gap-1">
                    <Sparkles size={12}/> AI Summarize
                </button>
            }
            controls={
              <button className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-bold transition-colors border border-slate-200">Pull from intake</button>
            }
          />

          {/* 4B. Assessment */}
          <SectionCard 
            title="Assessment / Diagnosis"
            subtext="Provider's findings, diagnosis, and rationale."
            value={noteState.assessment}
            onChange={(val) => handleChange('assessment', val)}
            onFocus={() => setActiveSection('assessment')}
            placeholder="Clinical findings, diagnosis, and rationale…"
            isCollapsed={!!collapsedSections['assessment']}
            onToggleCollapse={() => toggleCollapse('assessment')}
            aiAction={
                <button className="text-xs font-bold text-purple-600 bg-purple-50 hover:bg-purple-100 px-2 py-1 rounded-md transition-colors flex items-center gap-1">
                    <Wand2 size={12}/> AI Draft
                </button>
            }
          />

          {/* 4C. Treatment Performed */}
          <SectionCard 
            title="Treatment Performed"
            subtext="What was done today, including materials, anesthesia, complications."
            value={noteState.treatment}
            onChange={(val) => handleChange('treatment', val)}
            onFocus={() => setActiveSection('treatment')}
            placeholder="Procedures completed, techniques, materials, anesthesia…"
            isCollapsed={!!collapsedSections['treatment']}
            onToggleCollapse={() => toggleCollapse('treatment')}
            aiAction={
                <button className="text-xs font-bold text-purple-600 bg-purple-50 hover:bg-purple-100 px-2 py-1 rounded-md transition-colors flex items-center gap-1">
                    <Sparkles size={12}/> AI Refine
                </button>
            }
            controls={
                <button onClick={autoFillTx} className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg text-xs font-bold transition-colors border border-blue-100 flex items-center gap-1">
                    <ClipboardList size={14}/> Auto-fill from Timeline
                </button>
            }
          />

          {/* 4D. Plan */}
          <SectionCard 
            title="Next Steps / Plan"
            subtext="Post-op instructions, RTC, and referrals."
            value={noteState.plan}
            onChange={(val) => handleChange('plan', val)}
            onFocus={() => setActiveSection('plan')}
            placeholder="Return to clinic for…, monitor…, refer to…, etc."
            isCollapsed={!!collapsedSections['plan']}
            onToggleCollapse={() => toggleCollapse('plan')}
            aiAction={
                <button className="text-xs font-bold text-purple-600 bg-purple-50 hover:bg-purple-100 px-2 py-1 rounded-md transition-colors flex items-center gap-1">
                    <Wand2 size={12}/> AI Suggest Plan
                </button>
            }
            controls={
              <>
                {PLAN_PHRASES.map(phrase => (
                   <button key={phrase} onClick={() => handleChange('plan', noteState.plan ? `${noteState.plan} ${phrase}` : phrase)} className="px-3 py-1.5 border border-slate-200 bg-white hover:border-blue-300 hover:text-blue-600 text-slate-600 rounded-lg text-xs font-bold transition-colors">{phrase}</button>
                ))}
              </>
            }
          />

        </div>
      </div>

      {/* 5. Floating Quick Phrase Bar (Sticky Bottom) */}
      <div 
        className={`bg-white border-t border-slate-200 p-3 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] transition-transform duration-300 z-40 fixed bottom-0 left-0 right-0 lg:left-[450px] ${activeSection ? 'translate-y-0' : 'translate-y-full'}`}
      >
         <div className="max-w-4xl mx-auto flex gap-3 overflow-x-auto scrollbar-hide py-1 items-center">
            <div className="flex items-center px-2 text-[10px] font-black text-slate-400 uppercase tracking-widest shrink-0 border-r border-slate-100 mr-1 h-8">
               Quick Insert
            </div>
            {QUICK_PHRASES.map((phrase, i) => (
               <button 
                  key={i}
                  onMouseDown={(e) => { e.preventDefault(); insertPhrase(phrase); }} 
                  className="px-4 py-2.5 bg-slate-50 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 whitespace-nowrap transition-all active:scale-95 shadow-sm"
               >
                  {phrase}
               </button>
            ))}
         </div>
      </div>

    </div>
  );
};
