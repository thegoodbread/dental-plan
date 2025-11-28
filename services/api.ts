import { 
  TreatmentPlan, 
  PlanStatus, 
  ActivityLog, 
  ActivityType, 
  UserRole,
  User,
  Patient,
  ShareLink
} from '../types';

// --- MOCK DATABASE STATE ---
// In a real app, this would be in PostgreSQL accessed via Prisma

const MOCK_USER: User = {
  id: 'u1',
  name: 'Dr. Sarah Bennett',
  email: 'sarah@dentalpro.com',
  role: UserRole.DOCTOR,
  clinic_id: 'c1'
};

const MOCK_PATIENTS: Patient[] = [
  { id: 'p1', clinic_id: 'c1', first_name: 'Alex', last_name: 'Rivera', date_of_birth: '1985-04-12', phone: '555-0123', email: 'alex@example.com' },
  { id: 'p2', clinic_id: 'c1', first_name: 'Jordan', last_name: 'Lee', date_of_birth: '1990-09-21', phone: '555-0987', email: 'jordan@example.com' },
];

let MOCK_PLANS: TreatmentPlan[] = [
  {
    id: 'tp1',
    clinic_id: 'c1',
    patient_id: 'p1',
    plan_number: 'TP-2025-0012',
    title: 'Comprehensive Upper Rehab',
    status: PlanStatus.DRAFT,
    created_by_user_id: 'u1',
    total_fee: 4500,
    estimated_insurance: 1500,
    patient_portion: 3000,
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    updated_at: new Date(Date.now() - 86400000).toISOString(),
    notes_internal: 'Patient expressed concern about recovery time.',
    items: [
      { id: 'tpi1', treatment_plan_id: 'tp1', procedure_code: 'D6010', procedure_name: 'Surgical Placement of Implant Body', tooth: '8', fee: 2000, sort_order: 1 },
      { id: 'tpi2', treatment_plan_id: 'tp1', procedure_code: 'D6058', procedure_name: 'Abutment supported porcelain/ceramic crown', tooth: '8', fee: 2500, sort_order: 2 }
    ]
  },
  {
    id: 'tp2',
    clinic_id: 'c1',
    patient_id: 'p2',
    plan_number: 'TP-2025-0015',
    title: 'Invisalign Full Case',
    status: PlanStatus.ACCEPTED,
    created_by_user_id: 'u1',
    total_fee: 5500,
    estimated_insurance: 1000,
    patient_portion: 4500,
    created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 4).toISOString(),
    decided_at: new Date(Date.now() - 86400000 * 4).toISOString(),
    items: [
      { id: 'tpi3', treatment_plan_id: 'tp2', procedure_code: 'D8090', procedure_name: 'Comprehensive orthodontic treatment', fee: 5500, sort_order: 1 }
    ]
  }
];

let MOCK_ACTIVITIES: ActivityLog[] = [
  {
    id: 'a1',
    clinic_id: 'c1',
    plan_number: 'TP-2025-0012',
    type: ActivityType.PLAN_CREATED,
    message: 'Plan created by Dr. Sarah Bennett',
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
  }
] as any; // Using any to cheat slightly on joining plain logic for the mock

const MOCK_SHARES: ShareLink[] = [];

// --- SERVICE METHODS (Simulating API Calls) ---

export const getPlans = async (filters: { search?: string; status?: string } = {}): Promise<TreatmentPlan[]> => {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 300));

  let results = MOCK_PLANS.map(plan => ({
    ...plan,
    patient: MOCK_PATIENTS.find(p => p.id === plan.patient_id)
  }));

  if (filters.status && filters.status !== 'ALL') {
    results = results.filter(p => p.status === filters.status);
  }

  if (filters.search) {
    const term = filters.search.toLowerCase();
    results = results.filter(p => 
      p.plan_number.toLowerCase().includes(term) ||
      p.patient?.first_name.toLowerCase().includes(term) ||
      p.patient?.last_name.toLowerCase().includes(term)
    );
  }

  return results.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
};

export const getPlanById = async (id: string): Promise<TreatmentPlan | null> => {
  await new Promise(resolve => setTimeout(resolve, 200));
  const plan = MOCK_PLANS.find(p => p.id === id);
  if (!plan) return null;
  return {
    ...plan,
    patient: MOCK_PATIENTS.find(p => p.id === plan.patient_id)
  };
};

export const updatePlanStatus = async (id: string, status: PlanStatus): Promise<TreatmentPlan> => {
  await new Promise(resolve => setTimeout(resolve, 200));
  const planIndex = MOCK_PLANS.findIndex(p => p.id === id);
  if (planIndex === -1) throw new Error("Plan not found");

  const now = new Date().toISOString();
  MOCK_PLANS[planIndex] = {
    ...MOCK_PLANS[planIndex],
    status,
    updated_at: now,
    presented_at: status === PlanStatus.PRESENTED ? now : MOCK_PLANS[planIndex].presented_at,
    decided_at: (status === PlanStatus.ACCEPTED || status === PlanStatus.DECLINED) ? now : MOCK_PLANS[planIndex].decided_at
  };

  // Log Activity
  const log: ActivityLog = {
    id: `act_${Date.now()}`,
    clinic_id: 'c1',
    treatment_plan_id: id,
    type: status === PlanStatus.ACCEPTED ? ActivityType.PLAN_ACCEPTED : ActivityType.PLAN_UPDATED,
    message: `Plan marked as ${status}`,
    created_at: now
  };
  MOCK_ACTIVITIES.unshift(log);

  return getPlanById(id) as Promise<TreatmentPlan>;
};

export const createShareLink = async (planId: string): Promise<string> => {
  await new Promise(resolve => setTimeout(resolve, 200));
  const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  const link: ShareLink = {
    id: `sl_${Date.now()}`,
    treatment_plan_id: planId,
    token,
    expires_at: new Date(Date.now() + 86400000 * 30).toISOString(),
    created_at: new Date().toISOString(),
    is_active: true
  };
  MOCK_SHARES.push(link);
  return token;
};

export const getPlanByToken = async (token: string): Promise<TreatmentPlan | null> => {
  await new Promise(resolve => setTimeout(resolve, 300));
  const share = MOCK_SHARES.find(s => s.token === token);
  
  if (!share || !share.is_active || new Date(share.expires_at) < new Date()) {
    return null;
  }

  const plan = MOCK_PLANS.find(p => p.id === share.treatment_plan_id);
  if (!plan) return null;

  // Sanitize data for public view (remove internal notes, etc if needed)
  return {
    ...plan,
    patient: MOCK_PATIENTS.find(p => p.id === plan.patient_id)
  };
};

export const getActivityLogs = async (planId: string): Promise<ActivityLog[]> => {
  return MOCK_ACTIVITIES.filter(a => a.treatment_plan_id === planId);
};
