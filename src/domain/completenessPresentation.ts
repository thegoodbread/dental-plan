import { CompletenessResult } from './CompletenessEngine';
import { CodeFamilyId, CODE_FAMILY_METADATA, getCodeFamiliesForCode } from './codeFamilies';
import { TreatmentPlanItem } from '../types';

export interface FamilyIssueGroup {
  familyId: CodeFamilyId | 'UNCLASSIFIED';
  label: string;
  description?: string;
  procedureCodes: string[];
  missing: string[];
  warnings: string[];
}

/**
 * Groups completeness issues by code family using the procedure list.
 *
 * Assumptions:
 * - Missing/warning messages often include the CDT code as a prefix, e.g.:
 *   "D4341: Perio chart flag required."
 * - We will parse the leading code token to assign each message to a family.
 */
export function groupCompletenessByFamily(
  result: CompletenessResult,
  procedures: TreatmentPlanItem[]
): FamilyIssueGroup[] {
  const groups: Record<string, FamilyIssueGroup> = {};

  // Helper to ensure group exists
  const getGroup = (id: CodeFamilyId | 'UNCLASSIFIED'): FamilyIssueGroup => {
    if (!groups[id]) {
      const meta = id !== 'UNCLASSIFIED' ? CODE_FAMILY_METADATA[id] : null;
      groups[id] = {
        familyId: id,
        label: meta ? meta.label : 'General / Unclassified',
        description: meta ? meta.description : 'Issues not associated with a recognized procedure family.',
        procedureCodes: [],
        missing: [],
        warnings: []
      };
    }
    return groups[id];
  };

  // 1. Process Messages (Missing)
  result.missing.forEach(msg => {
    const match = msg.match(/^(D\d{3,4})/);
    const code = match ? match[1] : null;
    
    if (code) {
      const families = getCodeFamiliesForCode(code);
      if (families.length > 0) {
        families.forEach(fam => {
          const g = getGroup(fam);
          g.missing.push(msg);
          if (!g.procedureCodes.includes(code)) g.procedureCodes.push(code);
        });
      } else {
        const g = getGroup('UNCLASSIFIED');
        g.missing.push(msg);
        if (!g.procedureCodes.includes(code)) g.procedureCodes.push(code);
      }
    } else {
      const g = getGroup('UNCLASSIFIED');
      g.missing.push(msg);
    }
  });

  // 2. Process Messages (Warnings)
  result.warnings.forEach(msg => {
    const match = msg.match(/^(D\d{3,4})/);
    const code = match ? match[1] : null;
    
    if (code) {
      const families = getCodeFamiliesForCode(code);
      if (families.length > 0) {
        families.forEach(fam => {
          const g = getGroup(fam);
          g.warnings.push(msg);
          if (!g.procedureCodes.includes(code)) g.procedureCodes.push(code);
        });
      } else {
        const g = getGroup('UNCLASSIFIED');
        g.warnings.push(msg);
        if (!g.procedureCodes.includes(code)) g.procedureCodes.push(code);
      }
    } else {
      const g = getGroup('UNCLASSIFIED');
      g.warnings.push(msg);
    }
  });

  // 3. Filter empty groups (except unclassified if it has non-code issues)
  const resultGroups = Object.values(groups).filter(g => 
    g.missing.length > 0 || g.warnings.length > 0
  );

  // 4. Sort: Defined families first, based on metadata definition order
  const familyOrder = Object.keys(CODE_FAMILY_METADATA);
  
  return resultGroups.sort((a, b) => {
    if (a.familyId === 'UNCLASSIFIED') return 1; // Unclassified last
    if (b.familyId === 'UNCLASSIFIED') return -1;
    
    const idxA = familyOrder.indexOf(a.familyId);
    const idxB = familyOrder.indexOf(b.familyId);
    return idxA - idxB;
  });
}