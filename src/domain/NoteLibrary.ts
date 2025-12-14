
// NoteLibrary.ts
// Defines templates for deterministic SOAP note generation.

export interface ProcedureSoapTemplate {
  subjective?: string;
  objective?: string;
  assessment?: string;
  plan?: string;
}

export const NOTE_LIBRARY: Record<string, ProcedureSoapTemplate> = {
  // --- DEFAULTS ---
  DEFAULT: {
    subjective: "Patient presents for {{procedure}} on {{tooth}}.",
    objective: "Clinical exam reveals need for {{procedure}} on {{tooth}}.",
    assessment: "Diagnosed condition requiring {{procedure}}.",
    plan: "Performed {{procedure}}. Post-op instructions given."
  },

  // --- CROWNS & BRIDGE (D27xx, D62xx, D67xx) ---
  D2740: {
    subjective: "Patient presents for crown preparation on #{{tooth}} due to compromised tooth structure.",
    objective: "Tooth #{{tooth}} prepared for full coverage ceramic crown. Margins: Chamfer. Reduction: Adequate. Caries removal: Complete.",
    assessment: "Tooth #{{tooth}}: Compromised structural integrity requiring full coverage restoration.",
    plan: "Crown preparation completed on #{{tooth}}. Impression/Scan taken. Temporary crown fabricated and cemented. Occlusion verified."
  },
  D2750: {
    subjective: "Patient presents for PFM crown preparation on #{{tooth}}.",
    objective: "Tooth #{{tooth}} prepared for PFM crown. Margins: Shoulder/Chamfer. Caries removed.",
    assessment: "Tooth #{{tooth}} requires full coverage PFM restoration.",
    plan: "Crown prep #{{tooth}}. Impression taken. Temp placed with temp cement."
  },
  D2790: {
    subjective: "Patient presents for full cast crown prep #{{tooth}}.",
    objective: "Tooth #{{tooth}} prepared for full cast crown. Margins: Chamfer.",
    assessment: "Tooth #{{tooth}} requires full coverage cast restoration.",
    plan: "Crown prep #{{tooth}}. Impression taken. Temp placed."
  },
  
  // --- ENDODONTICS (D3xxx) ---
  D3330: {
    subjective: "Patient reports symptoms consistent with pulpitis on molar #{{tooth}}.",
    objective: "Endodontic therapy initiated on #{{tooth}}. Canals located and instrumented.",
    assessment: "Irreversible pulpitis / Necrotic pulp #{{tooth}}.",
    plan: "RCT performed on #{{tooth}}. Canals cleaned, shaped, and obturated with gutta percha. Temporary restoration placed."
  },
  D3320: {
    subjective: "Patient presents for premolar root canal #{{tooth}}.",
    objective: "Isolation achieved. Access gained to pulp chamber #{{tooth}}.",
    assessment: "Non-vital pulp / Irreversible pulpitis #{{tooth}}.",
    plan: "RCT completed #{{tooth}}. Gutta percha obturation. Temp placed."
  },
  D3310: {
    subjective: "Patient presents for anterior root canal #{{tooth}}.",
    objective: "Isolation achieved. Access gained to pulp chamber #{{tooth}}.",
    assessment: "Non-vital pulp / Irreversible pulpitis #{{tooth}}.",
    plan: "RCT completed #{{tooth}}. Gutta percha obturation."
  },

  // --- RESTORATIVE (D2xxx) ---
  D2391: {
    subjective: "Patient presents for composite restoration #{{tooth}} (1 surface).",
    objective: "Caries removed from #{{tooth}} {{surfaces}}.",
    assessment: "Caries #{{tooth}} {{surfaces}}.",
    plan: "Composite restoration placed #{{tooth}} {{surfaces}}. Etch, bond, composite resin placed, cured, and polished."
  },
  D2392: {
    subjective: "Patient presents for composite restoration #{{tooth}} (2 surfaces).",
    objective: "Caries removed from #{{tooth}} {{surfaces}}.",
    assessment: "Caries #{{tooth}} {{surfaces}}.",
    plan: "Composite restoration placed #{{tooth}} {{surfaces}}. Etch, bond, composite resin placed, cured, and polished."
  },
  D2393: {
    subjective: "Patient presents for composite restoration #{{tooth}} (3 surfaces).",
    objective: "Caries removed from #{{tooth}} {{surfaces}}.",
    assessment: "Caries #{{tooth}} {{surfaces}}.",
    plan: "Composite restoration placed #{{tooth}} {{surfaces}}. Etch, bond, composite resin placed, cured, and polished."
  },
  D2394: {
    subjective: "Patient presents for composite restoration #{{tooth}} (4+ surfaces).",
    objective: "Caries removed from #{{tooth}} {{surfaces}}.",
    assessment: "Caries #{{tooth}} {{surfaces}}.",
    plan: "Composite restoration placed #{{tooth}} {{surfaces}}. Etch, bond, composite resin placed, cured, and polished."
  },

  // --- EXTRACTIONS (D7xxx) ---
  D7140: {
    subjective: "Patient presents for extraction of #{{tooth}}.",
    objective: "Tooth #{{tooth}} is non-restorable/hopeless.",
    assessment: "Non-restorable tooth #{{tooth}}.",
    plan: "Simple extraction #{{tooth}}. Tooth elevated and removed. Hemostasis achieved. POI given."
  },
  D7210: {
    subjective: "Patient presents for surgical extraction of #{{tooth}}.",
    objective: "Surgical access required for removal of #{{tooth}}.",
    assessment: "Tooth #{{tooth}} requires surgical removal.",
    plan: "Surgical extraction #{{tooth}} with flap reflection and bone removal. Tooth sectioned. Sutures placed."
  },

  // --- IMPLANTS (D6xxx) ---
  D6010: {
    subjective: "Patient presents for implant placement #{{tooth}}.",
    objective: "Site #{{tooth}} prepared for implant fixture. Bone density adequate.",
    assessment: "Missing tooth #{{tooth}}.",
    plan: "Implant placed at site #{{tooth}}. Primary stability achieved. Cover screw/healing abutment placed."
  },

  // --- HYGIENE & PREVENTIVE (D1xxx, D4xxx) ---
  D1110: {
    subjective: "Patient presents for adult prophylaxis.",
    objective: "Generalized plaque and calculus noted. Gingival tissues assessed.",
    assessment: "Gingivitis / Periodontal health maintenance.",
    plan: "Adult prophylaxis performed. Scale and polish. OHI given."
  },
  D4341: {
    subjective: "Patient presents for SRP {{quadrant}}.",
    objective: "Subgingival calculus noted in {{quadrant}}. Pocket depths reduced.",
    assessment: "Periodontitis requiring SRP.",
    plan: "SRP performed {{quadrant}} with anesthesia. Ultrasonic and hand scaling. Irrigation."
  },
  D4910: {
    subjective: "Patient presents for periodontal maintenance.",
    objective: "Review of periodontal status. Localized bleeding points noted.",
    assessment: "Periodontal maintenance.",
    plan: "Perio maintenance scale and polish. OHI reinforced."
  },
  
  // --- DIAGNOSTIC (D0xxx) ---
  D0120: {
    subjective: "Patient presents for periodic oral evaluation.",
    objective: "Clinical exam performed. Review of medical history.",
    assessment: "Periodic exam.",
    plan: "Findings discussed. Treatment plan updated."
  },
  D0150: {
    subjective: "Patient presents for comprehensive oral evaluation.",
    objective: "Full mouth exam performed. Cancer screening negative. Perio charting completed.",
    assessment: "Comprehensive exam.",
    plan: "Full treatment plan presented and discussed."
  },
  D0140: {
    subjective: "Patient presents for limited exam regarding specific problem.",
    objective: "Focused exam on area of concern.",
    assessment: "Limited evaluation.",
    plan: "Diagnosis and treatment options discussed for specific problem."
  }
};
