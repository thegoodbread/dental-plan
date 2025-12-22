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
  ProcedureStatus,
  Patient,
  Provider,
  VisitType,
  FeeScheduleType,
  PhaseBucketKey
} from '../types';
import { DEMO_PLANS, DEMO_ITEMS, DEMO_SHARES, DEMO_PATIENTS } from '../mock/seedPlans';
import { computeItemPricing, computePlanTotals } from '../utils/pricingLogic';
import { listEffectiveProcedures, resolveEffectiveProcedure } from '../domain/procedureResolver';
import { computeDocumentationReadiness, ReadinessInput, ReadinessProcedure, ReadinessDiagnosis, ReadinessEvidence, MissingItem } from '../domain/ClaimReadinessEngine';

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

export const computeBucketKeyForItem = (item: TreatmentPlanItem): PhaseBucketKey => {
  const code = (item.procedureCode || '').toUpperCase();
  const cat = (item.category || 'OTHER').toUpperCase();
  const urgency = (item.urgency || '').toUpperCase();

  if (urgency === 'URGENT' || urgency === 'ASAP') {
    if (cat.includes('IMPLANT') || code.startsWith('D60')) return 'IMPLANT';
    return 'FOUNDATION';
  }
  if (cat.includes('DIAGNOSTIC') || cat.includes('PREVENT') || cat.includes('PERIO')) return 'FOUNDATION';
  if (code.startsWith('D01') || code.startsWith('D1') || code.startsWith('D4')) return 'FOUNDATION';
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

export function hydrateItemClinicalDefaultsFromFeeSchedule(items: TreatmentPlanItem[]): { items: TreatmentPlanItem[], changed: boolean } {
  let globalChanged = false;

  const newItems = items.map(item => {
    const effective = resolveEffectiveProcedure(item.procedureCode);
    if (!effective) return item;

    let itemChanged = false;
    const updated = { ...item };

    // TIGHT HYDRATION: Only overwrite names if technical placeholders or the code itself are used.
    const currentName = updated.procedureName;
    const code = updated.procedureCode;
    const isNameTechnical = !currentName || 
                            currentName.trim() === "" ||
                            currentName === code || 
                            currentName === "Unknown Procedure" || 
                            currentName === "Needs label";
    
    if (isNameTechnical && !effective.isLabelMissing) {
        updated.procedureName = effective.displayName;
        updated.isCustomProcedureNameMissing = false;
        itemChanged = true;
    } else if (isNameTechnical && effective.isLabelMissing) {
        if (updated.procedureName !== "Needs label") {
            updated.procedureName = "Needs label";
            itemChanged = true;
        }
        updated.isCustomProcedureNameMissing = true;
    } else {
        if (updated.isCustomProcedureNameMissing !== false) {
            updated.isCustomProcedureNameMissing = false;
            itemChanged = true;
        }
    }

    // AUTHORITATIVE PRICING: Sync only if NOT manually overridden
    if (!updated.baseFeeIsManual) {
        if (updated.baseFee !== effective.pricing.baseFee) {
            updated.baseFee = effective.pricing.baseFee;
            itemChanged = true;
        }
    }
    if (!updated.membershipFeeIsManual) {
        if (updated.membershipFee !== effective.pricing.membershipFee) {
            updated.membershipFee = effective.pricing.membershipFee;
            itemChanged = true;
        }
    }

    if (updated.estimatedVisitsIsManual === undefined) { updated.estimatedVisitsIsManual = false; itemChanged = true; }
    if (updated.estimatedDurationIsManual === undefined) { updated.estimatedDurationIsManual = false; itemChanged = true; }

    if (updated.estimatedVisitsIsManual !== true) {
       const defVisits = effective.defaults.defaultEstimatedVisits ?? 1;
       if (updated.estimatedVisits !== defVisits) {
          updated.estimatedVisits = defVisits;
          itemChanged = true;
       }
    }

    if (updated.estimatedDurationIsManual !== true) {
      const defVal = effective.defaults.defaultEstimatedDurationValue ?? null;
      const defUnit = effective.defaults.defaultEstimatedDurationUnit ?? null;

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

export function rebuildPhaseDurationsFromItems(plan: TreatmentPlan, items: TreatmentPlanItem[]): TreatmentPlan {
  if (!plan.phases) return plan;
  const itemsByPhase = new Map<string, TreatmentPlanItem[]>();
  items.forEach(item => {
      if (!item.phaseId) return;
      if (!itemsByPhase.has(item.phaseId)) itemsByPhase.set(item.phaseId, []);
      itemsByPhase.get(item.phaseId)!.push(item);
  });
  const updatedPhases = plan.phases.map(p => {
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
    
    const updatedItems = planItems.map(item => {
        const pricing = computeItemPricing(item, mode);
        return { ...item, netFee: pricing.netFee, grossFee: pricing.grossActive };
    });

    const itemMap = new Map(updatedItems.map(i => [i.id, i]));
    const newAllItems = allItems.map(i => itemMap.get(i.id) || i);
    saveToStorage(KEY_ITEMS, newAllItems);

    const updatedPlanBase = { ...plan, feeScheduleType: mode };
    const planWithPhases = rebuildPhaseDurationsFromItems(updatedPlanBase, updatedItems);
    const finalPlan = recalculatePlanTotals(planWithPhases, updatedItems);
    
    plans[planIdx] = finalPlan;
    saveToStorage(KEY_PLANS, plans);
    
    return { plan: finalPlan, items: updatedItems };
};

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

export const getFeeSchedule = (): FeeScheduleEntry[] => {
    const effectiveProcedures = listEffectiveProcedures();
    return effectiveProcedures.map(p => ({
        id: `proc_${p.cdtCode}`,
        procedureCode: p.cdtCode,
        procedureName: p.displayName,
        category: p.category,
        unitType: p.unitType,
        baseFee: p.pricing.baseFee,
        membershipFee: p.pricing.membershipFee,
        isActive: true,
        defaultEstimatedVisits: p.defaults.defaultEstimatedVisits ?? 1,
        defaultEstimatedDurationValue: p.defaults.defaultEstimatedDurationValue ?? undefined,
        defaultEstimatedDurationUnit: p.defaults.defaultEstimatedDurationUnit ?? undefined
    }));
};

export const createTreatmentPlanItem = (planId: string, data: Partial<TreatmentPlanItem>): TreatmentPlanItem => {
  const code = data.procedureCode;
  const effectiveProc = code ? resolveEffectiveProcedure(code) : null;

  const providedName = data.procedureName;
  const hasValidProvidedName = providedName && 
                               providedName.trim() !== "" &&
                               providedName !== code && 
                               providedName !== "Unknown Procedure";
  
  const newItem: TreatmentPlanItem = {
    id: generateId(), 
    treatmentPlanId: planId, 
    feeScheduleEntryId: data.feeScheduleEntryId || '',
    procedureCode: data.procedureCode || 'Dxxxx', 
    procedureName: hasValidProvidedName ? providedName! : (effectiveProc && !effectiveProc.isLabelMissing ? effectiveProc.displayName : "Needs label"),
    unitType: data.unitType || (effectiveProc ? effectiveProc.unitType : 'PER_PROCEDURE'), 
    category: data.category || (effectiveProc ? effectiveProc.category : 'OTHER'), 
    itemType: 'PROCEDURE',
    baseFee: data.baseFee ?? (effectiveProc ? effectiveProc.pricing.baseFee : 0), 
    membershipFee: data.membershipFee ?? (effectiveProc ? effectiveProc.pricing.membershipFee : null),
    units: data.units || 1, 
    grossFee: 0,
    discount: data.discount || 0, 
    netFee: 0,
    sortOrder: data.sortOrder || 0, 
    ...data
  };

  if (effectiveProc) {
      if (!hasValidProvidedName) {
         newItem.procedureName = effectiveProc.isLabelMissing ? "Needs label" : effectiveProc.displayName;
      }
      newItem.category = effectiveProc.category;
      newItem.unitType = effectiveProc.unitType;
      
      // Initial creation respects meta defaults, but we flag as NOT manual yet unless explicit
      newItem.baseFee = data.baseFee ?? effectiveProc.pricing.baseFee ?? 0;
      newItem.membershipFee = data.membershipFee ?? effectiveProc.pricing.membershipFee ?? null;
      newItem.baseFeeIsManual = data.baseFee !== undefined;
      newItem.membershipFeeIsManual = data.membershipFee !== undefined;

      newItem.isCustomProcedureNameMissing = effectiveProc.isLabelMissing;
      
      newItem.estimatedVisits = effectiveProc.defaults.defaultEstimatedVisits ?? 1;
      newItem.estimatedDurationValue = effectiveProc.defaults.defaultEstimatedDurationValue ?? null;
      newItem.estimatedDurationUnit = effectiveProc.defaults.defaultEstimatedDurationUnit ?? null;
      
      const rules = effectiveProc.selectionRules;
      if (rules.requiresToothSelection) newItem.selectedTeeth = data.selectedTeeth || [];
      if (rules.allowsQuadrants) newItem.selectedQuadrants = data.selectedQuadrants || [];
      if (rules.allowsArch) newItem.selectedArches = data.selectedArches || [];
      if (rules.requiresSurfaces) newItem.surfaces = data.surfaces || [];
  }

  const plan = getTreatmentPlanById(planId);
  const currentPricing = computeItemPricing(newItem, plan?.feeScheduleType || 'standard');
  newItem.grossFee = currentPricing.grossActive;
  newItem.netFee = currentPricing.netFee;

  const allItems = getFromStorage<TreatmentPlanItem>(KEY_ITEMS, []);
  saveToStorage(KEY_ITEMS, [...allItems, newItem]);
  
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

  if (updates.procedureName && updates.procedureName !== updatedItem.procedureCode && updates.procedureName !== "Needs label" && updates.procedureName.trim() !== "") {
      updatedItem.isCustomProcedureNameMissing = false;
  }

  // TRACK MANUAL OVERRIDES
  if (updates.baseFee !== undefined) updatedItem.baseFeeIsManual = true;
  if (updates.membershipFee !== undefined) updatedItem.membershipFeeIsManual = true;
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

export const rehydrateAllPlans = () => {
    const plans = getAllTreatmentPlans();
    plans.forEach(plan => {
        loadTreatmentPlanWithItems(plan.id);
    });
};

export const deleteTreatmentPlanItem = (itemId: string) => {
  const allItems = getFromStorage<TreatmentPlanItem>(KEY_ITEMS, []);
  const itemToDelete = allItems.find(i => i.id === itemId);
  if (!itemToDelete) return;
  
  const newItems = allItems.filter(i => 
    i.id !== itemId && 
    !(i.linkedItemIds && i.linkedItemIds.includes(itemId))
  );
  
  saveToStorage(KEY_ITEMS, newItems);
  const plan = getTreatmentPlanById(itemToDelete.treatmentPlanId);
  if (plan) {
      const planItems = newItems.filter(i => i.treatmentPlanId === plan.id);
      const { totalFee, totalMemberSavings } = computePlanTotals(planItems, plan.feeScheduleType);
      const insurance = plan.estimatedInsurance || 0; const discount = plan.clinicDiscount || 0;
      const patientPortion = Math.max(0, totalFee - insurance - discount);
      updateTreatmentPlan(plan.id, { totalFee, membershipSavings: totalMemberSavings, patientPortion });
  }
};

export const createAddOnItem = (planId: string, def: any): TreatmentPlanItem => {
  return createTreatmentPlanItem(planId, { ...def, itemType: 'ADDON' });
};

export const createSedationItem = (planId: string, data: any) => {
  const def = SEDATION_TYPES.find(s => s.label === data.sedationType);
  return createTreatmentPlanItem(planId, {
    itemType: 'ADDON',
    addOnKind: 'SEDATION',
    procedureName: `Sedation – ${data.sedationType}`,
    procedureCode: def?.defaultCode || 'D92XX',
    baseFee: data.fee,
    phaseId: data.phaseId,
    linkedItemIds: data.appliesToItemIds,
    category: 'OTHER',
    unitType: 'PER_PROCEDURE'
  });
};

export interface AddOnDefinition {
  kind: AddOnKind;
  label: string;
  defaultFee: number;
  membershipFee?: number;
  defaultCode: string;
  description: string;
  category: FeeCategory;
}

export const ADD_ON_LIBRARY: AddOnDefinition[] = [
  { kind: 'SEDATION', label: 'Nitrous Oxide', defaultFee: 120, membershipFee: 95, defaultCode: 'D9230', description: 'Laughing gas', category: 'OTHER' },
  { kind: 'SEDATION', label: 'Oral Sedation', defaultFee: 250, membershipFee: 195, defaultCode: 'D9248', description: 'Conscious sedation', category: 'OTHER' },
  { kind: 'SEDATION', label: 'IV Moderate', defaultFee: 550, membershipFee: 450, defaultCode: 'D9243', description: 'Moderate sedation', category: 'OTHER' },
  { kind: 'BONE_GRAFT', label: 'Bone Graft', defaultFee: 450, membershipFee: 350, defaultCode: 'D7953', description: 'Socket preservation', category: 'SURGICAL' },
  { kind: 'CORE_BUILDUP', label: 'Core Buildup', defaultFee: 280, membershipFee: 210, defaultCode: 'D2950', description: 'Pre-crown foundation', category: 'RESTORATIVE' },
];

export const SEDATION_TYPES = ADD_ON_LIBRARY.filter(a => a.kind === 'SEDATION');

export const checkAddOnCompatibility = (kind: AddOnKind, cat: FeeCategory): boolean => {
    const surgicalCats: FeeCategory[] = ['SURGICAL', 'IMPLANT', 'OTHER'];
    const restorativeCats: FeeCategory[] = ['RESTORATIVE', 'PROSTHETIC', 'COSMETIC', 'ENDODONTIC'];

    if (kind === 'BONE_GRAFT' || kind === 'MEMBRANE' || kind === 'PRF') {
        return surgicalCats.includes(cat);
    }
    if (kind === 'CORE_BUILDUP' || kind === 'TEMP_CROWN' || kind === 'PULP_CAP') {
        return restorativeCats.includes(cat);
    }
    return true;
};

export const getPatients = (): Patient[] => getFromStorage<Patient>(KEY_PATIENTS, DEMO_PATIENTS);
export const upsertPatient = (p: Patient) => {
  const all = getPatients();
  const idx = all.findIndex(x => x.id === p.id);
  if (idx >= 0) all[idx] = p; else all.push(p);
  saveToStorage(KEY_PATIENTS, all);
};

export const getProviders = (): Provider[] => getFromStorage<Provider>(KEY_PROVIDERS, [{ id: 'p1', fullName: 'Dr. John Smith', npi: '1234567890', createdAt: '', updatedAt: '' }]);
export const getProviderById = (id: string) => getProviders().find(p => p.id === id);

export const getVisitsForPlan = (planId: string): Visit[] => getFromStorage<Visit>(KEY_VISITS, []).filter(v => v.treatmentPlanId === planId);
export const createVisit = (data: any): Visit => {
  const all = getFromStorage<Visit>(KEY_VISITS, []);
  const nv = { id: generateId(), createdAt: new Date().toISOString(), status: 'PLANNED', attachedProcedureIds: [], ...data };
  saveToStorage(KEY_VISITS, [...all, nv]);
  return nv;
};

export const updateVisit = (id: string, updates: Partial<Visit>): Visit | null => {
  const all = getFromStorage<Visit>(KEY_VISITS, []);
  const idx = all.findIndex(v => v.id === id);
  if (idx < 0) return null;
  const updated = { ...all[idx], ...updates };
  all[idx] = updated;
  saveToStorage(KEY_VISITS, all);
  return updated;
};

export const linkProceduresToVisit = (visitId: string, procedureIds: string[]) => {
  const allVisits = getFromStorage<Visit>(KEY_VISITS, []);
  const vIdx = allVisits.findIndex(v => v.id === visitId);
  if (vIdx < 0) return;
  
  allVisits[vIdx].attachedProcedureIds = Array.from(new Set([...allVisits[vIdx].attachedProcedureIds, ...procedureIds]));
  saveToStorage(KEY_VISITS, allVisits);
  
  const allItems = getFromStorage<TreatmentPlanItem>(KEY_ITEMS, []);
  procedureIds.forEach(pid => {
    const iIdx = allItems.findIndex(i => i.id === pid);
    if (iIdx >= 0) allItems[iIdx].performedInVisitId = visitId;
  });
  saveToStorage(KEY_ITEMS, allItems);
};

export const markProcedureCompleted = (id: string, date: string) => updateTreatmentPlanItem(id, { procedureStatus: 'COMPLETED', performedDate: date });
export const updateProcedureDiagnosisCodes = (id: string, codes: string[]) => updateTreatmentPlanItem(id, { diagnosisCodes: codes });
export const updateProcedureDocumentationFlags = (id: string, flags: any) => {
  const all = getFromStorage<TreatmentPlanItem>(KEY_ITEMS, []);
  const item = all.find(i => i.id === id);
  if (item) updateTreatmentPlanItem(id, { documentation: { ...item.documentation, ...flags } });
};

export const updateVisitStatus = (id: string, status: VisitStatus) => {
  const all = getFromStorage<Visit>(KEY_VISITS, []);
  const idx = all.findIndex(v => v.id === id);
  if (idx >= 0) { all[idx].status = status; saveToStorage(KEY_VISITS, all); }
};

export const updateVisitClaimPrepStatus = (id: string, status: any) => {
  const all = getFromStorage<Visit>(KEY_VISITS, []);
  const idx = all.findIndex(v => v.id === id);
  if (idx >= 0) { all[idx].claimPrepStatus = status; saveToStorage(KEY_VISITS, all); }
};

export const createShareLink = (planId: string): ShareLink => {
  const s = { id: generateId(), treatmentPlanId: planId, token: generateId(), createdAt: new Date().toISOString(), isActive: true };
  const all = getFromStorage<ShareLink>(KEY_SHARES, []);
  saveToStorage(KEY_SHARES, [...all, s]);
  return s;
};

export const getPlanByShareToken = (token: string) => {
  const all = getFromStorage<ShareLink>(KEY_SHARES, []);
  const link = all.find(l => l.token === token && l.isActive);
  return link ? loadTreatmentPlanWithItems(link.treatmentPlanId) : null;
};

export const getReadinessInputForVisit = (visitId: string): ReadinessInput | null => {
  const allVisits = getFromStorage<Visit>(KEY_VISITS, []);
  const visit = allVisits.find(v => v.id === visitId);
  if (!visit) return null;

  const plan = getTreatmentPlanById(visit.treatmentPlanId);
  if (!plan) return null;

  const allItems = getFromStorage<TreatmentPlanItem>(KEY_ITEMS, []);
  const visitItems = allItems.filter(i => i.performedInVisitId === visit.id);

  const provider = visit.providerId ? getProviderById(visit.providerId) : undefined;
  const patient = plan.patientId ? getPatients().find(p => p.id === plan.patientId) : undefined;

  const procedures: ReadinessProcedure[] = visitItems.map(p => ({
    id: p.id,
    cdtCode: p.procedureCode,
    label: p.procedureName,
    tooth: p.selectedTeeth?.join(','),
    surfaces: p.surfaces,
    quadrant: p.selectedQuadrants?.[0],
    isCompleted: p.procedureStatus === 'COMPLETED'
  }));

  const diagnoses: ReadinessDiagnosis[] = visitItems.flatMap(p => 
    (p.diagnosisCodes || []).map(code => ({ procedureId: p.id, icd10: code }))
  );

  const evidence: ReadinessEvidence[] = [];
  visitItems.forEach(p => {
    if (p.documentation?.hasXray) evidence.push({ procedureId: p.id, type: 'pre_op_xray', attached: true });
    if (p.documentation?.hasPerioChart) evidence.push({ procedureId: p.id, type: 'perio_charting', attached: true });
    if (p.documentation?.hasPhoto) evidence.push({ procedureId: p.id, type: 'intraoral_photo', attached: true });
    if (p.documentation?.hasFmxWithin36Months) evidence.push({ procedureId: p.id, type: 'fmX_pano_recent', attached: true });
  });

  return {
    procedures,
    diagnoses,
    evidence,
    risksAndConsentComplete: (plan.assignedRisks || []).some(r => r.consentCapturedAt) || 
                             (visit.assignedRisks || []).some(r => r.consentCapturedAt),
    provider: provider ? { npi: provider.npi } : undefined,
    patient: patient ? { dob: patient.dob, memberId: patient.memberId } : undefined,
    serviceDate: visit.date,
  };
};

export const canAdvanceVisitToClaimReady = (input: ReadinessInput): { ok: boolean, blockers: MissingItem[] } => {
  const result = computeDocumentationReadiness(input);
  const blockers = result.items.filter(i => i.severity === 'blocker');
  return {
    ok: blockers.length === 0,
    blockers
  };
};

const migrateTechnicalNames = () => {
    if (typeof window === 'undefined') return;
    let allItems = getFromStorage<TreatmentPlanItem>(KEY_ITEMS, []);
    let changed = false;
    
    allItems = allItems.map(item => {
        const isTechnical = !item.procedureName || 
                            item.procedureName.trim() === "" ||
                            item.procedureName === item.procedureCode || 
                            item.procedureName === "Unknown Procedure";
        
        if (isTechnical) {
            const effective = resolveEffectiveProcedure(item.procedureCode);
            if (effective && !effective.isLabelMissing) {
                changed = true;
                return { ...item, procedureName: effective.displayName, isCustomProcedureNameMissing: false };
            } else if (item.procedureName !== "Needs label") {
                changed = true;
                return { ...item, procedureName: "Needs label", isCustomProcedureNameMissing: true };
            }
        }
        return item;
    });

    if (changed) saveToStorage(KEY_ITEMS, allItems);
};

try { migrateTechnicalNames(); } catch(e) {}