import { ClinicProcedure, FeeCategory, ProcedureUnitType } from '../types';

export function exportLibraryToCsv(list: ClinicProcedure[]): string {
    const headers = "cdtCode,displayName,baseFee,membershipFee,category,unitType,visits,duration,unit,layout";
    const rows = list.map(p => [
        p.cdtCode,
        `"${p.displayName.replace(/"/g, '""')}"`,
        p.baseFee ?? 0,
        p.membershipFee ?? "",
        p.categoryOverride ?? "",
        p.unitTypeOverride ?? "",
        p.defaultEstimatedVisits ?? "",
        p.defaultEstimatedDurationValue ?? "",
        p.defaultEstimatedDurationUnit ?? "",
        p.layoutOverride ?? ""
    ].join(","));
    
    return [headers, ...rows].join("\n");
}

export function parseCsvToLibrary(csv: string): { data: ClinicProcedure[], errors: string[] } {
    const lines = csv.split("\n").filter(l => l.trim().length > 0);
    const data: ClinicProcedure[] = [];
    const errors: string[] = [];

    if (lines.length < 2) {
        return { data: [], errors: ["CSV is empty or missing header."] };
    }

    lines.slice(1).forEach((line, idx) => {
        const parts = line.split(",").map(p => p.trim().replace(/^"|"$/g, ''));
        if (parts.length < 3) {
            errors.push(`Row ${idx + 2}: Missing required columns.`);
            return;
        }

        const [cdtCode, displayName, baseFeeStr] = parts;
        const baseFee = parseFloat(baseFeeStr);

        if (!cdtCode || !displayName || isNaN(baseFee)) {
            errors.push(`Row ${idx + 2}: Invalid code, name, or fee.`);
            return;
        }

        data.push({
            cdtCode,
            displayName,
            baseFee,
            membershipFee: parts[3] !== "" ? parseFloat(parts[3]) : null,
            categoryOverride: (parts[4] as FeeCategory) || undefined,
            unitTypeOverride: (parts[5] as ProcedureUnitType) || undefined,
            defaultEstimatedVisits: parts[6] ? parseInt(parts[6]) : undefined,
            defaultEstimatedDurationValue: parts[7] ? parseFloat(parts[7]) : undefined,
            defaultEstimatedDurationUnit: (parts[8] as any) || undefined,
            layoutOverride: (parts[9] as any) || undefined
        });
    });

    return { data, errors };
}
