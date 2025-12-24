import { Search, X, Clock, AlertCircle, FileText, Upload, Download, Info, Star, PlusCircle, ArrowRight } from 'lucide-react';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { FeeScheduleEntry, FeeCategory, SelectionRules, ProcedureDefinition, EffectiveProcedure, ProcedureUnitType } from '../../types';
import { getFeeSchedule } from '../../services/treatmentPlans';
import { resolveEffectiveProcedure, listEffectiveProcedures } from '../../domain/procedureResolver';
import { mergeOrUpsertClinicProcedure } from '../../domain/clinicProcedureLibrary';
import { getProcedureIcon } from '../../utils/getProcedureIcon';
import { ToothSelector } from '../ToothSelector';

interface ProcedurePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (entry: FeeScheduleEntry & { selectedTeeth?: number[], selectedQuadrants?: any[], selectedArches?: any[], surfaces?: string[] }) => void;
}

const CATEGORIES: (FeeCategory | 'ALL')[] = [
  'ALL', 'DIAGNOSTIC', 'PREVENTIVE', 'RESTORATIVE', 'ENDODONTIC', 
  'PERIO', 'IMPLANT', 'PROSTHETIC', 'ORTHO', 'COSMETIC', 'OTHER'
];

const UNIT_TYPES: ProcedureUnitType[] = [
    'PER_TOOTH', 'PER_QUADRANT', 'PER_ARCH', 'FULL_MOUTH', 'PER_PROCEDURE', 'PER_VISIT', 'TIME_BASED'
];

export const ProcedurePickerModal: React.FC<ProcedurePickerModalProps> = ({ 
  isOpen, onClose, onSelect 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<FeeCategory | 'ALL'>('ALL');
  
  // Selection Logic State
  const [configuringProc, setConfiguringProc] = useState<EffectiveProcedure | null>(null);
  const [selectedTeeth, setSelectedTeeth] = useState<number[]>([]);
  const [selectedSurfaces, setSelectedSurfaces] = useState<string[]>([]);
  const [selectedQuads, setSelectedQuads] = useState<('UR'|'UL'|'LR'|'LL')[]>([]);
  const [selectedArches, setSelectedArches] = useState<('UPPER'|'LOWER')[]>([]);

  // Custom Form State
  const [isCreatingCustom, setIsCreatingCustom] = useState(false);
  const [customForm, setCustomForm] = useState({
      displayName: '',
      unitType: 'PER_PROCEDURE' as ProcedureUnitType,
      category: 'OTHER' as FeeCategory,
      baseFee: 0
  });

  const searchInputRef = useRef<HTMLInputElement>(null);
  const library = useMemo(() => listEffectiveProcedures(), [isOpen]);

  const displayList = useMemo(() => {
    let items = library;
    if (selectedCategory !== 'ALL') items = items.filter(i => i.category === selectedCategory);
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      items = items.filter(i => 
        i.cdtCode.toLowerCase().includes(term) ||
        i.displayName.toLowerCase().includes(term)
      );
    }
    return items;
  }, [library, searchTerm, selectedCategory]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
      setConfiguringProc(null);
      setIsCreatingCustom(false);
    }
  }, [isOpen]);

  const handleEntryClick = (proc: EffectiveProcedure) => {
    setConfiguringProc(proc);
    setSelectedTeeth([]);
    setSelectedSurfaces([]);
    setSelectedQuads([]);
    setSelectedArches([]);
    setIsCreatingCustom(false);
  };

  const handleStartCustom = () => {
      const isCdt = /^[a-zA-Z]\d{4}$/.test(searchTerm);
      setCustomForm({
          displayName: isCdt ? '' : searchTerm,
          unitType: 'PER_PROCEDURE',
          category: 'OTHER',
          baseFee: 0
      });
      setIsCreatingCustom(true);
  };

  const commitCustom = () => {
      if (!customForm.displayName) return;
      const cdtCode = /^[a-zA-Z]\d{4}$/.test(searchTerm) ? searchTerm.toUpperCase() : `CUST-${Math.floor(Math.random()*1000)}`;
      mergeOrUpsertClinicProcedure({
          cdtCode,
          displayName: customForm.displayName,
          baseFee: customForm.baseFee,
          membershipFee: null,
          categoryOverride: customForm.category,
          unitTypeOverride: customForm.unitType
      });
      const newEff = resolveEffectiveProcedure(cdtCode);
      if (newEff) handleEntryClick(newEff);
  };

  const commitSelection = () => {
    if (!configuringProc) return;
    onSelect({
        id: `proc_${configuringProc.cdtCode}`,
        procedureCode: configuringProc.cdtCode,
        procedureName: configuringProc.displayName,
        category: configuringProc.category,
        unitType: configuringProc.unitType,
        baseFee: configuringProc.pricing.baseFee,
        membershipFee: configuringProc.pricing.membershipFee,
        isActive: true,
        defaultEstimatedVisits: configuringProc.defaults.defaultEstimatedVisits,
        selectedTeeth: selectedTeeth.length ? selectedTeeth : undefined,
        selectedQuadrants: selectedQuads.length ? selectedQuads : undefined,
        selectedArches: selectedArches.length ? selectedArches : undefined,
        surfaces: selectedSurfaces.length ? selectedSurfaces : undefined
    });
    onClose();
  };

  const validation = useMemo(() => {
    if (!configuringProc) return { ok: true, msg: "" };
    const rules = configuringProc.selectionRules;
    if (rules.requiresToothSelection && selectedTeeth.length === 0) return { ok: false, msg: "Select at least one tooth." };
    if (rules.allowsQuadrants && selectedQuads.length === 0) return { ok: false, msg: "Select at least one quadrant." };
    if (rules.allowsArch && selectedArches.length === 0) return { ok: false, msg: "Select an arch." };
    if (rules.requiresSurfaces && selectedSurfaces.length === 0) return { ok: false, msg: "Surfaces required." };
    return { ok: true, msg: "" };
  }, [configuringProc, selectedTeeth, selectedQuads, selectedArches, selectedSurfaces]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-4xl h-[85vh] rounded-2xl shadow-2xl overflow-hidden border border-gray-200 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-100 flex items-center justify-between shrink-0 bg-gray-50/50">
             <div className="relative flex-1 max-w-md">
                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                 <input
                    ref={searchInputRef}
                    type="text"
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Search human name or CDT code..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                 />
             </div>
             <button onClick={onClose} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full ml-4"><X size={20}/></button>
        </div>

        <div className="flex-1 flex overflow-hidden min-h-0">
            <div className="w-56 border-r border-gray-100 bg-gray-50/50 p-4 shrink-0 overflow-y-auto hidden md:block">
                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Categories</h4>
                <div className="space-y-1">
                    {CATEGORIES.map(cat => (
                        <button
                            key={cat}
                            onClick={() => { setSelectedCategory(cat); setIsCreatingCustom(false); }}
                            className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-all ${selectedCategory === cat ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'}`}
                        >
                            {cat === 'ALL' ? 'All' : cat.charAt(0) + cat.slice(1).toLowerCase()}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex-1 flex flex-col min-w-0 bg-white">
                {configuringProc ? (
                    <div className="flex-1 flex flex-col animate-in slide-in-from-right duration-200 overflow-hidden">
                        <div className="p-6 pb-2 shrink-0 flex justify-between items-start border-b border-gray-50">
                            <div>
                                <h3 className="text-xl font-bold text-gray-900 leading-tight">{configuringProc.displayName}</h3>
                                <div className="text-sm font-mono font-bold text-blue-600 mt-1">{configuringProc.cdtCode}</div>
                            </div>
                            <button onClick={() => setConfiguringProc(null)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors"><X size={20} className="text-gray-400"/></button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 pt-4 space-y-8">
                            {configuringProc.selectionRules.requiresToothSelection && (
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Anatomical Selection</label>
                                    <div className="flex justify-center bg-gray-50 p-4 rounded-2xl border border-gray-100 w-full overflow-hidden shadow-inner">
                                        <ToothSelector selectedTeeth={selectedTeeth} onChange={setSelectedTeeth} />
                                    </div>
                                    
                                    {configuringProc.selectionRules.requiresSurfaces && selectedTeeth.length > 0 && (
                                        <div className="animate-in fade-in slide-in-from-top-1 bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                                            <label className="text-[10px] font-black text-blue-600 uppercase tracking-widest block mb-3">Clinical Surfaces</label>
                                            <div className="flex gap-2 flex-wrap">
                                                {['M', 'O', 'D', 'B', 'L', 'I', 'F'].map(s => (
                                                    <button
                                                        key={s}
                                                        onClick={() => setSelectedSurfaces(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])}
                                                        className={`w-11 h-11 rounded-xl border-2 font-bold text-sm transition-all ${selectedSurfaces.includes(s) ? 'bg-blue-600 border-blue-600 text-white shadow-md' : 'bg-white border-gray-200 text-gray-500 hover:border-blue-400'}`}
                                                    >
                                                        {s}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {configuringProc.selectionRules.allowsArch && (
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Arch Selection</label>
                                    <div className="grid grid-cols-2 gap-4">
                                        {(['UPPER', 'LOWER'] as const).map(arch => (
                                            <button
                                                key={arch}
                                                onClick={() => setSelectedArches(prev => prev.includes(arch) ? prev.filter(x => x !== arch) : [...prev, arch])}
                                                className={`p-6 rounded-2xl border-2 font-black transition-all text-lg flex flex-col items-center gap-2 ${selectedArches.includes(arch) ? 'bg-blue-600 border-blue-600 text-white shadow-lg' : 'bg-white border-gray-200 text-gray-600 hover:border-blue-400'}`}
                                            >
                                                <span>{arch} ARCH</span>
                                                <span className="text-[10px] font-bold uppercase opacity-60">{arch === 'UPPER' ? 'Maxillary' : 'Mandibular'}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {configuringProc.selectionRules.allowsQuadrants && (
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Select Quadrants</label>
                                    <div className="grid grid-cols-4 gap-3">
                                        {(['UR', 'UL', 'LR', 'LL'] as const).map(q => (
                                            <button
                                                key={q}
                                                onClick={() => setSelectedQuads(prev => prev.includes(q) ? prev.filter(x => x !== q) : [...prev, q])}
                                                className={`p-4 md:p-5 rounded-2xl border-2 font-black transition-all text-base ${selectedQuads.includes(q) ? 'bg-blue-600 border-blue-600 text-white shadow-lg' : 'bg-white border-gray-200 text-gray-600 hover:border-blue-400'}`}
                                            >
                                                {q}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="p-6 border-t border-gray-100 flex flex-col items-end gap-3 shrink-0 bg-gray-50/50">
                            {!validation.ok && (
                                <div className="flex items-center gap-2 text-red-600 text-[10px] font-bold bg-red-50 px-3 py-2 rounded-lg border border-red-100 animate-in slide-in-from-bottom-1 uppercase tracking-widest">
                                    <AlertCircle size={14} /> {validation.msg}
                                </div>
                            )}
                            <div className="flex gap-4 w-full">
                                <button onClick={() => setConfiguringProc(null)} className="flex-1 py-3 text-sm font-bold text-gray-500 hover:text-gray-800 transition-colors uppercase tracking-widest">Cancel</button>
                                <button 
                                    onClick={commitSelection}
                                    disabled={!validation.ok}
                                    className="flex-[2] py-3 bg-blue-600 text-white text-sm font-bold rounded-xl shadow-lg disabled:opacity-50 disabled:shadow-none hover:bg-blue-700 transition-all uppercase tracking-widest flex items-center justify-center gap-2"
                                >
                                    Confirm & Add <ArrowRight size={18} />
                                </button>
                            </div>
                        </div>
                    </div>
                ) : isCreatingCustom ? (
                    <div className="flex-1 flex flex-col p-8 animate-in zoom-in-95 duration-200 overflow-y-auto">
                        <div className="max-w-md mx-auto w-full space-y-6">
                            <header className="text-center mb-4">
                                <h3 className="text-3xl font-black text-gray-900 tracking-tight">Custom Entry</h3>
                                <p className="text-sm text-gray-500 mt-1">Procedure not found in library. Define it below.</p>
                            </header>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Clinical Label</label>
                                    <input 
                                        autoFocus
                                        className="w-full p-4 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none text-base font-bold shadow-sm"
                                        placeholder="e.g. Guided Bone Regeneration"
                                        value={customForm.displayName}
                                        onChange={e => setCustomForm({...customForm, displayName: e.target.value})}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Scope</label>
                                        <select 
                                            className="w-full p-4 bg-white border border-gray-300 rounded-2xl outline-none font-bold shadow-sm"
                                            value={customForm.unitType}
                                            onChange={e => setCustomForm({...customForm, unitType: e.target.value as any})}
                                        >
                                            {UNIT_TYPES.map(u => <option key={u} value={u}>{u.replace('_', ' ')}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Std Fee ($)</label>
                                        <input 
                                            type="number"
                                            className="w-full p-4 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-bold shadow-sm"
                                            value={customForm.baseFee}
                                            onChange={e => setCustomForm({...customForm, baseFee: parseFloat(e.target.value) || 0})}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="pt-8 flex gap-4">
                                <button onClick={() => setIsCreatingCustom(false)} className="flex-1 py-4 font-bold text-gray-400 hover:bg-gray-100 rounded-2xl transition-all uppercase tracking-widest">Back</button>
                                <button 
                                    onClick={commitCustom}
                                    disabled={!customForm.displayName}
                                    className="flex-[2] py-4 bg-slate-900 text-white rounded-2xl font-bold shadow-xl shadow-slate-200 hover:bg-slate-800 disabled:opacity-50 disabled:shadow-none transition-all flex items-center justify-center gap-2 uppercase tracking-widest"
                                >
                                    Define & Pick <ArrowRight size={18} />
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col min-h-0">
                        <div className="flex-1 overflow-y-auto custom-scrollbar">
                            <div className="divide-y divide-gray-50">
                                {displayList.map(item => {
                                    const Icon = getProcedureIcon({ procedureCode: item.cdtCode, procedureName: item.displayName });
                                    const isNeedsLabel = item.isLabelMissing;
                                    return (
                                        <div
                                            key={item.cdtCode}
                                            onClick={() => handleEntryClick(item)}
                                            className="px-6 py-5 flex items-center justify-between cursor-pointer transition-all hover:bg-blue-50 group"
                                        >
                                            <div className="flex items-center gap-5 min-w-0">
                                                <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 bg-gray-100 text-gray-400 group-hover:bg-white group-hover:text-blue-600 group-hover:shadow-md transition-all">
                                                    <Icon size={24} />
                                                </div>
                                                <div className="min-w-0">
                                                    <div className={`font-bold text-base truncate transition-colors ${isNeedsLabel ? 'text-amber-600 italic' : 'text-gray-900 group-hover:text-blue-900'}`}>
                                                        {item.displayName}
                                                    </div>
                                                    <div className="flex items-center gap-3 mt-1">
                                                        <code className="text-xs font-mono font-bold bg-slate-100 px-2 py-0.5 rounded text-slate-500">{item.cdtCode}</code>
                                                        <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">{item.category}</span>
                                                        {isNeedsLabel && (
                                                            <span className="text-[9px] font-bold bg-amber-50 text-amber-700 px-1.5 py-px rounded border border-amber-100 uppercase tracking-widest">Action: Label Required</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right ml-4 shrink-0">
                                                <div className="text-base font-black text-gray-900">${item.pricing.baseFee}</div>
                                                {item.pricing.membershipFee !== null && (
                                                    <div className="text-[10px] text-teal-600 font-bold uppercase tracking-wider flex items-center justify-end gap-1">
                                                        <Star size={10} fill="currentColor" /> ${item.pricing.membershipFee}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {displayList.length === 0 && (
                                <div className="flex flex-col items-center justify-center py-24 px-8 text-center animate-in fade-in duration-700">
                                    <div className="w-20 h-20 bg-blue-50 text-blue-500 rounded-3xl flex items-center justify-center mb-6 shadow-inner">
                                        <PlusCircle size={40} />
                                    </div>
                                    <h4 className="text-2xl font-black text-gray-900 tracking-tight">Manual Entry Required</h4>
                                    <p className="text-sm text-gray-500 max-w-xs mx-auto mt-2 mb-10 leading-relaxed">
                                        The code or name <strong>"{searchTerm}"</strong> is not in your clinical library yet.
                                    </p>
                                    <button 
                                        onClick={handleStartCustom}
                                        className="px-10 py-4 bg-slate-900 text-white rounded-2xl font-black shadow-2xl shadow-slate-200 hover:bg-slate-800 transition-all flex items-center gap-2 uppercase tracking-widest active:scale-95"
                                    >
                                        Define "{searchTerm || 'Custom'}"
                                    </button>
                                </div>
                            )}
                        </div>
                        
                        {displayList.length > 0 && searchTerm.length > 1 && (
                             <div className="p-5 bg-gray-50 border-t border-gray-100 flex justify-center shrink-0">
                                 <button 
                                    onClick={handleStartCustom}
                                    className="text-xs font-black text-blue-600 hover:text-blue-800 flex items-center gap-2 uppercase tracking-widest transition-colors"
                                 >
                                    <PlusCircle size={16} /> Add as new custom procedure
                                 </button>
                             </div>
                        )}
                    </div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};