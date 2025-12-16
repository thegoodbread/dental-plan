
import React, { useState, useMemo } from 'react';
import { Check, ChevronRight, CheckSquare, Square, AlertCircle, Plus, Trash2, Puzzle } from 'lucide-react';
import { SoapSection } from '../../domain/dentalTypes';
import { TruthAssertion, SLOT_ORDER, SLOT_LABELS, AssertionSlot, AssertionSection } from '../../domain/TruthAssertions';
import { useChairside } from '../../context/ChairsideContext';

interface SoapSectionBlockProps {
  section: SoapSection;
  isLocked?: boolean;
  assertions?: TruthAssertion[];
  onToggleAssertion?: (id: string) => void;
  isFactsExpanded?: boolean;
  onToggleFacts?: () => void;
}

// Internal Component: TruthBlockCard (The "Evidence Piece")
const TruthBlockCard: React.FC<{
  assertion: TruthAssertion;
  onToggle: (id: string) => void;
  onDelete?: (id: string) => void;
  isLocked?: boolean;
}> = ({ assertion, onToggle, onDelete, isLocked }) => {
  return (
    <div 
      className={`
        group flex items-start gap-2 p-2.5 rounded-lg border transition-all select-none text-xs mb-1
        ${assertion.checked 
          ? 'bg-white border-blue-200 shadow-sm border-l-4 border-l-blue-500' 
          : 'bg-slate-50 border-transparent opacity-60 hover:opacity-100 hover:border-slate-200 hover:bg-white'
        }
        ${isLocked ? 'cursor-default' : 'cursor-pointer'}
      `}
      onClick={!isLocked ? () => onToggle(assertion.id) : undefined}
    >
      <div className={`mt-0.5 shrink-0 transition-colors ${assertion.checked ? 'text-blue-600' : 'text-slate-300 group-hover:text-slate-400'}`}>
        {assertion.checked ? <CheckSquare size={14} /> : <Square size={14} />}
      </div>
      
      <div className="flex-1 min-w-0">
        <p className={`leading-snug ${assertion.checked ? 'text-slate-900 font-medium' : 'text-slate-500'}`}>
          {assertion.label}
        </p>
        {assertion.description && assertion.checked && (
            <p className="text-[10px] text-slate-500 mt-0.5">{assertion.description}</p>
        )}
      </div>

      {!isLocked && assertion.source === 'manual' && onDelete && (
        <button 
          onClick={(e) => { e.stopPropagation(); onDelete(assertion.id); }}
          className="p-1 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-all"
          title="Remove fact"
        >
          <Trash2 size={12} />
        </button>
      )}
    </div>
  );
};

// Internal Component: Quick Add Input
const QuickAddInput: React.FC<{
  placeholder: string;
  onAdd: (text: string) => void;
}> = ({ placeholder, onAdd }) => {
  const [value, setValue] = useState('');

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (value.trim()) {
      onAdd(value.trim());
      setValue('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2 mt-2">
      <div className="relative flex-1">
        <input 
          type="text"
          className="w-full text-[11px] p-2 pl-3 border border-dashed border-slate-300 rounded-md bg-white/50 hover:bg-white hover:border-blue-300 focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-200 outline-none transition-all placeholder:text-slate-400"
          placeholder={placeholder}
          value={value}
          onChange={e => setValue(e.target.value)}
        />
        <button 
          type="submit"
          disabled={!value.trim()}
          className="absolute right-1 top-1/2 -translate-y-1/2 p-1 text-blue-600 hover:bg-blue-50 rounded disabled:opacity-0 transition-opacity"
        >
          <Plus size={12} />
        </button>
      </div>
    </form>
  );
};

export const SoapSectionBlock: React.FC<SoapSectionBlockProps> = ({
  section,
  isLocked = false,
  assertions = [],
  onToggleAssertion,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  
  const { truthAssertions, evaluateSlotCompleteness, getSectionCompleteness, addManualAssertion, removeAssertion, markSectionFactsReviewed } = useChairside();
  
  const sectionCompleteness = getSectionCompleteness(section.type);
  
  const slotCompleteness = useMemo(() => {
      if (!truthAssertions) return {};
      return evaluateSlotCompleteness(truthAssertions, section.type);
  }, [truthAssertions, section.type, evaluateSlotCompleteness]);

  const completenessStats = useMemo(() => {
      let missing = 0, required = 0, complete = 0;
      Object.values(slotCompleteness).forEach(status => {
          if (status !== 'not_required') {
              required++;
              if (status === 'empty') missing++;
              if (status === 'complete') complete++;
          }
      });
      return { missing, required, complete };
  }, [slotCompleteness]);

  const handleHeaderClick = () => {
      setIsExpanded(!isExpanded);
  };
  
  const handleAssertionToggle = (id: string) => {
      if (onToggleAssertion) {
          onToggleAssertion(id);
          markSectionFactsReviewed(section.type);
      }
  };

  const renderSlot = (slot: AssertionSlot) => {
      const slotAssertions = assertions.filter(a => a.slot === slot);
      const completeness = slotCompleteness[slot];
      
      // If optional and empty, hide to reduce noise
      if (completeness === 'not_required' && slotAssertions.length === 0) {
          return null;
      }

      const isMissing = completeness === 'empty';
      const isComplete = completeness === 'complete';

      return (
          <div 
            key={slot} 
            id={`slot-${section.type}-${slot}`} 
            className={`
                mb-4 pb-2 scroll-mt-32 transition-all duration-300
                ${isMissing ? 'border-l-2 border-red-200 pl-3 ml-[-12px] bg-red-50/20 rounded-r-lg' : ''}
            `}
          >
              {/* Slot Header */}
              <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                      <div className={`
                          w-4 h-4 rounded flex items-center justify-center
                          ${isMissing ? 'bg-red-100 text-red-500' : isComplete ? 'bg-green-100 text-green-600' : 'bg-slate-200 text-slate-400'}
                      `}>
                          {isMissing ? <AlertCircle size={10} /> : isComplete ? <Check size={10} strokeWidth={3} /> : <Puzzle size={10} />}
                      </div>
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${isMissing ? 'text-red-700' : 'text-slate-600'}`}>
                          {SLOT_LABELS[slot]}
                      </span>
                  </div>
                  {isMissing && <span className="text-[9px] font-bold text-red-500 animate-pulse px-1.5 py-0.5 bg-red-50 rounded border border-red-100">MISSING</span>}
              </div>

              {/* Facts Container */}
              <div className="space-y-1">
                  {slotAssertions.length > 0 ? (
                      <div className="flex flex-col">
                          {slotAssertions.map(a => (
                              <TruthBlockCard 
                                key={a.id} 
                                assertion={a} 
                                onToggle={handleAssertionToggle} 
                                onDelete={removeAssertion}
                                isLocked={isLocked}
                              />
                          ))}
                      </div>
                  ) : (
                      isMissing && (
                          <div className="text-[10px] text-red-400 italic pl-1 flex items-center gap-1.5 opacity-80 mb-2">
                              <span>Required for claim clearance. Add info below.</span>
                          </div>
                      )
                  )}

                  {!isLocked && (
                      <QuickAddInput 
                        placeholder={`+ Add ${SLOT_LABELS[slot]}...`}
                        onAdd={(text) => addManualAssertion(section.type as AssertionSection, slot, text)}
                      />
                  )}
              </div>
          </div>
      );
  };

  return (
    <div 
        id={`section-${section.type}`}
        className="mb-4 last:mb-20 scroll-mt-24 group/section bg-white border border-slate-200 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.02)] overflow-hidden"
    >
      {/* Section Container Header */}
      <div 
        className={`
            sticky top-0 z-10 
            px-3 py-2.5 cursor-pointer select-none transition-colors border-b flex items-center justify-between
            ${isExpanded 
                ? 'bg-white border-slate-100' 
                : 'bg-white border-transparent hover:bg-slate-50'
            }
        `}
        onClick={handleHeaderClick}
      >
        <div className="flex items-center gap-2">
            <div className={`text-slate-400 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}>
                <ChevronRight size={14} />
            </div>
            <h3 className={`text-xs font-bold uppercase tracking-wider ${completenessStats.missing > 0 ? 'text-slate-800' : 'text-slate-500'}`}>
                {section.title}
            </h3>
        </div>
        
        {/* Compact Status Pill */}
        {!isLocked && (
            <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                sectionCompleteness === 'complete' ? 'bg-green-50 text-green-700 border-green-200' :
                sectionCompleteness === 'partial' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                'bg-slate-100 text-slate-400 border-slate-200'
            }`}>
                {sectionCompleteness === 'complete' 
                    ? <Check size={8} strokeWidth={4} /> 
                    : <span className="flex items-center gap-0.5">{completenessStats.complete}<span className="text-slate-300">/</span>{completenessStats.required}</span>
                }
            </div>
        )}
      </div>

      {/* Slots Body */}
      {isExpanded && (
          <div className="p-3 bg-slate-50/30 space-y-1">
             {SLOT_ORDER.map(slot => renderSlot(slot))}
          </div>
      )}
    </div>
  );
};
