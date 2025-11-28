
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
    if (!urgency) {
      // Check if inside a quadrant/arch that is highlighted
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

    return (
      <div className="relative pt-6 pb-2">
         {/* Arch Bar */}
         {archUrgency && (
           <div className={`absolute top-0 left-4 right-4 h-2 rounded-full ${getUrgencyColor(archUrgency)} opacity-50`}></div>
         )}

         <div className="flex gap-2 justify-center">
            {/* Left Quadrant Container */}
            <div className={`flex gap-1 p-2 rounded-xl transition-colors ${qLeftUrgency ? getUrgencyColor(qLeftUrgency) + ' bg-opacity-10 border-dashed border-2' : ''}`}>
               {teeth.slice(0, 8).map(t => (
                  <Tooth key={t} num={t} className={getToothStyle(t)} />
               ))}
            </div>

            {/* Right Quadrant Container */}
             <div className={`flex gap-1 p-2 rounded-xl transition-colors ${qRightUrgency ? getUrgencyColor(qRightUrgency) + ' bg-opacity-10 border-dashed border-2' : ''}`}>
               {teeth.slice(8, 16).map(t => (
                  <Tooth key={t} num={t} className={getToothStyle(t)} />
               ))}
            </div>
         </div>
      </div>
    );
  };

  return (
    <section className="py-12 px-6 bg-white border-b border-gray-100">
      <div className="max-w-5xl mx-auto">
        <div className="bg-white rounded-3xl shadow-sm border border-gray-200 p-6 md:p-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Your Teeth & Treatment Areas</h2>
              <p className="text-gray-500 mt-1">
                Visual overview of teeth, quadrants, and arches needing attention.
              </p>
            </div>
            
            {/* Legend */}
            <div className="flex gap-6 text-sm font-medium">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-md bg-red-500"></span> Urgent
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-md bg-orange-400"></span> Soon
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-md bg-blue-500"></span> Elective
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-6 overflow-x-auto pb-4">
            <div className="min-w-[700px] flex flex-col gap-2 mx-auto">
                <div className="text-center text-xs text-gray-400 uppercase tracking-widest font-semibold">Upper Teeth</div>
                {renderRow(TEETH_UPPER, 'UPPER')}
                
                <div className="h-px bg-gray-100 w-full my-4 relative"></div>
                
                {renderRow(TEETH_LOWER, 'LOWER')}
                <div className="text-center text-xs text-gray-400 uppercase tracking-widest font-semibold">Lower Teeth</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

const Tooth = ({ num, className }: { num: number, className: string }) => (
  <div className="flex flex-col items-center gap-1 group relative">
    <div 
      className={`
        w-8 h-10 md:w-10 md:h-14 rounded-lg border flex items-center justify-center 
        text-xs md:text-sm transition-all duration-300
        ${className}
      `}
    >
      {num}
    </div>
  </div>
);
