import { 
  FeeCategory, AdjudicationRole, VisitProcedureRole, PayerTier, PayerProfile, 
  ClaimAcceptanceDecision, AcceptanceIssue, ClinicalSectionId 
} from '../types';
import { ClaimCompilerInput } from '../types';
import { NarrativeTrace } from './NarrativeEngine';
import { getCategoryFromCdtCode } from './cdtMapping';

const CATEGORY_WEIGHTS: Record<FeeCategory, number> = {
  SURGICAL: 100,
  ENDODONTIC: 90,
  IMPLANT: 80,
  RESTORATIVE: 70,
  PROSTHETIC: 60,
  PERIO: 50,
  ORTHO: 40,
  COSMETIC: 30,
  PREVENTIVE: 20,
  DIAGNOSTIC: 10,
  OTHER: 0
};

/**
 * Resolves procedure dominance (Primary vs Supporting).
 */
export function resolveVisitProcedureRoles(procedures: {id: string, category: FeeCategory}[]): VisitProcedureRole[] {
  if (procedures.length === 0) return [];
  
  const sorted = [...procedures].sort((a, b) => {
    const weightA = CATEGORY_WEIGHTS[a.category] || 0;
    const weightB = CATEGORY_WEIGHTS[b.category] || 0;
    return weightB - weightA;
  });

  return procedures.map(p => ({ 
    procedureId: p.id, 
    role: p.id === sorted[0].id ? 'PRIMARY' : 'SUPPORTING' as AdjudicationRole 
  }));
}

export const PAYER_PROFILES: Record<PayerTier, PayerProfile> = {
  GENERIC: {
    id: 'GENERIC', label: 'Commercial (Standard)',
    requiredModuleIds: ['VISIT_CONTEXT', 'RESTORATIVE_NECESSITY'],
    requiredEvidenceTypes: [],
    enforceCompletionStatus: true,
    minConfidenceForSubmission: 85
  },
  CONSERVATIVE: {
    id: 'CONSERVATIVE', label: 'Conservative (High Audit)',
    requiredModuleIds: ['VISIT_CONTEXT', 'RESTORATIVE_NECESSITY', 'EVIDENCE_REFERENCE'],
    requiredEvidenceTypes: ['pre_op_xray'],
    enforceCompletionStatus: true,
    minConfidenceForSubmission: 90
  },
  STRICT: {
    id: 'STRICT', label: 'Strict (Government/HHS)',
    requiredModuleIds: ['VISIT_CONTEXT', 'RESTORATIVE_NECESSITY', 'EVIDENCE_REFERENCE', 'CONSENT_RISK', 'PROCEDURE_COMPLETION'],
    requiredEvidenceTypes: ['pre_op_xray', 'intraoral_photo'],
    enforceCompletionStatus: true,
    minConfidenceForSubmission: 95
  }
};

export const ISSUE_TO_SECTION: Record<string, ClinicalSectionId> = {
  'ADMIN_NPI': 'PROVIDER_ID',
  'NPI_VALID': 'PROVIDER_ID',
  'VISIT_CC': 'CHIEF_COMPLAINT',
  'DATE_PRESENT': 'CHIEF_COMPLAINT',
  'NAV_NECESSITY': 'FINDINGS',
  'NECESSITY_VERIFIED': 'FINDINGS',
  'COMPLETION_REQUIRED': 'PROCEDURES',
  'PROC_STATUS': 'PROCEDURES',
  'PAYER_EVIDENCE': 'EVIDENCE',
  'EVIDENCE_PRE_OP_XRAY': 'EVIDENCE',
  'EVIDENCE_INTRAORAL_PHOTO': 'EVIDENCE'
};

/**
 * Gatekeeper for claim transmission. 
 * Evaluates the authoritative ClaimCompilerInput against Payer Rules.
 */
export function evaluateClaimAcceptance(
  input: ClaimCompilerInput,
  profileTier: PayerTier,
  traces: NarrativeTrace[]
): ClaimAcceptanceDecision {
  const profile = PAYER_PROFILES[profileTier];
  const blockers: AcceptanceIssue[] = [];
  const warnings: AcceptanceIssue[] = [];
  let score = 100;

  // 1. Mandatory Admin Blockers
  if (!input.provider?.npi || input.provider.npi === '0000000000') {
    blockers.push({ code: 'ADMIN_NPI', severity: 'blocker', message: 'Provider NPI required', ruleId: 'NPI_VALID' });
  }

  // 2. Narrative Integrity
  const hasNecessity = traces.some(t => t.sourceModuleId.includes('NECESSITY'));
  if (!hasNecessity) {
    blockers.push({ code: 'NAV_NECESSITY', severity: 'blocker', message: 'Primary Clinical Findings missing', ruleId: 'NECESSITY_VERIFIED' });
  }

  // 3. Procedure-Targeted Evidence and Completion Checks
  input.procedures.forEach(p => {
    const category = getCategoryFromCdtCode(p.cdtCode);
    
    // 3.1 Targeted Evidence Checks
    profile.requiredEvidenceTypes.forEach(type => {
      // Evidence is usually required for major procedures (Restorative, Prosthetic, Surgical)
      const isMajorProc = ['RESTORATIVE', 'PROSTHETIC', 'SURGICAL', 'IMPLANT', 'ENDODONTIC'].includes(category);
      if (isMajorProc) {
        const flagKey = type === 'pre_op_xray' ? 'hasXray' : type === 'intraoral_photo' ? 'hasPhoto' : 'hasPerioChart';
        const hasEvidence = (p.documentationFlags as any)[flagKey];

        if (!hasEvidence) {
          blockers.push({ 
            code: `EVIDENCE_${type.toUpperCase()}`, 
            severity: 'blocker', 
            message: `Missing ${type.replace(/_/g, ' ')} for ${p.cdtCode}`, 
            ruleId: 'PAYER_EVIDENCE',
            procedureId: p.id,
            field: flagKey
          });
        }
      }
    });

    // 3.2 Targeted Completion Check
    if (profile.enforceCompletionStatus && !p.isCompleted) {
      blockers.push({ 
        code: 'PROC_STATUS', 
        severity: 'blocker', 
        message: `${p.cdtCode} not marked completed`, 
        ruleId: 'COMPLETION_REQUIRED',
        procedureId: p.id
      });
    }
  });

  // 5. Rule Completeness Score
  profile.requiredModuleIds.forEach(modId => {
    if (!traces.some(t => t.sourceModuleId === modId)) {
        score -= 5;
    }
  });

  return {
    allowed: blockers.length === 0 && score >= profile.minConfidenceForSubmission,
    confidenceScore: blockers.length > 0 ? 0 : Math.max(0, score),
    blockers,
    warnings
  };
}