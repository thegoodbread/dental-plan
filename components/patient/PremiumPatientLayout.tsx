





import React, { useState } from 'react';
import { TreatmentPlan, TreatmentPlanItem } from '../../types';
import { DollarSign } from 'lucide-react';
import { calculateClinicalMetrics } from '../../services/clinicalLogic';

// Components
import { HeaderSection } from './HeaderSection';
import { MouthDiagramSection } from './MouthDiagramSection';
import { TreatmentTimelineSection } from './TreatmentTimelineSection';
import { ProcedureBreakdownSection } from './ProcedureBreakdownSection';
import { WhyItMattersSection } from './WhyItMattersSection';
import { SummaryMetricsSection } from './SummaryMetricsSection';
import { PaymentEstimatorSection } from './PaymentEstimatorSection';
import { PatientCTASection } from './PatientCTASection';

interface PremiumPatientLayoutProps {
  plan: TreatmentPlan;
  items: TreatmentPlanItem[];
}

export const PremiumPatientLayout: React.FC<PremiumPatientLayoutProps> = ({ plan, items }) => {
  
  // --- SHARED HOVER STATE ---
  const [hoveredTooth, setHoveredTooth] = useState<number | null>(null);
  const [hoveredQuadrant, setHoveredQuadrant] = useState<string | null>(null);
  const [hoveredItemId, setHoveredItemId] = useState<string | null>(null);

  // --- HANDLERS ---
  
  // 1. Tooth Hover (Primary)
  const handleToothHover = (tooth: number | null) => {
    setHoveredTooth(tooth);
    if (tooth) {
      setHoveredQuadrant(null); // Tooth takes precedence
      // We do not clear hoveredItemId to allow "locking" if we wanted, 
      // but for this interaction model, we usually want diagram exploration 
      // to override item list selection or vice-versa. 
      // The prompt requests: "Do NOT set hoveredItemId here."
    }
  };

  // 2. Quadrant Hover (Secondary)
  const handleQuadrantHover = (quad: string | null) => {
    // Only apply if not on a tooth
    setHoveredQuadrant(quad);
    if (quad) {
      setHoveredTooth(null);
      setHoveredItemId(null);
    }
  };

  // 3. Item Hover (Reverse)
  const handleItemHover = (itemId: string | null) => {
    setHoveredItemId(itemId);
    // Do not change tooth/quadrant state, but the visual logic in diagram 
    // will prioritize this if tooth is null
  };

  // --- CLINICAL LOGIC INTEGRATION ---
  const metrics = calculateClinicalMetrics(items);

  // Phases Logic (Simple Heuristic for now, could be in service)
  const phases = [];
  const hasPerio = items.some(i => i.category === 'PERIO' || i.category === 'PREVENTIVE');
  const hasRestorative = items.some(i => i.category === 'RESTORATIVE' || i.category === 'ENDODONTIC');
  const hasImplant = items.some(i => i.category === 'IMPLANT' || i.category === 'PROSTHETIC' || i.category === 'OTHER');

  if (hasPerio) {
     phases.push({ 
       id: '1', 
       title: 'Foundation & Hygiene', 
       description: 'Addressing gum health to ensure a solid foundation.', 
       durationEstimate: '1-2 visits' 
     });
  }
  if (hasRestorative) {
     phases.push({ 
       id: '2', 
       title: 'Restorative Phase', 
       description: 'Repairing damaged teeth to restore function.', 
       durationEstimate: '2-3 weeks' 
     });
  }
  if (hasImplant) {
     phases.push({ 
       id: '3', 
       title: 'Implant & Replacement', 
       description: 'Permanent replacement of missing teeth.', 
       durationEstimate: '3-6 months' 
     });
  }
  if (phases.length === 0) {
     phases.push({ id: '1', title: 'Treatment', description: 'Scheduled procedures', durationEstimate: 'Flexible' });
  }

  return (
    <div className="min-h-screen bg-blue-50/30 text-gray-900 font-sans selection:bg-blue-100">
      
      <HeaderSection 
        planNumber={plan.planNumber}
      />

      {/* Diagram with Hover State */}
      <MouthDiagramSection 
        items={items}
        hoveredTooth={hoveredTooth}
        hoveredQuadrant={hoveredQuadrant}
        hoveredItemId={hoveredItemId}
        onHoverTooth={handleToothHover}
        onHoverQuadrant={handleQuadrantHover}
      />

      <TreatmentTimelineSection phases={phases} />

      {/* Procedure List with Hover State */}
      <ProcedureBreakdownSection 
        plan={plan}
        items={items} 
        phases={phases}
        hoveredTooth={hoveredTooth}
        hoveredQuadrant={hoveredQuadrant}
        hoveredItemId={hoveredItemId}
        onHoverItem={handleItemHover}
      />

      <WhyItMattersSection items={items} explanation={plan.explanationForPatient} />

      <SummaryMetricsSection 
        visitCount={metrics.visitCount}
        phaseCount={phases.length}
        procedureCount={items.length}
      />

      <PaymentEstimatorSection 
        plan={plan}
        items={items}
      />

      {/* Summary Footer */}
      <section className="py-16 px-6 bg-blue-600 text-white">
         <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl font-bold mb-2">Your Summary</h2>
            <p className="text-blue-100 mb-8">Everything you need to know at a glance</p>
            
            <div className="flex flex-col md:flex-row gap-8">
               <div className="flex-1 bg-white/10 rounded-2xl p-8 backdrop-blur-sm border border-white/20">
                  <div className="text-xs uppercase font-bold text-blue-200 mb-1">Total Investment</div>
                  <div className="text-4xl font-black mb-1 flex items-start gap-1">
                     ${plan.patientPortion.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                     <DollarSign size={24} className="mt-2 opacity-50" />
                  </div>
                  <div className="text-sm text-blue-100">(after estimated insurance coverage)</div>
               </div>

               <div className="flex-1 bg-white/10 rounded-2xl p-8 backdrop-blur-sm border border-white/20">
                  <h3 className="font-bold text-lg mb-4">Why This Helps You</h3>
                  <div className="space-y-4 text-sm text-blue-50 leading-relaxed">
                     <p><strong className="text-white">Bottom Line:</strong> This plan is designed to restore your oral health, prevent future problems, and give you a smile you can be proud of.</p>
                  </div>
               </div>
            </div>
         </div>
      </section>

      <PatientCTASection />

    </div>
  );
};