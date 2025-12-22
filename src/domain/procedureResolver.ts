import { PROCEDURE_META_PACK } from './procedureMetaPack';
import { getClinicProcedureLibrary } from './clinicProcedureLibrary';
import { EffectiveProcedure, ProcedureMeta, ClinicProcedure, FeeCategory, ProcedureUnitType } from '../types';

export function resolveEffectiveProcedure(cdtCode: string): EffectiveProcedure | null {
    const meta = PROCEDURE_META_PACK.find(m => m.cdtCode === cdtCode);
    const clinic = getClinicProcedureLibrary().find(c => c.cdtCode === cdtCode);

    if (!clinic && !meta) return null;

    // A label is missing if the clinic has not defined a human-friendly name.
    const isLabelMissing = !clinic || !clinic.displayName || clinic.displayName.trim() === "" || clinic.displayName === cdtCode;

    // Use safe fallbacks if behavioural meta is missing
    const effectiveMeta: ProcedureMeta = meta ?? {
        cdtCode: cdtCode,
        category: "OTHER",
        unitType: "PER_PROCEDURE",
        selectionRules: {
            requiresToothSelection: false,
            allowsMultipleTeeth: false,
            requiresSurfaces: false,
            allowsQuadrants: false,
            allowsArch: false,
            fullMouth: false
        },
        defaults: {
            defaultEstimatedVisits: 1,
            defaultEstimatedDurationValue: null,
            defaultEstimatedDurationUnit: null
        },
        uiHints: { layout: "single" }
    };

    const effectiveClinic: ClinicProcedure = clinic ?? {
        cdtCode: cdtCode,
        displayName: "Needs label",
        baseFee: 0,
        membershipFee: null
    };

    return {
        cdtCode: effectiveMeta.cdtCode,
        displayName: isLabelMissing ? "Needs label" : effectiveClinic.displayName,
        category: effectiveClinic.categoryOverride ?? effectiveMeta.category,
        unitType: effectiveClinic.unitTypeOverride ?? effectiveMeta.unitType,
        selectionRules: effectiveMeta.selectionRules,
        defaults: {
            defaultEstimatedVisits: effectiveClinic.defaultEstimatedVisits ?? effectiveMeta.defaults.defaultEstimatedVisits,
            defaultEstimatedDurationValue: effectiveClinic.defaultEstimatedDurationValue ?? effectiveMeta.defaults.defaultEstimatedDurationValue,
            defaultEstimatedDurationUnit: effectiveClinic.defaultEstimatedDurationUnit ?? effectiveMeta.defaults.defaultEstimatedDurationUnit
        },
        pricing: {
            baseFee: effectiveClinic.baseFee ?? 0,
            membershipFee: effectiveClinic.membershipFee ?? null
        },
        uiHints: {
            layout: effectiveClinic.layoutOverride ?? effectiveMeta.uiHints.layout
        },
        metaCoverage: meta ? 'full' : 'none',
        isLabelMissing
    };
}

export function listEffectiveProcedures(): EffectiveProcedure[] {
    const clinicLib = getClinicProcedureLibrary();
    const metaCodes = PROCEDURE_META_PACK.map(m => m.cdtCode);
    const clinicCodes = clinicLib.map(c => c.cdtCode);
    
    // Correctly union all codes
    const allCodes = Array.from(new Set([...metaCodes, ...clinicCodes]));
    
    return allCodes
        .map(code => resolveEffectiveProcedure(code))
        .filter((p): p is EffectiveProcedure => p !== null)
        .sort((a, b) => a.cdtCode.localeCompare(b.cdtCode));
}
