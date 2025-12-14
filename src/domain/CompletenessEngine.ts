import { TreatmentPlanItem, Visit } from '../types';
import { AssignedRisk, SoapSection } from './dentalTypes';

export interface CompletenessResult {
  score: number;
  missing: string[];
  warnings: string[];
}

// Helpers
const hasCode = (item: TreatmentPlanItem, prefix: string) => item.procedureCode.toUpperCase().startsWith(prefix);

const isRestorative = (item: TreatmentPlanItem) => hasCode(item, 'D2');
const isCrown = (item: TreatmentPlanItem) => hasCode(item, 'D27') || hasCode(item, 'D29'); // Indirect
const isEndo = (item: TreatmentPlanItem) => hasCode(item, 'D3');
const isExtraction = (item: TreatmentPlanItem) => hasCode(item, 'D7');
const isPerio = (item: TreatmentPlanItem) => hasCode(item, 'D4');

// Extension Points for Future Families
const isExam = (item: TreatmentPlanItem) => hasCode(item, 'D01');
const isRadiograph = (item: TreatmentPlanItem) => hasCode(item, 'D02');
const isProphy = (item: TreatmentPlanItem) => hasCode(item, 'D11');
const isFluoride = (item: TreatmentPlanItem) => hasCode(item, 'D12');
const isSealant = (item: TreatmentPlanItem) => hasCode(item, 'D135');
const isImplant = (item: TreatmentPlanItem) => hasCode(item, 'D60');
const isGraft = (item: TreatmentPlanItem) => hasCode(item, 'D79');
const isSedation = (item: TreatmentPlanItem) => hasCode(item, 'D92');

export function evaluateVisitCompleteness(
  visit: Visit,
  procedures: TreatmentPlanItem[],
  soapSections: SoapSection[],
  risks: AssignedRisk[]
): CompletenessResult {
  const missing: string[] = [];
  const warnings: string[] = [];
  let requirementsMet = 0;
  let totalRequirements = 0;

  const check = (condition: boolean, msg: string, isWarning = false) => {
    if (!isWarning) totalRequirements++;
    if (condition) {
      if (!isWarning) requirementsMet++;
    } else {
      if (isWarning) warnings.push(msg);
      else missing.push(msg);
    }
  };

  // Helper for text scanning
  const objectiveText = soapSections.find(s => s.type === 'OBJECTIVE')?.content?.toLowerCase() || "";
  const planText = soapSections.find(s => s.type === 'PLAN')?.content?.toLowerCase() || "";
  const subjectiveText = soapSections.find(s => s.type === 'SUBJECTIVE')?.content?.toLowerCase() || "";
  const allSoapText = (subjectiveText + objectiveText + planText);

  // 1. Visit Level Requirements
  check(!!visit.chiefComplaint, "Chief Complaint (CC) is required.");
  check(!!visit.hpi, "History of Present Illness (HPI) is required.");
  
  const hasProcedures = procedures.length > 0;
  const hasNoProcNote = soapSections.some(s => s.content && s.content.toLowerCase().includes("no procedures performed"));
  check(hasProcedures || hasNoProcNote, "Document procedures or note 'No procedures performed'.");

  // New Visit Level Checks
  const hasRadiographs = procedures.some(isRadiograph);
  if (hasRadiographs) {
      check(!!visit.radiographicFindings, "Radiographic findings required when billing radiographs.");
      
      const hasAnyDx = procedures.some(p => p.diagnosisCodes && p.diagnosisCodes.length > 0);
      if (!!visit.radiographicFindings && !hasAnyDx) {
          warnings.push("Radiographic findings present but no diagnosis codes linked.");
      }
  }

  // 2. Procedure Level Requirements
  procedures.forEach(p => {
    const code = p.procedureCode;
    
    // Tighter Risk Checking: Risks must be linked to this specific procedure code
    // Uses cdtCodesSnapshot on the assigned risk to verify match.
    const activeRisksForProcedure = risks.filter(r => 
        r.isActive && 
        r.cdtCodesSnapshot?.some(snapshotCode => snapshotCode.toUpperCase() === code.toUpperCase())
    );
    
    // Restorative (D2xxx)
    if (isRestorative(p)) {
       check(!!p.selectedTeeth && p.selectedTeeth.length > 0, `${code}: Tooth number missing.`);
       check(!!p.surfaces && p.surfaces.length > 0, `${code}: Surfaces missing.`);
       check(!!p.diagnosisCodes && p.diagnosisCodes.length >= 1, `${code}: Diagnosis code required.`);
       check(!!visit.radiographicFindings, `${code}: Radiographic findings required.`);
       check(activeRisksForProcedure.length > 0, `${code}: At least one risk linked to this procedure must be assigned.`);
    }

    // Crown / Indirect (D27xx)
    if (isCrown(p)) {
        check(!!visit.radiographicFindings, `${code}: Radiographic text required.`);
        check(!!p.diagnosisCodes && p.diagnosisCodes.length >= 1, `${code}: ICD-10 code required.`);
        check(activeRisksForProcedure.length > 0, `${code}: Consent risks linked to this procedure required.`);
        check(!!p.documentation?.hasXray, `${code}: Pre-op X-ray flag missing.`);
    }

    // Endo (D3xxx)
    if (isEndo(p)) {
        const hasEndoTests = (subjectiveText + objectiveText).match(/vitality|percussion|cold|thermal|palpation|symptoms/);
        check(!!hasEndoTests, `${code}: Vitality/Percussion tests or symptoms documented.`);
        check(!!visit.radiographicFindings, `${code}: Radiographic findings required.`);
        check(!!p.diagnosisCodes && p.diagnosisCodes.length >= 1, `${code}: ICD-10 required.`);
        check(activeRisksForProcedure.length > 0, `${code}: Risk assigned linked to Endo.`);
    }

    // Extractions (D7xxx)
    // Note: D7 includes grafts (D79xx). Basic surgical requirements apply to both.
    if (isExtraction(p)) {
        check(!!p.documentation?.hasXray, `${code}: Radiograph flag required.`);
        check(!!p.diagnosisCodes && p.diagnosisCodes.length >= 1, `${code}: Diagnosis code required.`);
        check(activeRisksForProcedure.length > 0, `${code}: Surgical risks required.`);
    }

    // Perio (D4xxx)
    if (isPerio(p)) {
        check(!!p.documentation?.hasPerioChart, `${code}: Perio chart flag required.`);
        check(!!p.diagnosisCodes && p.diagnosisCodes.length >= 1, `${code}: Diagnosis code required.`);
        if (!visit.radiographicFindings) {
            warnings.push(`${code}: Radiographic findings encouraged.`);
        }
    }

    // Implants (D6xxx)
    if (isImplant(p)) {
        check(!!p.diagnosisCodes && p.diagnosisCodes.length >= 1, `${code}: Diagnosis code required for implant.`);
        check(activeRisksForProcedure.length > 0, `${code}: Implant consent risk required.`);
        if (!visit.radiographicFindings) {
            warnings.push(`${code}: Radiographic findings missing for implant.`);
        }
    }

    // Sedation (D92xx)
    if (isSedation(p)) {
        check(activeRisksForProcedure.length > 0, `${code}: Sedation consent risk required.`);
        check(!!p.diagnosisCodes && p.diagnosisCodes.length >= 1, `${code}: Diagnosis code required.`);
        
        const hasVitalsWords = (objectiveText + planText).match(/sedation|monitor|vitals|pulse|blood pressure|bp|o2/);
        if (!hasVitalsWords) {
            warnings.push(`${code}: Vitals/Monitoring not found in Objective/Plan.`);
        }
    }

    // --- EXTENDED LOGIC ---

    // Exams (D01xx)
    if (isExam(p)) {
        check(!!p.diagnosisCodes && p.diagnosisCodes.length >= 1, `${code}: Diagnosis code required.`);
        if (code.toUpperCase() === 'D0140') {
             check(!!visit.hpi, `${code}: HPI required for limited exam.`);
        }
        if (hasRadiographs && !visit.radiographicFindings) {
             warnings.push(`${code}: Radiographs taken but no findings documented.`);
        }
    }

    // Preventive (Prophy, Fluoride, Sealants)
    if (isProphy(p) || isFluoride(p) || isSealant(p)) {
        if (!p.diagnosisCodes || p.diagnosisCodes.length === 0) {
             warnings.push(`${code}: Diagnosis code recommended (e.g. Z98.810 or Gingivitis).`);
        }
        
        if (!visit.chiefComplaint) {
             const hasRecallWords = allSoapText.match(/recall|maintenance|preventive|cleaning|checkup/);
             if (!hasRecallWords) {
                 warnings.push(`${code}: Routine visit? 'Recall' or 'Maintenance' not found in note.`);
             }
        }
    }
    
    // Grafts (D79xx)
    if (isGraft(p)) {
        const hasGraftWords = allSoapText.match(/graft|membrane|bone|sinus|socket/);
        if (!hasGraftWords) {
            warnings.push(`${code}: Narrative missing graft details (material, site).`);
        }
    }
  });

  const score = totalRequirements === 0 ? 100 : Math.round((requirementsMet / totalRequirements) * 100);

  return { score, missing, warnings };
}