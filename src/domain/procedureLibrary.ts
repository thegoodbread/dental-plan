import { ProcedureDefinition } from '../types';

const KEY_PROCEDURE_LIBRARY = "cc_procedure_library_v1";
const LIBRARY_SCHEMA_VERSION = "1.0.0";

export const STARTER_PROCEDURES: ProcedureDefinition[] = [
  // --- DIAGNOSTIC ---
  {
    id: "def_d0150", cdtCode: "D0150", name: "Comprehensive Oral Evaluation", category: "DIAGNOSTIC", unitType: "PER_PROCEDURE",
    pricing: { baseFee: 120, membershipFee: 0 },
    selectionRules: { fullMouth: true },
    defaults: { defaultEstimatedVisits: 1, defaultEstimatedDurationValue: 1, defaultEstimatedDurationUnit: "days" },
    uiHints: { layout: "fullRow" }
  },
  {
    id: "def_d0120", cdtCode: "D0120", name: "Periodic Oral Evaluation", category: "DIAGNOSTIC", unitType: "PER_PROCEDURE",
    pricing: { baseFee: 65, membershipFee: 0 },
    selectionRules: { fullMouth: true },
    defaults: { defaultEstimatedVisits: 1, defaultEstimatedDurationValue: 1, defaultEstimatedDurationUnit: "days" },
    uiHints: { layout: "fullRow" }
  },
  // --- PREVENTIVE ---
  {
    id: "def_d1110", cdtCode: "D1110", name: "Prophylaxis - Adult", category: "PREVENTIVE", unitType: "PER_PROCEDURE",
    pricing: { baseFee: 110, membershipFee: 0 },
    selectionRules: { fullMouth: true },
    defaults: { defaultEstimatedVisits: 1, defaultEstimatedDurationValue: 1, defaultEstimatedDurationUnit: "days" },
    uiHints: { layout: "fullRow" }
  },
  // --- RESTORATIVE ---
  {
    id: "def_d2391", cdtCode: "D2391", name: "Resin Composite - 1 Surface, Post.", category: "RESTORATIVE", unitType: "PER_TOOTH",
    pricing: { baseFee: 220, membershipFee: 175 },
    selectionRules: { requiresToothSelection: true, allowsMultipleTeeth: true, requiresSurfaces: true },
    defaults: { defaultEstimatedVisits: 1, defaultEstimatedDurationValue: 1, defaultEstimatedDurationUnit: "days" },
    uiHints: { layout: "single" }
  },
  {
    id: "def_d2392", cdtCode: "D2392", name: "Resin Composite - 2 Surfaces, Post.", category: "RESTORATIVE", unitType: "PER_TOOTH",
    pricing: { baseFee: 265, membershipFee: 210 },
    selectionRules: { requiresToothSelection: true, allowsMultipleTeeth: true, requiresSurfaces: true },
    defaults: { defaultEstimatedVisits: 1, defaultEstimatedDurationValue: 1, defaultEstimatedDurationUnit: "days" },
    uiHints: { layout: "single" }
  },
  {
    id: "def_d2740", cdtCode: "D2740", name: "Crown - Porcelain/Ceramic", category: "RESTORATIVE", unitType: "PER_TOOTH",
    pricing: { baseFee: 1250, membershipFee: 995 },
    selectionRules: { requiresToothSelection: true, allowsMultipleTeeth: true },
    defaults: { defaultEstimatedVisits: 2, defaultEstimatedDurationValue: 2, defaultEstimatedDurationUnit: "weeks" },
    uiHints: { layout: "single" }
  },
  // --- ARCH SPECIFIC PROCEDURES (New) ---
  {
    id: "def_d5110", cdtCode: "D5110", name: "Complete Denture - Maxillary (Upper)", category: "PROSTHETIC", unitType: "PER_ARCH",
    pricing: { baseFee: 1850, membershipFee: 1450 },
    selectionRules: { allowsArch: true },
    defaults: { defaultEstimatedVisits: 5, defaultEstimatedDurationValue: 6, defaultEstimatedDurationUnit: "weeks" },
    uiHints: { layout: "single" }
  },
  {
    id: "def_d5120", cdtCode: "D5120", name: "Complete Denture - Mandibular (Lower)", category: "PROSTHETIC", unitType: "PER_ARCH",
    pricing: { baseFee: 1850, membershipFee: 1450 },
    selectionRules: { allowsArch: true },
    defaults: { defaultEstimatedVisits: 5, defaultEstimatedDurationValue: 6, defaultEstimatedDurationUnit: "weeks" },
    uiHints: { layout: "single" }
  },
  {
    id: "def_d9944", cdtCode: "D9944", name: "Occlusal Guard - Hard (Nightguard)", category: "OTHER", unitType: "PER_ARCH",
    pricing: { baseFee: 650, membershipFee: 495 },
    selectionRules: { allowsArch: true },
    defaults: { defaultEstimatedVisits: 2, defaultEstimatedDurationValue: 2, defaultEstimatedDurationUnit: "weeks" },
    uiHints: { layout: "single" }
  },
  {
    id: "def_d9972", cdtCode: "D9972", name: "External Bleaching (Whitening)", category: "COSMETIC", unitType: "PER_ARCH",
    pricing: { baseFee: 350, membershipFee: 250 },
    selectionRules: { allowsArch: true },
    defaults: { defaultEstimatedVisits: 1, defaultEstimatedDurationValue: 1, defaultEstimatedDurationUnit: "days" },
    uiHints: { layout: "single" }
  },
  // --- PERIO ---
  {
    id: "def_d4341", cdtCode: "D4341", name: "SRP - 4+ Teeth per Quad", category: "PERIO", unitType: "PER_QUADRANT",
    pricing: { baseFee: 325, membershipFee: 260 },
    selectionRules: { allowsQuadrants: true, maxSelections: 4 },
    defaults: { defaultEstimatedVisits: 2, defaultEstimatedDurationValue: 4, defaultEstimatedDurationUnit: "weeks" },
    uiHints: { layout: "single" }
  },
  // --- IMPLANT ---
  {
    id: "def_d6010", cdtCode: "D6010", name: "Implant Placement - Endosteal", category: "IMPLANT", unitType: "PER_TOOTH",
    pricing: { baseFee: 2200, membershipFee: 1800 },
    selectionRules: { requiresToothSelection: true },
    defaults: { defaultEstimatedVisits: 3, defaultEstimatedDurationValue: 4, defaultEstimatedDurationUnit: "months" },
    uiHints: { layout: "single" }
  }
];

export function getProcedureLibrary(): ProcedureDefinition[] {
  const stored = localStorage.getItem(KEY_PROCEDURE_LIBRARY);
  if (!stored) return STARTER_PROCEDURES;
  try {
    const parsed = JSON.parse(stored);
    if (parsed.version !== LIBRARY_SCHEMA_VERSION) {
       saveProcedureLibrary(STARTER_PROCEDURES);
       return STARTER_PROCEDURES;
    }
    return parsed.data;
  } catch {
    return STARTER_PROCEDURES;
  }
}

export function saveProcedureLibrary(data: ProcedureDefinition[]) {
  const payload = { version: LIBRARY_SCHEMA_VERSION, data };
  localStorage.setItem(KEY_PROCEDURE_LIBRARY, JSON.stringify(payload));
}
