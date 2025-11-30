

import { 
  TreatmentPlan, 
  TreatmentPlanItem, 
  FeeScheduleEntry, 
  Patient, 
  ActivityLog, 
  ShareLink,
  TreatmentPlanStatus,
  FeeUnitType,
  InsuranceMode
} from '../types';
import { DEMO_PLANS, DEMO_PATIENTS, DEMO_ITEMS, DEMO_SHARES } from '../mock/seedPlans';

// --- KEYS (Bumped to v7 to force re-seed with new Library) ---
const KEY_PLANS = 'dental_plans_v7';
const KEY_ITEMS = 'dental_plan_items_v7';
const KEY_PATIENTS = 'dental_patients_v7';
const KEY_FEE_SCHEDULE = 'dental_fee_schedule_v7';
const KEY_SHARES = 'dental_shares_v7';
const KEY_LOGS = 'dental_logs_v7';

// --- UTILS ---
const generateId = () => Math.random().toString(36).substring(2, 10) + Date.now().toString(36);

/**
 * Checks if any item in a list has detailed, non-null financial fields.
 * This is used for backward compatibility to determine if an old plan
 * should be migrated to "advanced" insurance mode.
 */
export const hasDetailedInsurance = (items: TreatmentPlanItem[]): boolean => {
  if (!items) return false;
  return items.some(
    i =>
      i.coveragePercent != null ||
      i.estimatedInsurance != null ||
      i.estimatedPatientPortion != null
  );
};

// --- FEE SEED (Full Library) ---
export const PROCEDURE_LIBRARY: FeeScheduleEntry[] = [
    // --- DIAGNOSTIC / EXAM / XRAY ---
    { id: 'f1',  procedureCode: 'D0150', procedureName: 'Comprehensive Oral Evaluation',           category: 'DIAGNOSTIC', unitType: 'PER_PROCEDURE', baseFee: 120,  isActive: true },
    { id: 'f2',  procedureCode: 'D0120', procedureName: 'Periodic Oral Evaluation',                category: 'DIAGNOSTIC', unitType: 'PER_PROCEDURE', baseFee: 75,   isActive: true },
    { id: 'f3',  procedureCode: 'D0140', procedureName: 'Limited / Emergency Exam',                category: 'DIAGNOSTIC', unitType: 'PER_PROCEDURE', baseFee: 95,   isActive: true },
    { id: 'f4',  procedureCode: 'D0210', procedureName: 'Intraoral – Complete Series (FMX)',       category: 'DIAGNOSTIC', unitType: 'PER_PROCEDURE', baseFee: 150,  isActive: true },
    { id: 'f5',  procedureCode: 'D0330', procedureName: 'Panoramic Radiograph',                    category: 'DIAGNOSTIC', unitType: 'PER_PROCEDURE', baseFee: 130,  isActive: true },

    // --- PREVENTIVE ---
    { id: 'f6',  procedureCode: 'D1110', procedureName: 'Adult Prophylaxis (Cleaning)',            category: 'PREVENTIVE', unitType: 'PER_PROCEDURE', baseFee: 110,  isActive: true },
    { id: 'f7',  procedureCode: 'D1120', procedureName: 'Child Prophylaxis',                       category: 'PREVENTIVE', unitType: 'PER_PROCEDURE', baseFee: 90,   isActive: true },
    { id: 'f8',  procedureCode: 'D1206', procedureName: 'Fluoride Varnish',                        category: 'PREVENTIVE', unitType: 'PER_PROCEDURE', baseFee: 45,   isActive: true },
    { id: 'f9',  procedureCode: 'D1351', procedureName: 'Sealant – Per Tooth',                     category: 'PREVENTIVE', unitType: 'PER_TOOTH',     baseFee: 60,   isActive: true },

    // --- RESTORATIVE: FILLINGS ---
    { id: 'f10', procedureCode: 'D2391', procedureName: 'Resin Composite – 1 Surface',             category: 'RESTORATIVE', unitType: 'PER_TOOTH',     baseFee: 180,  isActive: true },
    { id: 'f11', procedureCode: 'D2392', procedureName: 'Resin Composite – 2 Surfaces',            category: 'RESTORATIVE', unitType: 'PER_TOOTH',     baseFee: 220,  isActive: true },
    { id: 'f12', procedureCode: 'D2393', procedureName: 'Resin Composite – 3 Surfaces',            category: 'RESTORATIVE', unitType: 'PER_TOOTH',     baseFee: 260,  isActive: true },
    { id: 'f13', procedureCode: 'D2394', procedureName: 'Resin Composite – 4+ Surfaces',           category: 'RESTORATIVE', unitType: 'PER_TOOTH',     baseFee: 295,  isActive: true },

    // --- RESTORATIVE: CROWNS ---
    { id: 'f14', procedureCode: 'D2740', procedureName: 'Crown – Porcelain/Ceramic',               category: 'RESTORATIVE', unitType: 'PER_TOOTH',     baseFee: 1200, isActive: true },
    { id: 'f15', procedureCode: 'D2752', procedureName: 'Crown – Porcelain Fused to Metal',        category: 'RESTORATIVE', unitType: 'PER_TOOTH',     baseFee: 1150, isActive: true },
    { id: 'f16', procedureCode: 'D2790', procedureName: 'Full Cast High-Noble Crown',              category: 'RESTORATIVE', unitType: 'PER_TOOTH',     baseFee: 1150, isActive: true },

    // --- ENDODONTIC (ROOT CANAL) ---
    { id: 'f17', procedureCode: 'D3310', procedureName: 'Root Canal Therapy – Anterior',           category: 'ENDODONTIC',  unitType: 'PER_TOOTH',     baseFee: 950,  isActive: true },
    { id: 'f18', procedureCode: 'D3320', procedureName: 'Root Canal Therapy – Premolar',           category: 'ENDODONTIC',  unitType: 'PER_TOOTH',     baseFee: 1050, isActive: true },
    { id: 'f19', procedureCode: 'D3330', procedureName: 'Root Canal Therapy – Molar',              category: 'ENDODONTIC',  unitType: 'PER_TOOTH',     baseFee: 1200, isActive: true },

    // --- IMPLANT ---
    { id: 'f20', procedureCode: 'D6010', procedureName: 'Surgical Placement of Implant Body',      category: 'IMPLANT',     unitType: 'PER_TOOTH',     baseFee: 2100, isActive: true },
    { id: 'f21', procedureCode: 'D6057', procedureName: 'Custom Implant Abutment',                category: 'IMPLANT',     unitType: 'PER_TOOTH',     baseFee: 650,  isActive: true },
    { id: 'f22', procedureCode: 'D6058', procedureName: 'Implant Crown – Porcelain/Ceramic',      category: 'IMPLANT',     unitType: 'PER_TOOTH',     baseFee: 1400, isActive: true },

    // --- PERIO (SCALING / MAINTENANCE) ---
    { id: 'f23', procedureCode: 'D4341', procedureName: 'Scaling & Root Planing – 4+ Teeth',       category: 'PERIO',       unitType: 'PER_QUADRANT',  baseFee: 250,  isActive: true },
    { id: 'f24', procedureCode: 'D4342', procedureName: 'Scaling & Root Planing – 1–3 Teeth',      category: 'PERIO',       unitType: 'PER_QUADRANT',  baseFee: 210,  isActive: true },
    { id: 'f25', procedureCode: 'D4910', procedureName: 'Periodontal Maintenance',                 category: 'PERIO',       unitType: 'PER_PROCEDURE', baseFee: 150,  isActive: true },

    // --- PROSTHETIC: DENTURES / BRIDGE ---
    { id: 'f26', procedureCode: 'D5110', procedureName: 'Complete Denture – Maxillary',            category: 'PROSTHETIC',  unitType: 'PER_ARCH',      baseFee: 1800, isActive: true },
    { id: 'f27', procedureCode: 'D5120', procedureName: 'Complete Denture – Mandibular',           category: 'PROSTHETIC',  unitType: 'PER_ARCH',      baseFee: 1800, isActive: true },
    { id: 'f28', procedureCode: 'D5213', procedureName: 'Partial Denture – Maxillary',             category: 'PROSTHETIC',  unitType: 'PER_ARCH',      baseFee: 1900, isActive: true },
    { id: 'f29', procedureCode: 'D6750', procedureName: 'Bridge – Abutment Crown',                 category: 'PROSTHETIC',  unitType: 'PER_TOOTH',     baseFee: 1150, isActive: true },
    { id: 'f30', procedureCode: 'D6240', procedureName: 'Bridge – Pontic',                         category: 'PROSTHETIC',  unitType: 'PER_TOOTH',     baseFee: 1100, isActive: true },

    // --- ALL-ON-4 FULL-ARCH IMPLANT PROSTHESIS ---
    { id: 'f40', procedureCode: 'AO4U', procedureName: 'All-on-4 Full Arch – Maxillary',           category: 'PROSTHETIC',  unitType: 'PER_ARCH',      baseFee: 12000, isActive: true },
    { id: 'f41', procedureCode: 'AO4L', procedureName: 'All-on-4 Full Arch – Mandibular',          category: 'PROSTHETIC',  unitType: 'PER_ARCH',      baseFee: 12000, isActive: true },

    // --- ORTHO / ALIGNERS ---
    { id: 'f31', procedureCode: 'D8080', procedureName: 'Comprehensive Ortho – Adolescent',        category: 'ORTHO',       unitType: 'PER_MOUTH',     baseFee: 5500, isActive: true },
    { id: 'f32', procedureCode: 'D8090', procedureName: 'Comprehensive Ortho – Adult',             category: 'ORTHO',       unitType: 'PER_MOUTH',     baseFee: 6000, isActive: true },
    { id: 'f33', procedureCode: 'D8040', procedureName: 'Limited Ortho / Clear Aligners',          category: 'ORTHO',       unitType: 'PER_MOUTH',     baseFee: 3800, isActive: true },

    // --- COSMETIC (VENEERS, WHITENING) ---
    { id: 'f34', procedureCode: 'D2962', procedureName: 'Porcelain Veneer – Lab',                  category: 'COSMETIC',    unitType: 'PER_TOOTH',     baseFee: 1400, isActive: true },
    { id: 'f35', procedureCode: 'D9975', procedureName: 'Whitening – In-Office',                   category: 'COSMETIC',    unitType: 'PER_MOUTH',     baseFee: 550,  isActive: true },

    // --- NIGHTGUARD / OCCLUSAL GUARD ---
    { id: 'f36', procedureCode: 'D9944', procedureName: 'Occlusal Guard (Nightguard) – Upper',     category: 'OTHER',       unitType: 'PER_ARCH',      baseFee: 650,  isActive: true },
    { id: 'f37', procedureCode: 'D9945', procedureName: 'Occlusal Guard (Nightguard) – Lower',     category: 'OTHER',       unitType: 'PER_ARCH',      baseFee: 650,  isActive: true },

    // --- SURGICAL / EXTRACTION ---
    { id: 'f38', procedureCode: 'D7140', procedureName: 'Simple Extraction – Erupted Tooth',        category: 'OTHER',       unitType: 'PER_TOOTH',     baseFee: 200,  isActive: true },
    { id: 'f39', procedureCode: 'D7210', procedureName: 'Surgical Extraction – Erupted Tooth',      category: 'OTHER',       unitType: 'PER_TOOTH',     baseFee: 320,  isActive: true }
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
  const hasData = localStorage.getItem(KEY_PLANS);
  
  // FORCE SEED if no data or if we just bumped version
  if (!hasData) {
    console.log("Seeding Demo Data V7...");
    localStorage.setItem(KEY_PATIENTS, JSON.stringify(DEMO_PATIENTS));
    localStorage.setItem(KEY_PLANS, JSON.stringify(DEMO_PLANS));
    localStorage.setItem(KEY_ITEMS, JSON.stringify(DEMO_ITEMS));
    localStorage.setItem(KEY_SHARES, JSON.stringify(DEMO_SHARES));
    
    // Fee schedule standard init
    localStorage.setItem(KEY_FEE_SCHEDULE, JSON.stringify(PROCEDURE_LIBRARY));
    localStorage.setItem(KEY_LOGS, JSON.stringify([]));
  }
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
  // Re-hydrate plans (strip items to keep list lightweight, hydrate patient)
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
  
  // Hydrate items
  const planItems = plan.itemIds
    .map(itemId => allItems.find(i => i.id === itemId))
    .filter((i): i is TreatmentPlanItem => !!i);
  
  // Sort items by sortOrder
  planItems.sort((a, b) => a.sortOrder - b.sortOrder);
  
  // Backward compatibility for insurance mode
  if (!plan.insuranceMode) {
      plan.insuranceMode = hasDetailedInsurance(planItems) ? 'advanced' : 'simple';
  }

  return {
    ...plan,
    patient: patients.find(pat => pat.id === plan.patientId),
    items: planItems
  };
};

/**
 * A central loader to fetch a plan and its items together.
 * This is the single source of truth for the detail page.
 */
export function loadTreatmentPlanWithItems(
  planId: string
): { plan: TreatmentPlan; items: TreatmentPlanItem[] } | null {
  const allItems: TreatmentPlanItem[] = JSON.parse(localStorage.getItem(KEY_ITEMS) || '[]');
  const allPlans: TreatmentPlan[]     = JSON.parse(localStorage.getItem(KEY_PLANS) || '[]');
  const allPatients: Patient[]        = JSON.parse(localStorage.getItem(KEY_PATIENTS) || '[]');

  const planFromStorage = allPlans.find(p => p.id === planId);
  if (!planFromStorage) {
    console.warn(`Plan not found in loadTreatmentPlanWithItems: ${planId}`);
    return null;
  }

  // Filter items for the plan, preserving the order from plan.itemIds
  let itemsForPlan: TreatmentPlanItem[];

  if (Array.isArray(planFromStorage.itemIds) && planFromStorage.itemIds.length > 0) {
    const itemMap = new Map(allItems.map(i => [i.id, i]));
    itemsForPlan = planFromStorage.itemIds
      .map(id => itemMap.get(id))
      .filter((i): i is TreatmentPlanItem => !!i);
  } else {
    itemsForPlan = allItems.filter(i => i.treatmentPlanId === planId);
    itemsForPlan.sort((a,b) => a.sortOrder - b.sortOrder);
  }

  // Backward compatibility: Set insurance mode if it's missing on a loaded plan
  if (!planFromStorage.insuranceMode) {
    planFromStorage.insuranceMode = hasDetailedInsurance(itemsForPlan) ? 'advanced' : 'simple';
  }

  // Hydrate patient into the final plan object
  const plan: TreatmentPlan = {
    ...planFromStorage,
    patient: allPatients.find(p => p.id === planFromStorage.patientId)
  };

  return { plan, items: itemsForPlan };
}

const savePlan = (plan: TreatmentPlan) => {
  const plans: TreatmentPlan[] = JSON.parse(localStorage.getItem(KEY_PLANS) || '[]');
  const idx = plans.findIndex(p => p.id === plan.id);
  
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
    insuranceMode: 'simple',
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

/**
 * [REWRITTEN] This is the single source of truth for updating plan-level financials based on its items.
 * It is called after any item is created, updated, or deleted, OR after a plan-level update.
 * It strictly follows the plan's `insuranceMode` and does not auto-detect.
 */
export const recalculatePlanTotalsAndSave = (planId: string): TreatmentPlan | undefined => {
  const result = loadTreatmentPlanWithItems(planId);
  if (!result) {
    console.error(`recalculatePlanTotalsAndSave: Plan with ID ${planId} not found.`);
    return undefined;
  }
  let { plan, items } = result;

  const totalFee = items.reduce((sum, item) => sum + item.netFee, 0);
  let estimatedInsurance = 0;

  if (plan.insuranceMode === 'advanced') {
    estimatedInsurance = items.reduce(
      (sum, i) => sum + (i.estimatedInsurance ?? 0),
      0
    );
  } else { // 'simple' or undefined
    estimatedInsurance = plan.estimatedInsurance ?? 0;
  }

  const patientPortion = totalFee - estimatedInsurance;

  const updatedPlanData: TreatmentPlan = {
    ...plan,
    totalFee,
    estimatedInsurance,
    patientPortion: Math.max(0, patientPortion),
    updatedAt: new Date().toISOString(),
  };

  savePlan(updatedPlanData);
  
  return getTreatmentPlanById(planId);
};


/**
 * [REWRITTEN] Updates a plan with a patch, saves it, and then ALWAYS runs the authoritative
 * recalculation logic to ensure the entire plan state is consistent.
 */
export const updateTreatmentPlan = (id: string, updates: Partial<TreatmentPlan>): TreatmentPlan | undefined => {
  const allPlans: TreatmentPlan[] = JSON.parse(localStorage.getItem(KEY_PLANS) || '[]');
  const planIndex = allPlans.findIndex(p => p.id === id);
  if (planIndex === -1) {
    console.error(`updateTreatmentPlan: Plan with ID ${id} not found.`);
    return undefined;
  }

  const existingPlan = allPlans[planIndex];
  const { patient, items, ...storageUpdates } = updates;

  const mergedPlan = {
    ...existingPlan,
    ...storageUpdates,
    updatedAt: new Date().toISOString(),
  };

  allPlans[planIndex] = mergedPlan;
  localStorage.setItem(KEY_PLANS, JSON.stringify(allPlans));

  const recalcedPlan = recalculatePlanTotalsAndSave(id);

  return recalcedPlan;
};

// --- ITEMS CRUD & CALCULATIONS ---


/**
 * [REWRITTEN] Clears all insurance-related fields from all items in a given plan,
 * saves them, and returns the newly recalculated plan state. Used when switching
 * from 'advanced' to 'simple' insurance mode.
 */
export const clearAllItemInsuranceForPlan = (planId: string): { plan: TreatmentPlan; items: TreatmentPlanItem[] } | null => {
  const allItems: TreatmentPlanItem[] = JSON.parse(localStorage.getItem(KEY_ITEMS) || '[]');
  let itemsWereUpdated = false;

  const updatedItems = allItems.map(item => {
    if (item.treatmentPlanId === planId) {
      if (
        item.coveragePercent != null ||
        item.estimatedInsurance != null ||
        item.estimatedPatientPortion != null
      ) {
        itemsWereUpdated = true;
        return {
          ...item,
          coveragePercent: null,
          estimatedInsurance: null,
          estimatedPatientPortion: null,
        };
      }
    }
    return item;
  });

  if (itemsWereUpdated) {
    localStorage.setItem(KEY_ITEMS, JSON.stringify(updatedItems));
  }

  const updatedPlan = recalculatePlanTotalsAndSave(planId);

  if (updatedPlan) {
    return { plan: updatedPlan, items: updatedPlan.items || [] };
  }
  
  console.error(`clearAllItemInsuranceForPlan: Failed to recalculate plan for ID ${planId}`);
  return null;
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
    urgency: 'ELECTIVE', // Default
    sortOrder: 999
  };

  const computedItem = computeItemPricing(rawItem, feeEntry) as TreatmentPlanItem;
  
  const allItems: TreatmentPlanItem[] = JSON.parse(localStorage.getItem(KEY_ITEMS) || '[]');
  allItems.push(computedItem);
  localStorage.setItem(KEY_ITEMS, JSON.stringify(allItems));

  const plan = getTreatmentPlanById(planId);
  if (plan) {
    plan.itemIds.push(computedItem.id);
    savePlan(plan);
    recalculatePlanTotalsAndSave(planId);
  }

  return computedItem;
};

export const updateTreatmentPlanItem = (id: string, updates: Partial<TreatmentPlanItem>): { plan: TreatmentPlan, items: TreatmentPlanItem[] } | undefined => {
  const allItems: TreatmentPlanItem[] = JSON.parse(localStorage.getItem(KEY_ITEMS) || '[]');
  const idx = allItems.findIndex(i => i.id === id);
  if (idx === -1) return undefined;

  const currentItem = allItems[idx];
  const mergedForPricing = { ...currentItem, ...updates };

  allItems[idx] = {
    ...currentItem,
    ...computeItemPricing(mergedForPricing), // Recalculate netFee etc. if units/baseFee changed
    ...updates, // Apply financial updates last to ensure they take precedence
  };

  localStorage.setItem(KEY_ITEMS, JSON.stringify(allItems));

  // Recalculate and retrieve the full, updated state to prevent UI race conditions.
  const updatedPlanWithItems = recalculatePlanTotalsAndSave(currentItem.treatmentPlanId);
  
  if (updatedPlanWithItems) {
    return { plan: updatedPlanWithItems, items: updatedPlanWithItems.items || [] };
  }
  
  return undefined;
};

export const deleteTreatmentPlanItem = (itemIdToDelete: string) => {
  let allItems: TreatmentPlanItem[] = JSON.parse(localStorage.getItem(KEY_ITEMS) || '[]');
  const itemToDelete = allItems.find(i => i.id === itemIdToDelete);
  if (!itemToDelete) {
    console.error(`DELETE FAILED: Item with ID "${itemIdToDelete}" not found.`);
    return;
  }
  
  const planId = itemToDelete.treatmentPlanId;
  const updatedItems = allItems.filter(i => i.id !== itemIdToDelete);
  localStorage.setItem(KEY_ITEMS, JSON.stringify(updatedItems));

  let allPlans: TreatmentPlan[] = JSON.parse(localStorage.getItem(KEY_PLANS) || '[]');
  const planIndex = allPlans.findIndex(p => p.id === planId);
  
  if (planIndex !== -1) {
    const originalPlan = allPlans[planIndex];
    allPlans[planIndex] = {
      ...originalPlan,
      itemIds: originalPlan.itemIds.filter(id => id !== itemIdToDelete),
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(KEY_PLANS, JSON.stringify(allPlans));
  }
  
  recalculatePlanTotalsAndSave(planId);
};


export const reorderTreatmentPlanItems = (planId: string, orderedIds: string[]) => {
    const plan = getTreatmentPlanById(planId);
    if (!plan) return;
    
    plan.itemIds = orderedIds;
    savePlan(plan);
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
  
  return loadTreatmentPlanWithItems(share.treatmentPlanId);
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
