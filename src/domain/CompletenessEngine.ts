
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
const isImplant = (item: TreatmentPlanItem) => hasCode(item, 'D6');
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

  // 1. Visit Level Requirements
  check(!!visit.chiefComplaint, "Chief Complaint (CC) is required.");
  check(!!visit.hpi, "History of Present Illness (HPI) is required.");
  
  const hasProcedures = procedures.length > 0;
  const hasNoProcNote = soapSections.some(s => s.content && s.content.toLowerCase().includes("no procedures performed"));
  check(hasProcedures || hasNoProcNote, "Document procedures or note 'No procedures performed'.");

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
        const subjectiveContent = soapSections.find(s => s.type === 'SUBJECTIVE')?.content || "";
        const objectiveContent = soapSections.find(s => s.type === 'OBJECTIVE')?.content || "";
        const hasEndoTests = (subjectiveContent + objectiveContent).toLowerCase().match(/vitality|percussion|cold|thermal|palpation|symptoms/);
        check(!!hasEndoTests, `${code}: Vitality/Percussion tests or symptoms documented.`);
        check(!!visit.radiographicFindings, `${code}: Radiographic findings required.`);
        check(!!p.diagnosisCodes && p.diagnosisCodes.length >= 1, `${code}: ICD-10 required.`);
        check(activeRisksForProcedure.length > 0, `${code}: Risk assigned linked to Endo.`);
    }

    // Extractions (D7xxx)
    if (isExtraction(p)) {
        check(!!p.documentation?.hasXray, `${code}: Radiograph flag required.`);
        check(!!p.diagnosisCodes && p.diagnosisCodes.length >= 1, `${code}: Diagnosis code required.`);
        check(activeRisksForProcedure.length > 0, `${code}: Surgical risks required linked to Extraction.`);
    }

    // Perio (D4xxx)
    if (isPerio(p)) {
        check(!!p.documentation?.hasPerioChart, `${code}: Perio chart flag required.`);
        check(!!p.diagnosisCodes && p.diagnosisCodes.length >= 1, `${code}: Diagnosis code required.`);
        if (!visit.radiographicFindings) {
            warnings.push(`${code}: Radiographic findings encouraged.`);
        }
    }

    // Implants (D6xxx) - Scaffolding
    if (isImplant(p)) {
        check(!!p.diagnosisCodes && p.diagnosisCodes.length >= 1, `${code}: Diagnosis code required for implant.`);
        check(activeRisksForProcedure.length > 0, `${code}: Implant consent risk required.`);
        // Future: Check for Lot #, Torque, etc.
    }

    // Sedation (D92xx) - Scaffolding
    if (isSedation(p)) {
        check(activeRisksForProcedure.length > 0, `${code}: Sedation consent risk required.`);
        // Future: Check for start/stop times, vitals log.
    }
  });

  const score = totalRequirements === 0 ? 100 : Math.round((requirementsMet / totalRequirements) * 100);

  return { score, missing, warnings };
}
