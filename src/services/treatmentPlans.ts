import { 
  TreatmentPlan, 
  TreatmentPlanItem, 
  ClaimCompilerInput,
  Visit,
  Patient,
  Provider,
  PayerTier,
  FeeScheduleEntry,
  AddOnKind,
  FeeCategory,
  InsuranceMode,
  FeeScheduleType
} from '../types';
import { DEMO_PLANS, DEMO_ITEMS, DEMO_SHARES, DEMO_PATIENTS } from '../mock/seedPlans';
import { getCategoryFromCdtCode } from '../domain/cdtMapping';
import { resolveVisitProcedureRoles } from '../domain/AdjudicationEngine';
import { computePlanTotals, computeItemPricing } from '../utils/pricingLogic';
import { resolveEffectiveProcedure } from '../domain/procedureResolver';

const KEY_PLANS = 'dental_plans_v8';
const KEY_ITEMS = 'dental_plan_items_v8';
const KEY_VISITS = 'dental_visits_v8';
const KEY_PATIENTS = 'dental_patients_v8';
const KEY_PROVIDERS = 'dental_providers_v8';

const getFromStorage = <T>(key: string, defaultData: T[] = []): T[] => {
  if (typeof window === 'undefined') return defaultData;
  const stored = localStorage.getItem(key);
  return stored ? JSON.parse(stored) : defaultData;
}

const saveToStorage = (key: string, data: any[]) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, JSON.stringify(data));
}

// Internal helper to keep plan totals in sync with item changes
const syncPlanTotals = (planId: string) => {
  const allPlans = getFromStorage<TreatmentPlan>(KEY_PLANS, DEMO_PLANS);
  const planIdx = allPlans.findIndex(p => p.id === planId);
  if (planIdx < 0) return;

  const plan = allPlans[planIdx];
  const allItems = getFromStorage<TreatmentPlanItem>(KEY_ITEMS, DEMO_ITEMS);
  const items = allItems.filter(i => i.treatmentPlanId === planId);

  const { totalFee, totalMemberSavings } = computePlanTotals(items, plan.feeScheduleType);
  
  const insurance = plan.estimatedInsurance || 0;
  const discount = plan.clinicDiscount || 0;
  const patientPortion = Math.max(0, totalFee - insurance - discount);

  allPlans[planIdx] = {
    ...plan,
    totalFee,
    membershipSavings: totalMemberSavings,
    patientPortion,
    updatedAt: new Date().toISOString()
  };

  saveToStorage(KEY_PLANS, allPlans);
};

export const getPatients = (): Patient[] => getFromStorage<Patient>(KEY_PATIENTS, DEMO_PATIENTS);

export const upsertPatient = (patient: Patient): void => {
  const patients = getPatients();
  const index = patients.findIndex(p => p.id === patient.id);
  if (index >= 0) {
    patients[index] = patient;
  } else {
    patients.push(patient);
  }
  saveToStorage(KEY_PATIENTS, patients);
};

export const getProviders = (): Provider[] => getFromStorage<Provider>(KEY_PROVIDERS, [{ id: 'p1', fullName: 'Dr. John Smith', npi: '1234567890', createdAt: '', updatedAt: '' }]);
export const getProviderById = (id: string) => getProviders().find(p => p.id === id);

export const updateProviderNpi = (providerId: string, npi: string): void => {
  const providers = getProviders();
  const index = providers.findIndex(p => p.id === providerId);
  if (index >= 0) {
    providers[index] = { ...providers[index], npi, updatedAt: new Date().toISOString() };
    saveToStorage(KEY_PROVIDERS, providers);
  }
};

export const getVisitById = (visitId: string): Visit | undefined => {
  return getFromStorage<Visit>(KEY_VISITS, []).find(v => v.id === visitId);
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

export const updateProcedureDocumentationFlags = (id: string, flags: any) => {
  const all = getFromStorage<TreatmentPlanItem>(KEY_ITEMS, []);
  const idx = all.findIndex(i => i.id === id);
  if (idx === -1) return;
  const item = all[idx];
  const updatedItem = { ...item, documentation: { ...item.documentation, ...flags } };
  all[idx] = updatedItem;
  saveToStorage(KEY_ITEMS, all);
};

export const getClaimCompilerInputForVisit = (visitId: string): ClaimCompilerInput | null => {
  const visit = getVisitById(visitId);
  if (!visit) return null;

  const plan = getFromStorage<TreatmentPlan>(KEY_PLANS, DEMO_PLANS).find(p => p.id === visit.treatmentPlanId);
  if (!plan) return null;

  const allItems = getFromStorage<TreatmentPlanItem>(KEY_ITEMS, DEMO_ITEMS);
  const visitItems = allItems.filter(i => i.performedInVisitId === visit.id);
  const provider = visit.providerId ? getProviderById(visit.providerId) : undefined;

  const roles = resolveVisitProcedureRoles(visitItems.map(i => ({ 
    id: i.id, 
    category: getCategoryFromCdtCode(i.procedureCode) 
  })));

  return {
    provider: {
      id: provider?.id || 'unknown',
      npi: provider?.npi || '0000000000',
      specialty: 'General Dentistry'
    },
    visit: {
      serviceDate: visit.date,
      payerTier: (visit.claimPrepStatus?.payerTier as PayerTier) || 'GENERIC'
    },
    procedures: visitItems.map(i => {
      const role = roles.find(r => r.procedureId === i.id)?.role || 'ADJUNCT';
      return {
        id: i.id,
        cdtCode: i.procedureCode,
        label: i.procedureName,
        category: getCategoryFromCdtCode(i.procedureCode),
        role: role as any,
        isCompleted: i.procedureStatus === 'COMPLETED',
        performedDate: i.performedDate,
        diagnosisCodes: i.diagnosisCodes || [],
        documentationFlags: {
          hasXray: i.documentation?.hasXray,
          hasPhoto: i.documentation?.hasPhoto,
          hasPerioChart: i.documentation?.hasPerioChart
        },
        justificationFlags: {
          sedationReason: i.documentation?.sedationReason as any,
          buildupReason: i.notes 
        },
        tooth: i.selectedTeeth?.join(','),
        surfaces: i.surfaces
      };
    }),
    visitFacts: {
      chiefComplaint: visit.chiefComplaint,
      hpi: visit.hpi,
      findings: visit.radiographicFindings,
      consentObtained: !!(plan.assignedRisks || []).some(r => r.consentCapturedAt)
    }
  };
};

export const getReadinessInputForVisit = getClaimCompilerInputForVisit;

export interface AddOnDefinition {
  kind: AddOnKind;
  label: string;
  description: string;
  defaultFee: number;
  membershipFee?: number;
  category: FeeCategory;
  defaultCode: string;
}

export const ADD_ON_LIBRARY: AddOnDefinition[] = [
  { kind: 'SEDATION', label: 'Nitrous Oxide', description: 'Inhalation sedation', defaultFee: 85, category: 'OTHER', defaultCode: 'D9230' },
  { kind: 'SEDATION', label: 'Oral Conscious', description: 'Moderate oral sedation', defaultFee: 250, category: 'OTHER', defaultCode: 'D9248' },
  { kind: 'BONE_GRAFT', label: 'Bone Graft (Socket)', description: 'Synthetic bone placement', defaultFee: 450, category: 'SURGICAL', defaultCode: 'D7953' },
  { kind: 'MEMBRANE', label: 'Barrier Membrane', description: 'Resorbable barrier', defaultFee: 350, category: 'SURGICAL', defaultCode: 'D4266' },
  { kind: 'CORE_BUILDUP', label: 'Core Buildup', description: 'Structural foundation for crown', defaultFee: 285, category: 'RESTORATIVE', defaultCode: 'D2950' }
];

export const SEDATION_TYPES = [
  { label: 'Nitrous Oxide', defaultFee: 85, membershipFee: 65 },
  { label: 'Oral Conscious', defaultFee: 250, membershipFee: 200 },
  { label: 'IV Moderate', defaultFee: 550, membershipFee: 450 },
];

export const checkAddOnCompatibility = (kind: AddOnKind, category: FeeCategory): boolean => {
    if (kind === 'SEDATION') return true;
    if (kind === 'BONE_GRAFT' || kind === 'MEMBRANE' || kind === 'PRF') {
        return category === 'SURGICAL' || category === 'IMPLANT';
    }
    if (kind === 'CORE_BUILDUP' || kind === 'TEMP_CROWN') {
        return category === 'RESTORATIVE' || category === 'PROSTHETIC';
    }
    return true;
};

export const getPhaseIdForItem = (plan: TreatmentPlan, item: TreatmentPlanItem): string | null => {
    if (!plan.phases || plan.phases.length === 0) return null;
    const bucket = computeBucketKeyForItem(item);
    const phase = plan.phases.find(p => p.bucketKey === bucket);
    return phase ? phase.id : plan.phases[0].id;
};

export const computeBucketKeyForItem = (item: TreatmentPlanItem): any => {
    switch (item.category) {
        case 'DIAGNOSTIC':
        case 'PREVENTIVE':
        case 'ENDODONTIC':
        case 'PERIO':
        case 'SURGICAL':
            return 'FOUNDATION';
        case 'RESTORATIVE':
        case 'PROSTHETIC':
            return 'RESTORATIVE';
        case 'IMPLANT':
            return 'IMPLANT';
        case 'COSMETIC':
        case 'ORTHO':
            return 'ELECTIVE';
        default:
            return 'OTHER';
    }
};

export const getAllTreatmentPlans = (): TreatmentPlan[] => getFromStorage<TreatmentPlan>(KEY_PLANS, DEMO_PLANS);
export const getTreatmentPlanById = (id: string) => getAllTreatmentPlans().find(p => p.id === id);

export const createTreatmentPlan = (params: { title: string, patientId: string }): TreatmentPlan => {
  const all = getAllTreatmentPlans();
  const patient = getPatients().find(p => p.id === params.patientId);
  const newPlan: TreatmentPlan = {
    id: `plan_${Date.now()}`,
    patientId: params.patientId,
    caseAlias: patient ? `${patient.lastName}, ${patient.firstName}` : 'Unknown Patient',
    planNumber: `TP-${Math.floor(Math.random() * 9000) + 1000}`,
    title: params.title || 'Untitled Plan',
    status: 'DRAFT',
    insuranceMode: 'simple',
    feeScheduleType: 'standard',
    totalFee: 0,
    patientPortion: 0,
    clinicDiscount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    itemIds: [],
    phases: [
      { id: `ph1_${Date.now()}`, planId: '', bucketKey: 'FOUNDATION', title: 'Phase 1: Foundation', sortOrder: 0, itemIds: [], durationIsManual: false, estimatedDurationValue: null, estimatedDurationUnit: null },
      { id: `ph2_${Date.now()}`, planId: '', bucketKey: 'RESTORATIVE', title: 'Phase 2: Restorative', sortOrder: 1, itemIds: [], durationIsManual: false, estimatedDurationValue: null, estimatedDurationUnit: null }
    ]
  };
  newPlan.phases!.forEach(p => p.planId = newPlan.id);
  all.push(newPlan);
  saveToStorage(KEY_PLANS, all);
  return newPlan;
};

export const updateTreatmentPlan = (id: string, updates: Partial<TreatmentPlan>): void => {
  const all = getAllTreatmentPlans();
  const idx = all.findIndex(p => p.id === id);
  if (idx >= 0) {
    all[idx] = { ...all[idx], ...updates, updatedAt: new Date().toISOString() };
    saveToStorage(KEY_PLANS, all);
    // Explicitly sync totals if pricing mode or global inputs change
    if (updates.feeScheduleType || updates.clinicDiscount !== undefined || updates.estimatedInsurance !== undefined) {
        syncPlanTotals(id);
    }
  }
};

export const setPlanPricingMode = (planId: string, mode: FeeScheduleType): void => {
    updateTreatmentPlan(planId, { feeScheduleType: mode });
};

export const loadTreatmentPlanWithItems = (id: string) => {
  const plan = getTreatmentPlanById(id);
  if (!plan) return null;
  const allItems = getFromStorage<TreatmentPlanItem>(KEY_ITEMS, DEMO_ITEMS);
  const items = allItems.filter(i => i.treatmentPlanId === id).sort((a, b) => a.sortOrder - b.sortOrder);
  return { plan, items };
};

export const savePlanAndItems = (plan: TreatmentPlan, items: TreatmentPlanItem[]) => {
  updateTreatmentPlan(plan.id, plan);
  const allItems = getFromStorage<TreatmentPlanItem>(KEY_ITEMS, DEMO_ITEMS);
  const otherItems = allItems.filter(i => i.treatmentPlanId !== plan.id);
  
  // Re-sync item level pricing for all saved items
  const reconciledItems = items.map(item => {
    const pricing = computeItemPricing(item, plan.feeScheduleType);
    return { ...item, netFee: pricing.netFee, grossFee: pricing.grossActive };
  });

  saveToStorage(KEY_ITEMS, [...otherItems, ...reconciledItems]);
  syncPlanTotals(plan.id);
  return loadTreatmentPlanWithItems(plan.id)!;
};

export const getFeeSchedule = (): FeeScheduleEntry[] => {
    return [
        { id: 'f1', procedureCode: 'D0150', procedureName: 'Comp Exam', category: 'DIAGNOSTIC', unitType: 'PER_PROCEDURE', baseFee: 120, membershipFee: 95, isActive: true, defaultEstimatedVisits: 1 },
        { id: 'f2', procedureCode: 'D2391', procedureName: '1S Composite', category: 'RESTORATIVE', unitType: 'PER_TOOTH', baseFee: 220, membershipFee: 175, isActive: true, defaultEstimatedVisits: 1 },
        { id: 'f3', procedureCode: 'D2740', procedureName: 'Ceramic Crown', category: 'RESTORATIVE', unitType: 'PER_TOOTH', baseFee: 1250, membershipFee: 995, isActive: true, defaultEstimatedVisits: 2 },
    ];
};

export const createTreatmentPlanItem = (planId: string, params: any): TreatmentPlanItem => {
  const allItems = getFromStorage<TreatmentPlanItem>(KEY_ITEMS, DEMO_ITEMS);
  const plan = getTreatmentPlanById(planId);
  
  const newItem: TreatmentPlanItem = {
    id: `item_${Date.now()}`,
    treatmentPlanId: planId,
    itemType: 'PROCEDURE',
    procedureCode: params.procedureCode || 'DXXXX',
    procedureName: params.procedureName || 'Unknown Procedure',
    category: params.category || 'OTHER',
    unitType: params.unitType || 'PER_PROCEDURE',
    baseFee: params.baseFee || 0,
    netFee: params.baseFee || 0,
    units: params.units || 1,
    discount: 0,
    sortOrder: allItems.filter(i => i.treatmentPlanId === planId).length,
    ...params
  };

  // Re-sync the new item's pricing immediately
  if (plan) {
      const pricing = computeItemPricing(newItem, plan.feeScheduleType);
      newItem.netFee = pricing.netFee;
      newItem.grossFee = pricing.grossActive;
  }

  allItems.push(newItem);
  saveToStorage(KEY_ITEMS, allItems);
  syncPlanTotals(planId);
  return newItem;
};

export const updateTreatmentPlanItem = (id: string, updates: Partial<TreatmentPlanItem>) => {
  const allItems = getFromStorage<TreatmentPlanItem>(KEY_ITEMS, DEMO_ITEMS);
  const idx = allItems.findIndex(i => i.id === id);
  if (idx >= 0) {
    const planId = allItems[idx].treatmentPlanId;
    const plan = getTreatmentPlanById(planId);
    
    // Apply updates
    let updatedItem = { ...allItems[idx], ...updates };
    
    // Recompute pricing for this specific item if relevant fields changed
    if (plan && (updates.baseFee !== undefined || updates.units !== undefined || updates.discount !== undefined || updates.membershipFee !== undefined)) {
        const pricing = computeItemPricing(updatedItem, plan.feeScheduleType);
        updatedItem.netFee = pricing.netFee;
        updatedItem.grossFee = pricing.grossActive;
    }

    allItems[idx] = updatedItem;
    saveToStorage(KEY_ITEMS, allItems);
    syncPlanTotals(planId);
    return loadTreatmentPlanWithItems(planId);
  }
  return null;
};

export const deleteTreatmentPlanItem = (id: string): void => {
  const allItems = getFromStorage<TreatmentPlanItem>(KEY_ITEMS, DEMO_ITEMS);
  const item = allItems.find(i => i.id === id);
  if (item) {
      const planId = item.treatmentPlanId;
      saveToStorage(KEY_ITEMS, allItems.filter(i => i.id !== id));
      syncPlanTotals(planId);
  }
};

export const createAddOnItem = (planId: string, params: any): TreatmentPlanItem => {
    return createTreatmentPlanItem(planId, { ...params, itemType: 'ADDON' });
};

export const createSedationItem = (planId: string, params: any): TreatmentPlanItem => {
    return createAddOnItem(planId, { ...params, addOnKind: 'SEDATION' });
};

export const getVisitsForPlan = (planId: string): Visit[] => {
    return getFromStorage<Visit>(KEY_VISITS, []).filter(v => v.treatmentPlanId === planId);
};

export const createVisit = (params: any): Visit => {
    const all = getFromStorage<Visit>(KEY_VISITS, []);
    const newVisit: Visit = {
        id: `visit_${Date.now()}`,
        createdAt: new Date().toISOString(),
        ...params
    };
    all.push(newVisit);
    saveToStorage(KEY_VISITS, all);
    return newVisit;
};

export const linkProceduresToVisit = (visitId: string, procedureIds: string[]): void => {
    const visit = getVisitById(visitId);
    if (visit) {
        updateVisit(visitId, { attachedProcedureIds: [...new Set([...visit.attachedProcedureIds, ...procedureIds])] });
        procedureIds.forEach(pid => updateTreatmentPlanItem(pid, { performedInVisitId: visitId }));
    }
};

export const markProcedureCompleted = (id: string, date: string): void => {
    updateTreatmentPlanItem(id, { procedureStatus: 'COMPLETED', performedDate: date });
};

export const updateProcedureDiagnosisCodes = (id: string, codes: string[]): void => {
    updateTreatmentPlanItem(id, { diagnosisCodes: codes });
};

export const updateVisitStatus = (id: string, status: any): void => {
    updateVisit(id, { status });
};

export const updateVisitClaimPrepStatus = (id: string, status: any): void => {
    updateVisit(id, { claimPrepStatus: status });
};

export const createShareLink = (planId: string): any => {
    const token = `share_${Math.random().toString(36).substr(2, 9)}`;
    return { token };
};

export const getPlanByShareToken = (token: string): any => {
    // For demo purposes, we load the first demo plan or search logic.
    // In production, this would resolve the specific plan linked to the token.
    const all = getAllTreatmentPlans();
    const target = all[0]; 
    return loadTreatmentPlanWithItems(target.id);
};

export const rehydrateAllPlans = (): void => {
    const plans = getAllTreatmentPlans();
    const items = getFromStorage<TreatmentPlanItem>(KEY_ITEMS, DEMO_ITEMS);
    
    // Refresh items that are using technical labels or $0 fees if they exist in library
    const updatedItems = items.map(item => {
        const effective = resolveEffectiveProcedure(item.procedureCode);
        if (effective && !effective.isLabelMissing) {
            const updates: Partial<TreatmentPlanItem> = {};
            if (item.procedureName === "Needs label" || item.procedureName === item.procedureCode) {
                updates.procedureName = effective.displayName;
            }
            if (item.baseFee === 0 && effective.pricing.baseFee > 0) {
                updates.baseFee = effective.pricing.baseFee;
            }
            return { ...item, ...updates };
        }
        return item;
    });

    saveToStorage(KEY_ITEMS, updatedItems);
    plans.forEach(p => syncPlanTotals(p.id));
};