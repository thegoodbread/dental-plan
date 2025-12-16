
import React, { useState } from 'react';
import { TEETH_UPPER, TEETH_LOWER, DiagramData, mapPlanToDiagram, getItemsOnTooth, getToothQuadrant, getItemsOnArch, getItemsOnQuadrant } from '../../services/clinicalLogic';
import { TreatmentPlanItem } from '../../types';

interface MouthDiagramSectionProps {
  items: TreatmentPlanItem[];
  hoveredTooth: number | null;
  hoveredQuadrant: string | null;
  hoveredItemId: string | null;
  onHoverTooth: (tooth: number | null) => void;
  onHoverQuadrant: (quad: string | null) => void;
}

export const MouthDiagramSection: React.FC<MouthDiagramSectionProps> = ({ 
  items, 
  hoveredTooth, 
  hoveredQuadrant, 
  hoveredItemId,
  onHoverTooth, 
  onHoverQuadrant 
}) => {
  const data: DiagramData = mapPlanToDiagram(items);
  const [localHoveredArch, setLocalHoveredArch] = useState<'UPPER' | 'LOWER' | null>(null);

  const handleToothMouseEnter = (tooth: number) => {
    const hasSpecificItems = items.some(i => i.unitType === 'PER_TOOTH' && i.selectedTeeth?.includes(tooth));
    
    if (hasSpecificItems) {
        onHoverTooth(tooth);
        onHoverQuadrant(null);
    } else {
        const quad = getToothQuadrant(tooth);
        if (quad && data.quadrantUrgency[quad]) {
            onHoverQuadrant(quad);
            onHoverTooth(null);
        } else {
            onHoverQuadrant(null);
            onHoverTooth(null);
        }
    }
  };

  const isToothInHoveredItem = (tooth: number) => {
    if (!hoveredItemId) return false;
    const item = items.find(i => i.id === hoveredItemId);
    if (!item) return false;

    if (item.unitType === 'PER_TOOTH' && item.selectedTeeth?.includes(tooth)) return true;
    if (item.unitType === 'PER_QUADRANT' && item.selectedQuadrants?.includes(getToothQuadrant(tooth) as any)) return true;
    if (item.unitType === 'PER_ARCH') {
        const arch = tooth <= 16 ? 'UPPER' : 'LOWER';
        if (item.selectedArches?.includes(arch)) return true;
    }
    if (item.unitType === 'PER_MOUTH') return true;
    return false;
  };

  const getToothStyle = (tooth: number) => {
    const urgency = data.urgencyMap[tooth];
    const isHovered = hoveredTooth === tooth;
    const isReverseHovered = isToothInHoveredItem(tooth);
    const toothQuad = getToothQuadrant(tooth);
    const isInHoveredQuad = hoveredQuadrant === toothQuad;
    
    let baseClass = "bg-white border-gray-300 text-gray-500";
    if (urgency === 'URGENT') baseClass = "bg-red-500 border-red-600 text-white font-bold";
    else if (urgency === 'SOON') baseClass = "bg-orange-400 border-orange-500 text-white font-bold";
    else if (urgency === 'ELECTIVE') baseClass = "bg-blue-500 border-blue-600 text-white font-bold";
    else if (!urgency && isInHoveredQuad && !hoveredTooth) {
         baseClass = "bg-white border-blue-200 text-gray-400";
    }

    if (isHovered) {
       return `${baseClass} scale-110 z-30 shadow-xl ring-4 ring-blue-200/50 border-transparent`;
    }

    if (isReverseHovered) {
       return `${baseClass} scale-105 z-20 shadow-lg ring-2 ring-blue-200/50`;
    }

    if (urgency || (toothQuad && data.quadrantUrgency[toothQuad])) {
        return `${baseClass} hover:border-gray-300`;
    }

    return baseClass;
  };

  const getQuadrantStyle = (quad: string) => {
     if (!hoveredTooth && hoveredQuadrant === quad) {
        const urgency = data.quadrantUrgency[quad];
        switch(urgency) {
            case 'URGENT': return "bg-red-50 border-red-500 border-dashed shadow-inner";
            case 'SOON': return "bg-orange-50 border-orange-400 border-dashed shadow-inner";
            case 'ELECTIVE': return "bg-blue-50 border-blue-500 border-dashed shadow-inner";
            default: return "bg-gray-50 border-gray-300 border-dashed shadow-inner";
        }
     }
     
     if (hoveredItemId) {
        const item = items.find(i => i.id === hoveredItemId);
        if (item && item.unitType === 'PER_QUADRANT' && item.selectedQuadrants?.includes(quad as any)) {
            return "bg-blue-50 border-blue-400 border-dashed";
        }
     }

     const urgency = data.quadrantUrgency[quad];
     if (urgency) {
         switch(urgency) {
             case 'URGENT': return "bg-red-50 border-red-300 border-dashed shadow-sm";
             case 'SOON': return "bg-orange-50 border-orange-300 border-dashed shadow-sm";
             case 'ELECTIVE': return "bg-blue-50 border-blue-300 border-dashed shadow-sm";
         }
     }
     
     return "border-transparent";
  };

  const renderRow = (teeth: number[], arch: 'UPPER'|'LOWER') => {
    const archUrgency = data.archUrgency[arch];
    const quadLeft = arch === 'UPPER' ? 'UR' : 'LR';
    const quadRight = arch === 'UPPER' ? 'UL' : 'LL';
    const isUpper = arch === 'UPPER';

    return (
      <div className={`relative w-full md:max-w-3xl md:mx-auto ${isUpper ? 'pt-8 pb-1 md:pt-12 md:pb-2' : 'pt-1 pb-8 md:pt-2 md:pb-12'}`}>
         {archUrgency && (
           <div 
             className={`absolute ${isUpper ? 'top-0' : 'bottom-0'} left-4 right-4 h-5 md:h-6 group cursor-pointer z-10 flex items-center justify-center`}
             onMouseEnter={() => setLocalHoveredArch(arch)}
             onMouseLeave={() => setLocalHoveredArch(null)}
           >
              <div className="absolute inset-x-0 -inset-y-2"></div>
              <div className={`
                 w-full rounded-full transition-all duration-200 relative
                 ${localHoveredArch === arch ? 'h-2.5 md:h-3 opacity-100 shadow-md' : 'h-1.5 md:h-2 opacity-80'}
                 ${archUrgency === 'URGENT' ? 'bg-red-500' : archUrgency === 'SOON' ? 'bg-orange-400' : 'bg-blue-500'}
              `}>
                  {localHoveredArch === arch && (
                     <div className="absolute left-1/2 -translate-x-1/2 z-40 pointer-events-none animate-in zoom-in-95 duration-150 bottom-full mb-3">
                       <TooltipContent items={getItemsOnArch(arch, items)} allItems={items} title={`${arch} ARCH`} />
                     </div>
                  )}
              </div>
           </div>
         )}

         <div className="flex gap-2 md:gap-4 justify-center w-full">
            <div 
                className={`relative flex-1 flex gap-px md:gap-1 p-1 sm:p-1.5 md:p-2 rounded-xl border-2 transition-all duration-200 ${getQuadrantStyle(quadLeft)}`}
                onMouseEnter={() => { if (data.quadrantUrgency[quadLeft]) onHoverQuadrant(quadLeft); }}
                onMouseLeave={() => onHoverQuadrant(null)}
            >
               {hoveredQuadrant === quadLeft && !hoveredTooth && (
                 <div className="absolute left-1/2 -translate-x-1/2 z-40 pointer-events-none animate-in zoom-in-95 duration-150 -top-10 sm:-top-12 md:-top-16">
                   <TooltipContent items={getItemsOnQuadrant(quadLeft, items)} allItems={items} title={`${quadLeft} QUADRANT`} />
                 </div>
               )}
               {teeth.slice(0, 8).map(t => (
                  <Tooth 
                    key={t} 
                    num={t} 
                    className={getToothStyle(t)} 
                    onEnter={() => handleToothMouseEnter(t)} 
                    onLeave={() => onHoverTooth(null)}
                  >
                     {hoveredTooth === t && (
                        <div className="absolute left-1/2 -translate-x-1/2 z-50 pointer-events-none animate-in zoom-in-95 duration-150 bottom-full mb-2">
                           <TooltipContent items={getItemsOnTooth(t, items)} allItems={items} title={`Tooth #${t}`} />
                        </div>
                     )}
                  </Tooth>
               ))}
            </div>

             <div 
                className={`relative flex-1 flex gap-px md:gap-1 p-1 sm:p-1.5 md:p-2 rounded-xl border-2 transition-all duration-200 ${getQuadrantStyle(quadRight)}`}
                onMouseEnter={() => { if (data.quadrantUrgency[quadRight]) onHoverQuadrant(quadRight); }}
                onMouseLeave={() => onHoverQuadrant(null)}
             >
               {hoveredQuadrant === quadRight && !hoveredTooth && (
                 <div className="absolute left-1/2 -translate-x-1/2 z-40 pointer-events-none animate-in zoom-in-95 duration-150 -top-10 sm:-top-12 md:-top-16">
                   <TooltipContent items={getItemsOnQuadrant(quadRight, items)} allItems={items} title={`${quadRight} QUADRANT`} />
                 </div>
               )}
               {teeth.slice(8, 16).map(t => (
                  <Tooth 
                    key={t} 
                    num={t} 
                    className={getToothStyle(t)} 
                    onEnter={() => handleToothMouseEnter(t)} 
                    onLeave={() => onHoverTooth(null)}
                  >
                     {hoveredTooth === t && (
                        <div className="absolute left-1/2 -translate-x-1/2 z-50 pointer-events-none animate-in zoom-in-95 duration-150 bottom-full mb-2">
                           <TooltipContent items={getItemsOnTooth(t, items)} allItems={items} title={`Tooth #${t}`} />
                        </div>
                     )}
                  </Tooth>
               ))}
            </div>
         </div>
      </div>
    );
  };

  return (
    <section className="pt-4 pb-6 md:pt-8 md:pb-12 px-2 md:px-6 bg-white border-b border-gray-100 relative z-10">
      <div className="max-w-5xl mx-auto">
        <div className="bg-white rounded-2xl md:rounded-3xl shadow-sm border border-gray-200 p-2 sm:p-4 md:p-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-6 md:mb-8 gap-4 md:gap-6">
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-gray-900">Your Teeth & Treatment Areas</h2>
              <p className="text-sm md:text-base text-gray-500 mt-1">Hover over teeth or areas to see planned procedures.</p>
            </div>
            <div className="flex flex-wrap gap-4 text-xs md:text-sm font-medium bg-gray-50 p-3 rounded-lg md:bg-transparent md:p-0">
              <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-md bg-red-500 shadow-sm shadow-red-200"></span> Urgent</div>
              <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-md bg-orange-400 shadow-sm shadow-orange-100"></span> Soon</div>
              <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-md bg-blue-500 shadow-sm shadow-blue-100"></span> Elective</div>
            </div>
          </div>
          <div className="flex flex-col gap-1 items-center overflow-visible">
             <div className="text-center text-[10px] md:text-xs text-gray-500 uppercase tracking-widest font-semibold">Upper Teeth</div>
             {renderRow(TEETH_UPPER, 'UPPER')}
             <div className="h-px bg-gray-100 w-full max-w-2xl my-1 sm:my-2 md:my-4 relative"></div>
             {renderRow(TEETH_LOWER, 'LOWER')}
             <div className="text-center text-[10px] md:text-xs text-gray-500 uppercase tracking-widest font-semibold">Lower Teeth</div>
          </div>
        </div>
      </div>
    </section>
  );
};

interface ToothProps { num: number; className: string; onEnter: () => void; onLeave: () => void; children?: React.ReactNode; }
const Tooth: React.FC<ToothProps> = ({ num, className, onEnter, onLeave, children }) => (
  <div className="flex-1 flex flex-col items-center gap-0.5 group relative" onMouseEnter={(e) => { e.stopPropagation(); onEnter(); }} onMouseLeave={onLeave}>
    <div className={`w-full max-w-[40px] md:max-w-[50px] h-8 text-[9px] rounded-[2px] sm:h-10 sm:text-[10px] sm:rounded-md md:h-14 md:text-sm md:rounded-lg border flex items-center justify-center transition-all duration-200 cursor-default relative ${className}`}>
      {num}
    </div>
    {children}
  </div>
);

const TooltipContent = ({ items, allItems, title }: { items: TreatmentPlanItem[], allItems: TreatmentPlanItem[], title?: string }) => (
     <div className="w-48 sm:w-64">
         <div className="bg-gray-900 text-white text-xs rounded-lg shadow-xl p-3 relative">
             {title && <div className="font-bold text-gray-300 border-b border-gray-700 pb-1 mb-2 uppercase tracking-wider">{title}</div>}
             {items.length === 0 ? <div className="text-gray-400 italic">No specific procedures</div> : (
                 <ul className="space-y-2">
                     {items.map(i => {
                         const linkedSedation = allItems.find(s => s.itemType === 'ADDON' && s.addOnKind === 'SEDATION' && s.linkedItemIds?.includes(i.id));
                         return (
                             <li key={i.id} className="flex flex-col gap-0.5">
                                 <div className="flex justify-between gap-2"><span>{i.procedureName}</span>{i.urgency === 'URGENT' && <span className="text-red-400 font-bold">!</span>}</div>
                                 {linkedSedation && <div className="text-[10px] text-purple-300 flex items-center gap-1 pl-2 border-l-2 border-purple-400/30">+ {linkedSedation.procedureName.replace('Sedation – ', '')} Sedation</div>}
                             </li>
                         );
                     })}
                 </ul>
             )}
             <div className="w-3 h-3 bg-gray-900 rotate-45 absolute left-1/2 -translate-x-1/2 -bottom-1.5"></div>
         </div>
     </div>
);
