
import { NoteEngineProcedureInput, SoapSection, VisitType } from "./dentalTypes";
import { PROCEDURE_NOTE_TEMPLATES, ProcedureNoteTemplate } from "./procedureNoteTemplates";

// Friendly labels for template tokens
export const VISIT_LABELS: Record<VisitType, string> = {
  restorative: 'Restorative',
  endo: 'Endodontic',
  hygiene: 'Hygiene',
  exam: 'Exam',
  surgery: 'Surgical',
  ortho: 'Orthodontic',
  other: 'Other'
};

function normalizeVisitType(v: string | VisitType): VisitType {
  const allowed: VisitType[] = ['restorative', 'endo', 'hygiene', 'exam', 'surgery', 'ortho', 'other'];
  if (!(allowed as string[]).includes(v)) {
    throw new Error(`Invalid visitType passed to applyTemplateToSoapSections: ${v}`);
  }
  return v as VisitType;
}

export function hydrateTemplate(template: string, context: Record<string, string | undefined>): string {
  return template.replace(/{{\s*([\w_]+)\s*}}/g, (match, token) => {
    return context[token] || "";
  });
}

export function findTemplateForItem(item: NoteEngineProcedureInput): ProcedureNoteTemplate | undefined {
  const normCode = (item.procedureCode || "").toUpperCase();
  const normName = (item.procedureName || "").toLowerCase();

  return PROCEDURE_NOTE_TEMPLATES.find(t => {
    if (t.triggers.matchBy.includes('cdtCode') && t.triggers.cdtCodes) {
      if (t.triggers.cdtCodes.includes(normCode)) return true;
    }
    if (t.triggers.matchBy.includes('canonicalName') && t.triggers.canonicalNames) {
      if (t.triggers.canonicalNames.some(alias => normName.includes(alias.toLowerCase()))) {
        return true;
      }
    }
    return false;
  });
}

export function buildTemplateContext(args: {
  item: NoteEngineProcedureInput;
  visitType: VisitType;
  selectedTeeth?: number[];
}): Record<string, string> {
  const { item } = args;
  
  let toothList = "treated area";
  const teeth = args.selectedTeeth && args.selectedTeeth.length > 0 
    ? args.selectedTeeth 
    : (item.selectedTeeth ? item.selectedTeeth.map(t => Number(t)) : []);
    
  if (teeth.length > 0) {
    toothList = teeth.map(t => `#${t}`).join(", ");
  } else if (item.selectedQuadrants && item.selectedQuadrants.length > 0) {
    toothList = item.selectedQuadrants.join("/") + " quad";
  } else if (item.selectedArches && item.selectedArches.length > 0) {
    toothList = item.selectedArches.join(" ") + " arch";
  }

  const context: Record<string, string> = {
    tooth_list: toothList,
    visit_type_label: VISIT_LABELS[args.visitType] || args.visitType,
    chief_complaint: "sensitivity to cold/sweets",
    percussion_status: "WNL",
    palpation_status: "WNL",
    vitality_status: "vital",
    isolation_method: "rubber dam/isolation system",
  };

  if (item.procedureName) {
    context.procedure_name = item.procedureName;
  }

  return context;
}

export function applyTemplateToSoapSections(params: {
  item: NoteEngineProcedureInput;
  visitType: VisitType;
  selectedTeeth?: number[];
  existingSections: SoapSection[];
}): { updatedSections: SoapSection[]; usedTemplateId?: string } {
  const { item, existingSections, visitType } = params;
  
  const template = findTemplateForItem(item);
  
  if (!template) {
    return { updatedSections: existingSections };
  }

  const effectiveVisitType = normalizeVisitType(visitType);

  const context = buildTemplateContext({
    item,
    visitType: effectiveVisitType,
    selectedTeeth: params.selectedTeeth
  });

  let procedureLabel = item.procedureName || "Procedure";
  if (context.tooth_list && context.tooth_list !== "treated area") {
      procedureLabel += ` ${context.tooth_list}`;
  } else if (item.selectedTeeth && item.selectedTeeth.length > 0) {
      procedureLabel += ` #${item.selectedTeeth.join(",")}`;
  }

  const updatedSections = existingSections.map(section => {
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

    let newContent = section.content || "";
    
    if (!newContent.trim()) {
        newContent = hydratedText;
    } else {
        const header = `— ${procedureLabel} —`;
        const blockToAppend = `\n\n${header}\n${hydratedText}`;
        
        const lastEditedTime = section.lastEditedAt ? new Date(section.lastEditedAt).getTime() : 0;
        const now = Date.now();
        const isRecent = (now - lastEditedTime) < 500;

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
