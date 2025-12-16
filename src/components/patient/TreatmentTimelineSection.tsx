
import React, { useEffect } from 'react';
import { Clock } from 'lucide-react';
import { TreatmentPlan, TreatmentPlanItem, TreatmentPhase } from '../../types';

interface TreatmentTimelineSectionProps {
  plan: TreatmentPlan;
  items: TreatmentPlanItem[];
}

const renderPhaseMetric = (phase: TreatmentPhase) => {
  // 1. Duration (Preferred)
  if (phase.estimatedDurationValue && phase.estimatedDurationUnit) {
      const { estimatedDurationValue: value, estimatedDurationUnit: unit } = phase;
      let unitText = unit.charAt(0).toUpperCase() + unit.slice(1);
      // Simple pluralization check
      if (value === 1 && unitText.endsWith('s')) unitText = unitText.slice(0, -1); 
      return `Est. ${value} ${unitText}`;
  }
  
  // 2. Visits (Fallback)
  if (phase.estimatedVisits) {
      return `Est. ${phase.estimatedVisits} visits`;
  }
  
  return null;
};

const PhaseItem: React.FC<{ phase: TreatmentPhase; index: number; }> = ({ phase, index }) => {
  const metricText = renderPhaseMetric(phase);
  return (
    <div key={phase.id} className="relative z-10 flex flex-col items-center text-center group">
      <div className="w-16 h-16 rounded-full bg-blue-600 text-white font-bold text-2xl flex items-center justify-center mb-6 shadow-lg shadow-blue-200 border-4 border-white transition-transform group-hover:scale-110 relative">
        {index + 1}
      </div>
      <h3 className="text-lg font-bold text-gray-900 mb-2">{phase.title}</h3>
      <p className="text-sm text-gray-500 mb-4 max-w-[240px] mx-auto leading-relaxed min-h-[40px]">{phase.description}</p>
      
      {metricText && (
        <div className="flex items-center gap-1.5 text-xs font-bold text-gray-500 uppercase tracking-wide bg-gray-100 px-3 py-1.5 rounded-full">
          <Clock size={12} />
          {metricText}
        </div>
      )}
    </div>
  );
};

export const TreatmentTimelineSection: React.FC<TreatmentTimelineSectionProps> = ({ plan, items }) => {
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
        console.log('TreatmentTimeline Phases:', plan.phases);
    }
  }, [plan]);

  const phases = plan.phases
    ? [...plan.phases]
        .filter(p => (p.itemIds && p.itemIds.length > 0) || p.isMonitorPhase)
        .sort((a, b) => a.sortOrder - b.sortOrder)
    : [];

  if (!phases || phases.length === 0) return null;

  let phaseRows: TreatmentPhase[][];
  const numPhases = phases.length;

  // Simple responsive row breaking
  if (numPhases <= 4) {
    phaseRows = [phases];
  } else if (numPhases === 5) {
    phaseRows = [phases.slice(0, 3), phases.slice(3, 5)];
  } else if (numPhases === 6) {
    phaseRows = [phases.slice(0, 3), phases.slice(3, 6)];
  } else {
    phaseRows = [phases.slice(0, 4), phases.slice(4)];
  }

  let phaseCounter = 0;

  return (
    <section className="py-12 md:py-16 px-6 bg-white border-b border-gray-100">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Treatment Timeline</h2>
        <p className="text-gray-500 mb-10 md:mb-12">How your treatment will progress over time</p>
        
        {/* Desktop & Tablet Container */}
        <div className="hidden md:block relative mx-auto space-y-16">
          {phaseRows.map((row, rowIndex) => {
            const rowCount = row.length;
            const centerOffset = (100 / rowCount) / 2;
            
            const isMultiRow = phaseRows.length > 1;
            const lineStyle: React.CSSProperties = {
              left: `${centerOffset}%`,
              right: `${centerOffset}%`,
            };

            if (isMultiRow) {
              if (rowIndex === 0) lineStyle.right = '0%';
              else lineStyle.left = '0%';
            }
            
            return (
              <div key={rowIndex} className="relative">
                {rowCount > 1 && (
                  <div
                    className="absolute top-8 h-0.5 bg-blue-100 -z-0"
                    style={lineStyle}
                  />
                )}
                <div
                  className="grid gap-0"
                  style={{ gridTemplateColumns: `repeat(${rowCount}, minmax(0, 1fr))` }}
                >
                  {row.map((phase) => {
                    const currentPhaseIndex = phaseCounter;
                    phaseCounter++;
                    return <PhaseItem key={phase.id} phase={phase} index={currentPhaseIndex} />;
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Mobile Container */}
        <div className="md:hidden">
           {phases.map((phase, idx) => {
             const metricText = renderPhaseMetric(phase);
             return (
               <div key={phase.id} className="flex gap-4 relative">
                  {idx !== phases.length - 1 && (
                      <div className="absolute left-5 top-10 bottom-0 w-0.5 bg-blue-100 -ml-[1px]" aria-hidden="true" />
                  )}
                  
                  <div className="relative z-10 w-10 h-10 rounded-full bg-blue-600 text-white font-bold text-lg flex items-center justify-center shrink-0 shadow-lg shadow-blue-200 ring-4 ring-white">
                    {idx + 1}
                  </div>

                  <div className="flex-1 pb-10">
                     <h3 className="text-lg font-bold text-gray-900 mb-1 leading-tight">{phase.title}</h3>
                     <p className="text-sm text-gray-600 leading-relaxed mb-3">{phase.description}</p>
                     {metricText && (
                        <div className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-500 bg-gray-50 px-2.5 py-1 rounded-full border border-gray-200 uppercase tracking-wide">
                          <Clock size={12} />
                          {metricText}
                        </div>
                     )}
                  </div>
               </div>
             );
           })}
        </div>

      </div>
    </section>
  );
};
