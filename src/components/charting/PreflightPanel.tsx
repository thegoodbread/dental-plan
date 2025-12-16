
import React from 'react';
import { ClipboardList, CheckCircle, ArrowRight } from 'lucide-react';
import { MissingItem } from '../../domain/ClaimReadinessEngine';

interface PreflightPanelProps {
  items: MissingItem[];
  onResolve: (label: string) => void;
}

export const PreflightPanel: React.FC<PreflightPanelProps> = ({ items, onResolve }) => {
  const adminItems = items.filter(i => i.kind === 'admin' || i.kind === 'procedure_detail' || i.kind === 'coherence');

  return (
    <div className="flex flex-col h-full bg-slate-50">
      <div className="px-4 py-3 border-b border-slate-200 bg-white z-10">
        <div className="flex items-center gap-2 mb-1">
            <div className="bg-slate-100 p-1.5 rounded-md text-slate-500">
                <ClipboardList size={16} />
            </div>
            <div>
                <h3 className="font-bold text-slate-800 text-sm tracking-tight">Preflight Checks</h3>
            </div>
        </div>
        <p className="text-[10px] text-slate-400">
            {adminItems.filter(i => i.severity === 'blocker').length} administrative blockers found.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
        {adminItems.length === 0 ? (
             <div className="text-center py-12">
                 <div className="inline-flex p-3 bg-green-50 rounded-full text-green-500 mb-3">
                     <CheckCircle size={24} />
                 </div>
                 <p className="text-xs font-medium text-slate-600">All admin checks passed.</p>
             </div>
        ) : (
            adminItems.map((item, idx) => {
                const isWarning = item.severity === 'warning';
                return (
                    <div key={idx} className={`bg-white border rounded-lg p-3 shadow-sm flex items-center justify-between ${isWarning ? 'border-amber-200' : 'border-red-200'}`}>
                        <div className="flex flex-col">
                            <span className="text-xs font-bold text-slate-800">{item.label}</span>
                            <span className={`text-[9px] font-bold uppercase tracking-wider mt-0.5 ${isWarning ? 'text-amber-600' : 'text-red-500'}`}>
                                {isWarning ? 'Warning' : 'Blocker'}
                            </span>
                        </div>
                        <button 
                            onClick={() => onResolve(item.label)}
                            className="text-[10px] font-bold bg-blue-50 text-blue-600 px-3 py-1.5 rounded hover:bg-blue-100 transition-colors flex items-center gap-1"
                        >
                            {isWarning ? 'Review' : 'Resolve'} <ArrowRight size={10} />
                        </button>
                    </div>
                );
            })
        )}
      </div>
    </div>
  );
};
