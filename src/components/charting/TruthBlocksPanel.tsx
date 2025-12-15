
import React from 'react';
import { useChairside } from '../../context/ChairsideContext';
import { CheckSquare, Square, FileText } from 'lucide-react';
import { TruthAssertion, AssertionSection, SLOT_ORDER, SLOT_LABELS } from '../../domain/TruthAssertions';

const SECTIONS: { id: AssertionSection; label: string }[] = [
  { id: 'SUBJECTIVE', label: 'Subjective' },
  { id: 'OBJECTIVE', label: 'Objective' },
  { id: 'ASSESSMENT', label: 'Assessment' },
  { id: 'TREATMENT_PERFORMED', label: 'Treatment Performed' },
  { id: 'PLAN', label: 'Plan' },
];

export const TruthBlocksPanel: React.FC = () => {
  const { truthAssertions, setTruthAssertions, noteStatus } = useChairside();

  if (!truthAssertions) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-slate-400">
        <FileText size={48} className="mb-4 opacity-20" />
        <p className="text-sm font-medium text-center">No facts generated for this visit yet.</p>
        <p className="text-xs text-center mt-2 opacity-60">Add procedures or verify visit details.</p>
      </div>
    );
  }

  const isLocked = noteStatus === 'signed';

  const handleToggle = (assertionId: string) => {
    if (isLocked) return;
    
    const updatedAssertions = truthAssertions.assertions.map(a => 
      a.id === assertionId ? { ...a, checked: !a.checked } : a
    );

    setTruthAssertions({
      ...truthAssertions,
      assertions: updatedAssertions
    });
  };

  const groupedAssertions = SECTIONS.map(section => {
    const items = truthAssertions.assertions.filter(a => a.section === section.id);
    // Sort items by SLOT_ORDER
    items.sort((a, b) => {
        const slotAIndex = SLOT_ORDER.indexOf(a.slot || 'MISC');
        const slotBIndex = SLOT_ORDER.indexOf(b.slot || 'MISC');
        if (slotAIndex !== slotBIndex) return slotAIndex - slotBIndex;
        return a.sortOrder - b.sortOrder;
    });
    
    return {
        ...section,
        items
    };
  }).filter(g => g.items.length > 0);

  return (
    <div className="flex flex-col h-full bg-slate-50">
      <div className="px-4 py-3 border-b border-slate-200 bg-white z-10 shrink-0">
        <h3 className="font-bold text-slate-800 text-sm tracking-tight flex items-center gap-2">
          <CheckSquare size={16} className="text-blue-600" />
          Verify Facts
        </h3>
        <p className="text-xs text-slate-500 mt-1 leading-snug">
          Checked items appear under their slots in the note. Unchecked items will be excluded from the final narrative.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
        {groupedAssertions.map(group => (
          <div key={group.id}>
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 sticky top-0 bg-slate-50 py-1 z-10">
              {group.label}
            </h4>
            <div className="space-y-2">
              {group.items.map(assertion => (
                <div 
                  key={assertion.id}
                  onClick={() => handleToggle(assertion.id)}
                  className={`
                    p-3 rounded-lg border cursor-pointer transition-all duration-200 flex gap-3 select-none relative
                    ${assertion.checked 
                      ? 'bg-white border-blue-200 shadow-sm' 
                      : 'bg-slate-100 border-transparent opacity-60'
                    }
                    ${isLocked ? 'cursor-default' : 'hover:border-blue-300'}
                  `}
                >
                  <div className={`mt-0.5 shrink-0 ${assertion.checked ? 'text-blue-600' : 'text-slate-400'}`}>
                    {assertion.checked ? <CheckSquare size={16} /> : <Square size={16} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-2 mb-1">
                        <span className={`text-xs font-medium leading-snug break-words ${assertion.checked ? 'text-slate-800' : 'text-slate-500 line-through decoration-slate-300'}`}>
                            {assertion.label}
                        </span>
                        {assertion.slot && (
                            <span className="shrink-0 text-[9px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded uppercase tracking-wide">
                                {SLOT_LABELS[assertion.slot] || assertion.slot}
                            </span>
                        )}
                    </div>
                    {assertion.description && assertion.checked && (
                      <p className="text-[10px] text-slate-500 mt-1 leading-relaxed break-words">
                        {assertion.description}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
        {groupedAssertions.length === 0 && (
             <div className="text-center py-8 text-slate-400 text-xs italic">
                 No automated facts available. Manual entry may be required.
             </div>
        )}
      </div>
    </div>
  );
};
