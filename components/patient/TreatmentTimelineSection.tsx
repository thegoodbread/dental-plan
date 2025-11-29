
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
  // Logic: In a grid of N columns, each column is 100/N % wide.
  // The center of a column is half that width: (100/N)/2.
  const centerOffset = (100 / count) / 2; 

  return (
    <section className="py-16 px-6 bg-white border-b border-gray-100">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Treatment Timeline</h2>
        <p className="text-gray-500 mb-12">How your treatment will progress over time</p>
        
        {/* Container: Constrain width based on count so 2 items aren't too wide apart */}
        <div 
            className="relative mx-auto"
            style={{ maxWidth: `${Math.min(100, count * 25)}rem` }} // roughly 400px per item max
        >
          {/* Connecting Line (Desktop) - Only if > 1 phase */}
          {count > 1 && (
            <div 
              className="hidden md:block absolute top-8 h-0.5 bg-blue-100 -z-0"
              style={{ 
                  left: `${centerOffset}%`, 
                  right: `${centerOffset}%` 
              }}
            ></div>
          )}

          {/* Grid Layout */}
          <div 
            className="grid grid-cols-1 md:grid-flow-col gap-10 md:gap-0"
            style={{ 
                // Mobile: 1 col. Desktop: N cols equal width
                gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))` 
            }}
          >
            {phases.map((phase, idx) => (
              <div 
                key={phase.id} 
                className="relative z-10 flex flex-col items-center text-center group md:col-span-1"
              >
                {/* Marker */}
                <div className="w-16 h-16 rounded-full bg-blue-600 text-white font-bold text-2xl flex items-center justify-center mb-6 shadow-lg shadow-blue-200 border-4 border-white transition-transform group-hover:scale-110">
                  {idx + 1}
                </div>
                
                {/* Content */}
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
      </div>
    </section>
  );
};
