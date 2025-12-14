
import { TreatmentPlanItem, UrgencyLevel, FeeCategory } from '../../types';

// --- CONSTANTS ---
export const TEETH_UPPER = Array.from({ length: 16 }, (_, i) => i + 1);
export const TEETH_LOWER = Array.from({ length: 16 }, (_, i) => 32 - i); // 32 down to 17

export const QUADRANT_MAP = {
  'UR': [1, 2, 3, 4, 5, 6, 7, 8],
  'UL': [9, 10, 11, 12, 13, 14, 15, 16],
  'LL': [17, 18, 19, 20, 21, 22, 23, 24],
  'LR': [25, 26, 27, 28, 29, 30, 31, 32]
};

export const ARCH_MAP = {
  'UPPER': TEETH_UPPER,
  'LOWER': TEETH_LOWER
};

// --- HELPERS FOR INTERACTION LOGIC ---

export const getToothQuadrant = (tooth: number): 'UR' | 'UL' | 'LL' | 'LR' | undefined => {
  if (tooth >= 1 && tooth <= 8) return 'UR';
  if (tooth >= 9 && tooth <= 16) return 'UL';
  if (tooth >= 17 && tooth <= 24) return 'LL';
  if (tooth >= 25 && tooth <= 32) return 'LR';
  return undefined;
};

export const getToothArch = (tooth: number): 'UPPER' | 'LOWER' => {
  return tooth <= 16 ? 'UPPER' : 'LOWER';
};

export const urgencyWeight = (u?: string): number => {
  switch (u) {
    case 'URGENT': return 3;
    case 'SOON': return 2;
    case 'ELECTIVE': return 1;
    default: return 0;
  }
};

/**
 * Returns all items relevant to a specific tooth.
 * Order: PER_TOOTH > PER_QUADRANT (Arch/Mouth excluded per requirements)
 * Secondary Sort: Urgency > Name
 */
export const getItemsOnTooth = (tooth: number, items: TreatmentPlanItem[]): TreatmentPlanItem[] => {
  const toothQuad = getToothQuadrant(tooth);
  // const toothArch = getToothArch(tooth); // Separated logic

  return items.filter(i => {
    if (i.itemType === 'ADDON') return false; // Add-ons don't show on tooth hover directly
    if (i.unitType === 'PER_TOOTH' && i.selectedTeeth?.includes(tooth)) return true;
    if (i.unitType === 'PER_QUADRANT' && toothQuad && i.selectedQuadrants?.includes(toothQuad)) return true;
    
    // EXCLUDED per user request to separate Arch/Bar services from Tooth tooltip
    // if (i.unitType === 'PER_ARCH' && i.selectedArches?.includes(toothArch)) return true;
    // if (i.unitType === 'PER_MOUTH') return true; 

    return false;
  }).sort((a, b) => {
    // 1. Specificity
    const typeScore = (type: string) => {
      if (type === 'PER_TOOTH') return 4;
      if (type === 'PER_QUADRANT') return 3;
      if (type === 'PER_ARCH') return 2;
      return 1;
    };
    const scoreA = typeScore(a.unitType);
    const scoreB = typeScore(b.unitType);
    if (scoreA !== scoreB) return scoreB - scoreA; // Higher specificity first

    // 2. Urgency
    const urgA = urgencyWeight(a.urgency);
    const urgB = urgencyWeight(b.urgency);
    if (urgA !== urgB) return urgB - urgA; // Higher urgency first

    // 3. Name (Stable sort)
    return a.procedureName.localeCompare(b.procedureName);
  });
};

/**
 * Returns items specifically targeted at a quadrant (excluding PER_TOOTH items in that quadrant).
 * Used for "Secondary Interaction" (Hovering quadrant area).
 */
export const getItemsOnQuadrant = (quad: string, items: TreatmentPlanItem[]): TreatmentPlanItem[] => {
  return items.filter(i => 
    i.itemType !== 'ADDON' &&
    i.unitType === 'PER_QUADRANT' && i.selectedQuadrants?.includes(quad as any)
  ).sort((a, b) => urgencyWeight(b.urgency) - urgencyWeight(a.urgency));
};

/**
 * Returns items specifically targeted at an arch (PER_ARCH or PER_MOUTH).
 */
export const getItemsOnArch = (arch: 'UPPER' | 'LOWER', items: TreatmentPlanItem[]): TreatmentPlanItem[] => {
  return items.filter(i => 
    i.itemType !== 'ADDON' &&
    ((i.unitType === 'PER_ARCH' && i.selectedArches?.includes(arch)) ||
    (i.unitType === 'PER_MOUTH'))
  ).sort((a, b) => {
    const wA = urgencyWeight(a.urgency);
    const wB = urgencyWeight(b.urgency);
    if (wA !== wB) return wB - wA;
    return a.procedureName.localeCompare(b.procedureName);
  });
};

// --- VISIT ESTIMATION ---
export const estimateVisits = (item: TreatmentPlanItem): number => {
  if (item.estimatedVisits) return item.estimatedVisits;
  if (item.itemType === 'ADDON') return 0; // Add-ons happen during other visits

  // Fallback heuristics based on category
  switch (item.category) {
    case 'IMPLANT': return 3;
    case 'PERIO': return 2;
    case 'ENDODONTIC': return 2;
    case 'PROSTHETIC': return 4; // Dentures, bridges take time
    case 'RESTORATIVE': 
        if (item.procedureName.toLowerCase().includes('crown')) return 2;
        if (item.procedureName.toLowerCase().includes('bridge')) return 2;
        return 1;
    case 'ORTHO': return 12;
    case 'COSMETIC': return 2;
    case 'PREVENTIVE': return 1;
    case 'DIAGNOSTIC': return 1;
    default: return 1;
  }
};

// --- DURATION ESTIMATION ---
export const estimateDuration = (item: Partial<TreatmentPlanItem>): { value: number; unit: 'days' | 'weeks' | 'months' } => {
  if (item.estimatedDurationValue && item.estimatedDurationUnit) {
    return { value: item.estimatedDurationValue, unit: item.estimatedDurationUnit };
  }
  
  if (item.itemType === 'ADDON') return { value: 0, unit: 'days' };

  // Fallback heuristics based on category
  switch (item.category) {
    case 'IMPLANT': return { value: 4, unit: 'months' };
    case 'PROSTHETIC': return { value: 3, unit: 'weeks' };
    case 'ORTHO': return { value: 12, unit: 'months' };
    case 'ENDODONTIC': return { value: 2, unit: 'weeks' };
    case 'RESTORATIVE':
      if (item.procedureName && item.procedureName.toLowerCase().includes('crown')) return { value: 2, unit: 'weeks' };
      return { value: 1, unit: 'days' };
    case 'PERIO': return { value: 6, unit: 'weeks' };
    case 'COSMETIC': return { value: 3, unit: 'weeks' };
    default: return { value: 1, unit: 'days' };
  }
};

// New Helper for Chair Time (minutes)
export const estimateChairTime = (item: TreatmentPlanItem): number => {
    // Explicit sedation check
    if (item.itemType === 'ADDON' && item.addOnKind === 'SEDATION') {
        const name = item.procedureName.toLowerCase();
        if (name.includes('iv')) return 60;
        if (name.includes('oral')) return 60;
        if (name.includes('nitrous')) return 30;
        return 45;
    }

    if (item.procedureName.toLowerCase().includes('crown') || item.procedureName.toLowerCase().includes('bridge')) return 90;
    if (item.category === 'IMPLANT') return 120;
    if (item.category === 'ENDODONTIC') return 90;
    if (item.category === 'RESTORATIVE') return 60;
    if (item.category === 'PERIO') return 50;
    if (item.category === 'PROSTHETIC') return 60;
    return 30;
};


// --- DATA TRANSFORMATION ---

export interface DiagramData {
  teeth: number[];
  quadrants: ('UR'|'UL'|'LL'|'LR')[];
  arches: ('UPPER'|'LOWER')[];
  urgencyMap: Record<number, UrgencyLevel>;
  quadrantUrgency: Record<string, UrgencyLevel>;
  archUrgency: Record<string, UrgencyLevel>;
}

const urgencyPriority = (u: UrgencyLevel): number => {
  if (u === 'URGENT') return 3;
  if (u === 'SOON') return 2;
  return 1;
};

export const mapPlanToDiagram = (items: TreatmentPlanItem[]): DiagramData => {
  const data: DiagramData = {
    teeth: [],
    quadrants: [],
    arches: [],
    urgencyMap: {},
    quadrantUrgency: {},
    archUrgency: {}
  };

  items.forEach(item => {
    // Add-ons don't affect the diagram directly
    if (item.itemType === 'ADDON') return;

    const urgency = item.urgency || 'ELECTIVE';

    // 1. PER TOOTH: Only colors the specific teeth chips
    if (item.unitType === 'PER_TOOTH' && item.selectedTeeth) {
      item.selectedTeeth.forEach(t => {
        if (!data.teeth.includes(t)) data.teeth.push(t);
        
        const current = data.urgencyMap[t];
        if (!current || urgencyPriority(urgency) > urgencyPriority(current)) {
          data.urgencyMap[t] = urgency;
        }
      });
    }

    // 2. PER QUADRANT: Only colors the quadrant zone (outline)
    if (item.unitType === 'PER_QUADRANT' && item.selectedQuadrants) {
      item.selectedQuadrants.forEach(q => {
        if (!data.quadrants.includes(q)) data.quadrants.push(q);
        
        const current = data.quadrantUrgency[q];
        if (!current || urgencyPriority(urgency) > urgencyPriority(current)) {
          data.quadrantUrgency[q] = urgency;
        }
      });
    }

    // 3. PER ARCH / MOUTH: Only colors the arch bar
    if ((item.unitType === 'PER_ARCH' || item.unitType === 'PER_MOUTH') && item.selectedArches) {
      item.selectedArches.forEach(a => {
        if (!data.arches.includes(a)) data.arches.push(a);

        const current = data.archUrgency[a];
        if (!current || urgencyPriority(urgency) > urgencyPriority(current)) {
          data.archUrgency[a] = urgency;
        }
      });
    }
  });

  return data;
};


// --- EXPLANATION GENERATION ---

export const generateClinicalExplanation = (items: TreatmentPlanItem[]) => {
  const procedureItems = items.filter(i => i.itemType !== 'ADDON');
  const hasUrgent = procedureItems.some(i => i.urgency === 'URGENT');
  const hasSoon = procedureItems.some(i => i.urgency === 'SOON');
  
  let intro = "";
  let benefits = [];

  if (hasUrgent) {
    intro = "Your treatment plan includes urgent procedures that address active infection, pain, or conditions that will rapidly worsen without intervention. We strongly recommend scheduling these as soon as possible to avoid complications.";
    benefits = [
      "Eliminates active infection or pain",
      "Prevents loss of additional teeth",
      "Avoids more complex and costly emergency treatment later"
    ];
  } else if (hasSoon) {
    intro = "We have identified conditions that, while not currently painful, will progress if left untreated. This plan focuses on stabilization and prevention to protect your oral health foundation.";
    benefits = [
      "Stabilizes oral health",
      "Prevents minor issues from becoming major ones",
      "Protects existing dental work"
    ];
  } else {
    intro = "This plan focuses on enhancing the function, comfort, and aesthetics of your smile. These elective procedures are designed to give you the long-term confidence and quality of life you deserve.";
    benefits = [
      "Improves chewing function and comfort",
      "Enhances smile aesthetics and confidence",
      "Provides long-lasting, durable results"
    ];
  }

  // Add specific category benefits
  if (items.some(i => i.category === 'IMPLANT')) {
    benefits.push("Restores full tooth function and prevents bone loss");
  }
  if (items.some(i => i.category === 'PERIO')) {
    benefits.push("Halts gum disease progression and reduces systemic health risks");
  }

  return { intro, benefits: benefits.slice(0, 4) }; // max 4 benefits
};

export const calculateClinicalMetrics = (items: TreatmentPlanItem[]) => {
  const procedureItems = items.filter(i => i.itemType !== 'ADDON');
  const visitCount = procedureItems.reduce((sum, item) => sum + estimateVisits(item), 0);
  const uniqueTeeth = new Set<number>();
  
  procedureItems.forEach(i => {
    if (i.selectedTeeth) i.selectedTeeth.forEach(t => uniqueTeeth.add(t));
    if (i.selectedQuadrants) i.selectedQuadrants.forEach(q => QUADRANT_MAP[q].forEach(t => uniqueTeeth.add(t)));
    if (i.selectedArches) i.selectedArches.forEach(a => (a === 'UPPER' ? TEETH_UPPER : TEETH_LOWER).forEach(t => uniqueTeeth.add(t)));
  });

  return {
    visitCount,
    teethCount: uniqueTeeth.size,
    procedureCount: procedureItems.length
  };
};

// --- CLAIM NARRATIVE GENERATION ---

export interface ClaimContext {
  procedureName: string;
  procedureCode: string;
  tooth?: string | number | null;
  diagnosisCodes: string[];
  visitDate?: string;
  surface?: string;
}

export function buildClaimNarrativeDraft(ctx: ClaimContext): string {
  const diagnosisText = ctx.diagnosisCodes.length > 0 
    ? `diagnosis ${ctx.diagnosisCodes.join(', ')}` 
    : 'dental pathology';
  
  const dateStr = ctx.visitDate 
    ? new Date(ctx.visitDate).toLocaleDateString() 
    : 'today';

  let toothStr = "";
  if (ctx.tooth) {
    const toothText = String(ctx.tooth);
    toothStr = toothText.includes(",")
      ? ` on teeth #${toothText}`
      : ` on tooth #${toothText}`;
  }
  
  const surfaceStr = ctx.surface ? `, surface ${ctx.surface}` : '';

  // 1. Initial Statement
  const sentence1 = `Patient presented with ${diagnosisText}. Completed ${ctx.procedureName}${toothStr}${surfaceStr} on ${dateStr}.`;

  // 2. Necessity Statement (Generalized based on code prefix)
  let sentence2 = "Treatment was clinically necessary to restore function and prevent disease progression.";
  const code = ctx.procedureCode || "";
  
  if (code.startsWith("D33")) {
    // Endodontic
    sentence2 = "Treatment required to resolve pulpal pathology and eliminate infection.";
  } else if (code.startsWith("D43")) {
    // Perio / SRP
    sentence2 = "Therapy required to arrest periodontal disease progression and stabilize supporting structures.";
  } else if (code.startsWith("D71") || code.startsWith("D72")) {
    // Extractions
    sentence2 = "Extraction required due to non-restorable tooth structure or pathology.";
  } else if (code.startsWith("D27")) {
    // Crowns
    sentence2 = "Full coverage restoration required due to extensive decay, fracture, or compromised tooth structure.";
  } else if (code.startsWith("D60") || code.startsWith("D62")) {
    // Implants / fixed prosthetics
    sentence2 = "Prosthetic replacement required to restore missing tooth/teeth and masticatory function.";
  }

  // 3. Outcome Statement
  const sentence3 = "Post-operative outcome was stable with no immediate complications.";

  return `${sentence1} ${sentence2} ${sentence3}`;
}

// --- PAYER REQUIREMENT RULES ENGINE ---

export type PayerId = 'GENERIC' | 'DELTA_PPO' | 'METLIFE_PPO' | 'MEDICAID_CA';

export interface PayerRequirementRule {
  payerId: PayerId;
  cdtPattern: string; // e.g. "D2740", "D27*", "D4341", "D434*"
  requiresDxCodes: boolean;
  minDxCount?: number;
  requiresNarrative: boolean;
  requiresXray?: boolean;
  requiresPhoto?: boolean;
  requiresPerioChart?: boolean;
  requiresFmxWithin36Months?: boolean;
  notesForBiller?: string;
}

const PAYER_REQUIREMENT_RULES: PayerRequirementRule[] = [
  {
    payerId: 'GENERIC',
    cdtPattern: 'D2740',
    requiresDxCodes: true,
    minDxCount: 1,
    requiresNarrative: true,
    requiresXray: true,
    notesForBiller: 'Most payers expect pre-op PA or BW plus a short clinical narrative for crowns.'
  },
  {
    payerId: 'GENERIC',
    cdtPattern: 'D4341',
    requiresDxCodes: true,
    minDxCount: 1,
    requiresNarrative: true,
    requiresPerioChart: true,
    notesForBiller: 'Scaling and root planing usually requires perio charting and clear diagnosis codes.'
  },
  {
    payerId: 'GENERIC',
    cdtPattern: 'D3330',
    requiresDxCodes: true,
    minDxCount: 1,
    requiresNarrative: true,
    requiresXray: true,
    notesForBiller: 'Endodontic therapy generally needs pre-op x-ray and clinical necessity documented.'
  }
];

export function findPayerRuleForItem(
  item: TreatmentPlanItem,
  payerId: PayerId
): PayerRequirementRule | null {
  const code = item.procedureCode || '';
  if (!code) return null;

  // 1. Prefer rules matching the specific payer
  const candidateRules = PAYER_REQUIREMENT_RULES.filter(
    r => r.payerId === payerId || r.payerId === 'GENERIC'
  );

  let bestMatch: PayerRequirementRule | null = null;
  let bestScore = -1;

  for (const rule of candidateRules) {
    const pattern = rule.cdtPattern;
    let matches = false;
    let score = 0;

    if (pattern.endsWith('*')) {
      const prefix = pattern.slice(0, -1);
      if (code.startsWith(prefix)) {
        matches = true;
        score = prefix.length; // longer prefix = more specific
      }
    } else if (pattern === code) {
      matches = true;
      score = 100; // exact match wins
    }

    if (matches) {
       // Boost score if it matches the specific payerId
       if (rule.payerId === payerId && payerId !== 'GENERIC') {
           score += 50; 
       }
       
       if (score > bestScore) {
          bestMatch = rule;
          bestScore = score;
       }
    }
  }

  return bestMatch;
}

export type ClaimRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export interface ClaimReadinessResult {
  riskLevel: ClaimRiskLevel;
  missing: string[];                 // human-readable list of missing elements
  ruleApplied?: PayerRequirementRule; // removed null
}

export function evaluateClaimReadiness(
  item: TreatmentPlanItem,
  payerId: PayerId
): ClaimReadinessResult {
  const rule = findPayerRuleForItem(item, payerId);
  const missing: string[] = [];

  const dxCount = item.diagnosisCodes?.length || 0;
  const doc = item.documentation || {};

  if (rule) {
    if (rule.requiresDxCodes && dxCount === 0) {
      missing.push('Diagnosis code (ICD-10)');
    }
    if (rule.minDxCount && dxCount < rule.minDxCount) {
      missing.push(`At least ${rule.minDxCount} diagnosis code(s)`);
    }
    if (rule.requiresNarrative && !doc.narrativeText) {
      missing.push('Clinical narrative');
    }
    if (rule.requiresXray && !doc.hasXray) {
      missing.push('Pre-op x-ray');
    }
    if (rule.requiresPhoto && !doc.hasPhoto) {
      missing.push('Intraoral photo');
    }
    if (rule.requiresPerioChart && !doc.hasPerioChart) {
      missing.push('Perio charting');
    }
    if (rule.requiresFmxWithin36Months && !doc.hasFmxWithin36Months) {
      missing.push('FMX/Pano within last 36 months');
    }
  } else {
    // No rule: generic expectations
    if (!doc.narrativeText && dxCount === 0) {
      missing.push('Diagnosis code or narrative for medical necessity');
    }
  }

  let risk: ClaimRiskLevel = 'LOW';

  if (!item.procedureStatus || item.procedureStatus !== 'COMPLETED') {
    risk = 'HIGH';
    missing.unshift('Procedure not marked completed');
  } else if (missing.length >= 2) {
    risk = 'HIGH';
  } else if (missing.length === 1) {
    risk = 'MEDIUM';
  }

  return {
    riskLevel: risk,
    missing,
    ruleApplied: rule || undefined
  };
}
