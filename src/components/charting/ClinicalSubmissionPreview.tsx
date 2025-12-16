
import React, { useMemo } from 'react';
import { TruthAssertionsBundle, AssertionSlot, SLOT_ORDER, SLOT_LABELS, evaluateSlotCompleteness } from '../../domain/TruthAssertions';
import { SoapSectionType } from '../../domain/dentalTypes';
import { AlertCircle, FileText } from 'lucide-react';

interface ClinicalSubmissionPreviewProps {
  truth: TruthAssertionsBundle | undefined;
  patientName?: string;
  visitDate?: string;
  providerName?: string;
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
  providerName = 'Provider'
}) => {

  const renderSectionContent = (sectionType: SoapSectionType) => {
    if (!truth) return null;

    const slotMap = evaluateSlotCompleteness(truth, sectionType);
    const sectionAssertions = truth.assertions.filter(a => a.section === sectionType).sort((a, b) => {
        // Sort by slot order then manually
        const slotA = SLOT_ORDER.indexOf(a.slot);
        const slotB = SLOT_ORDER.indexOf(b.slot);
        if (slotA !== slotB) return slotA - slotB;
        return a.sortOrder - b.sortOrder;
    });

    const contentBySlot: Record<AssertionSlot, React.ReactNode[]> = {} as any;

    // Group active assertions by slot
    sectionAssertions.forEach(a => {
        if (a.checked) {
            if (!contentBySlot[a.slot]) contentBySlot[a.slot] = [];
            contentBySlot[a.slot].push(
                <p key={a.id} className="text-sm text-slate-800 leading-relaxed mb-1.5">
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

                // 1. Missing Required Slot
                if (status === 'empty') {
                    return (
                        <div 
                            key={slot} 
                            id={`preview-missing-${sectionType}-${slot}`}
                            className="bg-red-50 border border-red-200 rounded p-3 flex items-start gap-3 cursor-pointer hover:bg-red-100 transition-colors group"
                            onClick={() => {
                                // Trigger focus in Left Rail
                                const el = document.getElementById(`slot-${sectionType}-${slot}`);
                                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            }}
                        >
                            <AlertCircle size={16} className="text-red-500 mt-0.5 shrink-0" />
                            <div className="flex-1">
                                <span className="text-xs font-bold text-red-600 uppercase tracking-wide flex items-center gap-1">
                                    Missing: {SLOT_LABELS[slot]}
                                    <span className="text-[10px] bg-white px-1.5 rounded border border-red-100 text-red-400 group-hover:border-red-200">REQUIRED</span>
                                </span>
                                <p className="text-xs text-red-500 mt-1">This section requires documentation for claim clearance.</p>
                            </div>
                        </div>
                    );
                }

                // 2. Render Content
                if (hasContent) {
                    return (
                        <div key={slot} className="relative group pl-3 border-l-2 border-transparent hover:border-slate-200 transition-colors">
                            <span className="absolute left-[-2px] top-0.5 text-[9px] font-bold text-slate-300 uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity select-none bg-white pr-1">
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
    <div className="w-full max-w-[8.5in] mx-auto bg-white shadow-lg min-h-[11in] flex flex-col relative transition-all duration-300 border border-slate-200">
       
       {/* Document Header */}
       <div className="px-10 py-8 border-b border-slate-100 flex justify-between items-start">
           <div>
               <h1 className="text-xl font-bold text-slate-900 font-serif mb-1">Clinical Note</h1>
               <div className="text-xs text-slate-500 flex flex-col gap-0.5">
                   <span>{patientName}</span>
                   <span>DOB: 01/01/1980 (M)</span>
               </div>
           </div>
           <div className="text-right text-xs text-slate-500">
               <div className="font-bold text-slate-700">{providerName}</div>
               <div>{visitDate}</div>
               <div className="mt-2 inline-flex items-center gap-1 bg-slate-100 px-2 py-1 rounded">
                   <FileText size={10} />
                   <span>Draft Preview</span>
               </div>
           </div>
       </div>

       {/* Document Body */}
       <div className="flex-1 px-10 py-8 space-y-8">
           {SECTION_ORDER.map(section => (
               <section key={section}>
                   <h2 className="text-sm font-bold text-slate-900 uppercase tracking-widest border-b border-slate-200 pb-1 mb-3">
                       {SECTION_TITLES[section]}
                   </h2>
                   {renderSectionContent(section)}
               </section>
           ))}
           
           {(!truth || truth.assertions.length === 0) && (
               <div className="flex flex-col items-center justify-center py-20 text-slate-300">
                   <FileText size={48} className="mb-4 opacity-50" />
                   <p className="text-sm">Clinical documentation will appear here.</p>
               </div>
           )}
       </div>

       {/* Document Footer */}
       <div className="px-10 py-6 border-t border-slate-100 text-[10px] text-slate-400 flex justify-between items-center">
           <span>Generated by DentalPlan Pro</span>
           <span>Page 1 of 1</span>
       </div>
    </div>
  );
};
