
import React, { useState, useEffect } from 'react';
import { Edit2, Mic, Check, X, Wand2, ChevronRight, Stethoscope, RotateCcw, Lock, CheckSquare, Square, ChevronDown } from 'lucide-react';
import { SoapSection } from '../../domain/dentalTypes';
import { TruthAssertion } from '../../domain/TruthAssertions';
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
  
  // V2.5 Review Status
  const { factReviewStatus, markSectionFactsReviewed } = useChairside();
  const isReviewed = factReviewStatus[section.type] === 'reviewed';

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

  // Logic: AI Refine should only be available if there is content
  const canUseAi = onAiDraft && !!section.content && !isLocked;

  return (
    <div 
        className={`
            bg-white rounded-md border transition-all duration-200 overflow-hidden
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
            px-4 py-2.5 flex justify-between items-center cursor-pointer select-none transition-colors border-b
            ${isEditing ? 'bg-blue-50/50 border-blue-100' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'}
        `}
        onClick={handleHeaderClick}
      >
        <div className="flex items-center gap-2">
            <div className={`text-slate-400 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}>
                <ChevronRight size={14} />
            </div>
            <div className="flex flex-col md:flex-row md:items-center md:gap-2">
                <div className="flex items-center gap-2">
                    <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">{section.title}</h3>
                    {/* V2.5 Review Status Dot */}
                    {assertions.length > 0 && !isLocked && (
                        isReviewed 
                        ? <span className="w-2 h-2 rounded-full bg-green-500 ring-1 ring-white shadow-sm" title="Facts Reviewed" />
                        : <span className="w-2 h-2 rounded-full bg-gray-300 ring-1 ring-white" title="Review Pending" />
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
             {/* Inline Facts Toggle (V2.0) */}
             {assertions.length > 0 && onToggleFacts && !isLocked && (
               <button 
                 onClick={handleToggleFactPanel}
                 className={`flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-bold border transition-all mr-2 ${isFactsExpanded ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'}`}
               >
                 <CheckSquare size={10} /> Facts ({assertions.length})
               </button>
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

      {/* Content Area - Collapsible */}
      {isExpanded && (
          <div className="bg-white">
            {/* Inline Truth Blocks (V2.0) - Replaces Side Drawer as Primary */}
            {isFactsExpanded && assertions.length > 0 && !isLocked && (
              <div className="bg-slate-50 border-b border-slate-200 p-3 animate-in slide-in-from-top-2 duration-200">
                 <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Facts for this section</span>
                    <button onClick={handleToggleFactPanel} className="text-slate-400 hover:text-slate-600"><ChevronDown size={14} className="rotate-180" /></button>
                 </div>
                 <div className="space-y-1">
                    {assertions.map(a => (
                       <div 
                         key={a.id} 
                         onClick={() => handleAssertionToggle(a.id)}
                         className={`flex items-start gap-2 p-2 rounded cursor-pointer transition-colors ${a.checked ? 'bg-white border border-blue-200 shadow-sm' : 'bg-slate-100/50 border border-transparent opacity-60 hover:opacity-100'}`}
                       >
                          <div className={`mt-0.5 ${a.checked ? 'text-blue-600' : 'text-slate-400'}`}>
                             {a.checked ? <CheckSquare size={14} /> : <Square size={14} />}
                          </div>
                          <div>
                             <p className={`text-xs font-medium leading-tight ${a.checked ? 'text-slate-800' : 'text-slate-500 line-through decoration-slate-300'}`}>{a.label}</p>
                             {a.description && a.checked && <p className="text-[10px] text-slate-500 mt-0.5">{a.description}</p>}
                          </div>
                       </div>
                    ))}
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
            
            {/* V2.0: Label for Preview with helpful hint */}
            {!isEditing && section.content && (
                <div className="px-4 pt-2">
                    {assertions.length > 0 && (
                        <div className="text-[10px] text-gray-400 italic mb-1">
                            Narrative generated from checked facts.
                        </div>
                    )}
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
