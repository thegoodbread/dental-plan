
import React from 'react';
import { Trash2, GripVertical, ChevronDown, Check, User } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { AssignedRisk, RiskSeverity } from '../../src/domain/dentalTypes';

interface AssignedRiskRowProps {
  risk: AssignedRisk;
  onToggleExpand: (id: string) => void;
  onRemove: (id: string) => void;
  onUpdateConsent: (id: string, updates: Partial<AssignedRisk>) => void;
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
  onUpdateConsent
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: risk.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 'auto',
    opacity: isDragging ? 0.5 : 1,
    position: 'relative' as 'relative',
  };
  
  const handleConsentCapture = (e: React.MouseEvent) => {
      e.stopPropagation();
      onUpdateConsent(risk.id, {
          consentCapturedAt: new Date().toISOString(),
          // User ID handled by parent logic usually, but here we trigger the update
      });
  };

  const handleNoteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onUpdateConsent(risk.id, { consentNote: e.target.value });
  };

  const handleMethodChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      onUpdateConsent(risk.id, { consentMethod: e.target.value as any });
  };

  return (
    <div 
      ref={setNodeRef}
      style={style}
      className={`
        group relative bg-white border border-slate-200 rounded-md shadow-sm mb-2 transition-all duration-300
        hover:border-slate-300 hover:shadow-md
        animate-in fade-in slide-in-from-right-2
        ${isDragging ? 'shadow-xl ring-2 ring-blue-400' : ''}
      `}
    >
      <div 
        className="flex items-start p-3 cursor-pointer select-none"
        onClick={() => onToggleExpand(risk.id)}
      >
        {/* Drag Handle */}
        <div 
          className="mr-3 mt-0.5 text-slate-300 cursor-grab hover:text-slate-500 active:cursor-grabbing outline-none touch-none"
          onClick={(e) => e.stopPropagation()} // Prevent expand when grabbing
          {...attributes}
          {...listeners}
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
                <div className="mt-3 pt-2 border-t border-slate-100 text-[10px] text-slate-400 cursor-default" onClick={e => e.stopPropagation()}>
                    <div className="flex justify-between items-center mb-2">
                        <span>Added: {new Date(risk.addedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                        <span className="font-mono bg-slate-50 px-1 rounded border border-slate-100">v{risk.riskLibraryVersion}</span>
                    </div>

                    {/* Consent Controls */}
                    <div className="bg-slate-50 p-2 rounded border border-slate-200 flex flex-wrap gap-2 items-center">
                        <select 
                            value={risk.consentMethod} 
                            onChange={handleMethodChange}
                            className="bg-white border border-slate-300 text-slate-700 text-[10px] rounded px-2 py-1 outline-none focus:border-blue-500"
                        >
                            <option value="VERBAL">Verbal Consent</option>
                            <option value="WRITTEN">Written Consent</option>
                            <option value="ELECTRONIC_SIGNATURE">E-Signature</option>
                        </select>

                        <input 
                            type="text" 
                            placeholder="Add consent note..." 
                            value={risk.consentNote || ''}
                            onChange={handleNoteChange}
                            className="flex-1 bg-white border border-slate-300 text-slate-700 text-[10px] rounded px-2 py-1 outline-none focus:border-blue-500 placeholder:text-slate-400"
                        />

                        {risk.consentCapturedAt ? (
                            <div className="flex items-center gap-1 text-green-600 font-bold bg-green-50 px-2 py-1 rounded border border-green-100">
                                <Check size={10} />
                                <span>Captured {new Date(risk.consentCapturedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                            </div>
                        ) : (
                            <button 
                                onClick={handleConsentCapture}
                                className="bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold px-3 py-1 rounded shadow-sm transition-colors flex items-center gap-1"
                            >
                                <User size={10} /> Capture
                            </button>
                        )}
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
