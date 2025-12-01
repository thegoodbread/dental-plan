
import { TreatmentPlan, TreatmentPlanItem, ShareLink, FeeUnitType, UrgencyLevel, FeeCategory, FeeScheduleType, ItemType } from '../types';

// Helper to create IDs
const id = (prefix: string) => `${prefix}-${Math.random().toString(36).substr(2, 5)}`;

const ITEM_DEFAULTS = {
  discount: 0,
  sortOrder: 0,
  units: 1,
  coveragePercent: null,
  estimatedInsurance: null,
  estimatedPatientPortion: null,
  itemType: 'PROCEDURE' as ItemType,
};

// --- PLAN A: Single-Tooth (Alex) ---
const planA_Id = 'plan_demo_A';
const itemsA: TreatmentPlanItem[] = [
  {
    ...ITEM_DEFAULTS,
    id: id('item'),
    treatmentPlanId: planA_Id,
    feeScheduleEntryId: 'f11', // D2392
    procedureCode: 'D2392',
    procedureName: 'Resin-based composite - 2 surf',
    category: 'RESTORATIVE',
    unitType: 'PER_TOOTH',
    selectedTeeth: [3],
    baseFee: 220,
    grossFee: 220,
    netFee: 220,
    urgency: 'SOON',
    estimatedVisits: 1,
    sortOrder: 1
  },
  {
    ...ITEM_DEFAULTS,
    id: id('item'),
    treatmentPlanId: planA_Id,
    feeScheduleEntryId: 'f14', // D2740
    procedureCode: 'D2740',
    procedureName: 'Crown - porcelain/ceramic',
    category: 'RESTORATIVE',
    unitType: 'PER_TOOTH',
    selectedTeeth: [11],
    baseFee: 1200,
    grossFee: 1200,
    netFee: 1200,
    urgency: 'URGENT',
    estimatedVisits: 2,
    sortOrder: 2
  },
  {
    ...ITEM_DEFAULTS,
    id: id('item'),
    treatmentPlanId: planA_Id,
    feeScheduleEntryId: 'f19', // D3330
    procedureCode: 'D3330',
    procedureName: 'Endodontic therapy, molar',
    category: 'ENDODONTIC',
    unitType: 'PER_TOOTH',
    selectedTeeth: [19],
    baseFee: 1200,
    grossFee: 1200,
    netFee: 1200,
    urgency: 'URGENT',
    estimatedVisits: 2,
    sortOrder: 3
  },
  {
    ...ITEM_DEFAULTS,
    id: id('item'),
    treatmentPlanId: planA_Id,
    feeScheduleEntryId: 'f20', // D6010
    procedureCode: 'D6010',
    procedureName: 'Surgical placement of implant body',
    category: 'IMPLANT',
    unitType: 'PER_TOOTH',
    selectedTeeth: [30],
    baseFee: 2100,
    grossFee: 2100,
    netFee: 2100,
    urgency: 'SOON',
    estimatedVisits: 3,
    sortOrder: 4
  }
];

export const PLAN_A: TreatmentPlan = {
  id: planA_Id,
  caseAlias: 'Patient-8432',
  planNumber: 'TP-DEMO-SINGLE',
  title: 'Restorative & Implant Plan',
  status: 'PRESENTED',
  insuranceMode: 'simple',
  feeScheduleType: 'standard',
  totalFee: 4720,
  estimatedInsurance: 1500,
  clinicDiscount: 0,
  membershipSavings: 0,
  patientPortion: 3220,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  itemIds: itemsA.map(i => i.id),
  items: itemsA, // Hydrated for seed
  explanationForPatient: "This plan addresses several specific teeth that require attention. We are prioritizing the crown on #11 and the root canal on #19 to eliminate infection and structural risk. The implant for #30 is also planned to restore your chewing function."
};


// --- PLAN B: Quadrant (Jordan) ---
const planB_Id = 'plan_demo_B';
const itemsB: TreatmentPlanItem[] = [
  {
    ...ITEM_DEFAULTS,
    id: id('item'),
    treatmentPlanId: planB_Id,
    feeScheduleEntryId: 'f23', // D4341
    procedureCode: 'D4341',
    procedureName: 'Perio scaling & root planing - 4+ teeth',
    category: 'PERIO',
    unitType: 'PER_QUADRANT',
    selectedQuadrants: ['UR', 'UL'],
    units: 2,
    baseFee: 250,
    grossFee: 500,
    netFee: 500,
    urgency: 'URGENT',
    estimatedVisits: 2,
    sortOrder: 1
  },
  {
    ...ITEM_DEFAULTS,
    id: id('item'),
    treatmentPlanId: planB_Id,
    feeScheduleEntryId: 'f23', // D4341
    procedureCode: 'D4341',
    procedureName: 'Perio scaling & root planing - 4+ teeth',
    category: 'PERIO',
    unitType: 'PER_QUADRANT',
    selectedQuadrants: ['LL'],
    units: 1,
    baseFee: 250,
    grossFee: 250,
    netFee: 250,
    urgency: 'SOON',
    estimatedVisits: 1,
    sortOrder: 2
  },
  {
    ...ITEM_DEFAULTS,
    id: id('item'),
    treatmentPlanId: planB_Id,
    feeScheduleEntryId: 'f25', // D4910
    procedureCode: 'D4910',
    procedureName: 'Periodontal maintenance',
    category: 'PERIO',
    unitType: 'PER_PROCEDURE',
    baseFee: 150,
    grossFee: 150,
    netFee: 150,
    urgency: 'ELECTIVE',
    estimatedVisits: 1,
    sortOrder: 3
  }
];

export const PLAN_B: TreatmentPlan = {
  id: planB_Id,
  caseAlias: 'Patient-5519',
  planNumber: 'TP-DEMO-QUAD',
  title: 'Periodontal Therapy',
  status: 'DRAFT',
  insuranceMode: 'simple',
  feeScheduleType: 'standard',
  totalFee: 900,
  estimatedInsurance: 450,
  clinicDiscount: 0,
  membershipSavings: 0,
  patientPortion: 450,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  itemIds: itemsB.map(i => i.id),
  items: itemsB,
  explanationForPatient: "Our primary goal is to stabilize your gum health. We have found active periodontal disease in the upper quadrants which requires deep cleaning (scaling and root planing) to stop bone loss. The lower left area also needs attention soon."
};


// --- PLAN C: Full Arch (Casey) ---
const planC_Id = 'plan_demo_C';
const itemsC: TreatmentPlanItem[] = [
  {
    ...ITEM_DEFAULTS,
    id: id('item'),
    treatmentPlanId: planC_Id,
    feeScheduleEntryId: 'f26', // D5110
    procedureCode: 'D5110',
    procedureName: 'Complete denture - maxillary',
    category: 'PROSTHETIC',
    unitType: 'PER_ARCH',
    selectedArches: ['UPPER'],
    units: 1,
    baseFee: 1800,
    grossFee: 1800,
    netFee: 1800,
    urgency: 'SOON',
    estimatedVisits: 4,
    sortOrder: 1
  },
  {
    ...ITEM_DEFAULTS,
    id: id('item'),
    treatmentPlanId: planC_Id,
    feeScheduleEntryId: 'f38', // D7140
    procedureCode: 'D7140',
    procedureName: 'Extraction, erupted tooth',
    category: 'OTHER',
    unitType: 'PER_TOOTH',
    selectedTeeth: [3, 14],
    units: 2,
    baseFee: 200,
    grossFee: 400,
    netFee: 400,
    urgency: 'URGENT',
    estimatedVisits: 1,
    sortOrder: 2
  }
];

export const PLAN_C: TreatmentPlan = {
  id: planC_Id,
  caseAlias: 'Patient-2387',
  planNumber: 'TP-DEMO-ARCH',
  title: 'Upper Arch Restoration',
  status: 'PRESENTED',
  insuranceMode: 'simple',
  feeScheduleType: 'standard',
  totalFee: 2200,
  estimatedInsurance: 1000,
  clinicDiscount: 0,
  membershipSavings: 0,
  patientPortion: 1200,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  itemIds: itemsC.map(i => i.id),
  items: itemsC,
  explanationForPatient: "This plan focuses on restoring your upper arch function. We need to remove the two remaining compromised teeth (#3 and #14) to prepare for a complete upper denture, which will give you back your smile and chewing ability."
};


// --- PLAN D: Mixed Real-World (Taylor) ---
const planD_Id = 'plan_demo_D';
const itemsD: TreatmentPlanItem[] = [
  // 1. URGENT: Infection/Pain
  {
    ...ITEM_DEFAULTS,
    id: id('item'),
    treatmentPlanId: planD_Id,
    feeScheduleEntryId: 'f19', // D3330
    procedureCode: 'D3330',
    procedureName: 'Root Canal Therapy',
    category: 'ENDODONTIC',
    unitType: 'PER_TOOTH',
    selectedTeeth: [19], // Lower left molar
    baseFee: 1200,
    grossFee: 1200,
    netFee: 1200,
    urgency: 'URGENT',
    estimatedVisits: 2,
    sortOrder: 1
  },
  {
    ...ITEM_DEFAULTS,
    id: id('item'),
    treatmentPlanId: planD_Id,
    feeScheduleEntryId: 'f14', // D2740
    procedureCode: 'D2740',
    procedureName: 'Porcelain Crown',
    category: 'RESTORATIVE',
    unitType: 'PER_TOOTH',
    selectedTeeth: [3], // Upper right molar
    baseFee: 1200,
    grossFee: 1200,
    netFee: 1200,
    urgency: 'URGENT',
    estimatedVisits: 2,
    sortOrder: 2
  },
  
  // 2. SOON: Perio / Foundation
  {
    ...ITEM_DEFAULTS,
    id: id('item'),
    treatmentPlanId: planD_Id,
    feeScheduleEntryId: 'f23', // D4341
    procedureCode: 'D4341',
    procedureName: 'Scaling & Root Planing',
    category: 'PERIO',
    unitType: 'PER_QUADRANT',
    selectedQuadrants: ['UR', 'UL'],
    units: 2,
    baseFee: 250,
    grossFee: 500,
    netFee: 500,
    urgency: 'SOON', // Foundation work
    estimatedVisits: 2,
    sortOrder: 3
  },

  // 3. ELECTIVE / FUTURE: Implant & Nightguard
  {
    ...ITEM_DEFAULTS,
    id: id('item'),
    treatmentPlanId: planD_Id,
    feeScheduleEntryId: 'f20', // D6010
    procedureCode: 'D6010',
    procedureName: 'Implant Placement',
    category: 'IMPLANT',
    unitType: 'PER_TOOTH',
    selectedTeeth: [30],
    baseFee: 2100,
    grossFee: 2100,
    netFee: 2100,
    urgency: 'SOON',
    estimatedVisits: 3,
    sortOrder: 4
  },
  {
    ...ITEM_DEFAULTS,
    id: id('item'),
    treatmentPlanId: planD_Id,
    feeScheduleEntryId: 'f36', // D9944
    procedureCode: 'D9944',
    procedureName: 'Occlusal Guard (Nightguard)',
    category: 'OTHER',
    unitType: 'PER_ARCH',
    selectedArches: ['UPPER'],
    units: 1,
    baseFee: 650,
    grossFee: 650,
    netFee: 650,
    urgency: 'ELECTIVE',
    estimatedVisits: 2,
    sortOrder: 5
  }
];

export const PLAN_D: TreatmentPlan = {
  id: planD_Id,
  caseAlias: 'Patient-9102',
  planNumber: 'TP-DEMO-COMPLEX',
  title: 'Comprehensive Rehab',
  status: 'PRESENTED',
  insuranceMode: 'simple',
  feeScheduleType: 'standard',
  totalFee: 5650,
  estimatedInsurance: 2000,
  clinicDiscount: 0,
  membershipSavings: 0,
  patientPortion: 3650,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  itemIds: itemsD.map(i => i.id),
  items: itemsD,
  explanationForPatient: "This comprehensive plan addresses your immediate pain (Tooth #19), stabilizes your gum health to prevent further bone loss, and replaces your missing tooth (#30). We have also included a nightguard to protect your investment from grinding."
};

// --- SHARE LINKS ---
export const DEMO_SHARES: ShareLink[] = [
  { id: 's1', treatmentPlanId: planA_Id, token: 'demo-single-teeth', createdAt: new Date().toISOString(), isActive: true },
  { id: 's2', treatmentPlanId: planB_Id, token: 'demo-quadrant', createdAt: new Date().toISOString(), isActive: true },
  { id: 's3', treatmentPlanId: planC_Id, token: 'demo-full-arch', createdAt: new Date().toISOString(), isActive: true },
  { id: 's4', treatmentPlanId: planD_Id, token: 'demo-mixed-real-world', createdAt: new Date().toISOString(), isActive: true },
];

export const DEMO_PLANS = [PLAN_A, PLAN_B, PLAN_C, PLAN_D];
export const DEMO_ITEMS = [...itemsA, ...itemsB, ...itemsC, ...itemsD];
