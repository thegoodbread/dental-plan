
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
