

import React, { useState } from 'react';
import { TreatmentPlan, TreatmentPlanItem } from '../../types';
import { Calendar, AlertTriangle, Shield, Smile, ChevronDown } from 'lucide-react';
import { estimateVisits, getItemsOnTooth, getItemsOnQuadrant } from '../../services/clinicalLogic';
import { getProcedureIcon } from '../../utils/getProcedureIcon';

interface ProcedureBreakdownSectionProps {
  plan: TreatmentPlan;
  items: TreatmentPlanItem[];
  phases?: { id: string; title: string }[];
  hoveredTooth: number | null;
  hoveredQuadrant: string | null;
  hoveredItemId: string | null;
  onHoverItem: (id: string | null) => void;
}

const PhaseGroup: React.FC<{
    phaseIndex: number;
    group: { title: string; items: TreatmentPlanItem[] };
    plan: TreatmentPlan;
    allItems: TreatmentPlanItem[];
    hoveredTooth: number | null;
    hoveredQuadrant: string | null;
    hoveredItemId: string | null;
    onHoverItem: (id: string | null) => void;
}> = ({ phaseIndex, group, plan, allItems, hoveredTooth, hoveredQuadrant, hoveredItemId, onHoverItem }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    // --- Financial & Clinical Calculations for the Phase ---
    // This component calculates phase-specific financials by proportionally splitting the
    // total plan's insurance based on this phase's contribution to the total fee.
    const phaseSubtotal = group.items.reduce((sum, item) => sum + item.netFee, 0);
    const planTotalFee = plan.totalFee > 0 ? plan.totalFee : 1; // Avoid division by zero
    const phaseRatio = phaseSubtotal / planTotalFee;
    const phaseInsurance = (plan.estimatedInsurance || 0) * phaseRatio;
    const phasePatientPortion = phaseSubtotal - phaseInsurance;
    const phaseVisits = group.items.reduce((sum, item) => sum + estimateVisits(item), 0);

    const isHighlighted = (item: TreatmentPlanItem) => {
        if (hoveredTooth) {
            const relevantItems = getItemsOnTooth(hoveredTooth, allItems);
            return relevantItems.some(r => r.id === item.id);
        }
        if (hoveredQuadrant) {
            const relevantItems = getItemsOnQuadrant(hoveredQuadrant, allItems);
            return relevantItems.some(r => r.id === item.id);
        }
        if (hoveredItemId) return hoveredItemId === item.id;
        return false;
    };

    const isDimmed = (item: TreatmentPlanItem) => false; // Dimming disabled per design request

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
        <div className="relative">
            {/* Phase Header */}
            <div className="flex items-center gap-4 mb-4 md:mb-6 sticky top-0 bg-gray-50 z-10 py-2">
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-sm shadow-md shadow-blue-200">
                    {phaseIndex + 1}
                </div>
                <h3 className="font-bold text-xl text-gray-900">{group.title}</h3>
            </div>

            {/* Cards with Expandable Pricing */}
            <div className="grid gap-3 xl:gap-4">
                {group.items.map(item => {
                    const ProcedureIcon = getProcedureIcon(item);
                    const highlighted = isHighlighted(item);
                    const dimmed = isDimmed(item);

                    return (
                        <div key={item.id} onMouseEnter={() => onHoverItem(item.id)} onMouseLeave={() => onHoverItem(null)}>
                            <div
                                className={`
                                    bg-white p-4 md:p-5 border transition-all duration-300
                                    ${isExpanded ? 'rounded-t-xl' : 'rounded-xl'}
                                    ${highlighted
                                        ? 'border-gray-300 shadow-md' // POLISH: Softer hover highlight
                                        : dimmed
                                            ? 'border-gray-100 opacity-40 grayscale'
                                            : 'border-gray-200 shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-md hover:border-gray-300'
                                    }
                                `}
                            >
                                <div className="flex items-start gap-4">
                                    <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center shrink-0 border mt-1 ${highlighted ? 'bg-gray-100 text-gray-700 border-gray-200' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>
                                        <ProcedureIcon width={20} height={20} className="md:w-6 md:h-6" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                                            <div className="font-bold text-gray-900 text-base leading-tight">{item.procedureName}</div>
                                            <div className="flex items-center gap-2 mt-1 md:mt-0">
                                                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{item.category}</div>
                                                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getUrgencyClass(item.urgency)}`}>
                                                    {getUrgencyIcon(item.urgency)} {item.urgency || 'Elective'}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="text-sm text-gray-500 mt-2 font-medium flex flex-wrap items-center gap-3">
                                            <span className="bg-gray-100 px-2 py-0.5 rounded text-xs text-gray-600">{renderLocation(item)}</span>
                                            <span className="flex items-center gap-1 text-gray-400 text-xs"><Calendar size={12} /> {estimateVisits(item)} visit(s)</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            {/* Expandable Financial Row */}
                            <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isExpanded ? 'max-h-20' : 'max-h-0'}`}>
                                <div className="px-5 py-3 text-xs text-gray-500 bg-slate-50/80 rounded-b-xl border-x border-b border-gray-200 border-t border-slate-200 flex justify-between items-center">
                                    <span className="font-medium">
                                        {item.units} × ${item.baseFee.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                    </span>
                                    <span className="font-bold text-gray-700">
                                        Total ${item.netFee.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                    </span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Expanded Phase Summary */}
            <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isExpanded ? 'max-h-48' : 'max-h-0'}`}>
                <div className="mt-4 bg-slate-50/80 border border-gray-200/80 rounded-lg p-4 text-sm space-y-2 shadow-sm">
                    <div className="flex justify-between font-medium">
                        <span className="text-gray-600">Phase Subtotal</span>
                        <span className="text-gray-900">${phaseSubtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                    </div>
                    {phaseInsurance > 0 && (
                        <div className="flex justify-between">
                            <span className="text-gray-500">Est. Insurance for this phase</span>
                            <span className="text-gray-700">-${Math.round(phaseInsurance).toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
                        </div>
                    )}
                    <div className="flex justify-between font-bold pt-2 border-t border-slate-200">
                        <span className="text-blue-700">Est. Patient Portion for this phase</span>
                        <span className="text-blue-600">${Math.round(phasePatientPortion).toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
                    </div>
                </div>
            </div>

            {/* Phase Footer */}
            <div className="mt-4 flex justify-between items-center p-2 pl-4 bg-gray-100/70 rounded-lg border border-gray-200/80">
                <div className="text-sm font-semibold text-gray-700">
                    <span>Phase Subtotal: <span className="text-gray-900">${phaseSubtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span></span>
                    <span className="mx-2 text-gray-300">•</span>
                    <span>Est. Visits: {phaseVisits}</span>
                </div>
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="flex items-center gap-1 text-sm font-bold text-blue-600 hover:text-blue-800 px-3 py-1.5 rounded-md hover:bg-blue-50"
                    aria-expanded={isExpanded}
                >
                    <span>{isExpanded ? 'Hide' : 'View'} Breakdown</span>
                    <ChevronDown size={16} className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                </button>
            </div>
        </div>
    );
};

export const ProcedureBreakdownSection: React.FC<ProcedureBreakdownSectionProps> = ({
  plan,
  items,
  phases,
  hoveredTooth,
  hoveredQuadrant,
  hoveredItemId,
  onHoverItem
}) => {
  const getItemsForPhase = (phaseTitle: string) => {
    if (phaseTitle.includes('Hygiene') || phaseTitle.includes('Foundation'))
      return items.filter(i => i.category === 'PERIO' || i.category === 'OTHER');
    if (phaseTitle.includes('Restorative'))
      return items.filter(i => i.category === 'RESTORATIVE' || i.category === 'ENDODONTIC');
    if (phaseTitle.includes('Replacement') || phaseTitle.includes('Implant'))
      return items.filter(i => i.category === 'IMPLANT' || i.category === 'PROSTHETIC');
    return items.filter(i => !['PERIO', 'OTHER', 'RESTORATIVE', 'ENDODONTIC', 'IMPLANT', 'PROSTHETIC'].includes(i.category));
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

  return (
    <section className="py-12 md:py-16 px-4 md:px-6 bg-gray-50 border-b border-gray-200">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">What We'll Do</h2>
        <p className="text-gray-500 mb-8 md:mb-10">Your personalized treatment plan, organized by priority.</p>
        <div className="space-y-8 xl:space-y-12">
          {displayGroups.map((group, idx) => (
            group.items.length > 0 && (
              <PhaseGroup
                key={idx}
                phaseIndex={idx}
                group={group}
                plan={plan}
                allItems={items}
                hoveredTooth={hoveredTooth}
                hoveredQuadrant={hoveredQuadrant}
                hoveredItemId={hoveredItemId}
                onHoverItem={onHoverItem}
              />
            )
          ))}
        </div>
      </div>
    </section>
  );
};
