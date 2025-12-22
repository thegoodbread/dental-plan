import { VisitType } from './dentalTypes';

export type SoapSectionId = 'SUBJECTIVE' | 'OBJECTIVE' | 'ASSESSMENT' | 'TREATMENT_PERFORMED' | 'PLAN';

export interface SoapSectionTemplate {
  template: string;
  chips?: string[];
}

export interface ProcedureNoteTemplate {
  id: string;
  name: string;
  category: string;
  triggers: {
    matchBy: ('cdtCode' | 'canonicalName')[];
    cdtCodes?: string[];
    canonicalNames?: string[];
  };
  soap: {
    subjective?: SoapSectionTemplate;
    objective?: SoapSectionTemplate;
    assessment?: SoapSectionTemplate;
    plan?: SoapSectionTemplate;
    treatment_performed?: SoapSectionTemplate;
  };
  postOp?: {
    template: string;
    delivery: 'chairside_only' | 'chairside_and_print';
  };
  riskSuggestions?: {
    linkToRiskIds: string[];
    requireConfirmation?: boolean;
  };
}

export const PROCEDURE_NOTE_TEMPLATES: ProcedureNoteTemplate[] = [
  {
    id: "REST_COMPOSITE_POST",
    name: "Posterior Composite Restoration",
    category: "direct_restoration",
    triggers: {
      matchBy: ["cdtCode", "canonicalName"],
      cdtCodes: ["D2391", "D2392", "D2393", "D2394"],
      canonicalNames: ["Composite", "Comp", "Filling"]
    },
    soap: {
      subjective: { template: "Patient reports {{chief_complaint}} on {{tooth_list}} and presents today for composite restoration." },
      objective: { template: "Existing restoration and recurrent caries noted on {{tooth_list}}. Isolation achieved via {{isolation_method}}." },
      assessment: { template: "Caries associated with existing restoration on {{tooth_list}}. Tooth restorable with composite." },
      treatment_performed: { template: "Local anesthesia. Isolation. Caries removed. Incremental composite [shade] placed/cured. Occlusion verified." },
      plan: { template: "Completed restoration on {{tooth_list}}. POI given. Call if bite feels high." }
    }
  },
  {
    id: "PROS_COMPLETE_DENTURE",
    name: "Complete Denture Delivery",
    category: "prosthetic",
    triggers: {
      matchBy: ["cdtCode", "canonicalName"],
      cdtCodes: ["D5110", "D5120"],
      canonicalNames: ["Denture"]
    },
    soap: {
      subjective: { template: "Patient presents for final delivery of complete denture for the {{tooth_list}}." },
      objective: { template: "Tissue condition for {{tooth_list}} appeared healthy. Denture fits securely with adequate suction." },
      assessment: { template: "Edentulous {{tooth_list}} ready for full arch prosthetic restoration." },
      treatment_performed: { template: "Denture delivered. Pressure points identified via PIP paste and adjusted. Occlusion verified with articulating paper. Aesthetics approved by patient." },
      plan: { template: "Patient instructed on hygiene and maintenance. Follow up for 24-hour adjustment scheduled." }
    }
  },
  {
    id: "ADJ_OCCLUSAL_GUARD",
    name: "Occlusal Guard Impression",
    category: "adjunctive",
    triggers: {
      matchBy: ["cdtCode", "canonicalName"],
      cdtCodes: ["D9944"],
      canonicalNames: ["Nightguard", "Occlusal Guard"]
    },
    soap: {
      subjective: { template: "Patient reports history of bruxism/clenching and related morning jaw soreness. Desires {{tooth_list}} protection." },
      objective: { template: "Generalized wear facets noted. Muscle tenderness upon palpation of masseters." },
      assessment: { template: "Sleep bruxism resulting in occlusal wear and muscle strain." },
      treatment_performed: { template: "Upper and lower full arch impressions/scans taken. Bite registration captured in centric relation. Sent to lab for fabrication of hard occlusal guard." },
      plan: { template: "Delivery scheduled in 2 weeks. Advised patient to wear every night to prevent further tooth fracture." }
    }
  }
];
