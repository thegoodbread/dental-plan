
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useChairside } from '../../context/ChairsideContext';
import { X, Save, User, ChevronDown, Check, ChevronRight, StickyNote, AlertCircle } from 'lucide-react';
import { ToothNumber, VisitType, NoteEngineProcedureInput } from '../../domain/dentalTypes';

const SURFACES = ['M', 'O', 'D', 'B', 'L', 'I', 'F']; 
const PROVIDERS = ['Dr. Smith', 'Dr. Patel', 'Sarah (RDH)', 'Mike (DA)'];

const VISIT_TYPES: { key: VisitType; label: string }[] = [
  { key: 'restorative', label: 'Restorative' },
  { key: 'endo',        label: 'Endo' },
  { key: 'hygiene',     label: 'Hygiene' },
  { key: 'exam',        label: 'Exam' },
  { key: 'surgery',     label: 'Surgery' },
  { key: 'ortho',       label: 'Ortho' },
];

// --- ANATOMICAL DIAGRAM COMPONENT (VISUAL ONLY) ---
const ToothDiagram = ({ selectedTeeth }: { selectedTeeth: ToothNumber[] }) => {
  // Helper to calculate tooth positions on an arch
  const getUpperPos = (t: number) => {
    const index = t - 1; 
    const percent = index / 15; 
    const x = 40 + (percent * 260); 
    const y = 0.0022 * Math.pow(x - 170, 2) + 30;
    return { x, y };
  };

  const getLowerPos = (t: number) => {
    const index = 32 - t; 
    const percent = index / 15;
    const x = 40 + (percent * 260);
    const y = -0.0022 * Math.pow(x - 170, 2) + 130;
    return { x, y };
  };

  return (
    <div className="w-full max-w-[550px] aspect-[2.2/1] mx-auto relative select-none pointer-events-none">
      <svg viewBox="0 0 340 160" className="w-full h-full drop-shadow-sm">
        <text x="20" y="35" className="text-[10px] fill-slate-300 font-bold uppercase tracking-widest">UR</text>
        <text x="305" y="35" className="text-[10px] fill-slate-300 font-bold uppercase tracking-widest">UL</text>
        <text x="20" y="135" className="text-[10px] fill-slate-300 font-bold uppercase tracking-widest">LR</text>
        <text x="305" y="135" className="text-[10px] fill-slate-300 font-bold uppercase tracking-widest">LL</text>

        <path d="M 40 70 Q 170 -10 300 70" fill="none" stroke="#e2e8f0" strokeWidth="2" strokeLinecap="round" />
        <path d="M 40 90 Q 170 170 300 90" fill="none" stroke="#e2e8f0" strokeWidth="2" strokeLinecap="round" />

        {/* Upper Teeth 1-16 */}
        {Array.from({ length: 16 }).map((_, i) => {
          const t = i + 1;
          const { x, y } = getUpperPos(t);
          const isSelected = selectedTeeth.includes(String(t) as ToothNumber);
          return (
            <g key={t}>
              <circle 
                cx={x} cy={y} r={isSelected ? 9 : 7} 
                fill={isSelected ? '#2563eb' : 'white'} 
                stroke={isSelected ? '#2563eb' : '#94a3b8'} 
                strokeWidth="2"
                className="transition-all duration-200 ease-out"
              />
              {isSelected && (
                 <circle cx={x} cy={y} r={14} fill="#3b82f6" opacity="0.2" className="animate-pulse" />
              )}
              <text x={x} y={y - 14} textAnchor="middle" fontSize="8" fill="#94a3b8" fontWeight="bold">{t}</text>
            </g>
          );
        })}

        {/* Lower Teeth 17-32 */}
        {Array.from({ length: 16 }).map((_, i) => {
          const t = 17 + i; 
          const { x, y } = getLowerPos(t);
          const isSelected = selectedTeeth.includes(String(t) as ToothNumber);
          return (
            <g key={t}>
              <circle 
                cx={x} cy={y} r={isSelected ? 9 : 7} 
                fill={isSelected ? '#2563eb' : 'white'} 
                stroke={isSelected ? '#2563eb' : '#94a3b8'} 
                strokeWidth="2" 
                className="transition-all duration-200 ease-out"
              />
              {isSelected && (
                 <circle cx={x} cy={y} r={14} fill="#3b82f6" opacity="0.2" className="animate-pulse" />
              )}
              <text x={x} y={y + 20} textAnchor="middle" fontSize="8" fill="#94a3b8" fontWeight="bold">{t}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

// Button Component for Grid
const ToothButton: React.FC<{ t: ToothNumber, selected: boolean, onClick: () => void }> = ({ t, selected, onClick }) => (
  <button
    onClick={onClick}
    className={`
      w-16 h-16 md:w-20 md:h-20 rounded-2xl text-2xl font-bold transition-all flex items-center justify-center border-2
      ${selected 
      ? 'bg-blue-600 border-blue-600 text-white shadow-xl shadow-blue-200/50 scale-105 z-10' 
      : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 active:bg-slate-50'}
    `}
  >
    {t}
  </button>
);

export const ProcedureComposer = () => {
  const { 
    activeComposer, 
    setActiveComposer, 
    selectedTeeth, 
    toggleTooth, 
    clearTeeth, 
    addTimelineEvent, 
    setIsQuickNoteOpen, 
    updateCurrentNoteSectionsFromProcedure 
  } = useChairside();
  
  const [selectedSurfaces, setSelectedSurfaces] = useState<string[]>([]);
  const [provider, setProvider] = useState('Dr. Smith');
  const [noteChip, setNoteChip] = useState<string | null>(null);
  
  // Visit Type now explicit null default, required
  const [visitType, setVisitType] = useState<VisitType | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  
  // Modal States
  const [isTeethModalOpen, setIsTeethModalOpen] = useState(false);
  const [draftTeeth, setDraftTeeth] = useState<ToothNumber[]>([]);
  
  const [isProviderSheetOpen, setIsProviderSheetOpen] = useState(false);

  // Sync draft teeth when modal opens
  useEffect(() => {
    if (isTeethModalOpen) {
      setDraftTeeth(selectedTeeth);
    }
  }, [isTeethModalOpen, selectedTeeth]);

  if (!activeComposer) return null;

  const toggleSurface = (s: string) => {
    setSelectedSurfaces(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  };

  const resetComposer = () => {
    setActiveComposer(null);
    clearTeeth();
    setSelectedSurfaces([]);
    setNoteChip(null);
    setVisitType(null); // Reset to null
    setValidationError(null);
  };

  const handleToothModalToggle = (t: ToothNumber) => {
    setDraftTeeth(prev => 
      prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]
    );
  };

  const handleToothModalDone = () => {
    // Commit changes to context
    clearTeeth();
    draftTeeth.forEach(t => toggleTooth(parseInt(t)));
    setIsTeethModalOpen(false);
  };

  const isSelectionValid = () => {
    const requiresTooth = ['Composite', 'Crown', 'Extraction', 'Root Canal', 'Implant'].includes(activeComposer);
    if (requiresTooth && selectedTeeth.length === 0) return false;
    return true;
  };

  const handleSave = () => {
    if (!isSelectionValid()) return;

    if (!visitType) {
      setValidationError("Please select a visit type before adding this procedure to the note.");
      return;
    }
    setValidationError(null);

    let title = activeComposer;
    if (selectedTeeth.length > 0) title += ` #${selectedTeeth.join(',')}`;
    if (selectedSurfaces.length > 0) title += ` - ${selectedSurfaces.join('')}`;
    
    // 1. Add to Timeline (Visual Only)
    addTimelineEvent({
      type: 'PROCEDURE',
      title: title,
      tooth: selectedTeeth.map(t => parseInt(t)), // Back to numbers for timeline visual
      details: noteChip || undefined,
      provider: provider
    });

    // 2. Build Transient Item for Auto-Note Engine using Strict Type
    // Replaced unsafe cast with type-safe construction
    const transientItem: NoteEngineProcedureInput = {
      id: Math.random().toString(36).substr(2, 9),
      procedureName: activeComposer, 
      procedureCode: '', // In a real app, this would be looked up from a fee schedule
      selectedTeeth, // Now passed strictly as ToothNumber[]
      surfaces: selectedSurfaces, 
    };

    // 3. Trigger Auto-Population with explicit visitType
    updateCurrentNoteSectionsFromProcedure(transientItem, visitType);

    resetComposer();
  };

  // Dental sequence helpers
  const UPPER_TEETH: ToothNumber[] = Array.from({length: 16}, (_, i) => String(i + 1) as ToothNumber);
  const LOWER_TEETH: ToothNumber[] = Array.from({length: 16}, (_, i) => String(i + 17) as ToothNumber);

  return (
    <div className="mb-8 relative z-30">
      {/* Main Card */}
      <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden animate-in slide-in-from-bottom-6 duration-300">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-start bg-slate-50/50">
          <div>
            <div className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">New Procedure</div>
            <h3 className="text-2xl font-black text-slate-900 tracking-tight leading-none">{activeComposer}</h3>
            
            {/* Context Pills */}
            <div className="flex flex-wrap gap-2 mt-2">
                {selectedTeeth.length > 0 && (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700 uppercase tracking-wide">
                    Teeth #{selectedTeeth.join(', ')}
                    </span>
                )}
                {visitType && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-600 uppercase tracking-wide">
                      {VISIT_TYPES.find(v => v.key === visitType)?.label || visitType}
                  </span>
                )}
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-600 uppercase tracking-wide">
                    {provider}
                </span>
            </div>
          </div>
          <button 
            onClick={resetComposer} 
            className="w-10 h-10 flex items-center justify-center bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200 active:bg-slate-300 transition-colors shrink-0 ml-2"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          
          {/* 1. Teeth Selector Trigger */}
          <div>
             <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Teeth Selection</label>
             <button 
               onClick={() => setIsTeethModalOpen(true)}
               className={`w-full py-4 px-5 rounded-2xl border-2 text-left flex justify-between items-center transition-all group active:scale-[0.99] ${selectedTeeth.length > 0 ? 'border-blue-500 bg-blue-50/50' : 'border-slate-200 bg-slate-50 hover:bg-white hover:border-blue-300'}`}
             >
                <div className="flex flex-col">
                    <span className="text-xs font-semibold text-slate-400 uppercase mb-1">Target Teeth</span>
                    <span className={`text-xl font-bold ${selectedTeeth.length > 0 ? 'text-blue-900' : 'text-slate-400'}`}>
                    {selectedTeeth.length > 0 ? `#${selectedTeeth.join(', #')}` : 'Select Teeth...'}
                    </span>
                </div>
                <div className={`p-2.5 rounded-xl transition-colors ${selectedTeeth.length > 0 ? 'bg-blue-100 text-blue-600' : 'bg-white border border-slate-200 text-slate-400 group-hover:border-blue-300 group-hover:text-blue-500'}`}>
                   <ChevronRight size={20} />
                </div>
             </button>
          </div>

          {/* 2. Visit Type Selector */}
          <div>
             <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Visit Type</label>
             <div className="flex flex-wrap gap-2">
                {VISIT_TYPES.map(vt => (
                  <button
                    key={vt.key}
                    onClick={() => { setVisitType(vt.key); setValidationError(null); }}
                    className={`px-4 py-2 rounded-xl text-sm font-bold border-2 transition-all ${
                      visitType === vt.key
                      ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-200' 
                      : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    {vt.label}
                  </button>
                ))}
             </div>
          </div>

          {/* 3. Surface Selector (Conditional) */}
          {['Composite', 'Amalgam'].includes(activeComposer) && (
            <div>
               <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Surfaces</label>
               <div className="flex gap-2">
                  {SURFACES.map(s => (
                    <button
                      key={s}
                      onClick={() => toggleSurface(s)}
                      className={`w-12 h-12 rounded-xl font-bold text-lg transition-all border-2 ${selectedSurfaces.includes(s) ? 'bg-blue-600 border-blue-600 text-white shadow-md' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'}`}
                    >
                      {s}
                    </button>
                  ))}
               </div>
            </div>
          )}

          {/* Validation Error */}
          {validationError && (
            <div className="p-3 bg-red-50 text-red-700 text-sm font-medium rounded-xl flex items-center gap-2 border border-red-100">
               <AlertCircle size={16} /> {validationError}
            </div>
          )}

          {/* Action Footer */}
          <div className="pt-4 flex gap-3">
             <button 
                onClick={resetComposer}
                className="flex-1 py-4 rounded-xl font-bold text-slate-500 hover:bg-slate-100 transition-colors"
             >
                Cancel
             </button>
             <button 
                onClick={handleSave}
                className="flex-[2] py-4 bg-slate-900 text-white rounded-xl font-bold shadow-lg shadow-slate-200 hover:bg-slate-800 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
             >
                <Save size={20} />
                Add to Chart
             </button>
          </div>
        </div>
      </div>

      {/* TEETH SELECTOR MODAL */}
      {isTeethModalOpen && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/90 backdrop-blur-sm p-4 animate-in fade-in duration-200">
           <div className="bg-slate-100 w-full max-w-4xl h-[85vh] rounded-3xl overflow-hidden shadow-2xl flex flex-col">
              <div className="px-8 py-6 bg-white border-b border-slate-200 flex justify-between items-center">
                 <h2 className="text-2xl font-black text-slate-900 tracking-tight">Select Teeth</h2>
                 <button onClick={() => setIsTeethModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full"><X size={24}/></button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-8">
                 <div className="grid grid-cols-8 gap-4 max-w-3xl mx-auto mb-8">
                    {/* Upper Arch 1-16 */}
                    {UPPER_TEETH.map(t => (
                       <ToothButton key={t} t={t} selected={draftTeeth.includes(t)} onClick={() => handleToothModalToggle(t)} />
                    ))}
                 </div>
                 <div className="w-full h-px bg-slate-300 max-w-3xl mx-auto mb-8 relative">
                    <span className="absolute left-1/2 -translate-x-1/2 -top-3 bg-slate-100 px-4 text-slate-400 font-bold text-xs uppercase tracking-widest">Midline</span>
                 </div>
                 <div className="grid grid-cols-8 gap-4 max-w-3xl mx-auto">
                    {/* Lower Arch 32-17 (Reversed for visual correctness L->R) */}
                    {[...LOWER_TEETH].reverse().map(t => (
                       <ToothButton key={t} t={t} selected={draftTeeth.includes(t)} onClick={() => handleToothModalToggle(t)} />
                    ))}
                 </div>
              </div>

              <div className="p-6 bg-white border-t border-slate-200 flex justify-end gap-4">
                 <button onClick={() => setDraftTeeth([])} className="px-6 py-3 font-bold text-slate-500 hover:text-slate-800">Clear Selection</button>
                 <button onClick={handleToothModalDone} className="px-8 py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg hover:bg-blue-700 active:scale-95 transition-all">Confirm Selection</button>
              </div>
           </div>
        </div>,
        document.body
      )}
    </div>
  );
};
