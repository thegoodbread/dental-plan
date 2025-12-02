
import React from 'react';
import { ShieldAlert, Info } from 'lucide-react';
import { RISK_LIBRARY } from '../../domain/riskLibrary';

// In a real app, you'd pass the actual assigned risks for this plan.
// For this demo, we will show a curated set based on the plan type or mock data.
// Since the Plan object doesn't persist AssignedRisks in this demo's data model yet,
// we will statically display a set of common risks for demonstration if none are passed.

interface RiskConsentSectionProps {
  // If we had the data model fully wired up for patient view persistence
  // assignedRiskIds?: string[]; 
}

export const RiskConsentSection: React.FC<RiskConsentSectionProps> = () => {
  // Mock: Simulate risks for a "Restorative & Extraction" plan
  const displayRisks = RISK_LIBRARY.filter(r => 
      ['rest_pain_common', 'rest_occlusion', 'ext_dry_socket'].includes(r.id)
  );

  return (
    <section className="py-12 md:py-16 px-4 md:px-6 bg-white border-t border-gray-100">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
            <div className="p-2 bg-amber-50 rounded-lg text-amber-600">
                <ShieldAlert size={24} />
            </div>
            <div>
                <h2 className="text-xl font-bold text-gray-900">Informed Consent & Risks</h2>
                <p className="text-sm text-gray-500">Important safety information regarding your treatment.</p>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {displayRisks.map(risk => (
                <div key={risk.id} className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-2 mb-3">
                        <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-md tracking-wider ${risk.severity === 'COMMON' ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700'}`}>
                            {risk.severity}
                        </span>
                        <h3 className="font-bold text-gray-900">{risk.title}</h3>
                    </div>
                    <p className="text-sm text-gray-600 leading-relaxed">
                        {risk.body}
                    </p>
                </div>
            ))}
        </div>
        
        <div className="mt-8 bg-gray-50 p-4 rounded-xl flex gap-4 text-sm text-gray-600 border border-gray-100">
            <Info className="shrink-0 text-blue-500 mt-0.5" size={20} />
            <div>
                <p>
                    Please review these items carefully. By proceeding with treatment, you acknowledge that these risks have been explained to you and you have had the opportunity to ask questions.
                </p>
                <p className="text-xs text-gray-400 mt-2 italic">
                    The risks listed above include common and clinically relevant possibilities, but they are not exhaustive. Other rare or unforeseen complications may occur. Your dentist will explain any additional concerns specific to your case.
                </p>
            </div>
        </div>
      </div>
    </section>
  );
};
