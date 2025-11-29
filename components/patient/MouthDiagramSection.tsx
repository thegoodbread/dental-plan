import React from 'react';
import { TEETH_UPPER, TEETH_LOWER, DiagramData, mapPlanToDiagram } from '../../services/clinicalLogic';
import { TreatmentPlanItem } from '../../types';

interface MouthDiagramSectionProps {
  items: TreatmentPlanItem[];
}

export const MouthDiagramSection: React.FC<MouthDiagramSectionProps> = ({ items }) => {
  const data: DiagramData = mapPlanToDiagram(items);

  const getUrgencyColor = (u?: string) => {
    switch (u) {
      case 'URGENT': return 'bg-red-500 border-red-600';
      case 'SOON': return 'bg-orange-400 border-orange-500';
      case 'ELECTIVE': return 'bg-blue-500 border-blue-600';
      default: return 'bg-gray-100 border-gray-200';
    }
  };

  const getToothStyle = (tooth: number) => {
    const urgency = data.urgencyMap[tooth];
    
    // If no specific per-tooth urgency is mapped, return neutral style
    if (!urgency) {
      return "bg-white border-gray-200 text-gray-300";
    }
    
    switch (urgency) {
      case 'URGENT': return "bg-red-500 border-red-600 text-white shadow-lg shadow-red-200 scale-110 z-10 font-bold";
      case 'SOON': return "bg-orange-400 border-orange-500 text-white shadow-md shadow-orange-100 font-bold";
      case 'ELECTIVE': return "bg-blue-500 border-blue-600 text-white shadow-md shadow-blue-100 font-bold";
      default: return "bg-gray-400 border-gray-500 text-white";
    }
  };

  const renderRow = (teeth: number[], arch: 'UPPER'|'LOWER') => {
    const archUrgency = data.archUrgency[arch];
    const quadLeft = arch === 'UPPER' ? 'UR' : 'LR'; // Viewers left is patient right
    const quadRight = arch === 'UPPER' ? 'UL' : 'LL'; // Viewers right is patient left

    const qLeftUrgency = data.quadrantUrgency[quadLeft];
    const qRightUrgency = data.quadrantUrgency[quadRight];

    const isUpper = arch === 'UPPER';

    return (
      <div className={`relative w-full ${isUpper ? 'pt-4 md:pt-6 pb-2' : 'pt-2 pb-4 md:pb-6'}`}>
         {/* Arch Bar */}
         {archUrgency && (
           <div className={`absolute ${isUpper ? 'top-0' : 'bottom-0'} left-4 right-4 h-1.5 md:h-2 rounded-full ${getUrgencyColor(archUrgency)} opacity-50`}></div>
         )}

         <div className="flex gap-0.5 md:gap-2 justify-center w-full">
            {/* Left Quadrant Container */}
            <div className={`flex gap-0.5 md:gap-1 p-0.5 md:p-2 rounded-xl transition-colors ${qLeftUrgency ? getUrgencyColor(qLeftUrgency) + ' bg-opacity-10 border-dashed border-2' : ''}`}>
               {teeth.slice(0, 8).map(t => (
                  <Tooth key={t} num={t} className={getToothStyle(t)} />
               ))}
            </div>

            {/* Right Quadrant Container */}
             <div className={`flex gap-0.5 md:gap-1 p-0.5 md:p-2 rounded-xl transition-colors ${qRightUrgency ? getUrgencyColor(qRightUrgency) + ' bg-opacity-10 border-dashed border-2' : ''}`}>
               {teeth.slice(8, 16).map(t => (
                  <Tooth key={t} num={t} className={getToothStyle(t)} />
               ))}
            </div>
         </div>
      </div>
    );
  };

  return (
    <section className="py-6 md:py-12 px-2 md:px-6 bg-white border-b border-gray-100">
      <div className="max-w-5xl mx-auto">
        <div className="bg-white rounded-3xl shadow-sm border border-gray-200 p-4 md:p-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-6 md:mb-8 gap-4 md:gap-6">
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-gray-900">Your Teeth & Treatment Areas</h2>
              <p className="text-sm md:text-base text-gray-500 mt-1">
                Visual overview of teeth, quadrants, and arches needing attention.
              </p>
            </div>
            
            {/* Legend - Compact for mobile */}
            <div className="flex flex-wrap gap-2 md:gap-6 text-[10px] md:text-sm font-medium bg-gray-50 p-2 md:p-0 rounded-lg md:bg-transparent">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-md bg-red-500 shadow-sm shadow-red-200"></span> Urgent
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-md bg-orange-400 shadow-sm shadow-orange-100"></span> Soon
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-md bg-blue-500 shadow-sm shadow-blue-100"></span> Elective
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-1 items-center overflow-hidden">
             <div className="text-center text-[10px] md:text-xs text-gray-400 uppercase tracking-widest font-semibold">Upper Teeth</div>
             {renderRow(TEETH_UPPER, 'UPPER')}
             
             <div className="h-px bg-gray-100 w-full max-w-2xl my-2 md:my-4 relative"></div>
             
             {renderRow(TEETH_LOWER, 'LOWER')}
             <div className="text-center text-[10px] md:text-xs text-gray-400 uppercase tracking-widest font-semibold">Lower Teeth</div>
          </div>
          
        </div>
      </div>
    </section>
  );
};

const Tooth = ({ num, className }: { num: number, className: string }) => (
  <div className="flex flex-col items-center gap-0.5 group relative shrink-0">
    <div 
      className={`
        w-[18px] h-[26px] text-[8px] rounded-[3px]
        sm:w-6 sm:h-9 sm:text-[10px] sm:rounded-md
        md:w-10 md:h-14 md:text-sm md:rounded-lg
        border flex items-center justify-center 
        transition-all duration-300
        ${className}
      `}
    >
      {num}
    </div>
  </div>
);