import { ProcedureMeta, SelectionRules } from '../types';

const BASE_RULES: SelectionRules = {
    requiresToothSelection: false,
    allowsMultipleTeeth: false,
    requiresSurfaces: false,
    allowsQuadrants: false,
    allowsArch: false,
    fullMouth: false
};

export const PROCEDURE_META_PACK: ProcedureMeta[] = [
    // --- DIAGNOSTIC ---
    {
        cdtCode: "D0120", category: "DIAGNOSTIC", unitType: "PER_PROCEDURE",
        selectionRules: { ...BASE_RULES, fullMouth: true },
        defaults: { defaultEstimatedVisits: 1, defaultEstimatedDurationValue: 1, defaultEstimatedDurationUnit: "days" },
        uiHints: { layout: "fullRow", badges: ["Recall"] }
    },
    {
        cdtCode: "D0150", category: "DIAGNOSTIC", unitType: "PER_PROCEDURE",
        selectionRules: { ...BASE_RULES, fullMouth: true },
        defaults: { defaultEstimatedVisits: 1, defaultEstimatedDurationValue: 1, defaultEstimatedDurationUnit: "days" },
        uiHints: { layout: "fullRow", badges: ["Comprehensive"] }
    },

    // --- RESTORATIVE ---
    {
        cdtCode: "D2391", category: "RESTORATIVE", unitType: "PER_TOOTH",
        selectionRules: { ...BASE_RULES, requiresToothSelection: true, allowsMultipleTeeth: true, requiresSurfaces: true },
        defaults: { defaultEstimatedVisits: 1, defaultEstimatedDurationValue: 1, defaultEstimatedDurationUnit: "days" },
        uiHints: { layout: "single" }
    },
    {
        cdtCode: "D2392", category: "RESTORATIVE", unitType: "PER_TOOTH",
        selectionRules: { ...BASE_RULES, requiresToothSelection: true, allowsMultipleTeeth: true, requiresSurfaces: true },
        defaults: { defaultEstimatedVisits: 1, defaultEstimatedDurationValue: 1, defaultEstimatedDurationUnit: "days" },
        uiHints: { layout: "single" }
    },

    // --- PROSTHETIC / ARCH (New) ---
    {
        cdtCode: "D5110", category: "PROSTHETIC", unitType: "PER_ARCH",
        selectionRules: { ...BASE_RULES, allowsArch: true },
        defaults: { defaultEstimatedVisits: 5, defaultEstimatedDurationValue: 6, defaultEstimatedDurationUnit: "weeks" },
        uiHints: { layout: "single" }
    },
    {
        cdtCode: "D5120", category: "PROSTHETIC", unitType: "PER_ARCH",
        selectionRules: { ...BASE_RULES, allowsArch: true },
        defaults: { defaultEstimatedVisits: 5, defaultEstimatedDurationValue: 6, defaultEstimatedDurationUnit: "weeks" },
        uiHints: { layout: "single" }
    },

    // --- ADJUNCTIVE / COSMETIC (New) ---
    {
        cdtCode: "D9944", category: "OTHER", unitType: "PER_ARCH",
        selectionRules: { ...BASE_RULES, allowsArch: true },
        defaults: { defaultEstimatedVisits: 2, defaultEstimatedDurationValue: 2, defaultEstimatedDurationUnit: "weeks" },
        uiHints: { layout: "single" }
    },
    {
        cdtCode: "D9972", category: "COSMETIC", unitType: "PER_ARCH",
        selectionRules: { ...BASE_RULES, allowsArch: true },
        defaults: { defaultEstimatedVisits: 1, defaultEstimatedDurationValue: 1, defaultEstimatedDurationUnit: "days" },
        uiHints: { layout: "single" }
    },

    // --- PERIO ---
    {
        cdtCode: "D4341", category: "PERIO", unitType: "PER_QUADRANT",
        selectionRules: { ...BASE_RULES, allowsQuadrants: true, maxSelections: 4 },
        defaults: { defaultEstimatedVisits: 2, defaultEstimatedDurationValue: 4, defaultEstimatedDurationUnit: "weeks" },
        uiHints: { layout: "single" }
    },

    // --- IMPLANT ---
    {
        cdtCode: "D6010", category: "IMPLANT", unitType: "PER_TOOTH",
        selectionRules: { ...BASE_RULES, requiresToothSelection: true },
        defaults: { defaultEstimatedVisits: 3, defaultEstimatedDurationValue: 4, defaultEstimatedDurationUnit: "months" },
        uiHints: { layout: "single" }
    }
];
