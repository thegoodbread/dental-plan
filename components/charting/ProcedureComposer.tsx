
import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useChairside } from '../../context/ChairsideContext';
import { X, Save, User, ChevronDown, Check, ChevronRight, StickyNote } from 'lucide-react';
import { ToothNumber, ToothRecord } from '../../domain/dentalTypes';
import { TreatmentPlanItem } from '../../types';

const SURFACES = ['M', 'O', 'D', 'B', 'L', 'I', 'F']; 
const PROVIDERS = ['Dr. Smith', 'Dr. Patel', 'Sarah (RDH)', 'Mike (DA)'];

// --- ANATOMICAL DIAGRAM COMPONENT ---
const ToothDiagram = ({ selectedTeeth }: { selectedTeeth: number[] }) => {
  // Helper to calculate tooth positions on an arch
  // Upper Arch (1-16): Convex Up (y=20 to 70), X spans 20 to 320.
  // 1 is Left (Patient Right), 16 is Right (Patient Left).
  const getUpperPos = (t: number) => {
    // Distribute 1-16 along an arc
    const index = t - 1; // 0-15
    const percent = index / 15; // 0 to 1
    // Simple quadratic curve approximation
    const x = 40 + (percent * 260); // Inset slightly for labels
    // Y curve
    const y = 0.0022 * Math.pow(x - 170, 2) + 30;
    return { x, y };
  };

  // Lower Arch (17-32): Convex Down (y=140 to 90)
  // Standard Dentist View: 32 is Left, 17 is Right.
  const getLowerPos = (t: number) => {
    // t is 17..32.
    // We want 32 at x=20, 17 at x=320.
    const index = 32 - t; // 32->0, 17->15
    const percent = index / 15;
    const x = 40 + (percent * 260);
    // Y curve
    const y = -0.0022 * Math.pow(x - 170, 2) + 130;
    return { x, y };
  };

  return (
    <div className="w-full max-w-[550px] aspect-[2.2/1] mx-auto relative select-none pointer-events-none">
      <svg viewBox="0 0 340 160" className="w-full h-full drop-shadow-sm">
        {/* Quadrant Labels inside Diagram */}
        <text x="20" y="35" className="text-[10px] fill-slate-300 font-bold uppercase tracking-widest">UR</text>
        <text x="305" y="35" className="text-[10px] fill-slate-300 font-bold uppercase tracking-widest">UL</text>
        <text x="20" y="135" className="text-[10px] fill-slate-300 font-bold uppercase tracking-widest">LR</text>
        <text x="305" y="135" className="text-[10px] fill-slate-300 font-bold uppercase tracking-widest">LL</text>

        {/* Upper Gum Line (Visual Guide) */}
        <path d="M 40 70 Q 170 -10 300 70" fill="none" stroke="#e2e8f0" strokeWidth="2" strokeLinecap="round" />
        {/* Lower Gum Line (Visual Guide) */}
        <path d="M 40 90 Q 170 170 300 90" fill="none" stroke="#e2e8f0" strokeWidth="2" strokeLinecap="round" />

        {/* Upper Teeth 1-16 */}
        {Array.from({ length: 16 }).map((_, i) => {
          const t = i + 1;
          const { x, y } = getUpperPos(t);
          const isSelected = selectedTeeth.includes(t);
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
          const t = 17 + i; // 17, 18 ... 32
          // Diagram logic: 17 is on Right (Screen Right), 32 is on Left (Screen Left)
          // getLowerPos handles 32->Left, 17->Right logic internally
          const { x, y } = getLowerPos(t);
          const isSelected = selectedTeeth.includes(t);
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

// Button Component for Grid (Moved outside)
const ToothButton: React.FC<{ t: number, selected: boolean, onClick: () => void }> = ({ t, selected, onClick }) => (
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
    addTimelineEvent, 
    clearTeeth, 
    setIsQuickNoteOpen, // Use Global Context for Drawer
    updateCurrentNoteSectionsFromProcedure // New Context Method
  } = useChairside();
  
  const [selectedSurfaces, setSelectedSurfaces] = useState<string[]>([]);
  const [provider, setProvider] = useState('Dr. Smith');
  const [noteChip, setNoteChip] = useState<string | null>(null);
  
  // Modal States
  const [isTeethModalOpen, setIsTeethModalOpen] = useState(false);
  const [isProviderSheetOpen, setIsProviderSheetOpen] = useState(false);

  if (!activeComposer) return null;

  const toggleSurface = (s: string) => {
    setSelectedSurfaces(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  };

  const handleSave = () => {
    let title = activeComposer;
    if (selectedTeeth.length > 0) title += ` #${selectedTeeth.join(',')}`;
    if (selectedSurfaces.length > 0) title += ` - ${selectedSurfaces.join('')}`;
    
    // 1. Add to Timeline (Visual Only)
    addTimelineEvent({
      type: 'PROCEDURE',
      title: title,
      tooth: selectedTeeth,
      details: noteChip || undefined,
      provider: provider
    });

    // 2. Build Transient Item for Auto-Note Engine
    // We map the activeComposer (string) to a dummy TreatmentPlanItem
    // The engine uses 'procedureName' to fuzzy match canonical names (e.g. "Composite")
    const transientItem = {
      id: Math.random().toString(36).substr(2, 9),
      procedureName: activeComposer, 
      procedureCode: '', // Engine will match by name if code missing
      selectedTeeth: selectedTeeth,
      itemType: 'PROCEDURE'
    } as TreatmentPlanItem;

    // 3. Trigger Auto-Population
    updateCurrentNoteSectionsFromProcedure(transientItem);

    // Reset
    setActiveComposer(null);
    clearTeeth();
    setSelectedSurfaces([]);
    setNoteChip(null);
  };

  // Dental sequence helper: 1-16 (Upper), 17-32 (Lower - sequential)
  const UPPER_TEETH = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];
  const LOWER_TEETH = [17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32]; 

  return (
    <div className="mb-8 relative z-30">
      {/* Main Card */}
      <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden animate-in slide-in-from-bottom-6 duration-300">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div>
            <div className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">New Procedure</div>
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">{activeComposer}</h3>
          </div>
          <button 
            onClick={() => setActiveComposer(null)} 
            className="w-10 h-10 flex items-center justify-center bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200 active:bg-slate-300 transition-colors"
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

          {/* 2. Surfaces Row */}
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
          
          {/* 3. Provider Trigger */}
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

          {/* 4. Quick Notes Chips & Trigger */}
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

          {/* 5. Main Action */}
          <div className="pt-2">
            <button 
                onClick={handleSave}
                className="w-full h-16 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white text-xl font-bold rounded-2xl shadow-xl shadow-blue-200 flex items-center justify-center gap-3 transition-all"
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
                 <button onClick={() => setIsTeethModalOpen(false)} className="text-blue-600 font-bold hover:text-blue-700 text-lg">Done</button>
              </div>
              
              <div className="flex-1 flex flex-col overflow-hidden relative bg-slate-50">
                 
                 {/* Visual Diagram - Fixed Area */}
                 <div className="shrink-0 h-[38%] min-h-[200px] bg-white border-b border-slate-200 flex items-center justify-center p-4 shadow-sm z-10">
                    <ToothDiagram selectedTeeth={selectedTeeth} />
                 </div>

                 {/* Grid Section - Flex container for vertical centering */}
                 <div className="flex-1 overflow-y-auto p-2 flex flex-col justify-center">
                    <div className="max-w-5xl mx-auto w-full space-y-2">
                        {/* Upper Arch */}
                        <div className="space-y-1">
                            <div className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Upper Arch</div>
                            <div className="flex flex-col gap-2 items-center">
                                {/* Row 1: 1-8 */}
                                <div className="flex items-center gap-4">
                                    <span className="text-2xl font-black text-slate-300 w-8 text-right">UR</span>
                                    <div className="flex gap-2 justify-center flex-wrap">
                                        {UPPER_TEETH.slice(0, 8).map(t => (
                                            <ToothButton key={t} t={t} selected={selectedTeeth.includes(t)} onClick={() => toggleTooth(t)} />
                                        ))}
                                    </div>
                                </div>
                                {/* Row 2: 9-16 */}
                                <div className="flex items-center gap-4">
                                    <span className="text-2xl font-black text-slate-300 w-8 text-right">UL</span>
                                    <div className="flex gap-2 justify-center flex-wrap">
                                        {UPPER_TEETH.slice(8, 16).map(t => (
                                            <ToothButton key={t} t={t} selected={selectedTeeth.includes(t)} onClick={() => toggleTooth(t)} />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Lower Arch */}
                        <div className="space-y-1 mt-2">
                            <div className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Lower Arch</div>
                            <div className="flex flex-col gap-2 items-center">
                                {/* Row 3: 17-24 */}
                                <div className="flex items-center gap-4">
                                    <span className="text-2xl font-black text-slate-300 w-8 text-right">LL</span>
                                    <div className="flex gap-2 justify-center flex-wrap">
                                        {LOWER_TEETH.slice(0, 8).map(t => (
                                            <ToothButton key={t} t={t} selected={selectedTeeth.includes(t)} onClick={() => toggleTooth(t)} />
                                        ))}
                                    </div>
                                </div>
                                {/* Row 4: 25-32 */}
                                <div className="flex items-center gap-4">
                                    <span className="text-2xl font-black text-slate-300 w-8 text-right">LR</span>
                                    <div className="flex gap-2 justify-center flex-wrap">
                                        {LOWER_TEETH.slice(8, 16).map(t => (
                                            <ToothButton key={t} t={t} selected={selectedTeeth.includes(t)} onClick={() => toggleTooth(t)} />
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
