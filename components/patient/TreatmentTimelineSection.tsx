

import React from 'react';
import { Clock } from 'lucide-react';

interface Phase {
  id: string;
  title: string;
  description?: string;
  durationEstimate?: string;
}

interface TreatmentTimelineSectionProps {
  phases: Phase[];
}

export const TreatmentTimelineSection: React.FC<TreatmentTimelineSectionProps> = ({ phases }) => {
  if (!phases || phases.length === 0) return null;

  const count = phases.length;
  // Calculate the center point of the first and last column
  const centerOffset = (100 / count) / 2; 

  return (
    <section className="py-12 md:py-16 px-6 bg-white border-b border-gray-100">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Treatment Timeline</h2>
        <p className="text-gray-500 mb-10 md:mb-12">How your treatment will progress over time</p>
        
        {/* Desktop & Tablet Container */}
        <div 
            className="hidden md:block relative mx-auto"
            style={{ maxWidth: `${Math.min(100, count * 25)}rem` }}
        >
          {count > 1 && (
            <div 
              className="absolute top-8 h-0.5 bg-blue-100 -z-0"
              style={{ 
                  left: `${centerOffset}%`, 
                  right: `${centerOffset}%` 
              }}
            ></div>
          )}

          <div 
            className="grid grid-flow-col gap-0"
            style={{ gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))` }}
          >
            {phases.map((phase, idx) => (
              <div key={phase.id} className="relative z-10 flex flex-col items-center text-center group">
                <div className="w-16 h-16 rounded-full bg-blue-600 text-white font-bold text-2xl flex items-center justify-center mb-6 shadow-lg shadow-blue-200 border-4 border-white transition-transform group-hover:scale-110">
                  {idx + 1}
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{phase.title}</h3>
                <p className="text-sm text-gray-500 mb-4 max-w-[240px] mx-auto leading-relaxed">{phase.description}</p>
                {phase.durationEstimate && (
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider bg-gray-50 px-3 py-1.5 rounded-full">
                    <Clock size={12} />
                    {phase.durationEstimate}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Mobile Container - Vertical Stack with Connected Line */}
        <div className="md:hidden">
           {phases.map((phase, idx) => (
             <div key={phase.id} className="flex gap-4 relative">
                {/* Connecting Line */}
                {idx !== phases.length - 1 && (
                    <div className="absolute left-5 top-10 bottom-0 w-0.5 bg-blue-100 -ml-[1px]" aria-hidden="true" />
                )}
                
                {/* Number Circle */}
                <div className="relative z-10 w-10 h-10 rounded-full bg-blue-600 text-white font-bold text-lg flex items-center justify-center shrink-0 shadow-lg shadow-blue-200 ring-4 ring-white">
                  {idx + 1}
                </div>

                {/* Content */}
                <div className="flex-1 pb-10">
                   <h3 className="text-lg font-bold text-gray-900 mb-1 leading-tight">{phase.title}</h3>
                   <p className="text-sm text-gray-600 leading-relaxed mb-3">{phase.description}</p>
                   {phase.durationEstimate && (
                      <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 bg-gray-50 px-2.5 py-1 rounded-md border border-gray-100">
                        <Clock size={12} />
                        {phase.durationEstimate}
                      </div>
                   )}
                </div>
             </div>
           ))}
        </div>

      </div>
    </section>
  );
};