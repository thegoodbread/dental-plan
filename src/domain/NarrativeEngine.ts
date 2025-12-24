
import { ReadinessInput, ReadinessProcedure } from './ClaimReadinessEngine';
import { SedationReason } from '../types';
import { resolveVisitProcedureRoles } from './AdjudicationEngine';

export interface NarrativeTrace {
  sentence: string;
  sourceModuleId: string;
  sourceDataRefs: string[];
}

export interface MissingSlot {
  moduleId: string;
  requiredInput: string;
  label: string;
}

export interface NarrativeResult {
  ok: boolean;
  fullText?: string;
  traces?: NarrativeTrace[];
  missingSlots?: MissingSlot[];
}

interface NarrativeModule {
  id: string;
  appliesWhen(input: ReadinessInput): boolean;
  requiredSlots: string[];
  resolve(input: ReadinessInput): { vars: Record<string, string>, refs: string[] } | null;
  template: string;
}

// --- ENGINES & FRAGMENTS ---
const SEDATION_FRAGMENTS: Record<SedationReason, string> = {
  MANAGEMENT_OF_SEVERE_ANXIETY: "to manage the patient's documented severe dental anxiety, ensuring safe delivery of care",
  PROCEDURE_COMPLEXITY_AND_DURATION: "due to the clinical complexity and anticipated extended duration of the procedure",
  MEDICAL_CONTRAINDICATION_TO_LOCAL_ONLY: "as local anesthesia alone was contraindicated by the patient's medical history",
  HYPER_SENSITIVE_GAG_REFLEX: "to manage a hypersensitive gag reflex that compromised clinical access"
};

const MODULES: NarrativeModule[] = [
  {
    id: 'VISIT_CONTEXT',
    appliesWhen: () => true,
    requiredSlots: ['serviceDate', 'providerNpi'],
    template: "Clinical services were provided on {serviceDate} by a licensed clinician (NPI: {providerNpi}).",
    resolve: (input) => ({
      vars: { 
        serviceDate: input.serviceDate || 'N/A', 
        providerNpi: input.provider?.npi || '0000000000' 
      },
      refs: ['visit.date', 'provider.npi']
    })
  },
  {
    id: 'RESTORATIVE_NECESSITY',
    appliesWhen: (input) => input.procedures.some(p => ['D2', 'D3', 'D7'].some(pre => p.cdtCode.startsWith(pre))),
    requiredSlots: [],
    template: "The primary clinical objective was the successful completion of {primaryProcedure}. Medical necessity is established via documented findings on {toothList}.",
    resolve: (input) => {
      const roles = resolveVisitProcedureRoles(input.procedures.map(p => ({ id: p.id, category: 'RESTORATIVE' })));
      const primaryId = roles.find(r => r.role === 'PRIMARY')?.procedureId;
      const primaryProc = input.procedures.find(p => p.id === primaryId);
      const teeth = input.procedures.map(p => p.tooth ? `#${p.tooth}` : 'unspecified area');
      
      return {
        vars: { 
            primaryProcedure: primaryProc?.label || 'planned treatment',
            toothList: Array.from(new Set(teeth)).join(', ') 
        },
        refs: ['procedures.primary', 'procedures.necessity']
      };
    }
  },
  {
    id: 'SEDATION_JUSTIFICATION',
    appliesWhen: (input) => input.procedures.some(p => p.cdtCode.startsWith('D92')),
    requiredSlots: ['sedationReason'],
    template: "Moderate sedation was administered {reasonText}.",
    resolve: (input) => {
        const procWithReason = input.procedures.find(p => (p as any).documentation?.sedationReason);
        const reason = (procWithReason as any)?.documentation?.sedationReason as SedationReason;
        if (!reason) return null;
        return {
            vars: { reasonText: SEDATION_FRAGMENTS[reason] },
            refs: ['procedure.documentation.sedationReason']
        };
    }
  },
  {
    id: 'EVIDENCE_REFERENCE',
    appliesWhen: (input) => input.evidence.length > 0,
    requiredSlots: [],
    template: "Clinical necessity is supported by diagnostic {evidenceList} captured during this encounter.",
    resolve: (input) => {
      const labels = input.evidence.filter(e => e.attached).map(e => e.type.replace(/_/g, ' '));
      if (labels.length === 0) return null;
      return {
        vars: { evidenceList: Array.from(new Set(labels)).join(', ') },
        refs: ['visit.evidence']
      };
    }
  },
  {
    id: 'CONSENT_RISK',
    appliesWhen: (input) => input.risksAndConsentComplete,
    requiredSlots: [],
    template: "Patient was informed of all clinical risks; informed consent was obtained prior to treatment.",
    resolve: () => ({ vars: {}, refs: ['visit.consent'] })
  },
  {
    id: 'PROCEDURE_COMPLETION',
    appliesWhen: (input) => input.procedures.every(p => p.isCompleted),
    requiredSlots: [],
    template: "Procedures were completed without complication. Patient tolerated treatment well.",
    resolve: () => ({ vars: {}, refs: ['procedures.status'] })
  }
];

export function generateClaimNarrative(input: ReadinessInput): NarrativeResult {
  const traces: NarrativeTrace[] = [];
  const missingSlots: MissingSlot[] = [];

  for (const module of MODULES) {
    if (!module.appliesWhen(input)) continue;
    const resolved = module.resolve(input);
    
    if (!resolved) {
        module.requiredSlots.forEach(slot => {
            missingSlots.push({ moduleId: module.id, requiredInput: slot, label: `Required rationale missing: ${slot}` });
        });
        continue;
    }

    let sentence = module.template;
    Object.entries(resolved.vars).forEach(([key, val]) => {
      sentence = sentence.replace(`{${key}}`, val);
    });

    traces.push({ sentence, sourceModuleId: module.id, sourceDataRefs: resolved.refs });
  }

  if (missingSlots.length > 0) return { ok: false, missingSlots };

  return {
    ok: true,
    fullText: traces.map(t => t.sentence).join(' '),
    traces
  };
}
