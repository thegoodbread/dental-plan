import { 
  TreatmentPlan, 
  TreatmentPlanItem, 
  FeeScheduleEntry, 
  Patient, 
  ActivityLog, 
  ShareLink,
  TreatmentPlanStatus,
  FeeUnitType
} from '../types';

// --- KEYS ---
const KEY_PLANS = 'dental_plans_v2';
const KEY_ITEMS = 'dental_plan_items_v2';
const KEY_PATIENTS = 'dental_patients_v2';
const KEY_FEE_SCHEDULE = 'dental_fee_schedule_v2';
const KEY_SHARES = 'dental_shares_v2';
const KEY_LOGS = 'dental_logs_v2';

// --- UTILS ---
const generateId = () => Math.random().toString(36).substring(2, 10) + Date.now().toString(36);

// --- SEED DATA ---
const SEED_PATIENTS: Patient[] = [
  { id: 'p1', firstName: 'Alex', lastName: 'Rivera', dateOfBirth: '1985-04-12', phone: '555-0123', email: 'alex@example.com' },
  { id: 'p2', firstName: 'Jordan', lastName: 'Lee', dateOfBirth: '1990-09-21', phone: '555-0987', email: 'jordan@example.com' },
];

const SEED_FEES: FeeScheduleEntry[] = [
  { id: 'f1', procedureCode: 'D0150', procedureName: 'Comprehensive Oral Eval', category: 'OTHER', unitType: 'PER_PROCEDURE', baseFee: 120, isActive: true },
  { id: 'f2', procedureCode: 'D0210', procedureName: 'Intraoral - complete series', category: 'OTHER', unitType: 'PER_PROCEDURE', baseFee: 150, isActive: true },
  { id: 'f3', procedureCode: 'D1110', procedureName: 'Prophylaxis - Adult', category: 'PERIO', unitType: 'PER_PROCEDURE', baseFee: 110, isActive: true },
  { id: 'f4', procedureCode: 'D2391', procedureName: 'Resin-based composite - 1 surf', category: 'RESTORATIVE', unitType: 'PER_TOOTH', baseFee: 180, isActive: true },
  { id: 'f5', procedureCode: 'D2392', procedureName: 'Resin-based composite - 2 surf', category: 'RESTORATIVE', unitType: 'PER_TOOTH', baseFee: 220, isActive: true },
  { id: 'f6', procedureCode: 'D2740', procedureName: 'Crown - porcelain/ceramic', category: 'RESTORATIVE', unitType: 'PER_TOOTH', baseFee: 1200, isActive: true },
  { id: 'f7', procedureCode: 'D6010', procedureName: 'Surgical placement of implant body', category: 'IMPLANT', unitType: 'PER_TOOTH', baseFee: 2100, isActive: true },
  { id: 'f8', procedureCode: 'D6058', procedureName: 'Abutment supported crown', category: 'IMPLANT', unitType: 'PER_TOOTH', baseFee: 1400, isActive: true },
  { id: 'f9', procedureCode: 'D4341', procedureName: 'Perio scaling & root planing - 4+ teeth', category: 'PERIO', unitType: 'PER_QUADRANT', baseFee: 250, isActive: true },
  { id: 'f10', procedureCode: 'D5110', procedureName: 'Complete denture - maxillary', category: 'RESTORATIVE', unitType: 'PER_ARCH', baseFee: 1800, isActive: true },
  { id: 'f11', procedureCode: 'D5120', procedureName: 'Complete denture - mandibular', category: 'RESTORATIVE', unitType: 'PER_ARCH', baseFee: 1800, isActive: true },
];

// --- PRICING LOGIC ---

export const computeItemPricing = (
  item: Partial<TreatmentPlanItem>,
  feeEntry?: FeeScheduleEntry
): Partial<TreatmentPlanItem> => {
  // 1. Defaults
  const unitType = item.unitType || feeEntry?.unitType || 'PER_PROCEDURE';
  // Use existing baseFee override, or fallback to feeEntry, or 0
  let baseFee = item.baseFee;
  if (baseFee === undefined && feeEntry) {
    baseFee = feeEntry.baseFee;
  }
  baseFee = baseFee || 0;

  // 2. Compute Units
  let units = 1;
  if (unitType === 'PER_TOOTH') {
    units = (item.selectedTeeth && item.selectedTeeth.length > 0) ? item.selectedTeeth.length : 1;
  } else if (unitType === 'PER_QUADRANT') {
    units = (item.selectedQuadrants && item.selectedQuadrants.length > 0) ? item.selectedQuadrants.length : 1;
  } else if (unitType === 'PER_ARCH') {
    units = (item.selectedArches && item.selectedArches.length > 0) ? item.selectedArches.length : 1;
  }
  
  // 3. Compute Fees
  const grossFee = baseFee * units;
  const discount = item.discount || 0;
  const netFee = Math.max(0, grossFee - discount);

  return {
    ...item,
    unitType,
    baseFee,
    units,
    grossFee,
    discount,
    netFee
  };
};

// --- INITIALIZATION ---

export const initServices = () => {
  if (!localStorage.getItem(KEY_PATIENTS)) {
    localStorage.setItem(KEY_PATIENTS, JSON.stringify(SEED_PATIENTS));
  }
  if (!localStorage.getItem(KEY_FEE_SCHEDULE)) {
    localStorage.setItem(KEY_FEE_SCHEDULE, JSON.stringify(SEED_FEES));
  }
  if (!localStorage.getItem(KEY_PLANS)) localStorage.setItem(KEY_PLANS, '[]');
  if (!localStorage.getItem(KEY_ITEMS)) localStorage.setItem(KEY_ITEMS, '[]');
  if (!localStorage.getItem(KEY_SHARES)) localStorage.setItem(KEY_SHARES, '[]');
  if (!localStorage.getItem(KEY_LOGS)) localStorage.setItem(KEY_LOGS, '[]');
};

// --- FEE SCHEDULE ---

export const getFeeSchedule = (): FeeScheduleEntry[] => {
  return JSON.parse(localStorage.getItem(KEY_FEE_SCHEDULE) || '[]');
};

export const findFeeByCode = (code: string): FeeScheduleEntry | undefined => {
  const fees = getFeeSchedule();
  return fees.find(f => f.procedureCode === code);
};

// --- PATIENTS ---
export const getPatients = (): Patient[] => {
  return JSON.parse(localStorage.getItem(KEY_PATIENTS) || '[]');
};

// --- PLAN CRUD ---

export const getAllTreatmentPlans = (): TreatmentPlan[] => {
  const plans: TreatmentPlan[] = JSON.parse(localStorage.getItem(KEY_PLANS) || '[]');
  const patients = getPatients();
  
  return plans.map(p => ({
    ...p,
    patient: patients.find(pat => pat.id === p.patientId)
  })).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
};

export const getTreatmentPlanById = (id: string): TreatmentPlan | undefined => {
  const plans: TreatmentPlan[] = JSON.parse(localStorage.getItem(KEY_PLANS) || '[]');
  const plan = plans.find(p => p.id === id);
  if (!plan) return undefined;

  const patients = getPatients();
  const allItems: TreatmentPlanItem[] = JSON.parse(localStorage.getItem(KEY_ITEMS) || '[]');
  
  // Hydrate
  const planItems = plan.itemIds
    .map(itemId => allItems.find(i => i.id === itemId))
    .filter((i): i is TreatmentPlanItem => !!i);

  return {
    ...plan,
    patient: patients.find(pat => pat.id === plan.patientId),
    items: planItems
  };
};

const savePlan = (plan: TreatmentPlan) => {
  const plans: TreatmentPlan[] = JSON.parse(localStorage.getItem(KEY_PLANS) || '[]');
  const idx = plans.findIndex(p => p.id === plan.id);
  
  // Dehydrate for storage (remove joined objects)
  const { patient, items, ...storagePlan } = plan;
  
  if (idx >= 0) {
    plans[idx] = storagePlan as TreatmentPlan;
  } else {
    plans.push(storagePlan as TreatmentPlan);
  }
  localStorage.setItem(KEY_PLANS, JSON.stringify(plans));
};

export const createTreatmentPlan = (data: { patientId: string; title: string }): TreatmentPlan => {
  const newPlan: TreatmentPlan = {
    id: generateId(),
    patientId: data.patientId,
    title: data.title,
    planNumber: `TP-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
    status: 'DRAFT',
    totalFee: 0,
    estimatedInsurance: 0,
    patientPortion: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    itemIds: []
  };
  savePlan(newPlan);
  logActivity({ treatmentPlanId: newPlan.id, type: 'PLAN_CREATED', message: 'Plan created' });
  return newPlan;
};

export const updateTreatmentPlan = (id: string, updates: Partial<TreatmentPlan>): TreatmentPlan | undefined => {
  const plan = getTreatmentPlanById(id);
  if (!plan) return undefined;

  const updatedPlan = { ...plan, ...updates, updatedAt: new Date().toISOString() };
  
  // Recalculate patient portion if financials changed
  if (updates.estimatedInsurance !== undefined || updates.totalFee !== undefined) {
    updatedPlan.patientPortion = Math.max(0, updatedPlan.totalFee - (updatedPlan.estimatedInsurance || 0));
  }

  savePlan(updatedPlan);
  return updatedPlan;
};

// --- ITEMS CRUD & CALCULATIONS ---

const recalculatePlanTotals = (planId: string) => {
  const plan = getTreatmentPlanById(planId);
  if (!plan || !plan.items) return;

  const totalFee = plan.items.reduce((sum, item) => sum + item.netFee, 0);
  const patientPortion = Math.max(0, totalFee - (plan.estimatedInsurance || 0));

  updateTreatmentPlan(planId, { totalFee, patientPortion });
};

export const createTreatmentPlanItem = (
  planId: string, 
  data: { 
    feeScheduleEntryId: string;
    procedureCode?: string;
    procedureName?: string;
    baseFeeOverride?: number;
  }
): TreatmentPlanItem => {
  const fees = getFeeSchedule();
  const feeEntry = fees.find(f => f.id === data.feeScheduleEntryId);
  
  if (!feeEntry) throw new Error("Fee entry not found");

  const rawItem: Partial<TreatmentPlanItem> = {
    id: generateId(),
    treatmentPlanId: planId,
    feeScheduleEntryId: feeEntry.id,
    procedureCode: data.procedureCode || feeEntry.procedureCode,
    procedureName: data.procedureName || feeEntry.procedureName,
    unitType: feeEntry.unitType,
    category: feeEntry.category,
    baseFee: data.baseFeeOverride,
    sortOrder: 999
  };

  const computedItem = computeItemPricing(rawItem, feeEntry) as TreatmentPlanItem;
  
  // Save Item
  const allItems: TreatmentPlanItem[] = JSON.parse(localStorage.getItem(KEY_ITEMS) || '[]');
  allItems.push(computedItem);
  localStorage.setItem(KEY_ITEMS, JSON.stringify(allItems));

  // Update Plan
  const plan = getTreatmentPlanById(planId);
  if (plan) {
    plan.itemIds.push(computedItem.id);
    savePlan(plan);
    recalculatePlanTotals(planId);
  }

  return computedItem;
};

export const updateTreatmentPlanItem = (id: string, updates: Partial<TreatmentPlanItem>): TreatmentPlanItem | undefined => {
  const allItems: TreatmentPlanItem[] = JSON.parse(localStorage.getItem(KEY_ITEMS) || '[]');
  const idx = allItems.findIndex(i => i.id === id);
  if (idx === -1) return undefined;

  const currentItem = allItems[idx];
  
  // Re-run pricing logic
  const mergedForCalc = { ...currentItem, ...updates };
  const computed = computeItemPricing(mergedForCalc); // No need for fee entry lookup if we trust stored data, or we could look it up

  allItems[idx] = computed as TreatmentPlanItem;
  localStorage.setItem(KEY_ITEMS, JSON.stringify(allItems));

  recalculatePlanTotals(currentItem.treatmentPlanId);
  
  return allItems[idx];
};

export const deleteTreatmentPlanItem = (id: string) => {
  const allItems: TreatmentPlanItem[] = JSON.parse(localStorage.getItem(KEY_ITEMS) || '[]');
  const item = allItems.find(i => i.id === id);
  if (!item) return;

  const newItems = allItems.filter(i => i.id !== id);
  localStorage.setItem(KEY_ITEMS, JSON.stringify(newItems));

  const plan = getTreatmentPlanById(item.treatmentPlanId);
  if (plan) {
    plan.itemIds = plan.itemIds.filter(itemId => itemId !== id);
    savePlan(plan);
    recalculatePlanTotals(plan.id);
  }
};

export const reorderTreatmentPlanItems = (planId: string, orderedIds: string[]) => {
    const plan = getTreatmentPlanById(planId);
    if (!plan) return;
    
    plan.itemIds = orderedIds;
    savePlan(plan);
    
    // Also update sortOrder on items if strictly needed, but order in plan.itemIds is usually enough
};

// --- SHARING ---

export const createShareLink = (planId: string): ShareLink => {
  const shares: ShareLink[] = JSON.parse(localStorage.getItem(KEY_SHARES) || '[]');
  const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  
  const share: ShareLink = {
    id: generateId(),
    treatmentPlanId: planId,
    token,
    createdAt: new Date().toISOString(),
    isActive: true
  };
  
  shares.push(share);
  localStorage.setItem(KEY_SHARES, JSON.stringify(shares));
  
  logActivity({ 
    treatmentPlanId: planId, 
    type: 'PLAN_PRESENTED', 
    message: 'Share link generated' 
  });
  
  // Auto-update status to PRESENTED if still DRAFT
  const plan = getTreatmentPlanById(planId);
  if (plan && plan.status === 'DRAFT') {
    updateTreatmentPlan(planId, { 
        status: 'PRESENTED', 
        presentedAt: new Date().toISOString() 
    });
  }

  return share;
};

export const getPlanByShareToken = (token: string): { plan: TreatmentPlan, items: TreatmentPlanItem[] } | null => {
  const shares: ShareLink[] = JSON.parse(localStorage.getItem(KEY_SHARES) || '[]');
  const share = shares.find(s => s.token === token && s.isActive);
  
  if (!share) return null;
  
  const plan = getTreatmentPlanById(share.treatmentPlanId);
  if (!plan) return null;
  
  return { plan, items: plan.items || [] };
};

// --- LOGGING ---

export const logActivity = (event: Omit<ActivityLog, 'id' | 'createdAt'>) => {
  const logs: ActivityLog[] = JSON.parse(localStorage.getItem(KEY_LOGS) || '[]');
  const newLog: ActivityLog = {
    id: generateId(),
    createdAt: new Date().toISOString(),
    ...event
  };
  logs.unshift(newLog);
  localStorage.setItem(KEY_LOGS, JSON.stringify(logs));
};

export const getActivityForPlan = (planId: string): ActivityLog[] => {
  const logs: ActivityLog[] = JSON.parse(localStorage.getItem(KEY_LOGS) || '[]');
  return logs.filter(l => l.treatmentPlanId === planId);
};

// Init on import
initServices();
