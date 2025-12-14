
import { NOTE_LIBRARY, ProcedureSoapTemplate } from './NoteLibrary';
import { TreatmentPlanItem, Visit } from '../types';
import { AssignedRisk, SoapSection, SoapSectionType } from './dentalTypes';
import { getCodeFamiliesForCode } from './codeFamilies';
import { TruthAssertionsBundle } from './TruthAssertions';

export interface GeneratedClinicalNote {
  subjective: string;
  objective: string;
  assessment: string;
  treatmentPerformed: string;
  plan: string;
}

// Helper to render tokens
function renderTokens(text: string, ctx: Record<string, string>): string {
  if (!text) return "";
  return text.replace(/{{\s*(\w+)\s*}}/g, (match, token) => {
    return ctx[token] || `[${token}]`;
  });
}

function getContextForItem(item: TreatmentPlanItem): Record<string, string> {
  const tooth = (item.selectedTeeth || []).join(", ");
  const surfaces = (item.surfaces || []).join("");
  const quadrant = (item.selectedQuadrants || []).join(", ");
  const arch = (item.selectedArches || []).join(", ");
  
  return {
    tooth,
    surfaces,
    quadrant,
    arch,
    procedure: item.procedureName || "Procedure"
  };
}

// --- Improvement: Helper for micro-labels ---
function getProcedureShortLabel(name: string): string {
  const n = name.toLowerCase();
  if (n.includes('crown')) return 'Crown';
  if (n.includes('composite') || n.includes('resin')) return 'Composite';
  if (n.includes('root canal') || n.includes('endo')) return 'RCT';
  if (n.includes('extraction')) return 'Ext';
  if (n.includes('implant')) return 'Implant';
  if (n.includes('scaling') || n.includes('srp')) return 'SRP';
  if (n.includes('prophy')) return 'Prophy';
  if (n.includes('exam')) return 'Exam';
  if (n.includes('denture')) return 'Denture';
  if (n.includes('bridge')) return 'Bridge';
  return 'Proc';
}

/**
 * Pure, deterministic function to generate SOAP sections for a visit.
 * Consolidates all logic for text generation.
 */
export function generateSoapSectionsForVisit(
  visit: Visit,
  procedures: TreatmentPlanItem[],
  risks: AssignedRisk[],
  existingSections: SoapSection[]
): { note: GeneratedClinicalNote; sections: SoapSection[] } {
  
  // 1. Build riskBullets string from active risks (sorted for determinism)
  const riskBullets = risks
    .filter(r => r.isActive)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map(r => `• ${r.bodySnapshot}`)
    .join('\n');

  // 2. Collect unique diagnosisCodes from procedures
  const diagnosisCodes: string[] = [];
  procedures.forEach(p => {
      if (p.diagnosisCodes) diagnosisCodes.push(...p.diagnosisCodes);
  });
  const uniqueDx = Array.from(new Set(diagnosisCodes)).sort();

  // 3. Compose the note content
  const note = composeVisitNote({
      visit,
      procedures,
      riskBullets,
      chiefComplaint: visit.chiefComplaint,
      hpi: visit.hpi,
      radiographicFindings: visit.radiographicFindings,
      diagnosisCodes: uniqueDx
  });

  // 4. Map content to existing section IDs
  const sections = mapNoteToExistingSections(note, existingSections);

  return { note, sections };
}

/**
 * NEW: Generates a note specifically from a TruthAssertionsBundle.
 * This is the "Truth Block" path that will eventually replace the direct procedure loop.
 */
export function composeVisitNoteFromAssertions(
  bundle: TruthAssertionsBundle,
  options?: { chiefComplaint?: string; hpi?: string; radiographicFindings?: string }
): GeneratedClinicalNote {
  
  const getLines = (section: string) => 
    bundle.assertions
      .filter(a => a.section === section && a.checked)
      .sort((a,b) => a.sortOrder - b.sortOrder)
      .map(a => {
         // If description is present, append it
         if (a.description && a.description !== a.label) {
             return `${a.label}\n${a.description}`;
         }
         return a.label;
      })
      .join('\n\n');

  return {
    subjective: getLines('SUBJECTIVE'),
    objective: getLines('OBJECTIVE'),
    assessment: getLines('ASSESSMENT'),
    treatmentPerformed: getLines('TREATMENT_PERFORMED'),
    plan: getLines('PLAN')
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

  // Sort procedures to ensure deterministic output order
  // Sort by: Code -> Tooth -> Surfaces -> ID
  const sortedProcedures = [...procedures].sort((a, b) => {
    if (a.procedureCode !== b.procedureCode) return a.procedureCode.localeCompare(b.procedureCode);
    const aTooth = (a.selectedTeeth || []).sort().join(',');
    const bTooth = (b.selectedTeeth || []).sort().join(',');
    if (aTooth !== bTooth) return aTooth.localeCompare(bTooth);
    
    const aSurf = (a.surfaces || []).sort().join('');
    const bSurf = (b.surfaces || []).sort().join('');
    if (aSurf !== bSurf) return aSurf.localeCompare(bSurf);

    return a.id.localeCompare(b.id);
  });

  // 1. Visit Header / Chief Complaint / HPI
  if (chiefComplaint) subjectiveLines.push(`Chief Complaint: ${chiefComplaint}`);
  if (hpi) subjectiveLines.push(`HPI: ${hpi}`);

  // If no procedures AND no CC, fallback generic
  if (procedures.length === 0 && !chiefComplaint) {
      subjectiveLines.push("Patient presents for visit. No procedures recorded today.");
  }

  // 2. Loop Procedures with Grouping
  const seenGroups = new Set<string>();

  sortedProcedures.forEach(item => {
    // Detect Code Family (safe fallback if empty)
    const families = getCodeFamiliesForCode(item.procedureCode || '');
    const primaryFamily = families[0] || 'UNCLASSIFIED';
    
    const tooth = (item.selectedTeeth || []).sort().join(',');
    const surfaces = (item.surfaces || []).sort().join('');
    
    // Group Key: Family + Code + Tooth + Surfaces
    // We group identical procedure codes on the same tooth/surface to avoid spam.
    const groupKey = `${primaryFamily}|${item.procedureCode}|${tooth}|${surfaces}`;

    if (seenGroups.has(groupKey)) {
        return; // Skip duplicate narrative block for same procedure group
    }
    seenGroups.add(groupKey);

    const code = item.procedureCode;
    // Strict fallback: use specific code, or DEFAULT if code not found
    const template: ProcedureSoapTemplate = NOTE_LIBRARY[code] || NOTE_LIBRARY['DEFAULT'] || {
        subjective: `Patient presents for ${item.procedureName}.`,
        objective: `${item.procedureName} required.`,
        assessment: `Need for ${item.procedureName}.`,
        plan: `Performed ${item.procedureName}.`
    };
    
    const ctx = getContextForItem(item);

    // --- Improvement: Micro-labels for readability ---
    let location = '';
    if (item.selectedTeeth?.length) location = `#${item.selectedTeeth.join(',')}`;
    else if (item.selectedQuadrants?.length) location = item.selectedQuadrants.join(',');
    else if (item.selectedArches?.length) location = item.selectedArches.join(',');
    
    const shortLabel = getProcedureShortLabel(item.procedureName);
    const headerLine = `[${shortLabel} ${location}]`.trim().replace(/\[\s+/, '[');

    const appendWithLabel = (target: string[], text: string) => {
        if (!text) return;
        // Check if this is the first item or if we need separation
        // Adding a newline and the micro-label
        const entry = `${headerLine}\n${text}`;
        target.push(entry);
    };

    if (template.subjective) appendWithLabel(subjectiveLines, renderTokens(template.subjective, ctx));
    if (template.objective) appendWithLabel(objectiveLines, renderTokens(template.objective, ctx));
    if (template.assessment) appendWithLabel(assessmentLines, renderTokens(template.assessment, ctx));
    // NOTE: 'plan' in template often maps to what was DONE (Treatment Performed)
    // We will put it in Treatment Performed section to align with typical SOAP usage for past visits
    if (template.plan) appendWithLabel(treatmentLines, renderTokens(template.plan, ctx));
  });

  // 3. Inject Radiographic Findings into Objective
  if (radiographicFindings) {
    objectiveLines.push(`[Radiographs]\n${radiographicFindings}`);
  }

  // 4. Inject Diagnoses into Assessment
  if (diagnosisCodes && diagnosisCodes.length > 0) {
    assessmentLines.push(`[Diagnoses]\nICD-10: ${diagnosisCodes.join(", ")}`);
  }

  // 5. Plan Section (Future / Next Steps / Risks)
  // This is the "P" in SOAP - typically next visit, referrals, home care, risks.
  if (riskBullets) {
      planLines.push("Informed Consent & Risks Discussed:");
      planLines.push(riskBullets);
  }
  
  planLines.push("Next Visit: Continue treatment plan / Recall.");

  // Join with double newlines for clear separation between blocks
  return {
    subjective: subjectiveLines.join("\n\n").trim(),
    objective: objectiveLines.join("\n\n").trim(),
    assessment: assessmentLines.join("\n\n").trim(),
    treatmentPerformed: treatmentLines.join("\n\n").trim(), 
    plan: planLines.join("\n\n").trim()
  };
}

// Helper to update EXISTING SoapSection objects while preserving IDs
export function mapNoteToExistingSections(
  note: GeneratedClinicalNote,
  existing: SoapSection[]
): SoapSection[] {
  const now = new Date().toISOString();
  
  // Ensure we return a NEW array to trigger React updates
  return existing.map(sec => {
    let newContent = sec.content; // Default to keeping existing
    
    // We overwrite content if generating fresh.
    // Ensure mapping aligns with SoapSectionType enum.
    switch (sec.type) {
      case 'SUBJECTIVE': 
        newContent = note.subjective; 
        break;
      case 'OBJECTIVE': 
        newContent = note.objective; 
        break;
      case 'ASSESSMENT': 
        newContent = note.assessment; 
        break;
      case 'TREATMENT_PERFORMED': 
        newContent = note.treatmentPerformed; 
        break;
      case 'PLAN': 
        newContent = note.plan; 
        break;
    }
    
    // Safety check: if undefined/null, make empty string
    if (newContent === undefined || newContent === null) {
        newContent = "";
    }

    return {
      ...sec,
      content: newContent,
      lastEditedAt: now
    };
  });
}
