
// Enums
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
  | 'OTHER';

export type UrgencyLevel = 'URGENT' | 'SOON' | 'ELECTIVE';
export type InsuranceMode = 'simple' | 'advanced';
export type FeeScheduleType = 'standard' | 'membership';


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

export interface TreatmentPlanItem {
  id: string;
  treatmentPlanId: string;
  feeScheduleEntryId: string;
  procedureCode: string;
  procedureName: string;
  unitType: FeeUnitType;
  category: FeeCategory;
  
  // Selection details
  selectedTeeth?: number[] | null;
  selectedQuadrants?: ('UR' | 'UL' | 'LL' | 'LR')[] | null;
  selectedArches?: ('UPPER' | 'LOWER')[] | null;

  // Clinical Logic
  urgency?: UrgencyLevel;
  estimatedVisits?: number;
  estimatedDurationWeeks?: number;

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
}

export interface TreatmentPlan {
  id: string;
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
