
import React, { useState } from 'react';
import { SoapSectionType } from '../../domain/dentalTypes';
import { AssertionSlot, SLOT_LABELS } from '../../domain/TruthAssertions';
import { AlertTriangle, CheckCircle, ArrowRight, ChevronDown, ChevronRight } from 'lucide-react';

interface FactReviewModalProps {
  isOpen: boolean;
  incompleteSections: { section: SoapSectionType; missingSlots: AssertionSlot[] }[];
  onReviewNow: () => void;
  onSignAnyway: () => void;
  onJumpToSection?: (section: SoapSectionType, slot?: AssertionSlot) => void;
  completenessPercent?: number;
}

const SECTION_LABELS: Record<SoapSectionType, string> = {
  'SUBJECTIVE': 'Subjective',
  'OBJECTIVE': 'Objective',
  'ASSESSMENT': 'Assessment',
  'TREATMENT_PERFORMED': 'Treatment Performed',
  'PLAN': 'Plan'
};

export const FactReviewModal: React.FC<FactReviewModalProps> = ({ 
  isOpen, 
  incompleteSections, 
  onReviewNow, 
  onSignAnyway,
  onJumpToSection,
  completenessPercent
}) => {
  const [detailsOpen, setDetailsOpen] = useState(true);

  if (!isOpen) return null;

  const handleReviewNow = () => {
      if (incompleteSections.length > 0 && onJumpToSection) {
          const first = incompleteSections[0];
          // Jump to first missing slot or just the section
          onJumpToSection(first.section, first.missingSlots[0]);
      }
      onReviewNow();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-start gap-4 mb-4">
            <div className="p-3 bg-amber-50 rounded-full text-amber-600 shrink-0">
              <AlertTriangle size={24} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 leading-tight">Unreviewed Facts</h3>
              <p className="text-sm text-gray-500 mt-1">
                Some sections have incomplete or missing facts based on the procedure context.
                {completenessPercent !== undefined && (
                    <span className="block mt-1 font-medium text-amber-700">
                        Your note is currently {completenessPercent}% complete based on required facts.
                    </span>
                )}
              </p>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-100 rounded-lg overflow-hidden">
            <button 
              onClick={() => setDetailsOpen(!detailsOpen)}
              className="w-full flex items-center justify-between p-3 text-left hover:bg-amber-100/50 transition-colors"
            >
                <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">
                    {incompleteSections.length} Sections Flagged
                </span>
                {detailsOpen ? <ChevronDown size={14} className="text-amber-600" /> : <ChevronRight size={14} className="text-amber-600" />}
            </button>
            
            {detailsOpen && (
                <div className="px-3 pb-3">
                    <ul className="space-y-3">
                    {incompleteSections.map(({ section, missingSlots }) => (
                        <li key={section} className="text-sm">
                            <div className="font-bold text-amber-900 mb-1 flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div>
                                {SECTION_LABELS[section] || section}
                            </div>
                            {missingSlots.length > 0 ? (
                                <ul className="pl-4 space-y-1">
                                    {missingSlots.map(slot => (
                                        <li key={slot} className="text-xs text-amber-700 flex items-center gap-1.5">
                                            <span className="w-1 h-1 rounded-full bg-amber-400"></span>
                                            Missing: {SLOT_LABELS[slot] || slot}
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <div className="pl-4 text-xs text-amber-700 italic">Review pending</div>
                            )}
                        </li>
                    ))}
                    </ul>
                </div>
            )}
          </div>

          <p className="text-xs text-gray-400 italic mt-4">
            Reviewing ensures the narrative accurately reflects your clinical findings.
          </p>
        </div>

        <div className="bg-gray-50 p-4 flex gap-3 border-t border-gray-100">
          <button 
            onClick={handleReviewNow}
            className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2"
          >
            <CheckCircle size={16} /> Review Now
          </button>
          <button 
            onClick={onSignAnyway}
            className="px-4 py-2.5 text-gray-500 hover:text-gray-700 font-semibold hover:bg-gray-200 rounded-lg transition-colors flex items-center gap-1"
          >
            Sign Anyway <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};
