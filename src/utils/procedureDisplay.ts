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
  
  // A name is technical (invalid as a primary human label) if it's empty, 
  // exactly matches the code, or contains known technical placeholders.
  const isTechnical = !name || 
                      name.trim() === '' || 
                      name === code || 
                      name === "Unknown Procedure" || 
                      name === "Needs label";

  // 1. If we already have a valid human-friendly name on the item, use it.
  if (!isTechnical) {
    return name!;
  }
  
  // 2. If technical/missing on item, try the authoritative Clinic Library.
  const effective = resolveEffectiveProcedure(code);
  if (effective && !effective.isLabelMissing) {
    return effective.displayName;
  }

  // 3. Final fallback strategy based on context.
  if (context === 'patient') {
    // In patient views, we must NEVER show "Needs label" or raw CDT codes.
    return "Treatment item";
  }
  
  // In staff views, we show the placeholder so they know to define it.
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
}
