
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
    // Maps to TREATMENT_PERFORMED in SoapSectionType
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
      subjective: {
        template: "Patient reports {{chief_complaint}} on {{tooth_list}} and presents today for composite restoration."
      },
      objective: {
        template: "Existing restoration and recurrent caries noted on {{tooth_list}}. No swelling or sinus tract present. Percussion: {{percussion_status}}. Palpation: {{palpation_status}}. Isolation achieved via {{isolation_method}}."
      },
      assessment: {
        template: "Recurrent caries associated with existing restoration on {{tooth_list}}. Tooth restorable with direct composite restoration."
      },
      treatment_performed: {
        template: "Local anesthesia administered. Rubber dam isolation. Caries removed. Tooth prepared. Etch, bond, and composite placed incrementally. Cured, contoured, and polished. Occlusion verified."
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
      treatment_performed: {
        template: "Local anesthesia. Isolation. Tooth prepared for full coverage crown. Impression taken. Temporary crown fabricated, cemented with temporary cement. Occlusion and contacts verified."
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
      treatment_performed: {
        template: "Local anesthesia. Rubber dam isolation. Access gained. Canals located and instrumented. Irrigation with NaOCl. Obturation with Gutta Percha and sealer. Temporary restoration placed."
      },
      plan: {
        template: "Completed RCT on {{tooth_list}}. Canals instrumentation and obturation completed. Temporary restoration placed. Advised full coverage restoration ASAP."
      }
    }
  },
  {
    id: "SURG_EXT",
    name: "Simple Extraction",
    category: "surgery",
    triggers: {
      matchBy: ["cdtCode", "canonicalName"],
      cdtCodes: ["D7140"],
      canonicalNames: ["Extraction", "Ext"]
    },
    soap: {
      subjective: {
        template: "Patient presents for extraction of {{tooth_list}}."
      },
      objective: {
        template: "{{tooth_list}} is non-restorable due to extensive caries/fracture."
      },
      assessment: {
        template: "Non-restorable tooth {{tooth_list}}."
      },
      treatment_performed: {
        template: "Local anesthesia. Tooth {{tooth_list}} luxated and extracted. Hemostasis achieved with gauze pressure."
      },
      plan: {
        template: "Review POI. No smoking/straws. Advised on pain management."
      }
    }
  },
  {
    id: "IMPLANT_PLACE",
    name: "Implant Placement",
    category: "implant",
    triggers: {
      matchBy: ["cdtCode", "canonicalName"],
      cdtCodes: ["D6010"],
      canonicalNames: ["Implant"]
    },
    soap: {
      subjective: {
        template: "Patient presents for implant placement at site {{tooth_list}}."
      },
      objective: {
        template: "Edentulous site {{tooth_list}}. Bone volume appears adequate for placement."
      },
      assessment: {
        template: "Missing tooth {{tooth_list}}."
      },
      treatment_performed: {
        template: "Local anesthesia. Osteotomy prepared. Implant fixture placed at site {{tooth_list}}. Primary stability achieved. Cover screw/healing abutment placed. Sutures placed."
      },
      plan: {
        template: "Implant placed. POI given. Follow up in 2 weeks for suture removal/check."
      }
    }
  }
];
