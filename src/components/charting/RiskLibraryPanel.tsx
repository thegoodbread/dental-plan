
import React, { useState, useEffect } from 'react';
import { Search, Plus, Filter, ShieldAlert, Check, Lightbulb, Target } from 'lucide-react';
import { RISK_LIBRARY } from '../../domain/riskLibrary';
import { RiskCategory, RiskLibraryItem, RiskSeverity } from '../../domain/dentalTypes';

interface RiskLibraryPanelProps {
  onAssignRisk: (item: RiskLibraryItem) => void;
  assignedRiskIds: string[]; // List of IDs currently active in the note
  tenantId?: string | null; // Optional: Enforce tenant isolation if provided
  recommendedCategories?: string[]; // New: Filter based on procedure context
}

const CATEGORIES: { id: RiskCategory | 'ALL' | 'RECOMMENDED', label: string }[] = [
  { id: 'RECOMMENDED', label: 'Recommended' },
  { id: 'ALL', label: 'All' },
  { id: 'DIRECT_RESTORATION', label: 'Restorative' },
  { id: 'INDIRECT_RESTORATION', label: 'Crowns' },
  { id: 'EXTRACTION', label: 'Surgery' },
  { id: 'ENDO', label: 'Endo' },
  { id: 'IMPLANT', label: 'Implant' },
  { id: 'ANESTHESIA', label: 'Anes' },
];

export const RiskLibraryPanel: React.FC<RiskLibraryPanelProps> = ({ 
  onAssignRisk,
  assignedRiskIds,
  tenantId,
  recommendedCategories
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('ALL');

  useEffect(() => {
      if (recommendedCategories && recommendedCategories.length > 0) {
          setActiveCategory('RECOMMENDED');
      }
  }, [recommendedCategories]);

  const filteredRisks = RISK_LIBRARY.filter(risk => {
    if (!risk.isApprovedForProduction) return false;
    if (risk.deprecatedAt) return false;
    
    const effectiveTenantId = tenantId;
    if (risk.tenantId && risk.tenantId !== effectiveTenantId) return false;

    const matchesSearch = risk.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          risk.body.toLowerCase().includes(searchTerm.toLowerCase());
    
    let matchesCategory = false;
    if (activeCategory === 'ALL') {
        matchesCategory = true;
    } else if (activeCategory === 'RECOMMENDED') {
        if (recommendedCategories && recommendedCategories.length > 0) {
            matchesCategory = recommendedCategories.includes(risk.category);
        } else {
            matchesCategory = true; 
        }
    } else {
        matchesCategory = risk.category === activeCategory;
    }
    
    return matchesSearch && matchesCategory;
  });

  const handleAddRisk = (risk: RiskLibraryItem) => {
    onAssignRisk(risk);
  };

  const getSeverityBadgeClass = (severity: RiskSeverity) => {
      switch(severity) {
          case 'COMMON': return 'bg-blue-100 text-blue-800 border-blue-200';
          case 'UNCOMMON': return 'bg-amber-100 text-amber-800 border-amber-200';
          case 'RARE': return 'bg-orange-100 text-orange-800 border-orange-200';
          case 'VERY_RARE': return 'bg-red-100 text-red-800 border-red-200';
          default: return 'bg-gray-100 text-gray-700 border-gray-200';
      }
  };

  const hasRecommendations = recommendedCategories && recommendedCategories.length > 0;

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* Sticky Header */}
      <div className="px-4 py-3 border-b border-slate-200 bg-white z-10">
        <div className="flex items-center gap-2 mb-3">
            <div className="bg-slate-100 p-1.5 rounded-md text-slate-500">
                <ShieldAlert size={16} />
            </div>
            <div>
                <h3 className="font-bold text-slate-800 text-sm tracking-tight">Risk Library</h3>
                <p className="text-[10px] text-slate-400">Drag or click to add evidence</p>
            </div>
        </div>
        
        {/* Search */}
        <div className="relative mb-3">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input 
               type="text" 
               placeholder="Search risk statements..."
               className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-sm font-medium focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400"
               value={searchTerm}
               onChange={e => setSearchTerm(e.target.value)}
            />
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap gap-1.5">
            {CATEGORIES.map(cat => {
                if (cat.id === 'RECOMMENDED' && !hasRecommendations) return null;
                
                return (
                    <button 
                        key={cat.id}
                        onClick={() => setActiveCategory(cat.id)}
                        className={`px-2 py-1 text-[10px] font-bold rounded border transition-all uppercase tracking-wide flex items-center gap-1 ${
                            activeCategory === cat.id 
                            ? 'bg-slate-800 text-white border-slate-800 shadow-sm' 
                            : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                    >
                        {cat.id === 'RECOMMENDED' && <Lightbulb size={10} className={activeCategory === 'RECOMMENDED' ? 'text-yellow-300' : 'text-yellow-500'} />}
                        {cat.label}
                    </button>
                );
            })}
        </div>
      </div>

      {/* Scrollable List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-slate-50 custom-scrollbar">
         {filteredRisks.map(risk => {
             const isAssigned = assignedRiskIds.includes(risk.id);
             return (
                 <div 
                    key={risk.id}
                    className={`
                        group relative bg-white border rounded-md p-3 shadow-sm transition-all duration-200
                        ${isAssigned 
                            ? 'border-blue-300 bg-blue-50 ring-1 ring-blue-200 cursor-default' 
                            : 'border-slate-200 hover:border-blue-300 hover:shadow-md cursor-pointer'
                        }
                    `}
                    onClick={() => !isAssigned && handleAddRisk(risk)}
                 >
                    <div className="flex justify-between items-start mb-2">
                        <span className={`inline-flex px-1.5 py-px rounded text-[9px] font-bold uppercase tracking-wider border ${getSeverityBadgeClass(risk.severity)}`}>
                            {risk.severity.replace('_', ' ')}
                        </span>
                        
                        {/* Target Slot Indicator */}
                        <div className="flex items-center gap-1 text-[9px] text-slate-400 font-medium">
                            <Target size={10} />
                            <span>Target: Plan / Risks</span>
                        </div>
                    </div>
                    
                    <h4 className={`font-bold text-xs mb-1 ${isAssigned ? 'text-blue-900' : 'text-slate-900'}`}>{risk.title}</h4>
                    <p className={`text-[11px] leading-tight line-clamp-2 ${isAssigned ? 'text-blue-800/70' : 'text-slate-500'}`}>
                        {risk.body}
                    </p>

                    {/* Add Action (Hover) */}
                    {!isAssigned && (
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="bg-blue-600 text-white px-2 py-0.5 rounded text-[10px] font-bold shadow-sm flex items-center gap-1">
                                <Plus size={10} /> Add
                            </div>
                        </div>
                    )}
                    {isAssigned && (
                        <div className="absolute top-2 right-2">
                            <div className="text-blue-600 bg-white/80 px-1.5 py-0.5 rounded border border-blue-100 flex items-center gap-1 text-[10px] font-bold">
                                <Check size={10} /> Added
                            </div>
                        </div>
                    )}
                 </div>
             );
         })}
         
         {filteredRisks.length === 0 && (
             <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                 <Filter size={24} className="mb-2 opacity-20" />
                 <p className="text-xs font-medium">No approved risks found.</p>
                 {activeCategory === 'RECOMMENDED' && (
                     <button onClick={() => setActiveCategory('ALL')} className="mt-2 text-xs text-blue-600 hover:underline">View All Risks</button>
                 )}
             </div>
         )}
         
         <div className="pt-4 mt-2 border-t border-slate-200">
            <p className="text-[10px] text-slate-400 italic text-center leading-relaxed">
              Adding evidence here automatically populates the corresponding slot in the Claim Structure (Left) and Output (Center).
            </p>
         </div>
      </div>
    </div>
  );
};
