
import React, { useState, useEffect } from 'react';
import { Edit2, Mic, Check, X, Wand2, FileText, ChevronDown, ChevronRight } from 'lucide-react';
import { SoapSection } from '../../domain/dentalTypes';

interface SoapSectionBlockProps {
  section: SoapSection;
  onSave: (id: string, newContent: string) => void;
  onDictate?: () => void;
  onAiDraft?: () => void;
}

export const SoapSectionBlock: React.FC<SoapSectionBlockProps> = ({
  section,
  onSave,
  onDictate,
  onAiDraft
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [draftContent, setDraftContent] = useState(section.content);
  const [isExpanded, setIsExpanded] = useState(!!section.content);

  // Sync draft when prop changes
  useEffect(() => {
      setDraftContent(section.content);
      if (section.content && !isEditing) setIsExpanded(true);
  }, [section.content, isEditing]);

  const handleSave = () => {
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
      if (isEditing) return; // Don't collapse while editing
      setIsExpanded(!isExpanded);
  };

  const handleHeaderClick = (e: React.MouseEvent) => {
      if (isEditing) return;
      if (!isExpanded) {
          setIsExpanded(true);
          // If empty, go straight to edit
          if (!section.content) setIsEditing(true);
      } else {
          // If expanded and clicked, maybe just toggle? Or go to edit?
          // Let's toggle for "SaaS" feel unless clicking the edit button
          toggleExpand();
      }
  };

  return (
    <div 
        className={`
            bg-white rounded-md border transition-all duration-200 overflow-hidden
            ${isEditing 
                ? 'border-blue-500 ring-1 ring-blue-500 shadow-md' 
                : 'border-slate-300 shadow-sm hover:border-slate-400'
            }
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
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">{section.title}</h3>
        </div>
        
        {/* Actions (visible on hover or active) */}
        {!isEditing && (
          <div className="flex items-center gap-2">
             {section.content && (
                 <span className="text-[10px] text-slate-400 font-mono">
                     {new Date(section.lastEditedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                 </span>
             )}
             <button 
                onClick={(e) => { e.stopPropagation(); setIsEditing(true); setIsExpanded(true); }}
                className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                title="Edit Section"
             >
                <Edit2 size={14} />
             </button>
          </div>
        )}
      </div>

      {/* Content Area - Collapsible */}
      {isExpanded && (
          <div className="bg-white">
            {isEditing ? (
              <div className="p-3 animate-in fade-in duration-150">
                {/* Editor Toolbar */}
                <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Tools</span>
                    {onAiDraft && (
                        <button onClick={onAiDraft} className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 rounded border border-purple-200 transition-colors">
                            <Wand2 size={10} /> AI Draft
                        </button>
                    )}
                    {onDictate && (
                        <button onClick={onDictate} className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-slate-700 bg-white hover:bg-slate-50 rounded border border-slate-200 transition-colors">
                            <Mic size={10} /> Dictate
                        </button>
                    )}
                </div>

                <textarea
                  className="w-full min-h-[120px] text-sm text-slate-800 bg-white p-1 outline-none resize-y placeholder:text-slate-300 font-medium"
                  value={draftContent}
                  onChange={(e) => setDraftContent(e.target.value)}
                  placeholder="Type notes here..."
                  autoFocus
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
                className="p-4 text-sm text-slate-700 whitespace-pre-wrap leading-relaxed cursor-text min-h-[40px] hover:bg-slate-50/30 transition-colors"
                onClick={() => setIsEditing(true)}
              >
                {section.content ? (
                    section.content
                ) : (
                    <span className="text-slate-400 italic text-xs">Click to add details...</span>
                )}
              </div>
            )}
          </div>
      )}
    </div>
  );
};
