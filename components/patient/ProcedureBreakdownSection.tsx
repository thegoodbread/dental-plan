
import React from 'react';
import { TreatmentPlanItem } from '../../types';
import { Calendar, AlertTriangle, Shield, Smile, CheckCircle2 } from 'lucide-react';
import { estimateVisits, getItemsOnTooth, getItemsOnQuadrant } from '../../services/clinicalLogic';
import { getProcedureIcon } from '../../utils/getProcedureIcon';

interface ProcedureBreakdownSectionProps {
  items: TreatmentPlanItem[];
  phases?: { id: string; title: string }[];
  hoveredTooth: number | null;
  hoveredQuadrant: string | null;
  hoveredItemId: string | null;
  onHoverItem: (id: string | null) => void;
}

export const ProcedureBreakdownSection: React.FC<ProcedureBreakdownSectionProps> = ({ 
  items, 
  phases,
  hoveredTooth,
  hoveredQuadrant,
  hoveredItemId,
  onHoverItem
}) => {
  
  // --- VISUAL LOGIC ---
  const isHighlighted = (item: TreatmentPlanItem) => {
    // 1. Tooth Hover
    if (hoveredTooth) {
        const relevantItems = getItemsOnTooth(hoveredTooth, items);
        return relevantItems.some(r => r.id === item.id);
    }
    // 2. Quadrant Hover
    if (hoveredQuadrant) {
        const relevantItems = getItemsOnQuadrant(hoveredQuadrant, items);
        return relevantItems.some(r => r.id === item.id);
    }
    // 3. Item Hover (Self)
    if (hoveredItemId) {
        return hoveredItemId === item.id;
    }
    return false;
  };

  // Dimming is disabled per user request for a cleaner UI
  const isDimmed = (item: TreatmentPlanItem) => false;


  // --- GROUPING LOGIC ---
  const getItemsForPhase = (phaseTitle: string) => {
    if (phaseTitle.includes('Hygiene') || phaseTitle.includes('Foundation')) 
        return items.filter(i => i.category === 'PERIO' || i.category === 'OTHER');
    if (phaseTitle.includes('Restorative')) 
        return items.filter(i => i.category === 'RESTORATIVE');
    if (phaseTitle.includes('Replacement')) 
        return items.filter(i => i.category === 'IMPLANT');
    
    return items.filter(i => !['PERIO','OTHER','RESTORATIVE','IMPLANT'].includes(i.category));
  };

  let displayGroups = [];
  
  if (phases && phases.length > 0) {
    displayGroups = phases.map(p => ({ 
       title: p.title, 
       items: getItemsForPhase(p.title) 
    })).filter(g => g.items.length > 0);
    
    const mappedIds = new Set(displayGroups.flatMap(g => g.items.map(i => i.id)));
    const unmapped = items.filter(i => !mappedIds.has(i.id));
    if (unmapped.length > 0) {
       displayGroups.push({ title: 'Other Procedures', items: unmapped });
    }
  } else {
    displayGroups = [{ title: 'All Procedures', items: items }];
  }

  const renderLocation = (item: TreatmentPlanItem) => {
    if (item.selectedTeeth && item.selectedTeeth.length > 0) return `Teeth: ${item.selectedTeeth.join(', ')}`;
    if (item.selectedQuadrants && item.selectedQuadrants.length > 0) return `Quads: ${item.selectedQuadrants.join(', ')}`;
    if (item.selectedArches && item.selectedArches.length > 0) return `Arch: ${item.selectedArches.join(', ')}`;
    return 'Full Mouth';
  };

  const getUrgencyIcon = (u?: string) => {
     switch (u) {
       case 'URGENT': return <AlertTriangle size={12} />;
       case 'SOON': return <Shield size={12} />;
       default: return <Smile size={12} />;
     }
  };

  const getUrgencyClass = (u?: string) => {
     switch (u) {
       case 'URGENT': return 'bg-red-50 text-red-700 border-red-200';
       case 'SOON': return 'bg-orange-50 text-orange-700 border-orange-200';
       default: return 'bg-blue-50 text-blue-700 border-blue-200';
     }
  };

  return (
    <section className="py-12 md:py-16 px-4 md:px-6 bg-gray-50 border-b border-gray-200">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">What We'll Do</h2>
        <p className="text-gray-500 mb-8 md:mb-10">Your personalized treatment plan, organized by priority.</p>
        
        <div className="space-y-8 md:space-y-12">
          {displayGroups.map((group, idx) => (
             group.items.length > 0 && (
              <div key={idx} className="relative">
                {/* Phase Header */}
                <div className="flex items-center gap-4 mb-4 md:mb-6 sticky top-0 bg-gray-50 z-10 py-2">
                    <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-sm shadow-md shadow-blue-200">
                        {idx + 1}
                    </div>
                    <h3 className="font-bold text-xl text-gray-900">{group.title}</h3>
                </div>

                {/* Cards */}
                <div className="grid gap-3 md:gap-4">
                  {group.items.map(item => {
                    const ProcedureIcon = getProcedureIcon(item);
                    const highlighted = isHighlighted(item);
                    const dimmed = isDimmed(item);
                    
                    return (
                      <div 
                        key={item.id} 
                        className={`
                            bg-white p-4 md:p-5 rounded-xl border transition-all duration-300
                            ${highlighted 
                                ? 'border-blue-500 shadow-lg scale-[1.02] ring-2 ring-blue-200/50' 
                                : dimmed // This case is now disabled
                                    ? 'border-gray-100 opacity-40 grayscale'
                                    : 'border-gray-200 shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-md hover:border-gray-300'
                            }
                        `}
                        onMouseEnter={() => onHoverItem(item.id)}
                        onMouseLeave={() => onHoverItem(null)}
                      >
                        <div className="flex items-start gap-4">
                          {/* SVG Icon */}
                          <div className={`
                             w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center shrink-0 border mt-1
                             ${highlighted 
                                ? 'bg-blue-100 text-blue-700 border-blue-200' 
                                : 'bg-blue-50 text-blue-600 border-blue-100'
                             }
                          `}>
                             <ProcedureIcon width={20} height={20} className="md:w-6 md:h-6" />
                          </div>

                          <div className="flex-1 min-w-0">
                             <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                               <div className="font-bold text-gray-900 text-base leading-tight">{item.procedureName}</div>
                               
                               <div className="flex items-center gap-2 mt-1 md:mt-0">
                                   <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{item.category}</div>
                                   <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getUrgencyClass(item.urgency)}`}>
                                     {getUrgencyIcon(item.urgency)}
                                     {item.urgency || 'Elective'}
                                   </span>
                               </div>
                             </div>
                             
                             <div className="text-sm text-gray-500 mt-2 font-medium flex flex-wrap items-center gap-3">
                               <span className="bg-gray-100 px-2 py-0.5 rounded text-xs text-gray-600">{renderLocation(item)}</span>
                               <span className="flex items-center gap-1 text-gray-400 text-xs">
                                 <Calendar size={12} /> {estimateVisits(item)} visit(s)
                               </span>
                             </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
             )
          ))}
        </div>
      </div>
    </section>
  );
};
