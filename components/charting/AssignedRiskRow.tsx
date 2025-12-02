
import React from 'react';
import { Trash2, GripVertical, ChevronDown } from 'lucide-react';
import { AssignedRisk, RiskSeverity } from '../../domain/dentalTypes';

interface AssignedRiskRowProps {
  risk: AssignedRisk;
  onToggleExpand: (id: string) => void;
  onRemove: (id: string) => void;
  // In a real dnd implementation, these would be passed from the dnd-kit context
  dragHandleProps?: any; 
}

const getSeverityBadgeClass = (s: RiskSeverity) => {
  switch(s) {
      case 'COMMON': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'UNCOMMON': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'RARE': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'VERY_RARE': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-slate-100 text-slate-600 border-slate-200';
  }
};

export const AssignedRiskRow: React.FC<AssignedRiskRowProps> = ({ 
  risk, 
  onToggleExpand, 
  onRemove,
  dragHandleProps
}) => {
  return (
    <div 
      className={`
        group relative bg-white border border-slate-200 rounded-md shadow-sm mb-2 transition-all duration-300
        hover:border-slate-300 hover:shadow-md
        animate-in fade-in slide-in-from-right-2
      `}
    >
      <div 
        className="flex items-start p-3 cursor-pointer select-none"
        onClick={() => onToggleExpand(risk.id)}
      >
        {/* Drag Handle */}
        <div 
          className="mr-3 mt-0.5 text-slate-300 cursor-grab hover:text-slate-500 active:cursor-grabbing"
          onClick={(e) => e.stopPropagation()} // Prevent expand when grabbing
          {...dragHandleProps}
        >
          <GripVertical size={16} />
        </div>

        {/* Severity Badge */}
        <div className={`mt-0.5 shrink-0 text-[10px] font-bold uppercase px-1.5 py-0.5 rounded border mr-3 ${getSeverityBadgeClass(risk.severitySnapshot)}`}>
            {risk.severitySnapshot.charAt(0)}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-slate-800 leading-tight">
                    {risk.titleSnapshot}
                </span>
            </div>
            
            <div className={`mt-1 text-xs text-slate-500 leading-relaxed transition-all duration-300 ${risk.isExpanded ? 'whitespace-pre-wrap' : 'truncate'}`}>
                {risk.bodySnapshot}
            </div>
            
            {/* Metadata Footer (visible only when expanded) */}
            {risk.isExpanded && (
                <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                    <div>
                        Added: {new Date(risk.addedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} • ID: {risk.riskLibraryItemId.split('_')[0]}
                    </div>
                    <div className="font-mono">
                        v{risk.riskLibraryVersion}
                    </div>
                </div>
            )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col items-center gap-2 ml-3">
            <button 
                onClick={(e) => { e.stopPropagation(); onRemove(risk.id); }}
                className="p-1.5 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                title="Remove Risk"
            >
                <Trash2 size={14} />
            </button>
            <div className={`text-slate-300 transition-transform duration-200 ${risk.isExpanded ? 'rotate-180' : ''}`}>
                <ChevronDown size={14} />
            </div>
        </div>
      </div>
    </div>
  );
};
