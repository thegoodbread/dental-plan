
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Edit2, Mic, Check, X, Wand2, ChevronRight, Stethoscope, RotateCcw, Lock, CheckSquare, Square, ChevronDown, AlertTriangle, AlertCircle, Plus, Trash2 } from 'lucide-react';
import { SoapSection, SoapSectionType } from '../../domain/dentalTypes';
import { TruthAssertion, SLOT_ORDER, SLOT_LABELS, AssertionSlot, AssertionSection } from '../../domain/TruthAssertions';
import { useChairside } from '../../context/ChairsideContext';

interface SoapSectionBlockProps {
  section: SoapSection;
  contextLabel?: string;
  onSave: (id: string, newContent: string) => void;
  onDictate?: () => void;
  onAiDraft?: () => void;
  onInsertChartFindings?: () => void;
  undoSnapshot?: { sourceLabel: string };
  onUndo?: () => void;
  onDismissUndo?: () => void;
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
        relative group flex items-start gap-3 p-3 rounded-lg border transition-all
        ${assertion.checked 
          ? 'bg-white border-blue-200 shadow-sm' 
          : 'bg-slate-50/50 border-transparent opacity-60 hover:opacity-100 hover:bg-white hover:border-slate-200'
        }
        ${isLocked ? 'cursor-default' : 'cursor-pointer'}
      `}
      onClick={!isLocked ? () => onToggle(assertion.id) : undefined}
    >
      <div className={`mt-0.5 shrink-0 ${assertion.checked ? 'text-blue-600' : 'text-slate-400'}`}>
        {assertion.checked ? <CheckSquare size={16} /> : <Square size={16} />}
      </div>
      
      <div className="flex-1 min-w-0">
        <p className={`text-sm leading-snug ${assertion.checked ? 'text-slate-900 font-medium' : 'text-slate-500'}`}>
          {assertion.sentence || assertion.label}
        </p>
        
        {/* Metadata Row */}
        {assertion.source !== 'manual' && (
          <div className="flex items-center gap-2 mt-1.5">
             <span className="text-[10px] uppercase font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                {assertion.source}
             </span>
             {assertion.code && (
                <span className="text-[10px] font-mono text-slate-400">
                   {assertion.code}
                </span>
             )}
          </div>
        )}
      </div>

      {/* Actions (Manual Only for now) */}
      {!isLocked && assertion.source === 'manual' && onDelete && (
        <button 
          onClick={(e) => { e.stopPropagation(); onDelete(assertion.id); }}
          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-opacity"
          title="Remove fact"
        >
          <Trash2 size={14} />
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
          className="w-full text-xs p-2 pl-3 border border-dashed border-slate-300 rounded-md bg-transparent hover:bg-white hover:border-blue-300 focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-200 outline-none transition-all placeholder:text-slate-400"
          placeholder={placeholder}
          value={value}
          onChange={e => setValue(e.target.value)}
        />
        <button 
          type="submit"
          disabled={!value.trim()}
          className="absolute right-1 top-1/2 -translate-y-1/2 p-1 text-blue-600 hover:bg-blue-50 rounded disabled:opacity-0 transition-opacity"
        >
          <Plus size={14} />
        </button>
      </div>
    </form>
  );
};

export const SoapSectionBlock: React.FC<SoapSectionBlockProps> = ({
  section,
  contextLabel,
  onSave,
  onDictate,
  onAiDraft,
  onInsertChartFindings,
  undoSnapshot,
  onUndo,
  onDismissUndo,
  isLocked = false,
  assertions = [],
  onToggleAssertion,
  isFactsExpanded = false,
  onToggleFacts
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [draftContent, setDraftContent] = useState(section.content);
  const [isExpanded, setIsExpanded] = useState(!!section.content);
  
  // V2.5 Review Status & Slot Completeness
  const { factReviewStatus, markSectionFactsReviewed, truthAssertions, evaluateSlotCompleteness, getSectionCompleteness, addManualAssertion, removeAssertion } = useChairside();
  const isReviewed = factReviewStatus[section.type] === 'reviewed';
  const sectionCompleteness = getSectionCompleteness(section.type);

  // Calculate Slot Completeness
  const slotCompleteness = useMemo(() => {
      if (!truthAssertions) return {};
      return evaluateSlotCompleteness(truthAssertions, section.type);
  }, [truthAssertions, section.type, evaluateSlotCompleteness]);

  const completenessStats = useMemo(() => {
      if (!slotCompleteness) return { missing: 0, required: 0, complete: 0 };
      let missing = 0;
      let required = 0;
      let complete = 0;
      Object.values(slotCompleteness).forEach(status => {
          if (status !== 'not_required') {
              required++;
              if (status === 'empty') missing++;
              if (status === 'complete') complete++;
          }
      });
      return { missing, required, complete };
  }, [slotCompleteness]);

  // Sync draft when prop changes and auto-expand on incoming content
  useEffect(() => {
      setDraftContent(section.content);
      // Auto-expand if new content arrives and we aren't already editing
      // Only if not locked, or just visual expansion
      if (section.content && !isEditing) setIsExpanded(true);
  }, [section.content, isEditing]);

  const handleSave = () => {
    if (isLocked) return;
    onSave(section.id, draftContent);
    setIsEditing(false);
    setIsExpanded(true);
  };

  const handleCancel = () => {
    setDraftContent(section.content);
    setIsEditing(false);
    if (!section.content) setIsExpanded(false);
  };

  // Toggle expansion
  const toggleExpand = () => {
      if (isEditing) return; 
      setIsExpanded(!isExpanded);
  };

  const handleHeaderClick = (e: React.MouseEvent) => {
      if (isEditing) return;
      if (isLocked) {
          // If locked, just toggle visibility
          setIsExpanded(!isExpanded);
          return;
      }

      if (!isExpanded) {
          setIsExpanded(true);
          // If empty and NOT locked, go straight to edit
          if (!section.content) setIsEditing(true);
      } else {
          toggleExpand();
      }
  };
  
  const handleToggleFactPanel = (e?: React.MouseEvent) => {
      if (e) e.stopPropagation();
      
      // V2.5: Mark reviewed when closing the panel (if open), or if it was open.
      // Logic: If currently expanded (isFactsExpanded), we are about to close it -> mark reviewed.
      if (isFactsExpanded && !isLocked) {
          markSectionFactsReviewed(section.type);
      }
      
      if (onToggleFacts) onToggleFacts();
      if (!isFactsExpanded) setIsExpanded(true); // Open section if opening facts
  };
  
  const handleAssertionToggle = (id: string) => {
      if (onToggleAssertion) {
          onToggleAssertion(id);
          markSectionFactsReviewed(section.type);
      }
  };

  const handleSlotChipClick = (e: React.MouseEvent, slot: AssertionSlot) => {
      e.stopPropagation();
      setIsExpanded(true); 
      
      // Scroll to slot
      setTimeout(() => {
          const el = document.getElementById(`slot-${section.type}-${slot}`);
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
  };

  // Logic: AI Refine should only be available if there is content
  const canUseAi = onAiDraft && !!section.content && !isLocked;

  // Render Logic for Grouped Slots
  const renderSlotGroup = (slot: AssertionSlot) => {
      const slotAssertions = assertions.filter(a => a.slot === slot);
      const completeness = slotCompleteness[slot];
      
      // V3: Always show slots if they are required OR have content.
      // Hide completely optional empty slots to reduce noise.
      if (completeness === 'not_required' && slotAssertions.length === 0) {
          return null;
      }

      const isMissing = completeness === 'empty';
      const isComplete = completeness === 'complete';

      return (
          <div key={slot} id={`slot-${section.type}-${slot}`} className="flex flex-col md:flex-row md:items-start gap-4 py-4 border-b border-dashed border-slate-100 last:border-0 scroll-mt-24">
              {/* Left: Slot Label & Status */}
              <div className="md:w-32 shrink-0 pt-1">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                      {SLOT_LABELS[slot]}
                  </div>
                  <div className="mt-1">
                      {isMissing && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              Missing
                          </span>
                      )}
                      {isComplete && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-green-50 text-green-700 border border-green-200">
                              Complete
                          </span>
                      )}
                      {completeness === 'not_required' && slotAssertions.length > 0 && (
                          <span className="text-[9px] text-slate-300 italic">Optional</span>
                      )}
                  </div>
              </div>

              {/* Right: Truth Block Cards */}
              <div className="flex-1 min-w-0 space-y-3">
                  {isMissing && slotAssertions.length === 0 && (
                      <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1.5 flex items-center gap-2 mb-2">
                          <AlertCircle size={12} className="shrink-0" />
                          <span>
                              {slot === 'HPI' 
                                ? "Consider adding HPI details if clinically relevant."
                                : "No findings documented for this required slot."}
                          </span>
                      </div>
                  )}

                  {slotAssertions.length > 0 ? (
                      <div className="flex flex-col gap-2">
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
                      // Only show this placeholder if it's NOT missing (i.e. optional and empty), 
                      // or if missing but we handled the alert above.
                      completeness === 'not_required' && (
                        <span className="text-xs text-slate-400 italic">No facts added.</span>
                      )
                  )}

                  {/* Quick Add Inline */}
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
        className={`
            bg-white rounded-md border transition-all duration-200 overflow-hidden scroll-mt-20
            ${isEditing 
                ? 'border-blue-500 ring-1 ring-blue-500 shadow-md' 
                : 'border-slate-300 shadow-sm hover:border-slate-400'
            }
            ${isLocked ? 'bg-slate-50' : ''}
        `}
    >
      {/* Header */}
      <div 
        className={`
            px-4 py-2.5 cursor-pointer select-none transition-colors border-b
            ${isEditing ? 'bg-blue-50/50 border-blue-100' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'}
        `}
        onClick={handleHeaderClick}
      >
        <div className="flex justify-between items-center mb-1">
            <div className="flex items-center gap-2">
                <div className={`text-slate-400 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}>
                    <ChevronRight size={14} />
                </div>
                <div className="flex flex-col md:flex-row md:items-center md:gap-2">
                    <div className="flex items-center gap-2">
                        <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">{section.title}</h3>
                        
                        {/* Section Completeness Badge */}
                        {!isLocked && (
                            <>
                                {sectionCompleteness === 'complete' && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-[10px] text-emerald-700 border border-emerald-100">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                    Claim-ready
                                  </span>
                                )}
                                {sectionCompleteness === 'partial' && (
                                  <div className="flex items-center gap-1">
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-[10px] text-amber-700 border border-amber-100">
                                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                                        Missing facts
                                    </span>
                                  </div>
                                )}
                                {sectionCompleteness === 'empty' && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-50 text-[10px] text-slate-400 border border-slate-200">
                                    <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                                    Not started
                                  </span>
                                )}
                            </>
                        )}

                        {/* Reviewed Dot */}
                        {assertions.length > 0 && !isLocked && (
                            isReviewed 
                            ? <span className="w-2 h-2 rounded-full bg-green-500 ring-1 ring-white shadow-sm ml-1" title="Facts Reviewed" />
                            : <span className="w-2 h-2 rounded-full bg-gray-300 ring-1 ring-white ml-1" title="Review Pending" />
                        )}
                    </div>
                    {contextLabel && (
                        <span className="hidden md:inline text-[9px] text-slate-400 font-medium border-l border-slate-300 pl-2">
                            Applies to: {contextLabel}
                        </span>
                    )}
                </div>
            </div>
            
            {/* Actions */}
            <div className="flex items-center gap-2">
                 {/* Completeness Mini Summary */}
                 {!isLocked && completenessStats.required > 0 && (
                     <div className="hidden lg:block text-[9px] text-slate-400 font-medium mr-2">
                         {completenessStats.complete}/{completenessStats.required} slots
                     </div>
                 )}

                 {/* New Helpers visible in header when NOT editing/locked */}
                 {!isEditing && !isLocked && (
                   <>
                     {onInsertChartFindings && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); onInsertChartFindings(); setIsExpanded(true); }}
                          className="hidden md:flex items-center gap-1 text-[10px] text-teal-600 hover:text-teal-800 hover:bg-teal-50 px-2 py-1 rounded transition-colors font-medium border border-transparent hover:border-teal-100"
                          title="Insert clinical findings"
                        >
                          <Stethoscope size={10} /> Insert Findings
                        </button>
                     )}
                     {canUseAi && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); onAiDraft && onAiDraft(); setIsExpanded(true); }}
                          className="p-1 text-purple-400 hover:text-purple-600 hover:bg-purple-50 rounded transition-colors"
                          title="Refine with AI"
                        >
                          <Wand2 size={14} />
                        </button>
                     )}
                     <div className="w-px h-3 bg-slate-300 mx-1"></div>
                   </>
                 )}

                 {section.content && (
                     <span className="text-[10px] text-slate-400 font-mono">
                         {new Date(section.lastEditedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                     </span>
                 )}
                 
                 {!isEditing && !isLocked && (
                     <button 
                        onClick={(e) => { e.stopPropagation(); setIsEditing(true); setIsExpanded(true); }}
                        className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        title="Edit Section"
                     >
                        <Edit2 size={14} />
                     </button>
                 )}
                 {isLocked && (
                     <div className="flex items-center gap-1 text-slate-400">
                        <Lock size={12} />
                     </div>
                 )}
            </div>
        </div>

        {/* Slot Chips Row (Navigation Only) */}
        {!isLocked && (
            <div className="flex flex-wrap gap-1.5 ml-6 mt-1 pb-1">
                {(Object.keys(slotCompleteness) as AssertionSlot[]).map(slot => {
                    const status = slotCompleteness[slot];
                    if (status === 'not_required') return null;
                    
                    return (
                        <button
                            key={slot}
                            type="button"
                            onClick={(e) => handleSlotChipClick(e, slot)}
                            className={`
                                text-[9px] font-bold px-1.5 py-0.5 rounded border transition-colors flex items-center gap-1
                                ${status === 'complete' 
                                    ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100' 
                                    : 'bg-white text-amber-600 border-amber-300 hover:bg-amber-50'
                                }
                            `}
                        >
                            {status === 'empty' && <AlertTriangle size={8} />}
                            {SLOT_LABELS[slot]}
                        </button>
                    );
                })}
            </div>
        )}
      </div>

      {/* Content Area - Truth Blocks + Preview */}
      {isExpanded && (
          <div className="bg-white">
            {/* Inline Truth Blocks (Always Visible) */}
            {!isLocked && (
              <div className="bg-slate-50/30 border-b border-slate-200 px-4 pt-4 pb-6">
                 {/* Grouped Slots */}
                 <div className="flex flex-col gap-1">
                     {SLOT_ORDER.map(slot => renderSlotGroup(slot))}
                 </div>
              </div>
            )}

            {/* Undo Banner - HIDDEN IF LOCKED */}
            {!isLocked && undoSnapshot && !isEditing && (
                <div className="bg-blue-50/80 px-4 py-2 flex justify-between items-center text-xs border-b border-blue-100 animate-in slide-in-from-top-2">
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                        <span className="text-blue-700 font-medium">
                            Added from <span className="font-bold">{undoSnapshot.sourceLabel}</span>
                        </span>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={onUndo} className="flex items-center gap-1 text-blue-600 hover:text-blue-800 font-bold transition-colors">
                            <RotateCcw size={12} /> Undo
                        </button>
                        <button onClick={onDismissUndo} className="text-blue-400 hover:text-blue-600">
                            <X size={14} />
                        </button>
                    </div>
                </div>
            )}

            {contextLabel && (
                <div className="md:hidden px-4 py-1 bg-slate-50 border-b border-slate-100 text-[10px] text-slate-400 font-medium">
                    Applies to: {contextLabel}
                </div>
            )}
            
            {/* Label for Preview with helpful hint */}
            {!isEditing && section.content && (
                <div className="px-4 pt-4">
                    <div className="text-[9px] font-bold text-slate-300 uppercase tracking-widest select-none">
                        Generated Narrative (Preview)
                    </div>
                </div>
            )}

            {isEditing ? (
              <div className="p-3 animate-in fade-in duration-150">
                {/* Editor Toolbar */}
                <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-100 overflow-x-auto">
                    <span className="text-[10px] font-bold text-slate-400 uppercase whitespace-nowrap">Tools</span>
                    {canUseAi && (
                        <button onClick={() => onAiDraft && onAiDraft()} className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 rounded border border-purple-200 transition-colors whitespace-nowrap">
                            <Wand2 size={10} /> Refine with AI
                        </button>
                    )}
                    {onInsertChartFindings && (
                        <button onClick={onInsertChartFindings} className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-teal-700 bg-teal-50 hover:bg-teal-100 rounded border border-teal-200 transition-colors whitespace-nowrap">
                            <Stethoscope size={10} /> Insert Findings
                        </button>
                    )}
                    {onDictate && (
                        <button onClick={onDictate} className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-slate-700 bg-white hover:bg-slate-50 rounded border border-slate-200 transition-colors whitespace-nowrap">
                            <Mic size={10} /> Dictate
                        </button>
                    )}
                </div>

                <textarea
                  className="w-full min-h-[140px] text-sm text-slate-800 bg-white p-1 outline-none resize-y placeholder:text-slate-300 font-medium leading-relaxed font-sans"
                  value={draftContent}
                  onChange={(e) => setDraftContent(e.target.value)}
                  placeholder="Type notes here..."
                  autoFocus
                  title="Edits here override generated text. For correctness, modify facts above instead."
                />
                
                <div className="flex justify-end gap-2 mt-3 pt-2 border-t border-slate-100">
                    <button onClick={handleCancel} className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded border border-transparent">
                      Cancel
                    </button>
                    <button onClick={handleSave} className="px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded border border-transparent shadow-sm flex items-center gap-1">
                      <Check size={12} /> Save
                    </button>
                </div>
              </div>
            ) : (
              <div 
                className={`
                    p-4 text-sm whitespace-pre-wrap leading-relaxed min-h-[40px] transition-colors font-medium font-sans
                    ${isLocked 
                        ? 'text-slate-600 bg-slate-50 cursor-default' 
                        : 'text-slate-700 cursor-text hover:bg-slate-50/30'
                    }
                `}
                onClick={() => !isLocked && setIsEditing(true)}
              >
                {section.content ? (
                    section.content
                ) : (
                    <span className="text-slate-400 italic text-xs">{isLocked ? 'No content.' : 'Click to add details...'}</span>
                )}
              </div>
            )}
          </div>
      )}
    </div>
  );
};
