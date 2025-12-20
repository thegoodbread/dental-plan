
import { AssignedRisk, SoapSection } from './domain/dentalTypes';

export type UserRole = 'DOCTOR' | 'TREATMENT_COORDINATOR' | 'ADMIN';

export type TreatmentPlanStatus = 'DRAFT' | 'PRESENTED' | 'ACCEPTED' | 'DECLINED' | 'ON_HOLD';

// Extended Procedure Unit Types
export type ProcedureUnitType = 
  | 'PER_TOOTH' 
  | 'PER_QUADRANT' 
  | 'PER_ARCH' 
  | 'FULL_MOUTH' 
  | 'PER_PROCEDURE' 
  | 'PER_VISIT' 
  | 'TIME_BASED';

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

// --- NEW PROCEDURE LIBRARY MODELS ---

export interface SelectionRules {
  requiresToothSelection: boolean;
  allowsMultipleTeeth: boolean;
  requiresSurfaces: boolean;
  allowsQuadrants: boolean;
  allowsArch: boolean;
  fullMouth: boolean;
  maxSelections?: number;
}

// FIX: Added missing ProcedureDefinition interface used in the procedure library and CSV logic
export interface ProcedureDefinition {
  id: string;
  cdtCode: string;
  name: string;
  category: FeeCategory;
  unitType: ProcedureUnitType;
  pricing: {
    baseFee: number;
    membershipFee: number | null;
  };
  selectionRules: {
    requiresToothSelection?: boolean;
    allowsMultipleTeeth?: boolean;
    requiresSurfaces?: boolean;
    allowsQuadrants?: boolean;
    allowsArch?: boolean;
    fullMouth?: boolean;
    maxSelections?: number;
  };
  defaults: {
    defaultEstimatedVisits: number;
    defaultEstimatedDurationValue: number | null;
    defaultEstimatedDurationUnit: 'days' | 'weeks' | 'months' | null;
  };
  uiHints: {
    layout: 'single' | 'fullRow';
  };
}

export interface ProcedureMeta {
  cdtCode: string;
  category: FeeCategory;
  unitType: ProcedureUnitType;
  selectionRules: SelectionRules;
  defaults: {
    defaultEstimatedVisits: number;
    defaultEstimatedDurationValue: number | null;
    defaultEstimatedDurationUnit: 'days' | 'weeks' | 'months' | null;
  };
  uiHints: {
    layout: 'single' | 'fullRow';
    badges?: string[];
  };
  claims?: {
    checklistTemplateId?: string;
    narrativeTemplateId?: string;
    requiredTruthSlots?: string[];
  };
}

export interface ClinicProcedure {
  cdtCode: string;
  displayName: string;
  baseFee: number;
  membershipFee: number | null;
  categoryOverride?: FeeCategory;
  unitTypeOverride?: ProcedureUnitType;
  defaultEstimatedVisits?: number;
  defaultEstimatedDurationValue?: number | null;
  defaultEstimatedDurationUnit?: 'days' | 'weeks' | 'months' | null;
  layoutOverride?: 'single' | 'fullRow';
}

export interface EffectiveProcedure {
  cdtCode: string;
  displayName: string;
  category: FeeCategory;
  unitType: ProcedureUnitType;
  selectionRules: SelectionRules;
  defaults: {
    defaultEstimatedVisits: number;
    defaultEstimatedDurationValue: number | null;
    defaultEstimatedDurationUnit: 'days' | 'weeks' | 'months' | null;
  };
  pricing: {
    baseFee: number;
    membershipFee: number | null;
  };
  uiHints: {
    layout: 'single' | 'fullRow';
  };
  metaCoverage: 'full' | 'partial' | 'none';
}

// --- EMPLOYEE MODELS ---

export type EmployeeRole = "Dentist" | "Hygienist" | "Assistant" | "FrontDesk" | "OfficeManager" | "Billing" | "Admin";

export interface EmployeePermissions {
  canEditPlans: boolean;
  canEditFees: boolean;
  canPresentPlans: boolean;
  canViewClaimsGuide: boolean;
  canEditClinicalNotes: boolean;
  canManageEmployees: boolean;
  canExportData: boolean;
}

export interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  role: EmployeeRole;
  permissions: EmployeePermissions;
  clinicalSettings?: {
    defaultProviderName?: string;
    signatureText?: string;
    licenseNumber?: string;
  };
}

// --- EXISTING MODELS ---

export const PHASE_BUCKET_LABELS: Record<PhaseBucketKey, string> = {
  FOUNDATION: 'Foundation',
  RESTORATIVE: 'Restorative',
  IMPLANT: 'Implant',
  ELECTIVE: 'Elective',
  OTHER: 'Other'
};

export interface FeeScheduleEntry {
  id: string;
  procedureCode: string;
  procedureName: string;
  category: FeeCategory;
  unitType: any; // Mapped from ProcedureUnitType for UI
  baseFee: number;
  membershipFee?: number | null;
  isActive: boolean;
  defaultEstimatedDurationValue?: number;
  defaultEstimatedDurationUnit?: 'days' | 'weeks' | 'months';
  defaultEstimatedVisits?: number;
}

export interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  dob?: string;
  memberId?: string;
  createdAt: string;
  updatedAt: string;
}

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
  titleIsManual?: boolean;
}

export interface TreatmentPlanItem {
  id: string;
  treatmentPlanId: string;
  feeScheduleEntryId: string;
  procedureCode: string;
  procedureName: string;
  unitType: any;
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
