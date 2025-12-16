
import { TruthAssertionsBundle } from './TruthAssertions';

export interface ReadinessProcedure {
  id: string;
  cdtCode: string;
  label: string;
  tooth?: string;
  surfaces?: string[];
  quadrant?: string;
  isCompleted: boolean;
}

export interface ReadinessDiagnosis {
  procedureId: string;
  icd10: string;
}

export interface ReadinessEvidence {
  procedureId?: string;
  type: string; // 'pre_op_xray', 'intraoral_photo', etc.
  attached: boolean;
}

export interface ReadinessInput {
  truth?: TruthAssertionsBundle;
  procedures: ReadinessProcedure[];
  diagnoses: ReadinessDiagnosis[];
  evidence: ReadinessEvidence[];
  risksAndConsentComplete: boolean;
  provider?: { npi?: string };
  serviceDate?: string;
  patient?: { dob?: string; memberId?: string };
}

export type MissingItemSeverity = 'blocker' | 'warning';

// Discriminated Union for MissingItem
export interface BaseMissingItem {
  severity: MissingItemSeverity;
  label: string;
}

export interface AdminMissingItem extends BaseMissingItem {
  kind: 'admin';
  adminKey: string;
}

export interface EvidenceMissingItem extends BaseMissingItem {
  kind: 'evidence';
  evidenceType: string;
  procedureId?: string;
}

export interface Icd10MissingItem extends BaseMissingItem {
  kind: 'icd10';
  procedureId: string;
}

export interface ProcedureStatusMissingItem extends BaseMissingItem {
  kind: 'procedure_status';
  procedureId: string;
}

export interface ConsentMissingItem extends BaseMissingItem {
  kind: 'consent';
}

export interface ProcedureDetailMissingItem extends BaseMissingItem {
  kind: 'procedure_detail';
  procedureId: string;
}

export interface CoherenceMissingItem extends BaseMissingItem {
  kind: 'coherence';
}

export interface SlotMissingItem extends BaseMissingItem {
  kind: 'slot';
  section: string;
  slot: string;
}

export type MissingItem = 
  | AdminMissingItem 
  | EvidenceMissingItem 
  | Icd10MissingItem 
  | ProcedureStatusMissingItem 
  | ConsentMissingItem 
  | ProcedureDetailMissingItem 
  | CoherenceMissingItem 
  | SlotMissingItem;

export interface DocumentationReadinessResult {
  percent: number;
  items: MissingItem[];
  status: 'COMPLETE' | 'INCOMPLETE';
  fixNext?: MissingItem;
}

export const DISCLAIMER_TEXT = "This readiness check is for guidance only. It checks for common documentation requirements but does not guarantee claim payment. Please verify specific payer rules.";

export function computeDocumentationReadiness(input: ReadinessInput): DocumentationReadinessResult {
  const missingItems: MissingItem[] = [];
  let totalRequirements = 0;
  let completedRequirements = 0;

  // 0. Admin Preflight Checks
  if (!input.provider?.npi || input.provider.npi === '0000000000') {
      totalRequirements++;
      missingItems.push({ kind: "admin", severity: "blocker", label: "Missing Provider NPI", adminKey: "missing_npi" });
  } else {
      totalRequirements++;
      completedRequirements++;
  }

  // 1. Procedure Checks
  input.procedures.forEach(proc => {
      // Completion
      totalRequirements++;
      if (!proc.isCompleted) {
          missingItems.push({ kind: 'procedure_status', severity: 'blocker', label: `Procedure ${proc.cdtCode} not marked completed`, procedureId: proc.id });
      } else {
          completedRequirements++;
      }

      // Diagnosis
      const hasDx = input.diagnoses.some(d => d.procedureId === proc.id);
      if (['D01', 'D2', 'D3', 'D4', 'D6', 'D7'].some(prefix => proc.cdtCode.startsWith(prefix))) {
          totalRequirements++;
          if (!hasDx) {
              missingItems.push({ kind: 'icd10', severity: 'blocker', label: `Missing Diagnosis for ${proc.cdtCode}`, procedureId: proc.id });
          } else {
              completedRequirements++;
          }
      }
  });

  // 2. Consent
  totalRequirements++;
  if (!input.risksAndConsentComplete) {
      missingItems.push({ kind: 'consent', severity: 'warning', label: 'Informed consent documents may be incomplete' });
  } else {
      completedRequirements++;
  }

  const percent = totalRequirements === 0 ? 100 : Math.round((completedRequirements / totalRequirements) * 100);

  return {
      percent,
      items: missingItems,
      status: percent === 100 ? 'COMPLETE' : 'INCOMPLETE',
      fixNext: missingItems[0]
  };
}
