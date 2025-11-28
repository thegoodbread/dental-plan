import { 
  TreatmentPlan, 
  TreatmentPlanStatus, 
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
  role: 'DOCTOR'
};

const SEED_PATIENTS: Patient[] = [
  { id: 'p1', firstName: 'Alex', lastName: 'Rivera', dateOfBirth: '1985-04-12', phone: '555-0123', email: 'alex@example.com' },
  { id: 'p2', firstName: 'Jordan', lastName: 'Lee', dateOfBirth: '1990-09-21', phone: '555-0987', email: 'jordan@example.com' },
  { id: 'p3', firstName: 'Casey', lastName: 'Smith', dateOfBirth: '1978-11-05', phone: '555-4567', email: 'casey@example.com' },
];

const SEED_PLANS: TreatmentPlan[] = [
  {
    id: 'tp1',
    patientId: 'p1',
    planNumber: 'TP-2025-0012',
    title: 'Comprehensive Upper Rehab',
    status: 'DRAFT',
    totalFee: 4500,
    estimatedInsurance: 1500,
    patientPortion: 3000,
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 86400000).toISOString(),
    notesInternal: 'Patient expressed concern about recovery time.',
    itemIds: ['tpi1', 'tpi2'],
    items: [
      { 
        id: 'tpi1', treatmentPlanId: 'tp1', feeScheduleEntryId: 'f1', procedureCode: 'D6010', procedureName: 'Surgical Placement of Implant Body', 
        selectedTeeth: [8], baseFee: 2000, grossFee: 2000, netFee: 2000, units: 1, discount: 0, sortOrder: 1, unitType: 'PER_TOOTH', category: 'IMPLANT' 
      },
      { 
        id: 'tpi2', treatmentPlanId: 'tp1', feeScheduleEntryId: 'f2', procedureCode: 'D6058', procedureName: 'Abutment supported porcelain/ceramic crown', 
        selectedTeeth: [8], baseFee: 2500, grossFee: 2500, netFee: 2500, units: 1, discount: 0, sortOrder: 2, unitType: 'PER_TOOTH', category: 'IMPLANT' 
      }
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
    patient: allPatients.find(p => p.id === plan.patientId)
  }));

  if (filters.status && filters.status !== 'ALL') {
    results = results.filter(p => p.status === filters.status);
  }

  if (filters.search) {
    const term = filters.search.toLowerCase();
    results = results.filter(p => 
      p.planNumber.toLowerCase().includes(term) ||
      p.patient?.firstName.toLowerCase().includes(term) ||
      p.patient?.lastName.toLowerCase().includes(term) ||
      p.title.toLowerCase().includes(term)
    );
  }

  return results.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
};

export const getPlanById = async (id: string): Promise<TreatmentPlan | null> => {
  const plans = getStoredPlans();
  const plan = plans.find(p => p.id === id);
  if (!plan) return null;
  
  const patients = getStoredPatients();
  return {
    ...plan,
    patient: patients.find(p => p.id === plan.patientId)
  };
};

export const createPlan = async (patientId: string, title: string): Promise<TreatmentPlan> => {
  const plans = getStoredPlans();
  const patients = getStoredPatients();
  const patient = patients.find(p => p.id === patientId);
  
  if (!patient) throw new Error("Patient not found");

  const newPlan: TreatmentPlan = {
    id: generateId(),
    patientId: patientId,
    planNumber: `TP-2025-${Math.floor(1000 + Math.random() * 9000)}`,
    title,
    status: 'DRAFT',
    totalFee: 0,
    estimatedInsurance: 0,
    patientPortion: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    itemIds: [],
    items: []
  };

  plans.unshift(newPlan);
  saveStoredPlans(plans);
  await logActivity(newPlan.id, 'PLAN_CREATED', `Plan created for ${patient.firstName} ${patient.lastName}`);
  
  return { ...newPlan, patient };
};

export const updatePlan = async (id: string, updates: Partial<TreatmentPlan>): Promise<TreatmentPlan> => {
  const plans = getStoredPlans();
  const idx = plans.findIndex(p => p.id === id);
  if (idx === -1) throw new Error("Plan not found");

  const updatedPlan = {
    ...plans[idx],
    ...updates,
    updatedAt: new Date().toISOString()
  };

  plans[idx] = updatedPlan;
  saveStoredPlans(plans);
  return getPlanById(id) as Promise<TreatmentPlan>;
};

export const updatePlanStatus = async (id: string, status: TreatmentPlanStatus): Promise<TreatmentPlan> => {
  const plans = getStoredPlans();
  const idx = plans.findIndex(p => p.id === id);
  if (idx === -1) throw new Error("Plan not found");

  const now = new Date().toISOString();
  const updates: Partial<TreatmentPlan> = {
    status,
    updatedAt: now,
    presentedAt: status === 'PRESENTED' ? now : plans[idx].presentedAt,
    decidedAt: (status === 'ACCEPTED' || status === 'DECLINED') ? now : plans[idx].decidedAt
  };

  plans[idx] = { ...plans[idx], ...updates };
  saveStoredPlans(plans);

  await logActivity(id, 
    status === 'ACCEPTED' ? 'PLAN_ACCEPTED' : 
    status === 'DECLINED' ? 'PLAN_DECLINED' : 'PLAN_UPDATED', 
    `Plan marked as ${status}`
  );

  return getPlanById(id) as Promise<TreatmentPlan>;
};

// --- ITEM MANAGEMENT ---

export const addItemToPlan = async (planId: string, itemData: Partial<TreatmentPlanItem>): Promise<TreatmentPlan> => {
  const plans = getStoredPlans();
  const idx = plans.findIndex(p => p.id === planId);
  if (idx === -1) throw new Error("Plan not found");

  const newItem: TreatmentPlanItem = {
    id: generateId(),
    treatmentPlanId: planId,
    feeScheduleEntryId: 'manual',
    procedureCode: 'MISC',
    procedureName: 'New Procedure',
    unitType: 'PER_TOOTH',
    category: 'OTHER',
    baseFee: 0,
    units: 1,
    grossFee: 0,
    discount: 0,
    netFee: 0,
    sortOrder: (plans[idx].items || []).length + 1,
    ...itemData
  } as TreatmentPlanItem;
  
  // Recalc
  if (!newItem.grossFee) newItem.grossFee = newItem.baseFee * newItem.units;
  if (!newItem.netFee) newItem.netFee = newItem.grossFee - newItem.discount;

  if (!plans[idx].items) plans[idx].items = [];
  plans[idx].items!.push(newItem);
  plans[idx].itemIds.push(newItem.id);
  
  // Recalculate totals
  const total = plans[idx].items!.reduce((sum, i) => sum + i.netFee, 0);
  plans[idx].totalFee = total;
  plans[idx].patientPortion = total - (plans[idx].estimatedInsurance || 0);
  plans[idx].updatedAt = new Date().toISOString();

  saveStoredPlans(plans);
  return getPlanById(planId) as Promise<TreatmentPlan>;
};

export const updatePlanItem = async (planId: string, itemId: string, updates: Partial<TreatmentPlanItem>): Promise<TreatmentPlan> => {
  const plans = getStoredPlans();
  const planIdx = plans.findIndex(p => p.id === planId);
  if (planIdx === -1) throw new Error("Plan not found");

  if (!plans[planIdx].items) plans[planIdx].items = [];
  const itemIdx = plans[planIdx].items!.findIndex(i => i.id === itemId);
  if (itemIdx === -1) throw new Error("Item not found");

  plans[planIdx].items![itemIdx] = { ...plans[planIdx].items![itemIdx], ...updates };
  
  // Recalculate totals
  const total = plans[planIdx].items!.reduce((sum, i) => sum + i.netFee, 0);
  plans[planIdx].totalFee = total;
  plans[planIdx].patientPortion = total - (plans[planIdx].estimatedInsurance || 0);
  plans[planIdx].updatedAt = new Date().toISOString();

  saveStoredPlans(plans);
  return getPlanById(planId) as Promise<TreatmentPlan>;
};

export const deletePlanItem = async (planId: string, itemId: string): Promise<TreatmentPlan> => {
  const plans = getStoredPlans();
  const planIdx = plans.findIndex(p => p.id === planId);
  if (planIdx === -1) throw new Error("Plan not found");

  if (plans[planIdx].items) {
    plans[planIdx].items = plans[planIdx].items!.filter(i => i.id !== itemId);
  }
  plans[planIdx].itemIds = plans[planIdx].itemIds.filter(id => id !== itemId);
  
  // Recalculate totals
  const total = (plans[planIdx].items || []).reduce((sum, i) => sum + i.netFee, 0);
  plans[planIdx].totalFee = total;
  plans[planIdx].patientPortion = total - (plans[planIdx].estimatedInsurance || 0);
  plans[planIdx].updatedAt = new Date().toISOString();

  saveStoredPlans(plans);
  return getPlanById(planId) as Promise<TreatmentPlan>;
};

// --- LOGS & SHARING ---

export const logActivity = async (planId: string, type: ActivityType, message: string) => {
  const logs = getStoredActivities();
  const newLog: ActivityLog = {
    id: generateId(),
    treatmentPlanId: planId,
    type,
    message,
    createdAt: new Date().toISOString()
  };
  logs.unshift(newLog);
  saveStoredActivities(logs);
};

export const getActivityLogs = async (planId: string): Promise<ActivityLog[]> => {
  const logs = getStoredActivities();
  return logs.filter(a => a.treatmentPlanId === planId);
};

export const createShareLink = async (planId: string): Promise<string> => {
  const shares = getStoredShares();
  
  const token = generateId() + generateId();
  const newShare: ShareLink = {
    id: generateId(),
    treatmentPlanId: planId,
    token,
    expiresAt: new Date(Date.now() + 86400000 * 30).toISOString(),
    createdAt: new Date().toISOString(),
    isActive: true
  };

  shares.push(newShare);
  saveStoredShares(shares);
  await logActivity(planId, 'PLAN_PRESENTED', 'Share link generated');
  return token;
};

export const getPlanByToken = async (token: string): Promise<TreatmentPlan | null> => {
  const shares = getStoredShares();
  const share = shares.find(s => s.token === token);
  
  if (!share || !share.isActive || (share.expiresAt && new Date(share.expiresAt) < new Date())) {
    return null;
  }

  const plans = getStoredPlans();
  const plan = plans.find(p => p.id === share.treatmentPlanId);
  if (!plan) return null;

  const patients = getStoredPatients();
  const hydratedPlan = {
    ...plan,
    patient: patients.find(p => p.id === plan.patientId)
  };

  const { notesInternal, ...safePlan } = hydratedPlan;
  return safePlan as TreatmentPlan;
};