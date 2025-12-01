

import React, { useState, useRef, useEffect } from 'react';
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

  // --- STICKY CTA LOGIC ---
  const teethSectionRef = useRef<HTMLDivElement>(null);
  const [isCtaSticky, setIsCtaSticky] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        // Set sticky when the bottom of the teeth section is above the top of the viewport
        setIsCtaSticky(!entry.isIntersecting && entry.boundingClientRect.bottom < 0);
      },
      { threshold: 0 }
    );

    const currentRef = teethSectionRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, []);

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
  const phaseCount = plan.phases ? plan.phases.filter(p => (p.itemIds && p.itemIds.length > 0) || p.isMonitorPhase).length : 0;

  return (
    <div className="min-h-screen bg-blue-50/30 text-gray-900 font-sans selection:bg-blue-100 select-none">
      
      <HeaderSection 
        planNumber={plan.planNumber}
      />

      {/* Diagram with Hover State */}
      <div ref={teethSectionRef} className="mt-4 md:mt-6">
        <MouthDiagramSection 
          items={items}
          hoveredTooth={hoveredTooth}
          hoveredQuadrant={hoveredQuadrant}
          hoveredItemId={hoveredItemId}
          onHoverTooth={handleToothHover}
          onHoverQuadrant={handleQuadrantHover}
        />
      </div>

      <TreatmentTimelineSection plan={plan} items={items} />

      {/* Procedure List with Hover State */}
      <ProcedureBreakdownSection 
        plan={plan}
        items={items} 
        hoveredTooth={hoveredTooth}
        hoveredQuadrant={hoveredQuadrant}
        hoveredItemId={hoveredItemId}
        onHoverItem={handleItemHover}
      />

      <WhyItMattersSection items={items} />

      <SummaryMetricsSection 
        visitCount={metrics.visitCount}
        phaseCount={phaseCount}
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

      <div className={isCtaSticky ? 'sticky bottom-0 z-50 shadow-[0_-4px_30px_rgba(0,0,0,0.08)]' : 'relative'}>
        <PatientCTASection />
      </div>

    </div>
  );
};