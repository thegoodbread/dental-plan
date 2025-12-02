
// Unified Tooth-Based Domain Model

export type ToothNumber =
  | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8"
  | "9" | "10" | "11" | "12" | "13" | "14" | "15" | "16"
  | "17" | "18" | "19" | "20" | "21" | "22" | "23" | "24"
  | "25" | "26" | "27" | "28" | "29" | "30" | "31" | "32";

export type VisitType = "exam" | "restorative" | "endo" | "surgery" | "emergency" | "hygiene" | "other";

export interface Condition {
  id: string;
  toothNumber: ToothNumber;
  label: string;            // e.g. "Fractured cusp", "Caries into dentin"
  createdAt: string;        // ISO date
  source: "charting" | "radiograph" | "note" | "import";
}

export interface Procedure {
  id: string;
  toothNumber: ToothNumber;
  code: string;             // e.g. CDT code
  name: string;             // "Crown - PFM", "Composite MOD"
  status: "planned" | "completed";
  phase?: number | null;    // for sequencing (1,2,3...)
  visitId?: string | null;  // when it was or will be done
  createdAt: string;
}

export interface RadiographRef {
  id: string;
  type: "BWX" | "PA" | "PANO" | "CBCT" | "Other";
  label: string;            // "R-BWX", "PA #14"
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
  procedures: Procedure[];          // both planned & completed (use status)
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
  teeth: ToothRecord[];     // one entry per tooth 1–32
  visits: VisitRecord[];
}

// Clinical note structure
export interface ClinicalNote {
  id: string;
  patientId: string;
  visitId: string;
  visitType: VisitType;
  dateTime: string;
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
  signedBy?: string;
  signedAt?: string;
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
    // It’s fine if not all 32 teeth are listed; other teeth can be empty:
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
