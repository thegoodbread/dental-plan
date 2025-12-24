
// FIX: ProcedureDefinition and ProcedureUnitType are correctly imported from src/types.ts
import { ProcedureDefinition, FeeCategory, ProcedureUnitType } from '../types';

export function exportLibraryToCsv(defs: ProcedureDefinition[]): string {
  const headers = "cdtCode,name,category,unitType,baseFee,membershipFee,defaultEstimatedVisits,defaultEstimatedDurationValue,defaultEstimatedDurationUnit,layout";
  const rows = defs.map(d => [
    d.cdtCode,
    `"${d.name.replace(/"/g, '""')}"`,
    d.category,
    d.unitType,
    d.pricing.baseFee,
    d.pricing.membershipFee || 0,
    d.defaults.defaultEstimatedVisits,
    d.defaults.defaultEstimatedDurationValue,
    d.defaults.defaultEstimatedDurationUnit || "",
    d.uiHints.layout
  ].join(","));
  
  return [headers, ...rows].join("\n");
}

export function parseCsvToLibrary(csv: string): ProcedureDefinition[] {
  const lines = csv.split("\n").filter(l => l.trim().length > 0);
  if (lines.length < 2) return [];
  
  const headers = lines[0].split(",");
  return lines.slice(1).map((line, idx) => {
    // Simple quoted CSV split
    const parts = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || [];
    const getVal = (h: string) => parts[headers.indexOf(h)]?.replace(/^"|"$/g, "");

    const cdt = getVal("cdtCode") || "DXXXX";
    const unitType = (getVal("unitType") as ProcedureUnitType) || "PER_PROCEDURE";
    return {
      id: `imp_${cdt}_${Date.now()}_${idx}`,
      cdtCode: cdt,
      name: getVal("name") || "Untitled",
      category: (getVal("category") as FeeCategory) || "OTHER",
      unitType,
      pricing: {
        baseFee: parseFloat(getVal("baseFee")) || 0,
        membershipFee: parseFloat(getVal("membershipFee")) || undefined
      },
      defaults: {
        defaultEstimatedVisits: parseInt(getVal("defaultEstimatedVisits")) || 1,
        defaultEstimatedDurationValue: parseInt(getVal("defaultEstimatedDurationValue")) || 1,
        defaultEstimatedDurationUnit: (getVal("defaultEstimatedDurationUnit") as any) || "days"
      },
      selectionRules: {
        requiresToothSelection: unitType === "PER_TOOTH",
        allowsMultipleTeeth: unitType === "PER_TOOTH",
        allowsQuadrants: unitType === "PER_QUADRANT",
        allowsArch: unitType === "PER_ARCH",
        requiresSurfaces: cdt.startsWith("D23"),
        // FIX: Added required fullMouth property
        fullMouth: false
      },
      uiHints: {
        layout: (getVal("layout") as any) || "single"
      }
    };
  });
}
