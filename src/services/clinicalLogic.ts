import { TreatmentPlanItem, UrgencyLevel, FeeCategory } from '../types';
import { getFeeSchedule } from './treatmentPlans';

// FIX: Added missing PayerId type for claim readiness
export type PayerId = 'GENERIC' | 'DELTA_DENTAL' | 'AETNA' | 'CIGNA' | 'METLIFE';

// FIX: Added missing ClaimReadinessResult interface
export interface ClaimReadinessResult {
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  missing: string[];
  ruleApplied?: {
    notesForBiller?: string;
  };
}

// FIX: Added missing DiagramData interface
export interface DiagramData {
  teeth: number[];
  quadrants: string[];
  arches: string[];
  urgencyMap: Record<number, string>;
  quadrantUrgency: Record<string, string>;
  archUrgency: Record<string, string>;
}

// --- CONSTANTS ---
export const TEETH_UPPER = Array.from({ length: 16 }, (_, i) => i + 1);
export const TEETH_LOWER = Array.from({ length: 16 }, (_, i) => 32 - i);

export const QUADRANT_MAP = {
  'UR': [1, 2, 3, 4, 5, 6, 7, 8],
  'UL': [9, 10, 11, 12, 13, 14, 15, 16],
  'LL': [17, 18, 19, 20, 21, 22, 23, 24],
  'LR': [25, 26, 27, 28, 29, 30, 31, 32]
};

// FIX: Added missing helper functions for item filtering by location
export const getItemsOnTooth = (tooth: number, items: TreatmentPlanItem[]) => {
  return items.filter(i => i.unitType === 'PER_TOOTH' && i.selectedTeeth?.includes(tooth));
};

export const getItemsOnArch = (arch: 'UPPER' | 'LOWER', items: TreatmentPlanItem[]) => {
  return items.filter(i => i.unitType === 'PER_ARCH' && i.selectedArches?.includes(arch));
};

export const getItemsOnQuadrant = (quadrant: string, items: TreatmentPlanItem[]) => {
  return items.filter(i => i.unitType === 'PER_QUADRANT' && i.selectedQuadrants?.includes(quadrant as any));
};

// --- VISIT ESTIMATION ---
export const estimateVisits = (item: TreatmentPlanItem): number => {
  /**
   * PRODUCTION INVARIANT: Only use stored estimatedVisits if manually flagged by user.
   * This ensures that demo/legacy data does not override library-driven truth.
   */
  if (item.estimatedVisitsIsManual === true && item.estimatedVisits != null) {
    return item.estimatedVisits;
  }

  // Use Library Default as Primary source of truth
  const entry = getFeeSchedule().find(e => e.id === item.feeScheduleEntryId || e.procedureCode === item.procedureCode);
  if (entry?.defaultEstimatedVisits != null) return entry.defaultEstimatedVisits;

  // Fallback heuristics for unlinked/custom procedures
  if (item.itemType === 'ADDON') return 0; 
  switch (item.category) {
    case 'IMPLANT': return 3;
    case 'PERIO': return 2;
    case 'ENDODONTIC': return 2;
    case 'PROSTHETIC': return 4;
    case 'RESTORATIVE': return item.procedureName.toLowerCase().includes('crown') ? 2 : 1;
    default: return 1;
  }
};

// --- DURATION ESTIMATION ---
export const estimateDuration = (item: TreatmentPlanItem): { value: number; unit: 'days' | 'weeks' | 'months' } => {
  /**
   * PRODUCTION INVARIANT: Only use stored duration if manually flagged by user.
   */
  if (item.estimatedDurationIsManual === true && item.estimatedDurationValue != null && item.estimatedDurationUnit != null) {
    return { value: item.estimatedDurationValue, unit: item.estimatedDurationUnit };
  }
  
  // Use Library Default as Primary source of truth
  const entry = getFeeSchedule().find(e => e.id === item.feeScheduleEntryId || e.procedureCode === item.procedureCode);
  if (entry?.defaultEstimatedDurationValue != null && entry?.defaultEstimatedDurationUnit != null) {
      return { value: entry.defaultEstimatedDurationValue, unit: entry.defaultEstimatedDurationUnit };
  }

  // Fallback heuristics
  if (item.itemType === 'ADDON') return { value: 0, unit: 'days' };
  switch (item.category) {
    case 'IMPLANT': return { value: 4, unit: 'months' };
    case 'PROSTHETIC': return { value: 3, unit: 'weeks' };
    case 'ENDODONTIC': return { value: 2, unit: 'weeks' };
    case 'RESTORATIVE': return item.procedureName.toLowerCase().includes('crown') ? { value: 2, unit: 'weeks' } : { value: 1, unit: 'days' };
    default: return { value: 1, unit: 'days' };
  }
};

export const getToothQuadrant = (tooth: number): 'UR' | 'UL' | 'LL' | 'LR' | undefined => {
  if (tooth >= 1 && tooth <= 8) return 'UR';
  if (tooth >= 9 && tooth <= 16) return 'UL';
  if (tooth >= 17 && tooth <= 24) return 'LL';
  if (tooth >= 25 && tooth <= 32) return 'LR';
  return undefined;
};

// FIX: Updated mapPlanToDiagram to return DiagramData and include arch mapping
export const mapPlanToDiagram = (items: TreatmentPlanItem[]): DiagramData => {
  const data: DiagramData = { teeth: [] as number[], quadrants: [] as string[], arches: [] as string[], urgencyMap: {} as Record<number, string>, quadrantUrgency: {} as Record<string, string>, archUrgency: {} as Record<string, string> };
  items.forEach(item => {
    if (item.itemType === 'ADDON') return;
    const urgency = item.urgency || 'ELECTIVE';
    if (item.unitType === 'PER_TOOTH' && item.selectedTeeth) {
      item.selectedTeeth.forEach(t => {
        if (!data.teeth.includes(t)) data.teeth.push(t);
        data.urgencyMap[t] = urgency;
      });
    }
    if (item.unitType === 'PER_QUADRANT' && item.selectedQuadrants) {
      item.selectedQuadrants.forEach(q => {
        if (!data.quadrants.includes(q)) data.quadrants.push(q);
        data.quadrantUrgency[q] = urgency;
      });
    }
    if (item.unitType === 'PER_ARCH' && item.selectedArches) {
      item.selectedArches.forEach(a => {
        if (!data.arches.includes(a)) data.arches.push(a);
        data.archUrgency[a] = urgency;
      });
    }
  });
  return data;
};

export const calculateClinicalMetrics = (items: TreatmentPlanItem[]) => {
  const procedureItems = items.filter(i => i.itemType !== 'ADDON');
  const visitCount = procedureItems.reduce((sum, item) => sum + estimateVisits(item), 0);
  return { visitCount };
};

export const generateClinicalExplanation = (items: TreatmentPlanItem[]) => {
  return { intro: "Based on our examination, we recommend the following sequence to restore your oral health.", benefits: ["Stop progression of decay", "Restore chewing function", "Prevent future emergency visits"] };
};

// FIX: Added missing evaluateClaimReadiness function
export const evaluateClaimReadiness = (item: TreatmentPlanItem, payerId: PayerId): ClaimReadinessResult => {
  const missing: string[] = [];
  if (!item.diagnosisCodes || item.diagnosisCodes.length === 0) missing.push("Diagnosis code required");
  if (!item.documentation?.narrativeText) missing.push("Narrative required");
  
  return {
    riskLevel: missing.length === 0 ? 'LOW' : missing.length === 1 ? 'MEDIUM' : 'HIGH',
    missing,
    ruleApplied: { notesForBiller: "Standard payer rules applied." }
  };
};

// FIX: Added missing buildClaimNarrativeDraft function
export const buildClaimNarrativeDraft = (args: {
  procedureName: string;
  procedureCode: string;
  tooth: string | null;
  diagnosisCodes: string[];
  visitDate: string;
}) => {
  const toothText = args.tooth ? ` on tooth #${args.tooth}` : '';
  const dxText = args.diagnosisCodes.length > 0 ? ` with associated diagnosis ${args.diagnosisCodes.join(', ')}` : '';
  return `Clinical necessity for ${args.procedureName} (${args.procedureCode})${toothText} confirmed based on findings${dxText} during the visit on ${args.visitDate}.`;
};
