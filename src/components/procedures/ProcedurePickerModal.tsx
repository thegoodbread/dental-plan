
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, X, Clock, AlertCircle, FileText, Upload, Download, Info } from 'lucide-react';
// FIX: ProcedureDefinition is now available from types.ts
import { FeeScheduleEntry, FeeCategory, SelectionRules, ProcedureDefinition, EffectiveProcedure } from '../../types';
import { getFeeSchedule } from '../../services/treatmentPlans';
import { resolveEffectiveProcedure, listEffectiveProcedures } from '../../domain/procedureResolver';
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
    }
  }, [isOpen]);

  const handleEntryClick = (proc: EffectiveProcedure) => {
    setConfiguringProc(proc);
    setSelectedTeeth([]);
    setSelectedSurfaces([]);
    setSelectedQuads([]);
    setSelectedArches([]);
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
        <div className="p-4 border-b border-gray-100 flex items-center justify-between shrink-0">
             <div className="relative flex-1 max-w-md">
                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                 <input
                    ref={searchInputRef}
                    type="text"
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Search CDT code or procedure..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                 />
             </div>
             <button onClick={onClose} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full ml-4"><X size={20}/></button>
        </div>

        <div className="flex-1 flex overflow-hidden">
            <div className="w-56 border-r border-gray-100 bg-gray-50/50 p-4 shrink-0 overflow-y-auto hidden md:block">
                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Categories</h4>
                <div className="space-y-1">
                    {CATEGORIES.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-all ${selectedCategory === cat ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'}`}
                        >
                            {cat === 'ALL' ? 'All' : cat.charAt(0) + cat.slice(1).toLowerCase()}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex-1 flex flex-col min-w-0 bg-white">
                {configuringProc ? (
                    <div className="flex-1 flex flex-col p-8 animate-in slide-in-from-right duration-200 overflow-y-auto">
                        <div className="mb-6 flex justify-between items-start">
                            <div>
                                <h3 className="text-xl font-bold text-gray-900">{configuringProc.displayName}</h3>
                                <div className="text-sm font-mono text-gray-500 mt-1">{configuringProc.cdtCode}</div>
                            </div>
                            <button onClick={() => setConfiguringProc(null)} className="text-xs font-bold text-blue-600 hover:underline">Change Procedure</button>
                        </div>

                        <div className="space-y-8 flex-1">
                            {configuringProc.selectionRules.requiresToothSelection && (
                                <div className="space-y-3">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Select Teeth</label>
                                    <div className="flex justify-center bg-gray-50 p-4 rounded-xl border border-gray-100">
                                        <ToothSelector selectedTeeth={selectedTeeth} onChange={setSelectedTeeth} />
                                    </div>
                                    {configuringProc.selectionRules.requiresSurfaces && selectedTeeth.length > 0 && (
                                        <div className="animate-in fade-in slide-in-from-top-1">
                                            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">Select Surfaces</label>
                                            <div className="flex gap-2">
                                                {['M', 'O', 'D', 'B', 'L', 'I', 'F'].map(s => (
                                                    <button
                                                        key={s}
                                                        onClick={() => setSelectedSurfaces(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])}
                                                        className={`w-10 h-10 rounded-lg border-2 font-bold text-sm transition-all ${selectedSurfaces.includes(s) ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'}`}
                                                    >
                                                        {s}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {configuringProc.selectionRules.allowsQuadrants && (
                                <div className="space-y-3">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Select Quadrants</label>
                                    <div className="grid grid-cols-4 gap-2">
                                        {(['UR', 'UL', 'LR', 'LL'] as const).map(q => (
                                            <button
                                                key={q}
                                                onClick={() => setSelectedQuads(prev => prev.includes(q) ? prev.filter(x => x !== q) : [...prev, q])}
                                                className={`p-4 rounded-xl border-2 font-bold transition-all ${selectedQuads.includes(q) ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-gray-200 text-gray-600 hover:border-blue-300'}`}
                                            >
                                                {q}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {configuringProc.selectionRules.allowsArch && (
                                <div className="space-y-3">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Select Arch</label>
                                    <div className="grid grid-cols-2 gap-3 max-w-sm">
                                        {(['UPPER', 'LOWER'] as const).map(a => (
                                            <button
                                                key={a}
                                                onClick={() => setSelectedArches(prev => prev.includes(a) ? prev.filter(x => x !== a) : [...prev, a])}
                                                className={`p-4 rounded-xl border-2 font-bold transition-all ${selectedArches.includes(a) ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-gray-200 text-gray-600 hover:border-blue-300'}`}
                                            >
                                                {a}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="pt-8 border-t border-gray-100 flex flex-col items-end gap-3 shrink-0">
                            {!validation.ok && (
                                <div className="flex items-center gap-2 text-red-600 text-xs font-bold bg-red-50 px-3 py-2 rounded-lg border border-red-100 animate-in slide-in-from-bottom-1">
                                    <AlertCircle size={14} /> {validation.msg}
                                </div>
                            )}
                            <div className="flex gap-3">
                                <button onClick={() => setConfiguringProc(null)} className="px-6 py-2 text-sm font-bold text-gray-500 hover:text-gray-800 transition-colors">Cancel</button>
                                <button 
                                    onClick={commitSelection}
                                    disabled={!validation.ok}
                                    className="px-8 py-2 bg-blue-600 text-white font-bold rounded-lg shadow-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 transition-all"
                                >
                                    Add to Plan
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 overflow-y-auto">
                        <div className="divide-y divide-gray-50">
                            {displayList.map(item => {
                                const Icon = getProcedureIcon({ procedureCode: item.cdtCode, procedureName: item.displayName });
                                return (
                                    <div
                                        key={item.cdtCode}
                                        onClick={() => handleEntryClick(item)}
                                        className="px-4 py-4 flex items-center justify-between cursor-pointer transition-all hover:bg-blue-50/50 group"
                                    >
                                        <div className="flex items-center gap-4 min-w-0">
                                            <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 bg-gray-100 text-gray-400 group-hover:bg-blue-100 group-hover:text-blue-600">
                                                <Icon size={20} />
                                            </div>
                                            <div className="min-w-0">
                                                <div className="font-bold text-sm text-gray-900 group-hover:text-blue-900 truncate">{item.displayName}</div>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <code className="text-xs font-mono bg-white border border-gray-100 px-1 rounded text-gray-500">{item.cdtCode}</code>
                                                    <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">{item.category}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right ml-4 shrink-0">
                                            <div className="text-sm font-bold text-gray-900">${item.pricing.baseFee}</div>
                                            {item.pricing.membershipFee !== null && <div className="text-[10px] text-teal-600 font-bold uppercase">Member: ${item.pricing.membershipFee}</div>}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};
