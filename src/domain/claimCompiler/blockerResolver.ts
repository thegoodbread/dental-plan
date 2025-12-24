import { AcceptanceIssue } from '../../types';

export type ResolverKind = 
  | 'PROVIDER_NPI'
  | 'VISIT_FACT'
  | 'EVIDENCE_FLAG'
  | 'PROCEDURE_COMPLETION';

export interface BlockerResolver {
  kind: ResolverKind;
  targetField?: string;
  label: string;
}

/**
 * Maps static AcceptanceIssue codes to actionable Resolver types.
 * This utility provides a conservative mapping between the adjudication engine's 
 * discovered issues and the corresponding data fields or confirmation workflows 
 * required to resolve them.
 */
export function resolveBlockerToResolver(issue: AcceptanceIssue): BlockerResolver | null {
  const code = issue.code.toUpperCase();

  // 1. Admin / Identity Blockers
  if (code === 'ADMIN_NPI') {
    return { 
      kind: 'PROVIDER_NPI', 
      label: 'Update Provider NPI' 
    };
  }

  // 2. Visit Documentation Blockers
  // Maps to HPI / Findings logic
  if (code === 'VISIT_HPI_MISSING' || code === 'NAV_NECESSITY') {
    return { 
      kind: 'VISIT_FACT', 
      targetField: 'hpi', 
      label: 'Complete HPI / Findings' 
    };
  }

  // Maps to Chief Complaint logic
  if (code === 'VISIT_CC_MISSING' || code === 'VISIT_CC') {
    return { 
      kind: 'VISIT_FACT', 
      targetField: 'chiefComplaint', 
      label: 'Set Chief Complaint' 
    };
  }

  // 3. Evidence / Documentation Flag Blockers
  if (code === 'EVIDENCE_PREOP_XRAY' || code === 'EVIDENCE_PRE_OP_XRAY') {
    return { 
      kind: 'EVIDENCE_FLAG', 
      targetField: 'hasXray', 
      label: 'Verify Pre-Op X-Ray' 
    };
  }

  // 4. Clinical Status Blockers
  if (code === 'PROC_INCOMPLETE' || code === 'PROC_STATUS') {
    return { 
      kind: 'PROCEDURE_COMPLETION', 
      label: 'Confirm Procedure Completion' 
    };
  }

  return null;
}
