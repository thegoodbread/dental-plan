// Enums matching DB Schema
export enum UserRole {
  DOCTOR = 'DOCTOR',
  TREATMENT_COORDINATOR = 'TREATMENT_COORDINATOR',
  ADMIN = 'ADMIN'
}

export enum PlanStatus {
  DRAFT = 'DRAFT',
  PRESENTED = 'PRESENTED',
  ACCEPTED = 'ACCEPTED',
  DECLINED = 'DECLINED',
  ON_HOLD = 'ON_HOLD'
}

export enum ActivityType {
  PLAN_CREATED = 'PLAN_CREATED',
  PLAN_UPDATED = 'PLAN_UPDATED',
  PLAN_PRESENTED = 'PLAN_PRESENTED',
  PLAN_ACCEPTED = 'PLAN_ACCEPTED',
  PLAN_DECLINED = 'PLAN_DECLINED'
}

// Entities
export interface User {
  id: string;
  role: UserRole;
  name: string;
  email: string;
  clinic_id: string;
}

export interface Patient {
  id: string;
  clinic_id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  phone: string;
  email: string;
  notes?: string;
}

export interface TreatmentPlanItem {
  id: string;
  treatment_plan_id: string;
  procedure_code: string;
  procedure_name: string;
  tooth?: string;
  quadrant?: string;
  fee: number;
  notes?: string;
  sort_order: number;
}

export interface ActivityLog {
  id: string;
  clinic_id: string;
  patient_id?: string;
  treatment_plan_id?: string;
  user_id?: string;
  type: ActivityType;
  message: string;
  created_at: string; // ISO Date
}

export interface TreatmentPlan {
  id: string;
  clinic_id: string;
  patient_id: string;
  patient?: Patient; // Joined data
  plan_number: string;
  title: string;
  status: PlanStatus;
  created_by_user_id: string;
  total_fee: number;
  estimated_insurance: number;
  patient_portion: number;
  created_at: string;
  updated_at: string;
  presented_at?: string;
  decided_at?: string;
  notes_internal?: string;
  items: TreatmentPlanItem[];
}

export interface ShareLink {
  id: string;
  treatment_plan_id: string;
  token: string;
  expires_at: string;
  created_at: string;
  is_active: boolean;
}

// API Responses
export interface PlanListResponse {
  data: TreatmentPlan[];
  total: number;
}

export interface PatientPlanViewData {
  clinic_name: string;
  patient_first_name: string;
  plan: TreatmentPlan;
}