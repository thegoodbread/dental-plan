import { AssignedRisk, SoapSection } from './domain/dentalTypes';

export type UserRole = 'DOCTOR' | 'TREATMENT_COORDINATOR' | 'ADMIN';

export type TreatmentPlanStatus = 'DRAFT' | 'PRESENTED' | 'ACCEPTED' | 'DECLINED' | 'ON_HOLD';

export type ActivityType = 
  | 'PLAN_CREATED' 
  | 'PLAN_UPDATED' 
  | 'PLAN_PRESENTED' 
  | 'PLAN_ACCEPTED' 
  | 'PLAN_DECLINED';

export type FeeUnitType =
  | 'PER_TOOTH'
  | 'PER_QUADRANT'
  | 'PER_ARCH'
  | 'PER_MOUTH'
  | 'PER_PROCEDURE'
  | 'TIME_BASED'
  | 'FULL_MOUTH';

export type FeeCategory = 
  | 'DIAGNOSTIC'
  | 'PREVENTIVE'
  | 'RESTORATIVE'
  | 'ENDODONTIC'
  | 'PERIO'
  | 'IMPLANT'
  | 'PROSTHETIC'
  | 'ORTHO'
  | 'COSMETIC'
  | 'OTHER'
  | 'SURGICAL'; 

export type UrgencyLevel = 'URGENT' | 'SOON' | 'ELECTIVE';
export type InsuranceMode = 'simple' | 'advanced';
export type FeeScheduleType = 'standard' | 'membership';
export type PhaseBucketKey = 'FOUNDATION' | 'RESTORATIVE' | 'IMPLANT' | 'ELECTIVE' | 'OTHER';

// FIX: Added missing PHASE_BUCKET_LABELS constant for treatment planning UI components
export const PHASE_BUCKET_LABELS: Record<PhaseBucketKey, string> = {
  FOUNDATION: 'Foundation',
  RESTORATIVE: 'Restorative',
  IMPLANT: 'Implant',
  ELECTIVE: 'Elective',
  OTHER: 'Other'
};

// --- NEW PROCEDURE LIBRARY MODELS ---

export interface SelectionRules {
  requiresToothSelection?: boolean;
  allowsMultipleTeeth?: boolean;
  requiresSurfaces?: boolean;
  allowsQuadrants?: boolean;
  allowsArch?: boolean;
  fullMouth?: boolean;
  maxSelections?: number;
}

export interface ProcedureDefinition {
  id: string;
  cdtCode: string;
  name: string;
  category: FeeCategory;
  unitType: FeeUnitType;
  pricing: {
    baseFee: number;
    membershipFee?: number;
  };
  selectionRules: SelectionRules;
  defaults: {
    defaultEstimatedVisits: number;
    defaultEstimatedDurationValue: number;
    defaultEstimatedDurationUnit: 'days' | 'weeks' | 'months' | null;
  };
  uiHints: {
    layout: 'single' | 'fullRow';
  };
}

export interface FeeScheduleEntry {
  id: string;
  procedureCode: string;
  procedureName: string;
  category: FeeCategory;
  unitType: FeeUnitType;
  baseFee: number;
  membershipFee?: number | null;
  isActive: boolean;
  defaultEstimatedDurationValue?: number;
  defaultEstimatedDurationUnit?: 'days' | 'weeks' | 'months';
  defaultEstimatedVisits?: number;
}

// --- REST OF TYPES REMAIN UNCHANGED ---
export interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  dob?: string;
  memberId?: string;
  createdAt: string;
  updatedAt: string;
}

// FIX: Added missing Provider interface used for clinical identity and visit tracking
export interface Provider {
  id: string;
  fullName: string;
  npi: string;
  createdAt: string;
  updatedAt: string;
}

export interface Visit {
  id: string;
  treatmentPlanId: string;
  date: string;
  provider: string;
  providerId?: string;
  visitType: VisitType;
  attachedProcedureIds: string[];
  createdAt: string;
  status?: VisitStatus;
  claimPrepStatus?: 'NOT_STARTED' | 'IN_PROGRESS' | 'READY';
  soapSections?: SoapSection[];
  seededProcedureIds?: string[];
  assignedRisks?: AssignedRisk[];
  // FIX: Added missing properties required for clinical documentation, SOAP generation, and claim readiness checks
  performedDate?: string;
  clinicalNote?: string;
  chiefComplaint?: string;
  hpi?: string;
  radiographicFindings?: string;
  noteStatus?: 'draft' | 'signed';
  noteSignedAt?: string;
}

export type VisitType = "exam" | "restorative" | "surgery" | "hygiene" | "emergency" | "consult" | "ortho" | "endo" | "other";
export type ProcedureStatus = 'PLANNED' | 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'DEFERRED' | 'CANCELLED';
export type VisitStatus = 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CLAIM_PREP' | 'CLAIM_READY';
export type ClaimStatus = 'NOT_READY' | 'READY' | 'SUBMITTED_EXTERNALLY' | 'PAID' | 'DENIED' | 'ADJUSTED';
export type ItemType = 'PROCEDURE' | 'ADDON';
export type AddOnKind = 'SEDATION' | 'BONE_GRAFT' | 'MEMBRANE' | 'PRF' | 'TEMP_CROWN' | 'CORE_BUILDUP' | 'PULP_CAP' | 'MEDICATION' | 'OCCLUSAL_ADJUSTMENT' | 'FOLLOWUP' | 'OTHER';

export interface TreatmentPhase {
  id: string;
  planId: string;
  bucketKey: PhaseBucketKey;
  title: string;
  description?: string;
  sortOrder: number;
  itemIds: string[];
  estimatedVisits?: number;
  estimatedDurationValue?: number | null;
  estimatedDurationUnit?: 'days' | 'weeks' | 'months' | null;
  durationIsManual?: boolean;
  isMonitorPhase?: boolean;
  titleIsManual?: boolean; // NEW: Track if title was manually set by clinician
}

export interface TreatmentPlanItem {
  id: string;
  treatmentPlanId: string;
  feeScheduleEntryId: string;
  procedureCode: string;
  procedureName: string;
  unitType: FeeUnitType;
  category: FeeCategory;
  itemType: ItemType;
  linkedItemIds?: string[];
  addOnKind?: AddOnKind;
  selectedTeeth?: number[] | null;
  surfaces?: string[];
  selectedQuadrants?: ('UR' | 'UL' | 'LL' | 'LR')[] | null;
  selectedArches?: ('UPPER' | 'LOWER')[] | null;
  urgency?: UrgencyLevel;
  estimatedVisits?: number;
  estimatedVisitsIsManual?: boolean;
  estimatedDurationValue?: number | null;
  estimatedDurationUnit?: 'days' | 'weeks' | 'months' | null;
  estimatedDurationIsManual?: boolean;
  phaseId?: string | null;
  phaseLocked?: boolean;
  baseFee: number;
  membershipFee?: number | null;
  units: number;
  grossFee: number;
  discount: number;
  netFee: number;
  coveragePercent?: number | null;
  estimatedInsurance?: number | null;
  estimatedPatientPortion?: number | null;
  notes?: string | null;
  sortOrder: number;
  performedInVisitId?: string | null;
  procedureStatus?: ProcedureStatus;
  performedDate?: string;
  diagnosisCodes?: string[];
  documentation?: {
    hasXray?: boolean;
    hasPhoto?: boolean;
    hasPerioChart?: boolean;
    hasFmxWithin36Months?: boolean;
    narrativeText?: string;
  };
  // FIX: Added missing sedationType property for tracking sub-item details
  sedationType?: string;
}

export interface TreatmentPlan {
  id: string;
  patientId?: string;
  caseAlias?: string;
  planNumber: string;
  title: string;
  status: TreatmentPlanStatus;
  totalFee: number;
  estimatedInsurance?: number | null;
  clinicDiscount: number;
  membershipSavings?: number | null;
  patientPortion: number;
  insuranceMode: InsuranceMode;
  feeScheduleType: FeeScheduleType;
  createdAt: string;
  updatedAt: string;
  presentedAt?: string | null;
  decidedAt?: string | null;
  notesInternal?: string | null;
  explanationForPatient?: string | null;
  itemIds: string[];
  items?: TreatmentPlanItem[];
  phases?: TreatmentPhase[];
  assignedRisks?: AssignedRisk[];
}

export interface ShareLink {
  id: string;
  treatmentPlanId: string;
  token: string;
  expiresAt?: string | null;
  createdAt: string;
  isActive: boolean;
}