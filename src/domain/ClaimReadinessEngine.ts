import { TruthAssertionsBundle, evaluateSlotCompleteness, SLOT_ORDER } from './TruthAssertions';
import { SoapSectionType } from './dentalTypes';

export const DISCLAIMER_TEXT = "This readiness check is an administrative tool only. It verifies data presence against common payer rules. It does not validate clinical accuracy, medical necessity, or legal compliance. The provider is solely responsible for final documentation and coding.";

export type MissingKind =
    | "admin"
    | "procedure_detail"
    | "procedure_status"
    | "icd10"
    | "evidence"
    | "slot"
    | "consent"
    | "coherence";

export type MissingItem = 
    | { kind: 'admin'; severity: 'blocker' | 'warning'; label: string; adminKey: string }
    | { kind: 'procedure_detail'; severity: 'blocker' | 'warning'; label: string; procedureId: string }
    | { kind: 'procedure_status'; severity: 'blocker' | 'warning'; label: string; procedureId: string }
    | { kind: 'icd10'; severity: 'blocker' | 'warning'; label: string; procedureId: string }
    | { kind: 'evidence'; severity: 'blocker' | 'warning'; label: string; evidenceType: string; procedureId?: string }
    | { kind: 'slot'; severity: 'blocker' | 'warning'; label: string; section: SoapSectionType; slot: string }
    | { kind: 'consent'; severity: 'blocker' | 'warning'; label: string }
    | { kind: 'coherence'; severity: 'blocker' | 'warning'; label: string; procedureId: string };

export interface ReadinessProcedure {
    id: string;
    cdtCode: string;
    label: string;
    tooth?: string;
    surfaces?: string[];
    quadrant?: string;
    isCompleted: boolean;
}

export interface ReadinessEvidence {
    procedureId: string;
    type: string;
    attached: boolean;
}

export interface ReadinessDiagnosis {
    procedureId: string;
    icd10: string;
}

export interface ReadinessInput {
    truth?: TruthAssertionsBundle;
    procedures: ReadinessProcedure[];
    diagnoses: ReadinessDiagnosis[];
    evidence: ReadinessEvidence[];
    risksAndConsentComplete: boolean;
    patient?: {
        dob?: string;
        memberId?: string;
    };
    provider?: {
        npi?: string;
    };
    serviceDate?: string;
}

export interface DocumentationReadinessResult {
    percent: number;
    items: MissingItem[];
    fixNext?: MissingItem;
    status: 'INCOMPLETE' | 'READY_FOR_REVIEW';
}

function computeCoherenceWarnings(input: ReadinessInput): MissingItem[] {
    if (!input.truth) return [];

    const corpus = input.truth.assertions
        .filter(a => a.checked)
        .map(a => `${a.label} ${a.sentence || ''} ${a.description || ''}`)
        .join(' ')
        .toLowerCase();

    if (corpus.trim() === '') return [];

    const warnings: MissingItem[] = [];

    input.procedures.forEach(p => {
        const code = p.cdtCode.toUpperCase();

        if (code.startsWith('D27')) {
            const keywords = ["crown prep", "impression", "temporary", "seat"];
            if (!keywords.some(k => corpus.includes(k))) {
                warnings.push({
                    kind: 'coherence',
                    severity: 'warning',
                    label: "Coherence check: consider adding crown prep/impression/temporary/seat details",
                    procedureId: p.id
                });
            }
        } else if (code.startsWith('D33')) {
            const keywords = ["rubber dam", "working length", "irrigation", "obturation"];
            if (!keywords.some(k => corpus.includes(k))) {
                warnings.push({
                    kind: 'coherence',
                    severity: 'warning',
                    label: "Coherence check: consider adding rubber dam/working length/irrigation/obturation details",
                    procedureId: p.id
                });
            }
        } else if (code.startsWith('D7')) {
            const keywords = ["anesthesia", "elevator", "forceps", "hemostasis", "post-op"];
            if (!keywords.some(k => corpus.includes(k))) {
                warnings.push({
                    kind: 'coherence',
                    severity: 'warning',
                    label: "Coherence check: consider adding anesthesia/elevator/forceps/hemostasis/post-op details",
                    procedureId: p.id
                });
            }
        }
    });

    return warnings;
}

export function computeDocumentationReadiness(input: ReadinessInput): DocumentationReadinessResult {
    // Presence/completeness checks only; does not validate clinical correctness; no claim submission.
    // This function strictly evaluates data density against administrative rules.

    const missingItems: MissingItem[] = [];
    let totalRequirements = 0;
    let completedRequirements = 0;

    // 0. Admin Preflight Checks
    if (!input.provider?.npi) {
        totalRequirements++;
        missingItems.push({ kind: "admin", severity: "blocker", label: "Missing Provider NPI", adminKey: "missing_npi" });
    } else {
        totalRequirements++;
        completedRequirements++;
    }

    if (!input.patient?.dob) {
        totalRequirements++;
        missingItems.push({ kind: "admin", severity: "blocker", label: "Missing Patient DOB", adminKey: "missing_dob" });
    } else {
        totalRequirements++;
        completedRequirements++;
    }

    if (!input.serviceDate) {
        totalRequirements++;
        missingItems.push({ kind: "admin", severity: "blocker", label: "Missing Service Date", adminKey: "missing_service_date" });
    } else {
        totalRequirements++;
        completedRequirements++;
    }

    if (!input.patient?.memberId) {
        totalRequirements++;
        missingItems.push({ kind: "admin", severity: "blocker", label: "Missing Member/Subscriber ID", adminKey: "missing_member_id" });
    } else {
        totalRequirements++;
        completedRequirements++;
    }

    // 0.5. Procedure Detail Checks
    input.procedures.forEach(p => {
        const code = p.cdtCode.toUpperCase();
        
        // Restorative: Exact match for Amalgam family (D2140-D2161) OR Composite family (D2391-D2394)
        const isRestorative = /^(D2140|D2150|D2160|D2161)$/.test(code) || /^D239[1-4]$/.test(code);
        if (isRestorative) {
            totalRequirements++;
            if (p.tooth) {
                completedRequirements++;
            } else {
                missingItems.push({ kind: "procedure_detail", severity: "blocker", label: "Missing tooth number", procedureId: p.id });
            }

            totalRequirements++;
            if (p.surfaces && p.surfaces.length > 0) {
                completedRequirements++;
            } else {
                missingItems.push({ kind: "procedure_detail", severity: "blocker", label: "Missing surfaces", procedureId: p.id });
            }
        }

        // Surgery/Extraction: D7xxx
        if (code.startsWith('D7')) {
            totalRequirements++;
            if (p.tooth) {
                completedRequirements++;
            } else {
                missingItems.push({ kind: "procedure_detail", severity: "blocker", label: "Missing tooth number", procedureId: p.id });
            }
        }

        // Perio: D4xxx (Quadrant based)
        if (code.startsWith('D4')) {
            totalRequirements++;
            if (p.quadrant) {
                completedRequirements++;
            } else {
                missingItems.push({ kind: "procedure_detail", severity: "blocker", label: "Missing quadrant", procedureId: p.id });
            }
        }
    });

    // 1. Procedures Status Check (Administrative: Is it marked done?)
    input.procedures.forEach(p => {
        totalRequirements++;
        if (p.isCompleted) {
            completedRequirements++;
        } else {
            missingItems.push({ kind: "procedure_status", severity: "blocker", label: "Mark Completed", procedureId: p.id });
        }
    });

    // 2. Diagnosis (ICD-10) Presence Check
    // NOTE: Checks for PRESENCE of a code, not clinical validity of the code selected.
    input.procedures.forEach(p => {
        const code = p.cdtCode.toUpperCase();
        // Heuristic: Major categories typically require Dx for processing
        const generallyRequiresDx = /^(D33|D60|D7|D4|D27)/.test(code);
        
        if (generallyRequiresDx) {
            const hasDx = input.diagnoses.some(d => d.procedureId === p.id);
            totalRequirements++;
            if (hasDx) {
                completedRequirements++;
            } else {
                missingItems.push({ kind: "icd10", severity: "blocker", label: "Missing Diagnosis Code", procedureId: p.id });
            }
        }
    });

    // 3. Evidence Attachment Check
    // NOTE: Checks for attachment existence, does not interpret image content.
    input.procedures.forEach(p => {
        const code = p.cdtCode.toUpperCase();
        
        // Endo (D33xx): Standard admin requirement is Pre-op Xray
        if (code.startsWith('D33')) {
            totalRequirements++;
            const hasXray = input.evidence.some(e => e.procedureId === p.id && e.type === 'pre_op_xray' && e.attached);
            if (hasXray) {
                completedRequirements++;
            } else {
                missingItems.push({ kind: "evidence", severity: "blocker", evidenceType: "pre_op_xray", label: "Pre-Op X-Ray", procedureId: p.id });
            }
        }

        // Implant (D60xx): Standard admin requirement is Image of site
        if (code.startsWith('D60')) {
            totalRequirements++;
            const hasPano = input.evidence.some(e => e.procedureId === p.id && e.type === 'fmX_pano_recent' && e.attached);
            const hasXray = input.evidence.some(e => e.procedureId === p.id && e.type === 'pre_op_xray' && e.attached);
            
            if (hasPano || hasXray) {
                completedRequirements++;
            } else {
                missingItems.push({ kind: "evidence", severity: "blocker", evidenceType: "pre_op_xray", label: "Pre-Op X-Ray or Pano", procedureId: p.id });
            }

            // Warning for Photo (Best Practice, not strict blocker)
            const hasPhoto = input.evidence.some(e => e.procedureId === p.id && e.type === 'intraoral_photo' && e.attached);
            if (!hasPhoto) {
                missingItems.push({ kind: "evidence", severity: "warning", evidenceType: "intraoral_photo", label: "Intraoral Photo (Recommended)", procedureId: p.id });
            }
        }
    });

    // 4. Slot Completeness Check (Documentation QA)
    const sectionOrder: SoapSectionType[] = ['SUBJECTIVE', 'OBJECTIVE', 'ASSESSMENT', 'TREATMENT_PERFORMED', 'PLAN'];
    sectionOrder.forEach(section => {
        const slotMap = evaluateSlotCompleteness(input.truth, section);
        SLOT_ORDER.forEach(slot => {
            const status = slotMap[slot];
            if (status === 'not_required') return;
            
            totalRequirements++;
            if (status === 'complete') {
                completedRequirements++;
            } else {
                missingItems.push({ 
                    kind: "slot", 
                    severity: "blocker", 
                    section, 
                    slot, 
                    label: `Fill ${slot}` 
                });
            }
        });
    });

    // 5. Consent Existence Check
    // Checks boolean flag only. Does not validate legal content of consent.
    const riskyProcedure = input.procedures.some(p => /^(D33|D60|D7)/.test(p.cdtCode.toUpperCase()));
    if (riskyProcedure) {
        totalRequirements++;
        if (input.risksAndConsentComplete) {
            completedRequirements++;
        } else {
            missingItems.push({ kind: "consent", severity: "blocker", label: "Verify Informed Consent" });
        }
    }

    // 6. Coherence Warnings (Informational only, do not affect percent)
    const coherenceWarnings = computeCoherenceWarnings(input);
    missingItems.push(...coherenceWarnings);

    // Compute Percent
    const percent = totalRequirements === 0 ? 100 : Math.min(100, Math.floor((completedRequirements / totalRequirements) * 100));

    // Determine FixNext (Guidance Only)
    // Priority: procedure_status -> admin -> procedure_detail -> icd10 -> evidence -> slot -> consent
    let fixNext: MissingItem | undefined;
    const blockers = missingItems.filter(m => m.severity === 'blocker');
    
    const findFirst = (kind: MissingKind) => blockers.find(b => b.kind === kind);
    
    fixNext = findFirst("procedure_status") || 
              findFirst("admin") || 
              findFirst("procedure_detail") || 
              findFirst("icd10") || 
              findFirst("evidence") || 
              findFirst("slot") || 
              findFirst("consent");

    return { 
        percent, 
        items: missingItems, 
        fixNext,
        status: percent === 100 ? 'READY_FOR_REVIEW' : 'INCOMPLETE'
    };
}