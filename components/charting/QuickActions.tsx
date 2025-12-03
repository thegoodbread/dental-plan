
import React from 'react';
import { useChairside } from '../../context/ChairsideContext';
import { QuickActionType } from '../../types/charting';
import { ClipboardList, Camera, FileText, Syringe, Crown, Activity, StickyNote, Scissors, PenTool, Star, Zap } from 'lucide-react';

const QuickButton: React.FC<{ 
  label: string; 
  icon: React.ElementType; 
  type: QuickActionType; 
  isFavorite?: boolean; 
}> = ({ label, icon: Icon, type, isFavorite }) => {
  const { setActiveComposer, setCurrentView, activeComposer, setIsQuickNoteOpen } = useChairside();

  const isActive = activeComposer === type;

  const handleClick = () => {
    if (type === 'Perio') {
        setActiveComposer(null);
        setCurrentView('PERIO');
        setIsQuickNoteOpen(false);
    } else if (type === 'Notes') {
        // Switch to Full Page Note Editor directly
        setActiveComposer(null);
        setCurrentView('NOTES');
        // Ensure drawer is closed so it doesn't overlay the full page
        setIsQuickNoteOpen(false);
    } else {
        // For other actions, activate composer on dashboard
        setActiveComposer(type);
        setCurrentView('DASHBOARD');
        // Close drawer if it was open to show the composer
        setIsQuickNoteOpen(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      className={`
        flex flex-col items-center justify-center w-full aspect-square rounded-2xl transition-all duration-200
        mb-4 relative
        ${isActive 
            ? 'bg-blue-600 text-white shadow-xl scale-105 ring-4 ring-blue-100' 
            : 'bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-700 shadow-sm border border-slate-200'
        }
      `}
      style={{ minHeight: '80px' }}
    >
      <Icon size={32} strokeWidth={1.5} className="mb-2" />
      <span className="text-[11px] font-bold uppercase tracking-wider text-center leading-none">
        {label}
      </span>
      {isFavorite && (
        <div className="absolute top-2 right-2 text-yellow-400">
          <Star size={10} fill="currentColor" />
        </div>
      )}
    </button>
  );
};

export const QuickActions = () => {
  return (
    <div className="flex flex-col h-full bg-slate-100 border-r border-slate-200 overflow-y-auto scrollbar-hide py-6 px-3">
      
      {/* Group 1: Diagnostics */}
      <div className="mb-8">
          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 text-center">Diag</div>
          <QuickButton label="Exam" icon={ClipboardList} type="Exam" />
          <QuickButton label="Perio" icon={Activity} type="Perio" />
          <QuickButton label="PA" icon={Camera} type="PA" />
          <QuickButton label="FMX" icon={Camera} type="FMX" />
      </div>

      {/* Group 2: Restorative */}
      <div className="mb-8">
          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 text-center">Tx</div>
          <QuickButton label="Comp" icon={PenTool} type="Composite" />
          <QuickButton label="Crown" icon={Crown} type="Crown" />
          <QuickButton label="RCT" icon={Zap} type="Root Canal" />
          <QuickButton label="Ext" icon={Scissors} type="Extraction" />
          <QuickButton label="Imp" icon={Syringe} type="Implant" />
      </div>

      {/* Group 3: Admin */}
      <div>
          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 text-center">Admin</div>
          <QuickButton label="Note" icon={StickyNote} type="Notes" />
          <QuickButton label="Post-Op" icon={FileText} type="Post-Op" isFavorite />
      </div>
    </div>
  );
};
