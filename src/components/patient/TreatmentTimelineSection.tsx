import React, { useMemo } from 'react';
import { Clock } from 'lucide-react';
import { TreatmentPlan, TreatmentPlanItem } from '../../types';
import { derivePhaseTimeline, DerivedPhaseMetadata } from '../../domain/timelineGeneration';

interface TreatmentTimelineSectionProps {
  plan: TreatmentPlan;
  items: TreatmentPlanItem[];
}

const PhaseItem: React.FC<{ phaseData: DerivedPhaseMetadata; index: number; }> = ({ phaseData, index }) => {
  return (
    <div className="relative z-10 flex flex-col items-center text-center group">
      <div className="w-16 h-16 rounded-full bg-blue-600 text-white font-bold text-2xl flex items-center justify-center mb-6 shadow-lg shadow-blue-200 border-4 border-white transition-transform group-hover:scale-110 relative">
        {index + 1}
      </div>
      <h3 className="text-lg font-bold text-gray-900 mb-2">{phaseData.title}</h3>
      <p className="text-sm text-gray-500 mb-4 max-w-[240px] mx-auto leading-relaxed min-h-[40px]">
        {phaseData.description}
      </p>
      
      {phaseData.durationLabel && (
        <div className="flex items-center gap-1.5 text-xs font-bold text-gray-500 uppercase tracking-wide bg-gray-100 px-3 py-1.5 rounded-full">
          <Clock size={12} />
          {phaseData.durationLabel}
        </div>
      )}
    </div>
  );
};

export const TreatmentTimelineSection: React.FC<TreatmentTimelineSectionProps> = ({ plan, items }) => {
  
  /**
   * INVARIANT: The Timeline must NEVER display stale duration values.
   * This signature ensures that any logical change to item clinical details, 
   * identifiers, or phase ordering triggers a deterministic re-computation.
   */
  const timelineSignature = useMemo(() => {
    // Collect all data points that affect visual timeline derivation and clinical estimation
    const itemSig = items
      .map(i => {
          const teeth = (i.selectedTeeth || []).join(',');
          const surfaces = (i.surfaces || []).join('');
          
          // Include identifying and estimator-relevant properties
          const base = `${i.id}:${i.procedureCode}:${i.feeScheduleEntryId || 'X'}:${i.procedureName}:${i.category}:${i.itemType}`;
          const clinical = `${teeth}:${surfaces}:${i.unitType}:${i.units}:${i.urgency || 'E'}:${i.phaseId || 'N'}`;
          const timing = `${i.estimatedDurationValue}:${i.estimatedDurationUnit || 'none'}`;
          return `${base}:${clinical}:${timing}`;
      })
      .join('|');

    const phaseSig = (plan.phases || [])
      .map(p => {
          const itemsList = (p.itemIds || []).join(',');
          return `${p.id}:${p.sortOrder}:${p.estimatedDurationValue}:${p.estimatedDurationUnit || 'none'}:${p.durationIsManual ? 1 : 0}:${p.isMonitorPhase ? 1 : 0}:${itemsList}`;
      })
      .join('|');

    // pricing mode affects canonical hydration of item defaults, so it must be in the signature
    return `${plan.feeScheduleType || 'std'}-${itemSig}||${phaseSig}`;
  }, [items, plan.phases, plan.feeScheduleType]);

  const timelinePhases = useMemo(() => {
    /**
     * SELF-HEALING: If phases is missing/empty, derivePhaseTimeline will 
     * auto-create a default synthetic phase for any plan with items.
     */
    return derivePhaseTimeline(plan.phases, items, plan.id);
  }, [plan.phases, items, plan.id, timelineSignature]);

  // INVARIANT 1: Only return null if there are absolutely no phases to show (e.g. 0 items and no manual phases)
  if (timelinePhases.length === 0) return null;

  let phaseRows: DerivedPhaseMetadata[][];
  const numPhases = timelinePhases.length;

  // Grid layout logic for responsive desktop rendering
  if (numPhases <= 4) {
    phaseRows = [timelinePhases];
  } else if (numPhases === 5) {
    phaseRows = [timelinePhases.slice(0, 3), timelinePhases.slice(3, 5)];
  } else if (numPhases === 6) {
    phaseRows = [timelinePhases.slice(0, 3), timelinePhases.slice(3, 6)];
  } else {
    phaseRows = [timelinePhases.slice(0, 4), timelinePhases.slice(4)];
  }

  let phaseCounter = 0;

  return (
    <section className="py-12 md:py-16 px-6 bg-white border-b border-gray-100">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Treatment Timeline</h2>
        <p className="text-gray-500 mb-10 md:mb-12">How your treatment will progress over time</p>
        
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
                  {row.map((phaseData) => {
                    const currentPhaseIndex = phaseCounter;
                    phaseCounter++;
                    return <PhaseItem key={phaseData.phaseId} phaseData={phaseData} index={currentPhaseIndex} />;
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Vertical list for mobile */}
        <div className="md:hidden">
           {timelinePhases.map((phaseData, idx) => {
             return (
               <div key={phaseData.phaseId} className="flex gap-4 relative">
                  {idx !== timelinePhases.length - 1 && (
                      <div className="absolute left-5 top-10 bottom-0 w-0.5 bg-blue-100 -ml-[1px]" aria-hidden="true" />
                  )}
                  
                  <div className="relative z-10 w-10 h-10 rounded-full bg-blue-600 text-white font-bold text-lg flex items-center justify-center shrink-0 shadow-lg shadow-blue-200 ring-4 ring-white">
                    {idx + 1}
                  </div>

                  <div className="flex-1 pb-10">
                     <h3 className="text-lg font-bold text-gray-900 mb-1 leading-tight">{phaseData.title}</h3>
                     <p className="text-sm text-gray-600 leading-relaxed mb-3">{phaseData.description}</p>
                     {phaseData.durationLabel && (
                        <div className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-500 bg-gray-50 px-2.5 py-1 rounded-full border border-gray-200 uppercase tracking-wide">
                          <Clock size={12} />
                          {phaseData.durationLabel}
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