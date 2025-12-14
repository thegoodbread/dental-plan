export type CodeFamilyId =
  | 'EXAM'
  | 'RADIOGRAPH'
  | 'DIRECT_RESTORATIVE'
  | 'CROWN_INDIRECT'
  | 'ENDO'
  | 'EXTRACTION'
  | 'PERIO_THERAPY'
  | 'PERIO_MAINTENANCE'
  | 'PROPHY'
  | 'FLUORIDE'
  | 'SEALANT'
  | 'IMPLANT'
  | 'GRAFT'
  | 'SEDATION';

export interface CodeFamilyMeta {
  id: CodeFamilyId;
  label: string;
  description: string;
  typicalCodes: string[];
  codePattern: RegExp;
  dxRequired: boolean;
  riskRecommended: boolean;
  visitLevelDependencies: string[];
}

export const CODE_FAMILY_METADATA: Record<CodeFamilyId, CodeFamilyMeta> = {
  EXAM: {
    id: 'EXAM',
    label: 'Exam / Evaluation',
    description: 'Periodic, comprehensive, and problem-focused exams.',
    typicalCodes: ['D0120', 'D0150', 'D0140', 'D0180'],
    codePattern: /^D01/,
    dxRequired: true,
    riskRecommended: false,
    visitLevelDependencies: ['Chief Complaint', 'HPI (for problem-focused exams)'],
  },
  RADIOGRAPH: {
    id: 'RADIOGRAPH',
    label: 'Radiographs',
    description: 'Intraoral, bitewing, and other diagnostic radiographic images.',
    typicalCodes: ['D0210', 'D0220', 'D0230', 'D0272', 'D0274'],
    codePattern: /^D02/,
    dxRequired: false,
    riskRecommended: false,
    visitLevelDependencies: ['Radiographic findings in Objective section'],
  },
  DIRECT_RESTORATIVE: {
    id: 'DIRECT_RESTORATIVE',
    label: 'Direct Restorative (Fillings)',
    description: 'Amalgam, composite, and other direct restorations.',
    typicalCodes: ['D2140', 'D2330', 'D2391', 'D2392', 'D2393', 'D2394'],
    // Matches D20xx - D26xx. Excludes D27xx (Crowns) and D29xx (Veneers/Other Indirect)
    codePattern: /^D2[0-6]/,
    dxRequired: true,
    riskRecommended: true,
    visitLevelDependencies: ['Caries assessment'],
  },
  CROWN_INDIRECT: {
    id: 'CROWN_INDIRECT',
    label: 'Crowns & Indirect',
    description: 'Crowns, veneers, onlays, and other indirect restorations.',
    typicalCodes: ['D2740', 'D2750', 'D2790', 'D2950'],
    // Matches D27xx - D29xx
    codePattern: /^D2[7-9]/,
    dxRequired: true,
    riskRecommended: true,
    visitLevelDependencies: ['Pre-op X-ray', 'Radiographic justification'],
  },
  ENDO: {
    id: 'ENDO',
    label: 'Endodontics',
    description: 'Root canal therapy and related procedures.',
    typicalCodes: ['D3310', 'D3320', 'D3330', 'D3220'],
    codePattern: /^D3/,
    dxRequired: true,
    riskRecommended: true,
    visitLevelDependencies: ['Diagnostic tests', 'Pre-op X-ray'],
  },
  EXTRACTION: {
    id: 'EXTRACTION',
    label: 'Oral Surgery / Extractions',
    description: 'Simple and surgical extractions.',
    typicalCodes: ['D7140', 'D7210', 'D7220'],
    // Excludes D79xx (Grafts) to separate them
    codePattern: /^D7[0-8]/,
    dxRequired: true,
    riskRecommended: true,
    visitLevelDependencies: ['Pre-op X-ray', 'Consent'],
  },
  PERIO_THERAPY: {
    id: 'PERIO_THERAPY',
    label: 'Periodontal Therapy (SRP/Surgical)',
    description: 'Scaling and root planing and surgical periodontal treatments.',
    typicalCodes: ['D4341', 'D4342', 'D4260'],
    codePattern: /^D4[0-3,5-8]/, // Matches most D4xxx except D4910
    dxRequired: true,
    riskRecommended: true,
    visitLevelDependencies: ['Perio Charting', 'Bone loss description'],
  },
  PERIO_MAINTENANCE: {
    id: 'PERIO_MAINTENANCE',
    label: 'Periodontal Maintenance',
    description: 'Maintenance following periodontal therapy.',
    typicalCodes: ['D4910'],
    codePattern: /^D4910/,
    dxRequired: false,
    riskRecommended: false,
    visitLevelDependencies: ['Perio Charting (Annual)'],
  },
  PROPHY: {
    id: 'PROPHY',
    label: 'Prophylaxis',
    description: 'Routine cleaning for adults and children.',
    typicalCodes: ['D1110', 'D1120'],
    codePattern: /^D11/,
    dxRequired: false,
    riskRecommended: false,
    visitLevelDependencies: [],
  },
  FLUORIDE: {
    id: 'FLUORIDE',
    label: 'Fluoride',
    description: 'Topical fluoride applications.',
    typicalCodes: ['D1206', 'D1208'],
    codePattern: /^D12/,
    dxRequired: false,
    riskRecommended: false,
    visitLevelDependencies: [],
  },
  SEALANT: {
    id: 'SEALANT',
    label: 'Sealants',
    description: 'Pit and fissure sealants.',
    typicalCodes: ['D1351'],
    codePattern: /^D135/,
    dxRequired: false,
    riskRecommended: false,
    visitLevelDependencies: [],
  },
  IMPLANT: {
    id: 'IMPLANT',
    label: 'Implants',
    description: 'Surgical implant placement and related services.',
    typicalCodes: ['D6010', 'D6013', 'D6059'],
    codePattern: /^D60/,
    dxRequired: true,
    riskRecommended: true,
    visitLevelDependencies: ['Pre-op X-ray/CBCT', 'Bone availability'],
  },
  GRAFT: {
    id: 'GRAFT',
    label: 'Bone/Tissue Grafts',
    description: 'Bone grafts and membrane barriers.',
    typicalCodes: ['D7953', 'D4266'], 
    // Captures D79xx. Note: D4266 is Perio, might fall under PERIO_THERAPY depending on regex above. 
    // Prioritizing D79 as main Graft family per prompts engine logic.
    codePattern: /^D79/, 
    dxRequired: true,
    riskRecommended: true,
    visitLevelDependencies: [],
  },
  SEDATION: {
    id: 'SEDATION',
    label: 'Sedation / Anesthesia',
    description: 'Nitrous oxide, IV sedation, and general anesthesia.',
    typicalCodes: ['D9230', 'D9243'],
    codePattern: /^D92/,
    dxRequired: true,
    riskRecommended: true,
    visitLevelDependencies: ['Vitals monitoring', 'Sedation record'],
  },
};

export function getCodeFamiliesForCode(code: string): CodeFamilyId[] {
  const normalized = code.toUpperCase();
  const families: CodeFamilyId[] = [];
  (Object.values(CODE_FAMILY_METADATA) as CodeFamilyMeta[]).forEach(meta => {
    if (meta.codePattern.test(normalized)) {
      families.push(meta.id);
    }
  });
  return families;
}