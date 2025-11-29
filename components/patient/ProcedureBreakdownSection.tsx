
import React from 'react';
import { TreatmentPlanItem } from '../../types';
import { Calendar, AlertTriangle, Shield, Smile, CheckCircle2 } from 'lucide-react';
import { estimateVisits } from '../../services/clinicalLogic';
import { getProcedureIcon } from '../../utils/getProcedureIcon';

interface ProcedureBreakdownSectionProps {
  items: TreatmentPlanItem[];
  phases?: { id: string; title: string }[];
}

export const ProcedureBreakdownSection: React.FC<ProcedureBreakdownSectionProps> = ({ items, phases }) => {
  
  // Grouping logic
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
    if (item.selectedQuadrants && item.selectedQuadrants.length > 0) return `Quadrants: ${item.selectedQuadrants.join(', ')}`;
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
    <section className="py-16 px-6 bg-gray-50 border-b border-gray-200">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">What We'll Do</h2>
        <p className="text-gray-500 mb-10">Your personalized treatment plan, organized by priority.</p>
        
        <div className="space-y-12">
          {displayGroups.map((group, idx) => (
             group.items.length > 0 && (
              <div key={idx} className="relative">
                {/* Phase Header */}
                <div className="flex items-center gap-4 mb-6 sticky top-0 bg-gray-50 z-10 py-2">
                    <div className="w-8 h-8 rounded-full bg-gray-900 text-white font-bold flex items-center justify-center text-sm shadow-sm">
                        {idx + 1}
                    </div>
                    <h3 className="font-bold text-xl text-gray-900">{group.title}</h3>
                </div>

                {/* Cards */}
                <div className="grid gap-4">
                  {group.items.map(item => {
                    const ProcedureIcon = getProcedureIcon(item);
                    
                    return (
                      <div key={item.id} className="bg-white p-5 rounded-xl border border-gray-200 shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-md transition-shadow flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-start gap-5">
                          {/* SVG Icon */}
                          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
                             <ProcedureIcon width={24} height={24} />
                          </div>

                          <div>
                             <div className="flex items-center gap-2 flex-wrap">
                               <div className="font-bold text-gray-900 text-base">{item.procedureName}</div>
                             </div>
                             
                             <div className="text-sm text-gray-500 mt-1 font-medium flex items-center gap-3">
                               <span>{renderLocation(item)}</span>
                               <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                               <span className="flex items-center gap-1 text-gray-400">
                                 <Calendar size={12} /> {estimateVisits(item)} visit(s)
                               </span>
                             </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3 sm:text-right pl-[4.25rem] sm:pl-0">
                           <div className="text-xs font-bold text-gray-400 uppercase tracking-widest hidden sm:block">{item.category}</div>
                           <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getUrgencyClass(item.urgency)}`}>
                             {getUrgencyIcon(item.urgency)}
                             {item.urgency || 'Elective'}
                           </span>
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
