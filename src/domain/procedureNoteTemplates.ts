
import { ProcedureTemplate } from './dentalTypes';

export type SoapSectionId = 'SUBJECTIVE' | 'OBJECTIVE' | 'ASSESSMENT' | 'PLAN';

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
      subjective: {
        template: "Patient reports {{chief_complaint}} on {{tooth_list}} and presents today for composite restoration."
      },
      objective: {
        template: "Existing restoration and recurrent caries noted on {{tooth_list}}. No swelling or sinus tract present. Percussion: {{percussion_status}}. Palpation: {{palpation_status}}. Isolation achieved via {{isolation_method}}."
      },
      assessment: {
        template: "Recurrent caries associated with existing restoration on {{tooth_list}}. Tooth restorable with direct composite restoration."
      },
      plan: {
        template: "Reviewed findings and recommended composite restoration on {{tooth_list}}. Discussed possible post-op sensitivity and rare need for future endodontic therapy. Provided post-operative instructions and advised patient to call if pain worsens or swelling develops."
      }
    },
    postOp: {
      template: "A tooth-colored filling was placed today on {{tooth_list}}. You may feel numb for several hours. Avoid chewing until the numbness wears off.",
      delivery: "chairside_and_print"
    },
    riskSuggestions: {
      linkToRiskIds: ["rest_pain_common", "rest_occlusion"]
    }
  },
  {
    id: "REST_CROWN_PREP",
    name: "Crown Preparation",
    category: "indirect_restoration",
    triggers: {
      matchBy: ["cdtCode", "canonicalName"],
      cdtCodes: ["D2740", "D2750", "D2790"],
      canonicalNames: ["Crown", "Crn"]
    },
    soap: {
      subjective: {
        template: "Patient presents for crown preparation on {{tooth_list}}."
      },
      objective: {
        template: "{{tooth_list}} exhibits compromised structural integrity due to extensive decay/fracture. Vitality: {{vitality_status}}."
      },
      assessment: {
        template: "{{tooth_list}} requires full coverage restoration."
      },
      plan: {
        template: "Prepared {{tooth_list}} for crown. Impression taken. Temporary crown fabricated and cemented. Verified occlusion and contacts. Patient advised to avoid sticky foods."
      }
    }
  },
  {
    id: "ENDO_RCT",
    name: "Root Canal Therapy",
    category: "endo",
    triggers: {
      matchBy: ["cdtCode", "canonicalName"],
      cdtCodes: ["D3310", "D3320", "D3330"],
      canonicalNames: ["RCT", "Root Canal"]
    },
    soap: {
      subjective: {
        template: "Patient presents with spontaneous pain on {{tooth_list}}."
      },
      objective: {
        template: "Deep caries communicating with pulp on {{tooth_list}}. Percussion (+). Cold (Lingering)."
      },
      assessment: {
        template: "Irreversible Pulpitis with Symptomatic Apical Periodontitis {{tooth_list}}."
      },
      plan: {
        template: "Completed RCT on {{tooth_list}}. Canals instrumentation and obturation completed. Temporary restoration placed. Advised full coverage restoration ASAP."
      }
    }
  }
];
