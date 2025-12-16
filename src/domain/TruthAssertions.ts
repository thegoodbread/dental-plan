
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

export function createManualAssertion(
  section: AssertionSection,
  slot: AssertionSlot,
  text: string
): TruthAssertion {
  return {
    id: makeId('manual', section, slot, Math.random().toString(36).substr(2, 5)),
    section,
    slot,
    label: text,
    source: 'manual',
    checked: true,
    sortOrder: 999, // Append to end of slot
    description: 'Manually added fact'
  };
}

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
export const SLOT_ORDER: AssertionSlot[] = [
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

export const SLOT_LABELS: Record<AssertionSlot, string> = {
  'CC': 'Chief Complaint',
  'HPI': 'History of Present Illness',
  'CLINICAL_FINDING': 'Clinical Findings',
  'RADIOGRAPHIC': 'Radiographic Findings',
  'DIAGNOSIS': 'Diagnosis',
  'INTERVENTION': 'Interventions',
  'RISK': 'Risks & Consent',
  'PLAN': 'Plan',
  'MISC': 'Miscellaneous'
};

// Inline Truth Blocks (V2.5 + V3 Slot Support)
// Converts checked truth assertions into final SOAP content.
// Runs AFTER deterministic generation.
// Visually respects slot order by grouping output paragraphs.
export function composeSectionsFromAssertions(
  generatedSections: SoapSection[],
  truth: TruthAssertionsBundle
): SoapSection[] {
  if (!truth || !truth.assertions) return generatedSections;

  const now = new Date().toISOString();

  return generatedSections.map(sec => {
    const relevant = truth.assertions.filter(a => a.section === sec.type && a.checked);

    if (relevant.length === 0) {
      return sec; // fallback to generated narrative
    }

    // Group by slot
    const bySlot: Record<string, string[]> = {};
    
    relevant.forEach(a => {
      const slot = a.slot || 'MISC';
      if (!bySlot[slot]) bySlot[slot] = [];
      
      let text = a.label;
      if (a.sentence) text = a.sentence;
      else if (a.description && a.description !== a.label) text = `${a.label} - ${a.description}`;
      
      bySlot[slot].push(text);
    });

    // Assemble paragraphs based on SLOT_ORDER
    const paragraphs: string[] = [];
    
    SLOT_ORDER.forEach(slot => {
        const lines = bySlot[slot];
        if (lines && lines.length > 0) {
            // Join items within a slot with newlines
            paragraphs.push(lines.join('\n'));
        }
    });

    // Join slots with double newlines for paragraph separation
    const body = paragraphs.join('\n\n');

    return {
      ...sec,
      content: body,
      lastEditedAt: now
    };
  });
}

// Completeness Engine V1
// Determines if slots are "complete", "empty" (required but missing), or "not_required".
export function evaluateSlotCompleteness(
  truth: TruthAssertionsBundle | undefined,
  section: SoapSectionType
): Record<AssertionSlot, 'complete' | 'empty' | 'not_required'> {
  // Default all to not_required
  const result: Record<AssertionSlot, 'complete' | 'empty' | 'not_required'> = {
    'CC': 'not_required',
    'HPI': 'not_required',
    'CLINICAL_FINDING': 'not_required',
    'RADIOGRAPHIC': 'not_required',
    'DIAGNOSIS': 'not_required',
    'INTERVENTION': 'not_required',
    'RISK': 'not_required',
    'PLAN': 'not_required',
    'MISC': 'not_required'
  };

  if (!truth || !truth.assertions) return result;

  const allAssertions = truth.assertions;
  const sectionAssertions = allAssertions.filter(a => a.section === section);
  
  // Context Inference
  const hasProcedures = allAssertions.some(a => a.source === 'procedure');
  const hasDiagnoses = allAssertions.some(a => a.slot === 'DIAGNOSIS');
  const hasRisks = allAssertions.some(a => a.slot === 'RISK');

  const checkSlot = (slot: AssertionSlot, required: boolean) => {
    if (!required) {
      result[slot] = 'not_required';
      return;
    }
    
    // It's required. Is it populated and checked?
    const slotAssertions = sectionAssertions.filter(a => a.slot === slot);
    if (slotAssertions.length === 0) {
      // Required but no assertions generated/available
      result[slot] = 'empty';
    } else {
      const hasChecked = slotAssertions.some(a => a.checked);
      result[slot] = hasChecked ? 'complete' : 'empty';
    }
  };

  // Logic per Section
  if (section === 'SUBJECTIVE') {
    checkSlot('CC', hasProcedures || sectionAssertions.some(a => a.slot === 'CC'));
    // HPI required if CC exists OR procedures exist
    checkSlot('HPI', hasProcedures || sectionAssertions.some(a => a.slot === 'CC'));
  }

  if (section === 'OBJECTIVE') {
    checkSlot('CLINICAL_FINDING', hasDiagnoses || hasProcedures);
    // Radiographic required if visit has findings (implied if assertion exists)
    const hasRadioAssertion = sectionAssertions.some(a => a.slot === 'RADIOGRAPHIC');
    checkSlot('RADIOGRAPHIC', hasRadioAssertion);
  }

  if (section === 'ASSESSMENT') {
    checkSlot('DIAGNOSIS', hasProcedures);
  }

  if (section === 'TREATMENT_PERFORMED') {
    checkSlot('INTERVENTION', hasProcedures);
  }

  if (section === 'PLAN') {
    checkSlot('RISK', hasProcedures); // Simplified rule: any procedure implies risk discussion
    checkSlot('PLAN', true); // Plan always required
  }

  return result;
}

// Section Completeness Helper
export type SectionCompleteness = 'complete' | 'partial' | 'empty';

export function getSectionCompletenessFromSlots(
  perSlot: Record<AssertionSlot, 'complete' | 'empty' | 'not_required'>
): SectionCompleteness {
  const relevantSlots = Object.values(perSlot).filter(status => status !== 'not_required');
  
  if (relevantSlots.length === 0) return 'empty'; // Or 'complete'? Instructions said empty.
  
  // If ANY relevant slot is empty, it's partial.
  if (relevantSlots.includes('empty')) return 'partial';
  
  // All relevant slots must be complete
  return 'complete';
}

// Note-Level Completeness Summary
export interface NoteCompletenessSummary {
  requiredSlots: number;    // total slots that are required across all sections
  completedSlots: number;   // how many of those are complete
  percent: number;          // 0–100, rounded to nearest integer
  perSection: Record<SoapSectionType, {
    requiredSlots: number;
    completedSlots: number;
    percent: number;
  }>;
}

// Pure function to calculate note-level completeness from assertions bundle
export function getNoteCompleteness(truth: TruthAssertionsBundle | undefined): NoteCompletenessSummary {
  const sectionOrder: SoapSectionType[] = ['SUBJECTIVE', 'OBJECTIVE', 'ASSESSMENT', 'TREATMENT_PERFORMED', 'PLAN'];
  
  const summary: NoteCompletenessSummary = {
    requiredSlots: 0,
    completedSlots: 0,
    percent: 0,
    perSection: {
      'SUBJECTIVE': { requiredSlots: 0, completedSlots: 0, percent: 0 },
      'OBJECTIVE': { requiredSlots: 0, completedSlots: 0, percent: 0 },
      'ASSESSMENT': { requiredSlots: 0, completedSlots: 0, percent: 0 },
      'TREATMENT_PERFORMED': { requiredSlots: 0, completedSlots: 0, percent: 0 },
      'PLAN': { requiredSlots: 0, completedSlots: 0, percent: 0 }
    }
  };

  if (!truth) return summary;

  sectionOrder.forEach(section => {
    const slotMap = evaluateSlotCompleteness(truth, section);
    let secReq = 0;
    let secComp = 0;

    Object.values(slotMap).forEach(status => {
      if (status !== 'not_required') {
        secReq++;
        if (status === 'complete') {
          secComp++;
        }
      }
    });

    summary.perSection[section] = {
      requiredSlots: secReq,
      completedSlots: secComp,
      percent: secReq === 0 ? 100 : Math.round((secComp / secReq) * 100)
    };

    summary.requiredSlots += secReq;
    summary.completedSlots += secComp;
  });

  if (summary.requiredSlots > 0) {
    summary.percent = Math.round((summary.completedSlots / summary.requiredSlots) * 100);
  } else {
    // If nothing required, consider it 0% started (or 100% complete? Ambiguous, sticking to 0 for "Not Started")
    summary.percent = 0;
  }

  return summary;
}

export function getNextMissingSlot(truth: TruthAssertionsBundle | undefined): { section: SoapSectionType, slot: AssertionSlot } | null {
  if (!truth) return null;
  const sectionOrder: SoapSectionType[] = ['SUBJECTIVE', 'OBJECTIVE', 'ASSESSMENT', 'TREATMENT_PERFORMED', 'PLAN'];
  
  for (const section of sectionOrder) {
    const slotMap = evaluateSlotCompleteness(truth, section);
    for (const slot of SLOT_ORDER) {
      if (slotMap[slot] === 'empty') {
        return { section, slot };
      }
    }
  }
  return null;
}
