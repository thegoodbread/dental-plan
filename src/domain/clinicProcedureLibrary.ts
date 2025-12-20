import { ClinicProcedure } from '../types';

const KEY_CLINIC_PROCEDURE_LIBRARY = "cc_clinic_procedure_library_v2";
const KEY_CLINIC_PROCEDURE_LIBRARY_SCHEMA = "cc_clinic_procedure_library_schema_v2";
const CURRENT_SCHEMA_VERSION = "2.0.0";

const DEFAULT_CLINIC_LIBRARY: ClinicProcedure[] = [
    { cdtCode: "D0150", displayName: "Comprehensive Oral Evaluation", baseFee: 120, membershipFee: 95 },
    { cdtCode: "D0120", displayName: "Periodic Oral Evaluation", baseFee: 65, membershipFee: 45 },
    { cdtCode: "D0210", displayName: "FMX (Intraoral Complete Series)", baseFee: 145, membershipFee: 110 },
    { cdtCode: "D1110", displayName: "Prophylaxis - Adult", baseFee: 110, membershipFee: 85 },
    { cdtCode: "D2391", displayName: "Resin Composite - 1 Surface, Posterior", baseFee: 220, membershipFee: 175 },
    { cdtCode: "D2392", displayName: "Resin Composite - 2 Surface, Posterior", baseFee: 265, membershipFee: 210 },
    { cdtCode: "D2740", displayName: "Crown - Porcelain/Ceramic", baseFee: 1250, membershipFee: 995 },
    { cdtCode: "D3330", displayName: "Endodontic Therapy - Molar", baseFee: 1350, membershipFee: 1100 },
    { cdtCode: "D4341", displayName: "SRP - 4+ Teeth per Quadrant", baseFee: 325, membershipFee: 260 },
    { cdtCode: "D6010", displayName: "Implant Placement - Endosteal", baseFee: 2200, membershipFee: 1800 },
    { cdtCode: "D7140", displayName: "Extraction - Erupted Tooth", baseFee: 250, membershipFee: 195 },
];

export function getClinicProcedureLibrary(): ClinicProcedure[] {
    if (typeof window === 'undefined') return DEFAULT_CLINIC_LIBRARY;
    
    const version = localStorage.getItem(KEY_CLINIC_PROCEDURE_LIBRARY_SCHEMA);
    if (version !== CURRENT_SCHEMA_VERSION) {
        resetClinicProcedureLibraryToDefaults();
        return DEFAULT_CLINIC_LIBRARY;
    }

    const stored = localStorage.getItem(KEY_CLINIC_PROCEDURE_LIBRARY);
    if (!stored) return DEFAULT_CLINIC_LIBRARY;

    try {
        return JSON.parse(stored);
    } catch {
        return DEFAULT_CLINIC_LIBRARY;
    }
}

export function saveClinicProcedureLibrary(list: ClinicProcedure[]): void {
    localStorage.setItem(KEY_CLINIC_PROCEDURE_LIBRARY, JSON.stringify(list));
    localStorage.setItem(KEY_CLINIC_PROCEDURE_LIBRARY_SCHEMA, CURRENT_SCHEMA_VERSION);
}

export function resetClinicProcedureLibraryToDefaults(): void {
    saveClinicProcedureLibrary(DEFAULT_CLINIC_LIBRARY);
}

export function mergeOrUpsertClinicProcedure(proc: ClinicProcedure): ClinicProcedure[] {
    const current = getClinicProcedureLibrary();
    const index = current.findIndex(p => p.cdtCode === proc.cdtCode);
    
    let newList;
    if (index >= 0) {
        newList = [...current];
        newList[index] = { ...newList[index], ...proc };
    } else {
        newList = [...current, proc];
    }
    
    saveClinicProcedureLibrary(newList);
    return newList;
}