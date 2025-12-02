/**
 * RiskEngine.ts
 * 
 * Domain logic for managing dental procedure risks, generating informed consent content,
 * and building safe prompts for AI summarization.
 */

export type ProcedureCategory =
  | "direct_restoration"      // fillings, composite, amalgam
  | "indirect_restoration"    // crown, onlay, inlay
  | "endo"                    // root canal
  | "extraction_simple"
  | "extraction_surgical"
  | "implant_surgery"
  | "hygiene_scaling"
  | "anesthesia_local"
  | "other";

export type RiskSeverity = "common" | "uncommon" | "rare" | "very_rare";

/**
 * Represents a single, pre-approved risk statement for informed consent.
 */
export interface RiskItem {
  id: string;
  category: ProcedureCategory;
  severity: RiskSeverity;
  /** Plain, patient-facing wording (e.g. "Temporary discomfort...") */
  bulletText: string;
  /** Optional tags for UI filtering or grouping */
  tags?: string[];
  /** Whether this risk is typically checked by default for the procedure */
  activeByDefault: boolean;
}

// --- RISK LIBRARY ---

export const RISK_LIBRARY: RiskItem[] = [
  // 1. Direct Restoration (Fillings)
  {
    id: "rest_pain_common",
    category: "direct_restoration",
    severity: "common",
    activeByDefault: true,
    bulletText: "Temporary discomfort or soreness in the treated area.",
    tags: ["pain", "post-op"]
  },
  {
    id: "rest_sensitivity_common",
    category: "direct_restoration",
    severity: "common",
    activeByDefault: true,
    bulletText: "Post-procedure sensitivity to temperature or pressure.",
    tags: ["sensitivity"]
  },
  {
    id: "rest_occlusion_uncommon",
    category: "direct_restoration",
    severity: "uncommon",
    activeByDefault: true,
    bulletText: "Filling may feel high and require adjustment if bite feels uneven.",
    tags: ["bite", "adjustment"]
  },
  {
    id: "rest_pulp_rare",
    category: "direct_restoration",
    severity: "rare",
    activeByDefault: false,
    bulletText: "Deep decay or trauma may impact the nerve, potentially requiring further evaluation or treatment.",
    tags: ["nerve_risk"]
  },

  // 2. Extraction (Simple)
  {
    id: "ext_pain_common",
    category: "extraction_simple",
    severity: "common",
    activeByDefault: true,
    bulletText: "Post-procedure discomfort, swelling, and bruising.",
    tags: ["pain", "swelling"]
  },
  {
    id: "ext_bleeding_common",
    category: "extraction_simple",
    severity: "common",
    activeByDefault: true,
    bulletText: "Minor bleeding or oozing from the site for the first 24 hours.",
    tags: ["bleeding"]
  },
  {
    id: "ext_dry_socket_uncommon",
    category: "extraction_simple",
    severity: "uncommon",
    activeByDefault: true,
    bulletText: "Risk of dry socket (delayed healing) if clot is dislodged.",
    tags: ["dry_socket"]
  },
  {
    id: "ext_numbness_rare",
    category: "extraction_simple",
    severity: "rare",
    activeByDefault: true,
    bulletText: "Rarely, there is a risk of temporary or permanent numbness or tingling in the lips, tongue, or surrounding areas.",
    tags: ["numbness", "nerve"]
  },

  // 3. Indirect Restoration (Crowns)
  {
    id: "crown_sens_common",
    category: "indirect_restoration",
    severity: "common",
    activeByDefault: true,
    bulletText: "Sensitivity to temperature while the temporary restoration is in place.",
    tags: ["sensitivity", "temp"]
  },
  {
    id: "crown_gum_common",
    category: "indirect_restoration",
    severity: "common",
    activeByDefault: true,
    bulletText: "Minor gum tenderness or bleeding around the preparation site.",
    tags: ["gums"]
  },
  {
    id: "crown_temp_off_uncommon",
    category: "indirect_restoration",
    severity: "uncommon",
    activeByDefault: true,
    bulletText: "Possibility of the temporary crown coming loose or breaking.",
    tags: ["temp_failure"]
  },
  {
    id: "crown_nerve_risk",
    category: "indirect_restoration",
    severity: "uncommon",
    activeByDefault: true,
    bulletText: "Preparation may impact the nerve, which may require further evaluation or additional treatment.",
    tags: ["nerve_risk"]
  },

  // 4. Endodontics (Root Canal)
  {
    id: "endo_sore_common",
    category: "endo",
    severity: "common",
    activeByDefault: true,
    bulletText: "Tenderness upon chewing for several days following treatment.",
    tags: ["pain"]
  },
  {
    id: "endo_outcome_uncommon",
    category: "endo",
    severity: "uncommon",
    activeByDefault: true,
    bulletText: "Possibility that the infection may persist or recur, which may require further evaluation or additional care.",
    tags: ["outcome"]
  },
  {
    id: "endo_fracture_rare",
    category: "endo",
    severity: "rare",
    activeByDefault: true,
    bulletText: "Risk of tooth fracture if the tooth is not adequately restored in a timely manner.",
    tags: ["fracture"]
  },

  // 5. Hygiene / Scaling
  {
    id: "hyg_sens_common",
    category: "hygiene_scaling",
    severity: "common",
    activeByDefault: true,
    bulletText: "Temporary sensitivity to cold or touch after cleaning.",
    tags: ["sensitivity"]
  },
  {
    id: "hyg_bleed_common",
    category: "hygiene_scaling",
    severity: "common",
    activeByDefault: true,
    bulletText: "Minor bleeding from the gums for a short time after the procedure.",
    tags: ["bleeding"]
  },

  // 6. Implant Surgery
  {
    id: "imp_integration_uncommon",
    category: "implant_surgery",
    severity: "uncommon",
    activeByDefault: true,
    bulletText: "Possibility that the implant may not integrate with the bone as expected.",
    tags: ["integration"]
  },
  {
    id: "imp_nerve_rare",
    category: "implant_surgery",
    severity: "rare",
    activeByDefault: true,
    bulletText: "Injury to adjacent teeth or nerves resulting in temporary or permanent numbness.",
    tags: ["nerve"]
  }
];

const SEVERITY_ORDER: Record<RiskSeverity, number> = {
  common: 1,
  uncommon: 2,
  rare: 3,
  very_rare: 4,
};

// --- HELPER FUNCTIONS ---

/**
 * Retrieves all defined risks for a specific procedure category.
 * Sorted by: Active By Default (true first) -> Severity (Common to Rare).
 */
export function getRisksForCategory(category: ProcedureCategory): RiskItem[] {
  return RISK_LIBRARY
    .filter((r) => r.category === category)
    .sort((a, b) => {
      // 1. Active by default first
      if (a.activeByDefault !== b.activeByDefault) {
        return a.activeByDefault ? -1 : 1;
      }
      // 2. Severity order
      return SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
    });
}

/**
 * Converts a list of selected RiskItems into a simple markdown bullet list string.
 */
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

/**
 * Constructs a safe prompt for Google AI to refine the risk list.
 * STRICTLY constrains the model to use only the provided risk content.
 */
export function buildRiskPromptForGoogleAI(options: BuildRiskPromptOptions): string {
  const { visitType, chiefComplaint, procedureCategory, selectedRisks } = options;

  const riskContent = selectedRisks
    .map((r, idx) => `  ${idx + 1}. ${r.bulletText}`)
    .join("\n");

  return `
You are assisting a dentist in documenting risks and potential complications for a dental procedure.
Your output must be FDA-safe for informed consent.

Forbidden concepts (NEVER generate or allow):
- Prognosis language (“success rate”, “guaranteed result”, “cure”, “will improve”, “will not come back”).
- Predicting specific future treatment (“will need a root canal”, “will require extraction”).
- Failure forecasting (“may fail”, “likely to fail”).
- Numeric or probabilistic success (“95% success”).
- Overpromising outcomes (“permanent fix”).
- Definitive diagnostic statements.
- Any new risk that is not clinically general and neutral.

Allowed language:
- Neutral, descriptive, patient-friendly risks such as: Temporary discomfort, Sensitivity, Minor bleeding, Rare allergic reactions, Rare numbness.
- Phrased with: “temporary,” “in some cases,” “rarely,” “there is a risk of…”

Clinical context (for tone only, do NOT invent new clinical facts):
- Visit type: ${visitType || "Not specified"}
- Chief complaint: ${chiefComplaint || "Not documented"}
- Procedure category: ${procedureCategory}

SelectedRisks (the ONLY source of risk content you may use):
${riskContent}

Task:
- Using ONLY the information in "SelectedRisks", generate a clean, patient-facing list of 3–6 bullet points.
- You may lightly adjust wording for clarity and flow, but you may NOT change the meaning or introduce new ideas.
- End with a single sentence stating that the patient had an opportunity to ask questions and that alternative treatment options were discussed.

Format:
- Return plain text only.
- Use markdown-style bullets ("* ") followed by each risk.
- Then on a new line, add the final sentence.
`.trim();
}

export type BuildPlanPromptOptions = {
  visitType?: string;
  chiefComplaint?: string;
  treatmentPerformedText?: string;
  riskBulletsText: string;
};

/**
 * Constructs a prompt to generate the "Plan" (P:) section of a SOAP note,
 * wrapping the risk bullets in a cohesive narrative.
 */
export function buildPlanPromptForSoapPlan(options: BuildPlanPromptOptions): string {
  const {
    visitType,
    chiefComplaint,
    treatmentPerformedText,
    riskBulletsText,
  } = options;

  return `
You are assisting a dentist in drafting the Plan (P:) portion of a SOAP note.

Safety guardrails (follow EXACTLY):
- Do NOT invent or add any new risks or treatments.
- Use ONLY the risk information and wording given in "RiskBullets".
- Do NOT mention success rates, failure rates, or prognosis.
- Do NOT say the tooth or condition "may worsen" or "may fail".
- Do NOT predict that the patient will need specific future treatment
  (e.g., root canal, extraction, implant, retreatment).
- Do NOT make definitive diagnostic statements.
- Do NOT mention AI, automation, or that this is a draft.

Forbidden concepts (NEVER generate):
- "Success rate", "guaranteed", "cure", "permanent fix".
- "Will need root canal", "will require extraction".
- "Likely to fail", "may fail".
- Any specific outcome prediction.

Clinical context (for tone only, do not invent facts):
- Visit type: ${visitType || "Not specified"}
- Chief complaint: ${chiefComplaint || "Not documented"}
- Treatment performed today: ${treatmentPerformedText || "No definitive treatment performed at this visit."}

RiskBullets (ONLY source of risk content):
${riskBulletsText}

Task:
- Draft a single paragraph for the SOAP Plan (P:) section that:
  - States whether definitive treatment was performed today or deferred.
  - Summarizes that potential risks and complications were discussed, using ONLY the ideas from RiskBullets.
  - States that the patient had an opportunity to ask questions and that alternative treatment options were discussed.
- Keep the paragraph neutral, clinical, and concise.
- Do NOT repeat each bullet verbatim; instead, integrate them into a coherent paragraph.

Format:
- Return only the Plan line in this format (no extra labels):
P: <your paragraph here>
`.trim();
}

/**
 * Simple red-flag scanner to catch unsafe predictive phrases in AI output.
 * Returns false if any banned phrase is found.
 */
export function isRiskTextSafe(text: string): boolean {
  const BANNED_PHRASES = [
    "may fail",
    "failure rate",
    "likely to fail",
    "will need a root canal",
    "will need root canal",
    "will need extraction",
    "will eventually need",
    "guaranteed",
    "ensure success",
    "success rate",
    "cure the condition",
    "will not come back",
  ];

  const lower = text.toLowerCase();
  return !BANNED_PHRASES.some((phrase) => lower.includes(phrase));
}
