
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Edit2, Check, X, ChevronRight, Lock, CheckSquare, Square, AlertTriangle, AlertCircle, Plus, Trash2, Maximize2 } from 'lucide-react';
import { SoapSection } from '../../domain/dentalTypes';
import { TruthAssertion, SLOT_ORDER, SLOT_LABELS, AssertionSlot, AssertionSection } from '../../domain/TruthAssertions';
import { useChairside } from '../../context/ChairsideContext';

interface SoapSectionBlockProps {
  section: SoapSection;
  isLocked?: boolean;
  
  // Inline Truth Blocks (V2.0)
  assertions?: TruthAssertion[];
  onToggleAssertion?: (id: string) => void;
  isFactsExpanded?: boolean;
  onToggleFacts?: () => void;
}

// Internal Component: TruthBlockCard
const TruthBlockCard: React.FC<{
  assertion: TruthAssertion;
  onToggle: (id: string) => void;
  onDelete?: (id: string) => void;
  isLocked?: boolean;
}> = ({ assertion, onToggle, onDelete, isLocked }) => {
  return (
    <div 
      className={`
        group flex items-start gap-2.5 p-2.5 rounded-md border transition-all select-none
        ${assertion.checked 
          ? 'bg-blue-50/50 border-blue-200 shadow-sm' 
          : 'bg-white border-slate-100 opacity-70 hover:opacity-100 hover:border-slate-200'
        }
        ${isLocked ? 'cursor-default' : 'cursor-pointer'}
      `}
      onClick={!isLocked ? () => onToggle(assertion.id) : undefined}
    >
      <div className={`mt-0.5 shrink-0 ${assertion.checked ? 'text-blue-600' : 'text-slate-300'}`}>
        {assertion.checked ? <CheckSquare size={14} /> : <Square size={14} />}
      </div>
      
      <div className="flex-1 min-w-0">
        <p className={`text-xs leading-snug ${assertion.checked ? 'text-slate-900 font-medium' : 'text-slate-500'}`}>
          {assertion.label}
        </p>
        
        {/* Metadata Tags */}
        {assertion.source !== 'manual' && assertion.checked && (
          <div className="flex items-center gap-2 mt-1">
             {assertion.code && (
                <span className="text-[9px] font-mono text-slate-400 bg-slate-50 px-1 rounded">
                   {assertion.code}
                </span>
             )}
          </div>
        )}
      </div>

      {/* Actions (Manual Only) */}
      {!isLocked && assertion.source === 'manual' && onDelete && (
        <button 
          onClick={(e) => { e.stopPropagation(); onDelete(assertion.id); }}
          className="p-1 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-opacity"
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
    <form onSubmit={handleSubmit} className="flex items-center gap-2 mt-2 px-1">
      <div className="relative flex-1">
        <input 
          type="text"
          className="w-full text-xs p-1.5 pl-2 border border-dashed border-slate-300 rounded bg-transparent hover:bg-white hover:border-blue-300 focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-200 outline-none transition-all placeholder:text-slate-400"
          placeholder={placeholder}
          value={value}
          onChange={e => setValue(e.target.value)}
        />
        <button 
          type="submit"
          disabled={!value.trim()}
          className="absolute right-1 top-1/2 -translate-y-1/2 p-0.5 text-blue-600 hover:bg-blue-50 rounded disabled:opacity-0 transition-opacity"
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
  const [isExpanded, setIsExpanded] = useState(true); // Default open in builder mode
  
  // Hooks
  const { factReviewStatus, markSectionFactsReviewed, truthAssertions, evaluateSlotCompleteness, getSectionCompleteness, addManualAssertion, removeAssertion } = useChairside();
  
  // Derived State
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
      
      // Hide completely optional empty slots to reduce noise
      if (completeness === 'not_required' && slotAssertions.length === 0) {
          return null;
      }

      const isMissing = completeness === 'empty';
      const isComplete = completeness === 'complete';

      return (
          <div key={slot} id={`slot-${section.type}-${slot}`} className="py-3 border-l-2 border-slate-100 pl-3 ml-1 scroll-mt-24 group/slot">
              {/* Slot Header */}
              <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{SLOT_LABELS[slot]}</span>
                      {isMissing && <span className="w-1.5 h-1.5 rounded-full bg-red-500" title="Required" />}
                      {isComplete && <span className="w-1.5 h-1.5 rounded-full bg-green-500" title="Complete" />}
                  </div>
                  {/* Status Text */}
                  <div className="text-[9px]">
                      {isMissing && <span className="text-red-500 font-bold">Missing</span>}
                      {isComplete && <span className="text-green-600 font-medium">Complete</span>}
                      {completeness === 'not_required' && <span className="text-slate-300">Optional</span>}
                  </div>
              </div>

              {/* Slot Content */}
              <div className="space-y-1.5">
                  {slotAssertions.length > 0 ? (
                      slotAssertions.map(a => (
                          <TruthBlockCard 
                            key={a.id} 
                            assertion={a} 
                            onToggle={handleAssertionToggle} 
                            onDelete={removeAssertion}
                            isLocked={isLocked}
                          />
                      ))
                  ) : (
                      isMissing && (
                          <div className="text-[10px] text-red-600 bg-red-50 border border-red-100 rounded px-2 py-1.5 flex items-start gap-1.5">
                              <AlertCircle size={10} className="mt-0.5 shrink-0" />
                              <span>Required slot. Add details below.</span>
                          </div>
                      )
                  )}

                  {/* Quick Add */}
                  {!isLocked && (
                      <QuickAddInput 
                        placeholder={`Add ${SLOT_LABELS[slot]}...`}
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
        className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden mb-3 transition-all duration-200"
    >
      {/* Section Header */}
      <div 
        className={`
            px-3 py-2 cursor-pointer select-none transition-colors border-b flex items-center justify-between
            ${isExpanded ? 'bg-slate-50 border-slate-200' : 'bg-white border-transparent hover:bg-slate-50'}
        `}
        onClick={handleHeaderClick}
      >
        <div className="flex items-center gap-2">
            <div className={`text-slate-400 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}>
                <ChevronRight size={14} />
            </div>
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">{section.title}</h3>
        </div>
        
        <div className="flex items-center gap-2">
            {/* Completion Pill */}
            {!isLocked && (
                <div className={`px-1.5 py-0.5 rounded text-[9px] font-bold border flex items-center gap-1 ${
                    sectionCompleteness === 'complete' ? 'bg-green-50 text-green-700 border-green-200' :
                    sectionCompleteness === 'partial' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                    'bg-slate-100 text-slate-400 border-slate-200'
                }`}>
                    {sectionCompleteness === 'complete' && <Check size={8} strokeWidth={4} />}
                    {sectionCompleteness === 'complete' ? 'Done' : `${completenessStats.complete}/${completenessStats.required}`}
                </div>
            )}
        </div>
      </div>

      {/* Builder Body */}
      {isExpanded && (
          <div className="p-3 bg-white">
             {SLOT_ORDER.map(slot => renderSlot(slot))}
          </div>
      )}
    </div>
  );
};
