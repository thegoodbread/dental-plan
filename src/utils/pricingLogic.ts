import { TreatmentPlanItem, FeeScheduleType } from '../types';

export interface ItemPricing {
  standardUnitFee: number;
  activeUnitFee: number;
  grossStandard: number; // standard * units
  grossActive: number;   // active * units
  netFee: number;        // active * units - discount
  memberSavings: number; // (standard - member) * units (if in member mode)
  isMemberPrice: boolean;
}

/**
 * Single source of truth for procedure pricing.
 * Calculates standard vs member fees, totals, and savings based on the plan's mode.
 */
export const computeItemPricing = (item: TreatmentPlanItem, mode: FeeScheduleType): ItemPricing => {
  const standardUnitFee = item.baseFee ?? 0;
  
  // 3-STATE MEMBERSHIP LOGIC:
  // null => Not defined (fallback to standard)
  // 0    => Included benefit ($0)
  // > 0  => Custom discounted rate
  const hasMemberPriceDefined = item.membershipFee !== null && item.membershipFee !== undefined;
  const memberUnitFee = hasMemberPriceDefined ? item.membershipFee! : standardUnitFee;
  
  const isMemberMode = mode === 'membership';

  // Determine which fee is active for net calculations
  let activeUnitFee = standardUnitFee;
  if (isMemberMode && hasMemberPriceDefined) {
    activeUnitFee = memberUnitFee;
  }

  const units = item.units ?? 1;
  const grossStandard = standardUnitFee * units;
  const grossActive = activeUnitFee * units;
  
  const discount = item.discount ?? 0;
  const netFee = Math.max(0, grossActive - discount);

  // Savings are strictly the Delta between Standard and Member rates
  let memberSavings = 0;
  if (isMemberMode && hasMemberPriceDefined && memberUnitFee < standardUnitFee) {
    memberSavings = (standardUnitFee - memberUnitFee) * units;
  }

  return {
    standardUnitFee,
    activeUnitFee,
    grossStandard,
    grossActive,
    netFee,
    memberSavings,
    isMemberPrice: isMemberMode && hasMemberPriceDefined
  };
};

export const computePlanTotals = (items: TreatmentPlanItem[], mode: FeeScheduleType) => {
  let totalFee = 0;
  let totalMemberSavings = 0;

  items.forEach(item => {
    const pricing = computeItemPricing(item, mode);
    totalFee += pricing.netFee;
    totalMemberSavings += pricing.memberSavings;
  });

  return { totalFee, totalMemberSavings };
};