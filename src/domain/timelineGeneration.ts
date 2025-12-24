
import { TreatmentPhase, TreatmentPlanItem, FeeCategory, PhaseBucketKey } from '../types';
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
  OTHER: 'adjunctive care',
};

/**
 * SMARTER TITLE ENGINE
 * Logic that considers the "Why" and "When" of a phase.
 */
export function generateSmarterPhaseTitle(sortOrder: number, bucket: PhaseBucketKey, items: TreatmentPlanItem[]): string {
  const phaseNum = sortOrder + 1;
  const codes = items.map(i => i.procedureCode.toUpperCase());
  const categories = Array.from(new Set(items.map(i => i.category)));

  // 1. Surgical/Implant dominance
  if (categories.includes('IMPLANT') || codes.some(c => c.startsWith('D60'))) {
    return `Phase ${phaseNum}: Surgical Reconstruction`;
  }

  // 2. Endodontic/Acute care
  if (categories.includes('ENDODONTIC')) {
    return `Phase ${phaseNum}: Endodontic Therapy`;
  }

  // 3. Positional logic for Perio/Preventive
  if (categories.includes('PERIO') || categories.includes('PREVENTIVE')) {
    if (sortOrder === 0) return `Phase ${phaseNum}: Foundation`;
    if (sortOrder >= 3) return `Phase ${phaseNum}: Maintenance`;
    return `Phase ${phaseNum}: Periodontal Health`;
  }

  // 4. Positional logic for Restorative
  if (categories.includes('RESTORATIVE') || categories.includes('PROSTHETIC')) {
    if (sortOrder === 0) return `Phase ${phaseNum}: Initial Restorations`;
    if (sortOrder >= 2) return `Phase ${phaseNum}: Functional Reconstruction`;
    return `Phase ${phaseNum}: Restorative Phase`;
  }

  // 5. Default categorical fallbacks
  switch (bucket) {
    case 'FOUNDATION': return `Phase ${phaseNum}: Foundation`;
    case 'RESTORATIVE': return `Phase ${phaseNum}: Restorative`;
    case 'IMPLANT': return `Phase ${phaseNum}: Reconstruction`;
    case 'ELECTIVE': return `Phase ${phaseNum}: Enhancement`;
    default: return `Phase ${phaseNum}: Treatment Phase`;
  }
}

export function generatePhaseDescription(items: TreatmentPlanItem[]): string {
  if (items.length === 0) return "Pending treatment selection.";
  const uniqueCategories = Array.from(new Set(items.map(i => i.category)));
  const descriptions = uniqueCategories.map(c => CATEGORY_DESCRIPTIONS[c as FeeCategory]).filter(Boolean);
  if (descriptions.length === 0) return "Planned dental treatment.";
  
  const text = descriptions.join(' and ');
  const prefix = items.length > 2 ? "Comprehensive approach " : "Focusing on ";
  return prefix + text + '.';
}

function normalizeToDays(val: number, unit: string): number {
    if (!val) return 0;
    const u = unit.toLowerCase();
    if (u.startsWith('month')) return val * 30.44;
    if (u.startsWith('week')) return val * 7;
    return val;
}

export function calculatePhaseDurationLabel(items: TreatmentPlanItem[], phase: TreatmentPhase): string | null {
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
  }

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

function resolveItemPhaseId(item: TreatmentPlanItem, phases: TreatmentPhase[]): string | undefined {
    if (item.phaseId && phases.some(p => p.id === item.phaseId)) return item.phaseId;
    const manifestOwner = phases.find(p => p.itemIds && p.itemIds.includes(item.id));
    if (manifestOwner) return manifestOwner.id;
    return undefined;
}

export function derivePhaseTimeline(
  phases: TreatmentPhase[] | undefined | null, 
  allItems: TreatmentPlanItem[],
  planId?: string
): DerivedPhaseMetadata[] {
  let effectivePhases = Array.isArray(phases) && phases.length > 0 ? [...phases] : [];

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
        isMonitorPhase: false,
        // FIX: Added missing estimated duration properties
        estimatedDurationValue: null,
        estimatedDurationUnit: null
    }];
  }

  if (effectivePhases.length === 0) return [];
  
  const itemsByPhase: Record<string, TreatmentPlanItem[]> = {};
  effectivePhases.forEach(p => itemsByPhase[p.id] = []);

  const fallbackPhase = effectivePhases.find(p => !p.isMonitorPhase) || effectivePhases[0];

  allItems.forEach(item => {
    let targetId = resolveItemPhaseId(item, effectivePhases);
    if (!targetId && fallbackPhase) targetId = fallbackPhase.id;
    if (targetId && itemsByPhase[targetId]) itemsByPhase[targetId].push(item);
  });

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
