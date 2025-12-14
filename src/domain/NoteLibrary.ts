

// NoteLibrary.ts
// Defines templates for deterministic SOAP note generation.

export interface ProcedureSoapTemplate {
  subjective?: string;
  objective?: string;
  assessment?: string;
  plan?: string;
}

export const NOTE_LIBRARY: Record<string, ProcedureSoapTemplate> = {
  // Crowns
  D2740: {
    subjective: "Patient presents for crown preparation on #{{tooth}}.",
    objective: "Tooth #{{tooth}} prepared for full coverage ceramic crown. Margins: Chamfer. Reduction: Adequate for material. Caries removal: Complete.",
    assessment: "Tooth #{{tooth}}: Compromised structural integrity requiring full coverage restoration.",
    plan: "Crown preparation completed on #{{tooth}}. Impression/Scan taken. Temporary crown fabricated and cemented with temporary cement. Occlusion verified."
  },
  D2750: {
    subjective: "Patient presents for crown preparation on #{{tooth}}.",
    objective: "Tooth #{{tooth}} prepared for PFM crown. Margins: Shoulder/Chamfer.",
    assessment: "Tooth #{{tooth}} requires full coverage restoration.",
    plan: "Crown prep #{{tooth}}. Impression taken. Temp placed."
  },
  
  // Endodontics
  D3330: {
    subjective: "Patient reports symptoms consistent with pulpitis on #{{tooth}}.",
    objective: "Endodontic therapy initiated on #{{tooth}}. Canals located: {{canals_found}}.",
    assessment: "Pulpal and periapical diagnosis consistent with need for endodontic treatment on #{{tooth}}.",
    plan: "RCT performed on #{{tooth}}. Canals cleaned, shaped, and obturated. Temporary restoration placed."
  },
  D3310: {
    subjective: "Patient presents for anterior root canal #{{tooth}}.",
    objective: "Isolation achieved. Access gained to pulp chamber #{{tooth}}.",
    assessment: "Non-vital pulp / Irreversible pulpitis #{{tooth}}.",
    plan: "RCT completed #{{tooth}}. Gutta percha obturation."
  },

  // Restorative
  D2391: {
    subjective: "Patient presents for composite restoration #{{tooth}}.",
    objective: "Caries removed from #{{tooth}} {{surfaces}}.",
    assessment: "Caries #{{tooth}} {{surfaces}}.",
    plan: "Composite restoration placed #{{tooth}} {{surfaces}}. Etch, bond, composite resin. Cured and polished."
  },
  D2392: {
    subjective: "Patient presents for composite restoration #{{tooth}}.",
    objective: "Caries removed from #{{tooth}} {{surfaces}}.",
    assessment: "Caries #{{tooth}} {{surfaces}}.",
    plan: "Composite restoration placed #{{tooth}} {{surfaces}}. Etch, bond, composite resin. Cured and polished."
  },
  D2393: {
    subjective: "Patient presents for composite restoration #{{tooth}}.",
    objective: "Caries removed from #{{tooth}} {{surfaces}}.",
    assessment: "Caries #{{tooth}} {{surfaces}}.",
    plan: "Composite restoration placed #{{tooth}} {{surfaces}}. Etch, bond, composite resin. Cured and polished."
  },
  D2394: {
    subjective: "Patient presents for composite restoration #{{tooth}}.",
    objective: "Caries removed from #{{tooth}} {{surfaces}}.",
    assessment: "Caries #{{tooth}} {{surfaces}}.",
    plan: "Composite restoration placed #{{tooth}} {{surfaces}}. Etch, bond, composite resin. Cured and polished."
  },

  // Extractions
  D7140: {
    subjective: "Patient presents for extraction of #{{tooth}}.",
    objective: "Tooth #{{tooth}} is non-restorable.",
    assessment: "Non-restorable tooth #{{tooth}}.",
    plan: "Simple extraction #{{tooth}}. Hemostasis achieved."
  },
  D7210: {
    subjective: "Patient presents for surgical extraction of #{{tooth}}.",
    objective: "Surgical access required for #{{tooth}}.",
    assessment: "Tooth #{{tooth}} requires surgical removal.",
    plan: "Surgical extraction #{{tooth}} with flap reflection and bone removal. Sutures placed."
  },

  // Implants
  D6010: {
    subjective: "Patient presents for implant placement #{{tooth}}.",
    objective: "Site #{{tooth}} prepared for implant fixture.",
    assessment: "Missing tooth #{{tooth}}.",
    plan: "Implant placed at site #{{tooth}}. Primary stability achieved. Cover screw/healing abutment placed."
  },

  // Hygiene
  D1110: {
    subjective: "Patient presents for adult prophylaxis.",
    objective: "Generalized plaque and calculus noted.",
    assessment: "Gingivitis / Periodontal health maintenance.",
    plan: "Adult prophylaxis performed. Scale and polish. OHI given."
  },
  D4341: {
    subjective: "Patient presents for SRP {{quadrant}}.",
    objective: "Subgingival calculus noted in {{quadrant}}.",
    assessment: "Periodontitis requiring SRP.",
    plan: "SRP performed {{quadrant}}. Anesthesia administered."
  }
};