
/**
 * RiskEngine.ts
 * 
 * Domain logic for managing dental procedure risks.
 * Note: Main source of truth for library data is riskLibrary.ts.
 * Types defined in dentalTypes.ts.
 */

import { RiskLibraryItem, ProcedureTemplate, RiskSeverity } from './dentalTypes';
import { RISK_LIBRARY as LIB } from './riskLibrary';

export type ProcedureCategory =
  | "direct_restoration"
  | "indirect_restoration"
  | "endo"
  | "extraction_simple"
  | "extraction_surgical"
  | "implant_surgery"
  | "hygiene_scaling"
  | "anesthesia_local"
  | "other";

export type { RiskSeverity };

/**
 * Represents a single, pre-approved risk statement for informed consent.
 * Mapped to RiskLibraryItem for compatibility.
 */
export interface RiskItem {
  id: string;
  category: string; // broadened type to match
  severity: RiskSeverity;
  bulletText: string;
  tags?: string[];
  activeByDefault: boolean;
}

// Re-export or map the library for compatibility
export const RISK_LIBRARY: RiskItem[] = LIB.map(item => ({
    id: item.id,
    category: item.category.toLowerCase(), // mapping back to legacy lower-case category if needed
    severity: item.severity,
    bulletText: item.body,
    activeByDefault: item.activeByDefault,
    tags: []
}));

const SEVERITY_ORDER: Record<RiskSeverity, number> = {
  COMMON: 1,
  UNCOMMON: 2,
  RARE: 3,
  VERY_RARE: 4,
};

export function getRisksForCategory(category: string): RiskItem[] {
  return RISK_LIBRARY
    .filter((r) => r.category === category)
    .sort((a, b) => {
      if (a.activeByDefault !== b.activeByDefault) {
        return a.activeByDefault ? -1 : 1;
      }
      return SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
    });
}

export function buildRiskBullets(selected: RiskItem[]): string {
  if (!selected || selected.length === 0) return "";
  return selected.map((r) => `* ${r.bulletText}`).join("\n");
}

export type BuildRiskPromptOptions = {
  visitType?: string;
  chiefComplaint?: string;
  procedureCategory: ProcedureCategory;
  selectedRisks: RiskItem[];
};

export function buildRiskPromptForGoogleAI(options: BuildRiskPromptOptions): string {
  const { visitType, chiefComplaint, procedureCategory, selectedRisks } = options;

  const riskContent = selectedRisks
    .map((r, idx) => `  ${idx + 1}. ${r.bulletText}`)
    .join("\n");

  return `
You are assisting a dentist in documenting risks and potential complications for a dental procedure.
Your output must be FDA-safe for informed consent.

Clinical context:
- Visit type: ${visitType || "Not specified"}
- Chief complaint: ${chiefComplaint || "Not documented"}
- Procedure category: ${procedureCategory}

SelectedRisks:
${riskContent}

Task:
- Generate a patient-facing list of risks based ONLY on SelectedRisks.
`.trim();
}

export function isRiskTextSafe(text: string): boolean {
  const BANNED_PHRASES = [
    "may fail",
    "failure rate",
    "likely to fail",
    "will need a root canal",
    "will need root canal",
    "will need extraction",
    "guaranteed",
    "ensure success",
    "success rate",
    "cure the condition"
  ];

  const lower = text.toLowerCase();
  return !BANNED_PHRASES.some((phrase) => lower.includes(phrase));
}
