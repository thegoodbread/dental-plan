
import React, { useMemo } from 'react';
import { TruthAssertionsBundle, AssertionSlot, SLOT_ORDER, SLOT_LABELS, evaluateSlotCompleteness, getNoteCompleteness } from '../../domain/TruthAssertions';
import { SoapSectionType } from '../../domain/dentalTypes';
import { AlertCircle, FileText, ArrowRight, ShieldCheck, ShieldAlert, Info } from 'lucide-react';

interface ClinicalSubmissionPreviewProps {
  truth: TruthAssertionsBundle | undefined;
  patientName?: string;
  visitDate?: string;
  providerName?: string;
  onNavigate?: (section: SoapSectionType, slot: AssertionSlot) => void;
}

const SECTION_TITLES: Record<SoapSectionType, string> = {
  'SUBJECTIVE': 'Subjective',
  'OBJECTIVE': 'Objective',
  'ASSESSMENT': 'Assessment',
  'TREATMENT_PERFORMED': 'Treatment Performed',
  'PLAN': 'Plan'
};

const SECTION_ORDER: SoapSectionType[] = ['SUBJECTIVE', 'OBJECTIVE', 'ASSESSMENT', 'TREATMENT_PERFORMED', 'PLAN'];

export const ClinicalSubmissionPreview: React.FC<ClinicalSubmissionPreviewProps> = ({ 
  truth,
  patientName = 'Patient Record',
  visitDate = new Date().toLocaleDateString(),
  providerName = 'Provider',
  onNavigate
}) => {

  // Documentation Completeness Logic (Not Claim Acceptance Logic)
  const completeness = useMemo(() => getNoteCompleteness(truth), [truth]);
  const isPassing = completeness.percent >= 100;
  const missingCount = completeness.requiredSlots - completeness.completedSlots;

  const handleNavigate = (section: SoapSectionType, slot: AssertionSlot) => {
      if (onNavigate) onNavigate(section, slot);
  };

  const renderSectionContent = (sectionType: SoapSectionType) => {
    if (!truth) return null;

    const slotMap = evaluateSlotCompleteness(truth, sectionType);
    const sectionAssertions = truth.assertions.filter(a => a.section === sectionType).sort((a, b) => {
        // Sort by slot order first
        const slotA = SLOT_ORDER.indexOf(a.slot);
        const slotB = SLOT_ORDER.indexOf(b.slot);
        if (slotA !== slotB) return slotA - slotB;
        return a.sortOrder - b.sortOrder;
    });

    const contentBySlot: Record<AssertionSlot, React.ReactNode[]> = {} as any;

    sectionAssertions.forEach(a => {
        if (a.checked) {
            if (!contentBySlot[a.slot]) contentBySlot[a.slot] = [];
            contentBySlot[a.slot].push(
                <p key={a.id} className="text-sm text-slate-800 leading-relaxed mb-1.5 font-serif">
                    {a.sentence || a.label}
                    {a.description && a.description !== a.label && <span className="text-slate-600 ml-1">({a.description})</span>}
                </p>
            );
        }
    });

    return (
        <div className="space-y-4">
            {SLOT_ORDER.map(slot => {
                const status = slotMap[slot];
                const hasContent = contentBySlot[slot] && contentBySlot[slot].length > 0;

                // 1. Missing Required Slot (Interactive Callout)
                if (status === 'empty') {
                    return (
                        <div 
                            key={slot} 
                            id={`preview-missing-${sectionType}-${slot}`}
                            className="bg-red-50 border border-red-200 rounded p-3 flex items-start gap-3 cursor-pointer hover:bg-red-100 transition-colors group relative overflow-hidden print:hidden"
                            onClick={() => handleNavigate(sectionType, slot)}
                            role="button"
                            title={`Click to fix missing ${SLOT_LABELS[slot]}`}
                        >
                            {/* Visual Noise Pattern for 'Missing' feel */}
                            <div className="absolute top-0 right-0 w-4 h-4 bg-red-200 rotate-45 transform translate-x-2 -translate-y-2"></div>
                            
                            <AlertCircle size={16} className="text-red-500 mt-0.5 shrink-0" />
                            <div className="flex-1">
                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-bold text-red-700 uppercase tracking-wide flex items-center gap-1">
                                        Missing: {SLOT_LABELS[slot]}
                                    </span>
                                    <span className="text-[10px] bg-white px-2 py-0.5 rounded border border-red-200 text-red-500 font-bold shadow-sm group-hover:text-red-600 flex items-center gap-1">
                                        FIX <ArrowRight size={10} />
                                    </span>
                                </div>
                                <p className="text-[11px] text-red-600 mt-1 opacity-90 font-medium">
                                    Administrative requirement pending.
                                </p>
                            </div>
                        </div>
                    );
                }

                // 2. Render Content
                if (hasContent) {
                    return (
                        <div key={slot} className="relative group pl-3 border-l-2 border-transparent hover:border-slate-200 transition-colors">
                            <span className="absolute left-[-4px] top-0.5 text-[9px] font-bold text-slate-300 uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity select-none bg-white pr-1 pointer-events-none">
                                {SLOT_LABELS[slot]}
                            </span>
                            {contentBySlot[slot]}
                        </div>
                    );
                }

                return null;
            })}
        </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-slate-100/50 p-4 md:p-8 overflow-y-auto custom-scrollbar">
        
        {/* Pre-Submission Status Header */}
        <div className={`
            max-w-[8.5in] mx-auto w-full mb-6 rounded-xl border p-4 shadow-sm flex items-center justify-between transition-colors
            ${isPassing ? 'bg-green-50 border-green-200' : 'bg-white border-slate-200'}
        `}>
            <div className="flex items-center gap-4">
                <div className={`p-3 rounded-full ${isPassing ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-500'}`}>
                    {isPassing ? <ShieldCheck size={24} /> : <ShieldAlert size={24} />}
                </div>
                <div>
                    <h3 className={`text-sm font-black uppercase tracking-wide ${isPassing ? 'text-green-800' : 'text-slate-800'}`}>
                        {isPassing ? 'SUBMISSION-READY DOCUMENTATION' : 'MISSING DOCUMENTATION'}
                    </h3>
                    <p className={`text-xs ${isPassing ? 'text-green-600' : 'text-slate-500'}`}>
                        {isPassing 
                            ? 'All required administrative fields are present. Guidance only.' 
                            : `Review items on the right to complete documentation. Guidance only.`}
                    </p>
                </div>
            </div>
        </div>

        {/* Paper Document */}
        <div className="w-full max-w-[8.5in] mx-auto bg-white shadow-lg min-h-[11in] flex flex-col relative transition-all duration-300 border border-slate-200 print:shadow-none print:border-none">
        
        {/* Document Header */}
        <div className="px-12 py-10 border-b border-slate-100 flex justify-between items-start">
            <div>
                <h1 className="text-2xl font-bold text-slate-900 font-serif mb-1">Clinical Note</h1>
                <div className="text-sm text-slate-500 flex flex-col gap-0.5">
                    <span className="font-semibold text-slate-700">{patientName}</span>
                    <span>DOB: 01/01/1980 (M)</span>
                </div>
            </div>
            <div className="text-right text-sm text-slate-500">
                <div className="font-bold text-slate-700">{providerName}</div>
                <div>{visitDate}</div>
                <div className="mt-3 inline-flex items-center gap-1 bg-slate-50 px-2 py-1 rounded text-xs text-slate-400 border border-slate-100">
                    <FileText size={10} />
                    <span>DRAFT ID: {Math.random().toString(36).substr(2, 6).toUpperCase()}</span>
                </div>
            </div>
        </div>

        {/* Document Body */}
        <div className="flex-1 px-12 py-8 space-y-10">
            {SECTION_ORDER.map(section => (
                <section key={section}>
                    <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1 mb-3">
                        {SECTION_TITLES[section]}
                    </h2>
                    {renderSectionContent(section)}
                </section>
            ))}
            
            {(!truth || truth.assertions.length === 0) && (
                <div className="flex flex-col items-center justify-center py-20 text-slate-300">
                    <FileText size={48} className="mb-4 opacity-30" />
                    <p className="text-sm font-serif italic">Clinical documentation will appear here as you build the note.</p>
                </div>
            )}
        </div>

        {/* Document Footer / Compliance Notice */}
        <div className="px-12 py-4 border-t border-slate-100 text-[10px] text-slate-300 flex flex-col items-center gap-1 mt-auto bg-slate-50">
            <div className="flex items-center gap-1 text-slate-400">
                <Info size={10} />
                <span>Verification Status: Automated Completeness Check</span>
            </div>
            <span className="text-center max-w-lg">
                Guidance only. Requirements vary by payer. Final review/submission occurs in the PMS.
            </span>
        </div>
        </div>
        
        <div className="h-20"></div> {/* Scroll spacer */}
    </div>
  );
};
