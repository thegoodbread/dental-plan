
import { 
  TreatmentPlan, 
  TreatmentPlanItem, 
  FeeScheduleEntry, 
  ActivityLog, 
  ShareLink,
  TreatmentPlanStatus,
  FeeUnitType,
  InsuranceMode,
  FeeScheduleType,
  TreatmentPhase,
  FeeCategory,
  PhaseBucketKey,
  AddOnKind
} from '../types';
import { DEMO_PLANS, DEMO_ITEMS, DEMO_SHARES } from '../mock/seedPlans';
import { estimateDuration } from './clinicalLogic';

// --- KEYS (Bumped to v7 to force re-seed with new Library) ---
const KEY_PLANS = 'dental_plans_v7';
const KEY_ITEMS = 'dental_plan_items_v7';
const KEY_FEE_SCHEDULE = 'dental_fee_schedule_v7';
const KEY_SHARES = 'dental_shares_v7';
const KEY_LOGS = 'dental_logs_v7';

// --- UTILS ---
const generateId = () => `id-${Math.random().toString(36).substring(2, 10)}`;

export const SEDATION_TYPES = [
    { label: 'Nitrous Oxide', defaultFee: 150, membershipFee: 100 },
    { label: 'Oral Sedation', defaultFee: 350, membershipFee: 250 },
    { label: 'IV Moderate Sedation', defaultFee: 650, membershipFee: 500 },
    { label: 'IV Deep Sedation', defaultFee: 950, membershipFee: 750 },
    { label: 'General Anesthesia', defaultFee: 1500, membershipFee: 1200 },
];

// --- ADD-ON LIBRARY & COMPATIBILITY ---

export interface AddOnDefinition {
  kind: AddOnKind;
  label: string;
  defaultFee: number;
  membershipFee?: number;
  defaultCode: string;
  category: FeeCategory;
  description?: string;
}

export const ADD_ON_LIBRARY: AddOnDefinition[] = [
  // Sedation
  { kind: 'SEDATION', label: 'Nitrous Oxide', defaultFee: 150, membershipFee: 100, defaultCode: 'D9230', category: 'OTHER' },
  { kind: 'SEDATION', label: 'IV Moderate Sedation', defaultFee: 650, membershipFee: 500, defaultCode: 'D9243', category: 'OTHER' },
  // Surgical
  { kind: 'BONE_GRAFT', label: 'Bone Graft – Particulate', defaultFee: 450, membershipFee: 395, defaultCode: 'D7953', category: 'SURGICAL', description: 'Regenerates bone' },
  { kind: 'MEMBRANE', label: 'Barrier Membrane', defaultFee: 350, membershipFee: 295, defaultCode: 'D4266', category: 'SURGICAL', description: 'Protects graft site' },
  { kind: 'PRF', label: 'PRF (Growth Factors)', defaultFee: 250, membershipFee: 195, defaultCode: 'D9999', category: 'SURGICAL', description: 'Accelerates healing' },
  // Restorative
  { kind: 'TEMP_CROWN', label: 'Provisional Crown', defaultFee: 250, membershipFee: 150, defaultCode: 'D2799', category: 'RESTORATIVE', description: 'Interim restoration' },
  { kind: 'CORE_BUILDUP', label: 'Core Buildup', defaultFee: 295, membershipFee: 225, defaultCode: 'D2950', category: 'RESTORATIVE', description: 'Foundation for crown' },
  { kind: 'PULP_CAP', label: 'Pulp Cap – Direct', defaultFee: 95, membershipFee: 75, defaultCode: 'D3110', category: 'RESTORATIVE', description: 'Protects nerve' },
  // Other
  { kind: 'MEDICATION', label: 'Antibiotic Arrestin', defaultFee: 45, membershipFee: 35, defaultCode: 'D4381', category: 'PERIO', description: 'Localized antibiotic' },
  { kind: 'OCCLUSAL_ADJUSTMENT', label: 'Occlusal Adjustment', defaultFee: 150, membershipFee: 100, defaultCode: 'D9951', category: 'RESTORATIVE', description: 'Bite balancing' },
];

export const ADDON_COMPATIBILITY_RULES: { addOnKind: AddOnKind; allowedCategories: FeeCategory[] }[] = [
  { addOnKind: 'SEDATION', allowedCategories: ['IMPLANT', 'SURGICAL', 'PERIO', 'RESTORATIVE', 'ENDODONTIC', 'OTHER'] },
  { addOnKind: 'BONE_GRAFT', allowedCategories: ['IMPLANT', 'SURGICAL', 'PERIO', 'OTHER'] },
  { addOnKind: 'MEMBRANE', allowedCategories: ['IMPLANT', 'SURGICAL', 'PERIO', 'OTHER'] },
  { addOnKind: 'PRF', allowedCategories: ['IMPLANT', 'SURGICAL', 'PERIO', 'OTHER'] },
  { addOnKind: 'TEMP_CROWN', allowedCategories: ['RESTORATIVE', 'IMPLANT', 'PROSTHETIC'] },
  { addOnKind: 'CORE_BUILDUP', allowedCategories: ['RESTORATIVE', 'ENDODONTIC'] },
  { addOnKind: 'PULP_CAP', allowedCategories: ['RESTORATIVE'] },
  { addOnKind: 'MEDICATION', allowedCategories: ['PERIO', 'IMPLANT', 'ENDODONTIC', 'SURGICAL'] },
  { addOnKind: 'OCCLUSAL_ADJUSTMENT', allowedCategories: ['RESTORATIVE', 'IMPLANT', 'PROSTHETIC'] },
  { addOnKind: 'FOLLOWUP', allowedCategories: ['IMPLANT', 'SURGICAL', 'RESTORATIVE', 'PERIO', 'ORTHO'] },
];

export const checkAddOnCompatibility = (addOnKind: AddOnKind, procedureCategory: FeeCategory): boolean => {
    const rule = ADDON_COMPATIBILITY_RULES.find(r => r.addOnKind === addOnKind);
    if (!rule) return true; // Default allow if no strict rule
    return rule.allowedCategories.includes(procedureCategory);
};


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
    { id: 'f6',  procedureCode: 'D1110', procedureName: 'Adult Prophylaxis (Cleaning)',            category: 'PREVENTIVE', unitType: 'PER_PROCEDURE', baseFee: 110, membershipFee: 85, isActive: true },
    { id: 'f7',  procedureCode: 'D1120', procedureName: 'Child Prophylaxis',                       category: 'PREVENTIVE', unitType: 'PER_PROCEDURE', baseFee: 90,   isActive: true },
    { id: 'f8',  procedureCode: 'D1206', procedureName: 'Fluoride Varnish',                        category: 'PREVENTIVE', unitType: 'PER_PROCEDURE', baseFee: 45, membershipFee: 35, isActive: true },
    { id: 'f9',  procedureCode: 'D1351', procedureName: 'Sealant – Per Tooth',                     category: 'PREVENTIVE', unitType: 'PER_TOOTH',     baseFee: 60,   isActive: true },

    // --- RESTORATIVE: FILLINGS ---
    { id: 'f10', procedureCode: 'D2391', procedureName: 'Resin Composite – 1 Surface',             category: 'RESTORATIVE', unitType: 'PER_TOOTH',     baseFee: 180,  isActive: true },
    { id: 'f11', procedureCode: 'D2392', procedureName: 'Resin Composite – 2 Surfaces',            category: 'RESTORATIVE', unitType: 'PER_TOOTH',     baseFee: 220, membershipFee: 180, isActive: true },
    { id: 'f12', procedureCode: 'D2393', procedureName: 'Resin Composite – 3 Surfaces',            category: 'RESTORATIVE', unitType: 'PER_TOOTH',     baseFee: 260,  isActive: true },
    { id: 'f13', procedureCode: 'D2394', procedureName: 'Resin Composite – 4+ Surfaces',           category: 'RESTORATIVE', unitType: 'PER_TOOTH',     baseFee: 295,  isActive: true },

    // --- RESTORATIVE: CROWNS ---
    { id: 'f14', procedureCode: 'D2740', procedureName: 'Crown – Porcelain/Ceramic',               category: 'RESTORATIVE', unitType: 'PER_TOOTH',     baseFee: 1200, membershipFee: 950, isActive: true },
    { id: 'f15', procedureCode: 'D2752', procedureName: 'Crown – Porcelain Fused to Metal',        category: 'RESTORATIVE', unitType: 'PER_TOOTH',     baseFee: 1150, isActive: true },
    { id: 'f16', procedureCode: 'D2790', procedureName: 'Full Cast High-Noble Crown',              category: 'RESTORATIVE', unitType: 'PER_TOOTH',     baseFee: 1150, isActive: true },

    // --- ENDODONTIC (ROOT CANAL) ---
    { id: 'f17', procedureCode: 'D3310', procedureName: 'Root Canal Therapy – Anterior',           category: 'ENDODONTIC',  unitType: 'PER_TOOTH',     baseFee: 950,  isActive: true },
    { id: 'f18', procedureCode: 'D3320', procedureName: 'Root Canal Therapy – Premolar',           category: 'ENDODONTIC',  unitType: 'PER_TOOTH',     baseFee: 1050, isActive: true },
    { id: 'f19', procedureCode: 'D3330', procedureName: 'Root Canal Therapy – Molar',              category: 'ENDODONTIC',  unitType: 'PER_TOOTH',     baseFee: 1200, membershipFee: 1000, isActive: true },

    // --- IMPLANT ---
    { id: 'f20', procedureCode: 'D6010', procedureName: 'Surgical Placement of Implant Body',      category: 'IMPLANT',     unitType: 'PER_TOOTH',     baseFee: 2100, membershipFee: 1850, isActive: true },
    { id: 'f21', procedureCode: 'D6057', procedureName: 'Custom Implant Abutment',                category: 'IMPLANT',     unitType: 'PER_TOOTH',     baseFee: 650,  isActive: true },
    { id: 'f22', procedureCode: 'D6058', procedureName: 'Implant Crown – Porcelain/Ceramic',      category: 'IMPLANT',     unitType: 'PER_TOOTH',     baseFee: 1400, membershipFee: 1100, isActive: true },

    // --- PERIO (SCALING / MAINTENANCE) ---
    { id: 'f23', procedureCode: 'D4341', procedureName: 'Scaling & Root Planing – 4+ Teeth',       category: 'PERIO',       unitType: 'PER_QUADRANT',  baseFee: 250,  isActive: true },
    { id: 'f24', procedureCode: 'D4342', procedureName: 'Scaling & Root Planing – 1–3 Teeth',      category: 'PERIO',       unitType: 'PER_QUADRANT',  baseFee: 210,  isActive: true },
    { id: 'f25', procedureCode: 'D4910', procedureName: 'Periodontal Maintenance',                 category: 'PERIO',       unitType: 'PER_PROCEDURE', baseFee: 150, membershipFee: 120, isActive: true },

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
    { id: 'f36', procedureCode: 'D9944', procedureName: 'Occlusal Guard (Nightguard) – Upper',     category: 'OTHER',       unitType: 'PER_ARCH',      baseFee: 650, membershipFee: 500, isActive: true },
    { id: 'f37', procedureCode: 'D9945', procedureName: 'Occlusal Guard (Nightguard) – Lower',     category: 'OTHER',       unitType: 'PER_ARCH',      baseFee: 650, membershipFee: 500, isActive: true },

    // --- SURGICAL / EXTRACTION ---
    { id: 'f38', procedureCode: 'D7140', procedureName: 'Simple Extraction – Erupted Tooth',        category: 'OTHER',       unitType: 'PER_TOOTH',     baseFee: 200,  isActive: true },
    { id: 'f39', procedureCode: 'D7210', procedureName: 'Surgical Extraction – Erupted Tooth',      category: 'OTHER',       unitType: 'PER_TOOTH',     baseFee: 320,  isActive: true }
];

// --- PRICING LOGIC ---

export const getEffectiveBaseFee = (
  feeEntry: FeeScheduleEntry,
  feeScheduleType: FeeScheduleType
): number => {
  if (feeScheduleType === 'membership') {
    return feeEntry.membershipFee ?? feeEntry.baseFee;
  }
  return feeEntry.baseFee;
};

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

// --- PHASES ---

/**
 * [REFACTORED] Centralized helper to determine the stable, internal phase bucket key for a given fee category.
 */
function getBucketKeyForCategory(category?: FeeCategory): PhaseBucketKey {
    if (!category) return "OTHER";
    switch (category) {
        case 'DIAGNOSTIC':
        case 'PERIO':
        case 'PREVENTIVE':
            return "FOUNDATION";
        case 'RESTORATIVE':
        case 'ENDODONTIC':
        case 'PROSTHETIC':
            return "RESTORATIVE";
        case 'IMPLANT':
        case 'SURGICAL':
            return "IMPLANT";
        case 'COSMETIC':
        case 'ORTHO':
            return "ELECTIVE";
        case 'OTHER':
            return "OTHER";
        default:
            return "OTHER";
    }
}

const phaseConfig: { bucketKey: PhaseBucketKey, title: string, description: string, categories: FeeCategory[] }[] = [
  { bucketKey: "FOUNDATION",  title: "Foundation & Diagnostics", description: "Control infection and stabilize gums.", categories: ['DIAGNOSTIC', 'PERIO', 'PREVENTIVE'] },
  { bucketKey: "RESTORATIVE", title: "Restorative",                description: "Repair damaged teeth and restore function.", categories: ['RESTORATIVE', 'ENDODONTIC', 'PROSTHETIC'] },
  { bucketKey: "IMPLANT",     title: "Implant & Surgical",         description: "Placement and restoration of dental implants.", categories: ['IMPLANT', 'SURGICAL'] },
  { bucketKey: "ELECTIVE",    title: "Elective / Cosmetic",        description: "Enhancements for your smile.", categories: ['COSMETIC', 'ORTHO'] },
  { bucketKey: "OTHER",       title: "Additional Treatment",       description: "Other recommended procedures.", categories: ['OTHER'] },
];

/**
 * Creates default, clinically-grouped phases for a plan based on its items.
 * This is a private helper meant to be called during plan loading for backward compatibility.
 */
const createDefaultPhasesForPlan = (plan: TreatmentPlan, items: TreatmentPlanItem[]): { planWithPhases: TreatmentPlan, itemsWithPhaseId: TreatmentPlanItem[] } => {
    const newPhases: TreatmentPhase[] = [];
    const itemsCopy = JSON.parse(JSON.stringify(items)); // Deep copy for mutation
    
    let sortOrder = 0;
    phaseConfig.forEach(config => {
        const itemsForPhase = itemsCopy.filter((item: TreatmentPlanItem) => config.categories.includes(item.category) && !item.phaseId);

        if (itemsForPhase.length > 0) {
            const phaseId = generateId();
            const newPhase: TreatmentPhase = {
                id: phaseId,
                planId: plan.id,
                bucketKey: config.bucketKey,
                title: config.title,
                description: config.description,
                sortOrder: sortOrder++,
                itemIds: itemsForPhase.map((i: TreatmentPlanItem) => i.id),
            };
            newPhases.push(newPhase);

            itemsForPhase.forEach((item: TreatmentPlanItem) => {
                item.phaseId = phaseId;
            });
        }
    });

    // Handle any unassigned items by adding them to the 'OTHER' phase
    const unassignedItems = itemsCopy.filter((item: TreatmentPlanItem) => !item.phaseId);
    if (unassignedItems.length > 0) {
        let fallbackPhase = newPhases.find(p => p.bucketKey === 'OTHER');
        
        if (!fallbackPhase) {
            const otherConfig = phaseConfig.find(c => c.bucketKey === 'OTHER')!;
            const phaseId = generateId();
            fallbackPhase = {
                id: phaseId,
                planId: plan.id,
                bucketKey: 'OTHER',
                title: otherConfig.title,
                description: otherConfig.description,
                sortOrder: sortOrder++,
                itemIds: [],
            };
            newPhases.push(fallbackPhase);
        }
        
        unassignedItems.forEach((item: TreatmentPlanItem) => {
            item.phaseId = fallbackPhase!.id;
            fallbackPhase!.itemIds.push(item.id);
        });
    }

    const planWithPhases = { ...plan, phases: newPhases };
    return { planWithPhases, itemsWithPhaseId: itemsCopy };
};


// --- PLAN CRUD ---

export const getAllTreatmentPlans = (): TreatmentPlan[] => {
  const plans: TreatmentPlan[] = JSON.parse(localStorage.getItem(KEY_PLANS) || '[]');
  
  return plans.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
};

export const getTreatmentPlanById = (id: string): TreatmentPlan | undefined => {
  const plans: TreatmentPlan[] = JSON.parse(localStorage.getItem(KEY_PLANS) || '[]');
  const plan = plans.find(p => p.id === id);
  if (!plan) return undefined;

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
  // Backward compatibility for fee schedule type
  if (!plan.feeScheduleType) {
    plan.feeScheduleType = 'standard';
  }

  return {
    ...plan,
    items: planItems
  };
};

/**
 * A central loader to fetch a plan and its items together.
 * This is the single source of truth for the detail page.
 * It now handles backward compatibility for phases.
 */
export function loadTreatmentPlanWithItems(
  planId: string
): { plan: TreatmentPlan; items: TreatmentPlanItem[] } | null {
  const allItems: TreatmentPlanItem[] = JSON.parse(localStorage.getItem(KEY_ITEMS) || '[]');
  const allPlans: TreatmentPlan[]     = JSON.parse(localStorage.getItem(KEY_PLANS) || '[]');

  let planFromStorage = allPlans.find(p => p.id === planId);
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
  
  // --- BACKWARD COMPATIBILITY & DURATION DEFAULTS ---
  let itemsNeedSave = false;
  const processedItems = itemsForPlan.map(originalItem => {
    const item = { ...originalItem };

    // Default itemType if missing (Migration)
    if (!item.itemType) {
        // Legacy sedation items
        if (item.category === 'OTHER' && (item.procedureName?.includes('Sedation') || item.procedureCode?.startsWith('D92'))) {
           item.itemType = 'ADDON';
           item.addOnKind = 'SEDATION';
           // If we can infer link, great, otherwise keep generic
           item.linkedItemIds = item.linkedItemIds || [];
        } else {
           item.itemType = 'PROCEDURE';
           item.linkedItemIds = [];
        }
        itemsNeedSave = true;
    }
    
    // Ensure AddOnKind exists if itemType is ADDON
    if (item.itemType === 'ADDON' && !item.addOnKind) {
        // Fallback for migrated sedation
        if (item.sedationType || item.procedureName.includes('Sedation')) {
            item.addOnKind = 'SEDATION';
        } else {
            item.addOnKind = 'OTHER';
        }
        itemsNeedSave = true;
    }

    // Step 1: Migrate old format (estimatedDurationWeeks)
    const legacyItem = item as any;
    if (legacyItem.estimatedDurationWeeks != null && item.estimatedDurationValue == null) {
      itemsNeedSave = true;
      item.estimatedDurationValue = legacyItem.estimatedDurationWeeks;
      item.estimatedDurationUnit = 'weeks';
      delete (item as any).estimatedDurationWeeks;
    }
    
    // Step 2: Back-fill defaults for any items that still lack a duration.
    if (item.estimatedDurationValue == null) {
      itemsNeedSave = true;
      const { value, unit } = estimateDuration(item);
      item.estimatedDurationValue = value;
      item.estimatedDurationUnit = unit;
    }
    return item;
  });

  if (itemsNeedSave) {
    const allItemsFromStorage: TreatmentPlanItem[] = JSON.parse(localStorage.getItem(KEY_ITEMS) || '[]');
    const processedItemMap = new Map(processedItems.map(i => [i.id, i]));
    const allItemsUpdated = allItemsFromStorage.map(item => processedItemMap.get(item.id) || item);
    localStorage.setItem(KEY_ITEMS, JSON.stringify(allItemsUpdated));
    itemsForPlan = processedItems; // Use the updated items for the current session
  }


  // --- BACKWARD COMPATIBILITY & PHASE GENERATION ---
  if (planFromStorage.phases && planFromStorage.phases.length > 0) {
    // Plan has phases, but they might be missing bucketKey
    let needsSave = false;
    planFromStorage.phases.forEach(phase => {
        if (!phase.bucketKey) {
            needsSave = true;
            const title = phase.title.toLowerCase();
            if (title.includes('foundation') || title.includes('diagnostic')) {
                phase.bucketKey = 'FOUNDATION';
            } else if (title.includes('restorative')) {
                phase.bucketKey = 'RESTORATIVE';
            } else if (title.includes('implant') || title.includes('surgical')) {
                phase.bucketKey = 'IMPLANT';
            } else if (title.includes('elective') || title.includes('cosmetic')) {
                phase.bucketKey = 'ELECTIVE';
            } else {
                phase.bucketKey = 'OTHER';
                if (phase.title === 'Other Procedures') {
                    phase.title = 'Additional Treatment';
                }
            }
        }
    });
    if (needsSave) {
        savePlan(planFromStorage);
    }
  } else {
    // Plan has no phases, create them from scratch.
    const { planWithPhases, itemsWithPhaseId } = createDefaultPhasesForPlan(planFromStorage, itemsForPlan);
    const allItemsWithUpdates = allItems.map(item => itemsWithPhaseId.find(i => i.id === item.id) || item);
    localStorage.setItem(KEY_ITEMS, JSON.stringify(allItemsWithUpdates));
    savePlan(planWithPhases);
    planFromStorage = planWithPhases;
    itemsForPlan = itemsWithPhaseId;
  }
  
  planFromStorage = aggregatePhaseDurations(planFromStorage, itemsForPlan);

  if (!planFromStorage.insuranceMode) {
    planFromStorage.insuranceMode = hasDetailedInsurance(itemsForPlan) ? 'advanced' : 'simple';
  }
  if (!planFromStorage.feeScheduleType) {
    planFromStorage.feeScheduleType = 'standard';
  }

  return { plan: planFromStorage, items: itemsForPlan };
}

const savePlan = (plan: TreatmentPlan) => {
  const plans: TreatmentPlan[] = JSON.parse(localStorage.getItem(KEY_PLANS) || '[]');
  const idx = plans.findIndex(p => p.id === plan.id);
  
  const { items, ...storagePlan } = plan;
  
  if (idx >= 0) {
    plans[idx] = storagePlan as TreatmentPlan;
  } else {
    plans.push(storagePlan as TreatmentPlan);
  }
  localStorage.setItem(KEY_PLANS, JSON.stringify(plans));
};

export const createTreatmentPlan = (data: { title?: string }): TreatmentPlan => {
  const newPlan: TreatmentPlan = {
    id: generateId(),
    caseAlias: `Patient-${Math.floor(1000 + Math.random() * 9000)}`,
    title: data.title || '',
    planNumber: `TP-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
    status: 'DRAFT',
    insuranceMode: 'simple',
    feeScheduleType: 'standard',
    totalFee: 0,
    estimatedInsurance: 0,
    clinicDiscount: 0,
    membershipSavings: 0,
    patientPortion: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    itemIds: [],
    phases: [],
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
  
  plan = aggregatePhaseDurations(plan, items);

  const totalFee = items.reduce((sum, item) => sum + item.netFee, 0);
  let estimatedInsurance = 0;

  // Calculate Membership Savings for display
  let membershipSavings = 0;
  if (plan.feeScheduleType === 'membership') {
    const feeSchedule = getFeeSchedule();
    const feeMap = new Map(feeSchedule.map(f => [f.id, f]));
    
    const standardTotalFee = items.reduce((total, item) => {
      // If it's an add-on item with custom fee (or definition), try to look up standard fee
      if (item.itemType === 'ADDON') {
          const addOnDef = ADD_ON_LIBRARY.find(d => d.kind === item.addOnKind && d.label === item.procedureName.replace(`${d.kind === 'SEDATION' ? 'Sedation – ' : ''}`, ''));
          // For generic matches or renamed items, we might fall back to looking at addOnKind + known price lists
          // For now, simpler check:
          const sedDef = SEDATION_TYPES.find(d => d.label === item.sedationType); 
          if (sedDef) return total + sedDef.defaultFee;
          
          if (addOnDef) return total + addOnDef.defaultFee;
          
          return total + item.netFee;
      }

      const feeEntry = feeMap.get(item.feeScheduleEntryId);
      if (!feeEntry) return total + item.netFee; // Fallback
      const standardItemPrice = feeEntry.baseFee * item.units;
      return total + standardItemPrice;
    }, 0);
    
    membershipSavings = Math.max(0, standardTotalFee - totalFee);
  }

  if (plan.insuranceMode === 'advanced') {
    estimatedInsurance = items.reduce(
      (sum, i) => sum + (i.estimatedInsurance ?? 0),
      0
    );
  } else { // 'simple' or undefined
    estimatedInsurance = plan.estimatedInsurance ?? 0;
  }

  const clinicDiscount = plan.clinicDiscount || 0;
  const patientPortion = totalFee - estimatedInsurance - clinicDiscount;

  const updatedPlanData: TreatmentPlan = {
    ...plan,
    totalFee,
    estimatedInsurance,
    clinicDiscount,
    membershipSavings,
    patientPortion: Math.max(0, patientPortion),
    updatedAt: new Date().toISOString(),
  };

  savePlan(updatedPlanData);
  
  return getTreatmentPlanById(planId);
};


/**
 * Reprices all items on a plan based on its `feeScheduleType` and then recalculates totals.
 * This is called when the fee schedule type is changed.
 */
export const repriceAllItemsForPlan = (planId: string): TreatmentPlan | undefined => {
  const planResult = loadTreatmentPlanWithItems(planId);
  if (!planResult) return undefined;
  
  const { plan } = planResult;
  const allItems: TreatmentPlanItem[] = JSON.parse(localStorage.getItem(KEY_ITEMS) || '[]');
  const feeSchedule = getFeeSchedule();
  
  const updatedItems = allItems.map(item => {
    if (item.treatmentPlanId === planId) {
      if (item.itemType === 'ADDON') {
          // Try to find definition
          let def = ADD_ON_LIBRARY.find(d => d.kind === item.addOnKind && d.label === item.procedureName.replace('Sedation – ', ''));
          if (!def && item.sedationType) {
             const sedDef = SEDATION_TYPES.find(s => s.label === item.sedationType);
             if (sedDef) def = { ...sedDef, kind: 'SEDATION', category: 'OTHER', defaultCode: 'D92XX', label: sedDef.label };
          }

          if (def) {
             const newBaseFee = plan.feeScheduleType === 'membership' ? (def.membershipFee ?? def.defaultFee) : def.defaultFee;
             const grossFee = newBaseFee * item.units;
             const netFee = Math.max(0, grossFee - (item.discount || 0));
             return { ...item, baseFee: newBaseFee, grossFee, netFee };
          }
          return item; 
      }

      const feeEntry = feeSchedule.find(f => f.id === item.feeScheduleEntryId);
      if (feeEntry) {
        const newBaseFee = getEffectiveBaseFee(feeEntry, plan.feeScheduleType);
        const repricedItemPart = computeItemPricing({ ...item, baseFee: newBaseFee }, feeEntry);
        
        // When repricing, if we are in advanced mode, we might want to re-evaluate insurance.
        // For simplicity, we'll keep existing % if present, otherwise clear.
        let insuranceUpdates: Partial<TreatmentPlanItem> = {};
        if (plan.insuranceMode === 'advanced' && item.coveragePercent != null) {
            const newIns = (repricedItemPart.netFee ?? item.netFee) * (item.coveragePercent / 100);
            insuranceUpdates.estimatedInsurance = newIns;
            insuranceUpdates.estimatedPatientPortion = (repricedItemPart.netFee ?? item.netFee) - newIns;
        }

        return { ...item, ...repricedItemPart, ...insuranceUpdates };
      }
    }
    return item;
  });

  localStorage.setItem(KEY_ITEMS, JSON.stringify(updatedItems));
  return recalculatePlanTotalsAndSave(planId);
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
  const feeScheduleTypeChanged = updates.feeScheduleType && updates.feeScheduleType !== existingPlan.feeScheduleType;
  
  const { items, ...storageUpdates } = updates;

  const mergedPlan = {
    ...existingPlan,
    ...storageUpdates,
    updatedAt: new Date().toISOString(),
  };

  allPlans[planIndex] = mergedPlan;
  localStorage.setItem(KEY_PLANS, JSON.stringify(allPlans));

  if (feeScheduleTypeChanged) {
    return repriceAllItemsForPlan(id);
  } else {
    return recalculatePlanTotalsAndSave(id);
  }
};

/**
 * Saves a plan and all its associated items. This is a more holistic save operation
 * useful for modals like the board view that manage the whole state locally.
 */
export const savePlanAndItems = (planToSave: TreatmentPlan, itemsForPlan: TreatmentPlanItem[]): { plan: TreatmentPlan, items: TreatmentPlanItem[] } => {
  // Step 1: Persist the updated items.
  const allItemsFromStorage: TreatmentPlanItem[] = JSON.parse(localStorage.getItem(KEY_ITEMS) || '[]');
  const otherPlanItems = allItemsFromStorage.filter(i => i.treatmentPlanId !== planToSave.id);
  const updatedAllItems = [...otherPlanItems, ...itemsForPlan];
  localStorage.setItem(KEY_ITEMS, JSON.stringify(updatedAllItems));

  // Step 2: Recalculate totals directly on the provided plan object.
  let planWithUpdatedTotals = { ...planToSave };
  
  planWithUpdatedTotals = aggregatePhaseDurations(planWithUpdatedTotals, itemsForPlan);

  const totalFee = itemsForPlan.reduce((sum, item) => sum + item.netFee, 0);
  let estimatedInsurance = 0;

  let membershipSavings = 0;
  if (planWithUpdatedTotals.feeScheduleType === 'membership') {
    const feeSchedule = getFeeSchedule();
    const feeMap = new Map(feeSchedule.map(f => [f.id, f]));
    const standardTotalFee = itemsForPlan.reduce((total, item) => {
      if (item.itemType === 'ADDON') {
          // simplified lookup logic for save aggregation
          const sedDef = SEDATION_TYPES.find(d => d.label === item.sedationType);
          if (sedDef) return total + sedDef.defaultFee;
          
          const def = ADD_ON_LIBRARY.find(d => d.kind === item.addOnKind && d.label === item.procedureName);
          if (def) return total + def.defaultFee;
          
          return total + item.netFee;
      }
      
      const feeEntry = feeMap.get(item.feeScheduleEntryId);
      if (!feeEntry) return total + item.netFee;
      const standardItemPrice = feeEntry.baseFee * item.units;
      return total + standardItemPrice;
    }, 0);
    membershipSavings = Math.max(0, standardTotalFee - totalFee);
  }

  if (planWithUpdatedTotals.insuranceMode === 'advanced') {
    estimatedInsurance = itemsForPlan.reduce(
      (sum, i) => sum + (i.estimatedInsurance ?? 0),
      0
    );
  } else {
    estimatedInsurance = planWithUpdatedTotals.estimatedInsurance ?? 0;
  }

  const clinicDiscount = planWithUpdatedTotals.clinicDiscount || 0;
  const patientPortion = totalFee - estimatedInsurance - clinicDiscount;

  const finalPlanToSave: TreatmentPlan = {
    ...planWithUpdatedTotals,
    itemIds: itemsForPlan.map(i => i.id), // Ensure itemIds are in sync
    totalFee,
    estimatedInsurance,
    clinicDiscount,
    membershipSavings,
    patientPortion: Math.max(0, patientPortion),
    updatedAt: new Date().toISOString(),
  };

  // Step 3: Save the final, recalculated plan object to storage.
  savePlan(finalPlanToSave);

  // Step 4: Return the updated state, including the hydrated items on the plan object.
  return { plan: { ...finalPlanToSave, items: itemsForPlan }, items: itemsForPlan };
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
  const planResult = loadTreatmentPlanWithItems(planId);
  if (!planResult) throw new Error("Plan not found when creating item");
  let { plan, items } = planResult;
  
  const fees = getFeeSchedule();
  const feeEntry = fees.find(f => f.id === data.feeScheduleEntryId);
  if (!feeEntry) throw new Error("Fee entry not found");

  const effectiveBaseFee = getEffectiveBaseFee(feeEntry, plan.feeScheduleType);
  
  const { value, unit } = estimateDuration({ category: feeEntry.category, procedureName: feeEntry.procedureName } as TreatmentPlanItem);

  const rawItem: Partial<TreatmentPlanItem> = {
    id: generateId(),
    treatmentPlanId: planId,
    feeScheduleEntryId: feeEntry.id,
    procedureCode: data.procedureCode || feeEntry.procedureCode,
    procedureName: data.procedureName || feeEntry.procedureName,
    unitType: feeEntry.unitType,
    category: feeEntry.category,
    baseFee: data.baseFeeOverride ?? effectiveBaseFee,
    urgency: 'ELECTIVE',
    sortOrder: (items.length > 0 ? Math.max(...items.map(i => i.sortOrder)) : 0) + 1,
    phaseId: null,
    estimatedDurationValue: value,
    estimatedDurationUnit: unit,
    itemType: 'PROCEDURE', // Default
    linkedItemIds: [],
  };

  const computedItem = computeItemPricing(rawItem, feeEntry) as TreatmentPlanItem;
  
  const bucketKey = getBucketKeyForCategory(computedItem.category);
  let targetPhase = plan.phases?.find(p => p.bucketKey === bucketKey) || plan.phases?.[0] || null;

  if (targetPhase) {
    computedItem.phaseId = targetPhase.id;
    const phaseInPlan = plan.phases?.find(p => p.id === targetPhase!.id);
    if(phaseInPlan) {
        phaseInPlan.itemIds.push(computedItem.id);
    }
  }
  
  const allItems: TreatmentPlanItem[] = JSON.parse(localStorage.getItem(KEY_ITEMS) || '[]');
  allItems.push(computedItem);
  localStorage.setItem(KEY_ITEMS, JSON.stringify(allItems));

  plan.itemIds.push(computedItem.id);
  savePlan(plan);
  recalculatePlanTotalsAndSave(planId);

  return computedItem;
};

// NEW: Explicit Add-On Creation (Replacing specific sedation creator)
export const createAddOnItem = (
  planId: string,
  data: {
      addOnKind: AddOnKind;
      label?: string; // override name
      appliesToItemIds: string[];
      fee: number;
      phaseId: string;
      code?: string; // D-code
      category?: FeeCategory;
  }
): TreatmentPlanItem => {
  const planResult = loadTreatmentPlanWithItems(planId);
  if (!planResult) throw new Error("Plan not found");
  const { plan, items } = planResult;

  let appliedFee = data.fee;
  
  // Verify fee against schedule/library if appropriate
  if (plan.feeScheduleType === 'membership') {
      const def = ADD_ON_LIBRARY.find(d => d.kind === data.addOnKind && d.label === data.label);
      if (def && def.defaultFee === data.fee && def.membershipFee) {
          appliedFee = def.membershipFee;
      }
  }

  const newItem: TreatmentPlanItem = {
      id: generateId(),
      treatmentPlanId: planId,
      feeScheduleEntryId: 'addon-custom',
      procedureCode: data.code || 'DXXXX',
      procedureName: data.label || (data.addOnKind === 'SEDATION' ? `Sedation` : 'Add-On'),
      unitType: 'PER_PROCEDURE',
      category: data.category || 'OTHER',
      itemType: 'ADDON',
      linkedItemIds: data.appliesToItemIds,
      addOnKind: data.addOnKind,
      sedationType: data.addOnKind === 'SEDATION' ? data.label : undefined, // Backward compat
      phaseId: data.phaseId,
      sortOrder: (items.length > 0 ? Math.max(...items.map(i => i.sortOrder)) : 0) + 1,
      estimatedDurationValue: 0,
      estimatedDurationUnit: 'days',
      baseFee: appliedFee,
      units: 1,
      grossFee: appliedFee,
      discount: 0,
      netFee: appliedFee,
  };
  
  // Attach to phase
  const phaseInPlan = plan.phases?.find(p => p.id === data.phaseId);
  if (phaseInPlan) {
      phaseInPlan.itemIds.push(newItem.id);
  }

  const allItems: TreatmentPlanItem[] = JSON.parse(localStorage.getItem(KEY_ITEMS) || '[]');
  allItems.push(newItem);
  localStorage.setItem(KEY_ITEMS, JSON.stringify(allItems));

  plan.itemIds.push(newItem.id);
  savePlan(plan);
  recalculatePlanTotalsAndSave(planId);
  
  return newItem;
};

// Backward compat wrapper
export const createSedationItem = (planId: string, data: { sedationType: string, appliesToItemIds: string[], fee: number, phaseId: string }): TreatmentPlanItem => {
    return createAddOnItem(planId, {
        addOnKind: 'SEDATION',
        label: data.sedationType,
        appliesToItemIds: data.appliesToItemIds,
        fee: data.fee,
        phaseId: data.phaseId,
        category: 'OTHER',
        code: 'D92XX'
    });
};

export const updateTreatmentPlanItem = (id: string, updates: Partial<TreatmentPlanItem>): { plan: TreatmentPlan, items: TreatmentPlanItem[] } | undefined => {
  const allItems: TreatmentPlanItem[] = JSON.parse(localStorage.getItem(KEY_ITEMS) || '[]');
  const idx = allItems.findIndex(i => i.id === id);
  if (idx === -1) return undefined;

  const currentItem = allItems[idx];

  const plan = getTreatmentPlanById(currentItem.treatmentPlanId);
  if (!plan) {
    console.error(`Plan not found for item ${id}`);
    return undefined;
  }
  
  let finalItemState = { ...currentItem, ...updates };

  // Re-pricing logic only for procedures, unless add-on fee is manually updated
  if (currentItem.itemType !== 'ADDON' && updates.baseFee === undefined) {
     const feeSchedule = getFeeSchedule();
     const feeEntry = feeSchedule.find(f => f.id === currentItem.feeScheduleEntryId);
     if (feeEntry) {
         finalItemState.baseFee = getEffectiveBaseFee(feeEntry, plan.feeScheduleType);
         const repricedPart = computeItemPricing(finalItemState, feeEntry);
         finalItemState = { ...finalItemState, ...repricedPart };
     }
  } else if (currentItem.itemType !== 'ADDON' && updates.baseFee !== undefined) {
       // Manual fee override on procedure
       const feeSchedule = getFeeSchedule();
       const feeEntry = feeSchedule.find(f => f.id === currentItem.feeScheduleEntryId);
       const repricedPart = computeItemPricing(finalItemState, feeEntry);
       finalItemState = { ...finalItemState, ...repricedPart };
  } else if (currentItem.itemType === 'ADDON') {
      // Logic for add-on updates (e.g. changing type)
      if (updates.sedationType && currentItem.addOnKind === 'SEDATION') {
         const def = SEDATION_TYPES.find(d => d.label === updates.sedationType);
         if (def && updates.baseFee === undefined) {
             const newBaseFee = plan.feeScheduleType === 'membership' ? (def.membershipFee ?? def.defaultFee) : def.defaultFee;
             finalItemState.baseFee = newBaseFee;
             finalItemState.procedureName = `Sedation – ${def.label}`;
         }
      }

      if (finalItemState.baseFee !== undefined) {
          finalItemState.grossFee = finalItemState.baseFee * finalItemState.units;
          finalItemState.netFee = Math.max(0, finalItemState.grossFee - (finalItemState.discount || 0));
      }
  }

  allItems[idx] = finalItemState as TreatmentPlanItem;
  
  localStorage.setItem(KEY_ITEMS, JSON.stringify(allItems));

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
  let itemsToPersist = allItems.filter(i => i.id !== itemIdToDelete);
  let idsToRemove = [itemIdToDelete];

  // CASCADE DELETE LOGIC FOR ADD-ONS
  if (itemToDelete.itemType !== 'ADDON') {
      const linkedAddOnItems = allItems.filter(i => 
          i.itemType === 'ADDON' && i.linkedItemIds?.includes(itemIdToDelete)
      );

      linkedAddOnItems.forEach(addon => {
          if (addon.linkedItemIds && addon.linkedItemIds.length === 1) {
              // This add-on only applies to the item being deleted. Delete add-on too.
              itemsToPersist = itemsToPersist.filter(i => i.id !== addon.id);
              idsToRemove.push(addon.id);
          } else if (addon.linkedItemIds && addon.linkedItemIds.length > 1) {
              // This add-on applies to others too. Just unlink this one.
              const updatedAddOn = { 
                  ...addon, 
                  linkedItemIds: addon.linkedItemIds.filter(id => id !== itemIdToDelete) 
              };
              // Update in our working list
              itemsToPersist = itemsToPersist.map(i => i.id === addon.id ? updatedAddOn : i);
          }
      });
  }

  localStorage.setItem(KEY_ITEMS, JSON.stringify(itemsToPersist));

  let allPlans: TreatmentPlan[] = JSON.parse(localStorage.getItem(KEY_PLANS) || '[]');
  const planIndex = allPlans.findIndex(p => p.id === planId);
  
  if (planIndex !== -1) {
    const originalPlan = allPlans[planIndex];
    
    // Remove all deleted IDs from plan.itemIds
    const newItemIds = originalPlan.itemIds.filter(id => !idsToRemove.includes(id));
    
    // Remove all deleted IDs from phases
    const newPhases = originalPlan.phases?.map(p => ({
        ...p,
        itemIds: p.itemIds.filter(id => !idsToRemove.includes(id))
    }));

    allPlans[planIndex] = {
      ...originalPlan,
      itemIds: newItemIds,
      phases: newPhases,
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

// --- PHASE MANAGEMENT ---

const convertToDays = (value: number | null | undefined, unit: 'days' | 'weeks' | 'months' | null | undefined): number => {
    if (!value || !unit) return 0;
    switch(unit) {
        case 'days': return value;
        case 'weeks': return value * 7;
        case 'months': return value * 30.44; // More accurate average
    }
    return 0;
}

const aggregatePhaseDurations = (plan: TreatmentPlan, items: TreatmentPlanItem[]): TreatmentPlan => {
    if (!plan.phases) return plan;

    const itemMap = new Map(items.map(i => [i.id, i]));
    const updatedPhases = plan.phases.map(phase => {
        // If it's a monitor phase, its duration is managed manually and should not be aggregated.
        if (phase.isMonitorPhase) {
            return phase;
        }

        const phaseItems = phase.itemIds.map(id => itemMap.get(id)).filter(Boolean) as TreatmentPlanItem[];
        if (phaseItems.length === 0) {
            return { ...phase, estimatedDurationValue: null, estimatedDurationUnit: null };
        }

        let totalDays = 0;
        let hasMonths = false;
        let hasWeeks = false;

        for (const item of phaseItems) {
            totalDays += convertToDays(item.estimatedDurationValue, item.estimatedDurationUnit);
            if (item.estimatedDurationUnit === 'months') hasMonths = true;
            if (item.estimatedDurationUnit === 'weeks') hasWeeks = true;
        }

        if (totalDays <= 0) {
            return { ...phase, estimatedDurationValue: null, estimatedDurationUnit: null };
        }

        let finalValue: number;
        let finalUnit: 'days' | 'weeks' | 'months';

        if (hasMonths) {
            finalValue = Math.round(totalDays / 30.44);
            finalUnit = 'months';
        } else if (hasWeeks) {
            finalValue = Math.round(totalDays / 7);
            finalUnit = 'weeks';
        } else {
            finalValue = Math.round(totalDays);
            finalUnit = 'days';
        }

        // Ensure the value is at least 1 if there's any duration
        if (finalValue < 1 && totalDays > 0) {
            finalValue = 1;
        }

        return { ...phase, estimatedDurationValue: finalValue, estimatedDurationUnit: finalUnit };
    });

    return { ...plan, phases: updatedPhases };
}


export const updatePhase = (planId: string, phaseId: string, updates: Partial<TreatmentPhase>): { plan: TreatmentPlan, items: TreatmentPlanItem[] } | null => {
    const result = loadTreatmentPlanWithItems(planId);
    if (!result) return null;

    let { plan, items } = result;
    if (!plan.phases) return result;

    plan.phases = plan.phases.map(p => p.id === phaseId ? { ...p, ...updates } : p);
    savePlan(plan);
    return { plan, items };
};

export const reorderItemsInPhase = (planId: string, phaseId: string, orderedItemIds: string[]): { plan: TreatmentPlan, items: TreatmentPlanItem[] } | null => {
    const result = loadTreatmentPlanWithItems(planId);
    if (!result || !result.plan.phases) return null;

    let { plan } = result;

    const phaseIndex = plan.phases.findIndex(p => p.id === phaseId);
    if (phaseIndex === -1) {
        console.error(`reorderItemsInPhase: Phase with ID ${phaseId} not found in plan ${planId}`);
        return result;
    }

    plan.phases[phaseIndex].itemIds = orderedItemIds;

    savePlan(plan);
    return loadTreatmentPlanWithItems(planId);
};

export const reorderPhases = (planId: string, orderedPhaseIds: string[]): { plan: TreatmentPlan, items: TreatmentPlanItem[] } | null => {
    const result = loadTreatmentPlanWithItems(planId);
    if (!result) return null;
    
    let { plan, items } = result;
    if (!plan.phases) return result;

    const phaseMap = new Map(plan.phases.map(p => [p.id, p]));
    plan.phases = orderedPhaseIds.map((id, index) => {
        const phase = phaseMap.get(id)!;
        phase.sortOrder = index;
        return phase;
    });

    savePlan(plan);
    return { plan, items };
};

export const assignItemToPhase = (planId: string, itemId: string, newPhaseId: string): { plan: TreatmentPlan, items: TreatmentPlanItem[] } | null => {
    const result = loadTreatmentPlanWithItems(planId);
    if (!result) return null;
    
    let { plan, items } = result;
    if (!plan.phases) return result;
    
    const allItems: TreatmentPlanItem[] = JSON.parse(localStorage.getItem(KEY_ITEMS) || '[]');
    const itemIndex = allItems.findIndex(i => i.id === itemId);
    if (itemIndex === -1) return result;

    const itemToMove = allItems[itemIndex];
    const oldPhaseId = itemToMove.phaseId;

    itemToMove.phaseId = newPhaseId;
    
    if (oldPhaseId) {
        const oldPhase = plan.phases.find(p => p.id === oldPhaseId);
        if (oldPhase) {
            oldPhase.itemIds = oldPhase.itemIds.filter(id => id !== itemId);
        }
    }
    const newPhase = plan.phases.find(p => p.id === newPhaseId);
    if (newPhase && !newPhase.itemIds.includes(itemId)) {
        newPhase.itemIds.push(itemId);
    }

    localStorage.setItem(KEY_ITEMS, JSON.stringify(allItems));
    savePlan(plan);

    return loadTreatmentPlanWithItems(planId);
};

/**
 * [NEW] Regenerates phases from scratch for a plan based on its current items.
 */
export const regroupPhasesForPlan = (planId: string): { plan: TreatmentPlan, items: TreatmentPlanItem[] } | null => {
    const initialResult = loadTreatmentPlanWithItems(planId);
    if (!initialResult) return null;
    
    const itemsToRegroup = initialResult.items.map(i => ({ ...i, phaseId: null as string | null }));
    const planToRegroup = { ...initialResult.plan, phases: [] };

    const { planWithPhases, itemsWithPhaseId } = createDefaultPhasesForPlan(planToRegroup, itemsToRegroup);

    const allItems: TreatmentPlanItem[] = JSON.parse(localStorage.getItem(KEY_ITEMS) || '[]');
    const planItemMap = new Map(itemsWithPhaseId.map(i => [i.id, i]));
    
    const mergedItems = allItems.map(item => {
        if (planItemMap.has(item.id)) {
            return planItemMap.get(item.id)!;
        }
        return item;
    });

    localStorage.setItem(KEY_ITEMS, JSON.stringify(mergedItems));
    savePlan(planWithPhases);

    return loadTreatmentPlanWithItems(planId);
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