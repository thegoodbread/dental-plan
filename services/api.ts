import { 
  TreatmentPlan, 
  PlanStatus, 
  ActivityLog, 
  ActivityType, 
  UserRole,
  User,
  Patient,
  ShareLink,
  TreatmentPlanItem
} from '../types';

// --- LOCAL STORAGE KEYS ---
const KEY_PLANS = 'dental_plans';
const KEY_PATIENTS = 'dental_patients';
const KEY_ACTIVITIES = 'dental_activities';
const KEY_SHARES = 'dental_shares';

// --- UTILS ---
const generateId = () => Math.random().toString(36).substring(2, 15);

// --- SEED DATA ---
const SEED_USER: User = {
  id: 'u1',
  name: 'Dr. Sarah Bennett',
  email: 'sarah@dentalpro.com',
  role: UserRole.DOCTOR,
  clinic_id: 'c1'
};

const SEED_PATIENTS: Patient[] = [
  { id: 'p1', clinic_id: 'c1', first_name: 'Alex', last_name: 'Rivera', date_of_birth: '1985-04-12', phone: '555-0123', email: 'alex@example.com' },
  { id: 'p2', clinic_id: 'c1', first_name: 'Jordan', last_name: 'Lee', date_of_birth: '1990-09-21', phone: '555-0987', email: 'jordan@example.com' },
  { id: 'p3', clinic_id: 'c1', first_name: 'Casey', last_name: 'Smith', date_of_birth: '1978-11-05', phone: '555-4567', email: 'casey@example.com' },
];

const SEED_PLANS: TreatmentPlan[] = [
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
  }
];

// Initialize Storage if empty
const initStorage = () => {
  if (!localStorage.getItem(KEY_PATIENTS)) {
    localStorage.setItem(KEY_PATIENTS, JSON.stringify(SEED_PATIENTS));
  }
  if (!localStorage.getItem(KEY_PLANS)) {
    localStorage.setItem(KEY_PLANS, JSON.stringify(SEED_PLANS));
  }
  if (!localStorage.getItem(KEY_ACTIVITIES)) {
    localStorage.setItem(KEY_ACTIVITIES, JSON.stringify([]));
  }
  if (!localStorage.getItem(KEY_SHARES)) {
    localStorage.setItem(KEY_SHARES, JSON.stringify([]));
  }
};

initStorage();

// --- HELPERS ---
const getStoredPatients = (): Patient[] => JSON.parse(localStorage.getItem(KEY_PATIENTS) || '[]');
const getStoredPlans = (): TreatmentPlan[] => JSON.parse(localStorage.getItem(KEY_PLANS) || '[]');
const saveStoredPlans = (plans: TreatmentPlan[]) => localStorage.setItem(KEY_PLANS, JSON.stringify(plans));
const getStoredActivities = (): ActivityLog[] => JSON.parse(localStorage.getItem(KEY_ACTIVITIES) || '[]');
const saveStoredActivities = (logs: ActivityLog[]) => localStorage.setItem(KEY_ACTIVITIES, JSON.stringify(logs));
const getStoredShares = (): ShareLink[] => JSON.parse(localStorage.getItem(KEY_SHARES) || '[]');
const saveStoredShares = (shares: ShareLink[]) => localStorage.setItem(KEY_SHARES, JSON.stringify(shares));

// --- API METHODS ---

export const getPatients = async (): Promise<Patient[]> => {
  return getStoredPatients();
};

export const getPlans = async (filters: { search?: string; status?: string } = {}): Promise<TreatmentPlan[]> => {
  const allPlans = getStoredPlans();
  const allPatients = getStoredPatients();

  // Hydrate patients
  let results = allPlans.map(plan => ({
    ...plan,
    patient: allPatients.find(p => p.id === plan.patient_id)
  }));

  if (filters.status && filters.status !== 'ALL') {
    results = results.filter(p => p.status === filters.status);
  }

  if (filters.search) {
    const term = filters.search.toLowerCase();
    results = results.filter(p => 
      p.plan_number.toLowerCase().includes(term) ||
      p.patient?.first_name.toLowerCase().includes(term) ||
      p.patient?.last_name.toLowerCase().includes(term) ||
      p.title.toLowerCase().includes(term)
    );
  }

  return results.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
};

export const getPlanById = async (id: string): Promise<TreatmentPlan | null> => {
  const plans = getStoredPlans();
  const plan = plans.find(p => p.id === id);
  if (!plan) return null;
  
  const patients = getStoredPatients();
  return {
    ...plan,
    patient: patients.find(p => p.id === plan.patient_id)
  };
};

export const createPlan = async (patientId: string, title: string): Promise<TreatmentPlan> => {
  const plans = getStoredPlans();
  const patients = getStoredPatients();
  const patient = patients.find(p => p.id === patientId);
  
  if (!patient) throw new Error("Patient not found");

  const newPlan: TreatmentPlan = {
    id: generateId(),
    clinic_id: 'c1',
    patient_id: patientId,
    plan_number: `TP-2025-${Math.floor(1000 + Math.random() * 9000)}`,
    title,
    status: PlanStatus.DRAFT,
    created_by_user_id: SEED_USER.id,
    total_fee: 0,
    estimated_insurance: 0,
    patient_portion: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    items: []
  };

  plans.unshift(newPlan);
  saveStoredPlans(plans);
  await logActivity(newPlan.id, ActivityType.PLAN_CREATED, `Plan created for ${patient.first_name} ${patient.last_name}`);
  
  return { ...newPlan, patient };
};

export const updatePlan = async (id: string, updates: Partial<TreatmentPlan>): Promise<TreatmentPlan> => {
  const plans = getStoredPlans();
  const idx = plans.findIndex(p => p.id === id);
  if (idx === -1) throw new Error("Plan not found");

  const updatedPlan = {
    ...plans[idx],
    ...updates,
    updated_at: new Date().toISOString()
  };

  plans[idx] = updatedPlan;
  saveStoredPlans(plans);
  return getPlanById(id) as Promise<TreatmentPlan>;
};

export const updatePlanStatus = async (id: string, status: PlanStatus): Promise<TreatmentPlan> => {
  const plans = getStoredPlans();
  const idx = plans.findIndex(p => p.id === id);
  if (idx === -1) throw new Error("Plan not found");

  const now = new Date().toISOString();
  const updates: Partial<TreatmentPlan> = {
    status,
    updated_at: now,
    presented_at: status === PlanStatus.PRESENTED ? now : plans[idx].presented_at,
    decided_at: (status === PlanStatus.ACCEPTED || status === PlanStatus.DECLINED) ? now : plans[idx].decided_at
  };

  plans[idx] = { ...plans[idx], ...updates };
  saveStoredPlans(plans);

  await logActivity(id, 
    status === PlanStatus.ACCEPTED ? ActivityType.PLAN_ACCEPTED : 
    status === PlanStatus.DECLINED ? ActivityType.PLAN_DECLINED : ActivityType.PLAN_UPDATED, 
    `Plan marked as ${status}`
  );

  return getPlanById(id) as Promise<TreatmentPlan>;
};

// --- ITEM MANAGEMENT ---

export const addItemToPlan = async (planId: string, itemData: Omit<TreatmentPlanItem, 'id' | 'treatment_plan_id'>): Promise<TreatmentPlan> => {
  const plans = getStoredPlans();
  const idx = plans.findIndex(p => p.id === planId);
  if (idx === -1) throw new Error("Plan not found");

  const newItem: TreatmentPlanItem = {
    id: generateId(),
    treatment_plan_id: planId,
    ...itemData
  };

  plans[idx].items.push(newItem);
  
  // Recalculate totals
  const total = plans[idx].items.reduce((sum, i) => sum + i.fee, 0);
  plans[idx].total_fee = total;
  plans[idx].patient_portion = total - (plans[idx].estimated_insurance || 0);
  plans[idx].updated_at = new Date().toISOString();

  saveStoredPlans(plans);
  return getPlanById(planId) as Promise<TreatmentPlan>;
};

export const updatePlanItem = async (planId: string, itemId: string, updates: Partial<TreatmentPlanItem>): Promise<TreatmentPlan> => {
  const plans = getStoredPlans();
  const planIdx = plans.findIndex(p => p.id === planId);
  if (planIdx === -1) throw new Error("Plan not found");

  const itemIdx = plans[planIdx].items.findIndex(i => i.id === itemId);
  if (itemIdx === -1) throw new Error("Item not found");

  plans[planIdx].items[itemIdx] = { ...plans[planIdx].items[itemIdx], ...updates };
  
  // Recalculate totals
  const total = plans[planIdx].items.reduce((sum, i) => sum + i.fee, 0);
  plans[planIdx].total_fee = total;
  plans[planIdx].patient_portion = total - (plans[planIdx].estimated_insurance || 0);
  plans[planIdx].updated_at = new Date().toISOString();

  saveStoredPlans(plans);
  return getPlanById(planId) as Promise<TreatmentPlan>;
};

export const deletePlanItem = async (planId: string, itemId: string): Promise<TreatmentPlan> => {
  const plans = getStoredPlans();
  const planIdx = plans.findIndex(p => p.id === planId);
  if (planIdx === -1) throw new Error("Plan not found");

  plans[planIdx].items = plans[planIdx].items.filter(i => i.id !== itemId);
  
  // Recalculate totals
  const total = plans[planIdx].items.reduce((sum, i) => sum + i.fee, 0);
  plans[planIdx].total_fee = total;
  plans[planIdx].patient_portion = total - (plans[planIdx].estimated_insurance || 0);
  plans[planIdx].updated_at = new Date().toISOString();

  saveStoredPlans(plans);
  return getPlanById(planId) as Promise<TreatmentPlan>;
};

// --- LOGS & SHARING ---

export const logActivity = async (planId: string, type: ActivityType, message: string) => {
  const logs = getStoredActivities();
  const newLog: ActivityLog = {
    id: generateId(),
    clinic_id: 'c1',
    treatment_plan_id: planId,
    type,
    message,
    created_at: new Date().toISOString()
  };
  logs.unshift(newLog);
  saveStoredActivities(logs);
};

export const getActivityLogs = async (planId: string): Promise<ActivityLog[]> => {
  const logs = getStoredActivities();
  return logs.filter(a => a.treatment_plan_id === planId);
};

export const createShareLink = async (planId: string): Promise<string> => {
  const shares = getStoredShares();
  
  // Invalidate old links for this plan? Optional. Let's keep them valid for now or create new one.
  const token = generateId() + generateId(); // simple long string
  const newShare: ShareLink = {
    id: generateId(),
    treatment_plan_id: planId,
    token,
    expires_at: new Date(Date.now() + 86400000 * 30).toISOString(), // 30 days
    created_at: new Date().toISOString(),
    is_active: true
  };

  shares.push(newShare);
  saveStoredShares(shares);
  await logActivity(planId, ActivityType.PLAN_PRESENTED, 'Share link generated');
  return token;
};

export const getPlanByToken = async (token: string): Promise<TreatmentPlan | null> => {
  const shares = getStoredShares();
  const share = shares.find(s => s.token === token);
  
  if (!share || !share.is_active || new Date(share.expires_at) < new Date()) {
    return null;
  }

  const plans = getStoredPlans();
  const plan = plans.find(p => p.id === share.treatment_plan_id);
  if (!plan) return null;

  const patients = getStoredPatients();
  const hydratedPlan = {
    ...plan,
    patient: patients.find(p => p.id === plan.patient_id)
  };

  // Security: You might want to strip internal notes here before returning
  // In a real backend, we definitely would.
  const { notes_internal, ...safePlan } = hydratedPlan;
  return safePlan as TreatmentPlan;
};