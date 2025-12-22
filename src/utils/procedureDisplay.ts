import { TreatmentPlanItem } from '../types';
import { resolveEffectiveProcedure } from '../domain/procedureResolver';

/**
 * Returns a primary human label for a procedure, respecting the UI context.
 * 
 * @param context 'staff' for clinical app views, 'patient' for share links/previews.
 */
export const getProcedurePrimaryLabel = (item: TreatmentPlanItem, context: 'staff' | 'patient' = 'staff'): string => {
  const name = item.procedureName;
  const code = item.procedureCode;
  
  // Non-technical name check
  const isValidHumanName = (n: string | undefined) => 
    n && n.trim() !== '' && n !== code && n !== "Unknown Procedure" && n !== "Needs label";

  if (isValidHumanName(name)) {
    return name!;
  }
  
  const effective = resolveEffectiveProcedure(code);
  if (effective && !effective.isLabelMissing) {
    return effective.displayName;
  }

  // Final fallback strategy
  if (context === 'patient') {
    return "Treatment item";
  }
  
  return "Needs label";
};

/**
 * Legacy wrapper for backward compatibility.
 */
export const getProcedureDisplayName = (item: TreatmentPlanItem): string => {
  return getProcedurePrimaryLabel(item, 'staff');
};

/**
 * Returns the technical CDT code for secondary metadata display.
 */
export const getProcedureDisplayCode = (item: TreatmentPlanItem): string | null => {
  return item.procedureCode || null;
};
