import { TreatmentPlanItem } from "../types";
import { SoapSection, VisitType } from "./dentalTypes";
import { PROCEDURE_NOTE_TEMPLATES, ProcedureNoteTemplate } from "./procedureNoteTemplates";

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
  visitType?: VisitType;
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

  // 2. Build Base Context
  const context: Record<string, string> = {
    tooth_list: toothList,
    visit_type_label: args.visitType || "dental visit", // Use passed visitType
    chief_complaint: "sensitivity to cold/sweets",
    percussion_status: "WNL",
    palpation_status: "WNL",
    vitality_status: "vital",
    isolation_method: "rubber dam/isolation system",
  };

  // 3. Conditional Additions
  if (item.procedureName) {
    context.procedure_name = item.procedureName;
  }

  return context;
}

/**
 * Merges the template into existing SOAP sections.
 * STRICTLY APPENDS. Never overwrites.
 * Implements duplicate guarding for rapid clicks.
 */
export function applyTemplateToSoapSections(params: {
  item: TreatmentPlanItem;
  visitType?: VisitType;
  selectedTeeth?: number[];
  existingSections: SoapSection[];
}): { updatedSections: SoapSection[]; usedTemplateId?: string } {
  const { item, existingSections, visitType } = params;
  
  const template = findTemplateForItem(item);
  
  if (!template) {
    return { updatedSections: existingSections };
  }

  // Ensure we use the passed-in visitType, falling back to template default or string
  const effectiveVisitType = (visitType || template.visitType || 'restorative') as VisitType;

  const context = buildTemplateContext({
    item,
    visitType: effectiveVisitType,
    selectedTeeth: params.selectedTeeth
  });

  // Construct label for the append block header
  let procedureLabel = item.procedureName || "Procedure";
  if (context.tooth_list && context.tooth_list !== "treated area") {
      procedureLabel += ` ${context.tooth_list}`;
  } else if (item.selectedTeeth && item.selectedTeeth.length > 0) {
      procedureLabel += ` #${item.selectedTeeth.join(",")}`;
  }

  const updatedSections = existingSections.map(section => {
    // Determine which part of the template maps to this section ID
    let templatePart;
    if (section.type === 'SUBJECTIVE') templatePart = template.soap.subjective;
    else if (section.type === 'OBJECTIVE') templatePart = template.soap.objective;
    else if (section.type === 'ASSESSMENT') templatePart = template.soap.assessment;
    else if (section.type === 'PLAN') templatePart = template.soap.plan;
    
    if (!templatePart || !templatePart.template) {
      return section;
    }

    const hydratedText = hydrateTemplate(templatePart.template, context).trim();
    
    if (!hydratedText) {
      return section;
    }

    // Append logic
    let newContent = section.content || "";
    
    // Rule: First procedure = fill empty sections (full template, no header)
    if (!newContent.trim()) {
        newContent = hydratedText;
    } else {
        // Rule: Always append with distinct header if content exists
        // Format: — <ProcedureName> #<teeth> —\n<text>
        const header = `— ${procedureLabel} —`;
        const blockToAppend = `\n\n${header}\n${hydratedText}`;
        
        // Duplicate Guard: Prevent double-click spam (within 500ms)
        // We check if the exact block text is already at the end of the content
        const lastEditedTime = section.lastEditedAt ? new Date(section.lastEditedAt).getTime() : 0;
        const now = Date.now();
        const isRecent = (now - lastEditedTime) < 500; // 500ms threshold

        // If the exact same block is already at the end AND it was added very recently, skip
        if (isRecent && newContent.endsWith(blockToAppend.trim())) {
             return section; 
        }
        
        newContent = newContent + blockToAppend;
    }

    return {
      ...section,
      content: newContent,
      lastEditedAt: new Date().toISOString()
    };
  });

  return { updatedSections, usedTemplateId: template.id };
}