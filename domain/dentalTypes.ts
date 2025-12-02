
// Unified Tooth-Based Domain Model

export type ToothNumber =
  | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8"
  | "9" | "10" | "11" | "12" | "13" | "14" | "15" | "16"
  | "17" | "18" | "19" | "20" | "21" | "22" | "23" | "24"
  | "25" | "26" | "27" | "28" | "29" | "30" | "31" | "32";

export type VisitType = "exam" | "restorative" | "endo" | "surgery" | "emergency" | "hygiene" | "other";

// --- EXISTING TYPES ---
export interface Condition {
  id: string;
  toothNumber: ToothNumber;
  label: string;
  createdAt: string;
  source: "charting" | "radiograph" | "note" | "import";
}

export interface Procedure {
  id: string;
  toothNumber: ToothNumber;
  code: string;
  name: string;
  status: "planned" | "completed";
  phase?: number | null;
  visitId?: string | null;
  createdAt: string;
}

export interface RadiographRef {
  id: string;
  type: "BWX" | "PA" | "PANO" | "CBCT" | "Other";
  label: string;
  toothNumbers: ToothNumber[];
}

export interface ToothNote {
  id: string;
  toothNumber: ToothNumber;
  visitId: string;
  text: string;
  createdAt: string;
}

export interface ToothRecord {
  toothNumber: ToothNumber;
  conditions: Condition[];
  procedures: Procedure[];
  notes: ToothNote[];
  radiographs: RadiographRef[];
}

export interface VisitRecord {
  id: string;
  patientId: string;
  type: VisitType;
  dateTime: string;
  chiefComplaint?: string;
}

export interface PatientChart {
  patientId: string;
  patientName: string;
  teeth: ToothRecord[];
  visits: VisitRecord[];
}

// --- NEW SOAP & RISK MODELS ---

export type SoapSectionType = 'SUBJECTIVE' | 'OBJECTIVE' | 'ASSESSMENT' | 'PLAN' | 'TREATMENT_PERFORMED';

export interface SoapSection {
  id: string;
  type: SoapSectionType;
  title: string;
  content: string;
  lastEditedAt: string;
}

export type RiskSeverity = 'COMMON' | 'UNCOMMON' | 'RARE' | 'VERY_RARE';
export type RiskCategory = 'DIRECT_RESTORATION' | 'INDIRECT_RESTORATION' | 'ENDO' | 'EXTRACTION' | 'IMPLANT' | 'SEDATION' | 'ANESTHESIA' | 'OTHER';

export interface RiskLibraryItem {
  id: string;
  version: number;
  category: RiskCategory;
  severity: RiskSeverity;
  title: string;       // Short label for the doctor
  body: string;        // Full legal text for the patient
  procedureCodes?: string[];
  activeByDefault: boolean;
}

// FINAL PRODUCTION MODEL
export interface AssignedRisk {
  id: string;

  // Linkage
  tenantId: string;
  patientId: string;
  treatmentPlanId: string;
  treatmentItemId?: string;
  phaseId?: string;
  clinicalNoteId?: string;

  // Library Reference
  riskLibraryItemId: string;
  riskLibraryVersion: number;

  // Snapshot (immutable)
  titleSnapshot: string;
  bodySnapshot: string;
  severitySnapshot: RiskSeverity;
  categorySnapshot: string;
  cdtCodesSnapshot?: string[];

  // Consent metadata
  consentMethod: 'VERBAL' | 'WRITTEN' | 'ELECTRONIC_SIGNATURE' | 'UNKNOWN';
  consentCapturedAt?: string;
  consentCapturedByUserId?: string;
  consentNote?: string;

  // UI + ordering
  isActive: boolean;
  sortOrder: number;
  isExpanded?: boolean;

  // Audit
  addedAt: string;
  addedByUserId: string;
  lastUpdatedAt: string;
  lastUpdatedByUserId?: string;

  removedAt?: string;
  removedByUserId?: string;
}

// NOTE TEMPLATE MODEL
export interface ProcedureTemplate {
  cdtCode: string;
  label: string;
  category: string; // Matches ProcedureCategory or general string
  toothContext: 'single_tooth' | 'multi_teeth' | 'quadrant' | 'arch' | 'full_mouth' | 'not_applicable';
  
  subjectiveTemplate: string;
  objectiveTemplate: string;
  assessmentTemplate: string;
  treatmentPerformedTemplate: string;
  planTemplate: string;
  
  suggestedRiskLabels: string[];
  complianceChecklist: string[];

  // Governance / Compliance Meta
  version: number;                    // semantic version for this template
  createdBy: string;                  // e.g. "system_seed", "dr_smith"
  jurisdictionNote?: string;          // e.g. "Drafted for US; state-level review required."
  reviewedByClinicianId?: string;     // user id of reviewing dentist
  reviewedByLegalId?: string;         // user id of legal/compliance reviewer
  reviewedAt?: string;                // ISO datetime string
  isApprovedForProduction: boolean;   // must be true before used in live clinics
}

// --- RISK VALIDATOR ---
const RISKY_PHRASES: string[] = [
  "guarantee",
  "guaranteed",
  "will definitely",
  "no risk",
  "zero risk",
  "complication-free",
  "100% success",
  "permanent solution",
];

export function validateTemplateForRisk(template: ProcedureTemplate): string[] {
  const fieldsToCheck = [
    template.subjectiveTemplate,
    template.objectiveTemplate,
    template.assessmentTemplate,
    template.treatmentPerformedTemplate,
    template.planTemplate,
  ];

  const text = fieldsToCheck.join(" ").toLowerCase();
  const violations: string[] = [];

  for (const phrase of RISKY_PHRASES) {
    if (text.includes(phrase.toLowerCase())) {
      violations.push(phrase);
    }
  }

  return violations;
}

// Legacy support for existing components
export interface ClinicalNote {
  id: string;
  patientId: string;
  visitId: string;
  visitType: VisitType;
  dateTime: string;
  // Legacy fields mapped to sections
  chiefComplaint: string;
  objectiveFindings: {
    oralExam: string;
    radiographicText: string;
    softTissue: string;
    vitality: {
      cold: "pos" | "neg" | null;
      percussion: "pos" | "neg" | null;
      mobility: 0 | 1 | 2 | 3 | null;
    };
  };
  assessmentDiagnosis: string;
  treatmentPerformed: string;
  recommendationsPlan: string;
  consentRefusal: "accepted" | "declined" | "deferred" | null;
  nextVisitPlan: string;
  status: "draft" | "signed";
}

// --- Mock Data ---

export const mockPatientChart: PatientChart = {
  patientId: "demo-patient-1",
  patientName: "John Doe",
  teeth: [
    {
      toothNumber: "14",
      conditions: [
        {
          id: "cond-14-fracture",
          toothNumber: "14",
          label: "Fractured cusp",
          createdAt: new Date().toISOString(),
          source: "charting"
        }
      ],
      procedures: [
        {
          id: "proc-14-crown",
          toothNumber: "14",
          code: "D2740",
          name: "Crown - ceramic/porcelain",
          status: "planned",
          phase: 1,
          visitId: "visit-restorative-1",
          createdAt: new Date().toISOString()
        }
      ],
      notes: [],
      radiographs: [
        {
          id: "rad-pa-14",
          type: "PA",
          label: "PA #14",
          toothNumbers: ["14"]
        }
      ]
    },
    {
      toothNumber: "30",
      conditions: [],
      procedures: [],
      notes: [],
      radiographs: []
    }
  ],
  visits: [
    {
      id: "visit-restorative-1",
      patientId: "demo-patient-1",
      type: "restorative",
      dateTime: new Date().toISOString(),
      chiefComplaint: "Cold sensitivity and fracture on upper left."
    }
  ]
};
