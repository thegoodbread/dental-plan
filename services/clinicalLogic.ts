import { TreatmentPlanItem, UrgencyLevel, FeeCategory } from '../types';

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
    i.unitType === 'PER_QUADRANT' && i.selectedQuadrants?.includes(quad as any)
  ).sort((a, b) => urgencyWeight(b.urgency) - urgencyWeight(a.urgency));
};

/**
 * Returns items specifically targeted at an arch (PER_ARCH or PER_MOUTH).
 */
export const getItemsOnArch = (arch: 'UPPER' | 'LOWER', items: TreatmentPlanItem[]): TreatmentPlanItem[] => {
  return items.filter(i => 
    (i.unitType === 'PER_ARCH' && i.selectedArches?.includes(arch)) ||
    (i.unitType === 'PER_MOUTH')
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
  const hasUrgent = items.some(i => i.urgency === 'URGENT');
  const hasSoon = items.some(i => i.urgency === 'SOON');
  
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
  const visitCount = items.reduce((sum, item) => sum + estimateVisits(item), 0);
  const uniqueTeeth = new Set<number>();
  
  items.forEach(i => {
    if (i.selectedTeeth) i.selectedTeeth.forEach(t => uniqueTeeth.add(t));
    if (i.selectedQuadrants) i.selectedQuadrants.forEach(q => QUADRANT_MAP[q].forEach(t => uniqueTeeth.add(t)));
    if (i.selectedArches) i.selectedArches.forEach(a => (a === 'UPPER' ? TEETH_UPPER : TEETH_LOWER).forEach(t => uniqueTeeth.add(t)));
  });

  return {
    visitCount,
    teethCount: uniqueTeeth.size,
    procedureCount: items.length
  };
};