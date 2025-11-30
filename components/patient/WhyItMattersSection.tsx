

import React from 'react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { generateClinicalExplanation } from '../../services/clinicalLogic';
import { TreatmentPlanItem } from '../../types';

interface WhyItMattersSectionProps {
  items: TreatmentPlanItem[];
  explanation?: string | null; // Optional override from doctor
}

export const WhyItMattersSection: React.FC<WhyItMattersSectionProps> = ({ items, explanation }) => {
  const dynamicContent = generateClinicalExplanation(items);
  
  // Use manual explanation if provided, otherwise generated
  const text = explanation || dynamicContent.intro;
  const benefits = dynamicContent.benefits;

  return (
    <section className="py-16 px-6 bg-blue-50/50 border-b border-blue-100">
      <div className="max-w-5xl mx-auto">
        <div className="bg-white rounded-2xl md:rounded-3xl p-8 md:p-12 border border-gray-100 shadow-xl shadow-blue-100/50">
           <div className="flex items-start gap-4 mb-6">
              <AlertCircle className="text-orange-500 shrink-0 mt-1" />
              <h2 className="text-xl font-bold text-gray-900">Why It Matters</h2>
           </div>
           
           <div className="prose prose-lg text-gray-600 leading-relaxed max-w-none mb-8">
             <p>{text}</p>
           </div>

           <div className="pt-8 border-t border-gray-100">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Key Health Benefits</h3>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 {benefits.map((benefit, idx) => (
                   <li key={idx} className="flex items-start gap-3 text-blue-900 font-medium">
                      <CheckCircle2 size={20} className="text-blue-500 shrink-0" />
                      {benefit}
                   </li>
                 ))}
              </ul>
           </div>
        </div>
      </div>
    </section>
  );
};