
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
  const surfaces = ""; // Surfaces not explicitly on TreatmentPlanItem in this codebase version, defaulting empty
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
}: {
  visit: Visit;
  procedures: TreatmentPlanItem[];
  riskBullets: string;
}): GeneratedClinicalNote {
  const subjectiveLines: string[] = [];
  const objectiveLines: string[] = [];
  const assessmentLines: string[] = [];
  const treatmentLines: string[] = [];
  const planLines: string[] = [];

  // 1. Visit Header / Chief Complaint
  // If the visit has manual notes or specific type, we might init here.
  // For now, schema driven:
  if (procedures.length === 0) {
      subjectiveLines.push("Patient presents for visit. No procedures recorded.");
  }

  // 2. Loop Procedures
  procedures.forEach(item => {
    const code = item.procedureCode;
    const template = NOTE_LIBRARY[code] || NOTE_LIBRARY['DEFAULT'] || {
        subjective: "Patient presents for {{procedure}}.",
        objective: "Examined area for {{procedure}}.",
        assessment: "Need for {{procedure}}.",
        plan: "Performed {{procedure}}."
    };

    const ctx = getContextForItem(item);

    if (template.subjective) subjectiveLines.push(renderTokens(template.subjective, ctx));
    if (template.objective) objectiveLines.push(renderTokens(template.objective, ctx));
    if (template.assessment) assessmentLines.push(renderTokens(template.assessment, ctx));
    // Mapping template 'plan' to Treatment Performed section usually, 
    // but the library has 'plan' which describes the action.
    if (template.plan) treatmentLines.push(renderTokens(template.plan, ctx));
  });

  // 3. Risks & Next Steps (Plan Section)
  if (riskBullets) {
      planLines.push("--- Informed Consent & Risks ---");
      planLines.push(riskBullets);
  }
  
  planLines.push("Next Visit: Continue treatment plan / Recall.");

  return {
    subjective: subjectiveLines.join("\n"),
    objective: objectiveLines.join("\n"),
    assessment: assessmentLines.join("\n"),
    treatmentPerformed: treatmentLines.join("\n"),
    plan: planLines.join("\n")
  };
}

// Helper to convert GeneratedClinicalNote to SoapSection[]
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
