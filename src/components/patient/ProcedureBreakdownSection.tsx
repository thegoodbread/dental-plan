
import React, { useState, useMemo } from 'react';
import { TreatmentPlan, TreatmentPlanItem } from '../../types';
import { Calendar, AlertTriangle, Shield, Smile, ChevronDown, Star, Syringe, Plus } from 'lucide-react';
import { estimateVisits, getItemsOnTooth, getItemsOnQuadrant } from '../../services/clinicalLogic';
import { getProcedureIcon } from '../../utils/getProcedureIcon';
import { computeItemPricing } from '../../utils/pricingLogic';

interface ProcedureBreakdownSectionProps {
  plan: TreatmentPlan;
  items: TreatmentPlanItem[];
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
    const procedures = useMemo(() => group.items.filter(i => i.itemType !== 'ADDON'), [group.items]);
    const addOns = useMemo(() => group.items.filter(i => i.itemType === 'ADDON'), [group.items]);

    const { subtotal: phaseSubtotal, savings: totalPhaseSavings } = useMemo(() => {
        return group.items.reduce((acc, item) => {
            const pricing = computeItemPricing(item, plan.feeScheduleType);
            acc.subtotal += pricing.netFee;
            acc.savings += pricing.memberSavings;
            return acc;
        }, { subtotal: 0, savings: 0 });
    }, [group.items, plan.feeScheduleType]);
    
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

    const renderCard = (item: TreatmentPlanItem, isAddOn: boolean, parentName?: string) => {
        const ProcedureIcon = isAddOn ? (item.addOnKind === 'SEDATION' ? Syringe : Plus) : getProcedureIcon(item);
        const highlighted = isHighlighted(item);
        
        const pricing = computeItemPricing(item, plan.feeScheduleType);

        return (
            <div key={item.id} className="relative" onMouseEnter={() => onHoverItem(item.id)} onMouseLeave={() => onHoverItem(null)}>
                <div className={`bg-white border transition-all duration-300 ${isExpanded ? 'rounded-t-xl' : 'rounded-xl'} ${highlighted ? 'border-gray-300 shadow-md ring-1 ring-gray-100' : 'border-gray-200 shadow-[0_1px_3px_rgba(0,0,0,0.02)] hover:shadow-md hover:border-gray-300'} ${isAddOn ? 'p-3 md:p-4 bg-slate-50/50' : 'p-4 md:p-5'}`}>
                    <div className="flex items-start gap-3 md:gap-4">
                        <div className={`rounded-xl flex items-center justify-center shrink-0 border ${isAddOn ? 'w-8 h-8 md:w-9 md:h-9 bg-purple-50 text-purple-600 border-purple-100' : `w-10 h-10 md:w-12 md:h-12 ${highlighted ? 'bg-gray-100 text-gray-700 border-gray-200' : 'bg-blue-50 text-blue-600 border-blue-100'}`}`}>
                            <ProcedureIcon size={isAddOn ? 16 : 20} className={isAddOn ? '' : 'md:w-6 md:h-6'} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start gap-4">
                                <div className="flex-1">
                                    <div className={`font-bold text-gray-900 leading-tight ${isAddOn ? 'text-sm' : 'text-base'}`}>{item.procedureName}</div>
                                    {isAddOn && parentName && <div className="text-[11px] text-gray-500 mt-0.5 font-medium">Applies to: {parentName}</div>}
                                    {!isAddOn && (
                                        <div className="text-sm text-gray-500 mt-2 font-medium flex flex-wrap items-center gap-3">
                                            <span className="bg-gray-100 px-2 py-0.5 rounded text-xs text-gray-600">{renderLocation(item)}</span>
                                            <span className="flex items-center gap-1 text-gray-400 text-xs"><Calendar size={12} /> {estimateVisits(item)} visit(s)</span>
                                        </div>
                                    )}
                                </div>
                                <div className="flex flex-col items-end gap-1 shrink-0 text-right">
                                    <div className="flex flex-col items-end">
                                        <div className="font-bold text-gray-900">
                                            ${pricing.netFee.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                        </div>
                                        {pricing.memberSavings > 0 && (
                                            <div className="text-xs font-semibold text-green-600">
                                                Save ${pricing.memberSavings.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-1.5 flex-wrap justify-end">
                                        {pricing.isMemberPrice && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200"><Star size={10} /> MEMBER</span>}
                                        {!isAddOn && (
                                            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getUrgencyClass(item.urgency)}`}>{getUrgencyIcon(item.urgency)} {item.urgency || 'Elective'}</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isExpanded ? 'max-h-40' : 'max-h-0'}`}>
                    {pricing.memberSavings > 0 ? (
                        <div className="px-5 py-3 text-xs text-gray-500 bg-slate-50/80 rounded-b-xl border-x border-b border-gray-200 border-t border-slate-200 space-y-2">
                            <div className="flex justify-between items-center"><span>Standard Fee</span><span className="font-medium text-gray-500 line-through">${pricing.grossStandard.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span></div>
                            <div className="flex justify-between items-center text-green-500"><span className="font-medium">Member Savings</span><span className="font-bold">-${pricing.memberSavings.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span></div>
                            <div className="border-t border-slate-200 !my-1"></div>
                            <div className="flex justify-between items-center"><span className="font-bold text-gray-700">Your Price</span><span className="font-bold text-gray-900 text-sm">${pricing.netFee.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span></div>
                        </div>
                    ) : (
                        <div className="px-5 py-3 text-xs text-gray-500 bg-slate-50/80 rounded-b-xl border-x border-b border-gray-200 border-t border-slate-200 flex justify-between items-center">
                            <span className="font-medium">{item.units > 1 ? `${item.units} × ` : ''}Standard Fee</span>
                            <span className="font-bold text-gray-700">${pricing.netFee.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="relative">
            <div className="flex items-center gap-4 mb-4 md:mb-6 sticky top-0 bg-gray-50 z-10 py-2">
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-sm shadow-md shadow-blue-200">{phaseIndex + 1}</div>
                <h3 className="font-bold text-xl text-gray-900">{group.title}</h3>
            </div>
            <div className="flex flex-col gap-4">
                {procedures.map(item => {
                    const linkedAddOns = addOns.filter(s => s.linkedItemIds && s.linkedItemIds[0] === item.id);
                    return (
                        <div key={item.id} className="flex flex-col gap-2">
                            {renderCard(item, false)}
                            {linkedAddOns.length > 0 && (
                                <div className="flex flex-col gap-2 pl-6 md:pl-8 relative">
                                    <div className="absolute left-3 md:left-4 top-[-8px] bottom-6 w-px bg-gray-300/40"></div>
                                    {linkedAddOns.map(addon => (
                                        <div key={addon.id} className="relative">
                                            <div className="absolute left-[-12px] md:left-[-16px] top-[24px] w-[12px] md:w-[16px] border-b border-gray-300/40 h-px"></div>
                                            {renderCard(addon, true, item.procedureName)}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}
                {addOns.filter(s => !s.linkedItemIds || s.linkedItemIds.length === 0 || !procedures.some(p => p.id === s.linkedItemIds![0])).map(addon => (
                     <div key={addon.id} className="opacity-75">{renderCard(addon, true, 'Unknown Procedure')}</div>
                ))}
            </div>
            <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isExpanded ? 'max-h-48' : 'max-h-0'}`}>
                <div className="mt-4 bg-slate-50/80 border border-gray-200/80 rounded-lg p-4 text-sm space-y-2 shadow-sm">
                    <div className="flex justify-between font-bold"><span className="text-gray-600">Phase Subtotal</span><span className="text-gray-900">${phaseSubtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span></div>
                </div>
            </div>
            <div className="mt-4 flex justify-between items-center p-2 pl-4 bg-gray-100/70 rounded-lg border border-gray-200/80">
                <div className="text-sm font-semibold text-gray-700">
                    <span>Phase Subtotal: <span className="text-gray-900">${phaseSubtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span></span>
                    {totalPhaseSavings > 0.005 && <><span className="mx-2 text-gray-300">•</span><span className="text-green-500">Member Savings: <span className="font-bold">-${totalPhaseSavings.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span></span></>}
                    <span className="mx-2 text-gray-300">•</span>
                    <span>Est. Visits: {phaseVisits}</span>
                </div>
                <button onClick={() => setIsExpanded(!isExpanded)} className="flex items-center gap-1 text-sm font-bold text-blue-600 hover:text-blue-800 px-3 py-1.5 rounded-md hover:bg-blue-50">
                    <span>{isExpanded ? 'Hide' : 'View'} Breakdown</span>
                    <ChevronDown size={16} className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                </button>
            </div>
        </div>
    );
};

export const ProcedureBreakdownSection: React.FC<ProcedureBreakdownSectionProps> = ({ plan, items, hoveredTooth, hoveredQuadrant, hoveredItemId, onHoverItem }) => {
  const itemMap = useMemo(() => new Map(items.map(item => [item.id, item])), [items]);
  const displayGroups = useMemo(() => {
    if (plan.phases && plan.phases.length > 0) {
      return [...plan.phases].sort((a, b) => a.sortOrder - b.sortOrder).map(phase => ({
          title: phase.title,
          items: phase.itemIds.map(id => itemMap.get(id)).filter((item): item is TreatmentPlanItem => !!item)
        })).filter(group => group.items.length > 0);
    }
    return [{ title: 'All Procedures', items: items }];
  }, [plan.phases, items, itemMap]);

  return (
    <section className="py-12 md:py-16 px-4 md:px-6 bg-gray-50 border-b border-gray-200">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">What We'll Do</h2>
        <p className="text-gray-500 mb-8 md:mb-10">Your personalized treatment plan, organized by priority.</p>
        <div className="space-y-8 xl:space-y-12">
          {displayGroups.map((group, idx) => (
            group.items.length > 0 && <PhaseGroup key={idx} phaseIndex={idx} group={group} plan={plan} allItems={items} hoveredTooth={hoveredTooth} hoveredQuadrant={hoveredQuadrant} hoveredItemId={hoveredItemId} onHoverItem={onHoverItem} />
          ))}
        </div>
      </div>
    </section>
  );
};
