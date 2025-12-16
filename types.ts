

// Enums
import { AssignedRisk } from './src/domain/dentalTypes';

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
  | 'PER_PROCEDURE';

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
  | 'SURGICAL'; // Added SURGICAL for grafts etc

export type UrgencyLevel = 'URGENT' | 'SOON' | 'ELECTIVE';
export type InsuranceMode = 'simple' | 'advanced';
export type FeeScheduleType = 'standard' | 'membership';
export type PhaseBucketKey = 'FOUNDATION' | 'RESTORATIVE' | 'IMPLANT' | 'ELECTIVE' | 'OTHER';

export type ItemType = 'PROCEDURE' | 'ADDON'; 

export type AddOnKind =
  | 'SEDATION'
  | 'BONE_GRAFT'
  | 'MEMBRANE'
  | 'PRF'
  | 'TEMP_CROWN'
  | 'CORE_BUILDUP'
  | 'PULP_CAP'
  | 'MEDICATION'
  | 'OCCLUSAL_ADJUSTMENT'
  | 'FOLLOWUP'
  | 'OTHER';

// --- PATIENT DOMAIN ---

export interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  dob?: string;        // ISO date
  memberId?: string;   // insurance subscriber ID
  createdAt: string;
  updatedAt: string;
}

// --- VISIT DOMAIN ---

export type VisitType = 
  | "exam"
  | "restorative"
  | "surgery"
  | "hygiene"
  | "emergency"
  | "consult"
  | "other";

export type ProcedureStatus =
  | 'PLANNED'
  | 'SCHEDULED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'DEFERRED'
  | 'CANCELLED';

export type VisitStatus =
  | 'PLANNED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CLAIM_PREP'
  | 'CLAIM_READY';

export type ClaimStatus =
  | 'NOT_READY'
  | 'READY'
  | 'SUBMITTED_EXTERNALLY'
  | 'SUBMITTED_VIA_INTEGRATION'
  | 'PAID'
  | 'DENIED'
  | 'ADJUSTED';

export interface Visit {
  id: string;              // UUID
  treatmentPlanId: string; // Linked Plan
  date: string;            // ISO Date YYYY-MM-DD (Legacy, use performedDate/scheduledDate preferentially)
  provider: string;        // Display name of provider
  visitType: VisitType;
  attachedProcedureIds: string[]; // List of completed item IDs
  createdAt: string;

  // NEW: Execution & Claim Fields
  scheduledDate?: string;
  performedDate?: string;
  status?: VisitStatus;
  claimPrepStatus?: 'NOT_STARTED' | 'IN_PROGRESS' | 'READY';
  claimId?: string;
  notes?: string;
}

// Entities

export interface User {
  id: string;
  role: UserRole;
  name: string;
  email: string;
}

export interface FeeScheduleEntry {
  id: string;
  procedureCode: string;
  procedureName: string;
  category: FeeCategory;
  unitType: FeeUnitType;
  baseFee: number;
  membershipFee?: number | null;
  defaultNotes?: string | null;
  isActive: boolean;
}

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
  isMonitorPhase?: boolean;
}

export interface TreatmentPlanItem {
  id: string;
  treatmentPlanId: string;
  feeScheduleEntryId: string; // For add-ons, this might be a placeholder ID or null if custom
  procedureCode: string;
  procedureName: string;
  unitType: FeeUnitType;
  category: FeeCategory;
  
  // New Fields for Add-On Support
  itemType: ItemType;
  linkedItemIds?: string[]; // IDs of procedures this add-on applies to
  
  // Specific Add-On Data
  addOnKind?: AddOnKind;
  sedationType?: string; // Legacy field, kept for backward compat

  // Selection details
  selectedTeeth?: number[] | null;
  selectedQuadrants?: ('UR' | 'UL' | 'LL' | 'LR')[] | null;
  selectedArches?: ('UPPER' | 'LOWER')[] | null;

  // Clinical Logic
  urgency?: UrgencyLevel;
  estimatedVisits?: number;
  estimatedDurationValue?: number | null;
  estimatedDurationUnit?: 'days' | 'weeks' | 'months' | null;
  phaseId?: string | null;

  // Pricing
  baseFee: number;
  units: number;
  grossFee: number;
  discount: number;
  netFee: number;

  // Financial Coordinator Fields (Optional)
  coveragePercent?: number | null;
  estimatedInsurance?: number | null;
  estimatedPatientPortion?: number | null;

  notes?: string | null;
  sortOrder: number;

  // VISIT LINKAGE
  performedInVisitId?: string | null; // If set, this procedure is considered "Completed" in that visit

  // NEW: Execution & Claim Fields
  procedureStatus?: ProcedureStatus;  // default to 'PLANNED'
  performedDate?: string;             // ISO date when performed
  
  diagnosisCodes?: string[];          // e.g. ["K02.52", "K05.30"]
  
  documentation?: {
    hasXray?: boolean;
    hasPhoto?: boolean;
    hasPerioChart?: boolean;
    hasFmxWithin36Months?: boolean;
    narrativeText?: string;
  };

  claimMeta?: {
    claimStatus?: ClaimStatus;
    claimId?: string;              // future use
    claimLineNumber?: number;      // optional
    lastClaimActionAt?: string;    // optional ISO timestamp
    denialReasonCode?: string;     // optional
  };
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
  
  itemIds: string[]; // List of IDs for persistence order
  items?: TreatmentPlanItem[]; // Hydrated
  phases?: TreatmentPhase[];
  
  assignedRisks?: AssignedRisk[]; // New Risk Engine Integration
}

export interface ShareLink {
  id: string;
  treatmentPlanId: string;
  token: string;
  expiresAt?: string | null;
  createdAt: string;
  isActive: boolean;
}

export interface ActivityLog {
  id: string;
  treatmentPlanId: string;
  type: ActivityType;
  message: string;
  createdAt: string;
}
