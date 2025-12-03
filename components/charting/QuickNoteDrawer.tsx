
import React from 'react';
import { createPortal } from 'react-dom';
import { useChairside } from '../../context/ChairsideContext';
import { X, FileText, Save, ArrowRight } from 'lucide-react';
import { NotesComposer } from './NotesComposer';
import { ToothNumber, ToothRecord } from '../../domain/dentalTypes';

export const QuickNoteDrawer: React.FC<{
    activeToothNumber: ToothNumber | null;
    activeToothRecord: ToothRecord | null;
    onToothClick: (t: ToothNumber) => void;
}> = ({ activeToothNumber, activeToothRecord, onToothClick }) => {
  const { isQuickNoteOpen, setIsQuickNoteOpen, addTimelineEvent, setCurrentView, activeComposer, selectedTeeth } = useChairside();

  if (!isQuickNoteOpen) return null;

  const handleClose = () => setIsQuickNoteOpen(false);

  const handleSaveAndClose = () => {
      // In a real app, this would trigger a save on the Composer context/hook.
      // Since our NotesComposer autosaves to state/localStorage, we just close.
      addTimelineEvent({
          type: 'NOTE',
          title: 'Quick Note Updated',
          details: 'Saved from drawer.',
          provider: 'Dr. Smith'
      });
      handleClose();
  };

  const handleGoToFullNotes = () => {
      setIsQuickNoteOpen(false);
      setCurrentView('NOTES');
  };

  // Construct pending procedure object if composer is active
  const pendingProcedure = activeComposer ? {
      label: activeComposer,
      teeth: selectedTeeth
  } : undefined;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex justify-end">
        {/* Backdrop */}
        <div 
            className="absolute inset-0 bg-black/20 backdrop-blur-sm animate-in fade-in duration-300"
            onClick={handleClose}
        />
        
        {/* Drawer Panel */}
        <div 
            className="relative w-full max-w-[420px] bg-slate-100 h-full shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col border-l border-slate-300"
            onClick={(e) => e.stopPropagation()}
        >
            {/* Drawer Header */}
            <div className="flex items-center justify-between px-5 py-4 bg-white border-b border-slate-200 shrink-0">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                        <FileText size={20} />
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-900 text-lg leading-none">Clinical Note</h3>
                        <p className="text-xs text-slate-500 mt-1">
                            {pendingProcedure 
                                ? `Documenting ${pendingProcedure.label} ${pendingProcedure.teeth.length > 0 ? '#' + pendingProcedure.teeth.join(', #') : ''}` 
                                : (activeToothNumber ? `Documenting Tooth #${activeToothNumber}` : 'General Visit Note')
                            }
                        </p>
                    </div>
                </div>
                <button 
                    onClick={handleClose}
                    className="p-2 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-full transition-colors"
                >
                    <X size={20}/>
                </button>
            </div>

            {/* Navigation Tabs (Conduit Logic) */}
            <div className="flex bg-slate-50 border-b border-slate-200 px-4 pt-2 gap-1">
                <button className="px-4 py-2 text-sm font-bold text-blue-600 border-b-2 border-blue-600 bg-white rounded-t-lg">
                    Quick Note
                </button>
                <button 
                    onClick={handleGoToFullNotes}
                    className="px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-700 border-b-2 border-transparent hover:border-slate-300 transition-colors flex items-center gap-1"
                >
                    Full Page Editor <ArrowRight size={12} />
                </button>
            </div>
            
            {/* Content: NotesComposer in 'drawer' mode */}
            <div className="flex-1 overflow-hidden relative">
                <NotesComposer 
                    activeToothNumber={activeToothNumber}
                    activeToothRecord={activeToothRecord}
                    onToothClick={onToothClick}
                    viewMode="drawer"
                    pendingProcedure={pendingProcedure}
                    // Force remount when tooth changes to ensure correct context loading
                    key={activeToothNumber || 'general'} 
                />
            </div>

            {/* Drawer Footer */}
            <div className="px-5 py-4 bg-white border-t border-slate-200 shrink-0 flex gap-3">
                <button 
                    onClick={handleSaveAndClose}
                    className="flex-1 h-10 bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold rounded-lg shadow-sm flex items-center justify-center gap-2 transition-colors"
                >
                    <Save size={16} /> Save & Close
                </button>
            </div>
        </div>
    </div>,
    document.body
  );
};
