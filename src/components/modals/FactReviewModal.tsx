
import React from 'react';
import { SoapSectionType } from '../../domain/dentalTypes';
import { AlertTriangle, CheckCircle, ArrowRight } from 'lucide-react';

interface FactReviewModalProps {
  isOpen: boolean;
  incompleteSections: SoapSectionType[];
  onReviewNow: () => void;
  onSignAnyway: () => void;
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
  onSignAnyway 
}) => {
  if (!isOpen) return null;

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
                The following sections contain generated facts that you haven't reviewed yet:
              </p>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 mb-6">
            <ul className="space-y-1">
              {incompleteSections.map(sec => (
                <li key={sec} className="text-sm font-medium text-amber-800 flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div>
                  {SECTION_LABELS[sec] || sec}
                </li>
              ))}
            </ul>
          </div>

          <p className="text-xs text-gray-400 italic">
            Reviewing ensures the narrative accurately reflects your clinical findings.
          </p>
        </div>

        <div className="bg-gray-50 p-4 flex gap-3 border-t border-gray-100">
          <button 
            onClick={onReviewNow}
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
