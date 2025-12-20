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
  {
    id: "def_d0210", cdtCode: "D0210", name: "FMX (Complete Radiographic Series)", category: "DIAGNOSTIC", unitType: "PER_PROCEDURE",
    pricing: { baseFee: 145, membershipFee: 0 },
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
  {
    id: "def_d1206", cdtCode: "D1206", name: "Fluoride Varnish", category: "PREVENTIVE", unitType: "PER_ARCH",
    pricing: { baseFee: 45, membershipFee: 0 },
    selectionRules: { allowsArch: true },
    defaults: { defaultEstimatedVisits: 1, defaultEstimatedDurationValue: 1, defaultEstimatedDurationUnit: "days" },
    uiHints: { layout: "single" }
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
  // --- ENDODONTIC ---
  {
    id: "def_d3330", cdtCode: "D3330", name: "Endodontic Therapy - Molar", category: "ENDODONTIC", unitType: "PER_TOOTH",
    pricing: { baseFee: 1150, membershipFee: 920 },
    selectionRules: { requiresToothSelection: true },
    defaults: { defaultEstimatedVisits: 2, defaultEstimatedDurationValue: 2, defaultEstimatedDurationUnit: "weeks" },
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
  {
    id: "def_d4355", cdtCode: "D4355", name: "Full Mouth Debridement", category: "PERIO", unitType: "FULL_MOUTH",
    pricing: { baseFee: 185, membershipFee: 145 },
    selectionRules: { fullMouth: true },
    defaults: { defaultEstimatedVisits: 1, defaultEstimatedDurationValue: 1, defaultEstimatedDurationUnit: "days" },
    uiHints: { layout: "fullRow" }
  },
  // --- SURGICAL ---
  {
    id: "def_d7140", cdtCode: "D7140", name: "Extraction - Erupted Tooth", category: "SURGICAL", unitType: "PER_TOOTH",
    pricing: { baseFee: 250, membershipFee: 200 },
    selectionRules: { requiresToothSelection: true, allowsMultipleTeeth: true },
    defaults: { defaultEstimatedVisits: 1, defaultEstimatedDurationValue: 1, defaultEstimatedDurationUnit: "weeks" },
    uiHints: { layout: "single" }
  },
  // --- IMPLANT ---
  {
    id: "def_d6010", cdtCode: "D6010", name: "Implant Placement - Endosteal", category: "IMPLANT", unitType: "PER_TOOTH",
    pricing: { baseFee: 2200, membershipFee: 1800 },
    selectionRules: { requiresToothSelection: true },
    defaults: { defaultEstimatedVisits: 3, defaultEstimatedDurationValue: 4, defaultEstimatedDurationUnit: "months" },
    uiHints: { layout: "single" }
  },
  // --- PROSTHETIC ---
  {
    id: "def_d5110", cdtCode: "D5110", name: "Complete Denture - Maxillary", category: "PROSTHETIC", unitType: "PER_ARCH",
    pricing: { baseFee: 1800, membershipFee: 1450 },
    selectionRules: { allowsArch: true },
    defaults: { defaultEstimatedVisits: 5, defaultEstimatedDurationValue: 6, defaultEstimatedDurationUnit: "weeks" },
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