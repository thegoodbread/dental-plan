
import { TreatmentPlanItem, Visit } from '../types';
import { AssignedRisk, SoapSection, SoapSectionType } from './dentalTypes';
import { getCodeFamiliesForCode } from './codeFamilies';

export type AssertionSection =
  | 'SUBJECTIVE'
  | 'OBJECTIVE'
  | 'ASSESSMENT'
  | 'TREATMENT_PERFORMED'
  | 'PLAN';

// V3: Slot-Based Model Preparation
export type AssertionSlot =
  | 'CC'
  | 'HPI'
  | 'CLINICAL_FINDING'
  | 'RADIOGRAPHIC'
  | 'DIAGNOSIS'
  | 'INTERVENTION'
  | 'RISK'
  | 'PLAN'
  | 'MISC';

export interface TruthAssertion {
  id: string;                     // stable per visit+concept
  section: AssertionSection;      // which SOAP quadrant it belongs to
  slot: AssertionSlot;            // V3: granular slot for sorting and future UI grouping
  label: string;                  // human readable short label (e.g. "Crown prep #3")
  description?: string;           // longer description if needed
  sentence?: string;              // Optional override for narrative generation
  source: 'procedure' | 'risk' | 'exam' | 'manual';
  procedureId?: string;           // link to TreatmentPlanItem.id if relevant
  code?: string;                  // CDT or ICD
  tooth?: string;                 // e.g. "3", "19", "UR"
  surfaces?: string;              // e.g. "MOD"
  checked: boolean;               // doctor has confirmed this is true for this visit
  sortOrder: number;
}

export interface TruthAssertionsBundle {
  visitId: string;
  assertions: TruthAssertion[];
  lastGeneratedAt: string;
}

// --- Helper to build ID ---
const makeId = (prefix: string, ...parts: string[]) => 
  `${prefix}_${parts.join('_').replace(/[^a-zA-Z0-9]/g, '')}`;

/**
 * Pure function to generate a bundle of truth assertions from visit data.
 * This effectively "deconstructs" the visit into atomic facts.
 */
export function generateTruthAssertionsForVisit(
  visit: Visit,
  procedures: TreatmentPlanItem[],
  risks: AssignedRisk[]
): TruthAssertionsBundle {
  const assertions: TruthAssertion[] = [];
  let sortCounter = 0;

  const add = (
    section: AssertionSection, 
    label: string, 
    source: TruthAssertion['source'],
    slot: AssertionSlot, // Slot is now required for V3 compliance
    extras: Partial<TruthAssertion> = {}
  ) => {
    assertions.push({
      id: makeId(section, label, extras.procedureId || '', extras.code || ''),
      section,
      slot,
      label,
      source,
      checked: true, // Default to true for auto-generated facts
      sortOrder: sortCounter++,
      ...extras
    });
  };

  // 1. SUBJECTIVE
  // Basic Visit Facts
  if (visit.chiefComplaint) {
    add('SUBJECTIVE', `CC: ${visit.chiefComplaint}`, 'manual', 'CC');
  } else if (procedures.length > 0) {
    add('SUBJECTIVE', 'Patient presents for scheduled treatment', 'exam', 'CC');
  }

  if (visit.hpi) {
    add('SUBJECTIVE', `HPI: ${visit.hpi}`, 'manual', 'HPI');
  }

  // Procedure-driven Subjective assertions
  procedures.forEach(p => {
    const loc = p.selectedTeeth?.join(',') || p.selectedQuadrants?.join(',') || '';
    add('SUBJECTIVE', `Presents for ${p.procedureName} ${loc ? `(${loc})` : ''}`, 'procedure', 'CC', {
      procedureId: p.id,
      code: p.procedureCode,
      tooth: loc
    });
  });

  // 2. OBJECTIVE
  if (visit.radiographicFindings) {
    add('OBJECTIVE', `Radiographs: ${visit.radiographicFindings}`, 'exam', 'RADIOGRAPHIC');
  }

  procedures.forEach(p => {
    const loc = p.selectedTeeth?.join(',') || p.selectedQuadrants?.join(',') || '';
    const desc = p.procedureName; // Placeholder for more detailed clinical findings if we had them in item
    add('OBJECTIVE', `${desc} required ${loc ? `on ${loc}` : ''}`, 'procedure', 'CLINICAL_FINDING', {
      procedureId: p.id,
      code: p.procedureCode,
      tooth: loc,
      description: `Clinical indication verified for ${p.procedureCode}`
    });
  });

  // 3. ASSESSMENT
  // Extract unique diagnoses
  const diagnosisMap = new Map<string, string[]>(); // Code -> Procedures
  procedures.forEach(p => {
    if (p.diagnosisCodes) {
      p.diagnosisCodes.forEach(dx => {
        const existing = diagnosisMap.get(dx) || [];
        existing.push(p.procedureName);
        diagnosisMap.set(dx, existing);
      });
    }
  });

  diagnosisMap.forEach((procNames, dxCode) => {
    add('ASSESSMENT', `Diagnosis: ${dxCode}`, 'exam', 'DIAGNOSIS', {
      code: dxCode,
      description: `Associated with: ${[...new Set(procNames)].join(', ')}`
    });
  });

  if (diagnosisMap.size === 0 && procedures.length > 0) {
    add('ASSESSMENT', 'Diagnosis pending / See clinical notes', 'manual', 'DIAGNOSIS');
  }

  // 4. TREATMENT PERFORMED
  procedures.forEach(p => {
    const loc = p.selectedTeeth?.join(',') || p.selectedQuadrants?.join(',') || '';
    const family = getCodeFamiliesForCode(p.procedureCode)[0] || 'GENERAL';
    
    let detail = "Procedure completed according to standard of care.";
    if (family === 'ENDO') detail = "Canals instrumented and obturated.";
    if (family === 'EXTRACTION') detail = "Tooth extracted, hemostasis achieved.";
    if (family === 'DIRECT_RESTORATIVE') detail = "Decay removed, restoration placed and polished.";
    
    add('TREATMENT_PERFORMED', `Completed: ${p.procedureName} ${loc}`, 'procedure', 'INTERVENTION', {
      procedureId: p.id,
      code: p.procedureCode,
      tooth: loc,
      description: detail
    });
  });

  // 5. PLAN
  // Risks
  risks.filter(r => r.isActive).forEach(r => {
    add('PLAN', `Risk Discussed: ${r.titleSnapshot}`, 'risk', 'RISK', {
      description: r.bodySnapshot
    });
  });

  add('PLAN', 'Next Visit: Recall / Next Phase', 'manual', 'PLAN');
  add('PLAN', 'Post-operative instructions provided', 'manual', 'PLAN');

  return {
    visitId: visit.id,
    assertions,
    lastGeneratedAt: new Date().toISOString()
  };
}

// V3 Slot Sorting Order
const SLOT_ORDER: AssertionSlot[] = [
  'CC',
  'HPI',
  'CLINICAL_FINDING',
  'RADIOGRAPHIC',
  'DIAGNOSIS',
  'INTERVENTION',
  'RISK',
  'PLAN',
  'MISC'
];

// Inline Truth Blocks (V2.5 + V3 Slot Support)
// Converts checked truth assertions into final SOAP content.
// Runs AFTER deterministic generation.
export function composeSectionsFromAssertions(
  generatedSections: SoapSection[],
  truth: TruthAssertionsBundle
): SoapSection[] {
  if (!truth || !truth.assertions) return generatedSections;

  const now = new Date().toISOString();

  return generatedSections.map(sec => {
    const relevant = truth.assertions
      .filter(a => a.section === sec.type && a.checked)
      .sort((a, b) => {
        // V3: Sort by Slot first, then by existing SortOrder
        const slotA = SLOT_ORDER.indexOf(a.slot || 'MISC');
        const slotB = SLOT_ORDER.indexOf(b.slot || 'MISC');
        if (slotA !== slotB) return slotA - slotB;
        
        return a.sortOrder - b.sortOrder;
      });

    if (relevant.length === 0) {
      return sec; // fallback to generated narrative
    }

    // Render sentences or labels
    const body = relevant
      .map(a => {
          if (a.sentence) return a.sentence;
          if (a.description && a.description !== a.label) return `${a.label} - ${a.description}`;
          return a.label;
      })
      .filter(Boolean)
      .join('\n'); // Single newline for list-like effect, or \n\n for paragraphs

    return {
      ...sec,
      content: body,
      lastEditedAt: now
    };
  });
}
