
import { TreatmentPlanItem } from "../types";
import { SoapSection } from "./dentalTypes";
import { PROCEDURE_NOTE_TEMPLATES, ProcedureNoteTemplate, SoapSectionId } from "./procedureNoteTemplates";

/**
 * Replaces {{key}} in template with value from context.
 */
export function hydrateTemplate(template: string, context: Record<string, string | undefined>): string {
  return template.replace(/{{\s*([\w_]+)\s*}}/g, (match, token) => {
    return context[token] || "";
  });
}

/**
 * Finds the most relevant template based on item properties.
 */
export function findTemplateForItem(item: TreatmentPlanItem): ProcedureNoteTemplate | undefined {
  const normCode = (item.procedureCode || "").toUpperCase();
  const normName = (item.procedureName || "").toLowerCase();

  return PROCEDURE_NOTE_TEMPLATES.find(t => {
    // 1. Check Code Match
    if (t.triggers.matchBy.includes('cdtCode') && t.triggers.cdtCodes) {
      if (t.triggers.cdtCodes.includes(normCode)) return true;
    }
    // 2. Check Name Match
    if (t.triggers.matchBy.includes('canonicalName') && t.triggers.canonicalNames) {
      // Check if any alias is contained in the procedure name
      if (t.triggers.canonicalNames.some(alias => normName.includes(alias.toLowerCase()))) {
        return true;
      }
    }
    return false;
  });
}

/**
 * Builds the dictionary of values for the template placeholders.
 */
export function buildTemplateContext(args: {
  item: TreatmentPlanItem;
  visitType?: string;
  selectedTeeth?: number[];
}): Record<string, string> {
  const { item } = args;
  
  // 1. Tooth List
  let toothList = "treated area";
  const teeth = args.selectedTeeth && args.selectedTeeth.length > 0 
    ? args.selectedTeeth 
    : (item.selectedTeeth || []);
    
  if (teeth.length > 0) {
    toothList = teeth.map(t => `#${t}`).join(", ");
  } else if (item.selectedQuadrants && item.selectedQuadrants.length > 0) {
    toothList = item.selectedQuadrants.join("/") + " quad";
  } else if (item.selectedArches && item.selectedArches.length > 0) {
    toothList = item.selectedArches.join(" ") + " arch";
  }

  // 2. Defaults
  return {
    tooth_list: toothList,
    visit_type_label: args.visitType || "dental visit",
    chief_complaint: "sensitivity to cold/sweets", // Default placeholder
    percussion_status: "WNL",
    palpation_status: "WNL",
    vitality_status: "vital",
    isolation_method: "rubber dam/isolation system",
    ... (item.procedureName ? { procedure_name: item.procedureName } : {})
  };
}

/**
 * Merges the template into existing SOAP sections.
 */
export function applyTemplateToSoapSections(params: {
  item: TreatmentPlanItem;
  visitType?: string;
  selectedTeeth?: number[];
  existingSections: SoapSection[];
}): { updatedSections: SoapSection[]; usedTemplateId?: string } {
  const { item, existingSections } = params;
  
  const template = findTemplateForItem(item);
  
  if (!template) {
    return { updatedSections: existingSections };
  }

  const context = buildTemplateContext({
    item,
    visitType: template.visitType,
    selectedTeeth: params.selectedTeeth
  });

  const updatedSections = existingSections.map(section => {
    // Determine which part of the template maps to this section ID
    let templatePart;
    if (section.type === 'SUBJECTIVE') templatePart = template.soap.subjective;
    else if (section.type === 'OBJECTIVE') templatePart = template.soap.objective;
    else if (section.type === 'ASSESSMENT') templatePart = template.soap.assessment;
    else if (section.type === 'PLAN') templatePart = template.soap.plan;
    
    // Treatment Performed is usually mapped from objective or separate, but we can map PLAN to it if needed.
    // For this engine, we stick to strict S-O-A-P mapping.
    
    if (!templatePart || !templatePart.template) {
      return section;
    }

    const hydratedText = hydrateTemplate(templatePart.template, context);
    
    // Append logic
    let newContent = section.content;
    if (!newContent) {
      newContent = hydratedText;
    } else {
      // Avoid duplicating if exactly same text exists (basic check)
      if (!newContent.includes(hydratedText)) {
        newContent = `${newContent}\n\n${hydratedText}`;
      }
    }

    return {
      ...section,
      content: newContent,
      lastEditedAt: new Date().toISOString()
    };
  });

  return { updatedSections, usedTemplateId: template.id };
}
