
// NoteComposer.ts
// Pure logic for generating Visit-Level Clinical Notes

import { NOTE_LIBRARY, ProcedureSoapTemplate } from './NoteLibrary';
import { TreatmentPlanItem, Visit } from '../types';
import { SoapSection } from './dentalTypes';

export interface GeneratedClinicalNote {
  subjective: string;
  objective: string;
  assessment: string;
  treatmentPerformed: string;
  plan: string;
}

// Helper to render tokens
function renderTokens(text: string, ctx: Record<string, string>): string {
  return text.replace(/{{\s*(\w+)\s*}}/g, (match, token) => {
    return ctx[token] || `[${token}]`;
  });
}

function getContextForItem(item: TreatmentPlanItem): Record<string, string> {
  const tooth = item.selectedTeeth?.join(", ") || "";
  const surfaces = (item.surfaces || []).join("");
  const quadrant = item.selectedQuadrants?.join(", ") || "";
  const arch = item.selectedArches?.join(", ") || "";
  
  return {
    tooth,
    surfaces,
    quadrant,
    arch,
    procedure: item.procedureName
  };
}

export function composeVisitNote({
  visit,
  procedures,
  riskBullets,
  visitType,
  chiefComplaint,
  hpi,
  radiographicFindings,
  diagnosisCodes
}: {
  visit: Visit;
  procedures: TreatmentPlanItem[];
  riskBullets: string;
  visitType?: string;
  chiefComplaint?: string;
  hpi?: string;
  radiographicFindings?: string;
  diagnosisCodes?: string[];
}): GeneratedClinicalNote {
  const subjectiveLines: string[] = [];
  const objectiveLines: string[] = [];
  const assessmentLines: string[] = [];
  const treatmentLines: string[] = [];
  const planLines: string[] = [];

  // 1. Visit Header / Chief Complaint / HPI
  if (chiefComplaint) subjectiveLines.push(`Chief Complaint: ${chiefComplaint}.`);
  if (hpi) subjectiveLines.push(`HPI: ${hpi}`);

  // If no procedures AND no CC, fallback generic
  if (procedures.length === 0 && !chiefComplaint) {
      subjectiveLines.push("Patient presents for visit. No procedures recorded today.");
  }

  // 2. Loop Procedures
  procedures.forEach(item => {
    const code = item.procedureCode;
    const template = NOTE_LIBRARY[code] || NOTE_LIBRARY['DEFAULT'];
    const ctx = getContextForItem(item);

    if (template) {
        if (template.subjective) subjectiveLines.push(renderTokens(template.subjective, ctx));
        if (template.objective) objectiveLines.push(renderTokens(template.objective, ctx));
        if (template.assessment) assessmentLines.push(renderTokens(template.assessment, ctx));
        // Mapping template 'plan' to Treatment Performed section
        if (template.plan) treatmentLines.push(renderTokens(template.plan, ctx));
    } else {
        // Fallback if no template found for code
        subjectiveLines.push(`Patient presents for ${item.procedureName}.`);
        treatmentLines.push(`Performed ${item.procedureName}.`);
    }
  });

  // 3. Inject Radiographic Findings into Objective (After procedure objectives)
  if (radiographicFindings) {
    objectiveLines.push(`Radiographic findings: ${radiographicFindings}.`);
  }

  // 4. Inject Diagnoses into Assessment
  if (diagnosisCodes?.length) {
    assessmentLines.push(`Associated diagnoses (ICD-10): ${diagnosisCodes.join(", ")}.`);
  }

  // 5. Risks & Next Steps (Plan Section)
  if (riskBullets) {
      planLines.push("--- Informed Consent & Risks ---");
      planLines.push(riskBullets);
  }
  
  planLines.push("Next Visit: Continue treatment plan / Recall.");

  return {
    subjective: subjectiveLines.join("\n\n"),
    objective: objectiveLines.join("\n\n"),
    assessment: assessmentLines.join("\n\n"),
    treatmentPerformed: treatmentLines.join("\n\n"),
    plan: planLines.join("\n")
  };
}

// Helper to update EXISTING SoapSection objects while preserving IDs
export function mapNoteToExistingSections(
  note: GeneratedClinicalNote,
  existing: SoapSection[]
): SoapSection[] {
  const now = new Date().toISOString();
  return existing.map(sec => {
    let content = sec.content;
    switch (sec.type) {
      case 'SUBJECTIVE': content = note.subjective; break;
      case 'OBJECTIVE': content = note.objective; break;
      case 'ASSESSMENT': content = note.assessment; break;
      case 'TREATMENT_PERFORMED': content = note.treatmentPerformed; break;
      case 'PLAN': content = note.plan; break;
    }
    return { ...sec, content, lastEditedAt: now };
  });
}

// Legacy Helper (Deprecated in favor of mapNoteToExistingSections)
export function mapNoteToSections(note: GeneratedClinicalNote): SoapSection[] {
    const now = new Date().toISOString();
    return [
        { id: 's-sub', type: 'SUBJECTIVE', title: 'Subjective', content: note.subjective, lastEditedAt: now },
        { id: 's-obj', type: 'OBJECTIVE', title: 'Objective', content: note.objective, lastEditedAt: now },
        { id: 's-ass', type: 'ASSESSMENT', title: 'Assessment', content: note.assessment, lastEditedAt: now },
        { id: 's-tx', type: 'TREATMENT_PERFORMED', title: 'Treatment Performed', content: note.treatmentPerformed, lastEditedAt: now },
        { id: 's-plan', type: 'PLAN', title: 'Plan', content: note.plan, lastEditedAt: now },
    ];
}
