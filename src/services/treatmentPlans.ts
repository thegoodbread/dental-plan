import { 
  TreatmentPlan, 
  TreatmentPlanItem, 
  FeeScheduleEntry, 
  ShareLink,
  TreatmentPhase,
  FeeCategory,
  AddOnKind,
  Visit,
  VisitStatus,
  Patient,
  Provider,
  VisitType,
  FeeScheduleType,
  PhaseBucketKey
} from '../types';
import { DEMO_PLANS, DEMO_ITEMS, DEMO_SHARES, DEMO_PATIENTS } from '../mock/seedPlans';
import { computeDocumentationReadiness, ReadinessInput, MissingItem, ReadinessProcedure, ReadinessDiagnosis, ReadinessEvidence } from '../domain/ClaimReadinessEngine';
import { computeItemPricing, computePlanTotals } from '../utils/pricingLogic';

// --- KEYS ---
const KEY_PLANS = 'dental_plans_v8';
const KEY_ITEMS = 'dental_plan_items_v8';
const KEY_VISITS = 'dental_visits_v8';
const KEY_PATIENTS = 'dental_patients_v8';
const KEY_PROVIDERS = 'dental_providers_v8';
const KEY_SHARES = 'dental_shares_v8';

// --- UTILS ---
const generateId = () => `id-${Math.random().toString(36).substring(2, 10)}`;

const getFromStorage = <T>(key: string, defaultData: T[] = []): T[] => {
  if (typeof window === 'undefined') return defaultData;
  const stored = localStorage.getItem(key);
  if (!stored) {
      if (key === KEY_PLANS && defaultData.length > 0) localStorage.setItem(key, JSON.stringify(defaultData));
      if (key === KEY_ITEMS && defaultData.length > 0) localStorage.setItem(key, JSON.stringify(defaultData));
      if (key === KEY_PATIENTS && defaultData.length > 0) localStorage.setItem(key, JSON.stringify(defaultData));
      return defaultData;
  }
  return JSON.parse(stored);
}

const saveToStorage = (key: string, data: any[]) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, JSON.stringify(data));
}

// --- PHASE & INTEGRITY HELPERS ---

export const ensurePlanHasDefaultPhases = (plan: TreatmentPlan): TreatmentPlan => {
  if (plan.phases && plan.phases.length > 0) return plan;

  const defaultPhases: TreatmentPhase[] = [
    { id: `phase-${plan.id}-1`, planId: plan.id, bucketKey: 'FOUNDATION', title: 'Foundation', sortOrder: 0, itemIds: [], durationIsManual: false, estimatedDurationValue: null, estimatedDurationUnit: null },
    { id: `phase-${plan.id}-2`, planId: plan.id, bucketKey: 'RESTORATIVE', title: 'Restorative', sortOrder: 1, itemIds: [], durationIsManual: false, estimatedDurationValue: null, estimatedDurationUnit: null },
    { id: `phase-${plan.id}-3`, planId: plan.id, bucketKey: 'IMPLANT', title: 'Implant', sortOrder: 2, itemIds: [], durationIsManual: false, estimatedDurationValue: null, estimatedDurationUnit: null },
    { id: `phase-${plan.id}-4`, planId: plan.id, bucketKey: 'ELECTIVE', title: 'Elective', sortOrder: 3, itemIds: [], durationIsManual: false, estimatedDurationValue: null, estimatedDurationUnit: null },
  ];

  return { ...plan, phases: defaultPhases };
};

const computeBucketKeyForItem = (item: TreatmentPlanItem): PhaseBucketKey => {
  const code = (item.procedureCode || '').toUpperCase();
  const cat = (item.category || 'OTHER').toUpperCase();
  const urgency = (item.urgency || '').toUpperCase();

  if (urgency === 'URGENT' || urgency === 'ASAP') {
    if (cat.includes('IMPLANT') || code.startsWith('D60')) return 'IMPLANT';
    return 'FOUNDATION';
  }
  if (cat.includes('DIAGNOSTIC') || cat.includes('PREVENT') || cat.includes('PERIO')) return 'FOUNDATION';
  if (code.startsWith('D0') || code.startsWith('D1') || code.startsWith('D4')) return 'FOUNDATION';
  if (cat.includes('ENDO') || cat.includes('RESTOR')) return 'RESTORATIVE';
  if (code.startsWith('D2') || code.startsWith('D3')) return 'RESTORATIVE';
  if (cat.includes('IMPLANT') || cat.includes('SURG')) return 'IMPLANT';
  if (code.startsWith('D6') || code.startsWith('D7')) return 'IMPLANT';
  return 'ELECTIVE';
};

export const getPhaseIdForItem = (plan: TreatmentPlan, item: TreatmentPlanItem): string | undefined => {
  const phases = plan.phases || [];
  if (!phases.length) return undefined;
  const bucket = computeBucketKeyForItem(item);
  return phases.find(p => p.bucketKey === bucket)?.id ?? phases[0].id;
};

export const assignMissingPhaseIds = (plan: TreatmentPlan, items: TreatmentPlanItem[]): TreatmentPlanItem[] => {
  if (!plan.phases || plan.phases.length === 0) return items;
  const validPhaseIds = new Set(plan.phases.map(p => p.id));
  let hasChanges = false;
  const newItems = items.map(item => {
    const isLocked = item.phaseLocked === true;
    const isValid = item.phaseId && validPhaseIds.has(item.phaseId);
    if (isLocked) {
        if (isValid) return item;
        const desired = getPhaseIdForItem(plan, item);
        if (item.phaseId !== desired) {
            hasChanges = true;
            return { ...item, phaseId: desired }; 
        }
    } else {
        if (!isValid) {
            const desired = getPhaseIdForItem(plan, item);
            hasChanges = true;
            return { ...item, phaseId: desired, phaseLocked: false };
        }
    }
    return item;
  });
  return hasChanges ? newItems : items;
};

/**
 * PRODUCTION CLINICAL HYDRATION:
 * Overwrites all clinical estimates with Procedure Library defaults unless explicitly flagged as Manual.
 * This effectively "purges" any legacy demo data on load.
 */
export function hydrateItemClinicalDefaultsFromFeeSchedule(items: TreatmentPlanItem[]): { items: TreatmentPlanItem[], changed: boolean } {
  const feeSchedule = getFeeSchedule();
  let globalChanged = false;

  const newItems = items.map(item => {
    const entry = feeSchedule.find(f => f.id === item.feeScheduleEntryId) || 
                  feeSchedule.find(f => f.procedureCode === item.procedureCode);
    
    if (!entry) return item;

    let itemChanged = false;
    const updated = { ...item };

    // Standardize flags
    if (updated.estimatedVisitsIsManual === undefined) { updated.estimatedVisitsIsManual = false; itemChanged = true; }
    if (updated.estimatedDurationIsManual === undefined) { updated.estimatedDurationIsManual = false; itemChanged = true; }

    // 1. Enforce Visits from Library
    if (updated.estimatedVisitsIsManual !== true) {
       const defVisits = entry.defaultEstimatedVisits ?? 1;
       if (updated.estimatedVisits !== defVisits) {
          updated.estimatedVisits = defVisits;
          itemChanged = true;
       }
    }

    // 2. Enforce Duration from Library
    if (updated.estimatedDurationIsManual !== true) {
      const defVal = entry.defaultEstimatedDurationValue ?? null;
      const defUnit = entry.defaultEstimatedDurationUnit ?? null;

      if (updated.estimatedDurationValue !== defVal || updated.estimatedDurationUnit !== defUnit) {
        updated.estimatedDurationValue = defVal;
        updated.estimatedDurationUnit = defUnit;
        itemChanged = true;
      }
    }

    if (itemChanged) globalChanged = true;
    return itemChanged ? updated : item;
  });

  return { items: newItems, changed: globalChanged };
}

export const rebuildPhaseManifest = (plan: TreatmentPlan, items: TreatmentPlanItem[]): TreatmentPlan => {
    if (!plan.phases) return plan;
    const phaseMap = new Map<string, string[]>();
    plan.phases.forEach(p => phaseMap.set(p.id, []));
    const sortedItems = [...items].sort((a,b) => {
        if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
        return a.id.localeCompare(b.id);
    });
    sortedItems.forEach(item => {
        if (item.phaseId && phaseMap.has(item.phaseId)) {
            phaseMap.get(item.phaseId)!.push(item.id);
        }
    });
    const newPhases = plan.phases.map(p => ({
        ...p,
        itemIds: phaseMap.get(p.id) || []
    }));
    return { ...plan, phases: newPhases };
};

// --- DURATION CALCULATION HELPERS ---

const convertToDays = (value: number | null | undefined, unit: 'days' | 'weeks' | 'months' | null | undefined): number => {
    if (!value || !unit) return 0;
    switch(unit) {
        case 'days': return value;
        case 'weeks': return value * 7;
        case 'months': return value * 30.44; 
    }
    return 0;
}

export const recalculatePhaseDuration = (items: TreatmentPlanItem[]): { estimatedDurationValue: number | null; estimatedDurationUnit: 'days' | 'weeks' | 'months' | null } => {
    if (items.length === 0) return { estimatedDurationValue: null, estimatedDurationUnit: null };
    let totalDays = 0;
    let hasMonths = false;
    let hasWeeks = false;
    for (const item of items) {
        totalDays += convertToDays(item.estimatedDurationValue, item.estimatedDurationUnit);
        if (item.estimatedDurationUnit === 'months') hasMonths = true;
        if (item.estimatedDurationUnit === 'weeks') hasWeeks = true;
    }
    if (totalDays <= 0) return { estimatedDurationValue: null, estimatedDurationUnit: null };
    let finalValue: number;
    let finalUnit: 'days' | 'weeks' | 'months';
    if (hasMonths) {
        finalValue = Math.round(totalDays / 30.44); finalUnit = 'months';
    } else if (hasWeeks) {
        finalValue = Math.round(totalDays / 7); finalUnit = 'weeks';
    } else {
        finalValue = Math.round(totalDays); finalUnit = 'days';
    }
    if (finalValue < 1 && totalDays > 0) finalValue = 1;
    return { estimatedDurationValue: finalValue, estimatedDurationUnit: finalUnit };
};

/**
 * PRODUCTION PHASE REBUILD:
 * Forces non-monitor phases to automatic mode to ensure they re-compute from hydrated items.
 * Strips legacy demo phase durations.
 */
export function rebuildPhaseDurationsFromItems(plan: TreatmentPlan, items: TreatmentPlanItem[]): TreatmentPlan {
  if (!plan.phases) return plan;
  const itemsByPhase = new Map<string, TreatmentPlanItem[]>();
  items.forEach(item => {
      if (!item.phaseId) return;
      if (!itemsByPhase.has(item.phaseId)) itemsByPhase.set(item.phaseId, []);
      itemsByPhase.get(item.phaseId)!.push(item);
  });
  const updatedPhases = plan.phases.map(p => {
    // Only monitor phases are allowed to have persistent manual durations in this production model.
    if (p.isMonitorPhase === true && p.durationIsManual === true) return p;
    
    const { estimatedDurationValue, estimatedDurationUnit } = recalculatePhaseDuration(itemsByPhase.get(p.id) || []);
    return { 
        ...p, 
        durationIsManual: false, 
        estimatedDurationValue,
        estimatedDurationUnit
    };
  });
  return { ...plan, phases: updatedPhases };
}

// --- PRICING LOGIC ---
const recalculatePlanTotals = (plan: TreatmentPlan, items: TreatmentPlanItem[]): TreatmentPlan => {
    const planItems = items.filter(i => i.treatmentPlanId === plan.id);
    const { totalFee, totalMemberSavings } = computePlanTotals(planItems, plan.feeScheduleType);
    const insurance = plan.estimatedInsurance || 0;
    const discount = plan.clinicDiscount || 0;
    const patientPortion = Math.max(0, totalFee - insurance - discount);
    return { ...plan, totalFee, membershipSavings: totalMemberSavings, patientPortion };
};

export const setPlanPricingMode = (planId: string, mode: FeeScheduleType) => {
    const plans = getAllTreatmentPlans();
    const planIdx = plans.findIndex(p => p.id === planId);
    if (planIdx === -1) return;
    const plan = plans[planIdx];
    const allItems = getFromStorage<TreatmentPlanItem>(KEY_ITEMS, DEMO_ITEMS);
    const planItems = allItems.filter(i => i.treatmentPlanId === planId);
    
    // 1. Update Fees
    let updatedItems = planItems.map(item => {
        const pricing = computeItemPricing(item, mode);
        return { ...item, netFee: pricing.netFee, grossFee: pricing.grossActive };
    });

    // 2. Re-hydrate clinical defaults from the new fee schedule context
    const { items: hydratedItems } = hydrateItemClinicalDefaultsFromFeeSchedule(updatedItems);
    updatedItems = hydratedItems;

    // 3. Persist
    const itemMap = new Map(updatedItems.map(i => [i.id, i]));
    const newAllItems = allItems.map(i => itemMap.get(i.id) || i);
    saveToStorage(KEY_ITEMS, newAllItems);

    const updatedPlanBase = { ...plan, feeScheduleType: mode };
    // Re-compute phase durations from hydrated items
    const planWithPhases = rebuildPhaseDurationsFromItems(updatedPlanBase, updatedItems);
    const finalPlan = recalculatePlanTotals(planWithPhases, updatedItems);
    
    plans[planIdx] = finalPlan;
    saveToStorage(KEY_PLANS, plans);
    
    return { plan: finalPlan, items: updatedItems };
};

// --- PLANS & ITEMS ---
export const getAllTreatmentPlans = (): TreatmentPlan[] => getFromStorage<TreatmentPlan>(KEY_PLANS, DEMO_PLANS);

export const getTreatmentPlanById = (id: string): TreatmentPlan | undefined => {
  const plans = getAllTreatmentPlans();
  const plan = plans.find(p => p.id === id);
  if (plan) {
      const allItems = getFromStorage<TreatmentPlanItem>(KEY_ITEMS, DEMO_ITEMS);
      plan.items = allItems.filter(i => i.treatmentPlanId === id);
      return ensurePlanHasDefaultPhases(plan);
  }
  return plan;
};

export const createTreatmentPlan = (data: Partial<TreatmentPlan>): TreatmentPlan => {
  let newPlan: TreatmentPlan = {
    id: generateId(), planNumber: `TP-${Math.floor(Math.random() * 10000)}`,
    title: 'New Treatment Plan', status: 'DRAFT', totalFee: 0, patientPortion: 0,
    clinicDiscount: 0, insuranceMode: 'simple', feeScheduleType: 'standard',
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), itemIds: [],
    ...data
  };
  newPlan = ensurePlanHasDefaultPhases(newPlan);
  const plans = getAllTreatmentPlans();
  saveToStorage(KEY_PLANS, [...plans, newPlan]);
  return newPlan;
};

export const updateTreatmentPlan = (id: string, updates: Partial<TreatmentPlan>): TreatmentPlan | null => {
  const plans = getAllTreatmentPlans();
  const index = plans.findIndex(p => p.id === id);
  if (index === -1) return null;
  let updated = { ...plans[index], ...updates, updatedAt: new Date().toISOString() };
  if (updates.clinicDiscount !== undefined || updates.estimatedInsurance !== undefined) {
      const allItems = getFromStorage<TreatmentPlanItem>(KEY_ITEMS, DEMO_ITEMS);
      const items = allItems.filter(i => i.treatmentPlanId === id);
      updated = recalculatePlanTotals(updated, items);
  }
  updated = ensurePlanHasDefaultPhases(updated);
  plans[index] = updated;
  saveToStorage(KEY_PLANS, plans);
  return updated;
};

export const loadTreatmentPlanWithItems = (id: string): { plan: TreatmentPlan, items: TreatmentPlanItem[] } | null => {
  let plan = getTreatmentPlanById(id);
  if (!plan) return null;
  const planWithPhases = ensurePlanHasDefaultPhases(plan);
  let allItems = getFromStorage<TreatmentPlanItem>(KEY_ITEMS, DEMO_ITEMS);
  let items = allItems.filter(i => i.treatmentPlanId === id);
  
  // CANONICAL SELF-HEALING pass
  const fixedItems = assignMissingPhaseIds(planWithPhases, items);
  const { items: hydratedItems, changed: itemsChanged } = hydrateItemClinicalDefaultsFromFeeSchedule(fixedItems);
  items = hydratedItems;
  
  if (itemsChanged) {
    const otherItems = allItems.filter(i => i.treatmentPlanId !== id);
    saveToStorage(KEY_ITEMS, [...otherItems, ...items]);
  }

  items.sort((a,b) => {
      if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
      return a.id.localeCompare(b.id);
  });

  const reconciledManifest = rebuildPhaseManifest(planWithPhases, items);
  const finalPlan = rebuildPhaseDurationsFromItems(reconciledManifest, items);
  
  let planUpdated = JSON.stringify(finalPlan.phases) !== JSON.stringify(plan.phases);
  if (planUpdated) updateTreatmentPlan(finalPlan.id, finalPlan);
  
  return { plan: finalPlan, items };
};

export const savePlanAndItems = (plan: TreatmentPlan, items: TreatmentPlanItem[]) => {
    const planWithTotals = recalculatePlanTotals(plan, items);
    const sortedItems = [...items].sort((a,b) => {
        if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
        return a.id.localeCompare(b.id);
    });
    const planWithManifest = rebuildPhaseManifest(planWithTotals, sortedItems);
    const planToSave = rebuildPhaseDurationsFromItems(planWithManifest, sortedItems);
    updateTreatmentPlan(planToSave.id, planToSave);
    const allItems = getFromStorage<TreatmentPlanItem>(KEY_ITEMS, DEMO_ITEMS);
    const otherItems = allItems.filter(i => i.treatmentPlanId !== plan.id);
    saveToStorage(KEY_ITEMS, [...otherItems, ...sortedItems]);
    return { plan: planToSave, items: sortedItems };
};

// --- FEE SCHEDULE ---
export const getFeeSchedule = (): FeeScheduleEntry[] => {
    return [
        { id: 'f1', procedureCode: 'D2391', procedureName: 'Resin-based composite - 1 surface, posterior', category: 'RESTORATIVE', unitType: 'PER_TOOTH', baseFee: 200, membershipFee: 160, isActive: true, defaultEstimatedDurationValue: 1, defaultEstimatedDurationUnit: 'days', defaultEstimatedVisits: 1 },
        { id: 'f2', procedureCode: 'D2740', procedureName: 'Crown - porcelain/ceramic', category: 'RESTORATIVE', unitType: 'PER_TOOTH', baseFee: 1200, membershipFee: 950, isActive: true, defaultEstimatedDurationValue: 2, defaultEstimatedDurationUnit: 'weeks', defaultEstimatedVisits: 2 },
        { id: 'f3', procedureCode: 'D0120', procedureName: 'Periodic oral evaluation', category: 'DIAGNOSTIC', unitType: 'PER_PROCEDURE', baseFee: 65, membershipFee: 0, isActive: true, defaultEstimatedDurationValue: 1, defaultEstimatedDurationUnit: 'days', defaultEstimatedVisits: 1 },
        { id: 'f4', procedureCode: 'D1110', procedureName: 'Prophylaxis - adult', category: 'PREVENTIVE', unitType: 'PER_PROCEDURE', baseFee: 110, membershipFee: 0, isActive: true, defaultEstimatedDurationValue: 1, defaultEstimatedDurationUnit: 'days', defaultEstimatedVisits: 1 },
        { id: 'f5', procedureCode: 'D3330', procedureName: 'Endodontic therapy, molar', category: 'ENDODONTIC', unitType: 'PER_TOOTH', baseFee: 1100, membershipFee: 850, isActive: true, defaultEstimatedDurationValue: 2, defaultEstimatedDurationUnit: 'weeks', defaultEstimatedVisits: 2 },
        { id: 'f6', procedureCode: 'D7140', procedureName: 'Extraction, erupted tooth', category: 'OTHER', unitType: 'PER_TOOTH', baseFee: 250, membershipFee: 200, isActive: true, defaultEstimatedDurationValue: 1, defaultEstimatedDurationUnit: 'weeks', defaultEstimatedVisits: 1 },
        { id: 'f7', procedureCode: 'D6010', procedureName: 'Surgical placement of implant body', category: 'IMPLANT', unitType: 'PER_TOOTH', baseFee: 2200, membershipFee: 1800, isActive: true, defaultEstimatedDurationValue: 4, defaultEstimatedDurationUnit: 'months', defaultEstimatedVisits: 3 },
        { id: 'f8', procedureCode: 'D4341', procedureName: 'Periodontal scaling and root planing - 4+ teeth', category: 'PERIO', unitType: 'PER_QUADRANT', baseFee: 300, membershipFee: 240, isActive: true, defaultEstimatedDurationValue: 6, defaultEstimatedDurationUnit: 'weeks', defaultEstimatedVisits: 2 },
    ];
};

// --- ITEM CRUD OPERATIONS ---
export const createTreatmentPlanItem = (planId: string, data: Partial<TreatmentPlanItem>): TreatmentPlanItem => {
  const newItem: TreatmentPlanItem = {
    id: generateId(), treatmentPlanId: planId, feeScheduleEntryId: data.feeScheduleEntryId || '',
    procedureCode: data.procedureCode || 'Dxxxx', procedureName: data.procedureName || 'Unknown Procedure',
    unitType: data.unitType || 'PER_PROCEDURE', category: data.category || 'OTHER', itemType: 'PROCEDURE',
    baseFee: data.baseFee || 0, units: data.units || 1, grossFee: (data.baseFee || 0) * (data.units || 1),
    discount: data.discount || 0, netFee: ((data.baseFee || 0) * (data.units || 1)) - (data.discount || 0),
    sortOrder: data.sortOrder || 0, ...data
  };
  
  if (data.feeScheduleEntryId) {
      const entry = getFeeSchedule().find(f => f.id === data.feeScheduleEntryId);
      if (entry) {
          newItem.procedureCode = entry.procedureCode; newItem.procedureName = entry.procedureName;
          newItem.category = entry.category; newItem.unitType = entry.unitType;
          newItem.baseFee = entry.baseFee; newItem.membershipFee = entry.membershipFee;
          newItem.grossFee = newItem.baseFee * newItem.units; newItem.netFee = newItem.grossFee - newItem.discount;
          
          newItem.estimatedVisits = entry.defaultEstimatedVisits ?? newItem.estimatedVisits ?? 1;
          newItem.estimatedDurationValue = entry.defaultEstimatedDurationValue ?? newItem.estimatedDurationValue ?? null;
          newItem.estimatedDurationUnit = entry.defaultEstimatedDurationUnit ?? newItem.estimatedDurationUnit ?? null;
          
          newItem.estimatedVisitsIsManual = data.estimatedVisitsIsManual ?? false;
          newItem.estimatedDurationIsManual = data.estimatedDurationIsManual ?? false;
      }
  }
  const allItems = getFromStorage<TreatmentPlanItem>(KEY_ITEMS, []);
  saveToStorage(KEY_ITEMS, [...allItems, newItem]);
  const plan = getTreatmentPlanById(planId);
  if (plan) {
      const planItems = [...allItems, newItem].filter(i => i.treatmentPlanId === planId);
      const { totalFee, totalMemberSavings } = computePlanTotals(planItems, plan.feeScheduleType);
      const insurance = plan.estimatedInsurance || 0; const discount = plan.clinicDiscount || 0;
      const patientPortion = Math.max(0, totalFee - insurance - discount);
      updateTreatmentPlan(planId, { totalFee, membershipSavings: totalMemberSavings, patientPortion });
  }
  return newItem;
};

export const updateTreatmentPlanItem = (itemId: string, updates: Partial<TreatmentPlanItem>): { plan: TreatmentPlan, items: TreatmentPlanItem[] } | null => {
  const allItems = getFromStorage<TreatmentPlanItem>(KEY_ITEMS, []);
  const index = allItems.findIndex(i => i.id === itemId);
  if (index === -1) return null;
  const originalItem = allItems[index];
  let updatedItem = { ...originalItem, ...updates };

  if (updates.estimatedVisits !== undefined) updatedItem.estimatedVisitsIsManual = true;
  if (updates.estimatedDurationValue !== undefined || updates.estimatedDurationUnit !== undefined) {
     updatedItem.estimatedDurationIsManual = true;
  }

  if (updates.baseFee !== undefined || updates.units !== undefined || updates.discount !== undefined || updates.membershipFee !== undefined) {
      const plan = getTreatmentPlanById(updatedItem.treatmentPlanId);
      if (plan) {
          const pricing = computeItemPricing(updatedItem, plan.feeScheduleType);
          updatedItem.grossFee = pricing.grossActive; updatedItem.netFee = pricing.netFee;
      }
  }
  allItems[index] = updatedItem; saveToStorage(KEY_ITEMS, allItems);
  const plan = getTreatmentPlanById(updatedItem.treatmentPlanId);
  if (plan) {
      const planItems = allItems.filter(i => i.treatmentPlanId === updatedItem.treatmentPlanId);
      const { totalFee, totalMemberSavings } = computePlanTotals(planItems, plan.feeScheduleType);
      const insurance = plan.estimatedInsurance || 0; const discount = plan.clinicDiscount || 0;
      const patientPortion = Math.max(0, totalFee - insurance - discount);
      const updatedPlan = { ...plan, totalFee, membershipSavings: totalMemberSavings, patientPortion };
      updateTreatmentPlan(plan.id, updatedPlan);
      return { plan: updatedPlan, items: planItems };
  }
  return { plan: plan!, items: [] };
};

export const deleteTreatmentPlanItem = (itemId: string) => {
  const allItems = getFromStorage<TreatmentPlanItem>(KEY_ITEMS, []);
  const itemToDelete = allItems.find(i => i.id === itemId);
  if (!itemToDelete) return;
  const newItems = allItems.filter(i => i.id !== itemId); saveToStorage(KEY_ITEMS, newItems);
  const plan = getTreatmentPlanById(itemToDelete.treatmentPlanId);
  if (plan) {
      const planItems = newItems.filter(i => i.treatmentPlanId === plan.id);
      const { totalFee, totalMemberSavings } = computePlanTotals(planItems, plan.feeScheduleType);
      const insurance = plan.estimatedInsurance || 0; const discount = plan.clinicDiscount || 0;
      const patientPortion = Math.max(0, totalFee - insurance - discount);
      updateTreatmentPlan(plan.id, { totalFee, membershipSavings: totalMemberSavings, patientPortion });
  }
};

export const createAddOnItem = (planId: string, def: Partial<TreatmentPlanItem> & { addOnKind: AddOnKind, label: string, fee: number, membershipFee?: number, phaseId: string, appliesToItemIds: string[], category?: FeeCategory, code?: string }): TreatmentPlanItem => {
    return createTreatmentPlanItem(planId, {
        itemType: 'ADDON', addOnKind: def.addOnKind, procedureName: def.label, procedureCode: def.code || 'D9999',
        baseFee: def.fee, membershipFee: def.membershipFee, phaseId: def.phaseId, phaseLocked: true, 
        linkedItemIds: def.appliesToItemIds, category: def.category || 'OTHER', unitType: 'PER_PROCEDURE'
    });
};

export const createSedationItem = (planId: string, data: { sedationType: string, appliesToItemIds: string[], fee: number, phaseId: string }) => {
    const def = SEDATION_TYPES.find(s => s.label === data.sedationType);
    return createAddOnItem(planId, {
        addOnKind: 'SEDATION', label: `Sedation – ${data.sedationType}`, fee: def ? def.defaultFee : data.fee,
        membershipFee: def ? def.membershipFee : undefined, phaseId: data.phaseId, appliesToItemIds: data.appliesToItemIds,
        category: 'OTHER', code: def ? def.defaultCode : 'D92XX'
    });
};

export interface AddOnDefinition { kind: AddOnKind; label: string; defaultFee: number; membershipFee?: number; defaultCode: string; description: string; category: FeeCategory; }

export const ADD_ON_LIBRARY: AddOnDefinition[] = [
    { kind: 'SEDATION', label: 'Nitrous Oxide', defaultFee: 150, membershipFee: 100, defaultCode: 'D9230', description: 'Inhalation sedation (laughing gas)', category: 'OTHER' },
    { kind: 'SEDATION', label: 'Oral Sedation', defaultFee: 350, membershipFee: 250, defaultCode: 'D9248', description: 'Oral conscious sedation', category: 'OTHER' },
    { kind: 'SEDATION', label: 'IV Moderate', defaultFee: 650, membershipFee: 500, defaultCode: 'D9243', description: 'Intravenous moderate sedation', category: 'OTHER' },
    { kind: 'BONE_GRAFT', label: 'Bone Graft (Socket)', defaultFee: 450, membershipFee: 350, defaultCode: 'D7953', description: 'Socket preservation graft', category: 'SURGICAL' },
    { kind: 'MEMBRANE', label: 'Membrane (Resorbable)', defaultFee: 300, membershipFee: 225, defaultCode: 'D4266', description: 'Collagen membrane', category: 'SURGICAL' },
    { kind: 'PRF', label: 'L-PRF Therapy', defaultFee: 250, membershipFee: 150, defaultCode: 'D9999', description: 'Platelet Rich Fibrin', category: 'SURGICAL' },
    { kind: 'TEMP_CROWN', label: 'Custom Temp Crown', defaultFee: 150, membershipFee: 0, defaultCode: 'D2970', description: 'Laboratory fabricated temp', category: 'RESTORATIVE' },
    { kind: 'CORE_BUILDUP', label: 'Core Buildup', defaultFee: 300, membershipFee: 200, defaultCode: 'D2950', description: 'Core buildup including any pins', category: 'RESTORATIVE' },
];

export const SEDATION_TYPES = ADD_ON_LIBRARY.filter(a => a.kind === 'SEDATION');

export const checkAddOnCompatibility = (kind: AddOnKind, targetCategory: FeeCategory): boolean => {
    if (kind === 'SEDATION') return true; 
    if (['BONE_GRAFT', 'MEMBRANE', 'PRF'].includes(kind)) return ['SURGICAL', 'IMPLANT', 'EXTRACTION', 'PERIO', 'OTHER'].includes(targetCategory);
    if (['CORE_BUILDUP', 'TEMP_CROWN'].includes(kind)) return ['RESTORATIVE', 'PROSTHETIC', 'ENDODONTIC'].includes(targetCategory);
    return true;
};

export const getPatients = (): Patient[] => getFromStorage<Patient>(KEY_PATIENTS, DEMO_PATIENTS);
export const getPatientById = (id: string): Patient | undefined => getPatients().find(p => p.id === id);
export const upsertPatient = (patient: Patient) => {
    const patients = getPatients(); const index = patients.findIndex(p => p.id === patient.id);
    if (index >= 0) patients[index] = patient; else patients.push(patient);
    saveToStorage(KEY_PATIENTS, patients);
};

export const getProviders = (): Provider[] => {
    const defaults = [{ id: 'prov-1', fullName: 'Dr. Sarah Smith', npi: '1234567890', createdAt: '', updatedAt: '' }, { id: 'prov-2', fullName: 'Dr. John Doe', npi: '0987654321', createdAt: '', updatedAt: '' }];
    return getFromStorage<Provider>(KEY_PROVIDERS, defaults);
};
export const getProviderById = (id: string): Provider | undefined => getProviders().find(p => p.id === id);

export const createVisit = (data: Partial<Visit>): Visit => {
    const newVisit: Visit = { id: generateId(), treatmentPlanId: data.treatmentPlanId || '', date: data.date || new Date().toISOString().split('T')[0], provider: data.provider || 'Unknown', providerId: data.providerId, visitType: data.visitType || 'other', attachedProcedureIds: [], status: 'PLANNED', createdAt: new Date().toISOString(), ...data };
    const visits = getFromStorage<Visit>(KEY_VISITS, []); saveToStorage(KEY_VISITS, [...visits, newVisit]); return newVisit;
};
export const getVisitsForPlan = (planId: string): Visit[] => getFromStorage<Visit>(KEY_VISITS, []).filter(v => v.treatmentPlanId === planId);
export const updateVisit = (id: string, updates: Partial<Visit>) => {
    const visits = getFromStorage<Visit>(KEY_VISITS, []); const idx = visits.findIndex(v => v.id === id);
    if (idx >= 0) { visits[idx] = { ...visits[idx], ...updates }; saveToStorage(KEY_VISITS, visits); }
};
export const updateVisitStatus = (id: string, status: VisitStatus) => updateVisit(id, { status });
export const updateVisitClaimPrepStatus = (id: string, status: 'NOT_STARTED' | 'IN_PROGRESS' | 'READY') => updateVisit(id, { claimPrepStatus: status });
export const linkProceduresToVisit = (visitId: string, procedureIds: string[]) => {
    const visits = getFromStorage<Visit>(KEY_VISITS, []); const idx = visits.findIndex(v => v.id === visitId);
    if (idx >= 0) {
        const visit = visits[idx]; const updatedIds = Array.from(new Set([...visit.attachedProcedureIds, ...procedureIds]));
        visits[idx] = { ...visit, attachedProcedureIds: updatedIds }; saveToStorage(KEY_VISITS, visits);
        procedureIds.forEach(pid => updateTreatmentPlanItem(pid, { performedInVisitId: visitId, procedureStatus: 'COMPLETED', performedDate: visit.date }));
    }
};
export const markProcedureCompleted = (id: string, date: string) => updateTreatmentPlanItem(id, { procedureStatus: 'COMPLETED', performedDate: date });
export const updateProcedureDiagnosisCodes = (id: string, codes: string[]) => updateTreatmentPlanItem(id, { diagnosisCodes: codes });
export const updateProcedureDocumentationFlags = (id: string, flags: Partial<NonNullable<TreatmentPlanItem['documentation']>>) => {
    const allItems = getFromStorage<TreatmentPlanItem>(KEY_ITEMS, []);
    const item = allItems.find(i => i.id === id); if (item) { const newDoc = { ...item.documentation, ...flags }; updateTreatmentPlanItem(id, { documentation: newDoc }); }
};

export const createShareLink = (planId: string): ShareLink => {
    const token = Math.random().toString(36).substring(2, 15);
    const link: ShareLink = { id: generateId(), treatmentPlanId: planId, token, createdAt: new Date().toISOString(), isActive: true };
    const shares = getFromStorage<ShareLink>(KEY_SHARES, DEMO_SHARES); saveToStorage(KEY_SHARES, [...shares, link]); return link;
};
export const getPlanByShareToken = (token: string): { plan: TreatmentPlan, items: TreatmentPlanItem[] } | null => {
    const shares = getFromStorage<ShareLink>(KEY_SHARES, DEMO_SHARES); const link = shares.find(s => s.token === token && s.isActive);
    if (!link) return null; return loadTreatmentPlanWithItems(link.treatmentPlanId);
};

export const getReadinessInputForVisit = (visitId: string): ReadinessInput | null => {
  const allVisits = getFromStorage<Visit>(KEY_VISITS, []);
  const visit = allVisits.find(v => v.id === visitId); if (!visit) return null;
  const plan = getTreatmentPlanById(visit.treatmentPlanId); if (!plan) return null;
  const patient = plan.patientId ? getPatientById(plan.patientId) : undefined;
  const provider = visit.providerId ? getProviderById(visit.providerId) : undefined;
  const allItems = getFromStorage<TreatmentPlanItem>(KEY_ITEMS, []);
  const visitItems = allItems.filter(i => i.performedInVisitId === visitId || (visit.attachedProcedureIds && visit.attachedProcedureIds.includes(i.id)));
  const procedures: ReadinessProcedure[] = visitItems.map(p => ({ id: p.id, cdtCode: p.procedureCode, label: p.procedureName, tooth: p.selectedTeeth?.join(','), surfaces: p.surfaces, quadrant: p.selectedQuadrants?.[0], isCompleted: p.procedureStatus === 'COMPLETED' }));
  const diagnoses: ReadinessDiagnosis[] = visitItems.flatMap(p => (p.diagnosisCodes || []).map(code => ({ procedureId: p.id, icd10: code })));
  const evidence: ReadinessEvidence[] = visitItems.flatMap(p => {
      const ev: ReadinessEvidence[] = [];
      if (p.documentation?.hasXray) ev.push({ procedureId: p.id, type: 'pre_op_xray', attached: true });
      if (p.documentation?.hasPerioChart) ev.push({ procedureId: p.id, type: 'perio_charting', attached: true });
      if (p.documentation?.hasPhoto) ev.push({ procedureId: p.id, type: 'intraoral_photo', attached: true });
      if (p.documentation?.hasFmxWithin36Months) ev.push({ procedureId: p.id, type: 'fmX_pano_recent', attached: true });
      return ev;
  });
  return { procedures, diagnoses, evidence, risksAndConsentComplete: true, provider: { npi: provider?.npi }, serviceDate: visit.performedDate || visit.date, patient: { dob: patient?.dob, memberId: patient?.memberId } };
};

export const canAdvanceVisitToClaimReady = (input: ReadinessInput): { ok: boolean; blockers: MissingItem[] } => {
  const result = computeDocumentationReadiness(input); const blockers = result.items.filter(i => i.severity === 'blocker');
  return { ok: blockers.length === 0, blockers };
};

/**
 * PRODUCTION MIGRATION / PURGE HELPER:
 * Strips all legacy seeded demo estimates and enforces clinical engine flags.
 */
const migrateAllData = () => {
    if (typeof window === 'undefined') return;
    let plans = getFromStorage<TreatmentPlan>(KEY_PLANS, []);
    let allItems = getFromStorage<TreatmentPlanItem>(KEY_ITEMS, []);
    let madeChanges = false;
    
    // Purge Demo Items and initialize flags
    allItems = allItems.map(item => {
        let changed = false;
        if (item.estimatedVisitsIsManual === undefined) { item.estimatedVisitsIsManual = false; changed = true; }
        if (item.estimatedDurationIsManual === undefined) { item.estimatedDurationIsManual = false; changed = true; }
        
        // If not manual, clear values to ensure hydration from library happens
        if (item.estimatedVisitsIsManual !== true) { item.estimatedVisits = undefined; changed = true; }
        if (item.estimatedDurationIsManual !== true) { 
            item.estimatedDurationValue = null; 
            item.estimatedDurationUnit = null; 
            changed = true; 
        }
        
        if (changed) madeChanges = true;
        return item;
    });

    plans.forEach((plan, idx) => {
        const planItems = allItems.filter(i => i.treatmentPlanId === plan.id);
        
        // Structural validation
        const fixedItems = assignMissingPhaseIds(plan, planItems);
        if (fixedItems !== planItems) {
            madeChanges = true;
            fixedItems.forEach(fixed => { 
                const index = allItems.findIndex(i => i.id === fixed.id); 
                if (index >= 0) allItems[index] = fixed; 
            });
        }
        
        const reconciledManifest = rebuildPhaseManifest(plan, fixedItems);
        
        // Force non-monitor phases to automatic to strip seeded durations
        reconciledManifest.phases?.forEach(p => {
            if (p.durationIsManual === undefined || (p.isMonitorPhase !== true && p.durationIsManual === true)) {
                p.durationIsManual = p.isMonitorPhase === true; 
                if (!p.durationIsManual) {
                    p.estimatedDurationValue = null;
                    p.estimatedDurationUnit = null;
                }
                madeChanges = true;
            }
        });

        const finalPlan = rebuildPhaseDurationsFromItems(reconciledManifest, fixedItems);
        if (JSON.stringify(finalPlan.phases) !== JSON.stringify(plan.phases)) {
            madeChanges = true; plans[idx] = finalPlan;
        }
    });

    if (madeChanges) {
        saveToStorage(KEY_PLANS, plans); saveToStorage(KEY_ITEMS, allItems);
        console.log("Migration V17: Demo Values Purged. Production Engine Active.");
    }
};

try { migrateAllData(); } catch (e) { console.warn("Migration failed", e); }
