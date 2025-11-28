
import React from 'react';
import { TreatmentPlanItem } from '../../types';
import { Calendar, Clock, AlertTriangle, Smile, Shield } from 'lucide-react';
import { estimateVisits } from '../../services/clinicalLogic';

interface ProcedureBreakdownSectionProps {
  items: TreatmentPlanItem[];
  phases?: { id: string; title: string }[];
}

export const ProcedureBreakdownSection: React.FC<ProcedureBreakdownSectionProps> = ({ items, phases }) => {
  
  // Robust grouping logic
  const getItemsForPhase = (phaseTitle: string) => {
    // Simple heuristic for demo purposes: 
    // If phases are passed, we assume the layout computed them based on category.
    // We try to match that logic again here or use a simpler fallback.
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
    // Phase mode
    displayGroups = phases.map(p => ({ 
       title: p.title, 
       items: getItemsForPhase(p.title) 
    })).filter(g => g.items.length > 0);
    
    // Catch-all for items that missed mapping
    const mappedIds = new Set(displayGroups.flatMap(g => g.items.map(i => i.id)));
    const unmapped = items.filter(i => !mappedIds.has(i.id));
    if (unmapped.length > 0) {
       displayGroups.push({ title: 'Other Procedures', items: unmapped });
    }
  } else {
    // Flat mode (no phases)
    displayGroups = [{ title: 'All Procedures', items: items }];
  }

  const renderLocation = (item: TreatmentPlanItem) => {
    if (item.selectedTeeth && item.selectedTeeth.length > 0) return `Teeth: ${item.selectedTeeth.join(', ')}`;
    if (item.selectedQuadrants && item.selectedQuadrants.length > 0) return `Quadrants: ${item.selectedQuadrants.join(', ')}`;
    if (item.selectedArches && item.selectedArches.length > 0) return `Arch: ${item.selectedArches.join(', ')}`;
    return 'General / Full Mouth';
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
       case 'URGENT': return 'bg-red-100 text-red-700 border-red-200';
       case 'SOON': return 'bg-orange-100 text-orange-700 border-orange-200';
       default: return 'bg-blue-100 text-blue-700 border-blue-200';
     }
  };

  return (
    <section className="py-16 px-6 bg-gray-50 border-b border-gray-200">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">What We'll Do</h2>
        <p className="text-gray-500 mb-10">Your personalized treatment plan, organized by priority.</p>
        
        <div className="space-y-10">
          {displayGroups.map((group, idx) => (
             group.items.length > 0 && (
              <div key={idx}>
                {/* Phase Header */}
                <div className="flex items-center gap-4 mb-6">
                    <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-sm">
                        {idx + 1}
                    </div>
                    <h3 className="font-bold text-xl text-gray-900">{group.title}</h3>
                </div>

                {/* Cards */}
                <div className="grid gap-4">
                  {group.items.map(item => (
                    <div key={item.id} className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className="mt-1 p-2 bg-blue-50 text-blue-600 rounded-lg">
                           {/* Simple Icon placeholder */}
                           <div className="w-6 h-6 flex items-center justify-center font-bold text-xs">{item.procedureCode.slice(0,3)}</div>
                        </div>
                        <div>
                           <div className="flex items-center gap-2">
                             <div className="font-bold text-gray-900 text-lg">{item.procedureName}</div>
                             <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getUrgencyClass(item.urgency)}`}>
                               {getUrgencyIcon(item.urgency)}
                               {item.urgency || 'Elective'}
                             </span>
                           </div>
                           <div className="text-sm text-gray-500 mt-1 font-medium">
                             {renderLocation(item)}
                           </div>
                           <div className="flex gap-4 mt-3 text-xs text-gray-400 font-medium uppercase tracking-wide">
                              <span className="flex items-center gap-1"><Calendar size={12}/> {estimateVisits(item)} visit(s)</span>
                           </div>
                        </div>
                      </div>
                      
                      <div className="md:text-right pl-14 md:pl-0">
                         <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">{item.category}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
             )
          ))}
        </div>
      </div>
    </section>
  );
};
