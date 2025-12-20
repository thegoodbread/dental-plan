import { TreatmentPhase, TreatmentPlanItem, FeeCategory } from '../types';
import { estimateVisits, estimateDuration } from '../services/clinicalLogic';

export interface DerivedPhaseMetadata {
  phaseId: string;
  title: string;
  description: string;
  durationLabel: string | null;
  items: TreatmentPlanItem[];
}

const CATEGORY_DESCRIPTIONS: Record<FeeCategory, string> = {
  ENDODONTIC: 'treating active infection',
  SURGICAL: 'removing non-restorable teeth',
  PERIO: 'stabilizing gum health',
  IMPLANT: 'replacing missing teeth',
  RESTORATIVE: 'repairing tooth structure',
  PROSTHETIC: 'restoring function',
  COSMETIC: 'enhancing aesthetics',
  ORTHO: 'aligning teeth',
  PREVENTIVE: 'preventive care',
  DIAGNOSTIC: 'diagnostic evaluation',
  OTHER: 'adjunctive care'
};

export function generatePhaseDescription(items: TreatmentPlanItem[]): string {
  if (items.length === 0) return "Pending treatment selection.";
  const uniqueCategories = Array.from(new Set(items.map(i => i.category)));
  const descriptions = uniqueCategories.map(c => CATEGORY_DESCRIPTIONS[c as FeeCategory]).filter(Boolean);
  if (descriptions.length === 0) return "Planned dental treatment.";
  const text = descriptions.join(' and ');
  return text.charAt(0).toUpperCase() + text.slice(1) + '.';
}

function normalizeToDays(val: number, unit: string): number {
    if (!val) return 0;
    const u = unit.toLowerCase();
    if (u.startsWith('month')) return val * 30.44;
    if (u.startsWith('week')) return val * 7;
    return val;
}

/**
 * INVARIANT: Phase-level duration overrides are allowed ONLY for monitor phases.
 * Standard clinical phases MUST always recompute from their constituent items
 * to prevent "frozen" timeline values when procedures move.
 */
export function calculatePhaseDurationLabel(items: TreatmentPlanItem[], phase: TreatmentPhase): string | null {
  const isProd = process.env.NODE_ENV === 'production';
  // Strict check: only monitor phases with the manual flag can bypass item-based calculation
  const isOverrideAllowed = phase.isMonitorPhase === true && phase.durationIsManual === true;

  if (isOverrideAllowed) {
    if (phase.estimatedDurationValue != null && phase.estimatedDurationUnit != null) {
        const val = phase.estimatedDurationValue!;
        const unit = phase.estimatedDurationUnit!;
        let unitText = unit.charAt(0).toUpperCase() + unit.slice(1);
        if (val === 1 && unitText.endsWith('s')) unitText = unitText.slice(0, -1);
        if (val !== 1 && !unitText.endsWith('s')) unitText = unitText + 's';
        return `Est. ${val} ${unitText}`;
    }
  } else if (!isProd && phase.durationIsManual && !phase.isMonitorPhase) {
      console.warn(`[Timeline Engine] Ignored manual duration override for non-monitor phase: ${phase.title}. Reverting to item-based computation.`);
  }

  // COMPUTE DYNAMICALLY FROM ITEMS (Fallback for clinical phases)
  if (items.length === 0) return null;

  let totalDays = 0;
  items.forEach(item => {
      const est = estimateDuration(item);
      totalDays += normalizeToDays(est.value, est.unit);
  });

  if (totalDays > 14) {
      if (totalDays < 60) {
          const wks = Math.ceil(totalDays / 7);
          return `Est. ${wks} ${wks === 1 ? 'Week' : 'Weeks'}`;
      }
      const mos = Math.ceil(totalDays / 30.44);
      return `Est. ${mos} ${mos === 1 ? 'Month' : 'Months'}`;
  }

  const totalVisits = items.reduce((sum, item) => sum + estimateVisits(item), 0);
  if (totalVisits === 0) return "Single Visit";
  if (totalVisits === 1) return "Est. 1 Visit";
  if (totalVisits <= 3) return `Est. ${totalVisits} Visits`;
  
  const weeks = Math.ceil(totalVisits * 1.5); 
  return `Est. ${weeks} ${weeks === 1 ? 'Week' : 'Weeks'}`;
}

/**
 * INVARIANT: Phase resolution order must be:
 * 1) item.phaseId match
 * 2) phase.itemIds manifest inclusion
 * 3) bucketKey mapping
 */
function resolveItemPhaseId(item: TreatmentPlanItem, phases: TreatmentPhase[]): string | undefined {
    // 1. Precise ID Match
    if (item.phaseId && phases.some(p => p.id === item.phaseId)) return item.phaseId;
    
    // 2. Manifest-based resolution (Authoritative list on phase)
    const manifestOwner = phases.find(p => p.itemIds && p.itemIds.includes(item.id));
    if (manifestOwner) return manifestOwner.id;

    // 3. Semantic Fallback (Bucket Key)
    const itemBucket = (item as any).bucketKey || (item as any).phaseBucketKey || (item as any).phaseKey;
    if (itemBucket) {
        const match = phases.find(p => p.bucketKey === itemBucket);
        if (match) return match.id;
    }
    
    return undefined;
}

/**
 * INVARIANT: Every plan with items must have a timeline.
 * If no phases exist, create a stable synthetic default phase.
 */
export function derivePhaseTimeline(
  phases: TreatmentPhase[] | undefined | null, 
  allItems: TreatmentPlanItem[],
  planId?: string
): DerivedPhaseMetadata[] {
  let effectivePhases = Array.isArray(phases) && phases.length > 0 ? [...phases] : [];

  // 1. Synthetic Phase Fallback
  if (effectivePhases.length === 0 && allItems.length > 0) {
    const stablePlanId = planId || 'temp';
    effectivePhases = [{
        id: `phase-auto-${stablePlanId}`,
        planId: stablePlanId,
        bucketKey: 'FOUNDATION',
        title: 'Treatment Plan',
        sortOrder: 0,
        itemIds: allItems.map(i => i.id),
        durationIsManual: false,
        isMonitorPhase: false
    }];
  }

  if (effectivePhases.length === 0) return [];
  
  const itemsByPhase: Record<string, TreatmentPlanItem[]> = {};
  effectivePhases.forEach(p => itemsByPhase[p.id] = []);

  // 2. Identify catch-all phase (prefer first clinical/non-monitor phase)
  const fallbackPhase = effectivePhases.find(p => !p.isMonitorPhase) || effectivePhases[0];
  const isProd = process.env.NODE_ENV === 'production';

  allItems.forEach(item => {
    let targetId = resolveItemPhaseId(item, effectivePhases);
    
    // 3. NO DISAPPEARING ITEMS: Re-attach orphans to fallback
    if (!targetId && fallbackPhase) {
        if (!isProd) {
            const label = item.procedureName || item.procedureCode || item.id;
            console.debug(`[Timeline Engine] Reattaching orphaned item "${label}" to fallback phase: ${fallbackPhase.title}`);
        }
        targetId = fallbackPhase.id;
    }
    
    if (targetId && itemsByPhase[targetId]) {
      itemsByPhase[targetId].push(item);
    }
  });

  // 4. Deterministic Sort & Return
  return effectivePhases
    .slice() 
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    .filter(p => itemsByPhase[p.id].length > 0 || p.isMonitorPhase)
    .map(phase => {
        const phaseItems = itemsByPhase[phase.id].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
        return {
            phaseId: phase.id,
            title: phase.title,
            description: generatePhaseDescription(phaseItems),
            durationLabel: calculatePhaseDurationLabel(phaseItems, phase),
            items: phaseItems
        };
    });
}