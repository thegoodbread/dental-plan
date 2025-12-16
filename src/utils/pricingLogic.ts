
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
  const standardUnitFee = item.baseFee;
  const memberUnitFee = item.membershipFee ?? item.baseFee;
  const isMemberMode = mode === 'membership';

  // Determine which fee is active
  let activeUnitFee = standardUnitFee;
  if (isMemberMode && item.membershipFee != null) {
    activeUnitFee = memberUnitFee;
  }

  const units = item.units || 1;
  const grossStandard = standardUnitFee * units;
  const grossActive = activeUnitFee * units;
  
  // Net fee includes manual item-level discounts (subtracted from gross)
  const discount = item.discount || 0;
  const netFee = Math.max(0, grossActive - discount);

  // Savings Logic:
  // We strictly calculate savings as the difference between Standard and Member rates.
  // Manual discounts are treated as separate adjustments.
  let memberSavings = 0;
  if (isMemberMode && item.membershipFee != null && item.membershipFee < item.baseFee) {
    memberSavings = (item.baseFee - item.membershipFee) * units;
  }

  return {
    standardUnitFee,
    activeUnitFee,
    grossStandard,
    grossActive,
    netFee,
    memberSavings,
    isMemberPrice: isMemberMode && item.membershipFee != null
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
