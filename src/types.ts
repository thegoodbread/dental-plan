import { AssignedRisk, SoapSection, SoapSectionType, ToothNumber, VisitType as DomainVisitType } from './domain/dentalTypes';

export type TreatmentPlanStatus = 'DRAFT' | 'PRESENTED' | 'ACCEPTED' | 'DECLINED' | 'ON_HOLD';

export type FeeCategory = 
  | 'DIAGNOSTIC' | 'PREVENTIVE' | 'RESTORATIVE' | 'ENDODONTIC' 
  | 'PERIO' | 'IMPLANT' | 'PROSTHETIC' | 'ORTHO' | 'COSMETIC' 
  | 'OTHER' | 'SURGICAL';

export type PayerTier = 'GENERIC' | 'CONSERVATIVE' | 'STRICT';
export type AdjudicationRole = 'PRIMARY' | 'SUPPORTING' | 'ADJUNCT';

// FIX: Added missing exported types used for pricing, insurance, and item categorization
export type InsuranceMode = 'simple' | 'advanced';
export type FeeScheduleType = 'standard' | 'membership';
export type ItemType = 'PROCEDURE' | 'ADDON';
export type AddOnKind = 'SEDATION' | 'BONE_GRAFT' | 'MEMBRANE' | 'PRF' | 'CORE_BUILDUP' | 'TEMP_CROWN' | 'PULP_CAP';
export type UrgencyLevel = 'ELECTIVE' | 'SOON' | 'URGENT';
export type ProcedureUnitType = 'PER_TOOTH' | 'PER_QUADRANT' | 'PER_ARCH' | 'FULL_MOUTH' | 'PER_PROCEDURE' | 'PER_VISIT' | 'TIME_BASED';

export type PhaseBucketKey = 'FOUNDATION' | 'RESTORATIVE' | 'IMPLANT' | 'ELECTIVE' | 'OTHER';

export const PHASE_BUCKET_LABELS: Record<PhaseBucketKey, string> = {
  FOUNDATION: 'Foundation',
  RESTORATIVE: 'Restorative',
  IMPLANT: 'Implant',
  ELECTIVE: 'Elective',
  OTHER: 'Other'
};

export type VisitStatus = 'PLANNED' | 'COMPLETED' | 'CANCELLED';
export type ProcedureStatus = 'PLANNED' | 'COMPLETED' | 'SCHEDULED';

export type EmployeeRole = 'Dentist' | 'Hygienist' | 'OfficeManager' | 'Assistant' | 'FrontDesk' | 'Billing' | 'Admin';

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
  role: EmployeeRole;
  permissions: EmployeePermissions;
  clinicalSettings?: {
    licenseNumber?: string;
  };
}

export type SedationReason = 
  | 'MANAGEMENT_OF_SEVERE_ANXIETY' 
  | 'PROCEDURE_COMPLEXITY_AND_DURATION' 
  | 'MEDICAL_CONTRAINDICATION_TO_LOCAL_ONLY' 
  | 'HYPER_SENSITIVE_GAG_REFLEX';

export type ClinicalSectionId = 
  | 'PROVIDER_ID' 
  | 'CHIEF_COMPLAINT' 
  | 'HPI' 
  | 'FINDINGS' 
  | 'EVIDENCE' 
  | 'PROCEDURES';

export interface VisitProcedureRole {
  procedureId: string;
  role: AdjudicationRole;
}

export interface PayerProfile {
  id: string;
  label: string;
  requiredModuleIds: string[];
  requiredEvidenceTypes: string[];
  enforceCompletionStatus: boolean;
  minConfidenceForSubmission: number;
}

// FIX: Added fullMouth property to SelectionRules
export interface SelectionRules {
    requiresToothSelection: boolean;
    allowsMultipleTeeth: boolean;
    requiresSurfaces: boolean;
    allowsQuadrants: boolean;
    allowsArch: boolean;
    fullMouth: boolean;
    maxSelections?: number;
}

export interface ProcedureDefinition {
    id: string;
    cdtCode: string;
    name: string;
    category: FeeCategory;
    unitType: ProcedureUnitType;
    pricing: {
      baseFee: number;
      membershipFee?: number;
    };
    defaults: {
      defaultEstimatedVisits: number;
      defaultEstimatedDurationValue: number;
      defaultEstimatedDurationUnit: 'days' | 'weeks' | 'months';
    };
    selectionRules: SelectionRules;
    uiHints: {
      layout: 'single' | 'fullRow';
    };
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
    metaCoverage: 'full' | 'none';
    isLabelMissing: boolean;
}

export interface ClinicProcedure {
    cdtCode: string;
    displayName: string;
    baseFee: number;
    membershipFee: number | null;
    categoryOverride?: FeeCategory;
    unitTypeOverride?: ProcedureUnitType;
    defaultEstimatedVisits?: number;
    defaultEstimatedDurationValue?: number;
    defaultEstimatedDurationUnit?: 'days' | 'weeks' | 'months';
    layoutOverride?: 'single' | 'fullRow';
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
}

export interface FeeScheduleEntry {
    id: string;
    procedureCode: string;
    procedureName: string;
    category: FeeCategory;
    unitType: ProcedureUnitType;
    baseFee: number;
    membershipFee: number | null;
    isActive: boolean;
    defaultEstimatedVisits: number;
    defaultEstimatedDurationValue?: number;
    defaultEstimatedDurationUnit?: 'days' | 'weeks' | 'months';
}

export interface ShareLink {
    id: string;
    treatmentPlanId: string;
    token: string;
    createdAt: string;
    isActive: boolean;
}

export interface TreatmentPhase {
    id: string;
    planId: string;
    bucketKey: PhaseBucketKey;
    title: string;
    sortOrder: number;
    itemIds: string[];
    durationIsManual: boolean;
    estimatedDurationValue: number | null;
    estimatedDurationUnit: 'days' | 'weeks' | 'months' | null;
    isMonitorPhase?: boolean;
    titleIsManual?: boolean;
}

export type VisitType = DomainVisitType;

export interface Provider {
    id: string;
    fullName: string;
    npi: string;
    createdAt: string;
    updatedAt: string;
}

// --- AUTHORITATIVE CLAIM COMPILER SCHEMA ---

export interface ClaimCompilerInput {
  provider: {
    id: string;
    npi: string;
    specialty?: string;
  };
  visit: {
    serviceDate: string;
    payerTier: PayerTier;
  };
  procedures: Array<{
    id: string;
    cdtCode: string;
    label: string;
    category: FeeCategory;
    role: AdjudicationRole;
    isCompleted: boolean;
    performedDate?: string;
    diagnosisCodes?: string[];
    documentationFlags: {
      hasXray?: boolean;
      hasPhoto?: boolean;
      hasPerioChart?: boolean;
    };
    justificationFlags?: {
      sedationReason?: string;
      buildupReason?: string;
      graftRationale?: string;
    };
    tooth?: string;
    surfaces?: string[];
  }>;
  visitFacts: {
    chiefComplaint?: string;
    hpi?: string;
    findings?: string;
    consentObtained?: boolean;
  };
}

export interface AcceptanceIssue {
  code: string;
  severity: 'blocker' | 'warning';
  message: string;
  ruleId: string;
  targetField?: string;
  procedureId?: string;
  procedureIds?: string[];
  field?: string;
}

export interface ClaimAcceptanceDecision {
  allowed: boolean;
  confidenceScore: number;
  // FIX: Added missing primaryProcedureId field
  primaryProcedureId?: string | null;
  blockers: AcceptanceIssue[];
  warnings: AcceptanceIssue[];
}

// --- CORE APP TYPES ---

export interface TreatmentPlanItem {
  id: string;
  treatmentPlanId: string;
  // FIX: Added missing fields for linking and clinical estimation
  feeScheduleEntryId?: string;
  procedureCode: string;
  procedureName: string;
  category: FeeCategory;
  // FIX: Added unitType, itemType, grossFee, sortOrder, urgency, status
  unitType: ProcedureUnitType;
  itemType: ItemType;
  baseFee: number;
  membershipFee?: number | null;
  baseFeeIsManual?: boolean;
  membershipFeeIsManual?: boolean;
  netFee: number;
  grossFee?: number;
  units: number;
  discount: number;
  sortOrder: number;
  urgency?: UrgencyLevel;
  procedureStatus?: ProcedureStatus;
  performedInVisitId?: string;
  performedDate?: string;
  diagnosisCodes?: string[];
  documentation?: {
    hasXray?: boolean;
    hasPhoto?: boolean;
    hasPerioChart?: boolean;
    hasFmxWithin36Months?: boolean;
    sedationReason?: string;
    narrativeText?: string;
  };
  selectedTeeth?: number[];
  // FIX: Added location selections and metadata flags
  selectedQuadrants?: ('UR'|'UL'|'LR'|'LL')[];
  selectedArches?: ('UPPER'|'LOWER')[];
  surfaces?: string[];
  phaseId?: string;
  phaseLocked?: boolean;
  isCustomProcedureNameMissing?: boolean;
  estimatedVisitsIsManual?: boolean;
  estimatedVisits?: number;
  estimatedDurationIsManual?: boolean;
  estimatedDurationValue?: number | null;
  estimatedDurationUnit?: 'days' | 'weeks' | 'months' | null;
  addOnKind?: AddOnKind;
  linkedItemIds?: string[];
  sedationType?: string;
  notes?: string;
  coveragePercent?: number | null;
  estimatedInsurance?: number | null;
  estimatedPatientPortion?: number | null;
}

export interface TreatmentPlan {
  id: string;
  // FIX: Added missing fields for patient link, financials, and clinical organization
  patientId: string;
  planNumber: string;
  title: string;
  status: TreatmentPlanStatus;
  insuranceMode: InsuranceMode;
  feeScheduleType: FeeScheduleType;
  totalFee: number;
  estimatedInsurance?: number;
  clinicDiscount: number;
  membershipSavings?: number;
  patientPortion: number;
  caseAlias: string;
  createdAt: string;
  updatedAt: string;
  presentedAt?: string;
  itemIds: string[];
  items?: TreatmentPlanItem[];
  phases?: TreatmentPhase[];
  notesInternal?: string;
  explanationForPatient?: string;
  assignedRisks?: AssignedRisk[];
}

export interface Visit {
  id: string;
  treatmentPlanId: string;
  date: string;
  provider: string;
  providerId: string;
  // FIX: Added missing visitType, status, procedures, and metadata
  visitType: VisitType;
  status?: VisitStatus;
  chiefComplaint?: string;
  hpi?: string;
  radiographicFindings?: string;
  attachedProcedureIds: string[];
  createdAt: string;
  claimPrepStatus?: any;
  assignedRisks?: AssignedRisk[];
  soapSections?: SoapSection[];
  seededProcedureIds?: string[];
  clinicalNote?: string;
  noteStatus?: 'draft' | 'signed';
  noteSignedAt?: string;
}

export interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  dob: string;
  // FIX: Added missing memberId and timestamps
  memberId?: string;
  createdAt: string;
  updatedAt: string;
}