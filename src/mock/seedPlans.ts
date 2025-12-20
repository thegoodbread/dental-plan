
// FIX: Replaced FeeUnitType with exported ProcedureUnitType
import { TreatmentPlan, TreatmentPlanItem, ShareLink, ProcedureUnitType, UrgencyLevel, FeeCategory, FeeScheduleType, ItemType, Patient, TreatmentPhase } from '../types';

// Helper to create IDs
const id = (prefix: string) => `${prefix}-${Math.random().toString(36).substr(2, 5)}`;
const now = new Date().toISOString();

const ITEM_DEFAULTS = {
  discount: 0,
  sortOrder: 0,
  units: 1,
  coveragePercent: null,
  estimatedInsurance: null,
  estimatedPatientPortion: null,
  itemType: 'PROCEDURE' as ItemType,
};

// --- REAL PATIENTS ---
export const DEMO_PATIENTS: Patient[] = [
  { id: 'pat_alex', firstName: 'Alex', lastName: 'Rivera', dob: '1989-04-12', memberId: 'M12345', createdAt: now, updatedAt: now },
  { id: 'pat_jordan', firstName: 'Jordan', lastName: 'Kim', dob: '1976-09-30', memberId: 'M54321', createdAt: now, updatedAt: now },
  { id: 'pat_casey', firstName: 'Casey', lastName: 'Nguyen', dob: '1991-02-18', memberId: 'M99887', createdAt: now, updatedAt: now },
  { id: 'pat_taylor', firstName: 'Taylor', lastName: 'Brooks', dob: '1984-07-05', memberId: 'M77661', createdAt: now, updatedAt: now },
];

// --- PLAN A: Single-Tooth (Alex) ---
const planA_Id = 'plan_demo_A';
const itemsA: TreatmentPlanItem[] = [
  {
    ...ITEM_DEFAULTS,
    id: id('item'),
    treatmentPlanId: planA_Id,
    feeScheduleEntryId: 'f1', // D2391
    procedureCode: 'D2391',
    procedureName: 'Resin-based composite - 1 surface, posterior',
    category: 'RESTORATIVE',
    unitType: 'PER_TOOTH',
    selectedTeeth: [3],
    baseFee: 200,
    membershipFee: 160,
    grossFee: 200,
    netFee: 200,
    urgency: 'SOON',
    sortOrder: 1
  },
  {
    ...ITEM_DEFAULTS,
    id: id('item'),
    treatmentPlanId: planA_Id,
    feeScheduleEntryId: 'f2', // D2740
    procedureCode: 'D2740',
    procedureName: 'Crown - porcelain/ceramic',
    category: 'RESTORATIVE',
    unitType: 'PER_TOOTH',
    selectedTeeth: [11],
    baseFee: 1200,
    membershipFee: 950,
    grossFee: 1200,
    netFee: 1200,
    urgency: 'URGENT',
    sortOrder: 2
  }
];

export const PLAN_A: TreatmentPlan = {
  id: planA_Id,
  patientId: 'pat_alex',
  planNumber: 'TP-DEMO-A',
  title: 'Restorative Care',
  status: 'PRESENTED',
  insuranceMode: 'simple',
  feeScheduleType: 'standard',
  totalFee: 1400,
  patientPortion: 1400,
  clinicDiscount: 0,
  createdAt: now,
  updatedAt: now,
  itemIds: itemsA.map(i => i.id),
  items: itemsA
};

// --- PLAN D: Complex Case (Taylor) ---
const planD_Id = 'plan_demo_D';
const itemsD: TreatmentPlanItem[] = [
  {
    ...ITEM_DEFAULTS,
    id: id('item'),
    treatmentPlanId: planD_Id,
    feeScheduleEntryId: 'f5', // D3330
    procedureCode: 'D3330',
    procedureName: 'Endodontic therapy, molar',
    category: 'ENDODONTIC',
    unitType: 'PER_TOOTH',
    selectedTeeth: [19],
    baseFee: 1100,
    membershipFee: 850,
    grossFee: 1100,
    netFee: 1100,
    urgency: 'URGENT',
    sortOrder: 1,
    phaseId: 'phase-D-1'
  },
  {
    ...ITEM_DEFAULTS,
    id: id('item'),
    treatmentPlanId: planD_Id,
    feeScheduleEntryId: 'f7', // D6010
    procedureCode: 'D6010',
    procedureName: 'Surgical placement of implant body',
    category: 'IMPLANT',
    unitType: 'PER_TOOTH',
    selectedTeeth: [30],
    baseFee: 2200,
    membershipFee: 1800,
    grossFee: 2200,
    netFee: 2200,
    urgency: 'SOON',
    sortOrder: 2,
    phaseId: 'phase-D-3'
  }
];

/**
 * Hardened Demo Phases:
 * All estimates are removed. Non-monitor phases must be derived from items on load.
 */
const phasesD: TreatmentPhase[] = [
  {
    id: 'phase-D-1',
    planId: planD_Id,
    bucketKey: 'FOUNDATION',
    title: 'Phase 1: Foundation',
    sortOrder: 0,
    itemIds: [itemsD[0].id],
    durationIsManual: false 
  },
  {
    id: 'phase-D-3',
    planId: planD_Id,
    bucketKey: 'IMPLANT',
    title: 'Phase 3: Reconstruction',
    sortOrder: 2,
    itemIds: [itemsD[1].id],
    durationIsManual: false
  },
  {
    id: 'phase-D-monitor',
    planId: planD_Id,
    bucketKey: 'OTHER',
    title: 'Healing Period',
    sortOrder: 1,
    itemIds: [],
    isMonitorPhase: true,
    durationIsManual: true, // INVARIANT: Valid manual override for healing
    estimatedDurationValue: 3,
    estimatedDurationUnit: 'months'
  }
];

export const PLAN_D: TreatmentPlan = {
  id: planD_Id,
  patientId: 'pat_taylor',
  planNumber: 'TP-DEMO-D',
  title: 'Comprehensive Rehab',
  status: 'DRAFT',
  insuranceMode: 'simple',
  feeScheduleType: 'membership',
  totalFee: 3300,
  patientPortion: 3300,
  clinicDiscount: 0,
  createdAt: now,
  updatedAt: now,
  itemIds: itemsD.map(i => i.id),
  items: itemsD,
  phases: phasesD
};

export const DEMO_PLANS = [PLAN_A, PLAN_D];
export const DEMO_ITEMS = [...itemsA, ...itemsD];
export const DEMO_SHARES: ShareLink[] = [];
