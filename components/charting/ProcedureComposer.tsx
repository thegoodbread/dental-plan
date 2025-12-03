
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useChairside } from '../../context/ChairsideContext';
import { X, Save, User, ChevronDown, Check, ChevronRight, StickyNote, AlertCircle } from 'lucide-react';
import { ToothNumber, VisitType } from '../../domain/dentalTypes';
import { TreatmentPlanItem } from '../../types';

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
      tooth: selectedTeeth.map(t => parseInt(t)), // Back to numbers for timeline visual if needed
      details: noteChip || undefined,
      provider: provider
    });

    // 2. Build Transient Item for Auto-Note Engine
    const transientItem = {
      id: Math.random().toString(36).substr(2, 9),
      procedureName: activeComposer, 
      procedureCode: '', 
      selectedTeeth, // Now passed as ToothNumber[]
      surfaces: selectedSurfaces, // Passed as string[]
      itemType: 'PROCEDURE'
    } as unknown as TreatmentPlanItem; // Cast to satisfy type, knowing we added extra fields if needed by engine

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
                      ? 'bg-blue-600 border-blue-600 text-white shadow-md'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {vt.label}
                  </button>
                ))}
             </div>
             {validationError && (
                <p className="mt-2 text-xs font-bold text-red-500 animate-in fade-in flex items-center gap-1">
                   <AlertCircle size={12} /> {validationError}
                </p>
             )}
          </div>

          {/* 3. Surfaces Row */}
          {['Composite', 'Amalgam', 'Crown', 'Sealant', 'Exam'].includes(activeComposer || '') && (
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Surfaces</label>
              <div className="flex flex-wrap gap-2">
                {SURFACES.map(s => (
                  <button
                    key={s}
                    onClick={() => toggleSurface(s)}
                    className={`w-14 h-14 rounded-2xl text-xl font-bold transition-all border-2 shadow-sm flex items-center justify-center ${
                      selectedSurfaces.includes(s)
                      ? 'bg-blue-600 border-blue-600 text-white shadow-blue-200'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300 active:scale-95'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {/* 4. Provider Trigger */}
          <div>
             <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Provider</label>
             <button 
                onClick={() => setIsProviderSheetOpen(true)}
                className="w-full py-3 px-5 rounded-2xl border-2 border-slate-200 bg-white text-left flex items-center gap-3 active:bg-slate-50 transition-colors"
             >
                <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 border border-indigo-100">
                   <User size={20} />
                </div>
                <div className="flex-1">
                    <div className="text-xs font-bold text-slate-400 uppercase">Assigned To</div>
                    <div className="text-lg font-bold text-slate-900">{provider}</div>
                </div>
                <ChevronDown size={20} className="text-slate-400" />
             </button>
          </div>

          {/* 5. Quick Notes Chips & Trigger */}
          <div>
             <div className="flex items-center justify-between mb-2 ml-1">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest">Clinical Notes</label>
                <button 
                  onClick={() => setIsQuickNoteOpen(true)}
                  className="flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-2 py-1 rounded-md transition-colors"
                >
                   <StickyNote size={14} /> Open Quick Note
                </button>
             </div>
             <div className="flex gap-2 overflow-x-auto pb-2 -mx-2 px-2 scrollbar-hide">
                {['WNL', 'Watch', 'Completed', 'Tol. Well', 'Referral'].map(note => (
                  <button
                    key={note}
                    onClick={() => setNoteChip(note === noteChip ? null : note)}
                    className={`px-5 py-3 rounded-xl text-base font-bold border-2 whitespace-nowrap transition-all ${
                      noteChip === note 
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-500 shadow-sm' 
                      : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {note}
                  </button>
                ))}
             </div>
          </div>

          {/* 6. Main Action */}
          <div className="pt-2">
            {!isSelectionValid() && (
                <div className="mb-3 flex items-center gap-2 text-xs font-bold text-red-500 bg-red-50 p-3 rounded-xl border border-red-100">
                    <AlertCircle size={16} /> Please select at least one tooth to proceed.
                </div>
            )}
            <button 
                onClick={handleSave}
                disabled={!isSelectionValid()}
                className={`w-full h-16 text-xl font-bold rounded-2xl shadow-xl flex items-center justify-center gap-3 transition-all ${isSelectionValid() ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200 active:scale-[0.98]' : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'}`}
            >
                <Save size={24} /> 
                Add to Timeline
            </button>
          </div>

        </div>
      </div>

      {/* --- OVERLAYS (PORTALED to body) --- */}

      {/* Tooth Selection Modal */}
      {isTeethModalOpen && createPortal(
        <div className="fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setIsTeethModalOpen(false)}>
           <div className="bg-slate-50 w-[90vw] md:w-[85vw] h-[90vh] max-w-5xl rounded-[2rem] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 border border-slate-200" onClick={e => e.stopPropagation()}>
              
              {/* Modal Header */}
              <div className="bg-white px-6 py-4 border-b border-slate-200 flex justify-between items-center shrink-0 shadow-sm z-20 relative">
                 <button onClick={() => setIsTeethModalOpen(false)} className="text-slate-500 font-bold hover:text-slate-800 text-lg">Cancel</button>
                 <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Select Teeth</h3>
                 <button onClick={handleToothModalDone} className="text-blue-600 font-bold hover:text-blue-700 text-lg">Done</button>
              </div>
              
              <div className="flex-1 flex flex-col overflow-hidden relative bg-slate-50">
                 
                 {/* Visual Diagram - Fixed Area using Draft State */}
                 <div className="shrink-0 h-[38%] min-h-[200px] bg-white border-b border-slate-200 flex items-center justify-center p-4 shadow-sm z-10">
                    <ToothDiagram selectedTeeth={draftTeeth} />
                 </div>

                 {/* Grid Section - Flex container for vertical centering */}
                 <div className="flex-1 overflow-y-auto p-2 flex flex-col justify-center">
                    <div className="max-w-5xl mx-auto w-full space-y-2">
                        {/* Upper Arch */}
                        <div className="space-y-1">
                            <div className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Upper Arch</div>
                            <div className="flex flex-col gap-2 items-center">
                                <div className="flex items-center gap-4">
                                    <span className="text-2xl font-black text-slate-300 w-8 text-right">UR</span>
                                    <div className="flex gap-2 justify-center flex-wrap">
                                        {UPPER_TEETH.slice(0, 8).map(t => (
                                            <ToothButton key={t} t={t} selected={draftTeeth.includes(t)} onClick={() => handleToothModalToggle(t)} />
                                        ))}
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className="text-2xl font-black text-slate-300 w-8 text-right">UL</span>
                                    <div className="flex gap-2 justify-center flex-wrap">
                                        {UPPER_TEETH.slice(8, 16).map(t => (
                                            <ToothButton key={t} t={t} selected={draftTeeth.includes(t)} onClick={() => handleToothModalToggle(t)} />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Lower Arch */}
                        <div className="space-y-1 mt-2">
                            <div className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Lower Arch</div>
                            <div className="flex flex-col gap-2 items-center">
                                <div className="flex items-center gap-4">
                                    <span className="text-2xl font-black text-slate-300 w-8 text-right">LL</span>
                                    <div className="flex gap-2 justify-center flex-wrap">
                                        {LOWER_TEETH.slice(0, 8).map(t => (
                                            <ToothButton key={t} t={t} selected={draftTeeth.includes(t)} onClick={() => handleToothModalToggle(t)} />
                                        ))}
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className="text-2xl font-black text-slate-300 w-8 text-right">LR</span>
                                    <div className="flex gap-2 justify-center flex-wrap">
                                        {LOWER_TEETH.slice(8, 16).map(t => (
                                            <ToothButton key={t} t={t} selected={draftTeeth.includes(t)} onClick={() => handleToothModalToggle(t)} />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                 </div>
              </div>
           </div>
        </div>,
        document.body
      )}

      {/* Provider Bottom Sheet */}
      {isProviderSheetOpen && createPortal(
        <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm" onClick={() => setIsProviderSheetOpen(false)}>
          <div 
            className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl animate-in slide-in-from-bottom duration-300 border-t border-slate-100 max-w-2xl mx-auto md:max-w-none md:mx-0"
            onClick={e => e.stopPropagation()}
          >
             <div className="p-3 flex justify-center">
                <div className="w-16 h-1.5 bg-slate-300 rounded-full"></div>
             </div>
             <div className="p-8 pt-2 pb-12">
                <h3 className="text-xl font-bold text-slate-900 mb-6 px-2">Select Provider</h3>
                <div className="space-y-3">
                   {PROVIDERS.map(p => (
                      <button
                        key={p}
                        onClick={() => { setProvider(p); setIsProviderSheetOpen(false); }}
                        className={`w-full py-4 px-6 text-left text-lg font-bold rounded-2xl flex items-center justify-between transition-all ${provider === p ? 'bg-blue-50 text-blue-700 border-2 border-blue-200' : 'bg-white text-slate-700 border-2 border-slate-100 hover:bg-slate-50'}`}
                      >
                         {p}
                         {provider === p && <div className="bg-blue-600 text-white rounded-full p-1"><Check size={18} /></div>}
                      </button>
                   ))}
                </div>
             </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
};
